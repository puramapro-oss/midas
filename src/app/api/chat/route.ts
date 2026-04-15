import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { askClaudeWithHistory } from '@/lib/ai/claude-client';
import { CHAT_SYSTEM_PROMPT } from '@/lib/ai/system-prompts';
import { PLAN_LIMITS } from '@/lib/utils/constants';
import type { MidasPlan } from '@/types/stripe';

const bodySchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().uuid().optional(),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { message, conversationId } = parsed.data;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan, role, daily_questions_used, daily_questions_limit, daily_questions_reset_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    // Check daily limit (super_admin bypass)
    if (profile.role !== 'super_admin') {
      const plan = (profile.plan as MidasPlan) ?? 'free';
      const limit = PLAN_LIMITS[plan]?.limits.daily_questions ?? 15;

      // Check if reset is needed
      const resetAt = profile.daily_questions_reset_at
        ? new Date(profile.daily_questions_reset_at)
        : null;
      const now = new Date();

      if (resetAt && now >= resetAt) {
        // Reset counter
        await supabase
          .from('profiles')
          .update({
            daily_questions_used: 0,
            daily_questions_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', user.id);
      } else if (profile.daily_questions_used >= limit) {
        return NextResponse.json(
          { error: 'Limite quotidienne atteinte', limit, used: profile.daily_questions_used },
          { status: 429 }
        );
      }
    }

    // Get or create conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const title = message.length > 50 ? message.slice(0, 50) + '...' : message;
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          model: process.env.ANTHROPIC_MODEL_MAIN || 'claude-sonnet-4-6',
          message_count: 0,
          total_tokens: 0,
        })
        .select('id')
        .single();

      if (convError || !newConv) {
        return NextResponse.json({ error: 'Erreur creation conversation' }, { status: 500 });
      }
      activeConversationId = newConv.id;
    }

    // Fetch conversation history (last 20 messages for context)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = (history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    chatHistory.push({ role: 'user', content: message });

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      user_id: user.id,
      role: 'user',
      content: message,
      tokens_used: 0,
    });

    // Call Claude
    const plan = (profile.plan as MidasPlan) ?? 'free';
    const maxTokens = PLAN_LIMITS[plan]?.limits.daily_questions > 200 ? 8192 : 4096;

    const response = await askClaudeWithHistory(CHAT_SYSTEM_PROMPT, chatHistory, maxTokens);

    // Save assistant message
    const estimatedTokens = Math.ceil(response.length / 4);

    await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      user_id: user.id,
      role: 'assistant',
      content: response,
      tokens_used: estimatedTokens,
    });

    // Update conversation message count
    await supabase
      .from('conversations')
      .update({
        message_count: (history?.length ?? 0) + 2,
        total_tokens: estimatedTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeConversationId);

    // Increment daily_questions_used
    await supabase
      .from('profiles')
      .update({
        daily_questions_used: profile.daily_questions_used + 1,
      })
      .eq('id', user.id);

    return NextResponse.json({
      response,
      conversationId: activeConversationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

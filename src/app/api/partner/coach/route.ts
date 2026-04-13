import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
});

const COACH_SYSTEM_PROMPT = `Tu es le Coach Partenaire MIDAS, un expert en growth hacking et partenariat.

## Ta personnalite
- Tu tutoies l'utilisateur, tu es chaleureux et motivant
- Tu es un expert en marketing, acquisition et monetisation
- Tu donnes des conseils CONCRETS et ACTIONNABLES
- Tu utilises les stats du partenaire pour personnaliser tes conseils
- Tu encourages et celebres les progres

## Ce que tu fais
- Analyse les performances du partenaire
- Suggere des strategies pour augmenter les conversions
- Compare avec les moyennes (de facon anonyme)
- Alerte sur les opportunites (palier proche, meilleur jour, etc.)
- Aide a optimiser le contenu et la strategie

## Regles
- Maximum 3-4 paragraphes par reponse
- Toujours finir par une question ou une suggestion concrete
- Jamais de promesses de gains
- Encourager la qualite plutot que la quantite
`;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Message invalide' }, { status: 400 });
    }

    const { message } = parsed.data;
    const adminDb = getAdminDb();

    // Get partner
    const { data: partner } = await adminDb
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Partenaire non trouve' }, { status: 404 });
    }

    // Check daily message limit (20/day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayCount } = await adminDb
      .from('partner_coach_messages')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', partner.id)
      .eq('role', 'user')
      .gte('created_at', todayStart.toISOString());

    if ((todayCount ?? 0) >= 20) {
      return NextResponse.json({ error: 'Limite de 20 messages par jour atteinte' }, { status: 429 });
    }

    // Get recent messages for context
    const { data: recentMessages } = await adminDb
      .from('partner_coach_messages')
      .select('role, content')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build context with partner stats
    const statsContext = `
Statistiques du partenaire:
- Nom: ${partner.display_name}
- Canal: ${partner.channel}
- Tier: ${partner.tier}
- Scans totaux: ${partner.total_scans}
- Filleuls totaux: ${partner.total_referrals}
- Gains totaux: ${partner.total_earned}EUR
- Solde actuel: ${partner.current_balance}EUR
- Taux de conversion: ${partner.total_scans > 0 ? ((partner.total_referrals / partner.total_scans) * 100).toFixed(1) : 0}%
- Palier atteint: ${partner.milestone_reached} filleuls
`;

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add recent messages in chronological order
    if (recentMessages) {
      const reversed = [...recentMessages].reverse();
      for (const msg of reversed) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: COACH_SYSTEM_PROMPT + '\n\n' + statsContext,
      messages,
    });

    const assistantMessage = response.content[0]?.type === 'text'
      ? response.content[0].text
      : 'Desole, je n\'ai pas pu generer une reponse.';

    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    // Save both messages
    await adminDb.from('partner_coach_messages').insert([
      { partner_id: partner.id, role: 'user', content: message, tokens_used: 0 },
      { partner_id: partner.id, role: 'assistant', content: assistantMessage, tokens_used: tokensUsed },
    ]);

    return NextResponse.json({
      success: true,
      message: assistantMessage,
      tokens_used: tokensUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

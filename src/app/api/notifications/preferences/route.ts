import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: notification preferences
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { data: prefs } = await supabase.schema('midas').from('notification_preferences')
      .select('*').eq('user_id', user.id).single();

    if (!prefs) {
      // Auto-create default preferences
      const { data: newPrefs } = await supabase.schema('midas').from('notification_preferences')
        .insert({ user_id: user.id }).select().single();
      return NextResponse.json({ preferences: newPrefs });
    }

    return NextResponse.json({ preferences: prefs });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const updateSchema = z.object({
  preferred_hour: z.number().int().min(0).max(23).optional(),
  preferred_days: z.array(z.number().int().min(0).max(6)).optional(),
  frequency: z.enum(['low', 'normal', 'high']).optional(),
  notification_style: z.enum(['encouraging', 'informative', 'warm']).optional(),
  email_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  trading_signals: z.boolean().optional(),
  community_updates: z.boolean().optional(),
  marketing: z.boolean().optional(),
  paused_until: z.string().nullable().optional(),
});

// PATCH: update preferences
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 });

    // Ensure row exists
    await supabase.schema('midas').from('notification_preferences')
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' });

    const { data: updated } = await supabase.schema('midas').from('notification_preferences')
      .select('*').eq('user_id', user.id).single();

    return NextResponse.json({ preferences: updated });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

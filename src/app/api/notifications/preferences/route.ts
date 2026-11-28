import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const privateHeaders = { 'Cache-Control': 'private, no-store' };
// Mirrors the existing schema.sql defaults, without creating a row during GET.
const defaultPreferences = {
  preferred_hour: 10,
  preferred_days: [1, 2, 3, 4, 5],
  frequency: 'normal',
  notification_style: 'encouraging',
  email_enabled: true,
  push_enabled: true,
  trading_signals: true,
  community_updates: true,
  marketing: false,
  paused_until: null,
};

// GET: notification preferences
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && (authError.status ?? 0) >= 500) {
      return NextResponse.json({ error: 'Authentification temporairement indisponible.' }, { status: 503, headers: privateHeaders });
    }
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: privateHeaders });
    const expectedAccount = req.headers.get('x-midas-account-id');
    if (expectedAccount !== null && expectedAccount !== user.id) {
      return NextResponse.json({ error: 'Votre session a changé. Actualisez la page.' }, { status: 409, headers: privateHeaders });
    }

    const { data: prefs, error } = await supabase.schema('midas').from('notification_preferences')
      .select('*').eq('user_id', user.id).maybeSingle();

    if (error || prefs === undefined || (prefs !== null && prefs.user_id !== user.id)) {
      return NextResponse.json({ error: 'Impossible de charger les préférences.' }, { status: 500, headers: privateHeaders });
    }

    return NextResponse.json({
      preferences: prefs ?? { ...defaultPreferences, user_id: user.id },
      persisted: prefs !== null,
    }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Impossible de charger les préférences.' }, { status: 500, headers: privateHeaders });
  }
}

const updateSchema = z.object({
  preferred_hour: z.number().int().min(0).max(23).optional(),
  preferred_days: z.array(z.number().int().min(0).max(6)).max(7)
    .refine((days) => new Set(days).size === days.length, 'Chaque jour doit être unique.').optional(),
  frequency: z.enum(['low', 'normal', 'high']).optional(),
  notification_style: z.enum(['encouraging', 'informative', 'warm']).optional(),
  email_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  trading_signals: z.boolean().optional(),
  community_updates: z.boolean().optional(),
  marketing: z.boolean().optional(),
  paused_until: z.iso.datetime({ offset: true }).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Aucune préférence fournie.');

// PATCH: update preferences
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && (authError.status ?? 0) >= 500) {
      return NextResponse.json({ error: 'Authentification temporairement indisponible.' }, { status: 503, headers: privateHeaders });
    }
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: privateHeaders });
    const expectedAccount = req.headers.get('x-midas-account-id');
    if (expectedAccount !== null && expectedAccount !== user.id) {
      return NextResponse.json({ error: 'Votre session a changé. Actualisez la page.' }, { status: 409, headers: privateHeaders });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Préférences invalides.' }, { status: 400, headers: privateHeaders });

    // Return the row from the same operation; a separate SELECT could mask a failed save.
    const { data: updated, error } = await supabase.schema('midas').from('notification_preferences')
      .upsert({ ...parsed.data, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('*').single();

    if (error || !updated || updated.user_id !== user.id) {
      return NextResponse.json({ error: 'Impossible d’enregistrer les préférences.' }, { status: 500, headers: privateHeaders });
    }

    return NextResponse.json({ preferences: updated, persisted: true }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Impossible d’enregistrer les préférences.' }, { status: 500, headers: privateHeaders });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const privateHeaders = { 'Cache-Control': 'private, no-store' };

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && (authError.status ?? 0) >= 500) {
      return NextResponse.json({ error: 'Authentification temporairement indisponible.' }, { status: 503, headers: privateHeaders });
    }
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401, headers: privateHeaders });
    }
    const expectedAccount = req.headers.get('x-midas-account-id');
    if (expectedAccount !== null && expectedAccount !== user.id) {
      return NextResponse.json({ error: 'Votre session a changé. Actualisez la page.' }, { status: 409, headers: privateHeaders });
    }

    const [list, total] = await Promise.all([
      supabase.from('notifications').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).not('read', 'is', true),
    ]);
    if (list.error || total.error || !Array.isArray(list.data)
      || total.count === null || !Number.isSafeInteger(total.count) || total.count < 0) {
      return NextResponse.json({ error: 'Impossible de charger les notifications.' }, { status: 500, headers: privateHeaders });
    }

    return NextResponse.json({
      notifications: list.data.map((notification) => ({
        ...notification,
        // Older rows permit NULL; other malformed values remain visible to validation.
        read: notification.read === null ? false : notification.read,
      })),
      unread: total.count,
    }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Impossible de charger les notifications.' }, { status: 500, headers: privateHeaders });
  }
}

const patchSchema = z.union([
  z.object({ all: z.literal(true) }).strict(),
  z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).strict(),
]);

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && (authError.status ?? 0) >= 500) {
      return NextResponse.json({ error: 'Authentification temporairement indisponible.' }, { status: 503, headers: privateHeaders });
    }
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401, headers: privateHeaders });
    }
    const expectedAccount = req.headers.get('x-midas-account-id');
    if (expectedAccount !== null && expectedAccount !== user.id) {
      return NextResponse.json({ error: 'Votre session a changé. Actualisez la page.' }, { status: 409, headers: privateHeaders });
    }

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Choisis les notifications à marquer comme lues, ou toutes les notifications.' }, { status: 400, headers: privateHeaders });
    }

    // An acknowledgement only changes read state; it never authorizes an order.
    let query = supabase.from('notifications').update({ read: true })
      .eq('user_id', user.id).not('read', 'is', true);
    if ('ids' in parsed.data) {
      query = query.in('id', [...new Set(parsed.data.ids)]);
    }
    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Impossible de marquer les notifications comme lues.' }, { status: 500, headers: privateHeaders });
    }
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Impossible de marquer les notifications comme lues.' }, { status: 500, headers: privateHeaders });
  }
}

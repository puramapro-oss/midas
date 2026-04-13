import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'midas' },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component — safe to ignore */ }
        },
      },
    }
  );
}

// GET — list top traders + user's copy relationships
export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const tab = request.nextUrl.searchParams.get('tab') ?? 'traders';

    if (tab === 'traders') {
      const { data: traders } = await supabase
        .from('trader_profiles')
        .select('*')
        .eq('is_public', true)
        .order('ranking_score', { ascending: false })
        .limit(50);

      return NextResponse.json({ traders: traders ?? [] });
    }

    if (tab === 'my-copies') {
      const { data: copies } = await supabase
        .from('copy_relationships')
        .select('*')
        .eq('copier_id', user.id)
        .order('created_at', { ascending: false });

      return NextResponse.json({ copies: copies ?? [] });
    }

    if (tab === 'my-profile') {
      const { data: profile } = await supabase
        .from('trader_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({ traderProfile: profile });
    }

    if (tab === 'history') {
      const { data: trades } = await supabase
        .from('copy_trades')
        .select('*')
        .eq('copier_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(100);

      return NextResponse.json({ trades: trades ?? [] });
    }

    return NextResponse.json({ error: 'Tab invalide' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const copySchema = z.object({
  action: z.enum(['follow', 'unfollow', 'pause', 'resume', 'become_trader']),
  trader_id: z.string().uuid().optional(),
  copy_amount: z.number().min(50).max(100000).optional(),
  copy_ratio: z.number().min(0.1).max(5).optional(),
  display_name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
});

// POST — follow/unfollow traders, become a trader
export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json();
    const parsed = copySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 400 }
      );
    }

    const { action, trader_id, copy_amount, copy_ratio, display_name, bio } = parsed.data;

    if (action === 'follow') {
      if (!trader_id) return NextResponse.json({ error: 'trader_id requis' }, { status: 400 });

      const { data: trader } = await supabase
        .from('trader_profiles')
        .select('id, copiers_count, max_copiers, user_id')
        .eq('id', trader_id)
        .single();

      if (!trader) return NextResponse.json({ error: 'Trader introuvable' }, { status: 404 });
      if (trader.user_id === user.id) return NextResponse.json({ error: 'Tu ne peux pas te copier toi-même' }, { status: 400 });
      if (trader.copiers_count >= trader.max_copiers) {
        return NextResponse.json({ error: 'Ce trader a atteint son nombre maximum de copieurs' }, { status: 400 });
      }

      const { data: existing } = await supabase
        .from('copy_relationships')
        .select('id, status')
        .eq('copier_id', user.id)
        .eq('trader_id', trader_id)
        .single();

      if (existing?.status === 'active') {
        return NextResponse.json({ error: 'Tu copies déjà ce trader' }, { status: 400 });
      }

      if (existing) {
        await supabase
          .from('copy_relationships')
          .update({ status: 'active', copy_amount: copy_amount ?? 100, copy_ratio: copy_ratio ?? 1, stopped_at: null, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('copy_relationships').insert({
          copier_id: user.id,
          trader_id,
          copy_amount: copy_amount ?? 100,
          copy_ratio: copy_ratio ?? 1,
          status: 'active',
        });
      }

      // Increment copiers count
      await supabase
        .from('trader_profiles')
        .update({ copiers_count: (trader.copiers_count ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', trader_id);

      return NextResponse.json({ message: 'Tu copies maintenant ce trader. Ses trades seront répliqués automatiquement.' });
    }

    if (action === 'unfollow') {
      if (!trader_id) return NextResponse.json({ error: 'trader_id requis' }, { status: 400 });

      await supabase
        .from('copy_relationships')
        .update({ status: 'stopped', stopped_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('copier_id', user.id)
        .eq('trader_id', trader_id);

      return NextResponse.json({ message: 'Tu ne copies plus ce trader.' });
    }

    if (action === 'pause') {
      if (!trader_id) return NextResponse.json({ error: 'trader_id requis' }, { status: 400 });

      await supabase
        .from('copy_relationships')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('copier_id', user.id)
        .eq('trader_id', trader_id);

      return NextResponse.json({ message: 'Copy trading mis en pause.' });
    }

    if (action === 'resume') {
      if (!trader_id) return NextResponse.json({ error: 'trader_id requis' }, { status: 400 });

      await supabase
        .from('copy_relationships')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('copier_id', user.id)
        .eq('trader_id', trader_id);

      return NextResponse.json({ message: 'Copy trading repris.' });
    }

    if (action === 'become_trader') {
      if (!display_name) return NextResponse.json({ error: 'Nom de trader requis' }, { status: 400 });

      const { data: existing } = await supabase
        .from('trader_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase.from('trader_profiles')
          .update({ display_name, bio: bio ?? null, is_public: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        return NextResponse.json({ message: 'Profil trader mis à jour.' });
      }

      await supabase.from('trader_profiles').insert({
        user_id: user.id,
        display_name,
        bio: bio ?? null,
        is_public: true,
      });

      return NextResponse.json({ message: 'Profil trader créé. Tes trades seront maintenant visibles pour les copieurs.' });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

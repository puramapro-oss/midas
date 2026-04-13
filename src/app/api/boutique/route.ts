import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: list shop items
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const [itemsRes, profileRes, purchasesRes] = await Promise.all([
      supabase.schema('midas').from('point_shop_items').select('*').eq('is_active', true).order('cost_points', { ascending: true }),
      supabase.schema('midas').from('profiles').select('purama_points').eq('id', user.id).single(),
      supabase.schema('midas').from('point_purchases').select('item_id').eq('user_id', user.id),
    ]);

    return NextResponse.json({
      items: itemsRes.data ?? [],
      balance: profileRes.data?.purama_points ?? 0,
      purchased_ids: (purchasesRes.data ?? []).map(p => p.item_id),
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const purchaseSchema = z.object({
  item_id: z.string().uuid(),
});

// POST: purchase item
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

    const { item_id } = parsed.data;

    // Get item
    const { data: item } = await supabase.schema('midas').from('point_shop_items')
      .select('*').eq('id', item_id).eq('is_active', true).single();
    if (!item) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });

    // Check balance
    const { data: profile } = await supabase.schema('midas').from('profiles')
      .select('purama_points').eq('id', user.id).single();
    if (!profile || profile.purama_points < item.cost_points) {
      return NextResponse.json({ error: 'Points insuffisants. Il te faut encore ' + (item.cost_points - (profile?.purama_points ?? 0)) + ' points.' }, { status: 400 });
    }

    // Check max purchases
    if (item.max_purchases) {
      const { count } = await supabase.schema('midas').from('point_purchases')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('item_id', item_id);
      if ((count ?? 0) >= item.max_purchases) {
        return NextResponse.json({ error: 'Tu as atteint le maximum d\'achats pour cet article.' }, { status: 400 });
      }
    }

    // Deduct points
    const newBalance = profile.purama_points - item.cost_points;
    await supabase.schema('midas').from('profiles').update({ purama_points: newBalance }).eq('id', user.id);

    // Record purchase
    await supabase.schema('midas').from('point_purchases').insert({
      user_id: user.id, item_id, points_spent: item.cost_points,
    });

    // Record transaction
    await supabase.schema('midas').from('point_transactions').insert({
      user_id: user.id, amount: -item.cost_points, type: 'spend',
      source: 'boutique', description: `Achat: ${item.name}`,
    });

    // Apply item effect based on category
    if (item.category === 'reduction') {
      await supabase.schema('midas').from('user_coupons').insert({
        user_id: user.id,
        code: `SHOP-${Date.now().toString(36).toUpperCase()}`,
        discount_percent: parseInt(item.value ?? '10'),
        source: 'points',
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
    } else if (item.category === 'ticket') {
      const { data: draw } = await supabase.schema('midas').from('lottery_draws')
        .select('id').eq('status', 'upcoming').order('draw_date', { ascending: true }).limit(1).single();
      if (draw) {
        await supabase.schema('midas').from('lottery_tickets').insert({
          user_id: user.id, draw_id: draw.id, source: 'achat_points',
        });
      }
    } else if (item.category === 'cash') {
      const euros = parseFloat(item.value ?? '0');
      if (euros > 0) {
        const { data: wallet } = await supabase.schema('midas').from('wallets').select('balance').eq('user_id', user.id).single();
        if (wallet) {
          await supabase.schema('midas').from('wallets').update({ balance: wallet.balance + euros }).eq('user_id', user.id);
        }
        await supabase.schema('midas').from('wallet_transactions').insert({
          user_id: user.id, type: 'credit', amount: euros, source: 'manual',
          description: `Conversion points: ${item.cost_points} pts → ${euros}€`,
        });
      }
    }

    return NextResponse.json({ balance: newBalance, purchased: item.name });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

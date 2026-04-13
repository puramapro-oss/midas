import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: current draw + user's tickets + past winners
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const [currentDrawRes, ticketsRes, pastWinnersRes, pastDrawsRes] = await Promise.all([
      supabase.schema('midas').from('lottery_draws').select('*').in('status', ['upcoming', 'live']).order('draw_date', { ascending: true }).limit(1).single(),
      supabase.schema('midas').from('lottery_tickets').select('id, source, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.schema('midas').from('lottery_winners').select('*, lottery_draws(draw_date)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.schema('midas').from('lottery_draws').select('*').eq('status', 'completed').order('draw_date', { ascending: false }).limit(5),
    ]);

    return NextResponse.json({
      current_draw: currentDrawRes.data ?? null,
      my_tickets: ticketsRes.data ?? [],
      my_tickets_count: (ticketsRes.data ?? []).length,
      my_wins: pastWinnersRes.data ?? [],
      past_draws: pastDrawsRes.data ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

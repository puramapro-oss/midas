import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('trades')
      .select('id, pair, side, strategy, amount, entry_price, exit_price, stop_loss, take_profit, pnl, fee, status, exchange, is_paper_trade, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (from) {
      query = query.gte('created_at', from);
    }
    if (to) {
      query = query.lte('created_at', to);
    }

    const { data: trades, error: tradesError } = await query;

    if (tradesError) {
      return NextResponse.json({ error: 'Erreur recuperation trades', details: tradesError.message }, { status: 500 });
    }

    const headers = [
      'ID', 'Paire', 'Direction', 'Strategie', 'Montant', 'Prix Entree',
      'Prix Sortie', 'Stop Loss', 'Take Profit', 'PnL', 'Frais',
      'Statut', 'Exchange', 'Paper Trade', 'Date Creation', 'Date MAJ',
    ];

    const rows = (trades ?? []).map((t) => [
      escapeCSV(t.id),
      escapeCSV(t.pair),
      escapeCSV(t.side),
      escapeCSV(t.strategy),
      escapeCSV(t.amount),
      escapeCSV(t.entry_price),
      escapeCSV(t.exit_price),
      escapeCSV(t.stop_loss),
      escapeCSV(t.take_profit),
      escapeCSV(t.pnl),
      escapeCSV(t.fee),
      escapeCSV(t.status),
      escapeCSV(t.exchange),
      escapeCSV(t.is_paper_trade ? 'Oui' : 'Non'),
      escapeCSV(t.created_at),
      escapeCSV(t.updated_at),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `midas-trades-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

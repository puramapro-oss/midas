import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { readPaperTrades, summarizeRecordedTrades, escapeTradeCsv } from '@/lib/trading/recorded-performance';
import { netRecordedPnl } from '@/lib/trading/recorded-pnl';

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

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const asOf = Date.now();
    const start = from ? Date.parse(from) : 0;
    const end = to ? Date.parse(to) + (/^\d{4}-\d{2}-\d{2}$/.test(to) ? 86400000 : 0) : asOf + 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return NextResponse.json({ error: 'Période invalide' }, { status: 400 });
    }
    const trades = (await readPaperTrades(supabase, user.id, asOf))
      .filter(t => Date.parse(t.created_at) >= start && Date.parse(t.created_at) < end);
    summarizeRecordedTrades(trades, asOf); // Reject malformed results; no partial successful export.
    const headers = [
      'ID', 'Paire', 'Direction', 'Strategie', 'Quantite', 'Prix Entree',
      'Prix Sortie', 'Stop Loss', 'Take Profit', 'PnL brut', 'Frais enregistres', 'PnL net realise',
      'Statut', 'Exchange', 'Mode', 'Date Creation', 'Date MAJ', 'Date Cloture',
    ];
    const rows = trades.map(t => [
      t.id, t.pair, t.side, t.strategy, t.quantity, t.entry_price, t.exit_price,
      t.stop_loss, t.take_profit, t.pnl, t.fees,
      t.status === 'closed' ? netRecordedPnl(t.pnl, t.fees) : null,
      t.status, t.exchange, 'Simulation', t.created_at, t.updated_at, t.closed_at,
    ].map(escapeTradeCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `midas-paper-trades-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { computeFrTaxReport, type TaxTradeRow } from '@/lib/tax/fr-2086';

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
          } catch { /* ignore */ }
        },
      },
    }
  );
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ year: string }> }
) {
  try {
    const { year: yearStr } = await context.params;
    const year = parseInt(yearStr, 10);
    if (isNaN(year) || year < 2015 || year > 2100) {
      return NextResponse.json({ error: 'Année invalide' }, { status: 400 });
    }

    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const yearStart = `${year}-01-01T00:00:00Z`;
    const yearEnd = `${year + 1}-01-01T00:00:00Z`;

    const { data: trades, error } = await supabase
      .from('trades')
      .select('id, symbol, side, entry_price, exit_price, quantity, pnl_usd, fees, status, created_at, closed_at, is_paper')
      .eq('user_id', user.id)
      .or(`is_paper.is.null,is_paper.eq.false`)
      .gte('created_at', yearStart)
      .lt('created_at', yearEnd)
      .limit(5000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: TaxTradeRow[] = (trades ?? []).map((t) => ({
      symbol: t.symbol,
      side: t.side,
      entry_price: t.entry_price,
      exit_price: t.exit_price,
      quantity: t.quantity,
      pnl_usd: t.pnl_usd,
      fees_usd: t.fees,
      status: t.status,
      created_at: t.created_at,
      closed_at: t.closed_at,
    }));

    const report = computeFrTaxReport(year, rows);

    return NextResponse.json({ report });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

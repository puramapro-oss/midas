import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { computeFrTaxReport, type TaxTradeRow } from '@/lib/tax/fr-2086';
import { generateTaxPdf } from '@/lib/tax/pdf-2086';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // public schema
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
      .select('id, pair, side, entry_price, exit_price, quantity, pnl, fees, status, opened_at, closed_at, is_paper_trade')
      .eq('user_id', user.id)
      .or(`is_paper_trade.is.null,is_paper_trade.eq.false`)
      .gte('opened_at', yearStart)
      .lt('opened_at', yearEnd)
      .limit(5000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: TaxTradeRow[] = (trades ?? []).map((t) => ({
      pair: t.pair,
      side: t.side,
      entry_price: t.entry_price,
      exit_price: t.exit_price,
      quantity: t.quantity,
      pnl: t.pnl,
      fees: t.fees,
      status: t.status,
      created_at: t.opened_at,
      closed_at: t.closed_at,
    }));

    const report = computeFrTaxReport(year, rows);
    const pdfBytes = await generateTaxPdf(report, user.email ?? 'utilisateur');

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="midas-tax-${year}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

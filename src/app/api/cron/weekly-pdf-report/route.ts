// =============================================================================
// MIDAS — Cron Weekly PDF Report
// Brief : "Rapport PDF hebdo" (plan Ultra). Génère pour chaque user Ultra
// le PDF de la semaine et l'envoie par Resend.
// Schedule : dimanche 10:00 UTC.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateWeeklyReportPdf, type WeeklyReportData } from '@/lib/reports/weekly-pdf';

export const maxDuration = 120;

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: string | null;
}

interface TradeRow {
  pair: string;
  pnl: number | null;
  status: string;
  closed_at: string | null;
  opened_at: string;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } },
    );

    const resendKey = process.env.RESEND_API_KEY?.trim();
    const resend = resendKey ? new Resend(resendKey) : null;

    // Plan Ultra uniquement (brief : Pro = email simple, Ultra = PDF)
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, plan')
      .in('plan', ['ultra', 'enterprise', 'super_admin']);

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodStartIso = periodStart.toISOString();
    const periodEndIso = periodEnd.toISOString();

    const sent: string[] = [];
    const errors: string[] = [];

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      try {
        const { data: trades } = await supabase
          .from('trades')
          .select('pair, pnl, status, closed_at, opened_at')
          .eq('user_id', profile.id)
          .gte('opened_at', periodStartIso)
          .lt('opened_at', periodEndIso);

        const tradeRows = (trades ?? []) as TradeRow[];
        const closed = tradeRows.filter((t) => t.status === 'closed' && typeof t.pnl === 'number');
        const winning = closed.filter((t) => (t.pnl ?? 0) > 0);
        const losing = closed.filter((t) => (t.pnl ?? 0) < 0);
        const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
        const winRate = closed.length > 0 ? (winning.length / closed.length) * 100 : 0;
        const sortedByPnl = [...closed].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0));
        const bestTrade = sortedByPnl[0]
          ? { pair: sortedByPnl[0].pair, pnl: sortedByPnl[0].pnl ?? 0 }
          : null;
        const worstTrade = sortedByPnl[sortedByPnl.length - 1]
          ? { pair: sortedByPnl[sortedByPnl.length - 1].pair, pnl: sortedByPnl[sortedByPnl.length - 1].pnl ?? 0 }
          : null;

        // Group by pair
        const pairMap = new Map<string, { trades: number; pnl: number }>();
        for (const t of closed) {
          const cur = pairMap.get(t.pair) ?? { trades: 0, pnl: 0 };
          cur.trades += 1;
          cur.pnl += t.pnl ?? 0;
          pairMap.set(t.pair, cur);
        }
        const topPairs = Array.from(pairMap.entries())
          .map(([pair, v]) => ({ pair, ...v }))
          .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

        // Régime + F&G via market_cache
        const { data: regimeCache } = await supabase
          .from('market_cache')
          .select('data')
          .eq('key', 'market_regime')
          .maybeSingle();
        const { data: fgCache } = await supabase
          .from('market_cache')
          .select('data')
          .eq('key', 'fear_greed')
          .maybeSingle();
        const regime = ((regimeCache?.data as Record<string, unknown>)?.regime as string) ?? 'unknown';
        const fgValue = Number((fgCache?.data as Record<string, unknown>)?.value ?? 50);

        const aiSummary =
          closed.length === 0
            ? 'Pas de trades exécutés cette semaine. Continue à observer les marchés et à laisser MIDAS analyser pour toi.'
            : winRate >= 60
              ? `Excellente semaine avec ${winRate.toFixed(0)}% de win rate et un P&L de ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}€. Le SHIELD a bien filtré les setups. Garde la même rigueur pour la semaine à venir.`
              : winRate >= 40
                ? `Semaine moyenne (win rate ${winRate.toFixed(0)}%). Pense à analyser les ${losing.length} trades perdants pour identifier les patterns. Le régime ${regime} demande prudence.`
                : `Semaine difficile (win rate ${winRate.toFixed(0)}%). MIDAS recommande de réduire la taille des positions et de revenir au paper trading sur les paires en perte. Régime ${regime}.`;

        const reportData: WeeklyReportData = {
          user_email: profile.email,
          user_name: profile.full_name ?? profile.email.split('@')[0],
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          total_trades: tradeRows.length,
          winning_trades: winning.length,
          losing_trades: losing.length,
          win_rate_pct: winRate,
          total_pnl_eur: totalPnl,
          best_trade: bestTrade,
          worst_trade: worstTrade,
          top_pairs: topPairs,
          market_regime: regime,
          fear_greed_avg: fgValue,
          ai_summary: aiSummary,
        };

        const pdfBytes = await generateWeeklyReportPdf(reportData);

        if (resend) {
          await resend.emails.send({
            from: 'MIDAS <noreply@purama.dev>',
            to: [profile.email],
            subject: `MIDAS — Ton rapport hebdo (${reportData.period_start} → ${reportData.period_end})`,
            html: `
              <h2>MIDAS — Rapport hebdomadaire</h2>
              <p>Bonjour ${reportData.user_name},</p>
              <p>Voici ton rapport de trading de la semaine. Le PDF complet est en pièce jointe.</p>
              <ul>
                <li><strong>Trades</strong> : ${reportData.total_trades}</li>
                <li><strong>Win rate</strong> : ${reportData.win_rate_pct.toFixed(1)}%</li>
                <li><strong>P&L</strong> : ${reportData.total_pnl_eur >= 0 ? '+' : ''}${reportData.total_pnl_eur.toFixed(2)} €</li>
                <li><strong>Régime marché</strong> : ${reportData.market_regime}</li>
              </ul>
              <p>${reportData.ai_summary}</p>
              <p>— L'équipe MIDAS</p>
            `,
            attachments: [
              {
                filename: `midas-weekly-${reportData.period_end}.pdf`,
                content: Buffer.from(pdfBytes).toString('base64'),
              },
            ],
          });
        }

        sent.push(profile.email);
      } catch (e) {
        errors.push(`${profile.email}: ${(e as Error).message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ultra_users: profiles?.length ?? 0,
      sent: sent.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

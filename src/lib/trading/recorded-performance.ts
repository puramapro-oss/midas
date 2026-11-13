import type { SupabaseClient } from '@supabase/supabase-js';
import { netRecordedPnl } from './recorded-pnl.ts';

export interface RecordedTrade {
  id: string; user_id: string; is_paper_trade: boolean; pair: string; side: string;
  strategy: string; status: string; quantity: number; entry_price: number;
  exit_price: number | null; stop_loss: number | null; take_profit: number | null;
  pnl: number | null; fees: number; exchange: string;
  created_at: string; updated_at: string; closed_at: string | null;
}

/** Reads are bounded and completeness-checked, not an atomic database snapshot.
 * A concurrent update/count change aborts the report; it never returns a partial total. */
export async function readPaperTrades(db: SupabaseClient, userId: string, asOf = Date.now()) {
  if (!userId || !Number.isFinite(asOf)) throw new Error('Compte ou date invalide');
  const trades: RecordedTrade[] = [];
  const ids = new Set<string>();
  const deadline = AbortSignal.timeout(15000);
  let expected: number | null = null;
  do {
    const { data, error, count } = await db.from('trades')
      .select('id, user_id, is_paper_trade, pair, side, strategy, status, quantity, entry_price, exit_price, stop_loss, take_profit, pnl, fees, exchange, created_at, updated_at, closed_at', { count: 'exact' })
      .eq('user_id', userId).eq('is_paper_trade', true)
      .lte('created_at', new Date(asOf).toISOString())
      .order('id', { ascending: true }).range(trades.length, trades.length + 249)
      .abortSignal(deadline);
    if (error || !Array.isArray(data) || count === null || !Number.isSafeInteger(count) || count < 0)
      throw new Error('Historique simulé indisponible');
    if (count > 10000) throw new Error('Historique supérieur à la limite vérifiée de 10 000 positions');
    if (expected !== null && expected !== count) throw new Error('Historique modifié pendant la lecture ; réessaie');
    expected = count;
    if (!data.length && trades.length < count) throw new Error('Historique incomplet');
    for (const raw of data) {
      const row = raw as RecordedTrade;
      if (row.user_id !== userId || row.is_paper_trade !== true || !row.id || ids.has(row.id) ||
        !['open', 'closed', 'cancelled', 'error'].includes(row.status) ||
        !Number.isFinite(Date.parse(row.created_at)) || Date.parse(row.created_at) > asOf ||
        !Number.isFinite(Date.parse(row.updated_at)) || Date.parse(row.updated_at) > asOf)
        throw new Error('Historique incohérent ou modifié pendant la lecture ; réessaie');
      ids.add(row.id); trades.push(row);
    }
    if (trades.length > count) throw new Error('Historique incohérent');
  } while (trades.length < expected);
  return trades;
}

export function summarizeRecordedTrades(trades: RecordedTrade[], asOf = Date.now()) {
  if (!Number.isFinite(asOf)) throw new Error('Date de calcul invalide');
  const closed = trades.filter(t => t.status === 'closed').map(t => {
    const net = netRecordedPnl(t.pnl, t.fees);
    const at = t.closed_at === null ? NaN : Date.parse(t.closed_at);
    if (net === null || !Number.isFinite(at) || at > asOf || !/^[A-Z0-9]+\/USDT$/.test(t.pair))
      throw new Error('Résultats incomplets ou devise non prise en charge (USDT requis)');
    return { ...t, netPnl: net, closedTime: at };
  }).sort((a, b) => a.closedTime - b.closedTime || a.id.localeCompare(b.id));
  const gains = closed.filter(t => t.netPnl > 0);
  const losses = closed.filter(t => t.netPnl < 0);
  const sum = (rows: typeof closed) => rows.reduce((n, t) => n + t.netPnl, 0);
  const totalWins = sum(gains), totalLosses = -sum(losses);
  // Realized cash drawdown in USDT; no percentage without a capital/cash-flow history.
  let cumulative = 0, peak = 0, maxDrawdown = 0;
  const realizedByTime = new Map<number, number>();
  for (const t of closed) realizedByTime.set(t.closedTime, (realizedByTime.get(t.closedTime) ?? 0) + t.netPnl);
  for (const pnl of realizedByTime.values()) {
    cumulative += pnl; peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }
  const totalPnl = sum(closed);
  const totalFees = closed.reduce((n, t) => n + Number(t.fees), 0);
  if (![totalPnl, totalFees, totalWins, totalLosses, maxDrawdown].every(Number.isFinite))
    throw new Error('Résultats financiers hors limites');
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : null;
  const periodPnl = {
    day: sum(closed.filter(t => t.closedTime >= asOf - 86400000)),
    week: sum(closed.filter(t => t.closedTime >= asOf - 7 * 86400000)),
    month: sum(closed.filter(t => t.closedTime >= asOf - 30 * 86400000)),
  };
  return {
    totalPnl, totalFees, grossPnl: totalPnl + totalFees, totalTrades: closed.length,
    winningTrades: gains.length, losingTrades: losses.length,
    breakevenTrades: closed.length - gains.length - losses.length,
    winRate: closed.length ? gains.length / closed.length * 100 : 0,
    avgWin: gains.length ? totalWins / gains.length : 0,
    avgLoss: losses.length ? totalLosses / losses.length : 0,
    bestTrade: closed.length ? Math.max(...closed.map(t => t.netPnl)) : 0,
    worstTrade: closed.length ? Math.min(...closed.map(t => t.netPnl)) : 0,
    profitFactor: profitFactor !== null && Number.isFinite(profitFactor) ? profitFactor : null,
    maxDrawdown, periodPnl, recentTrades: closed.slice(-50).reverse(),
  };
}

/** Quoting alone does not stop spreadsheet formula execution in text cells. */
export function escapeTradeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+@-]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

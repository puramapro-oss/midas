import type { SupabaseClient } from '@supabase/supabase-js';

export interface MemoryScope {
  userId: string;
  isPaper: boolean;
  strategy?: string;
}

export interface MemoryTrade {
  pnl: number | string | null;
  closed_at: string;
}

export async function readMemoryHistory(db: Pick<SupabaseClient, 'from'>, pair: string, scope: MemoryScope) {
  // Service-role queries must always carry the authenticated account and mode.
  if (!scope?.userId?.trim() || typeof scope.isPaper !== 'boolean' || !pair.trim()) {
    throw new Error('Memory lookup requires an account, a pair and an explicit paper/live mode');
  }
  let query = db.from('trades')
    .select('pnl, closed_at')
    .eq('user_id', scope.userId)
    .eq('is_paper_trade', scope.isPaper)
    .eq('pair', pair)
    .eq('status', 'closed')
    .gte('closed_at', new Date(Date.now() - 90 * 86400000).toISOString())
    .order('closed_at', { ascending: false });
  if (scope.strategy !== undefined) query = query.eq('strategy', scope.strategy);
  const { data, error } = await query.limit(500);
  if (error) throw new Error('Memory history unavailable');
  return (data ?? []) as MemoryTrade[];
}

export function summarizeMemory(trades: MemoryTrade[]) {
  const pnl = trades.filter(t => t.pnl !== null).map(t => Number(t.pnl)).filter(Number.isFinite);
  const wins = pnl.filter(value => value > 0).length;
  const losses = pnl.filter(value => value < 0).length;
  return {
    trades_analyzed: pnl.length,
    excluded_rows: trades.length - pnl.length,
    wins,
    losses,
    break_even: pnl.length - wins - losses,
    win_rate: pnl.length ? wins / pnl.length : null,
    total_pnl: pnl.reduce((sum, value) => sum + value, 0),
  };
}

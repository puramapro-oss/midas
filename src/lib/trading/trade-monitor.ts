// Educational monitoring: fresh observations and atomic, audited state changes.
import { createServiceClient } from '@/lib/supabase/server';
import { fetchPaperQuote, type PaperQuote } from '@/lib/exchange/binance-public';
import { applyPaperObservation, type PaperMonitorAction } from './paper-position';

interface PaperPosition { id: string; user_id: string; pair: string; is_paper_trade: boolean }
interface MonitorResult { positions_checked: number; actions_taken: PaperMonitorAction[]; errors: string[] }
const unavailable = (message: string): MonitorResult => ({ positions_checked: 0, actions_taken: [], errors: [message] });

export async function monitorPositions(userId: string): Promise<MonitorResult> {
  if (!userId?.trim()) throw new Error('Paper monitoring requires an account');
  const { data, error } = await createServiceClient().from('trades').select('id, user_id, pair, is_paper_trade')
    .eq('user_id', userId).eq('status', 'open').eq('is_paper_trade', true).abortSignal(AbortSignal.timeout(8000)).limit(101);
  if (error || !data || data.length > 100) return unavailable('Paper positions unavailable or safety limit exceeded');
  if (data.some(row => row.user_id !== userId)) return unavailable('Invalid paper position scope');
  return monitorRows(data as PaperPosition[]);
}

/** Called only by the authenticated existing cron; each write keeps its owner. */
export async function monitorAllPaperPositions(): Promise<MonitorResult> {
  const { data, error, count } = await createServiceClient().from('trades')
    .select('id, user_id, pair, is_paper_trade', { count: 'exact' })
    .eq('status', 'open').eq('is_paper_trade', true).order('id').abortSignal(AbortSignal.timeout(8000)).limit(501);
  if (error || !Array.isArray(data) || count !== data.length || data.length > 500)
    return unavailable('Paper inventory incomplete, unavailable or above 500-position safety limit');
  return monitorRows(data as PaperPosition[]);
}

async function monitorRows(data: PaperPosition[]): Promise<MonitorResult> {
  const quotes = new Map<string, Promise<PaperQuote | null>>();
  const actions: PaperMonitorAction[] = []; const errors: string[] = [];
  const deadline = Date.now() + 20000; let checked = 0;
  // Bound concurrent providers and database calls; reuse one observation per pair.
  for (let offset = 0; offset < data.length; offset += 5) {
    if (Date.now() >= deadline) { errors.push(`Monitoring deadline reached; ${data.length - offset} positions remain`); break; }
    await Promise.all(data.slice(offset, offset + 5).map(async row => {
      try {
        checked++;
        if (!row.user_id || row.is_paper_trade !== true || typeof row.pair !== 'string') throw new Error('Invalid paper position scope');
        if (!quotes.has(row.pair)) quotes.set(row.pair, fetchPaperQuote(row.pair));
        const quote = await quotes.get(row.pair)!;
        if (!quote) throw new Error('Fresh market observation unavailable');
        const receipt = await applyPaperObservation(row.user_id, String(row.id), quote);
        actions.push(...receipt.actions);
      } catch (cause) {
        errors.push(`Position ${row.id}: ${cause instanceof Error ? cause.message : 'Paper monitoring unavailable'}`);
      }
    }));
  }
  return { positions_checked: checked, actions_taken: actions, errors };
}

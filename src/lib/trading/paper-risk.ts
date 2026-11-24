import type { CoordinatorDecision } from '../agents/types';
import type { OpenPosition } from './risk-manager';

// Educational assumptions shared by the preflight and the SQL paper engine.
// The transaction is authoritative for decimal rounding, concurrency and fills.
export const PAPER_FEE_RATE = 0.001;
export interface PaperRiskExposure {
  newPositionLoss: number;
  openPositionsLoss: number;
}

export function paperStoredAmount(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return NaN;
  return Number(value);
}

export function paperSlippagePct(pair: string): number {
  return ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'].includes(pair) ? 0.05 : 0.10;
}

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value < 1e12;
}

export function estimatePaperExecution(decision: CoordinatorDecision, quote: number) {
  const direction = decision.action === 'buy' ? 1 : decision.action === 'sell' ? -1 : 0;
  const price = Math.round(decision.entry_price * (1 + paperSlippagePct(decision.pair) / 100 * direction) * 1e8) / 1e8;
  const quantity = quote / price;
  if (!direction || ![quote, price, quantity, decision.stop_loss, decision.take_profit].every(positive)
    || (price - decision.stop_loss) * direction <= 0 || (decision.take_profit - price) * direction <= 0) {
    throw new Error('Invalid paper stop or target after slippage');
  }
  // Use the whole requested quote before quantity truncation. Reserve a small
  // buffer for the three 8-decimal rounded amounts in SQL (gross and two fees).
  const loss = (price - decision.stop_loss) * quantity * direction
    + quote * PAPER_FEE_RATE + decision.stop_loss * quantity * PAPER_FEE_RATE + 3e-8;
  if (!Number.isFinite(loss) || loss <= 0) throw new Error('Invalid projected paper loss');
  const reward = (decision.take_profit - price) * quantity * direction
    - quote * PAPER_FEE_RATE - decision.take_profit * quantity * PAPER_FEE_RATE - 3e-8;
  if (!Number.isFinite(reward)) throw new Error('Invalid projected paper reward');
  return { entryPrice: price, stopLoss: loss, reward, riskRewardRatio: reward / loss };
}

export function openPaperStopLoss(positions: OpenPosition[]): number {
  let loss = 0;
  for (const position of positions) {
    const { entry_price: entry, current_price: current, quantity, stop_loss: stop, fees, quote_amount: quote } = position;
    if (!/^[A-Z0-9]{1,20}\/USDT$/.test(position.symbol)
      || (position.side !== 'buy' && position.side !== 'sell')
      || ![entry, current, quantity, stop, quote].every(positive)
      || !Number.isFinite(fees) || fees < 0 || fees >= 1e12
      || Math.abs(quote - Math.round(entry * quantity * 1e8) / 1e8) > 1e-8) {
      throw new Error('Invalid open paper position');
    }
    // stop_loss is the effective persisted stop, including trailing/breakeven
    // moves. An observed gap beyond that stop is already an adverse exposure.
    const exit = position.side === 'buy' ? Math.min(stop, current) : Math.max(stop, current);
    const adverse = (entry - exit) * quantity * (position.side === 'buy' ? 1 : -1);
    loss += Math.max(0, adverse) + fees + exit * quantity * PAPER_FEE_RATE + 2e-8;
  }
  if (!Number.isFinite(loss)) throw new Error('Invalid open paper exposure');
  return loss;
}

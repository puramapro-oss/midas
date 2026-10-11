import type { CoordinatorDecision } from '../agents/types';

export function validatePaperDecision(decision: CoordinatorDecision): string[] {
  const reasons: string[] = [];
  if (decision.action !== 'buy' && decision.action !== 'sell') reasons.push('A paper operation requires buy or sell');
  if (typeof decision.pair !== 'string' || !decision.pair.trim() || decision.pair.length > 30) reasons.push('Invalid pair');
  for (const key of ['entry_price', 'stop_loss', 'take_profit', 'position_size_pct'] as const) {
    if (!Number.isFinite(decision[key]) || decision[key] <= 0) reasons.push(`Invalid ${key}`);
  }
  if (decision.position_size_pct > 100) reasons.push('Position size exceeds 100%');
  if (!Number.isFinite(decision.confidence) || decision.confidence < 0 || decision.confidence > 1) reasons.push('Invalid confidence');
  if (!Number.isFinite(decision.composite_score) || Math.abs(decision.composite_score) > 1) reasons.push('Invalid composite score');
  if (!Number.isFinite(decision.risk_reward_ratio) || decision.risk_reward_ratio < 0) reasons.push('Invalid risk/reward');
  if (decision.action === 'buy' && !(decision.stop_loss < decision.entry_price && decision.take_profit > decision.entry_price)) {
    reasons.push('Invalid buy stop or target');
  }
  if (decision.action === 'sell' && !(decision.stop_loss > decision.entry_price && decision.take_profit < decision.entry_price)) {
    reasons.push('Invalid sell stop or target');
  }
  return reasons;
}

export function paperPositionSize(capital: number, percentage: number, quoteAmount?: number) {
  if (!Number.isFinite(capital) || capital <= 0 || !Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    throw new Error('Invalid paper capital or position size');
  }
  const quote = quoteAmount ?? capital * percentage / 100;
  if (!Number.isFinite(quote) || quote <= 0 || quote > capital) throw new Error('Invalid paper quote amount');
  return { quoteAmount: quote, percentage: quote / capital * 100 };
}

export function paperRequest(decision: CoordinatorDecision, quoteAmount?: number) {
  return { decision, quote_amount: quoteAmount ?? null };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return '{' + Object.keys(object).sort().map(key => JSON.stringify(key) + ':' + canonical(object[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

export function samePaperRequest(saved: unknown, decision: CoordinatorDecision, quoteAmount?: number): boolean {
  // Match the JSON representation actually sent to PostgREST (including dates).
  return canonical(saved) === canonical(JSON.parse(JSON.stringify(paperRequest(decision, quoteAmount))));
}

export function validateOperationId(operationId: string): string {
  if (typeof operationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
    throw new Error('A stable operation UUID is required');
  }
  // PostgreSQL's UUID representation is lowercase regardless of caller casing.
  return operationId.toLowerCase();
}

/** The crash shield needs a recent, continuous hour of one-minute samples. */
export function hasUsableCrashHistory(candles: Array<{ timestamp: number; close: number }>, now = Date.now()): boolean {
  if (candles.length < 2 || candles.some(c => !Number.isFinite(c.timestamp) || !Number.isFinite(c.close) || c.close <= 0)) return false;
  const times = candles.map(c => c.timestamp).sort((a, b) => a - b);
  const last = times[times.length - 1];
  if (last < now - 120000 || last > now + 5000 || times[0] > now - 58 * 60000) return false;
  return times.every((time, i) => i === 0 || (time > times[i - 1] && time - times[i - 1] <= 120000));
}

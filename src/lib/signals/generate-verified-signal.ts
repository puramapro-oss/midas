import { coordinate } from '@/lib/ai/coordinator';
import { fetchKlinesWithSource } from '@/lib/exchange/binance-public';
import type { CoordinatorDecision } from '@/lib/agents/types';

const MIN_CANDLES = 200;

function signalStrength(decision: CoordinatorDecision): 'weak' | 'moderate' | 'strong' | 'very_strong' {
  const score = Math.abs(decision.composite_score);
  if (score >= 0.85) return 'very_strong';
  if (score >= 0.7) return 'strong';
  if (score >= 0.4) return 'moderate';
  return 'weak';
}

/** Builds a signal exclusively from observed market candles and the six-agent coordinator. */
export async function generateVerifiedSignal(pair: string) {
  const { candles, source } = await fetchKlinesWithSource(pair, '4h', 300);
  if (candles.length < MIN_CANDLES) {
    throw new Error(`${pair}: donnees marche insuffisantes (${candles.length}/${MIN_CANDLES})`);
  }

  const decision = await coordinate({
    pair,
    candles,
    account_balance: 10_000,
    current_drawdown_pct: 0,
    open_positions: 0,
    daily_trades_count: 0,
  });

  const agent = (name: string) => decision.agent_results.find((result) => result.agent_name === name);

  return {
    pair,
    exchange: source,
    direction: decision.action,
    strength: signalStrength(decision),
    composite_score: decision.composite_score,
    technical_score: agent('technical')?.score ?? null,
    sentiment_score: agent('sentiment')?.score ?? null,
    onchain_score: agent('onchain')?.score ?? null,
    confidence: Math.round(decision.confidence * 100),
    entry_price: decision.entry_price || candles.at(-1)?.close || null,
    stop_loss: decision.stop_loss || null,
    take_profit: decision.take_profit || null,
    risk_reward_ratio: decision.risk_reward_ratio,
    timeframe: '4h',
    strategy_recommended: decision.strategy,
    reasoning: decision.reasoning,
    indicators: {
      source,
      candle_count: candles.length,
      approved_by_shield: decision.approved_by_shield,
      position_size_pct: decision.position_size_pct,
      agents: decision.agent_results,
    },
    is_active: true,
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  };
}

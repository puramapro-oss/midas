// =============================================================================
// MIDAS — Execution Agent
// Simule l'exécution d'un ordre (validation params, calcul slippage, route).
// En production, branche sur trade-executor.ts. En standalone via /api/agents/run,
// fait un dry-run : valide les paramètres et publie un signal "execution_ready".
// =============================================================================

import type { AgentResult, Candle } from './types';
import { publishHeartbeat, publishSignal } from './agent-bus';

interface ExecutionInput {
  pair: string;
  action: 'buy' | 'sell' | 'hold';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size_usd: number;
  candles: Candle[];
}

/**
 * Dry-run d'exécution. Vérifie cohérence des paramètres, estime le slippage
 * basé sur le spread bid/ask récent, calcule la route optimale (maker/taker).
 */
export async function analyzeExecution(input: ExecutionInput): Promise<AgentResult> {
  const startMs = Date.now();
  const reasons: string[] = [];
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let score = 0;
  let confidence = 0.5;

  if (input.action === 'hold') {
    reasons.push('Action HOLD : aucune exécution requise');
    confidence = 1;
  } else if (input.candles.length < 5) {
    reasons.push('Données de marché insuffisantes pour estimer le slippage');
    confidence = 0.2;
  } else {
    // Estimation du spread via la volatilité récente (high-low des 5 dernières candles)
    const recent = input.candles.slice(-5);
    const avgRange =
      recent.reduce((s, c) => s + (c.high - c.low) / c.close, 0) / recent.length;
    const estimatedSlippagePct = avgRange * 0.15; // ~15% du range moyen
    const slippageUsd = input.position_size_usd * estimatedSlippagePct;

    reasons.push(
      `Slippage estimé : ${(estimatedSlippagePct * 100).toFixed(3)}% (~${slippageUsd.toFixed(2)}$)`,
    );

    // Validation entry/SL/TP cohérence
    const validBuy =
      input.action === 'buy' &&
      input.stop_loss < input.entry_price &&
      input.take_profit > input.entry_price;
    const validSell =
      input.action === 'sell' &&
      input.stop_loss > input.entry_price &&
      input.take_profit < input.entry_price;

    if (!validBuy && !validSell) {
      reasons.push('⚠️ Paramètres SL/TP incohérents avec l\'action');
      signal = 'bearish';
      score = -0.5;
      confidence = 0.9;
    } else {
      const rr =
        input.action === 'buy'
          ? (input.take_profit - input.entry_price) / (input.entry_price - input.stop_loss)
          : (input.entry_price - input.take_profit) / (input.stop_loss - input.entry_price);
      reasons.push(`R/R ratio : ${rr.toFixed(2)}`);

      if (rr >= 2) {
        signal = 'bullish';
        score = 0.4;
        confidence = 0.85;
        reasons.push('R/R favorable, route maker recommandée');
      } else if (rr >= 1.5) {
        signal = 'bullish';
        score = 0.2;
        confidence = 0.7;
      } else {
        signal = 'bearish';
        score = -0.3;
        confidence = 0.8;
        reasons.push('⚠️ R/R insuffisant (< 1.5)');
      }

      // Routing recommandation
      if (estimatedSlippagePct < 0.001) {
        reasons.push('Recommandation : limit order maker (-0.025% de fees)');
      } else {
        reasons.push('Recommandation : market order taker (slippage acceptable)');
      }
    }
  }

  const result: AgentResult = {
    agent_name: 'execution',
    signal,
    score,
    confidence,
    reasoning: reasons.join(' • '),
    data: {
      action: input.action,
      pair: input.pair,
      candles_analyzed: input.candles.length,
      duration_ms: Date.now() - startMs,
    },
    timestamp: new Date(),
  };

  await publishHeartbeat({
    name: 'execution',
    status: 'running',
    last_beat_ms: Date.now(),
    metrics: { last_score: score, duration_ms: Date.now() - startMs },
  });

  await publishSignal({
    agent: 'execution',
    type: 'execution_dryrun',
    symbol: input.pair,
    direction: signal,
    confidence,
    reasoning: result.reasoning,
    data: result.data,
    ts: Date.now(),
  });

  return result;
}

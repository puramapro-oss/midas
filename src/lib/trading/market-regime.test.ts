import test from 'node:test';
import assert from 'node:assert/strict';
import { detectRegime, getAllowedStrategies, isStrategyAllowed } from './market-regime.ts';
import type { Candle, MarketRegime } from '@/lib/agents/types';

function candles(prices: number[]): Candle[] {
  // Construit des bougies où close suit `prices` ; open = close précédent.
  return prices.map((close, i) => {
    const open = i === 0 ? close : prices[i - 1];
    return {
      timestamp: 1_700_000_000_000 + i * 3_600_000,
      open,
      high: Math.max(open, close) * 1.001,
      low: Math.min(open, close) * 0.999,
      close,
      volume: 100,
    };
  });
}

test('fewer than 10 candles fails safe to a low-confidence ranging regime', () => {
  const result = detectRegime(candles(Array(5).fill(100)), 10, 'above', 1, 1);
  assert.equal(result.regime, 'ranging');
  assert.equal(result.confidence, 0.2);
});

test('the brief crash rule fires: F&G < 10 and -15% over the window', () => {
  // 7 bougies stables puis 7 bougies en chute (~ -19% sur les 7 dernières)
  const drop = candles([...Array(7).fill(100), 99, 98, 97, 96, 95, 94, 80]);
  const result = detectRegime(drop, 10, 'below', 1, 1, 5);
  assert.equal(result.regime, 'crash');
  assert.equal(result.confidence, 0.95);
});

test('a -10% move over 5 candles is classified as a crash', () => {
  const drop = candles([...Array(10).fill(100), 88, 88, 88]);
  const result = detectRegime(drop, 10, 'below', 1, 1);
  assert.equal(result.regime, 'crash');
});

test('an orderly uptrend above EMA200 with ADX>25 is a strong bull', () => {
  const up = candles(Array.from({ length: 30 }, (_, i) => 100 + i * 2)); // +58%
  const result = detectRegime(up, 30, 'above', 1, 1);
  assert.equal(result.regime, 'strong_bull');
  assert.ok(result.allowedStrategies.includes('momentum'));
});

test('a mild uptrend without trend strength stays a weak bull', () => {
  const up = candles(Array.from({ length: 30 }, (_, i) => 100 + i * 0.5)); // +15%
  const result = detectRegime(up, 10, 'above', 1, 1);
  assert.equal(result.regime, 'weak_bull');
  assert.ok(result.confidence <= 0.75);
});

test('an orderly downtrend below EMA200 with ADX>25 is a strong bear', () => {
  // Pente douce : -9% sur 20 bougies — sous les seuils de crash (-10% en 5, -15% en 10)
  const down = candles(Array.from({ length: 30 }, (_, i) => 200 - i * 1.5));
  const result = detectRegime(down, 30, 'below', 1, 1);
  assert.equal(result.regime, 'strong_bear');
});

test('ATR spikes without trend direction classify as high volatility', () => {
  const choppy = candles([100, 105, 97, 108, 96, 107, 98, 109, 97, 106, 99, 108]);
  const result = detectRegime(choppy, 10, 'above', 3, 1); // volatilityRatio = 3 > 2
  assert.equal(result.regime, 'high_volatility');
});

test('allowed strategies are consistent with the strategy map', () => {
  const regimes: MarketRegime[] = ['crash', 'ranging', 'strong_bull'];
  for (const regime of regimes) {
    const strategies = getAllowedStrategies(regime);
    assert.ok(strategies.length > 0);
    assert.ok(isStrategyAllowed(strategies[0], regime));
  }
  assert.equal(isStrategyAllowed('scalping_invente', 'crash'), false);
});

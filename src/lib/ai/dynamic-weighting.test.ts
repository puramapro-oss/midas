import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWeights,
  getDefaultWeights,
  adjustWeightsForRegime,
  adjustWeightsForPerformance,
  calculateFinalWeights,
  weightsToRecord,
} from './dynamic-weighting.ts';
import type { MarketRegime } from '@/lib/agents/types';

const ALL_REGIMES: MarketRegime[] = [
  'strong_bull', 'weak_bull', 'ranging', 'weak_bear', 'strong_bear',
  'crash', 'high_volatility', 'low_volatility',
];

function sum(weights: Record<string, number>): number {
  return Object.values(weights).reduce((s, w) => s + w, 0);
}

test('weights sum to exactly 1 in every market regime', () => {
  for (const regime of ALL_REGIMES) {
    const w = adjustWeightsForRegime(regime);
    assert.ok(Math.abs(sum(weightsToRecord(w)) - 1) < 1e-12, regime);
  }
});

test('normalization rescues a zeroed weight set to the defaults', () => {
  const zero = normalizeWeights({ technical: 0, sentiment: 0, onchain: 0, pattern: 0, calendar: 0 });
  const defaults = getDefaultWeights();
  assert.deepEqual(zero, defaults);
});

test('crash regimes shift weight from technical towards sentiment', () => {
  const bull = adjustWeightsForRegime('strong_bull');
  const crash = adjustWeightsForRegime('crash');
  assert.ok(crash.sentiment > bull.sentiment);
  assert.ok(crash.technical < bull.technical);
});

test('performance blending never breaks the sum-to-one invariant', () => {
  const base = adjustWeightsForRegime('ranging');
  for (const blend of [0, 0.25, 0.5, 1, 5]) { // 5 is clamped to 1
    const w = adjustWeightsForPerformance(base, { technical: 0.9, sentiment: 0.1 }, blend);
    assert.ok(Math.abs(sum(weightsToRecord(w)) - 1) < 1e-12);
  }
});

test('a consistently strong performer gains weight after blending', () => {
  const base = adjustWeightsForRegime('ranging');
  const blended = adjustWeightsForPerformance(base, { technical: 1 }, 1);
  assert.ok(blended.technical > base.technical);
});

test('calculateFinalWeights without performances equals the regime weights', () => {
  const regime = calculateFinalWeights('crash');
  assert.deepEqual(regime, adjustWeightsForRegime('crash'));
});

test('unknown regimes are impossible by typing, but the map covers all declared regimes', () => {
  const regimesWithEntry = ALL_REGIMES.filter((r) => {
    const w = adjustWeightsForRegime(r);
    return Number.isFinite(w.technical);
  });
  assert.equal(regimesWithEntry.length, ALL_REGIMES.length);
});

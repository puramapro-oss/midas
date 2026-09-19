import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCompositeScore, normalizeScore, calculateDirectionalScore } from './scoring.ts';
import type { AgentResult } from '@/lib/agents/types';

function agent(name: string, score: number, confidence = 0.8, signal: AgentResult['signal'] = 'bullish'): AgentResult {
  return { agent_name: name, signal, score, confidence, reasoning: 'test', data: {}, timestamp: new Date() };
}

test('the risk agent never contributes to the directional composite', () => {
  const without = calculateCompositeScore([agent('technical', 0.5), agent('sentiment', 0.5)]);
  const withRisk = calculateCompositeScore([agent('technical', 0.5), agent('sentiment', 0.5), agent('risk', -1, 1)]);
  assert.deepEqual(without.score, withRisk.score);
  assert.ok(!('risk' in withRisk.weighted_contributions));
});

test('composite score is a weighted average clamped to [-1, 1]', () => {
  // poids défaut : technical .30, sentiment .15 -> (0.30*2 + 0.15*-2) / 0.45 = 2/3
  const result = calculateCompositeScore([agent('technical', 2), agent('sentiment', -2)]);
  assert.ok(Math.abs(result.score - 2 / 3) < 1e-12);
  const allMax = calculateCompositeScore([
    agent('technical', 1), agent('sentiment', 1), agent('onchain', 1),
    agent('pattern', 1), agent('calendar', 1),
  ]);
  assert.equal(allMax.score, 1);
});

test('signal thresholds map the composite to bullish / bearish / neutral', () => {
  assert.equal(calculateCompositeScore([agent('technical', 0.5)]).signal, 'bullish');
  assert.equal(calculateCompositeScore([agent('technical', -0.5)]).signal, 'bearish');
  assert.equal(calculateCompositeScore([agent('technical', 0.1)]).signal, 'neutral');
});

test('unknown agents fall back to a small default weight instead of being dropped', () => {
  const known = calculateCompositeScore([agent('technical', 1)]);
  const mixed = calculateCompositeScore([agent('technical', 1), agent('stranger', 0)]);
  assert.ok(mixed.score < known.score); // stranger dilutes via 0.1 default weight
});

test('confidence is boosted by alignment and never exceeds 0.95', () => {
  const aligned = calculateCompositeScore([
    agent('technical', 0.5, 1), agent('sentiment', 0.5, 1), agent('onchain', 0.5, 1),
    agent('pattern', 0.5, 1), agent('calendar', 0.5, 1),
  ]);
  assert.ok(aligned.confidence <= 0.95);
  const divergent = calculateCompositeScore([
    agent('technical', 0.9, 1), agent('sentiment', -0.9, 1, 'bearish'),
  ]);
  assert.ok(aligned.confidence > divergent.confidence);
});

test('normalizeScore maps the input range onto [-1, 1] and clamps outside values', () => {
  assert.equal(normalizeScore(0), 0);
  assert.equal(normalizeScore(1), 1);
  assert.equal(normalizeScore(-1), -1);
  assert.equal(normalizeScore(5, 0, 10), 0);
  assert.equal(normalizeScore(50, 0, 100), 0);
});

test('directional score is zero unless the composite signal matches the direction', () => {
  const results = [agent('technical', 0.5)];
  assert.ok(calculateDirectionalScore(results, 'buy') > 0);
  assert.equal(calculateDirectionalScore(results, 'sell'), 0);
});

test('property: composite stays within [-1, 1] for any agent scores', () => {
  let seed = 7;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 2_000; i++) {
    const results = ['technical', 'sentiment', 'onchain', 'pattern', 'calendar']
      .map((name) => agent(name, next() * 4 - 2, next()));
    const composite = calculateCompositeScore(results);
    assert.ok(composite.score >= -1 && composite.score <= 1);
    assert.ok(composite.confidence >= 0 && composite.confidence <= 0.95);
  }
});

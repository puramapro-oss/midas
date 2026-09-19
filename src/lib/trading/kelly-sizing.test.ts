import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kellyFraction,
  halfKelly,
  quarterKelly,
  optimalSize,
  kellyMetrics,
} from './kelly-sizing.ts';

test('kellyFraction computes the textbook formula on a known edge', () => {
  // b=2, p=0.6 -> f = (2*0.6 - 0.4)/2 = 0.4
  assert.ok(Math.abs(kellyFraction(0.6, 2) - 0.4) < 1e-12);
});

test('kellyFraction returns zero without an edge or with invalid stats', () => {
  assert.equal(kellyFraction(0.3, 2), 0); // negative edge
  assert.equal(kellyFraction(0, 2), 0);
  assert.equal(kellyFraction(1, 2), 0);
  assert.equal(kellyFraction(0.6, 0), 0);
});

test('half and quarter Kelly are capped at 5% of capital', () => {
  assert.equal(halfKelly(0.9, 5), 0.05); // full=0.86 -> half=0.43 -> capped
  assert.equal(quarterKelly(0.9, 5), 0.05); // full/4=0.215 -> capped
  assert.ok(Math.abs(halfKelly(0.52, 1.1) - kellyFraction(0.52, 1.1) / 2) < 1e-12); // sous le cap
});

test('optimalSize never risks more than 5% of capital, for every profile', () => {
  const capital = 10_000;
  for (const riskProfile of ['very_conservative', 'conservative', 'moderate', 'aggressive'] as const) {
    const size = optimalSize(capital, 0.8, 300, 100, riskProfile);
    assert.ok(size > 0, riskProfile);
    assert.ok(size <= capital * 0.05 + 1e-9, `${riskProfile}: ${size}`);
  }
});

test('optimalSize ordering respects risk aversion', () => {
  const capital = 1_000_000; // large capital so caps do not flatten the ordering
  const q = optimalSize(capital, 0.55, 2, 1, 'very_conservative');
  const h = optimalSize(capital, 0.55, 2, 1, 'conservative');
  const a = optimalSize(capital, 0.55, 2, 1, 'aggressive');
  assert.ok(q <= h);
  assert.ok(h <= a);
});

test('optimalSize returns zero on invalid statistics', () => {
  assert.equal(optimalSize(10_000, 0, 100, 50, 'conservative'), 0);
  assert.equal(optimalSize(10_000, 0.6, 0, 50, 'conservative'), 0);
  assert.equal(optimalSize(-1, 0.6, 100, 50, 'conservative'), 0);
});

test('kellyMetrics reports no edge and zero growth for a losing system', () => {
  const m = kellyMetrics(0.3, 1);
  assert.equal(m.hasEdge, false);
  assert.equal(m.fullKelly, 0);
  assert.equal(m.kellyGrowthRate, 0);
  assert.ok(m.expectedValue < 0);
});

test('property: kelly outputs stay within [0, 0.05] for any valid statistics', () => {
  // LCG déterministe (pas de Math.random) — 5 000 tirages reproductibles.
  let seed = 42;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 5_000; i++) {
    const p = 0.01 + next() * 0.98; // (0.01, 0.99)
    const b = 0.1 + next() * 10;
    assert.ok(halfKelly(p, b) >= 0 && halfKelly(p, b) <= 0.05);
    assert.ok(quarterKelly(p, b) >= 0 && quarterKelly(p, b) <= 0.05);
  }
});

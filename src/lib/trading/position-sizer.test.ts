import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePositionSize,
  kellySize,
  adjustForVolatility,
  optimalPositionSize,
} from './position-sizer.ts';

test('fixed-fractional sizing risks exactly the requested amount at the stop', () => {
  // capital 10k, risque 1% = 100 USD ; entrée 100, stop 95 -> 5 USD par unité -> 20 unités
  const size = calculatePositionSize(10_000, 1, 100, 95);
  assert.ok(Math.abs(size - 20) < 1e-9);
});

test('sizing fails closed on invalid inputs', () => {
  assert.equal(calculatePositionSize(0, 1, 100, 95), 0);
  assert.equal(calculatePositionSize(10_000, 0, 100, 95), 0);
  assert.equal(calculatePositionSize(10_000, 1, 0, 95), 0);
  assert.equal(calculatePositionSize(10_000, 1, 100, 0), 0);
  assert.equal(calculatePositionSize(10_000, 1, 100, 100), 0);
});

test('kellySize is clamped between 0 and 25 percent', () => {
  assert.equal(kellySize(0, 2), 0);
  assert.equal(kellySize(1, 2), 0);
  assert.equal(kellySize(0.6, 0.1), 0);
  assert.ok(Math.abs(kellySize(0.6, 2) - 0.2) < 1e-12); // half of 0.4
  assert.equal(kellySize(0.95, 20), 0.25); // (19-0.05)/20=0.9475 -> /2 -> capped 0.25
});

test('volatility adjustment shrinks size when ATR spikes and caps the extremes', () => {
  assert.ok(Math.abs(adjustForVolatility(10, 2, 1) - 5) < 1e-9); // 2x vol -> half
  assert.ok(Math.abs(adjustForVolatility(10, 1, 2) - 20) < 1e-9); // calm -> 2x cap
  assert.equal(adjustForVolatility(10, 100, 1), 2.5); // floor 0.25x
  assert.equal(adjustForVolatility(10, 0.01, 1), 20); // ceiling 2x
  assert.equal(adjustForVolatility(10, 0, 1), 0);
});

test('optimalPositionSize picks the more conservative of fixed and kelly', () => {
  const result = optimalPositionSize({
    capital: 10_000,
    riskPct: 2,
    entryPrice: 100,
    stopLossPrice: 90,
    winRate: 0.9,
    avgWinLossRatio: 9,
    currentATR: 1,
    avgATR: 1,
  });
  // fixed: 200 USD / 10 diff = 20 unités ; kelly: full=0.88 -> half=0.44 -> clamp 0.25
  // -> 2500 USD / 100 = 25 unités ; conservative = min(20, 25) = 20
  assert.ok(Math.abs(result.size - 20) < 1e-9);
  assert.equal(result.method, 'fixed-fractional');
});

test('optimalPositionSize falls back to fixed-fractional when kelly has no edge', () => {
  const result = optimalPositionSize({
    capital: 10_000, riskPct: 2, entryPrice: 100, stopLossPrice: 90,
    winRate: 0, avgWinLossRatio: 2, currentATR: 1, avgATR: 1,
  });
  assert.equal(result.size, 20); // kellySize=0 -> min(fixed, fixed) = fixed
  assert.equal(result.method, 'fixed-fractional');
});

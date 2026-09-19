import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateSlippage,
  estimateSlippageWithProfitCheck,
  recommendExecutionMethod,
} from './slippage-estimator.ts';

test('slippage is tiered by pair liquidity', () => {
  const major = estimateSlippage('BTC/USDT', 1_000, 50_000, 1_000_000_000);
  const mid = estimateSlippage('LINK/USDT', 1_000, 5, 1_000_000_000);
  const small = estimateSlippage('NOBODY/USDT', 1_000, 0.01, 1_000_000_000);
  assert.equal(major.estimatedSlippagePct, 0.01);
  assert.equal(mid.estimatedSlippagePct, 0.05);
  assert.equal(small.estimatedSlippagePct, 0.15);
});

test('slippage grows with the order-to-volume ratio and is capped at 5%', () => {
  const tiny = estimateSlippage('BTC/USDT', 1_000, 50_000, 10_000_000_000);
  const large = estimateSlippage('BTC/USDT', 50_000_000, 50_000, 10_000_000_000);
  assert.ok(large.estimatedSlippagePct > tiny.estimatedSlippagePct);
  const whale = estimateSlippage('NOBODY/USDT', 700_000_000, 0.01, 10_000_000_000);
  assert.equal(whale.estimatedSlippagePct, 5); // hard cap
});

test('missing volume data assumes high slippage, not zero', () => {
  const noData = estimateSlippage('BTC/USDT', 1_000, 50_000, 0);
  assert.equal(noData.estimatedSlippagePct, 0.1); // 0.01 * 10
});

test('taker fees are computed on the notional and round-trip doubles them', () => {
  const one = estimateSlippage('BTC/USDT', 10_000, 50_000, 10_000_000_000);
  assert.equal(one.estimatedFees, 10); // 0.1% of 10 000
  const round = estimateSlippageWithProfitCheck('BTC/USDT', 10_000, 50_000, 10_000_000_000, 3, 2);
  assert.equal(round.estimatedFees, 20);
});

test('profitability check compares expected profit to round-trip costs', () => {
  // BTC 0.01% slippage each way + 0.2% fees = ~0.22% total
  const good = estimateSlippageWithProfitCheck('BTC/USDT', 10_000, 50_000, 10_000_000_000, 3, 2);
  const bad = estimateSlippageWithProfitCheck('BTC/USDT', 10_000, 50_000, 10_000_000_000, 0.1, 2);
  assert.equal(good.isProfitableAfterCosts, true);
  assert.equal(bad.isProfitableAfterCosts, false);
  assert.ok(good.adjustedRiskReward > bad.adjustedRiskReward);
});

test('execution method escalates with relative order size', () => {
  assert.equal(recommendExecutionMethod(1_000, 0, 'high').method, 'limit'); // no data -> protect price
  assert.equal(recommendExecutionMethod(1_000, 1_000_000, 'low').method, 'limit');
  assert.equal(recommendExecutionMethod(1_000, 1_000_000, 'high').method, 'market');
  assert.equal(recommendExecutionMethod(8_000, 1_000_000, 'low').method, 'iceberg'); // 0.8% of volume
  assert.equal(recommendExecutionMethod(100_000, 1_000_000, 'low').method, 'twap'); // 10% of volume
});

test('invalid order data yields a zero-cost estimate, never a negative one', () => {
  const zero = estimateSlippage('BTC/USDT', 0, 50_000, 1_000_000);
  assert.equal(zero.totalCost, 0);
  assert.equal(zero.isProfitableAfterCosts, false);
});

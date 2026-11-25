import assert from 'node:assert/strict';
import test from 'node:test';
import { compareOrderCost, type CostQuote } from './order-cost-comparison.ts';

const quote: CostQuote = { ask: '100.10', bid: '99.90', commission: '0', fees: '1' };

test('compares the cash flows of opposite orders without adding spread twice', () => {
  assert.deepEqual(compareOrderCost('1', quote), { purchase: 10110, sale: 9890, roundTrip: 220, spread: 20 });
  assert.deepEqual(compareOrderCost('1', { ask: '100,30', bid: '99,70', commission: '0,10', fees: '0' }),
    { purchase: 10040, sale: 9960, roundTrip: 80, spread: 60 });
});

test('commissions apply to the executed amount and fixed fees only once per order', () => {
  assert.deepEqual(compareOrderCost('2.5', { ask: '20', bid: '18', commission: '2', fees: '1',
    saleCharges: { commission: '1', fees: '2' } }),
    { purchase: 5200, sale: 4255, roundTrip: 945, spread: 500 });
});

test('preserves crypto precision and rounds each final cash flow to the cent', () => {
  assert.deepEqual(compareOrderCost(',00000001', { ask: '1000000', bid: '500000', commission: '0', fees: '0' }),
    { purchase: 1, sale: 1, roundTrip: 0, spread: 0 });
  assert.deepEqual(compareOrderCost('1', { ask: '1.005', bid: '1.005', commission: '0', fees: '0' }),
    { purchase: 101, sale: 101, roundTrip: 0, spread: 0 });
});

test('represents a sale with fees higher than its proceeds, including a negative half cent', () => {
  assert.deepEqual(compareOrderCost('.5', { ask: '1', bid: '1', commission: '0', fees: '0.505' }),
    { purchase: 101, sale: -1, roundTrip: 102, spread: 0 });
});

test('rejects incomplete, crossed, malformed, excessive or negative inputs', () => {
  for (const units of ['0', '', 'Infinity', '0.000000001', '1e3', '-1', '1 2']) {
    assert.ok(compareOrderCost(units, quote).error);
  }
  for (const changes of [{ ask: '0' }, { bid: '100.11' }, { ask: '' }, { fees: '-0.01' },
    { commission: '100.1' }, { saleCharges: { commission: '0', fees: '' } },
    { ask: '999999999999', bid: '999999999999' }]) {
    assert.ok(compareOrderCost('2', { ...quote, ...changes }).error);
  }
});

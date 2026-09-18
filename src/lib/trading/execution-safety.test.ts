import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSpotOrderSize, confirmedExecution } from './execution-safety.ts';

test('buy sizing never exceeds the available quote balance', () => {
  const result = calculateSpotOrderSize({
    side: 'buy', price: 100, positionSizePct: 10, configuredCapital: 10_000,
    freeBase: 0, freeQuote: 250,
  });
  assert.deepEqual(result, { quantity: 2.5, quoteAmount: 250 });
});

test('sell sizing never exceeds the available base balance', () => {
  const result = calculateSpotOrderSize({
    side: 'sell', price: 100, positionSizePct: 10, configuredCapital: 10_000,
    freeBase: 3, freeQuote: 0,
  });
  assert.deepEqual(result, { quantity: 3, quoteAmount: 300 });
});

test('an explicit quote budget is kept separate from percentage and price', () => {
  const result = calculateSpotOrderSize({
    side: 'buy', price: 50, positionSizePct: 2, configuredCapital: 10_000,
    requestedQuoteAmount: 125, freeBase: 0, freeQuote: 1_000,
  });
  assert.deepEqual(result, { quantity: 2.5, quoteAmount: 125 });
});

test('invalid or excessive percentages fail closed', () => {
  assert.throws(() => calculateSpotOrderSize({
    side: 'buy', price: 100, positionSizePct: 101, configuredCapital: 1_000,
    freeBase: 0, freeQuote: 1_000,
  }), /between 0 and 100/);
});

test('an unconfirmed exchange fill is never invented', () => {
  assert.throws(() => confirmedExecution({ id: 'order-1' } as never), /executed quantity/);
});

test('confirmed exchange fill uses only reported quantity and price', () => {
  const result = confirmedExecution({ filled: 1.25, average: 80, fee: { cost: 0.1 } } as never);
  assert.deepEqual(result, { quantity: 1.25, price: 80, fees: 0.1 });
});

test('a partial fill is sent to reconciliation instead of treated as complete', () => {
  assert.throws(() => confirmedExecution({ filled: 1, remaining: 1, average: 80 } as never), /partially filled/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCrashObservation } from './crash-observation.ts';
const now = Date.parse('2026-10-11T12:00:00Z');
const row = { id: 'bitcoin', price_change_percentage_1h_in_currency: -5, last_updated: new Date(now).toISOString() };
test('a fresh BTC change distinguishes a threshold crash from an observed stable zero', () => {
  assert.equal(parseCrashObservation([row], now).isCrash, true);
  const flat = parseCrashObservation([{ ...row, price_change_percentage_1h_in_currency: 0 }], now);
  assert.equal(flat.isCrash, false); assert.equal(flat.change1h, 0); assert.equal(flat.observedAt, now);
});
test('missing, wrong-asset, malformed or stale crash data never becomes a stable result', () => {
  for (const invalid of [null, [], {}, [row, row], [{ ...row, id: 'ethereum' }],
    ...[undefined, null, '0', NaN, Infinity, -101].map(change => [{ ...row, price_change_percentage_1h_in_currency: change }]),
    ...[undefined, 'invalid', new Date(now - 120001).toISOString(), new Date(now + 5001).toISOString()]
      .map(date => [{ ...row, last_updated: date }]),
  ]) assert.throws(() => parseCrashObservation(invalid, now));
});

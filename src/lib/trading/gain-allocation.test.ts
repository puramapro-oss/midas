import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateGain, projectFirstYear, readAmount, type FirstYear } from './gain-allocation.ts';

const firstYear: FirstYear = { realized: 10_000, marketCosts: 0, subscription: 1000, earlierLoss: 0, openPnl: 0, target: 0 };
const allocation = { bank: 40, savings: 30, investment: 20, shopping: 10 };

test('charges 3% only after fixed subscription and spreads the available gain', () => {
  const { feeBase, fee, netGain } = projectFirstYear(firstYear);
  assert.deepEqual([feeBase, fee, netGain], [9000, 270, 8730]);
  assert.deepEqual(allocateGain(netGain, 15_000, allocation), {
    available: 8730, amounts: { bank: 3492, savings: 2619, investment: 1746, shopping: 873 }, unassigned: 0,
  });
  assert.deepEqual(allocateGain(netGain, 2000, allocation).amounts, { bank: 800, savings: 600, investment: 400, shopping: 200 });
});

test('restores same-mandate losses, deducts costs once, limits the fee to outperformance', () => {
  const { economicGain, feeBase, fee } = projectFirstYear({
    ...firstYear, marketCosts: 1200, earlierLoss: 2000, openPnl: -800, target: 4500,
  });
  assert.deepEqual([economicGain, feeBase, fee], [5000, 500, 15]);
  assert.equal(projectFirstYear({ ...firstYear, target: 9500 }).fee, 0);
  assert.equal(projectFirstYear({ ...firstYear, realized: -1000 }).lossToRecover, 2000);
});

test('ignores positive open gains and holds back unresolved losses from the distributable gain', () => {
  assert.deepEqual(projectFirstYear({ ...firstYear, openPnl: 100_000 }), projectFirstYear(firstYear));
  const result = projectFirstYear({ ...firstYear, openPnl: -10_000 });
  assert.deepEqual([result.netGain, result.fee, result.lossToRecover], [-1000, 0, 1000]);
  assert.equal(allocateGain(result.netGain, 20_000, allocation).available, 0);
  assert.equal(allocateGain(5000, 0, allocation).available, 0);
});

test('uses only whole cents and preserves unassigned shares and rounding residue', () => {
  const partial = { bank: 25, savings: 25, investment: 0, shopping: 0 };
  assert.equal(allocateGain(99, 99, partial).unassigned, 51);
  assert.equal(allocateGain(3, 3, allocation).unassigned, 2);
  assert.equal(allocateGain(99, 99, { bank: 100, savings: 0, investment: 0, shopping: 0 }).amounts.bank, 99);
  assert.equal(projectFirstYear({ ...firstYear, realized: 33, subscription: 0 }).fee, 0);
  assert.equal(projectFirstYear({ ...firstYear, realized: 34, subscription: 0 }).fee, 1);
});

test('supports French decimal inputs and rejects unsupported precision, unknowns and negative fees', () => {
  assert.equal(readAmount('87,30'), 8730);
  assert.equal(readAmount('12.1'), 1210);
  assert.equal(readAmount('-0,01', true), -1);
  assert.equal(readAmount('99999999.99'), 9_999_999_999);
  for (const malformed of ['', '-1', '1e3', '1.234', '100000000', 'Infinity']) assert.equal(readAmount(malformed), null);
  assert.throws(() => projectFirstYear({ ...firstYear, marketCosts: -1 }), RangeError);
  assert.throws(() => projectFirstYear({ ...firstYear, target: NaN }), RangeError);
  assert.throws(() => allocateGain(100, NaN, allocation), RangeError);
  assert.throws(() => allocateGain(100, 100, { ...allocation, shopping: 11 }), RangeError);
  assert.throws(() => allocateGain(100, 100, { ...allocation, bank: 0.1 }), RangeError);
});

test('all partitions conserve cash and leave the performance fee independent of destination', () => {
  for (let cents = 1; cents <= 200; cents++) {
    for (let bank = 0; bank <= 100; bank++) {
      const { available, unassigned, amounts } = allocateGain(cents, 101, { bank, savings: 100 - bank, investment: 0, shopping: 0 });
      assert.equal(Object.values(amounts).reduce((sum, part) => sum + part, unassigned), Math.min(101, cents));
      assert.ok(available <= cents && unassigned >= 0);
    }
  }
});

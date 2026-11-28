import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateGain, projectFirstYear, projectGainHistory, readAmount, type FirstYear } from './gain-allocation.ts';

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

const year = (realized: number, overrides: Partial<FirstYear> = {}): FirstYear => ({
  realized, marketCosts: 0, subscription: 0, earlierLoss: 0, openPnl: 0, target: 0, ...overrides,
});

test('reproduces the three-anniversary customer statement and distinguishes annual from mandate gain', () => {
  const years = [year(10_000, { marketCosts: 2000 }), year(-5000), year(7000)];
  const history = projectGainHistory(years);
  assert.deepEqual(history.map(p => p.feeBase), [8000, 0, 2000]);
  assert.deepEqual(history.map(p => p.fee), [240, 0, 60]);
  assert.deepEqual(history.map(p => p.lossToRecover), [0, 5000, 0]);
  assert.deepEqual(history.map(p => p.annualNetGain), [7760, -5000, 6940]);
  assert.deepEqual(history.map(p => p.netGain), [7760, 2760, 9700]);
  assert.deepEqual(history.map(p => p.totalFees), [240, 240, 300]);
});

test('locks in an exempt high even when the first year earns no fee or only a partial fee', () => {
  for (const target of [6000, 10_000, 20_000]) {
    const history = projectGainHistory([year(10_000, { target }), year(-5000), year(5000), year(3000)]);
    assert.deepEqual(history.map(p => p.previousHigh), [0, 10_000, 10_000, 10_000]);
    assert.deepEqual(history.map(p => p.highWaterMark), [10_000, 10_000, 10_000, 13_000]);
    assert.deepEqual(history.map(p => p.feeBase), [Math.max(0, 10_000 - target), 0, 0, 3000]);
  }
});

test('caps the increase above a previous high at the actual outperformance for each year', () => {
  const history = projectGainHistory([year(10_000), year(-4000), year(6000, {target: 5000}), year(1000)]);
  const third = history[2];
  assert.deepEqual([third.annualEconomicGain, third.economicGain, third.feeBase, third.fee], [6000, 12_000, 1000, 30]);
  assert.equal(history[3].feeBase, 1000);
  assert.equal(history[3].totalFees, 360);
});

test('replaces closing latent snapshots and counts each annual subscription and separate loss once', () => {
  const history = projectGainHistory([
    year(10_000, { marketCosts: 500, subscription: 1000, earlierLoss: 500, openPnl: -3000 }),
    year(0, { subscription: 1000, openPnl: -2000 }),
    year(-2000, { subscription: 500, openPnl: 0 }),
    year(7500, { subscription: 1000, openPnl: 10_000, target: 200 }),
  ]);
  assert.deepEqual(history.map(p => p.realizedNet), [8000, -1000, -2500, 6500]);
  assert.deepEqual(history.map(p => p.economicGain), [5000, 5000, 4500, 11_000]);
  assert.deepEqual(history.map(p => p.annualEconomicGain), [5000, 0, -500, 6500]);
  assert.deepEqual(history.map(p => p.feeBase), [5000, 0, 0, 6000]);
  assert.deepEqual(history.map(p => p.fee), [150, 0, 0, 180]);
});

test('carries fee fractions across years without a charge on a flat anniversary', () => {
  const years = [year(17), year(0), year(17), year(32), year(1)];
  const history = projectGainHistory(years);
  assert.deepEqual(history.map(p => p.fee), [0, 0, 1, 0, 1]);
  assert.deepEqual(history.map(p => p.cumulativeFeeBase), [17, 17, 34, 66, 67]);
  assert.deepEqual(projectGainHistory(years), history);
  const corrected = projectGainHistory([year(0), ...years.slice(1)]);
  assert.deepEqual(corrected.map(p => p.totalFees), [0, 0, 0, 1, 1]);
  assert.deepEqual(projectGainHistory([]), []);
  assert.throws(() => projectGainHistory([year(10), year(10, { openPnl: NaN })]), RangeError);
});

test('conserves mandate gain and respects both fee caps across 4,000 mixed anniversary statements', () => {
  let state = 42;
  function sample(limit: number) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % limit;
  }
  for (let trial = 0; trial < 100; trial++) {
    const years = Array.from({length: 40}, () => year(sample(80_001) - 30_000, {
      marketCosts: sample(1200), subscription: sample(3000), earlierLoss: sample(1000),
      openPnl: sample(10_001) - 6000, target: sample(30_000),
    }));
    let net = 0;
    let fees = 0;
    let base = 0;
    let realized = 0;
    for (const [index, p] of projectGainHistory(years).entries()) {
      const input = years[index];
      realized += input.realized - input.marketCosts - input.subscription - input.earlierLoss;
      assert.equal(p.economicGain, realized + Math.min(input.openPnl, 0));
      assert.ok(p.feeBase >= 0 && p.feeBase <= Math.max(0, p.annualEconomicGain - input.target));
      assert.ok(p.feeBase <= Math.max(0, p.economicGain - p.previousHigh));
      assert.equal(p.highWaterMark, Math.max(p.economicGain, p.previousHigh));
      base += p.feeBase;
      fees += p.fee;
      net += p.annualNetGain;
      assert.equal(fees, Math.floor(base * 3 / 100));
      assert.equal(net, p.netGain);
      assert.equal(p.netGain + fees, p.economicGain);
    }
  }
});

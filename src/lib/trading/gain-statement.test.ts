import assert from 'node:assert/strict';
import test from 'node:test';
import type { FirstYear } from './gain-allocation.ts';
import { buildGainStatementCsv } from './gain-statement.ts';

const base: FirstYear = { realized: 0, marketCosts: 0, subscription: 0, earlierLoss: 0, openPnl: 0, target: 0 };

test('statement exports one settled row per year with french decimals, cumulative fees and recalculated corrections', () => {
  const years = [8000, -5000, 7000].map(realized => ({ ...base, realized }));
  const csv = buildGainStatementCsv(years);
  assert.ok(csv.startsWith('\uFEFFSimulation MIDAS · Année;'));
  const [header, ...rows] = csv.trim().split('\r\n').map(line => line.split(';'));
  assert.deepEqual(rows.map(row => row.length), [header.length, header.length, header.length]);
  const fees = header.indexOf('Commission simulée de l’année à 3 % (€)');
  assert.deepEqual(rows.map(row => row[fees]), ['2,40', '0,00', '0,60']);
  const final = rows[2];
  assert.equal(final[header.indexOf('Commissions simulées cumulées (€)')], '3,00');
  assert.equal(final[header.indexOf('Résultat net cumulé après commissions (€)')], '97,00');
  assert.equal(rows[1][header.indexOf('Résultat réalisé saisi (€)')], '-50,00');
  const corrected = buildGainStatementCsv([years[0], { ...base, realized: -8000 }, years[2]]);
  assert.equal(corrected.trim().split('\r\n')[3].split(';')[fees], '0,00');
  assert.equal(buildGainStatementCsv(years), csv);
});

test('empty history exports only headings and invalid source figures cannot become spreadsheet cells', () => {
  assert.equal(buildGainStatementCsv([]).trim().split('\r\n').length, 1);
  assert.throws(() => buildGainStatementCsv([{ ...base, realized: NaN }]), RangeError);
});

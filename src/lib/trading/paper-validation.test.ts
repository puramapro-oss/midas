import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePaperDecision, paperPositionSize, paperRequest, samePaperRequest, validateOperationId, hasUsableCrashHistory } from './paper-validation.ts';
import { paperFailure, parsePaperReceipt } from './paper-outcome.ts';
import type { CoordinatorDecision } from '../agents/types';

const decision: CoordinatorDecision = { action: 'buy', pair: 'BTC/USDT', composite_score: 0, confidence: 0.8,
  entry_price: 100, stop_loss: 95, take_profit: 110, position_size_pct: 1, strategy: 'manual', reasoning: 'Educational',
  agent_results: [], risk_reward_ratio: 2, approved_by_shield: false };
const operation = '11111111-1111-4111-8111-111111111111';

test('one invalid critical input blocks the decision without a compensating quality score', () => {
  assert.deepEqual(validatePaperDecision(decision), []);
  for (const field of ['entry_price', 'stop_loss', 'take_profit', 'position_size_pct', 'confidence', 'composite_score', 'risk_reward_ratio']) {
    assert.ok(validatePaperDecision({ ...decision, [field]: NaN }).length > 0, field);
  }
  assert.ok(validatePaperDecision({ ...decision, take_profit: 90 }).length > 0);
});
test('an explicit quote amount changes the size checked by the risk manager', () => {
  assert.deepEqual(paperPositionSize(10000, 1, 5000), { quoteAmount: 5000, percentage: 50 });
  for (const amount of [NaN, Infinity, -1, 0, 10001]) assert.throws(() => paperPositionSize(10000, 1, amount));
});
test('operation identity survives retries across every five-minute bucket', () => {
  validateOperationId(operation);
  assert.throws(() => validateOperationId('not-an-operation'));
  const saved = JSON.parse(JSON.stringify(paperRequest(decision, 100)));
  assert.equal(samePaperRequest(saved, { ...decision }, 100), true);
  assert.equal(samePaperRequest(saved, { ...decision, action: 'sell' }, 100), false);
  assert.equal(samePaperRequest(saved, decision, 200), false);
});
test('uncertain persistence retains the operation identifier and reconciliation state', () => {
  const outcome = paperFailure('Connection lost after commit', operation, true);
  assert.equal(outcome.operation_id, operation);
  assert.equal(outcome.state, 'reconciliation_required');
  assert.equal(outcome.success, false);
});
test('an unaudited or malformed receipt cannot become a successful execution', () => {
  const receipt = { ...paperFailure('', operation), success: true, trade_id: operation, executed_price: 100,
    executed_quantity: 1, error: null, state: 'paper_executed', audit_status: 'recorded' };
  assert.equal(parsePaperReceipt(receipt, operation).trade_id, operation);
  for (const invalid of [{ ...receipt, fees: NaN }, { ...receipt, is_paper: false }, { ...receipt, trade_id: null },
    { ...receipt, operation_id: 'another' }, { ...receipt, audit_status: 'unknown' }]) {
    assert.throws(() => parsePaperReceipt(invalid, operation), /receipt/);
  }
});

test('the crash shield rejects stale, future, incomplete and invalid price histories', () => {
  const now = 1800000000000;
  const history = Array.from({ length: 61 }, (_, i) => ({ timestamp: now - (60 - i) * 60000, close: 100 }));
  assert.equal(hasUsableCrashHistory(history, now), true);
  assert.equal(hasUsableCrashHistory(history.map(c => ({ ...c, timestamp: c.timestamp - 3600000 })), now), false);
  assert.equal(hasUsableCrashHistory(history.slice(50), now), false);
  assert.equal(hasUsableCrashHistory(history.filter((_, i) => i < 20 || i > 30), now), false);
  assert.equal(hasUsableCrashHistory([...history, { timestamp: now + 60000, close: 100 }], now), false);
  assert.equal(hasUsableCrashHistory([...history, { timestamp: now, close: NaN }], now), false);
});

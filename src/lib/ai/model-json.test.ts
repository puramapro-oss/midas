import test from 'node:test';
import assert from 'node:assert/strict';
import { parseModelJSON, validateSentiment, validateDecision } from './model-json.ts';

const sentiment = { overall_sentiment: 'neutral', score: 0, confidence: 0.5, key_themes: [], risk_events: [], reasoning: 'Sources limitées.' };
const decision = { action: 'buy', entry_price: 100, stop_loss: 95, take_profit: 110, position_size_pct: 1, risk_reward_ratio: 99, strategy: 'simulation', reasoning: 'Exercice.' };

test('valid JSON and one markdown fence are accepted and validated', () => {
  assert.deepEqual(parseModelJSON(JSON.stringify(sentiment), validateSentiment), sentiment);
  assert.deepEqual(parseModelJSON('```json\n' + JSON.stringify(sentiment) + '\n```', validateSentiment), sentiment);
});
test('syntactically valid but wrong model output is rejected', () => {
  for (const invalid of [null, [], 12, {}, { ...sentiment, confidence: 2 }, { ...sentiment, score: '0.2' },
    { ...sentiment, score: Infinity }, { ...sentiment, key_themes: [42] }, { ...sentiment, overall_sentiment: 'buy' }]) {
    assert.throws(() => validateSentiment(invalid), /Réponse IA invalide/);
  }
});
test('parse errors never echo private source material', () => {
  assert.throws(() => parseModelJSON('private-financial-data', validateSentiment), error =>
    error instanceof Error && !error.message.includes('private-financial-data'));
  assert.throws(() => parseModelJSON('x'.repeat(100001), validateSentiment), /trop longue/);
});
test('risk/reward is recomputed from prices, not trusted from the model', () => {
  assert.equal(validateDecision(decision).risk_reward_ratio, 2);
});
test('invalid price directions and non-finite or excessive sizes are rejected', () => {
  for (const invalid of [{ ...decision, stop_loss: 101 }, { ...decision, take_profit: 98 },
    { ...decision, position_size_pct: 101 }, { ...decision, entry_price: NaN }, { ...decision, entry_price: 0 }]) {
    assert.throws(() => validateDecision(invalid), /Réponse IA invalide/);
  }
});
test('sell decisions require a stop above entry and a target below entry', () => {
  assert.equal(validateDecision({ ...decision, action: 'sell', stop_loss: 105, take_profit: 90 }).risk_reward_ratio, 2);
  assert.throws(() => validateDecision({ ...decision, action: 'sell' }), /direction/);
});

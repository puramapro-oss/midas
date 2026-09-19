import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeConfluences, getDominantDirection, getConfluenceMultiplier } from './confluence-scoring.ts';
import type { AgentResult } from '@/lib/agents/types';

function agent(name: string, signal: AgentResult['signal'] = 'bullish', confidence = 0.8): AgentResult {
  return { agent_name: name, signal, score: signal === 'bullish' ? 0.5 : signal === 'bearish' ? -0.5 : 0, confidence, reasoning: 'test', data: {}, timestamp: new Date() };
}

test('four distinct directional agents are required to reach quorum', () => {
  const three = analyzeConfluences([agent('technical'), agent('sentiment'), agent('onchain')]);
  assert.equal(three.met, false);
  assert.equal(three.min_required, 4);
  const four = analyzeConfluences([
    agent('technical'), agent('sentiment'), agent('onchain'), agent('pattern'),
  ]);
  assert.equal(four.met, true);
});

test('low-confidence agents do not count toward the quorum', () => {
  const weak = analyzeConfluences([
    agent('technical', 'bullish', 0.2), agent('sentiment', 'bullish', 0.1),
    agent('onchain', 'bullish', 0.29), agent('pattern', 'bullish', 0.3),
  ]);
  assert.equal(weak.met, false); // only pattern clears the 0.3 floor
});

test('the risk agent is never a confluence source', () => {
  const withRisk = analyzeConfluences([
    agent('technical'), agent('sentiment'), agent('onchain'), agent('risk'),
  ]);
  assert.equal(withRisk.met, false);
});

test('dominant direction requires a clear margin between camps', () => {
  const bullHeavy = analyzeConfluences([
    agent('technical'), agent('sentiment', 'bullish', 1), agent('onchain', 'bullish', 1), agent('pattern', 'bullish', 1),
    agent('calendar', 'bearish', 0.31),
  ]);
  assert.equal(getDominantDirection(bullHeavy), 'bullish');
  const balanced = analyzeConfluences([
    agent('technical', 'bullish', 1), agent('sentiment', 'bearish', 1),
  ]);
  assert.equal(getDominantDirection(balanced), 'neutral');
});

test('the confluence multiplier only rewards met quorums and stays in (0.5, 1.5]', () => {
  const unmet = analyzeConfluences([agent('technical')]);
  assert.equal(getConfluenceMultiplier(unmet), 0);
  const split = analyzeConfluences([
    agent('technical', 'bullish', 1), agent('sentiment', 'bullish', 1),
    agent('onchain', 'bullish', 1), agent('pattern', 'bullish', 1),
    agent('calendar', 'bearish', 1),
  ]);
  const m = getConfluenceMultiplier(split);
  assert.ok(m > 0.5 && m <= 1.5);
});

test('confluence weights favour technical agreement over calendar agreement', () => {
  const tech = analyzeConfluences([agent('technical', 'bullish', 1)]);
  const cal = analyzeConfluences([agent('calendar', 'bullish', 1)]);
  assert.ok(tech.total_bullish > cal.total_bullish); // 1.5 vs 0.8 base weights
});

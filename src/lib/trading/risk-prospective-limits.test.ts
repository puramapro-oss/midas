import test from 'node:test';
import assert from 'node:assert/strict';
import * as levels from './risk-levels.ts';
import type { ShieldConfig } from '@/types/trading';
import type { CoordinatorDecision } from '@/lib/agents/types';
import { RiskManager, type UserProfile, type TradeHistory } from './risk-manager.ts';

const CONFIG: ShieldConfig = {
  max_daily_loss_pct: 1,
  max_daily_loss_usd: 0.05,
  max_position_size_pct: 2,
  max_leverage: 10,
  max_concurrent_positions: 5,
  max_correlation: 0.8,
  min_risk_reward: 1.5,
  min_confidence: 0.5,
  cooldown_after_loss_minutes: 30,
  max_consecutive_losses_before_pause: 3,
  blacklisted_symbols: [],
  allowed_hours_utc: null,
  manipulation_detection_enabled: true,
  slippage_tolerance_pct: 0.5,
  emergency_stop_enabled: true,
};

const PROFILE: UserProfile = {
  id: 'nominal-risk-test',
  plan: 'free',
  daily_loss_limit_usd: 1,
  weekly_loss_limit_usd: 2,
  monthly_loss_limit_usd: 4,
  max_position_size_pct: 2,
  max_concurrent_positions: 5,
  capital_usd: 5,
};

function decision(overrides: Partial<CoordinatorDecision> = {}): CoordinatorDecision {
  return {
    action: 'buy', pair: 'BTC/USDT', entry_price: 100, stop_loss: 95,
    take_profit: 112, confidence: 0.8, composite_score: 0.75,
    position_size_pct: 1, strategy: 'test', reasoning: 'test',
    agent_results: [], risk_reward_ratio: 2.4, approved_by_shield: true,
    ...overrides,
  };
}

function history(loss: number, ageMs = 1000): TradeHistory[] {
  return [{ pnl: -loss, closed_at: Date.now() - ageMs }];
}

test('L7 blocks the five-dollar counterexample while the first six levels pass', () => {
  const d = decision();
  const recent = history(0.049);
  const now = Date.now();
  const earlierLevels = [
    levels.level1PositionSizing(d, PROFILE, CONFIG),
    levels.level2ValidateStopLoss(d),
    levels.level3TrailingStopReady(d, CONFIG),
    levels.level4CheckCircuitBreaker(recent, CONFIG),
    levels.level5CheckCrashProtection([
      { timestamp: now - 3_600_000, price: 100 }, { timestamp: now - 1000, price: 100 },
    ], CONFIG),
    levels.level6CheckDiversification(d, [], PROFILE, CONFIG),
  ];
  assert.ok(earlierLevels.every((result) => result.passed));
  const result = levels.level7CheckUserLimits(d, PROFILE, recent, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /Daily loss.*nominal stop loss/);
});

test('L7 rejects buy and sell stop risk at or above the remaining daily allowance', () => {
  for (const action of ['buy', 'sell'] as const) {
    const d = decision({ action, stop_loss: action === 'buy' ? 95 : 105, take_profit: action === 'buy' ? 112 : 88 });
    assert.equal(levels.level7CheckUserLimits(d, PROFILE, history(0.0474), CONFIG).passed, true);
    assert.equal(levels.level7CheckUserLimits(d, PROFILE, history(0.0475), CONFIG).passed, false);
    assert.equal(levels.level7CheckUserLimits(d, PROFILE, history(0.0476), CONFIG).passed, false);
  }
});

test('L7 uses allocation percent and stop distance, without applying the leverage cap as leverage', () => {
  // 5 USD * 2% allocation * 5% stop distance = 0.005 USD, below 0.006 USD.
  const profile = { ...PROFILE, daily_loss_limit_usd: 0.006 };
  for (const maxLeverage of [1, 10, 100]) {
    assert.equal(levels.level7CheckUserLimits(decision({ position_size_pct: 2 }), profile, [], {
      ...CONFIG, max_leverage: maxLeverage,
    }).passed, true);
  }
});

test('L7 accounts for a new decision even when there are no previous losses', () => {
  const profile = { ...PROFILE, daily_loss_limit_usd: 0.0025 };
  assert.equal(levels.level7CheckUserLimits(decision(), profile, [], CONFIG).passed, false);
  assert.equal(levels.level7CheckUserLimits(decision({ position_size_pct: 0.9 }), profile, [], CONFIG).passed, true);
});

test('L7 adds nominal stop risk to the weekly and monthly windows independently', () => {
  const cases = [
    { label: 'Weekly', age: 3 * 86_400_000, profile: { ...PROFILE, weekly_loss_limit_usd: 0.05 } },
    { label: 'Monthly', age: 20 * 86_400_000, profile: { ...PROFILE, monthly_loss_limit_usd: 0.05 } },
  ];
  for (const { label, age, profile } of cases) {
    const result = levels.level7CheckUserLimits(decision(), profile, history(0.049, age), CONFIG);
    assert.equal(result.passed, false);
    assert.match(result.message, new RegExp(`${label} loss.*nominal stop loss`));
    assert.equal(levels.level7CheckUserLimits(decision(), profile, history(0.0474, age), CONFIG).passed, true);
  }
});

test('L7 never offsets the proposed stop risk with historical gains', () => {
  const recent = [...history(0.049), { pnl: 100, closed_at: Date.now() - 2000 }];
  assert.equal(levels.level7CheckUserLimits(decision(), PROFILE, recent, CONFIG).passed, false);
});

test('L7 handles decimal boundaries after adding nominal risk in every loss window', () => {
  // 20 USD * 1% allocation * 5% distance = 0.01 USD; 0.06 + 0.01 rounds below 0.07.
  const config = { ...CONFIG, max_daily_loss_usd: 100, max_daily_loss_pct: 100 };
  const base = { ...PROFILE, capital_usd: 20 };
  const cases = [
    { age: 1000, profile: { ...base, daily_loss_limit_usd: 0.07 } },
    { age: 3 * 86_400_000, profile: { ...base, weekly_loss_limit_usd: 0.07 } },
    { age: 20 * 86_400_000, profile: { ...base, monthly_loss_limit_usd: 0.07 } },
  ];
  for (const { age, profile } of cases) {
    assert.equal(levels.level7CheckUserLimits(decision(), profile, history(0.06, age), config).passed, false);
    assert.equal(levels.level7CheckUserLimits(decision(), profile, history(0.059, age), config).passed, true);
  }
});

test('L7 rejects missing, malformed or nonpositive nominal sizing inputs', () => {
  for (const field of ['entry_price', 'stop_loss', 'position_size_pct'] as const) {
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '1', 0, -1]) {
      const d = decision({ [field]: value } as unknown as Partial<CoordinatorDecision>);
      assert.equal(levels.level7CheckUserLimits(d, PROFILE, [], CONFIG).passed, false, `${field} ${String(value)}`);
    }
  }
  assert.equal(levels.level7CheckUserLimits(decision({ position_size_pct: 101 }), PROFILE, [], CONFIG).passed, false);
});

test('L7 rejects invalid actions and stops that do not bound the intended direction', () => {
  for (const action of [undefined, null, '', 'close', 'BUY']) {
    assert.equal(levels.level7CheckUserLimits(decision({ action } as unknown as Partial<CoordinatorDecision>), PROFILE, [], CONFIG).passed, false);
  }
  for (const action of ['buy', 'sell'] as const) {
    const wrongStop = action === 'buy' ? 105 : 95;
    assert.equal(levels.level7CheckUserLimits(decision({ action, stop_loss: wrongStop }), PROFILE, [], CONFIG).passed, false);
    assert.equal(levels.level7CheckUserLimits(decision({ action, stop_loss: 100 }), PROFILE, [], CONFIG).passed, false);
  }
});

test('L7 rejects nonfinite or underflowed derived nominal losses', () => {
  const config = { ...CONFIG, max_daily_loss_pct: 100 };
  assert.equal(levels.level7CheckUserLimits(decision(), {
    ...PROFILE, capital_usd: Number.MIN_VALUE,
  }, [], config).passed, false);
  assert.equal(levels.level7CheckUserLimits(decision({ position_size_pct: Number.MIN_VALUE }), PROFILE, [], config).passed, false);
  assert.equal(levels.level7CheckUserLimits(decision({
    action: 'sell', entry_price: Number.MIN_VALUE, stop_loss: 1,
  }), PROFILE, [], config).passed, false);
});

test('L7 keeps hold as a non-trading action even without usable sizing inputs', () => {
  assert.equal(levels.level7CheckUserLimits(decision({
    action: 'hold', entry_price: NaN, stop_loss: 0, position_size_pct: Infinity,
  }), { ...PROFILE, capital_usd: NaN }, [], { ...CONFIG, max_daily_loss_pct: 0 }).passed, true);
});

test('RiskManager retains the one-percent default when config is absent or only partially supplied', () => {
  const now = Date.now();
  const btc = [{ timestamp: now - 3_600_000, price: 100 }, { timestamp: now - 1000, price: 100 }];
  for (const config of [undefined, {}, { min_confidence: 0.6 }]) {
    const blocked = new RiskManager(config, history(0.049), btc).checkAllLevels(decision(), PROFILE, []);
    assert.equal(blocked.passed, false);
    assert.equal(blocked.failures.length, 1);
    assert.match(blocked.failures[0], /Daily loss.*nominal stop loss/);
    assert.ok(blocked.failures[0].includes('limit $0.05'));
    const allowed = new RiskManager(config, history(0.047), btc).checkAllLevels(decision(), PROFILE, []);
    assert.equal(allowed.passed, true);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { level7CheckUserLimits } from './risk-levels.ts';
import type { ShieldConfig } from '@/types/trading';
import type { CoordinatorDecision } from '@/lib/agents/types';
import type { UserProfile, TradeHistory } from './risk-manager.ts';

const CONFIG: ShieldConfig = {
  max_daily_loss_pct: 5,
  max_daily_loss_usd: 500,
  max_position_size_pct: 2,
  max_leverage: 10,
  max_concurrent_positions: 5,
  max_correlation: 0.8,
  min_risk_reward: 1.5,
  min_confidence: 0.5,
  cooldown_after_loss_minutes: 30,
  max_consecutive_losses_before_pause: 3,
  blacklisted_symbols: ['SCAM/USDT'],
  allowed_hours_utc: null,
  manipulation_detection_enabled: true,
  slippage_tolerance_pct: 0.5,
  emergency_stop_enabled: true,
};

const PROFILE: UserProfile = {
  id: 'user-1',
  plan: 'free',
  daily_loss_limit_usd: 100,
  weekly_loss_limit_usd: 500,
  monthly_loss_limit_usd: 2000,
  max_position_size_pct: 2,
  max_concurrent_positions: 5,
  capital_usd: 10_000,
};

function decision(overrides: Partial<CoordinatorDecision> = {}): CoordinatorDecision {
  return {
    action: 'buy',
    pair: 'BTC/USDT',
    entry_price: 100,
    stop_loss: 95,
    take_profit: 112,
    confidence: 0.8,
    composite_score: 0.75,
    position_size_pct: 2,
    strategy: 'test',
    reasoning: 'test',
    agent_results: [],
    risk_reward_ratio: 2.4,
    approved_by_shield: true,
    ...overrides,
  };
}

test('L7 applies the stricter global USD limit on a five-dollar capital', () => {
  const profile = { ...PROFILE, capital_usd: 5, daily_loss_limit_usd: 1 };
  const config = { ...CONFIG, max_daily_loss_usd: 0.05, max_daily_loss_pct: 100 };
  const recent: TradeHistory[] = [{ pnl: -0.05, closed_at: Date.now() - 1000 }];
  const result = level7CheckUserLimits(decision(), profile, recent, config);
  assert.equal(result.passed, false);
  assert.match(result.message, /Daily loss/);
});

test('L7 applies the global percentage limit independently of the global USD limit', () => {
  const profile = { ...PROFILE, capital_usd: 5, daily_loss_limit_usd: 1 };
  const config = { ...CONFIG, max_daily_loss_usd: 1, max_daily_loss_pct: 1 };
  assert.equal(level7CheckUserLimits(decision(), profile, [
    { pnl: -0.05, closed_at: Date.now() - 1000 },
  ], config).passed, false);
});

test('L7 retains the strictest of all three daily limits at and below its boundary', () => {
  for (const profileLimit of [0.01, 0.05, 1]) {
    for (const globalLimit of [0.02, 0.05, 1]) {
      for (const percentage of [0.5, 1, 2]) {
        const profile = { ...PROFILE, capital_usd: 5, daily_loss_limit_usd: profileLimit };
        const config = { ...CONFIG, max_daily_loss_usd: globalLimit, max_daily_loss_pct: percentage };
        const limit = Math.min(profileLimit, globalLimit, 5 * percentage / 100);
        const history = (loss: number): TradeHistory[] => [{ pnl: -loss, closed_at: Date.now() - 1000 }];
        assert.equal(level7CheckUserLimits(decision(), profile, history(limit), config).passed, false);
        // The smallest remaining allowance is $0.005; 1% size risks $0.0025 at the stop.
        assert.equal(level7CheckUserLimits(decision({ position_size_pct: 1 }), profile, history(limit / 2), config).passed, true);
      }
    }
  }
});

test('L7 aggregates supplied losses without letting wins restore the daily allowance', () => {
  const profile = { ...PROFILE, capital_usd: 5, daily_loss_limit_usd: 1 };
  const config = { ...CONFIG, max_daily_loss_usd: 0.05, max_daily_loss_pct: 1 };
  const now = Date.now();
  const recent: TradeHistory[] = [
    { pnl: -0.02, closed_at: now - 3000 },
    { pnl: 100, closed_at: now - 2000 },
    { pnl: -0.03, closed_at: now - 1000 },
  ];
  assert.equal(level7CheckUserLimits(decision(), profile, recent, config).passed, false);
});

test('L7 does not reopen the daily allowance due to floating-point summation', () => {
  const profile = { ...PROFILE, capital_usd: 5, daily_loss_limit_usd: 0.07 };
  const config = { ...CONFIG, max_daily_loss_usd: 1, max_daily_loss_pct: 100 };
  const recent: TradeHistory[] = [
    { pnl: -0.06, closed_at: Date.now() - 2000 },
    { pnl: -0.01, closed_at: Date.now() - 1000 },
  ];
  assert.equal(level7CheckUserLimits(decision(), profile, recent, config).passed, false);
  // $0.069 closed + $0.00025 nominal stop risk stays below the $0.07 limit.
  assert.equal(level7CheckUserLimits(decision({ position_size_pct: 0.1 }), profile, [
    { pnl: -0.069, closed_at: Date.now() - 1000 },
  ], config).passed, true);
});

test('L7 fails closed for absent, malformed or zero profile loss limits and capital', () => {
  for (const field of ['daily_loss_limit_usd', 'weekly_loss_limit_usd', 'monthly_loss_limit_usd', 'capital_usd'] as const) {
    const missing = { ...PROFILE };
    delete (missing as Partial<UserProfile>)[field];
    assert.equal(level7CheckUserLimits(decision(), missing, [], CONFIG).passed, false, `missing ${field}`);
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '1', 0, -1]) {
      const profile = { ...PROFILE, [field]: value } as unknown as UserProfile;
      assert.equal(level7CheckUserLimits(decision(), profile, [], CONFIG).passed, false, `${field} ${String(value)}`);
    }
  }
});

test('L7 fails closed for absent, malformed or zero global loss limits', () => {
  for (const field of ['max_daily_loss_usd', 'max_daily_loss_pct'] as const) {
    const missing = { ...CONFIG };
    delete (missing as Partial<ShieldConfig>)[field];
    assert.equal(level7CheckUserLimits(decision(), PROFILE, [], missing).passed, false, `missing ${field}`);
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '1', 0, -1]) {
      const config = { ...CONFIG, [field]: value } as unknown as ShieldConfig;
      assert.equal(level7CheckUserLimits(decision(), PROFILE, [], config).passed, false, `${field} ${String(value)}`);
    }
  }
  assert.equal(level7CheckUserLimits(decision(), PROFILE, [], { ...CONFIG, max_daily_loss_pct: 101 }).passed, false);
});

test('L7 refuses a percentage-derived limit that underflows to zero', () => {
  const profile = { ...PROFILE, capital_usd: Number.MIN_VALUE };
  assert.equal(level7CheckUserLimits(decision(), profile, [], { ...CONFIG, max_daily_loss_pct: 1 }).passed, false);
});

test('L7 refuses unavailable or malformed loss history instead of treating it as no loss', () => {
  for (const history of [undefined, null, {}, [null]]) {
    assert.equal(level7CheckUserLimits(decision(), PROFILE, history as unknown as TradeHistory[], CONFIG).passed, false);
  }
  for (const value of [undefined, null, NaN, Infinity, -Infinity, '-1']) {
    const invalidPnl = [{ pnl: value, closed_at: Date.now() - 1000 }] as unknown as TradeHistory[];
    assert.equal(level7CheckUserLimits(decision(), PROFILE, invalidPnl, CONFIG).passed, false);
    const invalidTime = [{ pnl: -1, closed_at: value }] as unknown as TradeHistory[];
    assert.equal(level7CheckUserLimits(decision(), PROFILE, invalidTime, CONFIG).passed, false);
  }
  for (const timestamp of [-1, Date.now() + 60_000]) {
    assert.equal(level7CheckUserLimits(decision(), PROFILE, [{ pnl: -1, closed_at: timestamp }], CONFIG).passed, false);
  }
});

test('L7 preserves the rolling daily window and non-trading hold behavior', () => {
  const profile = { ...PROFILE, capital_usd: 5, daily_loss_limit_usd: 1 };
  const config = { ...CONFIG, max_daily_loss_usd: 0.05, max_daily_loss_pct: 1 };
  assert.equal(level7CheckUserLimits(decision(), profile, [
    { pnl: -0.05, closed_at: Date.now() - 25 * 3_600_000 },
  ], config).passed, true);
  assert.equal(level7CheckUserLimits(decision({ action: 'hold' }), {
    ...profile, daily_loss_limit_usd: 0,
  }, [], config).passed, true);
});

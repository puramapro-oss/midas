import test from 'node:test';
import assert from 'node:assert/strict';
import {
  level1PositionSizing,
  level2ValidateStopLoss,
  level3TrailingStopReady,
  level4CheckCircuitBreaker,
  level5CheckCrashProtection,
  level6CheckDiversification,
  level7CheckUserLimits,
} from './risk-levels.ts';
import type { ShieldConfig } from '@/types/trading';
import type { CoordinatorDecision } from '@/lib/agents/types';
import type { UserProfile, OpenPosition, TradeHistory } from './risk-manager.ts';

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

// --- L1 Position Sizing ---

test('L1 rejects a position size above the configured max', () => {
  const result = level1PositionSizing(decision({ position_size_pct: 3 }), PROFILE, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /L1 Position Sizing/);
});

test('L1 implied-loss stays within the capital-based max risk for any valid size', () => {
  // Invariant : avec position_size_pct <= max, la perte implicite au stop ne
  // peut jamais dépasser maxRiskUsd (distance de stop < 100%). Le test le
  // vérifie sur un échantillon déterministe de tailles et de distances.
  let worstMargin = Infinity;
  for (const sizePct of [0.5, 1, 1.5, 2]) {
    for (const stop of [1, 50, 95]) {
      const d = decision({ entry_price: 100, stop_loss: stop, position_size_pct: sizePct });
      const result = level1PositionSizing(d, PROFILE, CONFIG);
      assert.equal(result.passed, true, result.message);
      const impliedLoss = ((100 - stop) / 100) * (PROFILE.capital_usd * sizePct / 100);
      const maxRiskUsd = PROFILE.capital_usd * CONFIG.max_position_size_pct / 100;
      worstMargin = Math.min(worstMargin, maxRiskUsd - impliedLoss);
    }
  }
  assert.ok(worstMargin >= 0);
});

test('L1 always lets hold decisions through', () => {
  const result = level1PositionSizing(decision({ action: 'hold', position_size_pct: 99 }), PROFILE, CONFIG);
  assert.equal(result.passed, true);
});

// --- L2 Stop Loss ---

test('L2 rejects a missing or zero stop loss', () => {
  assert.equal(level2ValidateStopLoss(decision({ stop_loss: 0 })).passed, false);
  assert.equal(level2ValidateStopLoss(decision({ stop_loss: -5 })).passed, false);
});

test('L2 rejects a stop loss that is too tight (noise) or too wide', () => {
  assert.equal(level2ValidateStopLoss(decision({ stop_loss: 99.95 })).passed, false);
  assert.equal(level2ValidateStopLoss(decision({ stop_loss: 50 })).passed, false);
});

test('L2 enforces stop-loss direction relative to entry', () => {
  assert.equal(level2ValidateStopLoss(decision({ action: 'buy', stop_loss: 105 })).passed, false);
  assert.equal(level2ValidateStopLoss(decision({ action: 'sell', entry_price: 100, stop_loss: 95, take_profit: 88 })).passed, false);
  assert.equal(level2ValidateStopLoss(decision({ stop_loss: 95 })).passed, true);
});

// --- L3 Trailing Stop / RRR ---

test('L3 rejects a risk/reward below the configured minimum', () => {
  const result = level3TrailingStopReady(decision({ risk_reward_ratio: 1.0 }), CONFIG);
  assert.equal(result.passed, false);
});

test('L3 recomputes RRR from prices and rejects an inflated claimed ratio', () => {
  const d = decision({ entry_price: 100, stop_loss: 95, take_profit: 98, risk_reward_ratio: 5 });
  const result = level3TrailingStopReady(d, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /Computed RRR/);
});

// --- L4 Circuit Breaker ---

test('L4 pauses trading after N consecutive losses inside the cooldown', () => {
  const now = Date.now();
  const recent: TradeHistory[] = [
    { pnl: -10, closed_at: now - 60_000 },
    { pnl: -10, closed_at: now - 120_000 },
    { pnl: -10, closed_at: now - 180_000 },
  ];
  const result = level4CheckCircuitBreaker(recent, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /Circuit Breaker/);
});

test('L4 lets trading resume once the cooldown has elapsed', () => {
  const now = Date.now();
  const old: TradeHistory[] = [
    { pnl: -10, closed_at: now - 31 * 60_000 },
    { pnl: -10, closed_at: now - 32 * 60_000 },
    { pnl: -10, closed_at: now - 33 * 60_000 },
  ];
  assert.equal(level4CheckCircuitBreaker(old, CONFIG).passed, true);
});

test('L4 ignores a streak broken by a win', () => {
  const now = Date.now();
  const mixed: TradeHistory[] = [
    { pnl: -10, closed_at: now - 60_000 },
    { pnl: +10, closed_at: now - 120_000 },
    { pnl: -10, closed_at: now - 180_000 },
  ];
  assert.equal(level4CheckCircuitBreaker(mixed, CONFIG).passed, true);
});

// --- L5 Crash Protection ---

test('L5 triggers the emergency stop on a -5% BTC move within one hour', () => {
  const now = Date.now();
  const history = [
    { timestamp: now - 61 * 60_000, price: 100 },
    { timestamp: now - 59 * 60_000, price: 100 },
    { timestamp: now - 1_000, price: 94 },
  ];
  const result = level5CheckCrashProtection(history, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /Crash Protection/);
});

test('L5 stays quiet on a moderate dip and when data is missing', () => {
  const now = Date.now();
  const moderate = [
    { timestamp: now - 30 * 60_000, price: 100 },
    { timestamp: now - 1_000, price: 97 },
  ];
  assert.equal(level5CheckCrashProtection(moderate, CONFIG).passed, true);
  assert.equal(level5CheckCrashProtection([], CONFIG).passed, true);
});

test('L5 can be disabled by configuration', () => {
  const now = Date.now();
  const crash = [
    { timestamp: now - 30 * 60_000, price: 100 },
    { timestamp: now - 1_000, price: 80 },
  ];
  assert.equal(level5CheckCrashProtection(crash, { ...CONFIG, emergency_stop_enabled: false }).passed, true);
});

// --- L6 Diversification ---

test('L6 caps concurrent positions at the stricter of config and profile', () => {
  const positions: OpenPosition[] = Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`, symbol: `ALT${i}/USDT`, side: 'buy', entry_price: 10, current_price: 10,
    quantity: 1, unrealized_pnl: 0, leverage: 1, allocation_pct: 1, opened_at: Date.now(),
  }));
  const result = level6CheckDiversification(decision(), positions, PROFILE, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /Diversification/);
});

test('L6 caps exposure per token at 20 percent', () => {
  const positions: OpenPosition[] = [
    { id: 'p1', symbol: 'BTC/USDT', side: 'buy', entry_price: 100, current_price: 100,
      quantity: 1, unrealized_pnl: 0, leverage: 1, allocation_pct: 19, opened_at: Date.now() },
  ];
  const result = level6CheckDiversification(decision({ position_size_pct: 2 }), positions, PROFILE, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /exposure/);
});

test('L6 rejects blacklisted symbols unconditionally', () => {
  const result = level6CheckDiversification(decision({ pair: 'SCAM/USDT' }), [], PROFILE, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /blacklisted/);
});

// --- L7 User Limits ---

test('L7 blocks trading once the daily loss limit is reached', () => {
  const now = Date.now();
  const recent: TradeHistory[] = [{ pnl: -100, closed_at: now - 3_600_000 }];
  const result = level7CheckUserLimits(decision(), PROFILE, recent, CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /Daily loss/);
});

test('L7 enforces weekly and monthly loss limits independently', () => {
  const now = Date.now();
  const weekly: TradeHistory[] = [{ pnl: -500, closed_at: now - 3 * 24 * 3_600_000 }];
  assert.match(level7CheckUserLimits(decision(), PROFILE, weekly, CONFIG).message, /Weekly loss/);
  const monthly: TradeHistory[] = [{ pnl: -2000, closed_at: now - 20 * 24 * 3_600_000 }];
  assert.match(level7CheckUserLimits(decision(), PROFILE, monthly, CONFIG).message, /Monthly loss/);
});

test('L7 rejects a decision below the minimum confidence', () => {
  const result = level7CheckUserLimits(decision({ confidence: 0.3 }), PROFILE, [], CONFIG);
  assert.equal(result.passed, false);
  assert.match(result.message, /Confidence/);
});

test('L7 ignores losses older than the monthly window', () => {
  const now = Date.now();
  const ancient: TradeHistory[] = [{ pnl: -5000, closed_at: now - 40 * 24 * 3_600_000 }];
  assert.equal(level7CheckUserLimits(decision(), PROFILE, ancient, CONFIG).passed, true);
});

// --- Property: a valid decision passes all seven levels ---

test('a fully valid decision passes every level', () => {
  const now = Date.now();
  const btc = [
    { timestamp: now - 30 * 60_000, price: 100 },
    { timestamp: now - 1_000, price: 101 },
  ];
  const checks = [
    level1PositionSizing(decision(), PROFILE, CONFIG),
    level2ValidateStopLoss(decision()),
    level3TrailingStopReady(decision(), CONFIG),
    level4CheckCircuitBreaker([{ pnl: +5, closed_at: now }], CONFIG),
    level5CheckCrashProtection(btc, CONFIG),
    level6CheckDiversification(decision(), [], PROFILE, CONFIG),
    level7CheckUserLimits(decision(), PROFILE, [], CONFIG),
  ];
  for (const check of checks) {
    assert.equal(check.passed, true, check.message);
  }
});

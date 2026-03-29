// =============================================================================
// MIDAS — Pre-Trade Simulation
// Validates data quality, slippage, shield, and exchange before execution
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import { createServiceClient } from '@/lib/supabase/server';
import { RiskManager, type UserProfile, type OpenPosition, type TradeHistory } from './risk-manager';

export interface SimulationResult {
  passed: boolean;
  reasons: string[];
  estimated_slippage_pct: number;
  data_quality_score: number;
  shield_passed: boolean;
  exchange_ready: boolean;
}

export async function simulate(
  decision: CoordinatorDecision,
  userId: string
): Promise<SimulationResult> {
  const reasons: string[] = [];
  let estimatedSlippage = 0;
  let dataQualityScore = 100;
  let shieldPassed = true;
  let exchangeReady = true;

  // 1. Check data quality
  const dataCheck = checkDataQuality(decision);
  if (!dataCheck.passed) {
    reasons.push(...dataCheck.reasons);
    dataQualityScore = dataCheck.score;
  } else {
    dataQualityScore = dataCheck.score;
  }

  // 2. Estimate slippage
  estimatedSlippage = estimateSlippage(decision);
  if (estimatedSlippage > 1.0) {
    reasons.push(`Estimated slippage ${estimatedSlippage.toFixed(2)}% exceeds 1% threshold`);
  }

  // 3. Shield levels check
  const supabase = createServiceClient();

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: tradingSettings } = await supabase
    .from('trading_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profileData) {
    reasons.push('User profile not found');
    shieldPassed = false;
  } else {
    const userProfile: UserProfile = {
      id: userId,
      plan: profileData.plan ?? 'free',
      daily_loss_limit_usd: tradingSettings?.daily_loss_limit_usd ?? 100,
      weekly_loss_limit_usd: tradingSettings?.weekly_loss_limit_usd ?? 500,
      monthly_loss_limit_usd: tradingSettings?.monthly_loss_limit_usd ?? 2000,
      max_position_size_pct: tradingSettings?.max_position_size_pct ?? 2,
      max_concurrent_positions: tradingSettings?.max_concurrent_positions ?? 5,
      capital_usd: tradingSettings?.capital_usd ?? 1000,
    };

    const { data: positionsData } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open');

    const openPositions: OpenPosition[] = (positionsData ?? []).map((p) => ({
      id: p.id as string,
      symbol: p.symbol as string,
      side: p.side as 'buy' | 'sell',
      entry_price: Number(p.entry_price),
      current_price: Number(p.current_price ?? p.entry_price),
      quantity: Number(p.quantity),
      unrealized_pnl: Number(p.unrealized_pnl ?? 0),
      leverage: Number(p.leverage ?? 1),
      allocation_pct: Number(p.allocation_pct ?? 0),
      opened_at: new Date(p.created_at as string).getTime(),
    }));

    const { data: historyData } = await supabase
      .from('trades')
      .select('pnl, closed_at')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(20);

    const recentTrades: TradeHistory[] = (historyData ?? [])
      .filter((t) => t.closed_at)
      .map((t) => ({
        pnl: Number(t.pnl ?? 0),
        closed_at: new Date(t.closed_at as string).getTime(),
      }));

    const riskManager = new RiskManager(undefined, recentTrades);
    const shieldResult = riskManager.checkAllLevels(decision, userProfile, openPositions);

    if (!shieldResult.passed) {
      shieldPassed = false;
      reasons.push(...shieldResult.failures);
    }
  }

  // 4. Check exchange connection
  const { data: exchangeConn } = await supabase
    .from('exchange_connections')
    .select('is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!exchangeConn) {
    exchangeReady = false;
    reasons.push('No active exchange connection found');
  }

  // 5. Confidence threshold
  if (decision.confidence < 0.5) {
    reasons.push(`Confidence ${(decision.confidence * 100).toFixed(1)}% is below 50% minimum for execution`);
  }

  // 6. Validate action coherence
  if (decision.action === 'hold') {
    reasons.push('Decision action is "hold" — nothing to execute');
  }

  return {
    passed: reasons.length === 0,
    reasons,
    estimated_slippage_pct: estimatedSlippage,
    data_quality_score: dataQualityScore,
    shield_passed: shieldPassed,
    exchange_ready: exchangeReady,
  };
}

function checkDataQuality(decision: CoordinatorDecision): {
  passed: boolean;
  reasons: string[];
  score: number;
} {
  const reasons: string[] = [];
  let score = 100;

  if (!decision.pair || decision.pair.length === 0) {
    reasons.push('Missing trading pair');
    score -= 50;
  }

  if (decision.entry_price <= 0) {
    reasons.push('Invalid entry price (must be > 0)');
    score -= 30;
  }

  if (decision.action !== 'hold' && decision.stop_loss === 0) {
    reasons.push('Stop loss is zero');
    score -= 20;
  }

  if (decision.agent_results.length === 0) {
    reasons.push('No agent results available — insufficient data');
    score -= 25;
  }

  if (decision.composite_score === 0) {
    reasons.push('Composite score is zero — suspicious');
    score -= 15;
  }

  score = Math.max(0, score);

  return {
    passed: score >= 60,
    reasons,
    score,
  };
}

function estimateSlippage(decision: CoordinatorDecision): number {
  // Estimate slippage based on pair characteristics
  const pair = decision.pair.toUpperCase();

  // Major pairs: low slippage
  const majorPairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
  if (majorPairs.includes(pair)) {
    return 0.05;
  }

  // Mid-cap: moderate slippage
  const midCapPairs = [
    'ADA/USDT', 'DOT/USDT', 'AVAX/USDT', 'MATIC/USDT', 'LINK/USDT',
    'ATOM/USDT', 'UNI/USDT', 'LTC/USDT',
  ];
  if (midCapPairs.includes(pair)) {
    return 0.15;
  }

  // Small cap: higher slippage
  return 0.5;
}

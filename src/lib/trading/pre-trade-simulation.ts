// =============================================================================
// MIDAS — Pre-Trade Simulation
// Validates data quality, educational sizing and the shield before persistence
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import { createServiceClient } from '@/lib/supabase/server';
import { RiskManager, type UserProfile, type OpenPosition, type TradeHistory } from './risk-manager';
import { fetchKlines } from '@/lib/exchange/binance-public';
import { validatePaperDecision, paperPositionSize, hasUsableCrashHistory } from './paper-validation';
import { netRecordedPnl } from './recorded-pnl';

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
  userId: string,
  quoteAmount?: number,
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

  if (reasons.length > 0) {
    return { passed: false, reasons, estimated_slippage_pct: 0, data_quality_score: dataQualityScore, shield_passed: false, exchange_ready: false };
  }

  // 2. Estimate slippage
  estimatedSlippage = estimateSlippage(decision);
  if (estimatedSlippage > 1.0) {
    reasons.push(`Estimated slippage ${estimatedSlippage.toFixed(2)}% exceeds 1% threshold`);
  }

  // 3. Shield levels check
  const supabase = createServiceClient();

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: tradingSettings, error: settingsError } = await supabase
    .from('trading_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError || settingsError || !profileData) {
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
      capital_usd: Number(tradingSettings?.paper_capital ?? 10000),
    };

    const { data: positionsData, error: positionsError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .eq('is_paper_trade', true);

    const openPositions: OpenPosition[] = (positionsData ?? []).map((p) => ({
      id: p.id as string,
      symbol: (p.pair ?? p.symbol) as string,
      side: p.side as 'buy' | 'sell',
      entry_price: Number(p.entry_price),
      current_price: Number(p.current_price ?? p.entry_price),
      quantity: Number(p.quantity),
      unrealized_pnl: Number(p.unrealized_pnl ?? 0),
      leverage: Number(p.leverage ?? 1),
      allocation_pct: userProfile.capital_usd > 0
        ? (Number(p.quote_amount ?? 0) / userProfile.capital_usd) * 100
        : 0,
      opened_at: new Date(p.created_at as string).getTime(),
    }));

    const { data: historyData, error: historyError } = await supabase
      .from('trades')
      .select('pnl, fees, closed_at')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .eq('is_paper_trade', true)
      .order('closed_at', { ascending: false })
      .gte('closed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000);

    if (positionsError || historyError) {
      return { passed: false, reasons: ['Paper risk history unavailable'], estimated_slippage_pct: estimatedSlippage, data_quality_score: dataQualityScore, shield_passed: false, exchange_ready: true };
    }

    const normalizedHistory = (historyData ?? []).map(t => ({
      pnl: netRecordedPnl(t.pnl, t.fees),
      closed_at: t.closed_at ? new Date(t.closed_at as string).getTime() : NaN,
    }));
    if (normalizedHistory.some(t => t.pnl === null || !Number.isFinite(t.closed_at))) {
      return { passed: false, reasons: ['Paper risk history contains invalid amounts or dates'], estimated_slippage_pct: estimatedSlippage, data_quality_score: 0, shield_passed: false, exchange_ready: true };
    }
    const recentTrades: TradeHistory[] = normalizedHistory.map(t => ({ pnl: t.pnl!, closed_at: t.closed_at }));

    const btcCandles = await fetchKlines('BTC/USDT', '1m', 61);
    if (!hasUsableCrashHistory(btcCandles)) {
      shieldPassed = false;
      reasons.push('BTC crash-protection data missing, stale or incomplete');
    }
    const btcPriceHistory = btcCandles.map((candle) => ({ timestamp: candle.timestamp, price: candle.close }));
    const size = paperPositionSize(userProfile.capital_usd, decision.position_size_pct, quoteAmount);
    const checkedDecision = { ...decision, position_size_pct: size.percentage };
    const riskManager = new RiskManager({ max_position_size_pct: Math.min(2, userProfile.max_position_size_pct) }, recentTrades, btcPriceHistory);
    const shieldResult = riskManager.checkAllLevels(checkedDecision, userProfile, openPositions);

    if (!shieldResult.passed) {
      shieldPassed = false;
      reasons.push(...shieldResult.failures);
    }
  }

  // Educational paper execution never needs an exchange account or its keys.
  exchangeReady = true;

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

function checkDataQuality(decision: CoordinatorDecision) {
  const reasons = validatePaperDecision(decision);
  return { passed: reasons.length === 0, reasons, score: reasons.length === 0 ? 100 : 0 };
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

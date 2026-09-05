// =============================================================================
// MIDAS — Trade Executor
// Execute educational paper trades with a full audit trail
// =============================================================================

import type { CoordinatorDecision } from '@/lib/agents/types';
import { createServiceClient } from '@/lib/supabase/server';
import { RiskManager, type UserProfile, type OpenPosition, type TradeHistory } from './risk-manager';
import { simulate } from './pre-trade-simulation';
import { executePaperTrade } from './paper-trading-engine';

export interface TradeResult {
  success: boolean;
  trade_id: string | null;
  order_id: string | null;
  executed_price: number;
  executed_quantity: number;
  fees: number;
  slippage_pct: number;
  is_paper: boolean;
  error: string | null;
  timestamp: number;
}

export async function executeTrade(
  decision: CoordinatorDecision,
  userId: string,
  exchangeConnectionId: string
): Promise<TradeResult> {
  const timestamp = Date.now();
  const supabase = createServiceClient();

  try {
    // 1. Fetch exchange connection
    const { data: connection, error: connError } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('id', exchangeConnectionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return failResult('Exchange connection not found or inactive', timestamp);
    }

    // 2. Fetch user profile for risk checks
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profileData) {
      return failResult('User profile not found', timestamp);
    }

    const { data: tradingSettings } = await supabase
      .from('trading_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

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

    // 3. Fetch open positions
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

    // 4. Fetch recent trade history for circuit breaker
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

    // 5. Run MIDAS Shield risk checks
    const riskManager = new RiskManager(undefined, recentTrades);
    const shieldResult = riskManager.checkAllLevels(decision, userProfile, openPositions);

    if (!shieldResult.passed) {
      await logAudit(supabase, userId, decision, 'blocked_by_shield', shieldResult.failures);
      return failResult(`Shield blocked: ${shieldResult.failures.join('; ')}`, timestamp);
    }

    // 6. Run pre-trade simulation
    const simResult = await simulate(decision, userId);

    if (!simResult.passed) {
      await logAudit(supabase, userId, decision, 'blocked_by_simulation', simResult.reasons);
      return failResult(`Pre-trade simulation failed: ${simResult.reasons.join('; ')}`, timestamp);
    }

    // Décision Tissma D2=A (2026-09-05) : simulation éducative uniquement,
    // même si une ancienne connexion est marquée réelle en base. Cette garde
    // interne empêche tout contournement de la route HTTP.
    const paperResult = await executePaperTrade(decision, userId);
    await logAudit(supabase, userId, decision, 'paper_executed', []);
    return paperResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown execution error';
    return failResult(message, timestamp);
  }
}

function failResult(error: string, timestamp: number): TradeResult {
  return {
    success: false,
    trade_id: null,
    order_id: null,
    executed_price: 0,
    executed_quantity: 0,
    fees: 0,
    slippage_pct: 0,
    is_paper: true,
    error,
    timestamp,
  };
}

async function logAudit(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  decision: CoordinatorDecision,
  action: string,
  details: string[]
): Promise<void> {
  await supabase.from('trade_audit_logs').insert({
    user_id: userId,
    action,
    symbol: decision.pair,
    side: decision.action,
    confidence: decision.confidence,
    entry_price: decision.entry_price,
    stop_loss: decision.stop_loss,
    take_profit: decision.take_profit,
    position_size_pct: decision.position_size_pct,
    strategy: decision.strategy,
    details: { failures: details, reasoning: decision.reasoning },
    created_at: new Date().toISOString(),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const SETUP_SECRET = process.env.CRON_SECRET || 'midas-setup';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${SETUP_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabase();
  const results: { step: string; status: string; error?: string }[] = [];

  // Execute each SQL statement individually via rpc or raw query
  const statements = [
    // Profiles
    `CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
      full_name TEXT,
      avatar_url TEXT,
      plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'ultra')),
      plan_period TEXT DEFAULT 'monthly' CHECK (plan_period IN ('monthly', 'yearly')),
      plan_expires_at TIMESTAMPTZ,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      risk_profile TEXT DEFAULT 'moderate' CHECK (risk_profile IN ('very_conservative', 'conservative', 'moderate', 'aggressive')),
      risk_per_trade DECIMAL DEFAULT 1.0,
      max_loss_daily DECIMAL DEFAULT 50,
      max_loss_weekly DECIMAL DEFAULT 200,
      max_loss_monthly DECIMAL DEFAULT 500,
      trailing_stop_default DECIMAL DEFAULT 1.0,
      auto_trade_enabled BOOLEAN DEFAULT FALSE,
      interface_mode TEXT DEFAULT 'simple' CHECK (interface_mode IN ('simple', 'expert')),
      display_currency TEXT DEFAULT 'EUR' CHECK (display_currency IN ('EUR', 'USD', 'BTC')),
      notifications_push BOOLEAN DEFAULT TRUE,
      notifications_email_daily BOOLEAN DEFAULT TRUE,
      notifications_trade_alert BOOLEAN DEFAULT TRUE,
      notifications_circuit_breaker BOOLEAN DEFAULT TRUE,
      daily_questions_used INTEGER DEFAULT 0,
      daily_questions_reset_at TIMESTAMPTZ DEFAULT NOW(),
      daily_loss_accumulated DECIMAL DEFAULT 0,
      weekly_loss_accumulated DECIMAL DEFAULT 0,
      monthly_loss_accumulated DECIMAL DEFAULT 0,
      shield_active BOOLEAN DEFAULT FALSE,
      onboarding_completed BOOLEAN DEFAULT FALSE,
      referral_code TEXT,
      referred_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Exchange connections
    `CREATE TABLE IF NOT EXISTS public.exchange_connections (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
      exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'kraken', 'bybit', 'okx', 'coinbase')),
      api_key_encrypted TEXT NOT NULL,
      api_secret_encrypted TEXT NOT NULL,
      encryption_iv TEXT NOT NULL,
      permissions JSONB DEFAULT '{"read": true, "trade": true, "withdraw": false}',
      is_active BOOLEAN DEFAULT TRUE,
      is_testnet BOOLEAN DEFAULT FALSE,
      last_connected_at TIMESTAMPTZ,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, exchange)
    )`,

    // Bots
    `CREATE TABLE IF NOT EXISTS public.bots (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
      exchange_connection_id UUID REFERENCES public.exchange_connections ON DELETE CASCADE NOT NULL,
      name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      pair TEXT NOT NULL,
      timeframe TEXT DEFAULT '1h',
      status TEXT DEFAULT 'paused' CHECK (status IN ('active', 'paused', 'stopped', 'error', 'circuit_breaker')),
      is_paper_trading BOOLEAN DEFAULT TRUE,
      allocated_capital DECIMAL NOT NULL CHECK (allocated_capital > 0),
      risk_per_trade DECIMAL DEFAULT 1.0,
      stop_loss_pct DECIMAL DEFAULT 2.0,
      trailing_stop_pct DECIMAL DEFAULT 1.0,
      take_profit_pct DECIMAL,
      min_confidence_score DECIMAL DEFAULT 70,
      max_positions INTEGER DEFAULT 3,
      total_pnl DECIMAL DEFAULT 0,
      total_trades INTEGER DEFAULT 0,
      winning_trades INTEGER DEFAULT 0,
      losing_trades INTEGER DEFAULT 0,
      consecutive_losses INTEGER DEFAULT 0,
      max_drawdown DECIMAL DEFAULT 0,
      is_circuit_breaker_active BOOLEAN DEFAULT FALSE,
      circuit_breaker_until TIMESTAMPTZ,
      last_analysis_at TIMESTAMPTZ,
      config JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Trades
    `CREATE TABLE IF NOT EXISTS public.trades (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
      bot_id UUID REFERENCES public.bots ON DELETE SET NULL,
      exchange_connection_id UUID REFERENCES public.exchange_connections ON DELETE SET NULL,
      exchange TEXT NOT NULL,
      pair TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
      type TEXT DEFAULT 'market',
      strategy TEXT NOT NULL,
      is_paper_trade BOOLEAN DEFAULT FALSE,
      entry_price DECIMAL NOT NULL,
      current_price DECIMAL,
      exit_price DECIMAL,
      quantity DECIMAL NOT NULL,
      quote_amount DECIMAL,
      stop_loss DECIMAL NOT NULL,
      take_profit DECIMAL,
      trailing_stop DECIMAL,
      trailing_stop_activated BOOLEAN DEFAULT FALSE,
      pnl DECIMAL,
      pnl_pct DECIMAL,
      fees DECIMAL DEFAULT 0,
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'error')),
      close_reason TEXT,
      result TEXT CHECK (result IN ('win', 'loss', 'breakeven')),
      composite_score DECIMAL,
      technical_score DECIMAL,
      sentiment_score DECIMAL,
      onchain_score DECIMAL,
      confidence DECIMAL,
      risk_reward_ratio DECIMAL,
      indicators_snapshot JSONB,
      agent_results JSONB,
      ai_reasoning TEXT,
      exchange_order_id TEXT,
      exchange_response JSONB,
      opened_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Signals
    `CREATE TABLE IF NOT EXISTS public.signals (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      pair TEXT NOT NULL,
      exchange TEXT,
      direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell', 'hold')),
      strength TEXT NOT NULL CHECK (strength IN ('weak', 'moderate', 'strong', 'very_strong')),
      composite_score DECIMAL NOT NULL,
      technical_score DECIMAL,
      sentiment_score DECIMAL,
      onchain_score DECIMAL,
      confidence DECIMAL NOT NULL,
      entry_price DECIMAL,
      stop_loss DECIMAL,
      take_profit DECIMAL,
      risk_reward_ratio DECIMAL,
      timeframe TEXT DEFAULT '1h',
      strategy_recommended TEXT,
      reasoning TEXT,
      indicators JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Chat messages
    `CREATE TABLE IF NOT EXISTS public.chat_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
      conversation_id UUID DEFAULT gen_random_uuid(),
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Daily performance
    `CREATE TABLE IF NOT EXISTS public.daily_performance (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
      date DATE NOT NULL,
      starting_balance DECIMAL,
      ending_balance DECIMAL,
      pnl DECIMAL DEFAULT 0,
      pnl_pct DECIMAL DEFAULT 0,
      trades_count INTEGER DEFAULT 0,
      winning_trades INTEGER DEFAULT 0,
      losing_trades INTEGER DEFAULT 0,
      best_trade_pnl DECIMAL,
      worst_trade_pnl DECIMAL,
      max_drawdown DECIMAL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, date)
    )`,

    // Audit logs
    `CREATE TABLE IF NOT EXISTS public.audit_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id UUID,
      details JSONB DEFAULT '{}',
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Market cache
    `CREATE TABLE IF NOT EXISTS public.market_cache (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      pair TEXT NOT NULL,
      exchange TEXT,
      data_type TEXT NOT NULL,
      data JSONB NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Admin stats
    `CREATE TABLE IF NOT EXISTS public.admin_stats (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      total_users INTEGER DEFAULT 0,
      free_users INTEGER DEFAULT 0,
      pro_users INTEGER DEFAULT 0,
      ultra_users INTEGER DEFAULT 0,
      new_signups_today INTEGER DEFAULT 0,
      mrr DECIMAL DEFAULT 0,
      total_trades_today INTEGER DEFAULT 0,
      total_bots_active INTEGER DEFAULT 0,
      api_errors_today INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Referrals
    `CREATE TABLE IF NOT EXISTS public.referrals (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      referrer_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
      referred_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
      referral_code TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded')),
      reward_applied BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      converted_at TIMESTAMPTZ,
      UNIQUE(referred_id)
    )`,

    // Learning logs
    `CREATE TABLE IF NOT EXISTS public.learning_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      daily_review JSONB NOT NULL,
      weight_adjustments JSONB NOT NULL,
      strategy_performance JSONB NOT NULL,
      loss_conditions JSONB,
      improvement_report TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades(user_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades(user_id, opened_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_trades_bot ON public.trades(bot_id, opened_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_signals_active ON public.signals(is_active, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_user_conv ON public.chat_messages(user_id, conversation_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_market_cache_lookup ON public.market_cache(pair, data_type, expires_at)`,

    // RLS
    `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.exchange_connections ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.daily_performance ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.market_cache ENABLE ROW LEVEL SECURITY`,
  ];

  for (const sql of statements) {
    const stepName = sql.trim().substring(0, 60).replace(/\n/g, ' ');
    try {
      const { error } = await supabase.rpc('exec_sql', { query: sql });
      if (error) {
        // Try direct approach if rpc not available
        results.push({ step: stepName, status: 'skipped', error: error.message });
      } else {
        results.push({ step: stepName, status: 'ok' });
      }
    } catch (err) {
      results.push({ step: stepName, status: 'error', error: String(err) });
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Setup completed. Some steps may need manual SQL execution via SSH.',
    results,
  });
}

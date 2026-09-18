-- Durable idempotency and reconciliation ledger for live exchange operations.
ALTER TABLE public.exchange_connections ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.exchange_connections ADD COLUMN IF NOT EXISTS api_key_iv TEXT;
ALTER TABLE public.exchange_connections ADD COLUMN IF NOT EXISTS api_secret_iv TEXT;
ALTER TABLE public.exchange_connections ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exchange_connections' AND column_name = 'encryption_iv'
  ) THEN
    EXECUTE 'UPDATE public.exchange_connections
      SET api_key_iv = COALESCE(api_key_iv, encryption_iv),
          api_secret_iv = COALESCE(api_secret_iv, encryption_iv)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.trade_execution_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  exchange_connection_id UUID NOT NULL REFERENCES public.exchange_connections(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('open', 'close')),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  requested_quantity DECIMAL(30,12),
  exchange_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'submitted', 'confirmed', 'unknown', 'failed')),
  error TEXT,
  exchange_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_execution_close_once
  ON public.trade_execution_intents(trade_id, purpose)
  WHERE purpose = 'close' AND status IN ('prepared', 'submitted', 'confirmed', 'unknown');
CREATE INDEX IF NOT EXISTS idx_trade_execution_reconcile
  ON public.trade_execution_intents(status, created_at)
  WHERE status IN ('submitted', 'unknown');

ALTER TABLE public.trade_execution_intents ENABLE ROW LEVEL SECURITY;
-- Idempotence (CREATE POLICY n'a pas de IF NOT EXISTS)
DROP POLICY IF EXISTS "trade_execution_intents_user_select" ON public.trade_execution_intents;
CREATE POLICY "trade_execution_intents_user_select" ON public.trade_execution_intents
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS slippage_pct DECIMAL(12,8);

CREATE TABLE IF NOT EXISTS public.trading_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  capital_usd DECIMAL(20,8) NOT NULL DEFAULT 1000 CHECK (capital_usd > 0),
  paper_capital DECIMAL(20,8) NOT NULL DEFAULT 10000 CHECK (paper_capital > 0),
  daily_loss_limit_usd DECIMAL(20,8) NOT NULL DEFAULT 100 CHECK (daily_loss_limit_usd >= 0),
  weekly_loss_limit_usd DECIMAL(20,8) NOT NULL DEFAULT 500 CHECK (weekly_loss_limit_usd >= 0),
  monthly_loss_limit_usd DECIMAL(20,8) NOT NULL DEFAULT 2000 CHECK (monthly_loss_limit_usd >= 0),
  max_position_size_pct DECIMAL(8,4) NOT NULL DEFAULT 2 CHECK (max_position_size_pct > 0 AND max_position_size_pct <= 100),
  max_concurrent_positions INTEGER NOT NULL DEFAULT 5 CHECK (max_concurrent_positions > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trading_settings ENABLE ROW LEVEL SECURITY;
-- Idempotence (CREATE POLICY n'a pas de IF NOT EXISTS)
DROP POLICY IF EXISTS "trading_settings_user_all" ON public.trading_settings;
CREATE POLICY "trading_settings_user_all" ON public.trading_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.trade_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  confidence DECIMAL,
  entry_price DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  position_size_pct DECIMAL,
  strategy TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trade_audit_user_created
  ON public.trade_audit_logs(user_id, created_at DESC);
ALTER TABLE public.trade_audit_logs ENABLE ROW LEVEL SECURITY;
-- Idempotence (CREATE POLICY n'a pas de IF NOT EXISTS)
DROP POLICY IF EXISTS "trade_audit_logs_user_select" ON public.trade_audit_logs;
CREATE POLICY "trade_audit_logs_user_select" ON public.trade_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

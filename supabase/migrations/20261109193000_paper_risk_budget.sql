-- Extend the existing paper transaction and account lock; no parallel ledger.
-- Admission uses configured paper capital in USDT, not exchange equity or a
-- guaranteed stop fill. Observed price gaps can exceed the reserved estimate.
BEGIN;
-- Deleting a profile also cascades into trades. Account deletion remains a
-- server operation through auth.admin.deleteUser; direct client deletion is
-- not a second way to reset the same account's recorded loss allowance.
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
-- A client must not erase losses, mint positions or change stops behind the
-- shared transaction. Keep owner-scoped reads; mutation stays server-only.
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own trades" ON public.trades;
DROP POLICY IF EXISTS "Users read own trades" ON public.trades;
CREATE POLICY "Users read own trades" ON public.trades
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.trades FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.trades TO authenticated;

CREATE OR REPLACE FUNCTION public.midas_execute_paper_trade(
  p_user_id UUID, p_operation_id UUID, p_decision JSONB,
  p_quote_amount NUMERIC DEFAULT NULL,
  p_daily_limit INTEGER DEFAULT 5, p_max_positions INTEGER DEFAULT 3
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_existing public.trade_execution_intents%ROWTYPE;
  v_settings public.trading_settings%ROWTYPE;
  v_request JSONB := jsonb_build_object('decision', p_decision, 'quote_amount', p_quote_amount);
  v_trade_id UUID := gen_random_uuid();
  v_receipt JSONB;
  v_capital NUMERIC;
  v_quote NUMERIC;
  v_price NUMERIC;
  v_quantity NUMERIC;
  v_fee NUMERIC;
  v_slippage NUMERIC;
  v_open INTEGER;
  v_daily INTEGER;
  v_exposure NUMERIC;
  v_reserved NUMERIC;
  v_realized NUMERIC;
  v_key TEXT;
  v_number NUMERIC;
  v_now TIMESTAMPTZ;
  v_daily_cap NUMERIC;
  v_weekly_cap NUMERIC;
  v_monthly_cap NUMERIC;
  v_daily_loss NUMERIC;
  v_weekly_loss NUMERIC;
  v_monthly_loss NUMERIC;
  v_open_loss NUMERIC;
  v_new_loss NUMERIC;
  v_new_reward NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION 'Account and operation required'; END IF;
  -- A snapshot taken before the account lock must not miss the previous
  -- transaction's positions. PostgREST uses READ COMMITTED by default.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Paper admission requires read committed isolation';
  END IF;
  -- Opening and observation/closing share this lock and lock order.
  -- Every writer of paper account state must respect the same protocol.
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paper account unavailable'; END IF;
  v_now := clock_timestamp();

  SELECT * INTO v_existing FROM public.trade_execution_intents WHERE idempotency_key = p_operation_id;
  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM p_user_id
       OR v_existing.execution_mode <> 'paper'
       OR v_existing.request_payload IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Operation identifier conflict';
    END IF;
    IF v_existing.status = 'confirmed' AND v_existing.exchange_response IS NOT NULL THEN
      RETURN v_existing.exchange_response; -- Includes the original timestamp and receipt.
    END IF;
    RAISE EXCEPTION 'Operation requires reconciliation';
  END IF;

  IF NOT COALESCE(jsonb_typeof(p_decision) = 'object'
     AND p_decision->>'action' IN ('buy', 'sell')
     AND p_decision->>'pair' ~ '^[A-Z0-9]{1,20}/USDT$'
     AND p_daily_limit BETWEEN 1 AND 1000000000
     AND p_max_positions BETWEEN 1 AND 1000000000, false) THEN
    RAISE EXCEPTION 'Invalid paper request';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['entry_price', 'stop_loss', 'take_profit', 'position_size_pct', 'confidence', 'composite_score', 'risk_reward_ratio'] LOOP
    IF jsonb_typeof(p_decision->v_key) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid numeric input'; END IF;
    v_number := (p_decision->>v_key)::NUMERIC;
    IF NOT (v_number > -1e12 AND v_number < 1e12) THEN RAISE EXCEPTION 'Non-finite or excessive input'; END IF;
  END LOOP;
  IF NOT ((p_decision->>'entry_price')::NUMERIC > 0 AND (p_decision->>'stop_loss')::NUMERIC > 0
     AND (p_decision->>'take_profit')::NUMERIC > 0 AND (p_decision->>'position_size_pct')::NUMERIC > 0
     AND (p_decision->>'position_size_pct')::NUMERIC <= 100
     AND (p_decision->>'confidence')::NUMERIC BETWEEN 0.5 AND 1
     AND (p_decision->>'composite_score')::NUMERIC BETWEEN -1 AND 1) THEN
    RAISE EXCEPTION 'Invalid paper prices or confidence';
  END IF;
  IF (p_decision->>'action' = 'buy' AND NOT ((p_decision->>'stop_loss')::NUMERIC < (p_decision->>'entry_price')::NUMERIC AND (p_decision->>'take_profit')::NUMERIC > (p_decision->>'entry_price')::NUMERIC))
     OR (p_decision->>'action' = 'sell' AND NOT ((p_decision->>'stop_loss')::NUMERIC > (p_decision->>'entry_price')::NUMERIC AND (p_decision->>'take_profit')::NUMERIC < (p_decision->>'entry_price')::NUMERIC)) THEN
    RAISE EXCEPTION 'Invalid paper stop or target';
  END IF;

  SELECT * INTO v_settings FROM public.trading_settings WHERE user_id = p_user_id FOR SHARE;
  v_capital := COALESCE(v_settings.paper_capital, 10000);
  v_daily_cap := LEAST(COALESCE(v_settings.daily_loss_limit_usd, 100), 500, v_capital * 0.01);
  v_weekly_cap := COALESCE(v_settings.weekly_loss_limit_usd, 500);
  v_monthly_cap := COALESCE(v_settings.monthly_loss_limit_usd, 2000);
  IF NOT (COALESCE(v_settings.daily_loss_limit_usd, 100) > 0
    AND COALESCE(v_settings.daily_loss_limit_usd, 100) < 1e12
    AND v_weekly_cap > 0 AND v_weekly_cap < 1e12
    AND v_monthly_cap > 0 AND v_monthly_cap < 1e12
    AND v_daily_cap > 0 AND v_daily_cap < 1e12) THEN
    RAISE EXCEPTION 'Invalid paper loss limit';
  END IF;
  v_quote := COALESCE(p_quote_amount, v_capital * (p_decision->>'position_size_pct')::NUMERIC / 100);
  IF NOT (v_capital > 0 AND v_capital < 1e12 AND v_quote > 0
      AND v_quote <= v_capital * LEAST(2, COALESCE(v_settings.max_position_size_pct, 2)) / 100) THEN
    RAISE EXCEPTION 'Paper allocation limit exceeded';
  END IF;
  IF EXISTS (SELECT 1 FROM public.trades WHERE user_id = p_user_id AND is_paper_trade = true
      AND status IN ('open', 'closed') AND pair !~ '^[A-Z0-9]{1,20}/USDT$') THEN
    RAISE EXCEPTION 'Paper risk history requires a common USDT quote currency';
  END IF;
  IF EXISTS (SELECT 1 FROM public.trades WHERE user_id = p_user_id AND is_paper_trade = true AND status = 'open'
      AND NOT COALESCE(entry_price > 0 AND entry_price < 1e12
        AND quantity > 0 AND quantity < 1e12 AND quote_amount > 0 AND quote_amount < 1e12
        AND abs(quote_amount - round(entry_price * quantity, 8)) <= 0.00000001
        AND stop_loss > 0 AND stop_loss < 1e12 AND fees >= 0 AND fees < 1e12
        AND (current_price IS NULL OR (current_price > 0 AND current_price < 1e12)), false)) THEN
    RAISE EXCEPTION 'Invalid open paper position';
  END IF;
  SELECT count(*), COALESCE(sum(quote_amount + fees), 0),
         COALESCE(sum(quote_amount) FILTER (WHERE pair = p_decision->>'pair'), 0)
    INTO v_open, v_reserved, v_exposure FROM public.trades
    WHERE user_id = p_user_id AND is_paper_trade = true AND status = 'open';
  SELECT count(*) INTO v_daily FROM public.trades
    WHERE user_id = p_user_id AND is_paper_trade = true
      AND created_at >= (date_trunc('day', timezone('UTC', v_now)) AT TIME ZONE 'UTC');
  IF EXISTS (SELECT 1 FROM public.trades WHERE user_id = p_user_id AND is_paper_trade = true AND status = 'closed'
      AND (pnl IS NULL OR fees IS NULL OR closed_at IS NULL OR NOT isfinite(closed_at)
        OR closed_at < to_timestamp(0) OR closed_at > v_now
        OR NOT (pnl > -1e12 AND pnl < 1e12 AND fees >= 0 AND fees < 1e12))) THEN
    RAISE EXCEPTION 'Paper history contains invalid amounts';
  END IF;
  -- Existing trade rows keep gross P&L and cumulative fees in separate columns.
  SELECT COALESCE(sum(pnl - fees), 0) INTO v_realized FROM public.trades
    WHERE user_id = p_user_id AND is_paper_trade = true AND status = 'closed';
  IF v_open >= LEAST(5, p_max_positions, COALESCE(v_settings.max_concurrent_positions, 5))
      OR v_daily >= p_daily_limit OR v_exposure + v_quote > v_capital * 0.20 THEN
    RAISE EXCEPTION 'Paper position or daily limit reached';
  END IF;

  -- Explicit educational assumptions, not a measured spread or live fill.
  v_slippage := CASE WHEN upper(p_decision->>'pair') IN ('BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT') THEN 0.05 ELSE 0.10 END;
  v_price := round((p_decision->>'entry_price')::NUMERIC * (1 + v_slippage / 100 * CASE WHEN p_decision->>'action' = 'buy' THEN 1 ELSE -1 END), 8);
  IF v_price <= 0 OR v_price >= 1e12 THEN RAISE EXCEPTION 'Paper price outside storage precision'; END IF;
  v_quantity := trunc(v_quote / v_price, 8);
  IF v_quantity <= 0 OR v_quantity >= 1e12 THEN RAISE EXCEPTION 'Paper quantity outside storage precision'; END IF;
  v_quote := round(v_quantity * v_price, 8);
  IF v_quote <= 0 THEN RAISE EXCEPTION 'Paper quote outside storage precision'; END IF;
  v_fee := round(v_quote * 0.001, 8);
  IF (p_decision->>'action' = 'buy' AND NOT ((p_decision->>'stop_loss')::NUMERIC < v_price AND v_price < (p_decision->>'take_profit')::NUMERIC))
     OR (p_decision->>'action' = 'sell' AND NOT ((p_decision->>'stop_loss')::NUMERIC > v_price AND v_price > (p_decision->>'take_profit')::NUMERIC)) THEN
    RAISE EXCEPTION 'Invalid paper stop or target after slippage';
  END IF;
  IF NOT (v_reserved + v_quote + v_fee <= v_capital + v_realized) THEN RAISE EXCEPTION 'Insufficient paper capital'; END IF;

  -- Reserve gross adverse movement plus already charged entry fees and the
  -- assumed closing fee. A protected gain does not replenish another trade's
  -- budget. stop_loss is the effective stop persisted by the observation RPC.
  -- A worse last observed mark takes precedence over an already crossed stop.
  SELECT COALESCE(sum(greatest(0, round((entry_price - exit_mark) * quantity *
      CASE WHEN side = 'buy' THEN 1 ELSE -1 END, 8)) + fees + round(exit_mark * quantity * 0.001, 8)), 0)
    INTO v_open_loss FROM (
      SELECT entry_price, quantity, fees, side,
        CASE WHEN side = 'buy' THEN least(stop_loss, COALESCE(current_price, stop_loss))
          ELSE greatest(stop_loss, COALESCE(current_price, stop_loss)) END AS exit_mark
      FROM public.trades WHERE user_id = p_user_id AND is_paper_trade = true AND status = 'open'
    ) AS positions;
  v_new_loss := greatest(0, round((v_price - (p_decision->>'stop_loss')::NUMERIC) * v_quantity *
    CASE WHEN p_decision->>'action' = 'buy' THEN 1 ELSE -1 END, 8))
    + v_fee + round((p_decision->>'stop_loss')::NUMERIC * v_quantity * 0.001, 8);
  v_new_reward := round(((p_decision->>'take_profit')::NUMERIC - v_price) * v_quantity *
    CASE WHEN p_decision->>'action' = 'buy' THEN 1 ELSE -1 END, 8)
    - v_fee - round((p_decision->>'take_profit')::NUMERIC * v_quantity * 0.001, 8);
  -- L3 is evaluated on the actual paper fill and round-trip costs, including
  -- the target's exit fee. A nominal quote ratio cannot approve a worse fill.
  IF v_new_loss <= 0 OR v_new_reward < v_new_loss * 1.5
      OR (p_decision->>'risk_reward_ratio')::NUMERIC < 1.5 THEN
    RAISE SQLSTATE 'PT409' USING MESSAGE = 'Paper execution risk/reward below minimum';
  END IF;
  -- Elapsed hours match the TypeScript rolling windows in every session
  -- timezone. Calendar days would gain/lose an hour across a DST transition.
  SELECT COALESCE(sum(greatest(fees - pnl, 0)) FILTER (WHERE closed_at >= v_now - interval '24 hours'), 0),
         COALESCE(sum(greatest(fees - pnl, 0)) FILTER (WHERE closed_at >= v_now - interval '168 hours'), 0),
         COALESCE(sum(greatest(fees - pnl, 0)) FILTER (WHERE closed_at >= v_now - interval '720 hours'), 0)
    INTO v_daily_loss, v_weekly_loss, v_monthly_loss
    FROM public.trades WHERE user_id = p_user_id AND is_paper_trade = true AND status = 'closed';
  IF v_daily_loss + v_open_loss + v_new_loss >= v_daily_cap THEN RAISE SQLSTATE 'PT409' USING MESSAGE = 'Daily paper loss budget reached'; END IF;
  IF v_weekly_loss + v_open_loss + v_new_loss >= v_weekly_cap THEN RAISE SQLSTATE 'PT409' USING MESSAGE = 'Weekly paper loss budget reached'; END IF;
  IF v_monthly_loss + v_open_loss + v_new_loss >= v_monthly_cap THEN RAISE SQLSTATE 'PT409' USING MESSAGE = 'Monthly paper loss budget reached'; END IF;

  v_receipt := jsonb_build_object('success', true, 'trade_id', v_trade_id,
    'order_id', 'PAPER-' || p_operation_id, 'operation_id', p_operation_id,
    'executed_price', v_price, 'executed_quantity', v_quantity, 'fees', v_fee,
    'slippage_pct', v_slippage, 'is_paper', true, 'error', NULL,
    'timestamp', floor(extract(epoch FROM clock_timestamp()) * 1000),
    'state', 'paper_executed', 'audit_status', 'recorded');

  INSERT INTO public.trades (id, user_id, exchange, pair, side, type, entry_price, quantity, quote_amount,
    stop_loss, take_profit, status, fees, slippage_pct, exchange_order_id, strategy, confidence,
    ai_reasoning, composite_score, risk_reward_ratio, agent_results, is_paper_trade)
  VALUES (v_trade_id, p_user_id, 'paper', p_decision->>'pair', p_decision->>'action', 'market', v_price, v_quantity, v_quote,
    (p_decision->>'stop_loss')::NUMERIC, (p_decision->>'take_profit')::NUMERIC, 'open', v_fee, v_slippage,
    'PAPER-' || p_operation_id, p_decision->>'strategy', (p_decision->>'confidence')::NUMERIC,
    p_decision->>'reasoning', (p_decision->>'composite_score')::NUMERIC,
    v_new_reward / v_new_loss,
    p_decision->'agent_results', true);

  INSERT INTO public.trade_audit_logs (user_id, action, symbol, side, confidence, entry_price, stop_loss,
    take_profit, position_size_pct, strategy, details)
  VALUES (p_user_id, 'paper_executed', p_decision->>'pair', p_decision->>'action',
    (p_decision->>'confidence')::NUMERIC, v_price, (p_decision->>'stop_loss')::NUMERIC,
    (p_decision->>'take_profit')::NUMERIC, v_quote / v_capital * 100, p_decision->>'strategy',
    jsonb_build_object('operation_id', p_operation_id, 'trade_id', v_trade_id, 'reasoning', p_decision->>'reasoning', 'simulated_slippage', true,
      'paper_risk_budget', jsonb_build_object('quote_currency', 'USDT', 'capital_basis', v_capital,
        'new_position_loss', v_new_loss, 'new_position_reward', v_new_reward,
        'net_risk_reward_ratio', v_new_reward / v_new_loss, 'open_positions_loss', v_open_loss,
        'daily_loss', v_daily_loss, 'daily_limit', v_daily_cap,
        'weekly_loss', v_weekly_loss, 'weekly_limit', v_weekly_cap,
        'monthly_loss', v_monthly_loss, 'monthly_limit', v_monthly_cap)));

  INSERT INTO public.trade_execution_intents (user_id, trade_id, exchange_connection_id, idempotency_key,
    purpose, symbol, side, requested_quantity, exchange_order_id, status, exchange_response, execution_mode, request_payload)
  VALUES (p_user_id, v_trade_id, NULL, p_operation_id, 'open', p_decision->>'pair', p_decision->>'action',
    v_quantity, 'PAPER-' || p_operation_id, 'confirmed', v_receipt, 'paper', v_request);
  RETURN v_receipt;
END;
$$;
REVOKE ALL ON FUNCTION public.midas_execute_paper_trade(UUID, UUID, JSONB, NUMERIC, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.midas_execute_paper_trade(UUID, UUID, JSONB, NUMERIC, INTEGER, INTEGER) TO service_role;
COMMIT;

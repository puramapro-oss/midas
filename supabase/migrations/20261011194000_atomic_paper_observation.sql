-- Educational paper state only. Validate in isolated databases before deployment.
BEGIN;
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS price_observed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trailing_stop_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS trailing_stop_highest NUMERIC,
  ADD COLUMN IF NOT EXISTS trailing_stop_lowest NUMERIC,
  ADD COLUMN IF NOT EXISTS breakeven_activated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paper_initial_stop_loss NUMERIC;

CREATE OR REPLACE FUNCTION public.midas_apply_paper_observation(
  p_user_id UUID, p_trade_id UUID, p_price NUMERIC, p_observed_at TIMESTAMPTZ,
  p_manual_close BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_trade public.trades%ROWTYPE;
  v_reason TEXT;
  v_actions JSONB := '[]'::JSONB;
  v_old_stop NUMERIC;
  v_level NUMERIC;
  v_risk NUMERIC;
  v_profit NUMERIC;
  v_gross NUMERIC;
  v_exit_fee NUMERIC;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_user_id IS NULL OR p_trade_id IS NULL OR p_manual_close IS NULL THEN RAISE EXCEPTION 'Paper account and trade required'; END IF;
  -- Same lock order as paper openings: profile then position. Closing balances
  -- and new allocations cannot race under different locks.
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paper account unavailable'; END IF;
  SELECT * INTO v_trade FROM public.trades WHERE id=p_trade_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paper position unavailable'; END IF;
  IF v_trade.is_paper_trade IS DISTINCT FROM true THEN RAISE EXCEPTION 'Live position mutation prohibited'; END IF;
  IF v_trade.status = 'closed' THEN
    RETURN jsonb_build_object('trade', to_jsonb(v_trade), 'replayed', true, 'actions', v_actions);
  END IF;
  IF v_trade.status IS DISTINCT FROM 'open' THEN RAISE EXCEPTION 'Paper position is not open'; END IF;
  v_now := clock_timestamp(); -- Recheck freshness after any lock wait.
  IF NOT COALESCE(p_price > 0 AND p_price < 1e12 AND round(p_price, 8) > 0
      AND p_observed_at >= v_now - INTERVAL '120 seconds' AND p_observed_at <= v_now + INTERVAL '5 seconds', false) THEN
    RAISE EXCEPTION 'Invalid or stale paper observation';
  END IF;
  IF v_trade.price_observed_at IS NOT NULL THEN
    IF p_observed_at < v_trade.price_observed_at THEN RAISE EXCEPTION 'Out-of-order paper observation'; END IF;
    IF p_observed_at = v_trade.price_observed_at AND NOT p_manual_close THEN
      RETURN jsonb_build_object('trade', to_jsonb(v_trade), 'replayed', true, 'actions', v_actions);
    END IF;
  END IF;
  IF NOT COALESCE(v_trade.entry_price > 0 AND v_trade.entry_price < 1e12
      AND v_trade.quantity > 0 AND v_trade.quantity < 1e12
      AND v_trade.fees >= 0 AND v_trade.fees < 1e12, false) THEN RAISE EXCEPTION 'Invalid paper position amounts'; END IF;
  p_price := round(p_price, 8);
  IF NOT p_manual_close AND NOT COALESCE(v_trade.stop_loss > 0 AND v_trade.stop_loss < 1e12
      AND (v_trade.take_profit IS NULL OR (v_trade.take_profit > 0 AND v_trade.take_profit < 1e12))
      AND (v_trade.trailing_stop_highest IS NULL OR (v_trade.trailing_stop_highest > 0 AND v_trade.trailing_stop_highest < 1e12))
      AND (v_trade.trailing_stop_lowest IS NULL OR (v_trade.trailing_stop_lowest > 0 AND v_trade.trailing_stop_lowest < 1e12)), false) THEN
    RAISE EXCEPTION 'Invalid paper risk levels';
  END IF;
  v_trade.paper_initial_stop_loss := COALESCE(v_trade.paper_initial_stop_loss, v_trade.stop_loss);
  v_old_stop := v_trade.stop_loss;

  IF p_manual_close THEN v_reason := 'manual';
  ELSIF (v_trade.side='buy' AND p_price <= v_trade.stop_loss) OR (v_trade.side='sell' AND p_price >= v_trade.stop_loss) THEN
    v_reason := CASE WHEN v_trade.trailing_stop_activated THEN 'trailing_stop' ELSE 'stop_loss' END;
  ELSIF (v_trade.side='buy' AND p_price >= v_trade.take_profit) OR (v_trade.side='sell' AND p_price <= v_trade.take_profit) THEN
    v_reason := 'take_profit';
  END IF;

  IF v_reason IS NULL AND v_trade.trailing_stop_pct IS NOT NULL THEN
    IF NOT (v_trade.trailing_stop_pct > 0 AND v_trade.trailing_stop_pct < 100) THEN RAISE EXCEPTION 'Invalid trailing percentage'; END IF;
    IF v_trade.side='buy' THEN
      v_trade.trailing_stop_highest := greatest(COALESCE(v_trade.trailing_stop_highest, v_trade.entry_price), p_price);
      v_level := v_trade.trailing_stop_highest * (1 - v_trade.trailing_stop_pct / 100);
      IF p_price <= v_level THEN v_reason := 'trailing_stop';
      ELSIF v_level > v_trade.stop_loss THEN v_trade.stop_loss := v_level; END IF;
    ELSE
      v_trade.trailing_stop_lowest := least(COALESCE(v_trade.trailing_stop_lowest, v_trade.entry_price), p_price);
      v_level := v_trade.trailing_stop_lowest * (1 + v_trade.trailing_stop_pct / 100);
      IF p_price >= v_level THEN v_reason := 'trailing_stop';
      ELSIF v_level < v_trade.stop_loss THEN v_trade.stop_loss := v_level; END IF;
    END IF;
    IF v_trade.stop_loss IS DISTINCT FROM v_old_stop THEN
      v_trade.trailing_stop := v_trade.stop_loss;
      v_trade.trailing_stop_activated := true;
      v_actions := v_actions || jsonb_build_array(jsonb_build_object('position_id', p_trade_id,
        'action', 'update_trailing', 'reason', 'Trailing level updated from a fresh observation',
        'new_stop_loss', v_trade.stop_loss, 'close_price', NULL));
    END IF;
  END IF;

  IF v_reason IS NULL AND NOT v_trade.breakeven_activated THEN
    v_risk := abs(v_trade.entry_price - v_trade.paper_initial_stop_loss);
    v_profit := (p_price - v_trade.entry_price) * CASE WHEN v_trade.side='buy' THEN 1 ELSE -1 END;
    IF v_risk > 0 AND v_profit >= v_risk * 1.5 THEN
      v_trade.breakeven_activated := true;
      -- Entry-level stop is a price breakeven, not a fee-free net breakeven.
      IF (v_trade.side='buy' AND v_trade.stop_loss < v_trade.entry_price)
         OR (v_trade.side='sell' AND v_trade.stop_loss > v_trade.entry_price) THEN
        v_trade.stop_loss := v_trade.entry_price;
        v_actions := v_actions || jsonb_build_array(jsonb_build_object('position_id', p_trade_id,
          'action', 'move_breakeven', 'reason', 'Stop moved to entry; fees still apply',
          'new_stop_loss', v_trade.stop_loss, 'close_price', NULL));
      END IF;
    END IF;
  END IF;

  IF v_reason IS NOT NULL THEN
    v_gross := round((p_price - v_trade.entry_price) * v_trade.quantity * CASE WHEN v_trade.side='buy' THEN 1 ELSE -1 END, 8);
    v_exit_fee := round(p_price * v_trade.quantity * 0.001, 8);
    v_trade.fees := v_trade.fees + v_exit_fee;
    IF NOT (v_gross > -1e12 AND v_gross < 1e12 AND v_trade.fees < 1e12) THEN RAISE EXCEPTION 'Paper result outside supported range'; END IF;
    v_trade.pnl := v_gross;
    v_trade.pnl_pct := (v_gross - v_trade.fees) / (v_trade.entry_price * v_trade.quantity) * 100;
    v_trade.exit_price := p_price;
    v_trade.status := 'closed'; v_trade.closed_at := v_now; v_trade.close_reason := v_reason;
    v_trade.result := CASE WHEN v_gross - v_trade.fees > 0 THEN 'win' WHEN v_gross - v_trade.fees < 0 THEN 'loss' ELSE 'breakeven' END;
    v_actions := v_actions || jsonb_build_array(jsonb_build_object('position_id', p_trade_id,
      'action', CASE v_reason WHEN 'manual' THEN 'close_manual' WHEN 'stop_loss' THEN 'close_sl'
        WHEN 'take_profit' THEN 'close_tp' ELSE 'close_trailing' END,
      'reason', v_reason, 'new_stop_loss', NULL, 'close_price', p_price));
  END IF;

  UPDATE public.trades SET current_price=p_price, price_observed_at=p_observed_at,
    stop_loss=v_trade.stop_loss, trailing_stop=v_trade.trailing_stop,
    trailing_stop_activated=v_trade.trailing_stop_activated, trailing_stop_highest=v_trade.trailing_stop_highest,
    trailing_stop_lowest=v_trade.trailing_stop_lowest, breakeven_activated=v_trade.breakeven_activated,
    paper_initial_stop_loss=v_trade.paper_initial_stop_loss, fees=v_trade.fees, pnl=v_trade.pnl,
    pnl_pct=v_trade.pnl_pct, exit_price=v_trade.exit_price, status=v_trade.status,
    closed_at=v_trade.closed_at, close_reason=v_trade.close_reason, result=v_trade.result, updated_at=v_now
    WHERE id=p_trade_id AND user_id=p_user_id RETURNING * INTO v_trade;
  IF jsonb_array_length(v_actions) > 0 THEN
    INSERT INTO public.trade_audit_logs(user_id, action, symbol, side, details)
    VALUES(p_user_id, CASE WHEN v_reason IS NULL THEN 'paper_monitor_updated' ELSE 'paper_closed' END,
      v_trade.pair, v_trade.side, jsonb_build_object('trade_id', p_trade_id, 'actions', v_actions,
        'observed_at', p_observed_at, 'price', p_price, 'price_source', 'binance_public_aggTrades', 'fee_rate_assumption', 0.001));
  END IF;
  RETURN jsonb_build_object('trade', to_jsonb(v_trade), 'replayed', false, 'actions', v_actions);
END;
$$;
REVOKE ALL ON FUNCTION public.midas_apply_paper_observation(UUID, UUID, NUMERIC, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.midas_apply_paper_observation(UUID, UUID, NUMERIC, TIMESTAMPTZ, BOOLEAN) TO service_role;
COMMIT;

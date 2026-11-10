-- Capacity authority for a physical account shared by JEV and MIDAS.
-- Reuses the existing PostgreSQL database. This is NOT an execution journal,
-- broker connector or LIVE release. No account is enrolled/enabled here.
-- A trusted server must verify the account binding, both writers and the
-- observer before an administrator can enable admission. Clients get no grant.
BEGIN;

CREATE TABLE public.shared_account_risk_accounts (
  account_key TEXT PRIMARY KEY CHECK (account_key ~ '^[a-f0-9]{64}$'),
  authority_id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- Canonical verified broker + server + physical account, never bot/role/magic.
  -- Distinct keys or authorities must not enroll this same physical budget twice.
  binding_hash TEXT NOT NULL UNIQUE CHECK (binding_hash ~ '^[a-f0-9]{64}$'),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3,8}$'),
  reset_timezone TEXT NOT NULL DEFAULT 'UTC',
  writers TEXT[] NOT NULL DEFAULT '{}',
  admission_enabled BOOLEAN NOT NULL DEFAULT false,
  max_age_seconds INTEGER NOT NULL DEFAULT 30 CHECK (max_age_seconds BETWEEN 1 AND 30),
  revision BIGINT NOT NULL DEFAULT 0,
  uncertain BOOLEAN NOT NULL DEFAULT true,
  observed_at TIMESTAMPTZ,
  snapshot_hash TEXT,
  day_start TIMESTAMPTZ,
  capital NUMERIC,
  opening_capital NUMERIC,
  daily_loss NUMERIC,
  existing_risk NUMERIC,
  available_margin NUMERIC,
  existing_position_violation BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE public.shared_account_risk_days (
  account_key TEXT NOT NULL REFERENCES public.shared_account_risk_accounts(account_key),
  day_start TIMESTAMPTZ NOT NULL,
  opening_capital NUMERIC NOT NULL CHECK (opening_capital > 0 AND opening_capital < 1e12),
  realized_loss NUMERIC NOT NULL DEFAULT 0 CHECK (realized_loss >= 0 AND realized_loss < 1e12),
  PRIMARY KEY (account_key, day_start)
);
CREATE TABLE public.shared_account_risk_reservations (
  operation_id UUID PRIMARY KEY,
  account_key TEXT NOT NULL REFERENCES public.shared_account_risk_accounts(account_key),
  intent_hash TEXT NOT NULL CHECK (intent_hash ~ '^[a-f0-9]{64}$'),
  writer TEXT NOT NULL,
  request JSONB NOT NULL,
  loss NUMERIC NOT NULL CHECK (loss > 0 AND loss < 1e12),
  margin NUMERIC NOT NULL CHECK (margin >= 0 AND margin < 1e12),
  fencing BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  state TEXT NOT NULL DEFAULT 'RESERVED'
    CHECK (state IN ('RESERVED','SUBMITTING','UNKNOWN','RELEASED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  submitted_at TIMESTAMPTZ,
  reconciliation_hash TEXT,
  release_kind TEXT,
  UNIQUE (account_key, intent_hash)
);
ALTER TABLE public.shared_account_risk_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_account_risk_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_account_risk_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shared_account_risk_accounts, public.shared_account_risk_days,
  public.shared_account_risk_reservations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.shared_account_risk_reservations_fencing_seq
  FROM PUBLIC, anon, authenticated, service_role;

-- Exact bounded decimal input, never a float/boolean/NaN/Infinity coercion.
CREATE FUNCTION public.purama_shared_risk_amount(p_value JSONB, p_signed BOOLEAN DEFAULT false)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_text TEXT := p_value #>> '{}'; v_number NUMERIC;
BEGIN
  IF jsonb_typeof(p_value) NOT IN ('number','string') OR v_text IS NULL
     OR v_text !~ '^-?(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$' THEN
    RAISE EXCEPTION 'SHARED_RISK_INVALID_AMOUNT';
  END IF;
  v_number := v_text::NUMERIC;
  IF abs(v_number) >= 1e12 OR (NOT p_signed AND v_number < 0) THEN
    RAISE EXCEPTION 'SHARED_RISK_INVALID_AMOUNT';
  END IF;
  RETURN v_number;
END;
$$;

CREATE FUNCTION public.purama_shared_risk_receipt(p_operation_id UUID, p_applied BOOLEAN)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('contract', 'purama.shared-account-risk.v1',
    'account_key', a.account_key, 'authority_id', a.authority_id,
    'writer', r.writer, 'currency', a.currency,
    'operation_id', r.operation_id, 'intent_hash', r.intent_hash,
    'fencing', r.fencing::TEXT, 'state', r.state, 'applied', p_applied,
    'loss', r.loss::TEXT, 'margin', r.margin::TEXT,
    'snapshot_hash', r.request->>'snapshot_hash',
    'execution_authority', false, 'live_release', 'LOCKED')
  FROM public.shared_account_risk_reservations r
  JOIN public.shared_account_risk_accounts a USING (account_key)
  WHERE r.operation_id = p_operation_id;
$$;

CREATE FUNCTION public.purama_shared_risk_observe(
  p_account_key TEXT, p_authority_id UUID, p_observation JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  a public.shared_account_risk_accounts%ROWTYPE;
  r public.shared_account_risk_reservations%ROWTYPE;
  v_now TIMESTAMPTZ; v_at TIMESTAMPTZ; v_day TIMESTAMPTZ;
  v_capital NUMERIC; v_opening NUMERIC; v_credit NUMERIC; v_loss NUMERIC;
  v_existing NUMERIC := 0; v_margin NUMERIC := 0; v_costs NUMERIC := 0;
  v_row JSONB; v_execution JSONB; v_execution_at TIMESTAMPTZ;
  v_collection TEXT; v_seen TEXT[] := '{}'; v_hash TEXT;
  v_position_violation BOOLEAN := false;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'SHARED_RISK_READ_COMMITTED_REQUIRED';
  END IF;
  SELECT * INTO a FROM public.shared_account_risk_accounts WHERE account_key = p_account_key FOR UPDATE;
  IF NOT FOUND OR a.authority_id IS DISTINCT FROM p_authority_id THEN
    RAISE EXCEPTION 'SHARED_RISK_ACCOUNT_BINDING_REQUIRED';
  END IF;
  -- A failed fresh observation must invalidate the former allowance. Catch
  -- validation errors locally so that this fail-closed update is committed.
  UPDATE public.shared_account_risk_accounts SET uncertain = true, revision = revision + 1
    WHERE account_key = p_account_key;
  BEGIN
    v_now := clock_timestamp();
    IF jsonb_typeof(p_observation) IS DISTINCT FROM 'object'
       OR p_observation->>'binding_hash' IS DISTINCT FROM a.binding_hash
       OR p_observation->>'currency' IS DISTINCT FROM a.currency
       OR p_observation->>'equity_basis' IS DISTINCT FROM 'RAW_BROKER_INCLUDING_CREDIT'
       OR p_observation->>'cashflow_basis' IS DISTINCT FROM 'EXCLUDING_PROMOTIONAL_CREDIT_MOVEMENTS'
       OR NOT COALESCE(p_observation @> '{"authenticated":true,"complete":true,"synchronized":true,"cashflows_verified":true,"all_writers_observed":true,"daily_reference_verified":true}', false) THEN
      RAISE EXCEPTION 'SHARED_RISK_OBSERVATION_REQUIRED';
    END IF;
    v_at := to_timestamp(public.purama_shared_risk_amount(p_observation->'at'));
    v_day := date_trunc('day', v_now AT TIME ZONE a.reset_timezone) AT TIME ZONE a.reset_timezone;
    IF v_at > v_now OR v_at < v_now - make_interval(secs => a.max_age_seconds)
       OR v_at < v_day OR (a.observed_at IS NOT NULL AND v_at < a.observed_at)
       OR public.purama_shared_risk_amount(p_observation->'day_start_at') <> extract(epoch FROM v_day) THEN
      RAISE EXCEPTION 'SHARED_RISK_STALE_OR_REGRESSIVE_OBSERVATION';
    END IF;
    v_hash := encode(sha256(convert_to(p_observation::TEXT, 'UTF8')), 'hex');
    IF v_at = a.observed_at AND v_hash IS DISTINCT FROM a.snapshot_hash THEN
      RAISE EXCEPTION 'SHARED_RISK_OBSERVATION_CONFLICT';
    END IF;
    v_credit := public.purama_shared_risk_amount(p_observation->'credit');
    v_capital := public.purama_shared_risk_amount(p_observation->'equity') - v_credit;
    v_opening := public.purama_shared_risk_amount(p_observation->'day_start_equity')
      - public.purama_shared_risk_amount(p_observation->'day_start_credit');
    IF v_capital <= 0 OR v_opening <= 0 THEN RAISE EXCEPTION 'SHARED_RISK_NON_POSITIVE_CAPITAL'; END IF;
    INSERT INTO public.shared_account_risk_days(account_key,day_start,opening_capital)
      VALUES (p_account_key, v_day, v_opening)
      ON CONFLICT DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM public.shared_account_risk_days WHERE account_key = p_account_key
        AND day_start = v_day AND opening_capital = v_opening) THEN
      RAISE EXCEPTION 'SHARED_RISK_DAY_REFERENCE_IMMUTABLE';
    END IF;
    -- Gains/deposits cannot enlarge the day's opening budget; credit is removed
    -- exactly once. Gross realized debits also prevent profitable trades from
    -- replenishing a spent daily loss allowance.
    UPDATE public.shared_account_risk_days SET realized_loss = greatest(realized_loss,
      public.purama_shared_risk_amount(p_observation->'realized_loss'))
      WHERE account_key = p_account_key AND day_start = v_day RETURNING realized_loss INTO v_loss;
    v_loss := greatest(v_loss, v_opening + public.purama_shared_risk_amount(p_observation->'net_cashflows', true) - v_capital);
    FOREACH v_collection IN ARRAY ARRAY['positions','orders'] LOOP
      IF jsonb_typeof(p_observation->v_collection) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'SHARED_RISK_COMPLETE_POSITIONS_AND_ORDERS_REQUIRED';
      END IF;
      FOR v_row IN SELECT value FROM jsonb_array_elements(p_observation->v_collection) LOOP
        IF jsonb_typeof(v_row) IS DISTINCT FROM 'object'
           OR NOT COALESCE(v_row->>'ticket_hash' ~ '^[a-f0-9]{64}$', false)
           OR v_row->>'ticket_hash' = ANY(v_seen)
           OR v_row->'verified' IS DISTINCT FROM 'true'::JSONB THEN
          RAISE EXCEPTION 'SHARED_RISK_UNKNOWN_OR_DUPLICATE_TICKET';
        END IF;
        v_seen := array_append(v_seen, v_row->>'ticket_hash');
        -- Both risk values already INCLUDE the full cost reserve (fees, swap,
        -- slippage/booked debits), as in JEV account_risk.position_risk.
        -- Add them once; reserve costs separately only against free margin.
        IF v_row->'risk_includes_costs' IS DISTINCT FROM 'true'::JSONB
           OR public.purama_shared_risk_amount(v_row->'remaining_risk') < public.purama_shared_risk_amount(v_row->'cost_reserve')
           OR public.purama_shared_risk_amount(v_row->'position_risk') < public.purama_shared_risk_amount(v_row->'cost_reserve') THEN
          RAISE EXCEPTION 'SHARED_RISK_COST_INCLUSIVE_BOUND_REQUIRED';
        END IF;
        v_existing := v_existing + public.purama_shared_risk_amount(v_row->'remaining_risk');
        v_costs := v_costs + public.purama_shared_risk_amount(v_row->'cost_reserve');
        v_position_violation := v_position_violation OR
          public.purama_shared_risk_amount(v_row->'position_risk') > v_capital * 0.01;
        v_margin := v_margin + public.purama_shared_risk_amount(v_row->'additional_margin');
      END LOOP;
    END LOOP;
    IF jsonb_typeof(p_observation->'reconciliations') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'SHARED_RISK_RECONCILIATIONS_REQUIRED';
    END IF;
    FOR v_row IN SELECT value FROM jsonb_array_elements(p_observation->'reconciliations') LOOP
      SELECT * INTO r FROM public.shared_account_risk_reservations
        WHERE account_key = p_account_key AND operation_id = (v_row->>'operation_id')::UUID FOR UPDATE;
      IF NOT FOUND OR r.intent_hash IS DISTINCT FROM v_row->>'intent_hash'
         OR NOT COALESCE(v_row->>'proof_hash' ~ '^[a-f0-9]{64}$', false)
         OR v_row->'verified' IS DISTINCT FROM 'true'::JSONB
         OR v_at < COALESCE(r.submitted_at, r.created_at)
         OR v_row->>'outcome' NOT IN ('ACCOUNTED_IN_SNAPSHOT','TERMINAL_CONFIRMED')
         OR v_row->>'outcome' IS NULL THEN
        RAISE EXCEPTION 'SHARED_RISK_RECONCILIATION_REQUIRED';
      END IF;
      -- A synchronized position snapshot cannot prove that a partially filled
      -- transmission has no executable remainder. Require the trusted physical
      -- observer's complete execution-history proof, tied to this submission.
      -- An active/pending remainder keeps the WHOLE reservation; no inferred
      -- expiry, absence-of-order inference or proportional release is allowed.
      v_execution := v_row->'execution_proof';
      IF jsonb_typeof(v_execution) IS DISTINCT FROM 'object'
         OR v_execution->>'operation_id' IS DISTINCT FROM r.operation_id::TEXT
         OR v_execution->>'intent_hash' IS DISTINCT FROM r.intent_hash
         OR jsonb_typeof(v_execution->'fencing') IS DISTINCT FROM 'string'
         OR v_execution->>'fencing' IS DISTINCT FROM r.fencing::TEXT
         OR NOT COALESCE(v_execution->>'broker_order_hash' ~ '^[a-f0-9]{64}$', false)
         OR v_execution->'fills_complete' IS DISTINCT FROM 'true'::JSONB
         OR v_execution->'remainder_terminal' IS DISTINCT FROM 'true'::JSONB
         OR r.submitted_at IS NULL
         OR v_execution->>'terminal_order_state' IS NULL
         OR v_execution->>'terminal_order_state' NOT IN ('FILLED','CANCELLED','EXPIRED','REJECTED')
         OR public.purama_shared_risk_amount(v_execution->'executable_remaining_quantity') <> 0 THEN
        RAISE EXCEPTION 'SHARED_RISK_COMPLETE_EXECUTION_PROOF_REQUIRED';
      END IF;
      v_execution_at := to_timestamp(public.purama_shared_risk_amount(v_execution->'observed_at'));
      IF v_execution_at < r.submitted_at OR v_execution_at > v_at THEN
        RAISE EXCEPTION 'SHARED_RISK_EXECUTION_PROOF_WINDOW_REQUIRED';
      END IF;
      IF v_row->>'outcome' = 'ACCOUNTED_IN_SNAPSHOT' AND (
        v_execution->>'terminal_order_state' = 'REJECTED'
        OR NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(p_observation->'positions') ticket
          WHERE ticket->>'operation_id' = r.operation_id::TEXT AND ticket->>'intent_hash' = r.intent_hash
            AND ticket->>'broker_order_hash' = v_execution->>'broker_order_hash'
        ) OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(p_observation->'positions') ticket
          WHERE (ticket->>'operation_id' = r.operation_id::TEXT OR ticket->>'intent_hash' = r.intent_hash
            OR ticket->>'broker_order_hash' = v_execution->>'broker_order_hash')
            AND (ticket->>'operation_id' IS DISTINCT FROM r.operation_id::TEXT
              OR ticket->>'intent_hash' IS DISTINCT FROM r.intent_hash
              OR ticket->>'broker_order_hash' IS DISTINCT FROM v_execution->>'broker_order_hash')
        ) OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(p_observation->'orders') ticket
          WHERE ticket->>'operation_id' = r.operation_id::TEXT OR ticket->>'intent_hash' = r.intent_hash
            OR ticket->>'broker_order_hash' = v_execution->>'broker_order_hash'
        )
      ) THEN RAISE EXCEPTION 'SHARED_RISK_ACCOUNTED_FINAL_FILLS_REQUIRED'; END IF;
      IF v_row->>'outcome' = 'TERMINAL_CONFIRMED' AND (
        v_row->'terminal' IS DISTINCT FROM 'true'::JSONB
        OR v_execution->'all_fills_closed' IS DISTINCT FROM 'true'::JSONB OR EXISTS (
          SELECT 1 FROM jsonb_array_elements((p_observation->'positions') || (p_observation->'orders')) ticket
          WHERE ticket->>'operation_id' = r.operation_id::TEXT OR ticket->>'intent_hash' = r.intent_hash
            OR ticket->>'broker_order_hash' = v_execution->>'broker_order_hash'
        )
      ) THEN RAISE EXCEPTION 'SHARED_RISK_TERMINAL_PROOF_REQUIRED'; END IF;
      IF r.state = 'RELEASED' AND (r.reconciliation_hash IS DISTINCT FROM v_row->>'proof_hash'
          OR r.release_kind IS DISTINCT FROM v_row->>'outcome') THEN
        RAISE EXCEPTION 'SHARED_RISK_RECONCILIATION_CONFLICT';
      END IF;
      UPDATE public.shared_account_risk_reservations SET state = 'RELEASED',
        reconciliation_hash = v_row->>'proof_hash', release_kind = v_row->>'outcome'
        WHERE operation_id = r.operation_id;
    END LOOP;
    UPDATE public.shared_account_risk_accounts SET uncertain = false, observed_at = v_at,
      snapshot_hash = v_hash, day_start = v_day, capital = v_capital, opening_capital = v_opening,
      daily_loss = v_loss, existing_risk = v_existing,
      available_margin = greatest(0, public.purama_shared_risk_amount(p_observation->'free_margin') - v_credit - v_margin - v_costs),
      existing_position_violation = v_position_violation WHERE account_key = p_account_key;
    RETURN jsonb_build_object('status','OBSERVED','snapshot_hash',v_hash,
      'account_key',p_account_key,'authority_id',p_authority_id,'execution_authority',false,'live_release','LOCKED');
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status','BLOCKED','reason','SHARED_RISK_OBSERVATION_INVALID',
      'account_key',p_account_key,'authority_id',p_authority_id,'execution_authority',false,'live_release','LOCKED');
  END;
END;
$$;

CREATE FUNCTION public.purama_shared_risk_reserve(
  p_account_key TEXT, p_authority_id UUID, p_writer TEXT, p_request JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  a public.shared_account_risk_accounts%ROWTYPE;
  r public.shared_account_risk_reservations%ROWTYPE;
  v_operation UUID; v_loss NUMERIC; v_margin NUMERIC; v_reserved_loss NUMERIC;
  v_reserved_margin NUMERIC; v_now TIMESTAMPTZ;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'SHARED_RISK_READ_COMMITTED_REQUIRED';
  END IF;
  SELECT * INTO a FROM public.shared_account_risk_accounts WHERE account_key = p_account_key FOR UPDATE;
  IF NOT FOUND OR a.authority_id IS DISTINCT FROM p_authority_id
     OR p_writer IS NULL OR NOT p_writer = ANY(a.writers)
     OR cardinality(a.writers) <> 2 OR NOT a.writers @> ARRAY['jev','midas']
     OR NOT a.writers <@ ARRAY['jev','midas'] THEN
    RAISE EXCEPTION 'SHARED_RISK_ACCOUNT_BINDING_REQUIRED';
  END IF;
  v_operation := (p_request->>'operation_id')::UUID;
  IF v_operation IS NULL OR jsonb_typeof(p_request) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'SHARED_RISK_REQUEST_REQUIRED';
  END IF;
  SELECT * INTO r FROM public.shared_account_risk_reservations WHERE operation_id = v_operation;
  IF FOUND THEN
    IF r.account_key IS DISTINCT FROM p_account_key OR r.writer IS DISTINCT FROM p_writer
       OR r.request IS DISTINCT FROM p_request THEN RAISE EXCEPTION 'SHARED_RISK_IDEMPOTENCY_CONFLICT'; END IF;
    RETURN public.purama_shared_risk_receipt(v_operation, false);
  END IF;
  v_now := clock_timestamp();
  IF NOT a.admission_enabled OR a.uncertain OR a.observed_at IS NULL
     OR a.observed_at > v_now OR a.observed_at < v_now - make_interval(secs => a.max_age_seconds)
     OR a.day_start <> (date_trunc('day',v_now AT TIME ZONE a.reset_timezone) AT TIME ZONE a.reset_timezone)
     OR p_request->>'snapshot_hash' IS DISTINCT FROM a.snapshot_hash
     OR p_request->>'currency' IS DISTINCT FROM a.currency THEN
    RAISE EXCEPTION 'SHARED_RISK_AUTHORITY_LOCKED_OR_STALE';
  END IF;
  IF EXISTS (SELECT 1 FROM public.shared_account_risk_reservations WHERE account_key = p_account_key
      AND state IN ('SUBMITTING','UNKNOWN')) THEN RAISE EXCEPTION 'SHARED_RISK_UNCERTAIN_ACCOUNT'; END IF;
  IF NOT COALESCE(p_request->>'intent_hash' ~ '^[a-f0-9]{64}$', false)
     OR NOT COALESCE(p_request->>'costs_hash' ~ '^[a-f0-9]{64}$', false) THEN
    RAISE EXCEPTION 'SHARED_RISK_EVIDENCE_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.shared_account_risk_reservations WHERE account_key = p_account_key
      AND intent_hash = p_request->>'intent_hash') THEN RAISE EXCEPTION 'SHARED_RISK_INTENT_ALREADY_CLAIMED'; END IF;
  v_loss := public.purama_shared_risk_amount(p_request->'loss');
  v_margin := public.purama_shared_risk_amount(p_request->'margin');
  IF v_loss <= 0 OR v_loss > a.capital * 0.01 OR a.existing_position_violation THEN
    RAISE EXCEPTION 'SHARED_RISK_POSITION_LIMIT';
  END IF;
  SELECT COALESCE(sum(loss),0), COALESCE(sum(margin),0) INTO v_reserved_loss,v_reserved_margin
    FROM public.shared_account_risk_reservations WHERE account_key = p_account_key AND state <> 'RELEASED';
  IF a.daily_loss + a.existing_risk + v_reserved_loss + v_loss > least(a.capital,a.opening_capital) * 0.01 THEN
    RAISE EXCEPTION 'SHARED_RISK_DAILY_LIMIT';
  END IF;
  IF v_reserved_margin + v_margin > a.available_margin THEN RAISE EXCEPTION 'SHARED_RISK_MARGIN_LIMIT'; END IF;
  INSERT INTO public.shared_account_risk_reservations(operation_id,account_key,intent_hash,writer,request,loss,margin)
    VALUES (v_operation,p_account_key,p_request->>'intent_hash',p_writer,p_request,v_loss,v_margin);
  RETURN public.purama_shared_risk_receipt(v_operation, true);
END;
$$;

CREATE FUNCTION public.purama_shared_risk_transition(
  p_account_key TEXT, p_authority_id UUID, p_writer TEXT,
  p_operation_id UUID, p_fencing BIGINT, p_target TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.shared_account_risk_accounts%ROWTYPE; r public.shared_account_risk_reservations%ROWTYPE;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'SHARED_RISK_READ_COMMITTED_REQUIRED';
  END IF;
  SELECT * INTO a FROM public.shared_account_risk_accounts WHERE account_key = p_account_key FOR UPDATE;
  IF NOT FOUND OR a.authority_id IS DISTINCT FROM p_authority_id
     OR p_writer IS NULL OR NOT p_writer = ANY(a.writers)
     OR cardinality(a.writers) <> 2 OR NOT a.writers @> ARRAY['jev','midas']
     OR NOT a.writers <@ ARRAY['jev','midas'] THEN
    RAISE EXCEPTION 'SHARED_RISK_ACCOUNT_BINDING_REQUIRED';
  END IF;
  SELECT * INTO r FROM public.shared_account_risk_reservations WHERE operation_id = p_operation_id FOR UPDATE;
  IF NOT FOUND OR r.account_key IS DISTINCT FROM p_account_key OR r.writer IS DISTINCT FROM p_writer
     OR r.fencing IS DISTINCT FROM p_fencing THEN RAISE EXCEPTION 'SHARED_RISK_FENCE_LOST'; END IF;
  IF p_target IS NULL OR p_target NOT IN ('SUBMITTING','UNKNOWN','CANCELLED_UNSENT') THEN
    RAISE EXCEPTION 'SHARED_RISK_TRANSITION_INVALID';
  END IF;
  IF r.state = p_target OR (r.state = 'RELEASED' AND r.release_kind = 'CANCELLED_UNSENT'
      AND p_target = 'CANCELLED_UNSENT') THEN
    -- A repeated SUBMITTING is NOT a second dispatch authorization.
    RETURN public.purama_shared_risk_receipt(p_operation_id, false);
  END IF;
  IF (p_target = 'SUBMITTING' AND r.state <> 'RESERVED')
     OR (p_target = 'UNKNOWN' AND r.state <> 'SUBMITTING')
     OR (p_target = 'CANCELLED_UNSENT' AND r.state <> 'RESERVED') THEN
    RAISE EXCEPTION 'SHARED_RISK_TRANSITION_INVALID';
  END IF;
  IF p_target = 'SUBMITTING' THEN
    -- Refresh admission under the same account lock immediately before dispatch.
    IF NOT a.admission_enabled OR a.uncertain OR a.observed_at IS NULL
       OR a.observed_at < clock_timestamp() - make_interval(secs => a.max_age_seconds)
       OR r.request->>'snapshot_hash' IS DISTINCT FROM a.snapshot_hash
       OR r.created_at < clock_timestamp() - make_interval(secs => a.max_age_seconds)
       OR a.day_start <> (date_trunc('day',clock_timestamp() AT TIME ZONE a.reset_timezone) AT TIME ZONE a.reset_timezone)
       OR a.existing_position_violation
       OR EXISTS (SELECT 1 FROM public.shared_account_risk_reservations WHERE account_key = p_account_key AND state IN ('SUBMITTING','UNKNOWN'))
       OR a.daily_loss + a.existing_risk + (SELECT COALESCE(sum(loss),0) FROM public.shared_account_risk_reservations WHERE account_key = p_account_key AND state <> 'RELEASED') > least(a.capital,a.opening_capital) * 0.01
       OR (SELECT COALESCE(sum(margin),0) FROM public.shared_account_risk_reservations WHERE account_key = p_account_key AND state <> 'RELEASED') > a.available_margin
       OR r.loss > a.capital * 0.01 THEN
      RAISE EXCEPTION 'SHARED_RISK_REVALIDATION_REQUIRED';
    END IF;
  END IF;
  UPDATE public.shared_account_risk_reservations SET
    state = CASE WHEN p_target = 'CANCELLED_UNSENT' THEN 'RELEASED' ELSE p_target END,
    submitted_at = CASE WHEN p_target = 'SUBMITTING' THEN clock_timestamp() ELSE submitted_at END,
    release_kind = CASE WHEN p_target = 'CANCELLED_UNSENT' THEN p_target ELSE release_kind END
    WHERE operation_id = p_operation_id;
  RETURN public.purama_shared_risk_receipt(p_operation_id, true);
END;
$$;

REVOKE ALL ON FUNCTION public.purama_shared_risk_amount(JSONB,BOOLEAN),
  public.purama_shared_risk_receipt(UUID,BOOLEAN),
  public.purama_shared_risk_observe(TEXT,UUID,JSONB),
  public.purama_shared_risk_reserve(TEXT,UUID,TEXT,JSONB),
  public.purama_shared_risk_transition(TEXT,UUID,TEXT,UUID,BIGINT,TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purama_shared_risk_observe(TEXT,UUID,JSONB),
  public.purama_shared_risk_reserve(TEXT,UUID,TEXT,JSONB),
  public.purama_shared_risk_transition(TEXT,UUID,TEXT,UUID,BIGINT,TEXT) TO service_role;
COMMIT;

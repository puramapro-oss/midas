-- Reuse the existing Connect journal and both existing wallet models.
-- This migration does not enable cash or rewrite ambiguous historical balances.
BEGIN;

ALTER TABLE public.connect_withdrawals
  ADD COLUMN IF NOT EXISTS request_key uuid,
  ADD COLUMN IF NOT EXISTS requested_amount_eur numeric(12,2),
  ADD COLUMN IF NOT EXISTS ledger_version smallint,
  ADD COLUMN IF NOT EXISTS credited_reversal_eur numeric(12,2),
  ADD COLUMN IF NOT EXISTS provider_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admission_rejection text;

CREATE UNIQUE INDEX IF NOT EXISTS connect_withdrawals_user_request_key
  ON public.connect_withdrawals (user_id, request_key) WHERE request_key IS NOT NULL;

-- Old handlers must not write beside the new admission/receipt transaction.
-- The new SECURITY DEFINER functions retain owner access; service clients read
-- the journal and mutate it only through the checked RPCs below.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.connect_withdrawals FROM PUBLIC, anon, authenticated, service_role;
DO $$
BEGIN
  IF to_regprocedure('public.debit_wallet_for_withdrawal(uuid,numeric)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.debit_wallet_for_withdrawal(uuid,numeric) FROM PUBLIC, anon, authenticated, service_role;
  END IF;
  IF to_regprocedure('public.credit_wallet_on_withdrawal_failure(uuid,numeric)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.credit_wallet_on_withdrawal_failure(uuid,numeric) FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END;
$$;

ALTER TABLE midas.withdrawal_requests
  ADD COLUMN IF NOT EXISTS refund_credited_at timestamptz,
  ADD COLUMN IF NOT EXISTS admission_rejection text;

-- Clients must not fabricate a request, debit proof or refund marker. The
-- admission and decision functions are the only withdrawal request writers.
DROP POLICY IF EXISTS withdrawal_insert ON midas.withdrawal_requests;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON midas.withdrawal_requests FROM PUBLIC, anon, authenticated, service_role;
-- RLS does not guard TRUNCATE; the original GRANT ALL must not let API roles
-- erase or attach triggers to the ledger that proves a debit or refund.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON midas.wallet_transactions FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.connect_withdrawal_receipt(
  p_row public.connect_withdrawals, p_balance numeric, p_applied boolean, p_credited numeric DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, public, midas, pg_temp
AS $$
BEGIN
  IF p_row.admission_rejection IS NOT NULL AND (
      p_row.admission_rejection NOT IN ('withdrawal_cap_exceeded','insufficient_balance')
      OR p_row.status IS DISTINCT FROM 'failed' OR p_row.ledger_version IS DISTINCT FROM 1
      OR p_row.stripe_transfer_id IS NOT NULL OR p_row.provider_confirmed_at IS NOT NULL
      OR p_row.credited_reversal_eur IS DISTINCT FROM 0 OR p_credited<>0) THEN
    RAISE EXCEPTION 'withdrawal_reconciliation_required';
  END IF;
  RETURN jsonb_build_object(
    'id', p_row.id, 'user_id', p_row.user_id, 'request_key', p_row.request_key,
    'ledger_version', p_row.ledger_version, 'amount_eur', p_row.amount_eur::text,
    'stripe_account_id', p_row.stripe_account_id, 'currency', p_row.currency,
    'status', p_row.status, 'stripe_transfer_id', p_row.stripe_transfer_id,
    'provider_confirmed', p_row.provider_confirmed_at IS NOT NULL,
    'credited_reversal_eur', p_row.credited_reversal_eur::text,
    'credited_eur', p_credited::text, 'wallet_balance', p_balance::text, 'applied', p_applied,
    'admission_rejection', p_row.admission_rejection, 'rejection_recorded', p_row.admission_rejection IS NOT NULL,
    'debit_confirmed', p_row.admission_rejection IS NULL AND p_row.ledger_version=1,
    'refunded', p_credited>0
  );
END;
$$;
REVOKE ALL ON FUNCTION public.connect_withdrawal_receipt(public.connect_withdrawals,numeric,boolean,numeric)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admit_connect_withdrawal(
  p_user_id uuid, p_request_key uuid, p_amount numeric, p_destination text, p_cap numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, midas, pg_temp
AS $$
DECLARE
  v_balance numeric;
  v_amount numeric;
  v_expected_balance numeric;
  v_row public.connect_withdrawals;
  v_rejection text;
BEGIN
  IF p_user_id IS NULL OR p_request_key IS NULL OR p_destination IS NULL
      OR p_destination !~ '^acct_[A-Za-z0-9]+$' OR p_cap IS NULL
      OR p_cap::text IN ('NaN','Infinity','-Infinity') OR p_cap < 0
      OR (p_amount IS NOT NULL AND (p_amount::text IN ('NaN','Infinity','-Infinity')
          OR p_amount < 20 OR p_amount > 100000 OR p_amount <> round(p_amount,2))) THEN
    RAISE EXCEPTION 'withdrawal_invalid_request';
  END IF;

  -- Every Connect mutation takes the profile lock first, then its journal row.
  SELECT wallet_balance INTO v_balance FROM midas.profiles
    WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance::text IN ('NaN','Infinity','-Infinity') OR v_balance < 0 THEN
    RAISE EXCEPTION 'withdrawal_balance_unavailable';
  END IF;

  SELECT * INTO v_row FROM public.connect_withdrawals
    WHERE user_id = p_user_id AND request_key = p_request_key FOR UPDATE;
  IF FOUND THEN
    IF v_row.ledger_version IS DISTINCT FROM 1 OR v_row.credited_reversal_eur IS NULL THEN
      RAISE EXCEPTION 'withdrawal_reconciliation_required';
    END IF;
    IF v_row.requested_amount_eur IS DISTINCT FROM p_amount OR v_row.stripe_account_id <> p_destination THEN
      RAISE EXCEPTION 'withdrawal_idempotency_conflict';
    END IF;
    RETURN public.connect_withdrawal_receipt(v_row,v_balance,false);
  END IF;
  IF EXISTS (SELECT 1 FROM public.connect_withdrawals WHERE user_id=p_user_id
      AND status='pending' AND stripe_transfer_id IS NULL) THEN
    RAISE EXCEPTION 'withdrawal_reconciliation_required';
  END IF;

  v_amount := COALESCE(p_amount,v_balance);
  IF v_amount < 20 OR v_amount > 100000 OR v_amount <> round(v_amount,2) THEN
    RAISE EXCEPTION 'withdrawal_invalid_amount';
  END IF;
  IF v_amount > p_cap THEN v_rejection := 'withdrawal_cap_exceeded';
  ELSIF v_amount > v_balance THEN v_rejection := 'insufficient_balance'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.connect_accounts WHERE user_id=p_user_id
      AND stripe_account_id=p_destination AND payouts_enabled=true AND kyc_verified_at IS NOT NULL) THEN
    RAISE EXCEPTION 'withdrawal_account_unavailable';
  END IF;

  INSERT INTO public.connect_withdrawals
    (user_id,stripe_account_id,amount_eur,currency,status,request_key,requested_amount_eur,ledger_version,credited_reversal_eur,admission_rejection)
    VALUES (p_user_id,p_destination,v_amount,'eur',CASE WHEN v_rejection IS NULL THEN 'pending' ELSE 'failed' END,p_request_key,p_amount,1,0,v_rejection)
    RETURNING * INTO v_row;
  IF NOT FOUND OR v_row.id IS NULL OR v_row.user_id IS DISTINCT FROM p_user_id
      OR v_row.request_key IS DISTINCT FROM p_request_key OR v_row.amount_eur IS DISTINCT FROM v_amount
      OR v_row.requested_amount_eur IS DISTINCT FROM p_amount OR v_row.stripe_account_id IS DISTINCT FROM p_destination
      OR v_row.ledger_version IS DISTINCT FROM 1 OR v_row.credited_reversal_eur IS DISTINCT FROM 0
      OR v_row.status IS DISTINCT FROM (CASE WHEN v_rejection IS NULL THEN 'pending' ELSE 'failed' END)
      OR v_row.admission_rejection IS DISTINCT FROM v_rejection OR v_row.currency IS DISTINCT FROM 'eur'
      OR v_row.stripe_transfer_id IS NOT NULL OR v_row.provider_confirmed_at IS NOT NULL THEN
    RAISE EXCEPTION 'withdrawal_journal_unconfirmed';
  END IF;
  -- The refused key is durable before it may be closed in the browser. A late
  -- original POST must replay this refusal even if funds or caps later change.
  IF v_rejection IS NOT NULL THEN RETURN public.connect_withdrawal_receipt(v_row,v_balance,true); END IF;
  v_expected_balance := v_balance-v_amount;
  UPDATE midas.profiles SET wallet_balance=wallet_balance-v_amount,updated_at=now()
    WHERE id=p_user_id RETURNING wallet_balance INTO v_balance;
  IF NOT FOUND OR v_balance IS DISTINCT FROM v_expected_balance THEN
    RAISE EXCEPTION 'withdrawal_debit_unconfirmed';
  END IF;
  RETURN public.connect_withdrawal_receipt(v_row,v_balance,true);
END;
$$;
REVOKE ALL ON FUNCTION public.admit_connect_withdrawal(uuid,uuid,numeric,text,numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admit_connect_withdrawal(uuid,uuid,numeric,text,numeric) TO service_role;

-- A synchronous Stripe receipt and signed transfer webhooks use the same
-- transaction. Older events cannot decrease the cumulative reversed amount.
CREATE OR REPLACE FUNCTION public.reconcile_connect_withdrawal(
  p_user_id uuid, p_withdrawal_id uuid, p_transfer_id text, p_destination text,
  p_amount numeric, p_currency text, p_reversed_amount numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, midas, pg_temp
AS $$
DECLARE
  v_balance numeric;
  v_delta numeric;
  v_total numeric;
  v_row public.connect_withdrawals;
  v_expected_balance numeric;
  v_request_key uuid;
BEGIN
  IF p_user_id IS NULL OR p_withdrawal_id IS NULL OR p_transfer_id IS NULL
      OR p_transfer_id !~ '^tr_[A-Za-z0-9]+$' OR p_destination IS NULL
      OR p_destination !~ '^acct_[A-Za-z0-9]+$' OR p_currency IS DISTINCT FROM 'eur'
      OR p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity')
      OR p_amount < 20 OR p_amount > 100000 OR p_amount <> round(p_amount,2)
      OR p_reversed_amount IS NULL OR p_reversed_amount::text IN ('NaN','Infinity','-Infinity')
      OR p_reversed_amount < 0 OR p_reversed_amount > p_amount
      OR p_reversed_amount <> round(p_reversed_amount,2) THEN
    RAISE EXCEPTION 'withdrawal_receipt_invalid';
  END IF;
  SELECT wallet_balance INTO v_balance FROM midas.profiles WHERE id=p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance::text IN ('NaN','Infinity','-Infinity') OR v_balance < 0 THEN
    RAISE EXCEPTION 'withdrawal_balance_unavailable';
  END IF;
  SELECT * INTO v_row FROM public.connect_withdrawals WHERE id=p_withdrawal_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND OR v_row.ledger_version IS DISTINCT FROM 1 OR v_row.credited_reversal_eur IS NULL
      OR v_row.admission_rejection IS NOT NULL THEN
    RAISE EXCEPTION 'withdrawal_reconciliation_required';
  END IF;
  IF v_row.amount_eur <> p_amount OR v_row.stripe_account_id <> p_destination OR v_row.currency <> p_currency
      OR (v_row.stripe_transfer_id IS NOT NULL AND v_row.stripe_transfer_id <> p_transfer_id)
      OR v_row.status NOT IN ('pending','reversed')
      OR v_row.credited_reversal_eur < 0 OR v_row.credited_reversal_eur > v_row.amount_eur THEN
    RAISE EXCEPTION 'withdrawal_receipt_mismatch';
  END IF;
  v_total := greatest(v_row.credited_reversal_eur,p_reversed_amount);
  v_delta := v_total-v_row.credited_reversal_eur;
  v_expected_balance := v_balance+v_delta;
  v_request_key := v_row.request_key;
  IF v_delta > 0 THEN
    UPDATE midas.profiles SET wallet_balance=wallet_balance+v_delta,updated_at=now()
      WHERE id=p_user_id RETURNING wallet_balance INTO v_balance;
    IF NOT FOUND OR v_balance IS DISTINCT FROM v_expected_balance THEN
      RAISE EXCEPTION 'withdrawal_credit_unconfirmed';
    END IF;
  END IF;
  UPDATE public.connect_withdrawals SET stripe_transfer_id=p_transfer_id,
    provider_confirmed_at=COALESCE(provider_confirmed_at,now()),
    credited_reversal_eur=v_total,
    status=CASE WHEN v_total=amount_eur THEN 'reversed' ELSE 'pending' END,
    completed_at=CASE WHEN v_total=amount_eur THEN COALESCE(completed_at,now()) ELSE completed_at END,
    error=CASE WHEN v_total=amount_eur THEN 'transfer_reversed_by_stripe' ELSE NULL END
    WHERE id=v_row.id RETURNING * INTO v_row;
  IF NOT FOUND OR v_row.id IS DISTINCT FROM p_withdrawal_id OR v_row.user_id IS DISTINCT FROM p_user_id
      OR v_row.request_key IS DISTINCT FROM v_request_key OR v_row.amount_eur IS DISTINCT FROM p_amount
      OR v_row.stripe_account_id IS DISTINCT FROM p_destination OR v_row.currency IS DISTINCT FROM 'eur'
      OR v_row.stripe_transfer_id IS DISTINCT FROM p_transfer_id OR v_row.provider_confirmed_at IS NULL
      OR v_row.credited_reversal_eur IS DISTINCT FROM v_total
      OR v_row.status IS DISTINCT FROM (CASE WHEN v_total=p_amount THEN 'reversed' ELSE 'pending' END) THEN
    RAISE EXCEPTION 'withdrawal_receipt_unconfirmed';
  END IF;
  RETURN public.connect_withdrawal_receipt(v_row,v_balance,v_delta>0,v_delta);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_connect_withdrawal(uuid,uuid,text,text,numeric,text,numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_connect_withdrawal(uuid,uuid,text,text,numeric,text,numeric) TO service_role;

-- Legacy IBAN requests use midas.wallets, not the Connect profile balance.
-- A historical request without a linked debit must be reconciled explicitly.
CREATE OR REPLACE FUNCTION midas.wallet_withdrawal_receipt(
  p_row midas.withdrawal_requests, p_balance numeric, p_applied boolean
) RETURNS jsonb LANGUAGE plpgsql
SET search_path = pg_catalog, midas, public, pg_temp
AS $$
DECLARE
  v_debit_count bigint;
  v_debit_amount numeric;
  v_credit_count bigint;
  v_credit_amount numeric;
BEGIN
  IF p_row.id IS NULL OR p_row.user_id IS NULL OR p_row.amount IS NULL
      OR p_row.amount::text IN ('NaN','Infinity','-Infinity') OR p_row.amount < 5
      OR p_row.status IS NULL OR p_row.status NOT IN ('pending','processed','rejected')
      OR p_balance IS NULL OR p_balance::text IN ('NaN','Infinity','-Infinity') OR p_balance < 0 THEN
    RAISE EXCEPTION 'withdrawal_reconciliation_required';
  END IF;
  IF p_row.admission_rejection IS NOT NULL THEN
    IF p_row.admission_rejection NOT IN ('withdrawal_pending','withdrawal_locked_30d','insufficient_balance')
        OR p_row.status IS DISTINCT FROM 'rejected' OR p_row.refund_credited_at IS NOT NULL
        OR EXISTS (SELECT 1 FROM midas.wallet_transactions WHERE reference_id=p_row.id) THEN
      RAISE EXCEPTION 'withdrawal_reconciliation_required';
    END IF;
    RETURN jsonb_build_object('id',p_row.id,'user_id',p_row.user_id,'amount',p_row.amount::text,
      'iban',p_row.iban,'status',p_row.status,'applied',p_applied,'debit_confirmed',false,
      'refunded',false,'wallet_balance',p_balance::text,'rejection_recorded',true,
      'admission_rejection',p_row.admission_rejection);
  END IF;
  SELECT count(*),sum(amount) INTO v_debit_count,v_debit_amount FROM midas.wallet_transactions
    WHERE user_id=p_row.user_id AND reference_id=p_row.id AND type='debit' AND source='withdrawal';
  IF v_debit_count <> 1 OR v_debit_amount IS DISTINCT FROM p_row.amount THEN
    RAISE EXCEPTION 'withdrawal_debit_proof_required';
  END IF;
  SELECT count(*),sum(amount) INTO v_credit_count,v_credit_amount FROM midas.wallet_transactions
    WHERE user_id=p_row.user_id AND reference_id=p_row.id AND type='credit';
  IF (p_row.status='rejected' AND (p_row.refund_credited_at IS NULL OR v_credit_count<>1
      OR v_credit_amount IS DISTINCT FROM p_row.amount))
      OR (p_row.status<>'rejected' AND (p_row.refund_credited_at IS NOT NULL OR v_credit_count<>0)) THEN
    RAISE EXCEPTION 'withdrawal_reconciliation_required';
  END IF;
  RETURN jsonb_build_object('id',p_row.id,'user_id',p_row.user_id,'amount',p_row.amount::text,
    'iban',p_row.iban,'status',p_row.status,'applied',p_applied,'debit_confirmed',true,
    'refunded',p_row.refund_credited_at IS NOT NULL,'wallet_balance',p_balance::text,
    'rejection_recorded',false,'admission_rejection',NULL);
END;
$$;
REVOKE ALL ON FUNCTION midas.wallet_withdrawal_receipt(midas.withdrawal_requests,numeric,boolean)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION midas.admit_wallet_withdrawal(
  p_user_id uuid, p_request_id uuid, p_amount numeric DEFAULT NULL, p_iban text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, midas, public, pg_temp
AS $$
DECLARE
  v_balance numeric;
  v_expected_balance numeric;
  v_row midas.withdrawal_requests;
  v_debit_id uuid;
  v_subscription_started_at timestamptz;
  v_rejection text;
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL OR (p_amount IS NULL) <> (p_iban IS NULL)
      OR (p_amount IS NOT NULL AND (p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<5
          OR p_amount>9999999999.99 OR p_amount<>round(p_amount,2)))
      OR (p_iban IS NOT NULL AND p_iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$') THEN
    RAISE EXCEPTION 'withdrawal_invalid_request';
  END IF;
  -- Same order as an admin decision: wallet, then withdrawal request.
  SELECT balance INTO v_balance FROM midas.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND OR v_balance IS NULL OR v_balance::text IN ('NaN','Infinity','-Infinity') OR v_balance<0 THEN
    RAISE EXCEPTION 'withdrawal_balance_unavailable';
  END IF;
  SELECT * INTO v_row FROM midas.withdrawal_requests WHERE id=p_request_id FOR UPDATE;
  IF FOUND THEN
    IF v_row.user_id IS DISTINCT FROM p_user_id
        OR (p_amount IS NOT NULL AND (v_row.amount IS DISTINCT FROM p_amount OR v_row.iban IS DISTINCT FROM p_iban)) THEN
      RAISE EXCEPTION 'withdrawal_idempotency_conflict';
    END IF;
    RETURN midas.wallet_withdrawal_receipt(v_row,v_balance,false);
  END IF;
  -- A key-only retry can read an existing admission, never create a new one.
  IF p_amount IS NULL OR p_iban IS NULL THEN RAISE EXCEPTION 'withdrawal_request_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM midas.withdrawal_requests WHERE user_id=p_user_id AND status='pending') THEN
    v_rejection := 'withdrawal_pending';
  END IF;
  SELECT subscription_started_at INTO v_subscription_started_at FROM midas.profiles WHERE id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'withdrawal_profile_unavailable'; END IF;
  IF v_rejection IS NULL AND v_subscription_started_at IS NOT NULL AND v_subscription_started_at+interval '720 hours'>now() THEN
    v_rejection := 'withdrawal_locked_30d';
  END IF;
  IF v_rejection IS NULL AND p_amount>v_balance THEN v_rejection := 'insufficient_balance'; END IF;

  INSERT INTO midas.withdrawal_requests(id,user_id,amount,iban,status,admission_rejection)
    VALUES(p_request_id,p_user_id,p_amount,p_iban,CASE WHEN v_rejection IS NULL THEN 'pending' ELSE 'rejected' END,v_rejection)
    RETURNING * INTO v_row;
  IF NOT FOUND OR v_row.id IS DISTINCT FROM p_request_id OR v_row.user_id IS DISTINCT FROM p_user_id
      OR v_row.amount IS DISTINCT FROM p_amount OR v_row.iban IS DISTINCT FROM p_iban
      OR v_row.status IS DISTINCT FROM (CASE WHEN v_rejection IS NULL THEN 'pending' ELSE 'rejected' END)
      OR v_row.admission_rejection IS DISTINCT FROM v_rejection OR v_row.refund_credited_at IS NOT NULL
      OR v_row.processed_at IS NOT NULL THEN
    RAISE EXCEPTION 'withdrawal_journal_unconfirmed';
  END IF;
  IF v_rejection IS NOT NULL THEN RETURN midas.wallet_withdrawal_receipt(v_row,v_balance,true); END IF;
  v_expected_balance := v_balance-p_amount;
  UPDATE midas.wallets SET balance=balance-p_amount,updated_at=now() WHERE user_id=p_user_id
    RETURNING balance INTO v_balance;
  IF NOT FOUND OR v_balance IS DISTINCT FROM v_expected_balance THEN
    RAISE EXCEPTION 'withdrawal_debit_unconfirmed';
  END IF;
  INSERT INTO midas.wallet_transactions(user_id,type,amount,source,description,reference_id)
    VALUES(p_user_id,'debit',p_amount,'withdrawal','Retrait vers '||left(p_iban,4)||'****'||right(p_iban,4),p_request_id)
    RETURNING id INTO v_debit_id;
  IF NOT FOUND OR v_debit_id IS NULL OR NOT EXISTS (SELECT 1 FROM midas.wallet_transactions
      WHERE id=v_debit_id AND user_id=p_user_id AND type='debit' AND amount=p_amount
        AND source='withdrawal' AND reference_id=p_request_id) THEN
    RAISE EXCEPTION 'withdrawal_debit_journal_unconfirmed';
  END IF;
  RETURN midas.wallet_withdrawal_receipt(v_row,v_balance,true);
END;
$$;
REVOKE ALL ON FUNCTION midas.admit_wallet_withdrawal(uuid,uuid,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION midas.admit_wallet_withdrawal(uuid,uuid,numeric,text) TO service_role;

CREATE OR REPLACE FUNCTION midas.decide_wallet_withdrawal(
  p_admin_user_id uuid, p_withdrawal_id uuid, p_action text, p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, midas, public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_row midas.withdrawal_requests;
  v_expected_balance numeric;
  v_credit_id uuid;
BEGIN
  IF p_admin_user_id IS NULL OR p_withdrawal_id IS NULL OR p_action IS NULL
      OR p_action NOT IN ('processed','rejected') OR length(p_note)>2000 THEN
    RAISE EXCEPTION 'withdrawal_invalid_request';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM midas.profiles p JOIN auth.users u ON u.id=p.id
      WHERE p.id=p_admin_user_id AND p.role='super_admin' AND u.email='matiss.frasne@gmail.com') THEN
    RAISE EXCEPTION 'withdrawal_admin_required';
  END IF;
  SELECT user_id INTO v_user_id FROM midas.withdrawal_requests WHERE id=p_withdrawal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'withdrawal_not_found'; END IF;
  SELECT balance INTO v_balance FROM midas.wallets WHERE user_id=v_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance::text IN ('NaN','Infinity','-Infinity') OR v_balance<0 THEN
    RAISE EXCEPTION 'withdrawal_balance_unavailable';
  END IF;
  SELECT * INTO v_row FROM midas.withdrawal_requests WHERE id=p_withdrawal_id FOR UPDATE;
  IF NOT FOUND OR v_row.user_id <> v_user_id OR v_row.amount::text IN ('NaN','Infinity','-Infinity')
      OR v_row.amount<5 THEN RAISE EXCEPTION 'withdrawal_reconciliation_required'; END IF;
  IF v_row.admission_rejection IS NOT NULL THEN RAISE EXCEPTION 'withdrawal_not_admitted'; END IF;
  -- Admission and decision share the same persisted debit/refund proof.
  PERFORM midas.wallet_withdrawal_receipt(v_row,v_balance,false);
  IF v_row.status=p_action THEN
    RETURN midas.wallet_withdrawal_receipt(v_row,v_balance,false);
  END IF;
  IF v_row.status IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'withdrawal_decision_conflict'; END IF;
  IF p_action='rejected' THEN
    v_expected_balance := v_balance+v_row.amount;
    UPDATE midas.wallets SET balance=balance+v_row.amount,updated_at=now()
      WHERE user_id=v_user_id RETURNING balance INTO v_balance;
    IF NOT FOUND OR v_balance IS DISTINCT FROM v_expected_balance THEN
      RAISE EXCEPTION 'withdrawal_credit_unconfirmed';
    END IF;
    INSERT INTO midas.wallet_transactions (user_id,type,amount,source,description,reference_id)
      VALUES (v_user_id,'credit',v_row.amount,'manual','Retrait rejeté — remboursement',v_row.id)
      RETURNING id INTO v_credit_id;
    IF NOT FOUND OR v_credit_id IS NULL OR NOT EXISTS (SELECT 1 FROM midas.wallet_transactions
        WHERE id=v_credit_id AND user_id=v_user_id AND type='credit' AND amount=v_row.amount
          AND source='manual' AND reference_id=v_row.id) THEN
      RAISE EXCEPTION 'withdrawal_refund_journal_unconfirmed';
    END IF;
  END IF;
  UPDATE midas.withdrawal_requests SET status=p_action,admin_note=p_note,processed_at=now(),
    refund_credited_at=CASE WHEN p_action='rejected' THEN now() ELSE NULL END
    WHERE id=v_row.id RETURNING * INTO v_row;
  IF NOT FOUND OR v_row.id IS DISTINCT FROM p_withdrawal_id OR v_row.user_id IS DISTINCT FROM v_user_id
      OR v_row.status IS DISTINCT FROM p_action OR v_row.processed_at IS NULL
      OR (v_row.refund_credited_at IS NOT NULL) IS DISTINCT FROM (p_action='rejected') THEN
    RAISE EXCEPTION 'withdrawal_decision_unconfirmed';
  END IF;
  RETURN midas.wallet_withdrawal_receipt(v_row,v_balance,true);
END;
$$;
REVOKE ALL ON FUNCTION midas.decide_wallet_withdrawal(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION midas.decide_wallet_withdrawal(uuid,uuid,text,text) TO service_role;

COMMIT;

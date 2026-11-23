import Stripe from 'stripe';
import { syncConnectAccount } from '@/lib/stripe/connect';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readWithdrawalReceipt, readWithdrawalTransfer } from '@/lib/stripe/withdrawal-receipt';

type AdminSupabase = SupabaseClient;

export async function handleAccountUpdated(
  account: Stripe.Account,
  adminSupabase: AdminSupabase
) {
  const userId = account.metadata?.user_id ?? null;
  if (!userId) return;

  let previousPayoutsEnabled = false;
  try {
    const { data: prevRow } = await adminSupabase
      .from('connect_accounts')
      .select('payouts_enabled')
      .eq('user_id', userId)
      .maybeSingle();
    previousPayoutsEnabled = Boolean(prevRow?.payouts_enabled);
  } catch {
    // Best-effort
  }

  try {
    await syncConnectAccount(adminSupabase, userId, account);
  } catch {
    // Safety net
  }

  const nowPayoutsEnabled = Boolean(account.payouts_enabled);

  if (!previousPayoutsEnabled && nowPayoutsEnabled) {
    try {
      await adminSupabase.from('notifications').insert({
        user_id: userId,
        type: 'connect_payouts_enabled',
        title: 'Ton compte Purama est prêt 🎉',
        body: 'Tu peux maintenant retirer tes gains vers ton compte bancaire. Rendez-vous sur /compte/connect pour ton premier retrait (min 20€).',
        data: {
          stripe_account_id: account.id,
          transitioned_at: new Date().toISOString(),
          previous_state: 'payouts_disabled',
          new_state: 'payouts_enabled',
        },
      });
    } catch {
      // Best-effort
    }
  }

  if (previousPayoutsEnabled && !nowPayoutsEnabled) {
    try {
      await adminSupabase.from('notifications').insert({
        user_id: userId,
        type: 'connect_payouts_disabled',
        title: 'Action requise sur ton compte',
        body: 'Stripe a besoin de compléments d\'information pour continuer à traiter tes retraits. Rends-toi sur /compte/gestion.',
        data: {
          stripe_account_id: account.id,
          transitioned_at: new Date().toISOString(),
          previous_state: 'payouts_enabled',
          new_state: 'payouts_disabled',
          disabled_reason: account.requirements?.disabled_reason ?? null,
        },
      });
    } catch {
      /* best-effort */
    }
  }
}

export async function handleTransferCreated(
  transfer: Stripe.Transfer,
  adminSupabase: AdminSupabase
) {
  await reconcileWithdrawalTransfer(transfer, adminSupabase);
  const destinationAccountId = typeof transfer.destination === 'string'
    ? transfer.destination
    : transfer.destination?.id ?? null;
  if (!destinationAccountId) return;

  await adminSupabase
    .from('connect_accounts')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('stripe_account_id', destinationAccountId);
}

export async function handleTransferReversed(
  transfer: Stripe.Transfer,
  adminSupabase: AdminSupabase
) {
  await reconcileWithdrawalTransfer(transfer, adminSupabase);
}

async function reconcileWithdrawalTransfer(transfer: Stripe.Transfer, adminSupabase: AdminSupabase) {
  if (transfer.metadata?.app !== 'midas' || transfer.metadata?.source !== 'connect_withdraw') return;
  // A legacy MIDAS transfer without a linked admission cannot prove a debit.
  // Parsing and persistence errors deliberately reach the existing webhook 500.
  const observation = readWithdrawalTransfer(transfer);
  const { data, error } = await adminSupabase.rpc('reconcile_connect_withdrawal', observation);
  if (error) throw new Error('withdrawal_reconciliation_unavailable');
  const receipt = readWithdrawalReceipt(data, {
    userId: observation.p_user_id, withdrawalId: observation.p_withdrawal_id,
    destination: observation.p_destination, amount: observation.p_amount, transferId: observation.p_transfer_id,
  });
  if (!receipt.provider_confirmed) throw new Error('withdrawal_receipt_unconfirmed');
  if (receipt.credited_eur > 0) {
    try {
      await adminSupabase.from('notifications').insert({
        user_id: receipt.user_id,
        type: 'connect_withdrawal_reversed',
        title: receipt.status === 'reversed' ? 'Transfert annulé' : 'Transfert partiellement annulé',
        body: `${receipt.credited_eur.toFixed(2)}€ ont été recrédités sur ton wallet après l’annulation ${receipt.status === 'reversed' ? 'totale' : 'partielle'} du transfert Stripe.`,
        data: {
          transfer_id: receipt.stripe_transfer_id, withdrawal_id: receipt.id,
          amount_eur: receipt.amount_eur, credited_eur: receipt.credited_eur,
          reversed_amount_eur: receipt.credited_reversal_eur,
        },
      });
    } catch {
      // Advisory notification only; the receipt and credit already committed.
    }
  }
}

export async function handlePayoutEvent(
  event: Stripe.Event,
  adminSupabase: AdminSupabase
) {
  const payout = event.data.object as Stripe.Payout;
  const accountIdOnEvent =
    typeof (event as unknown as { account?: string }).account === 'string'
      ? (event as unknown as { account: string }).account
      : null;
  if (!accountIdOnEvent) return;

  await adminSupabase
    .from('connect_accounts')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('stripe_account_id', accountIdOnEvent);

  if (event.type === 'payout.failed') {
    try {
      const { data: connectRow } = await adminSupabase
        .from('connect_accounts')
        .select('user_id')
        .eq('stripe_account_id', accountIdOnEvent)
        .maybeSingle();
      if (connectRow?.user_id) {
        await adminSupabase.from('notifications').insert({
          user_id: connectRow.user_id,
          type: 'connect_payout_failed',
          title: 'Virement Stripe échoué',
          body: `Stripe n'a pas pu virer ${((payout.amount ?? 0) / 100).toFixed(2)}€ vers ton compte bancaire. Vérifie ton IBAN sur /compte/gestion.`,
          data: {
            payout_id: payout.id,
            amount_eur: (payout.amount ?? 0) / 100,
            failure_code: payout.failure_code ?? null,
            failure_message: payout.failure_message ?? null,
          },
        });
      }
    } catch {
      /* best-effort */
    }
  }
}

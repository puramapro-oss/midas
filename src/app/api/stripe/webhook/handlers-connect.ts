import Stripe from 'stripe';
import { syncConnectAccount } from '@/lib/stripe/connect';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  const transferId = transfer.id;
  const userId = transfer.metadata?.user_id ?? null;
  if (!transferId || !userId) return;

  try {
    const { data: withdrawal } = await adminSupabase
      .from('connect_withdrawals')
      .select('id, amount_eur, status')
      .eq('stripe_transfer_id', transferId)
      .maybeSingle();

    if (!withdrawal || withdrawal.status === 'reversed') {
      return;
    }

    await adminSupabase
      .from('connect_withdrawals')
      .update({
        status: 'reversed',
        completed_at: new Date().toISOString(),
        error: 'transfer_reversed_by_stripe',
      })
      .eq('id', withdrawal.id);

    await adminSupabase.rpc('credit_wallet_on_withdrawal_failure', {
      p_user_id: userId,
      p_amount: Number(withdrawal.amount_eur),
    });

    await adminSupabase.from('notifications').insert({
      user_id: userId,
      type: 'connect_withdrawal_reversed',
      title: 'Retrait annulé par la banque',
      body: `Ton retrait de ${Number(withdrawal.amount_eur).toFixed(2)}€ a été reversé par Stripe. Ton solde a été rétabli. Vérifie ton IBAN sur /compte/gestion.`,
      data: {
        transfer_id: transferId,
        amount_eur: Number(withdrawal.amount_eur),
      },
    });
  } catch {
    /* best-effort */
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

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, getAdminSupabase } from '@/lib/stripe/helpers';
import {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleChargeRefunded,
} from '../../stripe/webhook/handlers-payment';
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from '../../stripe/webhook/handlers-subscription';
import {
  handleAccountUpdated,
  handleTransferCreated,
  handleTransferReversed,
  handlePayoutEvent,
} from '../../stripe/webhook/handlers-connect';
import { handleCheckoutCompletedFulfillment } from './handlers-fulfillment';

export async function POST(request: Request) {
  try {
    const internalSecret = request.headers.get('x-internal-secret');
    if (internalSecret !== process.env.INTERNAL_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret non configure' }, { status: 500 });
    }

    const stripe = getStripe();
    const adminSupabase = getAdminSupabase();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompletedFulfillment(session, stripe, adminSupabase);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, stripe, adminSupabase);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, stripe, adminSupabase);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription, adminSupabase);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, adminSupabase);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, adminSupabase);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge, adminSupabase);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account, adminSupabase);
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        await handleTransferCreated(transfer, adminSupabase);
        break;
      }

      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer;
        await handleTransferReversed(transfer, adminSupabase);
        break;
      }

      case 'payout.paid':
      case 'payout.failed': {
        await handlePayoutEvent(event, adminSupabase);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

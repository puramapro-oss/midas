// =============================================================================
// MIDAS — Commission Engine Helpers
// =============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import type { LogInsert } from './commission-engine-types';

export function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function extractInvoiceMetadata(invoice: Stripe.Invoice): { userId: string | null } {
  // Stripe expose invoice.subscription_details.metadata depuis 2024 + metadata
  // directe sur invoice. Fallback sur invoice.metadata, puis subscription metadata.
  type WithMetadata = { metadata?: Record<string, string> | null };
  type InvoiceWithDetails = Stripe.Invoice & {
    subscription_details?: WithMetadata | null;
    subscription?: string | (Stripe.Subscription & WithMetadata) | null;
  };

  const inv = invoice as InvoiceWithDetails;

  const fromDetails = inv.subscription_details?.metadata?.user_id ?? null;
  const fromInvoice = inv.metadata?.user_id ?? null;
  const fromSub =
    typeof inv.subscription === 'object' && inv.subscription !== null
      ? inv.subscription.metadata?.user_id ?? null
      : null;

  return { userId: fromDetails ?? fromInvoice ?? fromSub ?? null };
}

export async function writeLog(db: SupabaseClient, row: LogInsert): Promise<void> {
  try {
    await db.from('commission_dispatch_log').insert(row);
  } catch {
    // Le log audit ne doit jamais casser le flow webhook — silent catch.
  }
}

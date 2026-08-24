// =============================================================================
// MIDAS — Stripe & Supabase Helpers (factorisation webhook+stripe-fulfillment)
// =============================================================================

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
}

export function getAdminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

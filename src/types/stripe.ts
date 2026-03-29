// =============================================================================
// MIDAS — Stripe Types
// Types pour les plans, abonnements et configuration Stripe
// =============================================================================

// --- Plans ---

export type MidasPlan = 'free' | 'pro' | 'ultra';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanConfig {
  id: MidasPlan;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  price_monthly_cents: number;
  price_yearly_cents: number;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  features: PlanFeature[];
  limits: PlanLimits;
  badge: string | null;
  is_popular: boolean;
  cta_label: string;
}

export interface PlanFeature {
  label: string;
  included: boolean;
  highlight: boolean;
}

export interface PlanLimits {
  daily_questions: number;
  daily_trades: number;
  max_exchanges: number;
  max_positions: number;
  max_bots: number;
  backtesting: boolean;
  paper_trading: boolean;
  advanced_agents: boolean;
  smart_money_analysis: boolean;
  order_flow: boolean;
  derivatives_analysis: boolean;
  manipulation_detection: boolean;
  api_access: boolean;
  priority_support: boolean;
  custom_strategies: boolean;
  export_data: boolean;
}

// --- Checkout ---

export interface CheckoutSessionParams {
  plan: MidasPlan;
  billing_period: BillingPeriod;
  user_id: string;
  email: string;
  referral_code: string | null;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutResult {
  session_id: string;
  url: string;
}

// --- Webhook Events ---

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface SubscriptionUpdatedData {
  user_id: string;
  plan: MidasPlan;
  billing_period: BillingPeriod;
  status: SubscriptionStatus;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  current_period_end: string;
}

export interface PaymentSucceededData {
  user_id: string;
  amount: number;
  amount_after_discount: number;
  currency: string;
  invoice_id: string;
  plan: MidasPlan;
  billing_period: BillingPeriod;
  referral_code: string | null;
}

// --- Portal ---

export interface PortalSessionParams {
  customer_id: string;
  return_url: string;
}

// --- Invoice ---

export interface MidasInvoice {
  id: string;
  invoice_number: string;
  user_id: string;
  amount_ht: number;
  tva_rate: number;
  tva_amount: number;
  amount_ttc: number;
  plan: MidasPlan;
  billing_period: BillingPeriod;
  pdf_url: string | null;
  client_name: string;
  client_email: string;
  client_address: string | null;
  created_at: string;
}

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { SUPER_ADMIN_EMAIL } from '@/types/database';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/signup',
  '/onboarding',
  '/forgot-password',
  '/pricing',
  '/status',
  '/changelog',
  '/offline',
  '/api/stripe/webhook',
  '/api/status',
  '/partenariat',
  '/contact',
  '/financer',
  '/fiscal',
  '/ecosystem',
  '/how-it-works',
  '/confirmation',
  '/subscribe',
]);

const PUBLIC_PREFIXES = [
  '/legal/',
  '/api/',
  '/go/',
  '/partenariat/',
  '/scan/',
  '/p/',
];

const AUTH_ROUTES = new Set(['/login', '/forgot-password']);

const EDUCATION_ONLY_API_PREFIXES = [
  '/api/exchange/',
  '/api/bot/',
  '/api/signals',
  '/api/trade/',
  '/api/agents/run',
  '/api/analysis/',
  '/api/cron/generate-signals',
  '/api/cron/deep-analysis',
  '/api/cron/sync-balances',
  '/api/copy-trading',
  '/api/earn/',
  '/api/export/trades',
  '/api/wealth',
  '/api/connect/',
  '/api/kyc',
  '/api/wallet/withdraw',
  '/api/wallet/prime',
  '/api/tax/',
  '/api/admin/withdrawals',
  '/api/cron/fiscal-',
  '/api/cron/prime-tranches',
  '/api/partner/',
  '/api/referral/',
  '/api/stripe/checkout',
  '/api/stripe/retention/',
  '/api/review-prompt',
];

const EDUCATION_ONLY_PAGE_PREFIXES = [
  '/dashboard/trading',
  '/dashboard/signals',
  '/dashboard/bots',
  '/dashboard/copy-trading',
  '/dashboard/earn',
  '/dashboard/portfolio',
  '/dashboard/agents',
  '/dashboard/analysis',
  '/dashboard/wealth',
  '/dashboard/settings/exchanges',
  '/dashboard/settings/abonnement',
  '/dashboard/help/connect-binance',
  '/dashboard/help/referral-wallet',
  '/dashboard/help/shield',
  '/dashboard/help/strategies',
  '/dashboard/guide',
  '/dashboard/referral',
  '/dashboard/partenaire',
  '/dashboard/boutique',
  '/dashboard/wallet',
  '/dashboard/kyc',
  '/dashboard/tax',
  '/compte/',
  '/admin/withdrawals',
];

const DISABLED_LEGACY_PUBLIC_ROUTES = new Set([
  '/how-it-works',
  '/ecosystem',
  '/partenariat',
  '/fiscal',
  '/financer',
  '/subscribe',
  '/confirmation',
]);

const DISABLED_LEGACY_PUBLIC_PREFIXES = ['/partenariat/', '/go/', '/p/', '/scan/'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (
    DISABLED_LEGACY_PUBLIC_ROUTES.has(pathname) ||
    DISABLED_LEGACY_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (EDUCATION_ONLY_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.json(
      { error: 'MIDAS est limité à l’information générale et à la simulation éducative.' },
      { status: 403 },
    );
  }

  if (EDUCATION_ONLY_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/help';
    return NextResponse.redirect(url);
  }

  // Public routes: allow through
  if (isPublicRoute(pathname)) {
    // Auth routes: redirect authenticated users to dashboard
    if (isAuthRoute(pathname) && user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Protected routes: require authentication
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Admin routes: require super admin
  if (isAdminRoute(pathname)) {
    if (user.email !== SUPER_ADMIN_EMAIL) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|sw\\.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|txt|json|xml|webmanifest|js|css|map)$).*)',
  ],
};

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { SUPER_ADMIN_EMAIL } from '@/types/database';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/pricing',
  '/status',
  '/changelog',
  '/offline',
  '/api/stripe/webhook',
  '/api/status',
]);

const PUBLIC_PREFIXES = [
  '/legal/',
  '/api/cron/',
  '/api/market/',
  '/go/',
];

const AUTH_ROUTES = new Set(['/login', '/register']);

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
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|txt|json|xml)$).*)',
  ],
};

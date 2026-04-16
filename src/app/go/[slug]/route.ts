// MIDAS — V7 §15 : /go/[slug] en Route Handler
// Pose cookie purama_promo si ?coupon=WELCOME50|CROSS50, puis redirect /register?ref=[slug].
// Route Handler (pas page.tsx) car Server Components ne peuvent pas set() cookies.

import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'purama_promo';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const ALLOWED_COUPONS = new Set(['WELCOME50', 'CROSS50']);

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Context) {
  const { slug } = await params;
  const rawCoupon = request.nextUrl.searchParams.get('coupon');
  const coupon = rawCoupon && ALLOWED_COUPONS.has(rawCoupon.toUpperCase())
    ? rawCoupon.toUpperCase()
    : null;

  const redirectUrl = new URL(
    `/register?ref=${encodeURIComponent(slug)}`,
    request.url
  );
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  if (coupon) {
    response.cookies.set({
      name: COOKIE_NAME,
      value: JSON.stringify({
        coupon,
        source: slug,
        expires: Date.now() + COOKIE_MAX_AGE_SECONDS * 1000,
      }),
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.purama.dev',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://midas.purama.dev';
    await fetch(`${baseUrl}/api/referral/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, source: 'go_link', coupon }),
    }).catch(() => {});
  } catch {
    // Non-blocking
  }

  return response;
}

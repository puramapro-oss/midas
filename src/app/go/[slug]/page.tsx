import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MIDAS — Redirection',
};

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const COOKIE_NAME = 'purama_promo';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const ALLOWED_COUPONS = new Set(['WELCOME50', 'CROSS50']);

export default async function GoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const rawCoupon = typeof sp.coupon === 'string' ? sp.coupon.toUpperCase() : null;
  const coupon = rawCoupon && ALLOWED_COUPONS.has(rawCoupon) ? rawCoupon : null;

  if (coupon) {
    const cookieStore = await cookies();
    cookieStore.set({
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
    // Non-blocking — don't fail redirect if tracking fails
  }

  redirect(`/register?ref=${encodeURIComponent(slug)}`);
}

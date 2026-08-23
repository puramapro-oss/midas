import { NextResponse, type NextRequest } from 'next/server';

/**
 * Copié tel quel depuis `arogya/src/lib/cron-auth.ts` (implémentation réelle déjà en
 * production, socle @purama/legal) — canonique pour toute app dont `lib/cron-auth.ts`
 * n'existait pas encore.
 */
export function assertCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

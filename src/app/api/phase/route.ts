import { NextResponse } from 'next/server';
import { getPhase } from '@/lib/phase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const p = getPhase();
  return NextResponse.json({
    phase: p.phase,
    walletMode: p.walletMode,
    cardAvailable: p.cardAvailable,
    withdrawalAvailable: p.withdrawalAvailable,
  });
}

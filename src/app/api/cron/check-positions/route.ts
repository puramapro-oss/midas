import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/cron-auth';
import { monitorAllPaperPositions } from '@/lib/trading/trade-monitor';

export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const result = await monitorAllPaperPositions();
    const complete = result.errors.length === 0;
    return NextResponse.json({
      success: complete, checked: result.positions_checked,
      closed: result.actions_taken.filter(action => action.action.startsWith('close_')).length,
      actions: result.actions_taken, errors: result.errors, timestamp: new Date().toISOString(),
    }, { status: complete ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: 'Suivi simulé indisponible ; vérifier les positions avant de relancer' }, { status: 503 });
  }
}

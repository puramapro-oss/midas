// =============================================================================
// MIDAS — Nightly Learning CRON
// Execute l'apprentissage nocturne pour ameliorer les poids des indicateurs
// =============================================================================

import { NextResponse } from 'next/server';
import { runNightlyLearning } from '@/lib/ai/learning-engine';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * CRON route pour l'apprentissage nocturne.
 * Securisee par CRON_SECRET.
 * Execute une analyse aggregate de tous les trades des 24 dernieres heures.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { success: false, error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await runNightlyLearning('aggregate');

    return NextResponse.json({
      success: true,
      report: result.report,
      summary: {
        totalTrades: result.review.totalTrades,
        bestIndicator: result.review.bestIndicator,
        worstIndicator: result.review.worstIndicator,
        strategiesAnalyzed: result.strategyPerformance.length,
        weightAdjustmentsCount: Object.keys(result.weightAdjustments).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

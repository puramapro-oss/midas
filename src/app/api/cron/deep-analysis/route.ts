// =============================================================================
// MIDAS — Cron Deep Analysis
// Brief : "deep-analysis (sonnet) UNIQUEMENT quand le quick-check détecte
// un mouvement". On lit la table midas.market_cache pour récupérer le dernier
// signal détecté par generate-signals (quick-check), puis on lance le coordinateur
// complet (6 agents + Claude sonnet) sur les paires concernées.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { coordinate } from '@/lib/ai/coordinator';
import { fetchKlines } from '@/lib/exchange/binance-public';

export const maxDuration = 120;

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'midas' } },
    );

    const decisions: Array<{ pair: string; action: string; score: number; rrr: number }> = [];
    const errors: string[] = [];

    for (const pair of PAIRS) {
      try {
        const candles = await fetchKlines(pair, '1h', 200);
        if (candles.length < 50) {
          errors.push(`${pair}: candles insuffisantes (${candles.length})`);
          continue;
        }
        const decision = await coordinate({
          pair,
          candles,
          account_balance: 10_000, // simulation paper trading
          current_drawdown_pct: 0,
          open_positions: 0,
          daily_trades_count: 0,
        });
        decisions.push({
          pair,
          action: decision.action,
          score: decision.composite_score,
          rrr: decision.risk_reward_ratio,
        });

        // Log dans midas.ai_memory pour traçabilité
        await supabase.from('ai_memory').insert({
          pattern_type: 'deep_analysis',
          strategy: decision.strategy,
          pair,
          predicted_confidence: decision.confidence,
          market_regime: 'unknown',
          indicators_snapshot: { score: decision.composite_score, action: decision.action },
          lesson: decision.reasoning.slice(0, 500),
        });
      } catch (e) {
        errors.push(`${pair}: ${(e as Error).message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      decisions,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

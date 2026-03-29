// =============================================================================
// MIDAS — AI Learning Engine
// Analyse nocturne des trades pour ameliorer les poids des indicateurs
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';

export interface DailyReview {
  totalTrades: number;
  winningPatterns: string[];
  losingPatterns: string[];
  bestIndicator: string;
  worstIndicator: string;
}

export interface StrategyPerformance {
  strategy: string;
  winRate: number;
  avgPnl: number;
  shouldContinue: boolean;
}

export interface LearningResult {
  review: DailyReview;
  weightAdjustments: Record<string, number>;
  strategyPerformance: StrategyPerformance[];
  report: string;
}

interface TradeRecord {
  id: string;
  user_id: string;
  pair: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  pnl_pct: number | null;
  strategy: string | null;
  indicators_used: string[] | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
  closed_at: string | null;
}

const DEFAULT_INDICATORS = [
  'rsi', 'macd', 'bollinger', 'ema_cross', 'volume_profile',
  'stochastic', 'adx', 'ichimoku', 'vwap', 'obv',
  'fibonacci', 'support_resistance', 'orderflow', 'sentiment', 'whale_alert',
];

const DEFAULT_STRATEGIES = [
  'momentum', 'mean_reversion', 'breakout', 'trend_following',
  'grid', 'scalping', 'swing',
];

/**
 * Execute l'apprentissage nocturne pour un utilisateur ou en aggrege.
 * Analyse les trades des 24 dernieres heures et calcule les ajustements de poids.
 *
 * @param userId - ID utilisateur, ou 'aggregate' pour stats globales
 * @returns Resultat de l'apprentissage avec ajustements recommandes
 */
export async function runNightlyLearning(userId: string): Promise<LearningResult> {
  const supabase = createServiceClient();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fetch closed trades from last 24h
  let query = supabase
    .from('trades')
    .select('*')
    .eq('status', 'closed')
    .gte('closed_at', twentyFourHoursAgo)
    .order('closed_at', { ascending: false });

  if (userId !== 'aggregate') {
    query = query.eq('user_id', userId);
  }

  const { data: trades, error } = await query;

  if (error) {
    throw new Error(`[MIDAS:LearningEngine] Erreur DB: ${error.message}`);
  }

  const tradeRecords = (trades ?? []) as TradeRecord[];

  if (tradeRecords.length === 0) {
    return buildEmptyResult();
  }

  const review = buildDailyReview(tradeRecords);
  const weightAdjustments = calculateWeightAdjustments(tradeRecords);
  const strategyPerformance = analyzeStrategyPerformance(tradeRecords);
  const report = generateReport(review, weightAdjustments, strategyPerformance);

  // Store learning results
  await storeLearningLog(supabase, userId, {
    review,
    weightAdjustments,
    strategyPerformance,
    report,
  });

  return { review, weightAdjustments, strategyPerformance, report };
}

function buildEmptyResult(): LearningResult {
  return {
    review: {
      totalTrades: 0,
      winningPatterns: [],
      losingPatterns: [],
      bestIndicator: 'none',
      worstIndicator: 'none',
    },
    weightAdjustments: {},
    strategyPerformance: [],
    report: 'Aucun trade cloture dans les 24 dernieres heures. Aucun ajustement necessaire.',
  };
}

function buildDailyReview(trades: TradeRecord[]): DailyReview {
  const winners = trades.filter((t) => (t.pnl ?? 0) > 0);
  const losers = trades.filter((t) => (t.pnl ?? 0) < 0);

  // Extract patterns from winning and losing trades
  const winningPatterns = extractPatterns(winners);
  const losingPatterns = extractPatterns(losers);

  // Find best and worst indicators
  const indicatorPerformance = calculateIndicatorPerformance(trades);
  const sorted = Object.entries(indicatorPerformance).sort((a, b) => b[1] - a[1]);

  const bestIndicator = sorted.length > 0 ? sorted[0][0] : 'none';
  const worstIndicator = sorted.length > 0 ? sorted[sorted.length - 1][0] : 'none';

  return {
    totalTrades: trades.length,
    winningPatterns,
    losingPatterns,
    bestIndicator,
    worstIndicator,
  };
}

function extractPatterns(trades: TradeRecord[]): string[] {
  const patternCounts: Record<string, number> = {};

  for (const trade of trades) {
    // Extract strategy patterns
    if (trade.strategy) {
      const key = `strategy:${trade.strategy}`;
      patternCounts[key] = (patternCounts[key] ?? 0) + 1;
    }

    // Extract indicator combinations
    if (trade.indicators_used && trade.indicators_used.length > 0) {
      const comboKey = `indicators:${trade.indicators_used.sort().join('+')}`;
      patternCounts[comboKey] = (patternCounts[comboKey] ?? 0) + 1;
    }

    // Extract pair patterns
    const pairKey = `pair:${trade.pair}`;
    patternCounts[pairKey] = (patternCounts[pairKey] ?? 0) + 1;

    // Extract side patterns
    const sideKey = `side:${trade.side}`;
    patternCounts[sideKey] = (patternCounts[sideKey] ?? 0) + 1;
  }

  // Return top 5 most common patterns
  return Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern} (${count}x)`);
}

function calculateIndicatorPerformance(
  trades: TradeRecord[]
): Record<string, number> {
  const indicatorPnl: Record<string, { totalPnl: number; count: number }> = {};

  // Initialize all known indicators
  for (const indicator of DEFAULT_INDICATORS) {
    indicatorPnl[indicator] = { totalPnl: 0, count: 0 };
  }

  for (const trade of trades) {
    const pnl = trade.pnl ?? 0;
    const indicators = trade.indicators_used ?? [];

    for (const indicator of indicators) {
      if (!indicatorPnl[indicator]) {
        indicatorPnl[indicator] = { totalPnl: 0, count: 0 };
      }
      indicatorPnl[indicator].totalPnl += pnl;
      indicatorPnl[indicator].count += 1;
    }
  }

  // Return average PnL per indicator (only those that were used)
  const result: Record<string, number> = {};
  for (const [indicator, data] of Object.entries(indicatorPnl)) {
    if (data.count > 0) {
      result[indicator] = data.totalPnl / data.count;
    }
  }

  return result;
}

function calculateWeightAdjustments(trades: TradeRecord[]): Record<string, number> {
  const indicatorPerf = calculateIndicatorPerformance(trades);
  const adjustments: Record<string, number> = {};

  if (Object.keys(indicatorPerf).length === 0) {
    return adjustments;
  }

  // Calculate mean and stddev of indicator performances
  const values = Object.values(indicatorPerf);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  for (const [indicator, avgPnl] of Object.entries(indicatorPerf)) {
    if (stddev === 0) {
      adjustments[indicator] = 0;
      continue;
    }

    // Z-score based adjustment
    const zScore = (avgPnl - mean) / stddev;

    // Clamp adjustment between -0.2 and +0.2 (max 20% weight change)
    // Positive z-score = increase weight, negative = decrease
    const adjustment = Math.max(-0.2, Math.min(0.2, zScore * 0.1));
    adjustments[indicator] = parseFloat(adjustment.toFixed(4));
  }

  return adjustments;
}

function analyzeStrategyPerformance(trades: TradeRecord[]): StrategyPerformance[] {
  const strategyStats: Record<
    string,
    { wins: number; losses: number; totalPnl: number; count: number }
  > = {};

  // Initialize known strategies
  for (const strategy of DEFAULT_STRATEGIES) {
    strategyStats[strategy] = { wins: 0, losses: 0, totalPnl: 0, count: 0 };
  }

  for (const trade of trades) {
    const strategy = trade.strategy ?? 'unknown';
    if (!strategyStats[strategy]) {
      strategyStats[strategy] = { wins: 0, losses: 0, totalPnl: 0, count: 0 };
    }

    const pnl = trade.pnl ?? 0;
    strategyStats[strategy].count += 1;
    strategyStats[strategy].totalPnl += pnl;

    if (pnl > 0) {
      strategyStats[strategy].wins += 1;
    } else if (pnl < 0) {
      strategyStats[strategy].losses += 1;
    }
  }

  return Object.entries(strategyStats)
    .filter(([, stats]) => stats.count > 0)
    .map(([strategy, stats]) => {
      const winRate =
        stats.count > 0 ? parseFloat((stats.wins / stats.count).toFixed(4)) : 0;
      const avgPnl =
        stats.count > 0 ? parseFloat((stats.totalPnl / stats.count).toFixed(2)) : 0;

      // Continue if win rate > 40% OR if sample size is too small to judge
      const shouldContinue = winRate > 0.4 || stats.count < 5;

      return { strategy, winRate, avgPnl, shouldContinue };
    })
    .sort((a, b) => b.winRate - a.winRate);
}

function generateReport(
  review: DailyReview,
  weightAdjustments: Record<string, number>,
  strategyPerformance: StrategyPerformance[]
): string {
  const lines: string[] = [];

  lines.push('=== MIDAS Nightly Learning Report ===');
  lines.push(`Date: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Total trades analysed: ${review.totalTrades}`);
  lines.push('');

  // Indicators
  lines.push('--- Indicator Performance ---');
  lines.push(`Best: ${review.bestIndicator}`);
  lines.push(`Worst: ${review.worstIndicator}`);
  lines.push('');

  // Weight adjustments
  const increases = Object.entries(weightAdjustments)
    .filter(([, v]) => v > 0.01)
    .sort((a, b) => b[1] - a[1]);

  const decreases = Object.entries(weightAdjustments)
    .filter(([, v]) => v < -0.01)
    .sort((a, b) => a[1] - b[1]);

  if (increases.length > 0) {
    lines.push('--- Weight Increases ---');
    for (const [indicator, delta] of increases) {
      lines.push(`  ${indicator}: +${(delta * 100).toFixed(1)}%`);
    }
    lines.push('');
  }

  if (decreases.length > 0) {
    lines.push('--- Weight Decreases ---');
    for (const [indicator, delta] of decreases) {
      lines.push(`  ${indicator}: ${(delta * 100).toFixed(1)}%`);
    }
    lines.push('');
  }

  // Strategy performance
  lines.push('--- Strategy Performance ---');
  for (const sp of strategyPerformance) {
    const status = sp.shouldContinue ? 'CONTINUE' : 'REVIEW';
    lines.push(
      `  ${sp.strategy}: WR ${(sp.winRate * 100).toFixed(1)}% | Avg PnL $${sp.avgPnl.toFixed(2)} | ${status}`
    );
  }
  lines.push('');

  // Winning patterns
  if (review.winningPatterns.length > 0) {
    lines.push('--- Winning Patterns ---');
    for (const pattern of review.winningPatterns) {
      lines.push(`  + ${pattern}`);
    }
    lines.push('');
  }

  // Losing patterns
  if (review.losingPatterns.length > 0) {
    lines.push('--- Losing Patterns ---');
    for (const pattern of review.losingPatterns) {
      lines.push(`  - ${pattern}`);
    }
  }

  return lines.join('\n');
}

async function storeLearningLog(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  result: LearningResult
): Promise<void> {
  try {
    await supabase.from('learning_logs').insert({
      user_id: userId === 'aggregate' ? null : userId,
      type: userId === 'aggregate' ? 'aggregate' : 'user',
      total_trades: result.review.totalTrades,
      best_indicator: result.review.bestIndicator,
      worst_indicator: result.review.worstIndicator,
      weight_adjustments: result.weightAdjustments,
      strategy_performance: result.strategyPerformance,
      winning_patterns: result.review.winningPatterns,
      losing_patterns: result.review.losingPatterns,
      report: result.report,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critical — log storage failure should not break the learning process
  }
}

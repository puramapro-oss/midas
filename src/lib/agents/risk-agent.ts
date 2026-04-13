// =============================================================================
// MIDAS — Risk Agent (MIDAS SHIELD)
// 7 niveaux de verification de risque avant approbation d'un trade
// =============================================================================

import type { AgentResult, Candle, MarketRegime } from '@/lib/agents/types';
import { detectManipulation } from '@/lib/analysis/manipulation-detector';

// --- Types ---

type ShieldLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface ShieldCheck {
  level: ShieldLevel;
  name: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

interface RiskData {
  approved: boolean;
  checks: ShieldCheck[];
  passed_count: number;
  failed_count: number;
  critical_failures: number;
  max_position_size_pct: number;
  suggested_leverage: number;
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  drawdown_limit_pct: number;
}

interface RiskParams {
  pair: string;
  action: 'buy' | 'sell';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size_pct: number;
  account_balance: number;
  /** Drawdown total (compteur depuis l'inception ou capital initial) */
  current_drawdown_pct: number;
  /** Drawdown sur 24h glissantes (optionnel — brief : limite 3%) */
  daily_drawdown_pct?: number;
  /** Drawdown sur 7j glissants (optionnel — brief : limite 7%) */
  weekly_drawdown_pct?: number;
  open_positions: number;
  daily_trades_count: number;
  regime: MarketRegime;
  candles: Candle[];
  composite_score: number;
  confidence: number;
  /** Corrélation max (Pearson 0-1) avec une position déjà ouverte (optionnel — brief : seuil 0.9) */
  max_correlation_with_open_positions?: number;
}

// --- Constants ---

const MAX_DAILY_TRADES = 10;
const MAX_OPEN_POSITIONS = 5;
const MAX_DRAWDOWN_PCT = 15; // brief : total
const MAX_DAILY_DRAWDOWN_PCT = 3; // brief : journalier
const MAX_WEEKLY_DRAWDOWN_PCT = 7; // brief : hebdo
const MAX_POSITION_SIZE_PCT = 5;
const MIN_RISK_REWARD_RATIO = 2.0; // brief : R/R minimum 1:2
const MAX_SPREAD_PCT = 0.5;
const MIN_CONFIDENCE = 0.4;
const MIN_COMPOSITE_SCORE = 0.2;
const MAX_CORRELATION = 0.9; // brief : seuil 90%

const REGIME_POSITION_LIMITS: Record<MarketRegime, number> = {
  strong_bull: 5,
  weak_bull: 3,
  ranging: 2,
  weak_bear: 2,
  strong_bear: 1.5,
  crash: 0,
  high_volatility: 1.5,
  low_volatility: 4,
};

const REGIME_LEVERAGE_LIMITS: Record<MarketRegime, number> = {
  strong_bull: 5,
  weak_bull: 3,
  ranging: 2,
  weak_bear: 2,
  strong_bear: 1,
  crash: 1,
  high_volatility: 1,
  low_volatility: 5,
};

// --- Shield Checks ---

function checkLevel1_DrawdownLimit(params: RiskParams): ShieldCheck {
  const dailyDD = params.daily_drawdown_pct ?? 0;
  const weeklyDD = params.weekly_drawdown_pct ?? 0;
  const totalDD = params.current_drawdown_pct;

  const totalOk = totalDD < MAX_DRAWDOWN_PCT;
  const dailyOk = dailyDD < MAX_DAILY_DRAWDOWN_PCT;
  const weeklyOk = weeklyDD < MAX_WEEKLY_DRAWDOWN_PCT;
  const passed = totalOk && dailyOk && weeklyOk;

  let message: string;
  if (!passed) {
    const reasons: string[] = [];
    if (!dailyOk) reasons.push(`24h ${dailyDD.toFixed(1)}% > ${MAX_DAILY_DRAWDOWN_PCT}%`);
    if (!weeklyOk) reasons.push(`7j ${weeklyDD.toFixed(1)}% > ${MAX_WEEKLY_DRAWDOWN_PCT}%`);
    if (!totalOk) reasons.push(`total ${totalDD.toFixed(1)}% > ${MAX_DRAWDOWN_PCT}%`);
    message = `BLOQUE: drawdown excessif — ${reasons.join(', ')}`;
  } else {
    message = `Drawdown 24h ${dailyDD.toFixed(1)}%/${MAX_DAILY_DRAWDOWN_PCT}% | 7j ${weeklyDD.toFixed(1)}%/${MAX_WEEKLY_DRAWDOWN_PCT}% | total ${totalDD.toFixed(1)}%/${MAX_DRAWDOWN_PCT}%`;
  }

  return {
    level: 1,
    name: 'Drawdown Limit (24h/7j/total)',
    passed,
    severity: 'critical',
    message,
  };
}

function checkLevel2_PositionSize(params: RiskParams): ShieldCheck {
  const maxAllowed = Math.min(
    MAX_POSITION_SIZE_PCT,
    REGIME_POSITION_LIMITS[params.regime]
  );
  const passed = params.position_size_pct <= maxAllowed;
  return {
    level: 2,
    name: 'Position Size',
    passed,
    severity: 'critical',
    message: passed
      ? `Position ${params.position_size_pct.toFixed(1)}% <= max ${maxAllowed.toFixed(1)}% (regime: ${params.regime})`
      : `BLOQUE: Position ${params.position_size_pct.toFixed(1)}% depasse le max ${maxAllowed.toFixed(1)}% pour regime ${params.regime}`,
  };
}

function checkLevel3_RiskReward(params: RiskParams): ShieldCheck {
  const riskAmount = Math.abs(params.entry_price - params.stop_loss);
  const rewardAmount = Math.abs(params.take_profit - params.entry_price);
  const ratio = riskAmount > 0 ? rewardAmount / riskAmount : 0;
  const passed = ratio >= MIN_RISK_REWARD_RATIO;

  return {
    level: 3,
    name: 'Risk/Reward Ratio',
    passed,
    severity: 'high',
    message: passed
      ? `R/R ratio ${ratio.toFixed(2)} >= minimum ${MIN_RISK_REWARD_RATIO}`
      : `R/R ratio ${ratio.toFixed(2)} < minimum ${MIN_RISK_REWARD_RATIO} requis`,
  };
}

function checkLevel4_DailyLimits(params: RiskParams): ShieldCheck {
  const tradesOk = params.daily_trades_count < MAX_DAILY_TRADES;
  const positionsOk = params.open_positions < MAX_OPEN_POSITIONS;
  const passed = tradesOk && positionsOk;

  return {
    level: 4,
    name: 'Daily Limits',
    passed,
    severity: 'high',
    message: passed
      ? `Trades: ${params.daily_trades_count}/${MAX_DAILY_TRADES}, Positions: ${params.open_positions}/${MAX_OPEN_POSITIONS}`
      : `Limite atteinte — Trades: ${params.daily_trades_count}/${MAX_DAILY_TRADES}, Positions: ${params.open_positions}/${MAX_OPEN_POSITIONS}`,
  };
}

function checkLevel5_MarketRegime(params: RiskParams): ShieldCheck {
  const blockedRegimes: MarketRegime[] = ['crash'];
  const cautionRegimes: MarketRegime[] = ['high_volatility', 'strong_bear'];

  if (blockedRegimes.includes(params.regime)) {
    return {
      level: 5,
      name: 'Market Regime',
      passed: false,
      severity: 'critical',
      message: `BLOQUE: Regime ${params.regime} — aucun nouveau trade autorise`,
    };
  }

  if (cautionRegimes.includes(params.regime)) {
    return {
      level: 5,
      name: 'Market Regime',
      passed: true,
      severity: 'medium',
      message: `PRUDENCE: Regime ${params.regime} — position reduite recommandee`,
    };
  }

  return {
    level: 5,
    name: 'Market Regime',
    passed: true,
    severity: 'low',
    message: `Regime ${params.regime} — conditions favorables`,
  };
}

function checkLevel6_Spread(params: RiskParams): ShieldCheck {
  // Estimer le spread a partir des candles recentes
  const recentCandles = params.candles.slice(-5);
  if (recentCandles.length === 0) {
    return {
      level: 6,
      name: 'Spread Check',
      passed: true,
      severity: 'medium',
      message: 'Pas de donnees de spread — check ignore',
    };
  }

  // Approximation: spread = (high - low) / close pour la derniere candle
  const lastCandle = recentCandles[recentCandles.length - 1];
  const spreadPct = ((lastCandle.high - lastCandle.low) / lastCandle.close) * 100;

  // Si le range est tres faible par rapport au prix, considerer comme spread acceptable
  const effectiveSpread = Math.min(spreadPct, MAX_SPREAD_PCT * 2);
  const passed = effectiveSpread <= MAX_SPREAD_PCT * 3; // Tolerance plus large pour les candles

  return {
    level: 6,
    name: 'Spread Check',
    passed,
    severity: 'medium',
    message: passed
      ? `Range derniere bougie ${effectiveSpread.toFixed(3)}% — acceptable`
      : `Range trop eleve ${effectiveSpread.toFixed(3)}% — spread potentiellement dangereux`,
  };
}

function checkLevel8_AntiManipulation(params: RiskParams): ShieldCheck {
  if (params.candles.length < 30) {
    return {
      level: 8,
      name: 'Anti-Manipulation',
      passed: true,
      severity: 'medium',
      message: 'Historique insuffisant pour détection manipulation — check ignoré',
    };
  }
  const detection = detectManipulation(params.candles);
  const passed = detection.overall_risk !== 'likely_manipulated';
  return {
    level: 8,
    name: 'Anti-Manipulation',
    passed,
    severity: 'critical',
    message: passed
      ? `Manipulation: ${detection.overall_risk} | wash ${(detection.wash_trading_risk * 100).toFixed(0)}% | pump ${(detection.pump_dump_risk * 100).toFixed(0)}%`
      : `BLOQUE: marché probablement manipulé — ${detection.recommendation}`,
  };
}

function checkLevel9_CorrelationVeto(params: RiskParams): ShieldCheck {
  const corr = params.max_correlation_with_open_positions;
  if (typeof corr !== 'number') {
    return {
      level: 9,
      name: 'Correlation Veto',
      passed: true,
      severity: 'medium',
      message: 'Pas de données de corrélation — check ignoré',
    };
  }
  const passed = corr < MAX_CORRELATION;
  return {
    level: 9,
    name: 'Correlation Veto',
    passed,
    severity: 'high',
    message: passed
      ? `Corrélation max ${(corr * 100).toFixed(0)}% < seuil ${MAX_CORRELATION * 100}%`
      : `BLOQUE: trade corrélé à ${(corr * 100).toFixed(0)}% à une position ouverte (seuil ${MAX_CORRELATION * 100}%)`,
  };
}

function checkLevel7_SignalQuality(params: RiskParams): ShieldCheck {
  const scoreOk = Math.abs(params.composite_score) >= MIN_COMPOSITE_SCORE;
  const confidenceOk = params.confidence >= MIN_CONFIDENCE;
  const passed = scoreOk && confidenceOk;

  return {
    level: 7,
    name: 'Signal Quality',
    passed,
    severity: 'high',
    message: passed
      ? `Score: ${params.composite_score.toFixed(3)} (min: ${MIN_COMPOSITE_SCORE}), Confidence: ${(params.confidence * 100).toFixed(0)}% (min: ${MIN_CONFIDENCE * 100}%)`
      : `Signal insuffisant — Score: ${params.composite_score.toFixed(3)}, Confidence: ${(params.confidence * 100).toFixed(0)}%`,
  };
}

// --- Main Agent Function ---

/**
 * Execute les 7 niveaux de verification du MIDAS SHIELD.
 * Retourne un AgentResult avec l'approbation ou le refus du trade.
 */
export async function analyzeRisk(params: RiskParams): Promise<AgentResult> {
  const checks: ShieldCheck[] = [
    checkLevel1_DrawdownLimit(params),
    checkLevel2_PositionSize(params),
    checkLevel3_RiskReward(params),
    checkLevel4_DailyLimits(params),
    checkLevel5_MarketRegime(params),
    checkLevel6_Spread(params),
    checkLevel7_SignalQuality(params),
    checkLevel8_AntiManipulation(params),
    checkLevel9_CorrelationVeto(params),
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const failedCount = checks.filter((c) => !c.passed).length;
  const criticalFailures = checks.filter((c) => !c.passed && c.severity === 'critical').length;

  // Approved = no critical failures AND at most 1 non-critical failure
  const approved = criticalFailures === 0 && failedCount <= 1;

  // Calculate max position size based on regime and drawdown
  const regimeLimit = REGIME_POSITION_LIMITS[params.regime];
  const drawdownFactor = Math.max(0, 1 - params.current_drawdown_pct / MAX_DRAWDOWN_PCT);
  const maxPositionSizePct = Math.min(MAX_POSITION_SIZE_PCT, regimeLimit) * drawdownFactor;

  // Suggested leverage
  const suggestedLeverage = REGIME_LEVERAGE_LIMITS[params.regime];

  // Risk level
  let riskLevel: RiskData['risk_level'];
  if (criticalFailures > 0) {
    riskLevel = 'extreme';
  } else if (failedCount >= 2) {
    riskLevel = 'high';
  } else if (failedCount === 1) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Drawdown limit
  const drawdownLimitPct = MAX_DRAWDOWN_PCT - params.current_drawdown_pct;

  // Signal: approved = neutral (not a directional signal), rejected = bearish (blocking)
  const signal: AgentResult['signal'] = approved ? 'neutral' : 'bearish';
  const score = approved ? 0 : -1;
  const confidence = 0.95; // Shield is always confident in its checks

  // Reasoning
  const reasoningParts = [
    `MIDAS SHIELD — ${approved ? 'APPROUVE' : 'REFUSE'} (${passedCount}/${checks.length} checks)`,
    `Niveau risque: ${riskLevel.toUpperCase()} | Position max: ${maxPositionSizePct.toFixed(1)}% | Leverage max: ${suggestedLeverage}x`,
  ];

  for (const check of checks) {
    const icon = check.passed ? 'OK' : 'FAIL';
    reasoningParts.push(`[L${check.level}:${icon}] ${check.name}: ${check.message}`);
  }

  const riskData: RiskData = {
    approved,
    checks,
    passed_count: passedCount,
    failed_count: failedCount,
    critical_failures: criticalFailures,
    max_position_size_pct: maxPositionSizePct,
    suggested_leverage: suggestedLeverage,
    risk_level: riskLevel,
    drawdown_limit_pct: drawdownLimitPct,
  };

  return {
    agent_name: 'risk',
    signal,
    score,
    confidence,
    reasoning: reasoningParts.join('\n'),
    data: riskData as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}

export type { RiskParams, RiskData, ShieldCheck };

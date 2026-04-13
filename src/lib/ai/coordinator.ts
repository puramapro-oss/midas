// =============================================================================
// MIDAS — Coordinator
// Recoit les resultats de tous les agents, calcule le score composite,
// envoie a Claude pour la decision finale, retourne CoordinatorDecision
// =============================================================================

import type {
  AgentResult,
  CoordinatorDecision,
  MarketRegime,
  Candle,
} from '@/lib/agents/types';
import type { RiskData, RiskParams } from '@/lib/agents/risk-agent';
import { analyzeTechnical } from '@/lib/agents/technical-agent';
import { analyzeSentiment } from '@/lib/agents/sentiment-agent';
import { analyzeOnChain } from '@/lib/agents/onchain-agent';
import { analyzeCalendar } from '@/lib/agents/calendar-agent';
import { analyzePatterns } from '@/lib/agents/pattern-agent';
import { analyzeRisk } from '@/lib/agents/risk-agent';
import { calculateCompositeScore } from '@/lib/ai/scoring';
import { analyzeConfluences, getDominantDirection, getConfluenceMultiplier } from '@/lib/ai/confluence-scoring';
import { calculateFinalWeights, weightsToRecord } from '@/lib/ai/dynamic-weighting';
import { askClaudeJSON } from '@/lib/ai/claude-client';

// --- Types ---

interface CoordinatorInput {
  pair: string;
  candles: Candle[];
  account_balance: number;
  current_drawdown_pct: number;
  open_positions: number;
  daily_trades_count: number;
  /** Drawdown 24h glissantes (optionnel — brief: max 3%) */
  daily_drawdown_pct?: number;
  /** Drawdown 7j glissants (optionnel — brief: max 7%) */
  weekly_drawdown_pct?: number;
  /** Exposition actuelle (% capital) sur le token de cette paire */
  current_token_exposure_pct?: number;
  /** Corrélation max avec une position ouverte (Pearson 0-1) */
  max_correlation_with_open_positions?: number;
}

interface ClaudeDecisionResponse {
  action: 'buy' | 'sell' | 'hold';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size_pct: number;
  strategy: string;
  reasoning: string;
  risk_reward_ratio: number;
}

// --- Constants ---

// Brief MIDAS-BRIEF-ULTIMATE.md — règles absolues du coordinateur
const COORDINATOR_SYSTEM_PROMPT = `Tu es le coordinateur de MIDAS, un système de trading crypto automatisé.
Tu reçois les analyses de 6 agents spécialisés (technical, sentiment, onchain, calendar, pattern, risk).

RÈGLES ABSOLUES (non négociables) :
1. Trade UNIQUEMENT si score composite > 0.7 (70%)
2. JAMAIS contre la tendance majeure (jamais BUY si prix < EMA200, jamais SELL si prix > EMA200)
3. Préservation du capital > gain
4. Ratio risk/reward minimum 1:2 (R/R ≥ 2.0)
5. Diversification : jamais > 20% du capital sur un seul token
6. Si l'agent RISK a un VETO (approved=false) → ANNULER le trade (HOLD)
7. Si moins de 4 confluences → HOLD
8. En cas de doute → HOLD

Réponds UNIQUEMENT en JSON valide :
{
  "action": "buy" | "sell" | "hold",
  "entry_price": number (prix actuel si buy/sell, 0 si hold),
  "stop_loss": number (calculer depuis ATR x 2, 0 si hold),
  "take_profit": number (R/R ratio minimum 2.0x, 0 si hold),
  "position_size_pct": number (max selon régime, 0 si hold),
  "strategy": "description courte",
  "reasoning": "explication en 3-5 phrases",
  "risk_reward_ratio": number
}`;

// Seuils du brief
const MIN_COMPOSITE_FOR_TRADE = 0.7; // brief : 70%
const MIN_RISK_REWARD = 2.0; // brief : 1:2
const MAX_TOKEN_EXPOSURE_PCT = 20; // brief : 20% max par token

// --- Helpers ---

function extractMarketRegime(agentResults: AgentResult[]): MarketRegime {
  const technical = agentResults.find((r) => r.agent_name === 'technical');
  if (technical?.data && typeof technical.data === 'object' && 'regime' in technical.data) {
    return technical.data.regime as MarketRegime;
  }
  return 'ranging';
}

function extractATR(agentResults: AgentResult[]): number {
  const technical = agentResults.find((r) => r.agent_name === 'technical');
  if (technical?.data && typeof technical.data === 'object' && 'atr_value' in technical.data) {
    return technical.data.atr_value as number;
  }
  return 0;
}

/**
 * Récupère le prix par rapport à l'EMA200 si disponible dans les données du technical agent.
 * Retourne 'above' | 'below' | 'unknown'.
 */
function extractEma200Position(agentResults: AgentResult[], currentPrice: number): 'above' | 'below' | 'unknown' {
  const technical = agentResults.find((r) => r.agent_name === 'technical');
  if (!technical?.data || typeof technical.data !== 'object') return 'unknown';
  const data = technical.data as Record<string, unknown>;
  const ema200 = (data.ema_200 ?? data.ema200 ?? data.long_term_ema) as number | undefined;
  if (typeof ema200 !== 'number' || ema200 <= 0) return 'unknown';
  return currentPrice >= ema200 ? 'above' : 'below';
}

function buildClaudeMessage(
  pair: string,
  agentResults: AgentResult[],
  compositeScore: number,
  compositeConfidence: number,
  confluenceMet: boolean,
  regime: MarketRegime,
  currentPrice: number,
  atr: number,
  shieldApproved: boolean
): string {
  const parts: string[] = [
    `# Analyse ${pair}`,
    `Prix actuel: ${currentPrice}`,
    `Regime: ${regime}`,
    `Score composite: ${compositeScore.toFixed(4)}`,
    `Confidence: ${(compositeConfidence * 100).toFixed(1)}%`,
    `Confluences: ${confluenceMet ? 'OUI (>=4)' : 'NON (<4)'}`,
    `SHIELD: ${shieldApproved ? 'APPROUVE' : 'REFUSE'}`,
    `ATR(14): ${atr.toFixed(6)}`,
    '',
    '## Resultats agents:',
  ];

  for (const result of agentResults) {
    parts.push(
      `### ${result.agent_name.toUpperCase()}`,
      `Signal: ${result.signal} | Score: ${result.score.toFixed(3)} | Confidence: ${(result.confidence * 100).toFixed(0)}%`,
      result.reasoning,
      ''
    );
  }

  return parts.join('\n');
}

// --- Main Coordinator ---

/**
 * Execute tous les agents en parallele, calcule le score composite,
 * et demande a Claude la decision finale.
 */
export async function coordinate(input: CoordinatorInput): Promise<CoordinatorDecision> {
  const { pair, candles, account_balance, current_drawdown_pct, open_positions, daily_trades_count } = input;

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  // Phase 1: Run all directional agents in parallel
  const [technicalResult, sentimentResult, onchainResult, calendarResult, patternResult] =
    await Promise.all([
      analyzeTechnical(pair, candles),
      analyzeSentiment(pair),
      analyzeOnChain(pair),
      analyzeCalendar(pair),
      analyzePatterns(pair, candles),
    ]);

  const directionalResults = [technicalResult, sentimentResult, onchainResult, calendarResult, patternResult];

  // Phase 2: Calculate composite score with dynamic weights
  const regime = extractMarketRegime(directionalResults);
  const weights = calculateFinalWeights(regime);
  const composite = calculateCompositeScore(directionalResults, weightsToRecord(weights));

  // Phase 3: Check confluences
  const confluence = analyzeConfluences(directionalResults);
  const dominantDirection = getDominantDirection(confluence);
  const confluenceMultiplier = getConfluenceMultiplier(confluence);

  // Phase 4: Preliminary action for risk check
  const atr = extractATR(directionalResults);
  let prelimAction: 'buy' | 'sell' | 'hold' = 'hold';
  let prelimStopLoss = currentPrice;
  let prelimTakeProfit = currentPrice;
  let prelimPositionSize = 0;

  if (confluence.met && Math.abs(composite.score) >= 0.2) {
    if (dominantDirection === 'bullish') {
      prelimAction = 'buy';
      prelimStopLoss = currentPrice - atr * 2;
      prelimTakeProfit = currentPrice + atr * 3;
      prelimPositionSize = Math.min(3, 1 + confluenceMultiplier);
    } else if (dominantDirection === 'bearish') {
      prelimAction = 'sell';
      prelimStopLoss = currentPrice + atr * 2;
      prelimTakeProfit = currentPrice - atr * 3;
      prelimPositionSize = Math.min(3, 1 + confluenceMultiplier);
    }
  }

  // Phase 5: Risk agent (MIDAS SHIELD)
  const riskParams: RiskParams = {
    pair,
    action: prelimAction === 'hold' ? 'buy' : prelimAction,
    entry_price: currentPrice,
    stop_loss: prelimStopLoss,
    take_profit: prelimTakeProfit,
    position_size_pct: prelimPositionSize,
    account_balance,
    current_drawdown_pct,
    daily_drawdown_pct: input.daily_drawdown_pct,
    weekly_drawdown_pct: input.weekly_drawdown_pct,
    open_positions,
    daily_trades_count,
    regime,
    candles,
    composite_score: composite.score,
    confidence: composite.confidence,
    max_correlation_with_open_positions: input.max_correlation_with_open_positions,
  };

  const riskResult = await analyzeRisk(riskParams);
  const allResults = [...directionalResults, riskResult];

  const riskData = riskResult.data as unknown as RiskData;
  const shieldApproved = riskData.approved;

  // Phase 6: Final decision via Claude
  const claudeMessage = buildClaudeMessage(
    pair,
    allResults,
    composite.score,
    composite.confidence,
    confluence.met,
    regime,
    currentPrice,
    atr,
    shieldApproved
  );

  let claudeDecision: ClaudeDecisionResponse;

  try {
    claudeDecision = await askClaudeJSON<ClaudeDecisionResponse>(
      COORDINATOR_SYSTEM_PROMPT,
      claudeMessage,
      2048
    );
  } catch {
    // Fallback: use rule-based decision if Claude fails
    claudeDecision = {
      action: shieldApproved && confluence.met && Math.abs(composite.score) >= 0.2 ? prelimAction : 'hold',
      entry_price: prelimAction !== 'hold' ? currentPrice : 0,
      stop_loss: prelimStopLoss,
      take_profit: prelimTakeProfit,
      position_size_pct: Math.min(prelimPositionSize, riskData.max_position_size_pct),
      strategy: `Fallback rule-based: ${dominantDirection} confluence ${confluence.met ? 'met' : 'not met'}`,
      reasoning: 'Decision basee sur les regles (Claude non disponible)',
      risk_reward_ratio: atr > 0 ? 1.5 : 0,
    };
  }

  // === BRIEF RULE 6 : VETO Shield ===
  if (!shieldApproved && claudeDecision.action !== 'hold') {
    claudeDecision.action = 'hold';
    claudeDecision.reasoning = `SHIELD VETO: ${claudeDecision.reasoning}`;
    claudeDecision.position_size_pct = 0;
  }

  // === BRIEF RULE 7 : confluences min ===
  if (!confluence.met && claudeDecision.action !== 'hold') {
    claudeDecision.action = 'hold';
    claudeDecision.reasoning = `Confluences insuffisantes (${confluence.points.length}/${confluence.min_required}): ${claudeDecision.reasoning}`;
    claudeDecision.position_size_pct = 0;
  }

  // === BRIEF RULE 1 : score composite > 70% ===
  if (Math.abs(composite.score) < MIN_COMPOSITE_FOR_TRADE && claudeDecision.action !== 'hold') {
    claudeDecision.action = 'hold';
    claudeDecision.reasoning = `Score composite ${(Math.abs(composite.score) * 100).toFixed(1)}% < seuil ${MIN_COMPOSITE_FOR_TRADE * 100}% requis. ${claudeDecision.reasoning}`;
    claudeDecision.position_size_pct = 0;
  }

  // === BRIEF RULE 2 : jamais contre la tendance EMA200 ===
  const ema200Pos = extractEma200Position(allResults, currentPrice);
  if (ema200Pos === 'below' && claudeDecision.action === 'buy') {
    claudeDecision.action = 'hold';
    claudeDecision.reasoning = `BLOQUE: BUY interdit sous EMA200 (tendance majeure baissière). ${claudeDecision.reasoning}`;
    claudeDecision.position_size_pct = 0;
  } else if (ema200Pos === 'above' && claudeDecision.action === 'sell') {
    claudeDecision.action = 'hold';
    claudeDecision.reasoning = `BLOQUE: SELL interdit au-dessus EMA200 (tendance majeure haussière). ${claudeDecision.reasoning}`;
    claudeDecision.position_size_pct = 0;
  }

  // === BRIEF RULE 4 : R/R ≥ 2.0 ===
  const provRisk = Math.abs(claudeDecision.entry_price - claudeDecision.stop_loss);
  const provReward = Math.abs(claudeDecision.take_profit - claudeDecision.entry_price);
  const provRRR = provRisk > 0 ? provReward / provRisk : 0;
  if (claudeDecision.action !== 'hold' && provRRR < MIN_RISK_REWARD) {
    // Auto-ajuster le take-profit pour atteindre 2.0
    if (claudeDecision.action === 'buy') {
      claudeDecision.take_profit = claudeDecision.entry_price + provRisk * MIN_RISK_REWARD;
    } else {
      claudeDecision.take_profit = claudeDecision.entry_price - provRisk * MIN_RISK_REWARD;
    }
  }

  // === BRIEF RULE 5 : diversification — max 20% par token ===
  const currentExposure = input.current_token_exposure_pct ?? 0;
  const maxAdditional = Math.max(0, MAX_TOKEN_EXPOSURE_PCT - currentExposure);
  if (claudeDecision.position_size_pct > maxAdditional) {
    claudeDecision.position_size_pct = maxAdditional;
    if (maxAdditional === 0) {
      claudeDecision.action = 'hold';
      claudeDecision.reasoning = `Exposition ${pair} déjà à ${currentExposure.toFixed(1)}% (max ${MAX_TOKEN_EXPOSURE_PCT}%). ${claudeDecision.reasoning}`;
    }
  }

  // Cap position size par le SHIELD
  if (claudeDecision.position_size_pct > riskData.max_position_size_pct) {
    claudeDecision.position_size_pct = riskData.max_position_size_pct;
  }

  // Calculate actual risk/reward ratio
  const riskAmount = Math.abs(claudeDecision.entry_price - claudeDecision.stop_loss);
  const rewardAmount = Math.abs(claudeDecision.take_profit - claudeDecision.entry_price);
  const actualRRR = riskAmount > 0 ? rewardAmount / riskAmount : 0;

  return {
    action: claudeDecision.action,
    pair,
    composite_score: composite.score,
    confidence: composite.confidence,
    entry_price: claudeDecision.entry_price,
    stop_loss: claudeDecision.stop_loss,
    take_profit: claudeDecision.take_profit,
    position_size_pct: claudeDecision.position_size_pct,
    strategy: claudeDecision.strategy,
    reasoning: claudeDecision.reasoning,
    agent_results: allResults,
    risk_reward_ratio: actualRRR,
    approved_by_shield: shieldApproved,
  };
}

export type { CoordinatorInput };

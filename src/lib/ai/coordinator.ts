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

const COORDINATOR_SYSTEM_PROMPT = `Tu es le coordinateur de MIDAS, un systeme de trading crypto automatise.
Tu recois les analyses de 5 agents specialises et tu dois prendre la decision finale.

REGLES ABSOLUES:
1. JAMAIS de trade si le MIDAS SHIELD n'approuve pas
2. JAMAIS de trade si moins de 4 confluences
3. Score composite minimum de 0.2 pour un trade
4. Le risk/reward ratio doit etre >= 1.5
5. En cas de doute, HOLD

Tu dois repondre UNIQUEMENT en JSON valide:
{
  "action": "buy" | "sell" | "hold",
  "entry_price": number (prix actuel si buy/sell, 0 si hold),
  "stop_loss": number (calculer depuis ATR, 0 si hold),
  "take_profit": number (R/R ratio minimum 1.5x, 0 si hold),
  "position_size_pct": number (max selon regime, 0 si hold),
  "strategy": "description courte de la strategie",
  "reasoning": "explication en 3-5 phrases",
  "risk_reward_ratio": number
}`;

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
    open_positions,
    daily_trades_count,
    regime,
    candles,
    composite_score: composite.score,
    confidence: composite.confidence,
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

  // Override: if shield rejected, force hold
  if (!shieldApproved && claudeDecision.action !== 'hold') {
    claudeDecision.action = 'hold';
    claudeDecision.reasoning = `SHIELD REFUSE: ${claudeDecision.reasoning}`;
    claudeDecision.position_size_pct = 0;
  }

  // Override: if confluences not met, force hold
  if (!confluence.met && claudeDecision.action !== 'hold') {
    claudeDecision.action = 'hold';
    claudeDecision.reasoning = `Confluences insuffisantes (${confluence.points.length}/${confluence.min_required}): ${claudeDecision.reasoning}`;
    claudeDecision.position_size_pct = 0;
  }

  // Cap position size
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

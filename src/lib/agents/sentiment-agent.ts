// =============================================================================
// MIDAS — Sentiment Analysis Agent
// Analyse CryptoPanic news + Fear & Greed Index via Claude pour scoring
// =============================================================================

import type { AgentResult } from '@/lib/agents/types';
import { getNews, calculateNewsSentiment } from '@/lib/data/cryptopanic';
import { getCurrentIndex, fearGreedToSignal } from '@/lib/data/fear-greed';
import { askClaudeJSON } from '@/lib/ai/claude-client';

// --- Types ---

interface SentimentClaudeResponse {
  overall_sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number;
  confidence: number;
  key_themes: string[];
  risk_events: string[];
  reasoning: string;
}

interface SentimentData {
  fear_greed_value: number;
  fear_greed_classification: string;
  fear_greed_signal: string;
  news_sentiment_score: number;
  news_bullish_count: number;
  news_bearish_count: number;
  news_total: number;
  claude_analysis: SentimentClaudeResponse | null;
  headlines: string[];
}

// --- Constants ---

const FEAR_GREED_WEIGHT = 0.35;
const NEWS_WEIGHT = 0.30;
const CLAUDE_WEIGHT = 0.35;

const SENTIMENT_SYSTEM_PROMPT = `Tu es un analyste de sentiment crypto expert pour MIDAS, un systeme de trading automatise.

Analyse les titres d'actualites crypto et le Fear & Greed Index pour determiner le sentiment du marche.

Reponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "overall_sentiment": "bullish" | "bearish" | "neutral",
  "score": number entre -1.0 (tres bearish) et 1.0 (tres bullish),
  "confidence": number entre 0.0 et 1.0,
  "key_themes": ["theme1", "theme2", ...],
  "risk_events": ["event1", ...] ou [],
  "reasoning": "Explication concise en 2-3 phrases"
}

Regles:
- Score entre -1.0 et 1.0
- Confidence entre 0.0 et 1.0
- Prends en compte les biais contrarians: Extreme Fear peut etre un signal d'achat
- Identifie les evenements a risque (hacks, regulations, liquidations massives)
- Ne sois pas influence par le volume de news, mais par leur qualite/impact`;

// --- Helper: extract coin symbol from pair ---

function extractCoinSymbol(pair: string): string {
  // "BTC/USDT" -> "BTC", "ETH/USD" -> "ETH"
  const slash = pair.indexOf('/');
  return slash > 0 ? pair.substring(0, slash) : pair;
}

// --- Main Agent Function ---

/**
 * Analyse le sentiment du marche pour une paire donnee.
 * Combine Fear & Greed Index, news CryptoPanic, et analyse Claude.
 */
export async function analyzeSentiment(pair: string): Promise<AgentResult> {
  const coin = extractCoinSymbol(pair);

  // Fetch data en parallele
  const [fearGreedResult, newsResult] = await Promise.allSettled([
    getCurrentIndex(),
    getNews({ currencies: coin, kind: 'news' }).catch(() => []),
  ]);

  // Fear & Greed
  let fearGreedValue = 50;
  let fearGreedClassification = 'Neutral';
  let fearGreedSignal = fearGreedToSignal(50);

  if (fearGreedResult.status === 'fulfilled') {
    fearGreedValue = fearGreedResult.value.value;
    fearGreedClassification = fearGreedResult.value.value_classification;
    fearGreedSignal = fearGreedToSignal(fearGreedValue);
  }

  // News
  const newsPosts = newsResult.status === 'fulfilled' ? newsResult.value : [];
  const newsSentiment = calculateNewsSentiment(newsPosts);
  const headlines = newsPosts.slice(0, 15).map((p) => p.title);

  // Claude analysis (si on a des donnees)
  let claudeAnalysis: SentimentClaudeResponse | null = null;

  if (headlines.length > 0) {
    try {
      const userMessage = [
        `Paire analysee: ${pair}`,
        `Fear & Greed Index: ${fearGreedValue} (${fearGreedClassification})`,
        `Score sentiment news brut: ${newsSentiment.score.toFixed(3)}`,
        `News haussiers: ${newsSentiment.bullish_count}, baissiers: ${newsSentiment.bearish_count}`,
        '',
        'Titres recents:',
        ...headlines.map((h, i) => `${i + 1}. ${h}`),
      ].join('\n');

      claudeAnalysis = await askClaudeJSON<SentimentClaudeResponse>(
        SENTIMENT_SYSTEM_PROMPT,
        userMessage,
        2048
      );
    } catch {
      // Claude non disponible — on continue avec les donnees brutes
      claudeAnalysis = null;
    }
  }

  // Score composite
  const fearGreedScore = fearGreedSignal.signal === 'bullish'
    ? fearGreedSignal.strength
    : fearGreedSignal.signal === 'bearish'
      ? -fearGreedSignal.strength
      : 0;

  const newsScore = newsSentiment.score;
  const claudeScore = claudeAnalysis?.score ?? 0;
  const claudeActualWeight = claudeAnalysis ? CLAUDE_WEIGHT : 0;

  const totalWeight = FEAR_GREED_WEIGHT + NEWS_WEIGHT + claudeActualWeight;
  const compositeScore = totalWeight > 0
    ? (fearGreedScore * FEAR_GREED_WEIGHT + newsScore * NEWS_WEIGHT + claudeScore * claudeActualWeight) / totalWeight
    : 0;

  // Confidence
  const baseConfidence = claudeAnalysis?.confidence ?? 0.4;
  const dataQuality = headlines.length > 5 ? 1.0 : headlines.length > 0 ? 0.7 : 0.3;
  const confidence = Math.min(0.9, baseConfidence * dataQuality);

  // Signal
  let signal: AgentResult['signal'];
  if (compositeScore > 0.15) {
    signal = 'bullish';
  } else if (compositeScore < -0.15) {
    signal = 'bearish';
  } else {
    signal = 'neutral';
  }

  // Reasoning
  const reasoningParts = [
    `Sentiment ${pair} — F&G: ${fearGreedValue} (${fearGreedClassification})`,
    `News: ${newsSentiment.bullish_count} bull / ${newsSentiment.bearish_count} bear sur ${newsSentiment.total_posts}`,
  ];

  if (claudeAnalysis) {
    reasoningParts.push(`Claude: ${claudeAnalysis.reasoning}`);
    if (claudeAnalysis.risk_events.length > 0) {
      reasoningParts.push(`Risques: ${claudeAnalysis.risk_events.join(', ')}`);
    }
  }

  reasoningParts.push(`Score composite: ${compositeScore.toFixed(3)} | Signal: ${signal.toUpperCase()}`);

  const sentimentData: SentimentData = {
    fear_greed_value: fearGreedValue,
    fear_greed_classification: fearGreedClassification,
    fear_greed_signal: fearGreedSignal.signal,
    news_sentiment_score: newsSentiment.score,
    news_bullish_count: newsSentiment.bullish_count,
    news_bearish_count: newsSentiment.bearish_count,
    news_total: newsSentiment.total_posts,
    claude_analysis: claudeAnalysis,
    headlines,
  };

  return {
    agent_name: 'sentiment',
    signal,
    score: compositeScore,
    confidence,
    reasoning: reasoningParts.join('\n'),
    data: sentimentData as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}

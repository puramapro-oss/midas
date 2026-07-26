// =============================================================================
// MIDAS — Sentiment Analysis Agent
// Analyse cryptocurrency.cv news + Fear & Greed Index via Claude pour scoring
// =============================================================================

import type { AgentResult } from '@/lib/agents/types';
import { getCurrentIndex, fearGreedToSignal } from '@/lib/data/fear-greed';
import { fetchCryptoNews } from '@/lib/data/newsapi';
import { fetchCryptoTrends } from '@/lib/data/google-trends';
import { fetchFreeCryptoNews, coinToNewsCategory } from '@/lib/data/free-crypto-news';
import { getCryptoSubredditPosts, analyzeRedditSentiment } from '@/lib/data/reddit';
import { getTrendingCryptoVideos, analyzeYouTubeSentiment } from '@/lib/data/youtube';
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
  news_total: number;
  claude_analysis: SentimentClaudeResponse | null;
  headlines: string[];
  sources: {
    newsapi: { score: number; bullish: number; bearish: number } | null;
    reddit: { score: number; posts: number };
    youtube: { score: number; videos: number };
    google_trends: { bitcoin: number | null; ethereum: number | null; crypto: number | null; fomoIndex: number } | null;
    free_crypto_news: { items: number };
  };
}

// --- Constants ---

// 5 sources chiffrees : F&G, NewsAPI, Reddit, YouTube, Google Trends
// + Claude synthesis layer (lit les headlines cryptocurrency.cv, sans score de sentiment natif —
// l'offre gratuite ne fournit pas de classification bullish/bearish, contrairement a CryptoPanic
// (devenu payant) : le poids qui lui revenait est reporte sur Claude plutot que d'inventer un score).
const W_FEAR_GREED = 0.20;
const W_NEWSAPI = 0.15;
const W_REDDIT = 0.10;
const W_YOUTUBE = 0.05;
const W_TRENDS = 0.05;
const W_CLAUDE = 0.45;
// Brief: F&G < 20 → contrarian buy, > 80 → danger
function fearGreedContrarian(value: number): number {
  if (value < 20) return 0.6; // extreme fear → bullish bias
  if (value > 80) return -0.6; // euphoria → bearish bias
  // linéaire entre les deux
  return (50 - value) / 50;
}

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
 * Combine Fear & Greed Index, news cryptocurrency.cv, et analyse Claude.
 */
export async function analyzeSentiment(pair: string): Promise<AgentResult> {
  const coin = extractCoinSymbol(pair);
  const newsCategory = coinToNewsCategory(coin);

  // Fetch des 6 sources en parallèle (résilient — chaque source peut échouer)
  const [
    fearGreedResult,
    newsApiResult,
    redditResult,
    youtubeResult,
    trendsResult,
    fcnResult,
  ] = await Promise.allSettled([
    getCurrentIndex(),
    fetchCryptoNews(`${coin} OR bitcoin OR crypto`, 30).catch(() => null),
    getCryptoSubredditPosts(['CryptoCurrency', 'Bitcoin', 'CryptoMarkets'], 15).catch(() => []),
    getTrendingCryptoVideos(coin, 20).catch(() => []),
    fetchCryptoTrends().catch(() => null),
    fetchFreeCryptoNews(newsCategory).catch(() => []),
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

  // cryptocurrency.cv — headlines brutes (pas de score natif, voir constants)
  const fcnItems = fcnResult.status === 'fulfilled' ? fcnResult.value : [];
  const headlines = fcnItems.slice(0, 15).map((i) => i.title);

  // NewsAPI mainstream
  const newsApi = newsApiResult.status === 'fulfilled' ? newsApiResult.value : null;
  const newsApiScore = newsApi ? newsApi.sentimentScore / 100 : 0; // -1..+1

  // Reddit
  const redditPosts = redditResult.status === 'fulfilled' ? redditResult.value : [];
  const redditSent = analyzeRedditSentiment(redditPosts);
  const redditScore = typeof redditSent.score === 'number' ? Math.max(-1, Math.min(1, redditSent.score)) : 0;

  // YouTube
  const ytVideos = youtubeResult.status === 'fulfilled' ? youtubeResult.value : [];
  const ytSent = analyzeYouTubeSentiment(ytVideos);
  const ytScore = typeof ytSent.score === 'number' ? Math.max(-1, Math.min(1, ytSent.score)) : 0;

  // Google Trends FOMO
  const trends = trendsResult.status === 'fulfilled' ? trendsResult.value : null;
  // FOMO élevé = signal contrariant (le retail est dans le trade → souvent un top)
  const trendsScore = trends ? -((trends.fomoIndex - 50) / 100) : 0;

  // Claude analysis (si on a des donnees)
  let claudeAnalysis: SentimentClaudeResponse | null = null;

  if (headlines.length > 0) {
    try {
      const userMessage = [
        `Paire analysee: ${pair}`,
        `Fear & Greed Index: ${fearGreedValue} (${fearGreedClassification})`,
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

  // Score composite (5 dimensions chiffrees + Claude)
  const fearGreedScore = fearGreedContrarian(fearGreedValue);
  const claudeScore = claudeAnalysis?.score ?? 0;
  const claudeActualWeight = claudeAnalysis ? W_CLAUDE : 0;

  const totalWeight = W_FEAR_GREED + W_NEWSAPI + W_REDDIT + W_YOUTUBE + W_TRENDS + claudeActualWeight;

  const compositeScore =
    totalWeight > 0
      ? (fearGreedScore * W_FEAR_GREED +
          newsApiScore * W_NEWSAPI +
          redditScore * W_REDDIT +
          ytScore * W_YOUTUBE +
          trendsScore * W_TRENDS +
          claudeScore * claudeActualWeight) /
        totalWeight
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
    `News: ${headlines.length} titres analyses (cryptocurrency.cv)`,
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
    news_total: headlines.length,
    claude_analysis: claudeAnalysis,
    headlines,
    sources: {
      newsapi: newsApi
        ? { score: newsApiScore, bullish: newsApi.bullishCount, bearish: newsApi.bearishCount }
        : null,
      reddit: { score: redditScore, posts: redditPosts.length },
      youtube: { score: ytScore, videos: ytVideos.length },
      google_trends: trends,
      free_crypto_news: { items: fcnItems.length },
    },
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

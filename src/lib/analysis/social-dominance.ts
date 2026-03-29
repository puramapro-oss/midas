// =============================================================================
// MIDAS — Social Dominance Analysis
// Hype cycle detection, Fear & Greed contrarian signal, Google Trends
// =============================================================================

// --- Types ---

export type HypeCyclePhase = 'pre_hype' | 'early_hype' | 'peak_hype' | 'post_hype' | 'stable';

export interface SocialMetrics {
  social_volume_24h: number;           // Number of mentions
  social_volume_avg_7d: number;        // Average mentions over 7 days
  social_volume_avg_30d: number;       // Average mentions over 30 days
  sentiment_score: number;             // -1 to 1
  fear_greed_index: number;            // 0-100
  google_trends_score: number;         // 0-100 (relative interest)
  google_trends_prev_week: number;     // Previous week score
  twitter_mentions_24h: number;
  twitter_mentions_avg_7d: number;
  reddit_activity_score: number;       // 0-100
  influencer_mentions_24h: number;     // Major influencer mentions
  news_articles_24h: number;
  news_sentiment: number;              // -1 to 1
}

export interface SocialDominanceAnalysis {
  hype_phase: HypeCyclePhase;
  hype_intensity: number;              // 0-1
  fear_greed_signal: 'bullish' | 'bearish' | 'neutral';
  fear_greed_interpretation: string;
  social_volume_anomaly: boolean;
  social_volume_ratio: number;         // Current vs 30d average
  sentiment_divergence: boolean;       // Price going one way, sentiment the other
  google_trends_signal: 'rising' | 'falling' | 'stable';
  influencer_alert: boolean;           // Spike in influencer mentions
  overall_signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  contrarian_warning: string | null;
}

// --- Hype Cycle Detection ---

function detectHypeCycle(metrics: SocialMetrics): { phase: HypeCyclePhase; intensity: number } {
  const volumeRatio30d = metrics.social_volume_avg_30d > 0
    ? metrics.social_volume_24h / metrics.social_volume_avg_30d
    : 1;

  const volumeRatio7d = metrics.social_volume_avg_7d > 0
    ? metrics.social_volume_24h / metrics.social_volume_avg_7d
    : 1;

  const trendChange = metrics.google_trends_score - metrics.google_trends_prev_week;
  const sentimentExtreme = Math.abs(metrics.sentiment_score) > 0.7;

  // Peak hype: volume >3x average, extreme sentiment, high Google trends
  if (
    volumeRatio30d > 3 &&
    sentimentExtreme &&
    metrics.google_trends_score > 75
  ) {
    return { phase: 'peak_hype', intensity: Math.min(1, volumeRatio30d / 5) };
  }

  // Early hype: volume rising rapidly, sentiment turning positive
  if (
    volumeRatio30d > 1.5 &&
    volumeRatio7d > 1.3 &&
    trendChange > 10 &&
    metrics.sentiment_score > 0.3
  ) {
    return { phase: 'early_hype', intensity: Math.min(1, volumeRatio30d / 3) };
  }

  // Post hype: volume was high but declining, sentiment cooling
  if (
    volumeRatio7d < 0.8 &&
    volumeRatio30d > 1.2 &&
    trendChange < -5
  ) {
    return { phase: 'post_hype', intensity: Math.min(1, volumeRatio30d / 2) };
  }

  // Pre hype: low volume, starting to tick up
  if (
    volumeRatio30d < 1.3 &&
    volumeRatio7d > 1.1 &&
    trendChange > 5
  ) {
    return { phase: 'pre_hype', intensity: 0.2 };
  }

  return { phase: 'stable', intensity: 0 };
}

// --- Fear & Greed Contrarian Signal ---

function analyzeFearGreed(index: number): {
  signal: 'bullish' | 'bearish' | 'neutral';
  interpretation: string;
} {
  // Contrarian: extreme fear = buy opportunity, extreme greed = sell signal
  if (index <= 10) {
    return {
      signal: 'bullish',
      interpretation: `Fear & Greed ${index} — Peur extreme, capitulation, forte opportunite contrarian`,
    };
  }
  if (index <= 25) {
    return {
      signal: 'bullish',
      interpretation: `Fear & Greed ${index} — Peur, le marche est pessimiste, potentiel rebond`,
    };
  }
  if (index <= 45) {
    return {
      signal: 'neutral',
      interpretation: `Fear & Greed ${index} — Zone de prudence, sentiment legerement negatif`,
    };
  }
  if (index <= 55) {
    return {
      signal: 'neutral',
      interpretation: `Fear & Greed ${index} — Sentiment neutre`,
    };
  }
  if (index <= 75) {
    return {
      signal: 'neutral',
      interpretation: `Fear & Greed ${index} — Avidite moderee, marche optimiste`,
    };
  }
  if (index <= 90) {
    return {
      signal: 'bearish',
      interpretation: `Fear & Greed ${index} — Avidite, risque de correction contrarian`,
    };
  }
  return {
    signal: 'bearish',
    interpretation: `Fear & Greed ${index} — Avidite extreme, sommet probable, signal contrarian fort`,
  };
}

// --- Main Analysis ---

export function analyzeSocialDominance(metrics: SocialMetrics): SocialDominanceAnalysis {
  // Hype cycle
  const hype = detectHypeCycle(metrics);

  // Fear & Greed
  const fearGreed = analyzeFearGreed(metrics.fear_greed_index);

  // Social volume anomaly
  const socialVolumeRatio = metrics.social_volume_avg_30d > 0
    ? metrics.social_volume_24h / metrics.social_volume_avg_30d
    : 1;
  const socialVolumeAnomaly = socialVolumeRatio > 2.5;

  // Google trends signal
  const trendDelta = metrics.google_trends_score - metrics.google_trends_prev_week;
  let googleTrendsSignal: 'rising' | 'falling' | 'stable';
  if (trendDelta > 10) googleTrendsSignal = 'rising';
  else if (trendDelta < -10) googleTrendsSignal = 'falling';
  else googleTrendsSignal = 'stable';

  // Influencer alert: spike in influencer mentions (often precedes retail FOMO)
  const influencerAlert = metrics.influencer_mentions_24h > 5;

  // Sentiment divergence placeholder (would need price data to fully compute)
  // For now, flag if sentiment is extremely positive (potential top signal)
  const sentimentDivergence = metrics.sentiment_score > 0.8 && metrics.fear_greed_index > 75;

  // Contrarian warning
  let contrarianWarning: string | null = null;
  if (hype.phase === 'peak_hype' && metrics.fear_greed_index > 80) {
    contrarianWarning = 'Hype maximale + avidite extreme — risque eleve de retournement';
  } else if (metrics.fear_greed_index <= 15 && socialVolumeRatio < 0.5) {
    contrarianWarning = 'Peur extreme + silence social — potentielle zone de capitulation (achat contrarian)';
  } else if (influencerAlert && hype.phase === 'peak_hype') {
    contrarianWarning = 'Influenceurs en masse + peak hype — retail FOMO, potentiel top local';
  }

  // Overall signal (contrarian-weighted)
  let score = 0;

  // Fear & Greed contrarian
  const fgMap = { bullish: 1, bearish: -1, neutral: 0 };
  score += fgMap[fearGreed.signal] * 2;

  // Hype phase contrarian
  if (hype.phase === 'peak_hype') score -= 1.5; // Peak hype = sell signal
  else if (hype.phase === 'post_hype') score -= 0.5;
  else if (hype.phase === 'pre_hype') score += 0.5;

  // News sentiment (slight contrarian at extremes)
  if (metrics.news_sentiment > 0.7) score -= 0.5;
  else if (metrics.news_sentiment < -0.7) score += 0.5;

  let overallSignal: 'bullish' | 'bearish' | 'neutral';
  if (score >= 1.5) overallSignal = 'bullish';
  else if (score <= -1.5) overallSignal = 'bearish';
  else overallSignal = 'neutral';

  const confidence = Math.min(0.7, 0.3 + Math.abs(score) * 0.1 + (contrarianWarning ? 0.1 : 0));

  return {
    hype_phase: hype.phase,
    hype_intensity: Math.round(hype.intensity * 100) / 100,
    fear_greed_signal: fearGreed.signal,
    fear_greed_interpretation: fearGreed.interpretation,
    social_volume_anomaly: socialVolumeAnomaly,
    social_volume_ratio: Math.round(socialVolumeRatio * 100) / 100,
    sentiment_divergence: sentimentDivergence,
    google_trends_signal: googleTrendsSignal,
    influencer_alert: influencerAlert,
    overall_signal: overallSignal,
    confidence,
    contrarian_warning: contrarianWarning,
  };
}

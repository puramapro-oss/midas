// =============================================================================
// MIDAS — YouTube Trending Crypto Provider
// Recupere les videos crypto tendances via YouTube Data API v3
// =============================================================================

const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RESULTS = 20;

export interface CryptoVideo {
  id: string;
  title: string;
  channel_name: string;
  channel_id: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  description_excerpt: string;
  thumbnail_url: string;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    description: string;
    thumbnails: {
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
  pageInfo: { totalResults: number; resultsPerPage: number };
}

interface YouTubeVideoStatsItem {
  id: string;
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

interface YouTubeVideoStatsResponse {
  items: YouTubeVideoStatsItem[];
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('[MIDAS:YouTube] YOUTUBE_API_KEY manquante');
  }
  return key;
}

async function fetchYouTube<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${YOUTUBE_BASE}${endpoint}`);
  url.searchParams.set('key', getApiKey());

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown');
      throw new Error(
        `[MIDAS:YouTube] HTTP ${response.status} sur ${endpoint}: ${body.slice(0, 200)}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `[MIDAS:YouTube] Timeout sur ${endpoint} apres ${REQUEST_TIMEOUT_MS}ms`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Recupere les videos crypto tendances depuis YouTube.
 * Fallback vers un tableau vide si l'API est indisponible.
 * @param query - Terme de recherche (defaut: 'crypto trading analysis')
 * @param maxResults - Nombre max de resultats (defaut: 20)
 */
export async function getTrendingCryptoVideos(
  query: string = 'crypto trading analysis',
  maxResults: number = DEFAULT_MAX_RESULTS
): Promise<CryptoVideo[]> {
  try {
    const publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const searchData = await fetchYouTube<YouTubeSearchResponse>('/search', {
      part: 'snippet',
      q: query,
      type: 'video',
      order: 'viewCount',
      maxResults: String(Math.min(50, Math.max(1, maxResults))),
      publishedAfter,
      relevanceLanguage: 'en',
      videoDuration: 'medium',
    });

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    const videoIds = searchData.items.map((item) => item.id.videoId).join(',');

    const statsData = await fetchYouTube<YouTubeVideoStatsResponse>('/videos', {
      part: 'statistics',
      id: videoIds,
    });

    const statsMap = new Map<string, YouTubeVideoStatsItem>();
    for (const item of statsData.items) {
      statsMap.set(item.id, item);
    }

    return searchData.items.map((item): CryptoVideo => {
      const stats = statsMap.get(item.id.videoId);
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        channel_name: item.snippet.channelTitle,
        channel_id: item.snippet.channelId,
        published_at: item.snippet.publishedAt,
        view_count: stats ? parseInt(stats.statistics.viewCount, 10) : 0,
        like_count: stats ? parseInt(stats.statistics.likeCount, 10) : 0,
        comment_count: stats ? parseInt(stats.statistics.commentCount, 10) : 0,
        description_excerpt: item.snippet.description.slice(0, 300),
        thumbnail_url:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Analyse le sentiment des videos YouTube crypto.
 * Un ratio views/likes eleve + commentaires = engagement fort.
 */
export function analyzeYouTubeSentiment(videos: CryptoVideo[]): {
  score: number;
  total_views: number;
  total_engagement: number;
  bullish_titles: number;
  bearish_titles: number;
  trending_topics: string[];
} {
  if (videos.length === 0) {
    return {
      score: 0,
      total_views: 0,
      total_engagement: 0,
      bullish_titles: 0,
      bearish_titles: 0,
      trending_topics: [],
    };
  }

  const bullishKeywords = [
    'bull', 'moon', 'pump', 'buy', 'long', 'breakout',
    'rally', 'surge', '100x', 'millionaire', 'bullish',
    'altseason', 'parabolic', 'explosion',
  ];

  const bearishKeywords = [
    'bear', 'crash', 'dump', 'sell', 'short', 'scam',
    'bubble', 'warning', 'collapse', 'bearish', 'fear',
    'correction', 'dead', 'panic',
  ];

  let bullishTitles = 0;
  let bearishTitles = 0;
  let totalViews = 0;
  let totalEngagement = 0;
  let weightedScore = 0;
  const topicCounts: Record<string, number> = {};

  for (const video of videos) {
    const titleLower = video.title.toLowerCase();
    const engagement = video.view_count + video.like_count * 10 + video.comment_count * 5;
    const weight = Math.log10(Math.max(10, engagement));

    totalViews += video.view_count;
    totalEngagement += engagement;

    const bullishHits = bullishKeywords.filter((kw) => titleLower.includes(kw)).length;
    const bearishHits = bearishKeywords.filter((kw) => titleLower.includes(kw)).length;

    if (bullishHits > bearishHits) {
      bullishTitles++;
      weightedScore += weight;
    } else if (bearishHits > bullishHits) {
      bearishTitles++;
      weightedScore -= weight;
    }

    const coinMatches = titleLower.match(
      /\b(btc|bitcoin|eth|ethereum|sol|solana|xrp|ada|bnb|avax|cardano|polkadot)\b/g
    );
    if (coinMatches) {
      for (const coin of coinMatches) {
        const normalized = coin.toUpperCase();
        topicCounts[normalized] = (topicCounts[normalized] ?? 0) + 1;
      }
    }
  }

  const maxWeight = videos.length * Math.log10(Math.max(10, totalEngagement / videos.length));
  const normalizedScore =
    maxWeight > 0 ? Math.max(-1, Math.min(1, weightedScore / maxWeight)) : 0;

  const trendingTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  return {
    score: normalizedScore,
    total_views: totalViews,
    total_engagement: totalEngagement,
    bullish_titles: bullishTitles,
    bearish_titles: bearishTitles,
    trending_topics: trendingTopics,
  };
}

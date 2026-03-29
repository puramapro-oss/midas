// =============================================================================
// MIDAS — Reddit Data Provider
// Recupere les posts populaires de subreddits crypto pour analyse de sentiment
// =============================================================================

const REDDIT_BASE = 'https://www.reddit.com';
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_LIMIT = 25;

const CRYPTO_SUBREDDITS = [
  'cryptocurrency',
  'bitcoin',
  'ethereum',
  'CryptoMarkets',
  'altcoin',
  'solana',
] as const;

export type CryptoSubreddit = (typeof CRYPTO_SUBREDDITS)[number];

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  author: string;
  created_utc: number;
  url: string;
  selftext_excerpt: string;
  flair: string;
  is_stickied: boolean;
}

interface RedditRawPost {
  data: {
    id: string;
    title: string;
    subreddit: string;
    score: number;
    upvote_ratio: number;
    num_comments: number;
    author: string;
    created_utc: number;
    url: string;
    selftext: string;
    link_flair_text: string | null;
    stickied: boolean;
  };
}

interface RedditListingResponse {
  data: {
    children: RedditRawPost[];
    after: string | null;
  };
}

function mapPost(raw: RedditRawPost): RedditPost {
  return {
    id: raw.data.id,
    title: raw.data.title,
    subreddit: raw.data.subreddit,
    score: raw.data.score,
    upvote_ratio: raw.data.upvote_ratio,
    num_comments: raw.data.num_comments,
    author: raw.data.author,
    created_utc: raw.data.created_utc,
    url: raw.data.url,
    selftext_excerpt: raw.data.selftext.slice(0, 300),
    flair: raw.data.link_flair_text ?? '',
    is_stickied: raw.data.stickied,
  };
}

async function fetchReddit<T>(path: string): Promise<T> {
  const url = `${REDDIT_BASE}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MIDAS-Trading-Bot/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown');
      throw new Error(
        `[MIDAS:Reddit] HTTP ${response.status} sur ${path}: ${body.slice(0, 200)}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`[MIDAS:Reddit] Timeout sur ${path} apres ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Recupere les posts populaires d'un subreddit.
 * @param subreddit - Nom du subreddit (sans le r/)
 * @param limit - Nombre de posts (defaut: 25, max: 100)
 */
export async function getHotPosts(
  subreddit: string,
  limit: number = DEFAULT_LIMIT
): Promise<RedditPost[]> {
  try {
    const clampedLimit = Math.min(100, Math.max(1, limit));
    const data = await fetchReddit<RedditListingResponse>(
      `/r/${subreddit}/hot.json?limit=${clampedLimit}&raw_json=1`
    );

    if (!data.data?.children) {
      return [];
    }

    return data.data.children
      .map(mapPost)
      .filter((post) => !post.is_stickied);
  } catch {
    return [];
  }
}

/**
 * Recupere les posts de plusieurs subreddits crypto en parallele.
 */
export async function getCryptoSubredditPosts(
  subreddits: string[] = [...CRYPTO_SUBREDDITS],
  limitPerSub: number = 15
): Promise<RedditPost[]> {
  const results = await Promise.allSettled(
    subreddits.map((sub) => getHotPosts(sub, limitPerSub))
  );

  const allPosts: RedditPost[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allPosts.push(...result.value);
    }
  }

  return allPosts.sort((a, b) => b.score - a.score);
}

/**
 * Analyse le sentiment des posts Reddit crypto.
 * Utilise le score, ratio d'upvotes et mots-cles dans les titres.
 */
export function analyzeRedditSentiment(posts: RedditPost[]): {
  score: number;
  bullish_posts: number;
  bearish_posts: number;
  neutral_posts: number;
  total_engagement: number;
  top_topics: string[];
} {
  if (posts.length === 0) {
    return {
      score: 0,
      bullish_posts: 0,
      bearish_posts: 0,
      neutral_posts: 0,
      total_engagement: 0,
      top_topics: [],
    };
  }

  const bullishKeywords = [
    'bull', 'moon', 'pump', 'buy', 'long', 'breakout', 'ath',
    'rally', 'surge', 'rocket', 'gains', 'bullish', 'adoption',
    'institutional', 'accumulate', 'hodl', 'undervalued',
  ];

  const bearishKeywords = [
    'bear', 'crash', 'dump', 'sell', 'short', 'scam', 'rug',
    'bubble', 'overvalued', 'correction', 'fear', 'bearish',
    'liquidation', 'capitulation', 'ponzi', 'dead',
  ];

  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  let weightedScore = 0;
  let totalEngagement = 0;
  const topicCounts: Record<string, number> = {};

  for (const post of posts) {
    const titleLower = post.title.toLowerCase();
    const weight = Math.log2(Math.max(2, post.score)) * post.upvote_ratio;

    totalEngagement += post.score + post.num_comments;

    const bullishHits = bullishKeywords.filter((kw) => titleLower.includes(kw)).length;
    const bearishHits = bearishKeywords.filter((kw) => titleLower.includes(kw)).length;

    if (bullishHits > bearishHits) {
      bullishCount++;
      weightedScore += weight;
    } else if (bearishHits > bullishHits) {
      bearishCount++;
      weightedScore -= weight;
    } else {
      neutralCount++;
    }

    // Track mentioned coins/topics
    const coinMatches = titleLower.match(
      /\b(btc|bitcoin|eth|ethereum|sol|solana|xrp|ada|bnb|avax|dot|matic|link)\b/g
    );
    if (coinMatches) {
      for (const coin of coinMatches) {
        topicCounts[coin.toUpperCase()] = (topicCounts[coin.toUpperCase()] ?? 0) + 1;
      }
    }
  }

  const maxWeight =
    posts.length *
    Math.log2(Math.max(2, Math.max(...posts.map((p) => p.score))));
  const normalizedScore =
    maxWeight > 0 ? Math.max(-1, Math.min(1, weightedScore / maxWeight)) : 0;

  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  return {
    score: normalizedScore,
    bullish_posts: bullishCount,
    bearish_posts: bearishCount,
    neutral_posts: neutralCount,
    total_engagement: totalEngagement,
    top_topics: topTopics,
  };
}

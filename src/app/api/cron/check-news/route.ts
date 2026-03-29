import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getNews, calculateNewsSentiment } from '@/lib/data/cryptopanic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'midas' as string } }
    );

    const posts = await getNews({ currencies: 'BTC,ETH,SOL', kind: 'news' });
    const sentiment = calculateNewsSentiment(posts);

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const newsItems = posts.slice(0, 20).map((post) => ({
      title: post.title,
      url: post.url,
      source: post.source?.title ?? post.domain,
      published_at: post.published_at,
      currencies: post.currencies?.map((c) => c.code) ?? [],
      votes: {
        positive: post.votes.positive,
        negative: post.votes.negative,
        important: post.votes.important,
      },
    }));

    const { error } = await supabase.from('market_cache').upsert(
      {
        key: 'crypto_news',
        type: 'news',
        data: {
          posts: newsItems,
          sentiment,
          fetched_at: now,
        },
        expires_at: expiresAt,
        updated_at: now,
      },
      { onConflict: 'key' }
    );

    if (error) {
      return NextResponse.json({ error: 'Erreur stockage news', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fetched: newsItems.length,
      sentiment_score: sentiment.score,
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

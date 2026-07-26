import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchFreeCryptoNews } from '@/lib/data/free-crypto-news';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } }
    );

    const posts = await fetchFreeCryptoNews();

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const newsItems = posts.slice(0, 20).map((post) => ({
      title: post.title,
      url: post.link,
      source: post.source,
      published_at: post.publishedAt,
    }));

    const { error } = await supabase.from('market_cache').upsert(
      {
        key: 'crypto_news',
        type: 'news',
        data: {
          posts: newsItems,
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
      timestamp: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

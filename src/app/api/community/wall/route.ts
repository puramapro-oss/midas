import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET: list wall posts
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data: posts } = await supabase.schema('midas')
      .from('love_wall_posts')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Get authors
    const userIds = [...new Set((posts ?? []).map(p => p.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.schema('midas').from('profiles').select('id, full_name, avatar_url').in('id', userIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    const enriched = (posts ?? []).map(post => ({
      ...post,
      author: profileMap.get(post.user_id) ?? { full_name: 'Trader anonyme', avatar_url: null },
    }));

    return NextResponse.json({ posts: enriched, page });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const postSchema = z.object({
  content: z.string().min(1).max(500),
  type: z.enum(['victory', 'encouragement', 'milestone', 'gratitude']),
});

// POST: create wall post
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Message invalide (1-500 caractères)' }, { status: 400 });

    const { data: post, error } = await supabase.schema('midas').from('love_wall_posts').insert({
      user_id: user.id,
      content: parsed.data.content,
      type: parsed.data.type,
    }).select().single();

    if (error) return NextResponse.json({ error: 'Impossible de publier' }, { status: 500 });
    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

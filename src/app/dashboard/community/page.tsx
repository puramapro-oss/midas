'use client';

import { useEffect, useState, useCallback } from 'react';
import { Heart, Users, Send, MessageCircle, Flame, Star, Award, Smile } from 'lucide-react';
import type { LoveWallPost, LoveCircle } from '@/types/database';

type Tab = 'wall' | 'circles';

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>('wall');
  const [posts, setPosts] = useState<LoveWallPost[]>([]);
  const [circles, setCircles] = useState<(LoveCircle & { is_member: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<LoveWallPost['type']>('victory');
  const [posting, setPosting] = useState(false);

  const loadWall = useCallback(async () => {
    const res = await fetch('/api/community/wall');
    const data = await res.json();
    setPosts(data.posts ?? []);
  }, []);

  const loadCircles = useCallback(async () => {
    const res = await fetch('/api/community/circles');
    const data = await res.json();
    setCircles(data.circles ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadWall(), loadCircles()]).finally(() => setLoading(false));
  }, [loadWall, loadCircles]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/community/wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost, type: postType }),
      });
      if (res.ok) {
        setNewPost('');
        await loadWall();
      }
    } finally {
      setPosting(false);
    }
  };

  const handleJoinCircle = async (circleId: string) => {
    await fetch('/api/community/circles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circle_id: circleId }),
    });
    await loadCircles();
  };

  const TYPE_ICONS = {
    victory: <Star className="w-4 h-4 text-amber-400" />,
    encouragement: <Heart className="w-4 h-4 text-pink-400" />,
    milestone: <Award className="w-4 h-4 text-purple-400" />,
    gratitude: <Smile className="w-4 h-4 text-green-400" />,
  };

  const TYPE_LABELS = {
    victory: 'Victoire',
    encouragement: 'Encouragement',
    milestone: 'Jalon',
    gratitude: 'Gratitude',
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart className="w-6 h-6 text-pink-400" />
          Communauté Traders
        </h1>
        <p className="text-white/50 mt-1">Entraide, motivation et partage entre traders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['wall', 'circles'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {t === 'wall' ? (
              <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> Mur d&apos;amour</span>
            ) : (
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Cercles</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'wall' && (
        <div className="space-y-4">
          {/* Compose */}
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex gap-2">
              {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map(type => (
                <button
                  key={type}
                  onClick={() => setPostType(type)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all ${
                    postType === type ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'
                  }`}
                >
                  {TYPE_ICONS[type]} {TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                placeholder="Partage une victoire, un encouragement..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                maxLength={500}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePost()}
              />
              <button
                onClick={handlePost}
                disabled={!newPost.trim() || posting}
                className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-500/30 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Posts */}
          {posts.map(post => (
            <div key={post.id} className="glass rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm text-white/70">
                  {post.author?.full_name?.[0] ?? '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{post.author?.full_name ?? 'Trader'}</span>
                    {TYPE_ICONS[post.type as keyof typeof TYPE_ICONS]}
                    <span className="text-white/30 text-xs">{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="text-white/70 text-sm mt-1">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button className="text-white/30 hover:text-pink-400 transition-colors text-xs flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {post.reactions_count}
                    </button>
                    <button className="text-white/30 hover:text-amber-400 transition-colors text-xs flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {posts.length === 0 && (
            <div className="text-center py-16">
              <Heart className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">Sois le premier à poster !</p>
            </div>
          )}
        </div>
      )}

      {tab === 'circles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {circles.map(circle => (
            <div key={circle.id} className="glass rounded-xl p-5">
              <h3 className="text-white font-semibold">{circle.name}</h3>
              <p className="text-white/50 text-sm mt-1">{circle.objective}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-white/40 text-sm">{circle.current_members}/{circle.max_members} membres</span>
                {circle.is_member ? (
                  <span className="text-green-400 text-sm">Membre</span>
                ) : (
                  <button
                    onClick={() => handleJoinCircle(circle.id)}
                    disabled={circle.status === 'full'}
                    className="px-3 py-1.5 rounded-lg text-sm bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all disabled:opacity-50"
                  >
                    Rejoindre
                  </button>
                )}
              </div>
            </div>
          ))}

          {circles.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">Les cercles de traders arrivent bientôt</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

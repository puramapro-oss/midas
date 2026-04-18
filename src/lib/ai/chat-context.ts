// =============================================================================
// MIDAS — Chat Context Enricher
// Brief MIDAS-BRIEF-ULTIMATE.md §"Chat IA — Enrichir le contexte"
// Construit un bloc de contexte marché temps réel injecté dans le system prompt.
// Cache 5 min via Upstash pour ne pas saturer les APIs à chaque message.
// =============================================================================

import { cacheGetOrSet } from '@/lib/cache/upstash';
import { getCurrentIndex } from '@/lib/data/fear-greed';
import { fetchFreeCryptoNews } from '@/lib/data/free-crypto-news';
import { getUpcomingEvents } from '@/lib/data/coinmarketcal';

const CONTEXT_TTL_SECONDS = 300; // 5 min
const USER_CONTEXT_TTL_SECONDS = 60; // user data plus volatile

interface MarketSnapshot {
  fear_greed: { value: number; label: string } | null;
  top_news: Array<{ title: string; source: string }>;
  upcoming_events: Array<{ title: string; date: string; coin: string }>;
}

interface UserSnapshot {
  open_positions: number;
  open_pairs: string[];
  recent_trades: Array<{ pair: string; pnl_pct: number | null; closed_at: string | null }>;
  daily_drawdown_pct: number | null;
  plan: string;
}

/**
 * Snapshot global du marché — partagé entre tous les users (cache 5 min).
 */
async function getMarketSnapshot(): Promise<MarketSnapshot> {
  return cacheGetOrSet<MarketSnapshot>(
    'chat-context:market',
    async () => {
      const [fg, news, events] = await Promise.allSettled([
        getCurrentIndex(),
        fetchFreeCryptoNews(),
        getUpcomingEvents(['bitcoin', 'ethereum', 'solana']),
      ]);

      const fearGreed =
        fg.status === 'fulfilled' && fg.value
          ? { value: fg.value.value, label: fg.value.value_classification }
          : null;

      const topNews =
        news.status === 'fulfilled' && Array.isArray(news.value)
          ? news.value
              .slice(0, 3)
              .map((n) => ({ title: n.title ?? '', source: n.source ?? '' }))
              .filter((n) => n.title)
          : [];

      const upcomingEvents =
        events.status === 'fulfilled' && Array.isArray(events.value)
          ? events.value
              .slice(0, 3)
              .map((e) => ({
                title: e.title ?? '',
                date: e.date_event ?? '',
                coin: e.coins?.[0]?.symbol ?? '',
              }))
              .filter((e) => e.title)
          : [];

      return { fear_greed: fearGreed, top_news: topNews, upcoming_events: upcomingEvents };
    },
    CONTEXT_TTL_SECONDS,
  );
}

/**
 * Snapshot utilisateur — positions ouvertes, derniers trades, drawdown.
 * Cache court (60s) car données volatiles.
 */
async function getUserSnapshot(
  userId: string,
  supabase: SupabaseAuthedClient,
): Promise<UserSnapshot> {
  return cacheGetOrSet<UserSnapshot>(
    `chat-context:user:${userId}`,
    async () => {
      const [profileRes, openTradesRes, recentTradesRes] = await Promise.all([
        supabase.from('profiles').select('plan').eq('id', userId).single(),
        supabase
          .from('trades')
          .select('pair')
          .eq('user_id', userId)
          .eq('status', 'open'),
        supabase
          .from('trades')
          .select('pair, pnl_pct, closed_at')
          .eq('user_id', userId)
          .eq('status', 'closed')
          .order('closed_at', { ascending: false })
          .limit(3),
      ]);

      const openTrades = (openTradesRes.data ?? []) as Array<{ pair: string }>;
      const recentTrades = (recentTradesRes.data ?? []) as Array<{
        pair: string;
        pnl_pct: number | null;
        closed_at: string | null;
      }>;

      // Drawdown 24h glissantes : somme P&L des trades fermés sur 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const dd24Res = await supabase
        .from('trades')
        .select('pnl_pct')
        .eq('user_id', userId)
        .eq('status', 'closed')
        .gte('closed_at', since);
      const dd24 = (dd24Res.data ?? []) as Array<{ pnl_pct: number | null }>;

      const sumPnl = dd24.reduce<number>((acc, t) => acc + (t.pnl_pct ?? 0), 0);

      return {
        open_positions: openTrades.length,
        open_pairs: openTrades.map((t) => t.pair).slice(0, 5),
        recent_trades: recentTrades.map((t) => ({
          pair: t.pair,
          pnl_pct: t.pnl_pct,
          closed_at: t.closed_at,
        })),
        daily_drawdown_pct: sumPnl < 0 ? Math.abs(sumPnl) : 0,
        plan: (profileRes.data?.plan as string) ?? 'free',
      };
    },
    USER_CONTEXT_TTL_SECONDS,
  );
}

// Type loose pour le client Supabase authentifié (évite l'enfer Database<schema>)
type SupabaseAuthedClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: { plan?: string } | null }>;
        order?: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null }> };
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null }> };
          gte: (col: string, val: string) => Promise<{ data: unknown[] | null }>;
        } & Promise<{ data: unknown[] | null }>;
      } & Promise<{ data: unknown[] | null }>;
    };
  };
};

/**
 * Construit le bloc de contexte string à injecter dans le system prompt.
 * Retourne "" si tout échoue (chat reste fonctionnel sans contexte).
 */
export async function buildLiveContext(
  userId: string,
  supabase: SupabaseAuthedClient,
): Promise<string> {
  try {
    const [market, user] = await Promise.all([
      getMarketSnapshot(),
      getUserSnapshot(userId, supabase),
    ]);

    const lines: string[] = ['', '## CONTEXTE TEMPS RÉEL (à intégrer dans tes réponses)'];

    if (market.fear_greed) {
      lines.push(
        `- **Fear & Greed Index** : ${market.fear_greed.value}/100 (${market.fear_greed.label})`,
      );
    }

    if (market.top_news.length > 0) {
      lines.push('- **News chaudes** :');
      market.top_news.forEach((n) => lines.push(`  • ${n.title} (${n.source})`));
    }

    if (market.upcoming_events.length > 0) {
      lines.push('- **Événements à venir (7 jours)** :');
      market.upcoming_events.forEach((e) =>
        lines.push(`  • ${e.coin} — ${e.title} (${e.date})`),
      );
    }

    lines.push('', '## CONTEXTE USER');
    lines.push(`- Plan : ${user.plan.toUpperCase()}`);
    lines.push(
      `- Positions ouvertes : ${user.open_positions}${user.open_pairs.length > 0 ? ` (${user.open_pairs.join(', ')})` : ''}`,
    );
    if (user.recent_trades.length > 0) {
      lines.push('- Derniers trades fermés :');
      user.recent_trades.forEach((t) =>
        lines.push(
          `  • ${t.pair} : ${t.pnl_pct !== null ? (t.pnl_pct >= 0 ? '+' : '') + t.pnl_pct.toFixed(2) + '%' : 'n/a'}`,
        ),
      );
    }
    if (user.daily_drawdown_pct && user.daily_drawdown_pct > 0) {
      lines.push(`- Drawdown 24h : -${user.daily_drawdown_pct.toFixed(2)}%`);
      if (user.daily_drawdown_pct >= 3) {
        lines.push('  ⚠️ Drawdown élevé — recommander prudence + repos');
      }
    }

    return lines.join('\n');
  } catch {
    return '';
  }
}

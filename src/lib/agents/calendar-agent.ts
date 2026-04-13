// =============================================================================
// MIDAS — Calendar / Events Agent
// Source PRINCIPALE : CoinMarketCal API (halvings, unlocks, mainnet, listings).
// Brief : +15% bullish si event positif dans 7 jours, -10% si unlock imminent.
// =============================================================================

import type { AgentResult } from '@/lib/agents/types';
import { getUpcomingEvents, assessEventImpact, type CryptoEvent } from '@/lib/data/coinmarketcal';

interface UpcomingEventOut {
  id: string;
  title: string;
  date: string;
  days_until: number;
  impact: 'high' | 'medium' | 'low';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  categories: string[];
  description: string;
}

interface CalendarData {
  upcoming_events: UpcomingEventOut[];
  hot_events_count: number;
  bullish_events_7d: number;
  bearish_events_7d: number;
  unlock_imminent: boolean;
  event_risk_score: number;
  caution_advised: boolean;
  source: 'coinmarketcal' | 'fallback';
}

const UNLOCK_KEYWORDS = ['unlock', 'token release', 'cliff', 'vesting'];
const STRONG_BULL_KEYWORDS = ['halving', 'mainnet', 'listing', 'etf', 'upgrade', 'integration'];

function extractCoin(pair: string): string {
  const slash = pair.indexOf('/');
  return slash > 0 ? pair.substring(0, slash) : pair;
}

function isUnlockEvent(e: CryptoEvent): boolean {
  const text = `${e.title} ${e.description}`.toLowerCase();
  return UNLOCK_KEYWORDS.some((k) => text.includes(k));
}

function isStrongBullEvent(e: CryptoEvent): boolean {
  const text = `${e.title} ${e.description}`.toLowerCase();
  return STRONG_BULL_KEYWORDS.some((k) => text.includes(k));
}

export async function analyzeCalendar(pair: string): Promise<AgentResult> {
  const coin = extractCoin(pair);

  // Appel CoinMarketCal — fallback intégré dans le provider
  const events = await getUpcomingEvents([coin]).catch(() => [] as CryptoEvent[]);

  const enriched = events.map((e) => {
    const imp = assessEventImpact(e);
    return { event: e, ...imp };
  });

  // Fenêtre 7 jours
  const window7 = enriched.filter((e) => e.daysUntil >= 0 && e.daysUntil <= 7);
  const window2 = enriched.filter((e) => e.daysUntil >= 0 && e.daysUntil <= 2);

  let scoreAdjustment = 0;

  // Brief : +15% si event positif dans 7j
  const bullish7d = window7.filter((e) => e.sentiment === 'bullish' || isStrongBullEvent(e.event));
  if (bullish7d.length > 0) {
    scoreAdjustment += 0.15 * Math.min(bullish7d.length, 3);
  }

  // Brief : -10% si unlock imminent (< 7 jours)
  const unlockImminent = window7.some((e) => isUnlockEvent(e.event));
  if (unlockImminent) {
    scoreAdjustment -= 0.10;
  }

  // Bearish events explicites
  const bearish7d = window7.filter((e) => e.sentiment === 'bearish');
  if (bearish7d.length > 0) {
    scoreAdjustment -= 0.05 * Math.min(bearish7d.length, 3);
  }

  // Risk score (proximité × impact)
  const impactScore: Record<'high' | 'medium' | 'low', number> = { high: 0.4, medium: 0.2, low: 0.1 };
  let eventRiskScore = 0;
  for (const e of window7) {
    const proximity = e.daysUntil <= 0 ? 1 : 1 / (1 + e.daysUntil * 0.3);
    eventRiskScore += impactScore[e.impact] * proximity;
  }
  eventRiskScore = Math.min(1, eventRiskScore);

  // Score & signal final
  const score = Math.max(-1, Math.min(1, scoreAdjustment));
  let signal: AgentResult['signal'] = 'neutral';
  if (score > 0.10) signal = 'bullish';
  else if (score < -0.10) signal = 'bearish';

  // Si event high impact dans les 2 jours → forcer prudence
  const highImpactSoon = window2.some((e) => e.impact === 'high');
  if (highImpactSoon) {
    signal = 'neutral';
  }

  const cautionAdvised = eventRiskScore > 0.3 || highImpactSoon;
  const confidence = events.length > 0 ? Math.min(0.85, 0.4 + window7.length * 0.07) : 0.3;

  // Reasoning
  const reasoningParts = [
    `Calendrier ${pair} — ${events.length} events CoinMarketCal | ${window7.length} dans 7j`,
  ];
  if (bullish7d.length > 0) {
    reasoningParts.push(`Bullish 7j: ${bullish7d.length} (+${(bullish7d.length * 15).toFixed(0)}%)`);
  }
  if (unlockImminent) {
    reasoningParts.push('UNLOCK imminent (<7j) — pression vendeuse attendue (-10%)');
  }
  if (highImpactSoon) {
    reasoningParts.push('PRUDENCE: event high impact dans les 2 jours');
  }
  for (const e of window7.slice(0, 5)) {
    reasoningParts.push(`J-${e.daysUntil}: ${e.event.title} [${e.impact}/${e.sentiment}]`);
  }

  const data: CalendarData = {
    upcoming_events: window7.slice(0, 10).map((e) => ({
      id: e.event.id,
      title: e.event.title,
      date: e.event.date_event,
      days_until: e.daysUntil,
      impact: e.impact,
      sentiment: e.sentiment,
      categories: e.event.categories,
      description: e.event.description,
    })),
    hot_events_count: events.filter((e) => e.is_hot).length,
    bullish_events_7d: bullish7d.length,
    bearish_events_7d: bearish7d.length,
    unlock_imminent: unlockImminent,
    event_risk_score: eventRiskScore,
    caution_advised: cautionAdvised,
    source: events.length > 0 ? 'coinmarketcal' : 'fallback',
  };

  return {
    agent_name: 'calendar',
    signal,
    score,
    confidence,
    reasoning: reasoningParts.join('\n'),
    data: data as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}

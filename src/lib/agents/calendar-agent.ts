// =============================================================================
// MIDAS — Calendar / Events Agent
// Verifie les evenements connus (FOMC, halvings, unlocks, expirations options)
// et retourne un AgentResult avec l'impact potentiel
// =============================================================================

import type { AgentResult } from '@/lib/agents/types';

// --- Types ---

type EventImpact = 'high' | 'medium' | 'low';
type EventBias = 'bullish' | 'bearish' | 'neutral' | 'volatile';

interface CalendarEvent {
  name: string;
  date: Date;
  impact: EventImpact;
  bias: EventBias;
  description: string;
  affects: string[];
}

interface CalendarData {
  upcoming_events: Array<{
    name: string;
    date: string;
    days_until: number;
    impact: EventImpact;
    bias: EventBias;
    description: string;
  }>;
  active_events: Array<{
    name: string;
    impact: EventImpact;
    bias: EventBias;
    description: string;
  }>;
  event_risk_score: number;
  caution_advised: boolean;
}

// --- Known Recurring Events ---

function getRecurringEvents(year: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // FOMC meetings 2026 (approximate, 8 meetings per year)
  const fomcDates = [
    [0, 28], [2, 17], [4, 5], [5, 16],
    [6, 28], [8, 15], [10, 3], [11, 15],
  ];

  for (const [month, day] of fomcDates) {
    events.push({
      name: 'FOMC Meeting',
      date: new Date(year, month, day),
      impact: 'high',
      bias: 'volatile',
      description: 'Decision de taux de la Fed — forte volatilite attendue',
      affects: ['BTC', 'ETH', 'ALL'],
    });
  }

  // Options expiration (dernier vendredi de chaque mois — approximation)
  for (let month = 0; month < 12; month++) {
    // Trouver le dernier vendredi
    const lastDay = new Date(year, month + 1, 0);
    const dayOfWeek = lastDay.getDay();
    const lastFriday = new Date(year, month + 1, 0 - ((dayOfWeek + 2) % 7));

    events.push({
      name: 'Options Expiration',
      date: lastFriday,
      impact: 'medium',
      bias: 'volatile',
      description: 'Expiration mensuelle options — volatilite accrue possible',
      affects: ['BTC', 'ETH'],
    });
  }

  // CPI releases (mid-month, approximately)
  const cpiDates = [
    [0, 14], [1, 12], [2, 12], [3, 10],
    [4, 13], [5, 11], [6, 15], [7, 12],
    [8, 10], [9, 14], [10, 12], [11, 10],
  ];

  for (const [month, day] of cpiDates) {
    events.push({
      name: 'CPI Release',
      date: new Date(year, month, day),
      impact: 'high',
      bias: 'volatile',
      description: 'Publication IPC US — impact majeur sur marches',
      affects: ['BTC', 'ETH', 'ALL'],
    });
  }

  return events;
}

// --- One-time known events ---

function getOneTimeEvents(): CalendarEvent[] {
  return [
    // Bitcoin halving already happened April 2024, next ~2028
    {
      name: 'Bitcoin Halving',
      date: new Date(2028, 3, 15),
      impact: 'high',
      bias: 'bullish',
      description: 'Prochain halving Bitcoin — reduction de moitie de la recompense de bloc',
      affects: ['BTC'],
    },
    // Ethereum Pectra upgrade
    {
      name: 'Ethereum Pectra Upgrade',
      date: new Date(2026, 2, 15),
      impact: 'medium',
      bias: 'bullish',
      description: 'Mise a jour Pectra d\'Ethereum — ameliorations EIP',
      affects: ['ETH'],
    },
  ];
}

// --- Helpers ---

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function isEventRelevant(event: CalendarEvent, coin: string): boolean {
  return event.affects.includes('ALL') || event.affects.includes(coin.toUpperCase());
}

// --- Main Agent Function ---

/**
 * Analyse les evenements a venir et leur impact potentiel sur le trading.
 */
export async function analyzeCalendar(pair: string): Promise<AgentResult> {
  const coin = pair.split('/')[0] ?? pair;
  const now = new Date();
  const currentYear = now.getFullYear();

  // Rassembler tous les evenements
  const allEvents = [
    ...getRecurringEvents(currentYear),
    ...getRecurringEvents(currentYear + 1),
    ...getOneTimeEvents(),
  ];

  // Filtrer par pertinence pour cette paire
  const relevantEvents = allEvents.filter((e) => isEventRelevant(e, coin));

  // Evenements dans les 7 prochains jours
  const upcomingWindow = 7;
  const upcoming = relevantEvents
    .map((event) => {
      const daysUntil = daysBetween(now, event.date);
      return { ...event, daysUntil };
    })
    .filter((e) => e.daysUntil >= 0 && e.daysUntil <= upcomingWindow)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Evenements actifs (aujourd'hui ou hier)
  const active = relevantEvents
    .map((event) => {
      const daysUntil = daysBetween(now, event.date);
      return { ...event, daysUntil };
    })
    .filter((e) => e.daysUntil >= -1 && e.daysUntil <= 0);

  // Calculer le risk score
  let eventRiskScore = 0;
  const impactScores: Record<EventImpact, number> = { high: 0.4, medium: 0.2, low: 0.1 };

  for (const event of [...active, ...upcoming]) {
    const impactBase = impactScores[event.impact];
    // Plus l'evenement est proche, plus l'impact est fort
    const proximityMultiplier = event.daysUntil <= 0 ? 1.0 : 1.0 / (1 + event.daysUntil * 0.3);
    eventRiskScore += impactBase * proximityMultiplier;
  }

  eventRiskScore = Math.min(1.0, eventRiskScore);

  // Signal basé sur les evenements
  let signal: AgentResult['signal'] = 'neutral';
  let score = 0;

  // Si un evenement high impact est aujourd'hui ou demain
  const immHighImpact = active.filter((e) => e.impact === 'high');
  const soonHighImpact = upcoming.filter((e) => e.impact === 'high' && e.daysUntil <= 2);

  if (immHighImpact.length > 0 || soonHighImpact.length > 0) {
    // En presence d'evenement majeur, on est prudent (signal a eviter le trading)
    signal = 'neutral';
    score = 0;
  } else if (upcoming.length === 0 && active.length === 0) {
    // Pas d'evenement = conditions calmes, legerement favorable
    signal = 'neutral';
    score = 0.1;
  } else {
    // Evenements mineurs
    const bullishEvents = [...active, ...upcoming].filter((e) => e.bias === 'bullish');
    const bearishEvents = [...active, ...upcoming].filter((e) => e.bias === 'bearish');

    if (bullishEvents.length > bearishEvents.length) {
      signal = 'bullish';
      score = 0.2;
    } else if (bearishEvents.length > bullishEvents.length) {
      signal = 'bearish';
      score = -0.2;
    }
  }

  const cautionAdvised = eventRiskScore > 0.3;
  const confidence = upcoming.length > 0 || active.length > 0 ? 0.6 : 0.3;

  // Build reasoning
  const reasoningParts: string[] = [];
  reasoningParts.push(`Calendrier ${pair} — ${upcoming.length} evenement(s) dans les ${upcomingWindow}j`);

  if (active.length > 0) {
    reasoningParts.push(`ACTIFS MAINTENANT: ${active.map((e) => e.name).join(', ')}`);
  }

  if (upcoming.length > 0) {
    for (const event of upcoming.slice(0, 5)) {
      reasoningParts.push(`J-${event.daysUntil}: ${event.name} (${event.impact}) — ${event.description}`);
    }
  }

  if (cautionAdvised) {
    reasoningParts.push('PRUDENCE: risque evenementiel eleve, reduire la taille des positions');
  }

  const calendarData: CalendarData = {
    upcoming_events: upcoming.slice(0, 10).map((e) => ({
      name: e.name,
      date: e.date.toISOString(),
      days_until: e.daysUntil,
      impact: e.impact,
      bias: e.bias,
      description: e.description,
    })),
    active_events: active.map((e) => ({
      name: e.name,
      impact: e.impact,
      bias: e.bias,
      description: e.description,
    })),
    event_risk_score: eventRiskScore,
    caution_advised: cautionAdvised,
  };

  return {
    agent_name: 'calendar',
    signal,
    score,
    confidence,
    reasoning: reasoningParts.join('\n'),
    data: calendarData as unknown as Record<string, unknown>,
    timestamp: new Date(),
  };
}

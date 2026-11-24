// Runtime contracts for model output. A TypeScript assertion cannot validate
// untrusted JSON; never include the raw response in an error or application log.
export interface SentimentClaudeResponse {
  overall_sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number;
  confidence: number;
  key_themes: string[];
  risk_events: string[];
  reasoning: string;
}

export interface ClaudeDecisionResponse {
  action: 'buy' | 'sell' | 'hold';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size_pct: number;
  strategy: string;
  reasoning: string;
  risk_reward_ratio: number;
}

function invalid(field: string): never {
  throw new Error(`[MIDAS] Réponse IA invalide : ${field}`);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('objet attendu');
  return value as Record<string, unknown>;
}

function number(row: Record<string, unknown>, key: string, min: number, max: number): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid(key);
  return value;
}

function text(row: Record<string, unknown>, key: string, max = 10000): string {
  const value = row[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) invalid(key);
  return value;
}

function texts(row: Record<string, unknown>, key: string): string[] {
  const value = row[key];
  if (!Array.isArray(value) || value.length > 50 ||
      value.some(item => typeof item !== 'string' || !item.trim() || item.length > 2000)) invalid(key);
  return value as string[];
}

export function parseModelJSON<T>(raw: string, validate: (value: unknown) => T): T {
  if (raw.length > 100000) invalid('réponse trop longue');
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fenced ? fenced[1].trim() : trimmed);
  } catch {
    invalid('JSON non parsable');
  }
  return validate(parsed);
}

export function validateSentiment(value: unknown): SentimentClaudeResponse {
  const row = record(value);
  const signal = row.overall_sentiment;
  if (signal !== 'bullish' && signal !== 'bearish' && signal !== 'neutral') invalid('overall_sentiment');
  return {
    overall_sentiment: signal,
    score: number(row, 'score', -1, 1),
    confidence: number(row, 'confidence', 0, 1),
    key_themes: texts(row, 'key_themes'),
    risk_events: texts(row, 'risk_events'),
    reasoning: text(row, 'reasoning'),
  };
}

export function validateDecision(value: unknown): ClaudeDecisionResponse {
  const row = record(value);
  const action = row.action;
  if (action !== 'buy' && action !== 'sell' && action !== 'hold') invalid('action');
  const result: ClaudeDecisionResponse = {
    action,
    entry_price: number(row, 'entry_price', 0, 1e12),
    stop_loss: number(row, 'stop_loss', 0, 1e12),
    take_profit: number(row, 'take_profit', 0, 1e12),
    position_size_pct: number(row, 'position_size_pct', 0, 100),
    risk_reward_ratio: number(row, 'risk_reward_ratio', 0, 1e6),
    strategy: text(row, 'strategy', 500),
    reasoning: text(row, 'reasoning'),
  };
  if (action !== 'hold') {
    const { entry_price: entry, stop_loss: stop, take_profit: target } = result;
    if (entry <= 0 || stop <= 0 || target <= 0 || result.position_size_pct <= 0) invalid('prix ou taille');
    if (action === 'buy' ? !(stop < entry && target > entry) : !(stop > entry && target < entry)) {
      invalid('direction du stop ou de la cible');
    }
    // A claimed ratio must never override the ratio implied by the prices.
    result.risk_reward_ratio = Math.abs(target - entry) / Math.abs(entry - stop);
    if (!Number.isFinite(result.risk_reward_ratio)) invalid('risk_reward_ratio');
  }
  return result;
}

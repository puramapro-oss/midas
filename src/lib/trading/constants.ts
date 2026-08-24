export const PAIRS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT',
  'XRP/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOGE/USDT',
  'DOT/USDT', 'LINK/USDT', 'MATIC/USDT', 'UNI/USDT',
];

export const TIMEFRAMES = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1J' },
];

export interface AgentVote {
  agent: string;
  label: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  icon: string;
}

// Liste statique des 6 agents — aucune valeur numérique bidon.
// Les votes et scores réels arriveront quand /api/ai/analyze sera câblé ici.
export const SAMPLE_AGENTS: AgentVote[] = [
  { agent: 'technical', label: 'Technique', signal: 'HOLD', confidence: 0, icon: '📊' },
  { agent: 'sentiment', label: 'Sentiment', signal: 'HOLD', confidence: 0, icon: '💭' },
  { agent: 'onchain', label: 'On-Chain', signal: 'HOLD', confidence: 0, icon: '🔗' },
  { agent: 'calendar', label: 'Calendrier', signal: 'HOLD', confidence: 0, icon: '📅' },
  { agent: 'pattern', label: 'Patterns', signal: 'HOLD', confidence: 0, icon: '📐' },
  { agent: 'risk', label: 'Risque', signal: 'HOLD', confidence: 0, icon: '🛡' },
];

export const signalColors = {
  BUY: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  SELL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  HOLD: { bg: 'bg-white/[0.06]', text: 'text-white/50', border: 'border-white/[0.08]' },
};

export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'] as const;

export const STRATEGIES = [
  { value: 'dca', label: 'DCA (Dollar Cost Averaging)' },
  { value: 'grid', label: 'Grid Trading' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
];

export interface PairData {
  symbol: string;
  displayName: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: string;
  signal: string;
  signalColor: string;
  reasoning: string;
  scores: {
    composite: number;
    technical: number;
    sentiment: number;
    onChain: number;
  };
}

// Aucune analyse fabriquée. Le prix live vient de /api/market/candles
// (voir useEffect plus bas) et le raisonnement reste en empty state tant
// que l'analyse IA n'a pas été déclenchée.
export const SAMPLE_DATA: Record<string, PairData> = {};

export function getDefaultData(pairSlug: string): PairData {
  return {
    symbol: pairSlug.replace('-', '/').toUpperCase(),
    displayName: pairSlug.replace('-', ' / ').toUpperCase(),
    price: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume: '—',
    signal: 'Neutre',
    signalColor: '#F59E0B',
    reasoning:
      'Aucune analyse disponible pour cette paire. Lance une analyse IA pour obtenir un avis detaille base sur les donnees marche live.',
    scores: { composite: 0, technical: 0, sentiment: 0, onChain: 0 },
  };
}

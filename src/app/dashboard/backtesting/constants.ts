export interface BacktestResult {
  pair: string;
  strategy: string;
  initialCapital: number;
  stopLossPct: number;
  takeProfitPct: number;
  pnlPercent: number;
  pnlAbsolute: number;
  winRate: number;
  sharpeRatio: number | null;
  totalTrades: number;
  maxDrawdown: number;
  avgTradeDuration: string;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number | null;
  source: string;
  start: number;
  end: number;
  candles: number;
  fees: number;
}

export const pairOptions = [
  { value: 'BTC/USDT', label: 'BTC/USDT' },
  { value: 'ETH/USDT', label: 'ETH/USDT' },
  { value: 'SOL/USDT', label: 'SOL/USDT' },
  { value: 'BNB/USDT', label: 'BNB/USDT' },
  { value: 'XRP/USDT', label: 'XRP/USDT' },
  { value: 'ADA/USDT', label: 'ADA/USDT' },
];

export const periodOptions = [
  { value: '1m', label: '1 mois' },
  { value: '3m', label: '3 mois' },
  { value: '6m', label: '6 mois' },
  { value: '1y', label: '1 an' },
  { value: '2y', label: '2 ans' },
];

export const strategyOptions = [
  { value: 'momentum', label: 'Momentum' },
  { value: 'grid', label: 'Grid Trading' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'swing', label: 'Swing' },
  { value: 'smart_entry', label: 'Smart Entry' },
  { value: 'dca', label: 'DCA' },
  { value: 'scalping', label: 'Scalping' },
];

export const slOptions = [
  { value: '1', label: '1%' },
  { value: '2', label: '2%' },
  { value: '3', label: '3%' },
  { value: '5', label: '5%' },
  { value: '10', label: '10%' },
];

export const tpOptions = [
  { value: '2', label: '2%' },
  { value: '3', label: '3%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '15', label: '15%' },
];

export interface BacktestResult {
  pnlPercent: number;
  pnlAbsolute: number;
  winRate: number;
  sharpeRatio: number;
  totalTrades: number;
  maxDrawdown: number;
  avgTradeDuration: string;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

export const SAMPLE_RESULT: BacktestResult = {
  pnlPercent: 24.5,
  pnlAbsolute: 2450.0,
  winRate: 67.3,
  sharpeRatio: 1.82,
  totalTrades: 156,
  maxDrawdown: 9.2,
  avgTradeDuration: '3h 28m',
  bestTrade: 412.5,
  worstTrade: -189.3,
  profitFactor: 2.14,
};

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
  { value: 'breakout', label: 'Breakout' },
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

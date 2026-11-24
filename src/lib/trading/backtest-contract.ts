export const BACKTEST_STRATEGIES = ['momentum', 'mean_reversion', 'grid', 'scalping', 'swing', 'dca', 'smart_entry'] as const;
export const BACKTEST_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
export const backtestWarmup = (strategy: string) => ['swing', 'smart_entry'].includes(strategy) ? 200 : 50;

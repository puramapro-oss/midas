// =============================================================================
// MIDAS — Technical Analysis Configuration
// Periods, weights, and constants for technical indicators
// =============================================================================

// --- Indicator Periods ---

export const RSI_PERIOD = 14;
export const MACD_FAST = 12;
export const MACD_SLOW = 26;
export const MACD_SIGNAL = 9;
export const BB_PERIOD = 20;
export const BB_STD_DEV = 2;
export const EMA_PERIODS = [9, 21, 50, 200] as const;
export const STOCH_PERIOD = 14;
export const STOCH_SIGNAL = 3;
export const ADX_PERIOD = 14;
export const ATR_PERIOD = 14;
export const CCI_PERIOD = 20;
export const WILLIAMS_PERIOD = 14;
export const MFI_PERIOD = 14;

// --- Indicator Weights for Composite Score ---

export const INDICATOR_WEIGHTS: Record<string, number> = {
  rsi: 0.10,
  macd: 0.13,
  bollinger: 0.08,
  ema_cross: 0.11,
  stochastic: 0.06,
  adx: 0.08,
  obv: 0.06,
  cci: 0.05,
  williams_r: 0.05,
  mfi: 0.06,
  ema_200_position: 0.04,
  // 4 indicateurs ajoutés (brief MIDAS-BRIEF-ULTIMATE.md)
  stoch_rsi: 0.06,
  force_index: 0.06,
  elder_ray: 0.06,
  volume_profile: 0.05,
};

// --- Timeframes ---

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export const ALL_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

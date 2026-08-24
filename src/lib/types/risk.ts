// =============================================================================
// MIDAS — Risk Agent Types
// =============================================================================

import type { MarketRegime } from '@/lib/agents/types';

export type ShieldLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface ShieldCheck {
  level: ShieldLevel;
  name: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface RiskData {
  approved: boolean;
  checks: ShieldCheck[];
  passed_count: number;
  failed_count: number;
  critical_failures: number;
  max_position_size_pct: number;
  suggested_leverage: number;
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  drawdown_limit_pct: number;
}

export interface RiskParams {
  pair: string;
  action: 'buy' | 'sell';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size_pct: number;
  account_balance: number;
  /** Drawdown total (compteur depuis l'inception ou capital initial) */
  current_drawdown_pct: number;
  /** Drawdown sur 24h glissantes (optionnel — brief : limite 3%) */
  daily_drawdown_pct?: number;
  /** Drawdown sur 7j glissants (optionnel — brief : limite 7%) */
  weekly_drawdown_pct?: number;
  open_positions: number;
  daily_trades_count: number;
  regime: MarketRegime;
  candles: import('@/lib/agents/types').Candle[];
  composite_score: number;
  confidence: number;
  /** Corrélation max (Pearson 0-1) avec une position déjà ouverte (optionnel — brief : seuil 0.9) */
  max_correlation_with_open_positions?: number;
}

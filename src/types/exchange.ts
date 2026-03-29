// =============================================================================
// MIDAS — Exchange Types
// Types pour les connexions exchanges et les opérations de marché
// =============================================================================

// --- Exchange Names ---

export type ExchangeName =
  | 'binance'
  | 'bybit'
  | 'okx'
  | 'bitget'
  | 'kucoin'
  | 'gate'
  | 'mexc'
  | 'htx'
  | 'coinbase'
  | 'kraken';

// --- Order Types ---

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus =
  | 'pending'
  | 'open'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'expired'
  | 'rejected';

export type PositionSide = 'long' | 'short' | 'both';

// --- Exchange Connection ---

export interface ExchangeConnection {
  id: string;
  exchange: ExchangeName;
  label: string;
  is_testnet: boolean;
  is_active: boolean;
  permissions: ExchangePermission[];
  last_sync_at: string | null;
  balance_snapshot: Record<string, number> | null;
  error_message: string | null;
}

export type ExchangePermission =
  | 'read'
  | 'spot_trade'
  | 'futures_trade'
  | 'withdraw'
  | 'margin_trade';

// --- Balances ---

export interface ExchangeBalance {
  exchange: ExchangeName;
  total_usd: number;
  available_usd: number;
  used_usd: number;
  assets: AssetBalance[];
  updated_at: string;
}

export interface AssetBalance {
  asset: string;
  free: number;
  used: number;
  total: number;
  usd_value: number;
}

// --- Orders ---

export interface ExchangeOrder {
  id: string;
  exchange_order_id: string;
  exchange: ExchangeName;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  price: number | null;
  stop_price: number | null;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  average_price: number | null;
  fee: number;
  fee_currency: string;
  reduce_only: boolean;
  post_only: boolean;
  leverage: number;
  created_at: string;
  updated_at: string;
}

// --- Ticker ---

export interface ExchangeTicker {
  symbol: string;
  exchange: ExchangeName;
  last_price: number;
  bid: number;
  ask: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  volume_24h_usd: number;
  change_24h: number;
  change_24h_pct: number;
  funding_rate: number | null;
  next_funding_time: string | null;
  open_interest: number | null;
  timestamp: number;
}

// --- Orderbook ---

export interface OrderbookEntry {
  price: number;
  quantity: number;
}

export interface Orderbook {
  symbol: string;
  exchange: ExchangeName;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  timestamp: number;
  spread: number;
  spread_pct: number;
}

// --- Exchange Config ---

export interface ExchangeConfig {
  name: ExchangeName;
  display_name: string;
  logo_url: string;
  supports_testnet: boolean;
  supports_futures: boolean;
  supports_margin: boolean;
  min_order_sizes: Record<string, number>;
  fee_tiers: FeeTier[];
  rate_limits: ExchangeRateLimit;
}

export interface FeeTier {
  tier: string;
  maker_fee: number;
  taker_fee: number;
  volume_required_usd: number;
}

export interface ExchangeRateLimit {
  requests_per_second: number;
  orders_per_second: number;
  weight_per_minute: number;
}

// --- Trade Execution ---

export interface ExecuteOrderParams {
  exchange_connection_id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price: number | null;
  stop_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  leverage: number;
  reduce_only: boolean;
  post_only: boolean;
  client_order_id: string | null;
}

export interface ExecuteOrderResult {
  success: boolean;
  order: ExchangeOrder | null;
  error_message: string | null;
  exchange_response: Record<string, unknown>;
}

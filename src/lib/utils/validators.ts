// =============================================================================
// MIDAS — Zod Validators
// Schemas de validation pour toutes les entrees utilisateur
// =============================================================================

import { z } from 'zod';

// --- Exchange Connection ---

export const exchangeConnectSchema = z.object({
  exchange: z.enum([
    'binance', 'bybit', 'okx', 'bitget', 'kucoin',
    'gate', 'mexc', 'htx', 'coinbase', 'kraken',
  ]),
  api_key: z
    .string()
    .min(10, 'Cle API trop courte')
    .max(256, 'Cle API trop longue')
    .trim(),
  api_secret: z
    .string()
    .min(10, 'Secret API trop court')
    .max(256, 'Secret API trop long')
    .trim(),
  passphrase: z
    .string()
    .max(128, 'Passphrase trop longue')
    .trim()
    .optional()
    .nullable(),
  label: z
    .string()
    .min(1, 'Le label est requis')
    .max(50, 'Label trop long (50 caracteres max)')
    .trim(),
  is_testnet: z.boolean().default(false),
});

export type ExchangeConnectInput = z.infer<typeof exchangeConnectSchema>;

// --- Bot Creation ---

export const botCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom du bot est requis')
    .max(50, 'Nom trop long (50 caracteres max)')
    .trim(),
  exchange_connection_id: z.string().uuid('ID de connexion invalide'),
  strategy: z.enum([
    'trend_following', 'mean_reversion', 'scalping', 'grid', 'dca',
    'momentum', 'breakout', 'arbitrage', 'smart_money', 'ai_adaptive',
  ]),
  symbol: z
    .string()
    .min(3, 'Symbole invalide')
    .max(20, 'Symbole trop long')
    .regex(/^[A-Z0-9]+\/[A-Z0-9]+$/, 'Format attendu: BTC/USDT')
    .trim(),
  timeframe: z.enum([
    '1m', '3m', '5m', '15m', '30m',
    '1h', '2h', '4h', '6h', '8h', '12h',
    '1d', '3d', '1w', '1M',
  ]),
  config: z.object({
    take_profit_pct: z
      .number()
      .min(0.1, 'Take profit minimum 0.1%')
      .max(100, 'Take profit maximum 100%'),
    stop_loss_pct: z
      .number()
      .min(0.1, 'Stop loss minimum 0.1%')
      .max(50, 'Stop loss maximum 50%'),
    trailing_stop: z.boolean().default(false),
    trailing_stop_pct: z
      .number()
      .min(0.1)
      .max(20)
      .default(1),
    max_position_size_usd: z
      .number()
      .min(10, 'Taille minimum 10 USD')
      .max(1_000_000, 'Taille maximum 1M USD'),
    max_concurrent_positions: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(1),
    leverage: z
      .number()
      .min(1, 'Levier minimum 1x')
      .max(125, 'Levier maximum 125x')
      .default(1),
    use_ai_coordinator: z.boolean().default(true),
    min_confidence: z
      .number()
      .min(0)
      .max(1)
      .default(0.6),
    cooldown_minutes: z
      .number()
      .int()
      .min(0)
      .max(1440)
      .default(5),
    risk_per_trade_pct: z
      .number()
      .min(0.1, 'Risque minimum 0.1%')
      .max(10, 'Risque maximum 10%')
      .default(2),
  }),
});

export type BotCreateInput = z.infer<typeof botCreateSchema>;

// --- Trade Execution ---

export const tradeExecuteSchema = z.object({
  exchange_connection_id: z.string().uuid('ID de connexion invalide'),
  symbol: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+\/[A-Z0-9]+$/, 'Format attendu: BTC/USDT'),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  quantity: z
    .number()
    .positive('La quantite doit etre positive'),
  price: z
    .number()
    .positive('Le prix doit etre positif')
    .optional()
    .nullable(),
  stop_price: z
    .number()
    .positive()
    .optional()
    .nullable(),
  take_profit: z
    .number()
    .positive()
    .optional()
    .nullable(),
  stop_loss: z
    .number()
    .positive()
    .optional()
    .nullable(),
  leverage: z
    .number()
    .min(1)
    .max(125)
    .default(1),
  reduce_only: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.type === 'limit' && !data.price) {
      return false;
    }
    return true;
  },
  { message: 'Le prix est requis pour un ordre limit', path: ['price'] }
).refine(
  (data) => {
    if ((data.type === 'stop' || data.type === 'stop_limit') && !data.stop_price) {
      return false;
    }
    return true;
  },
  { message: 'Le prix stop est requis pour un ordre stop', path: ['stop_price'] }
);

export type TradeExecuteInput = z.infer<typeof tradeExecuteSchema>;

// --- Chat Message ---

export const chatMessageSchema = z.object({
  conversation_id: z.string().uuid('ID de conversation invalide').optional(),
  content: z
    .string()
    .min(1, 'Le message ne peut pas etre vide')
    .max(10000, 'Message trop long (10000 caracteres max)')
    .trim(),
  context_data: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// --- Profile Update ---

export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caracteres')
    .max(100, 'Nom trop long (100 caracteres max)')
    .trim()
    .optional(),
  avatar_url: z
    .string()
    .url('URL d\'avatar invalide')
    .optional()
    .nullable(),
  theme: z.enum(['dark', 'oled', 'light']).optional(),
  notification_email: z.boolean().optional(),
  notification_push: z.boolean().optional(),
  notification_sms: z.boolean().optional(),
  risk_tolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  default_leverage: z
    .number()
    .min(1)
    .max(125)
    .optional(),
  preferred_exchange: z
    .string()
    .max(20)
    .optional()
    .nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// --- Backtest ---

export const backtestSchema = z.object({
  symbol: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+\/[A-Z0-9]+$/, 'Format attendu: BTC/USDT'),
  timeframe: z.enum([
    '1m', '3m', '5m', '15m', '30m',
    '1h', '2h', '4h', '6h', '8h', '12h',
    '1d', '3d', '1w', '1M',
  ]),
  strategy: z.enum([
    'trend_following', 'mean_reversion', 'scalping', 'grid', 'dca',
    'momentum', 'breakout', 'arbitrage', 'smart_money', 'ai_adaptive',
  ]),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date attendu: YYYY-MM-DD'),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date attendu: YYYY-MM-DD'),
  initial_capital: z
    .number()
    .min(100, 'Capital initial minimum 100 USD')
    .max(10_000_000, 'Capital initial maximum 10M USD'),
  leverage: z
    .number()
    .min(1)
    .max(125)
    .default(1),
  fee_rate: z
    .number()
    .min(0)
    .max(1)
    .default(0.001),
  slippage_pct: z
    .number()
    .min(0)
    .max(5)
    .default(0.05),
  take_profit_pct: z
    .number()
    .min(0.1)
    .max(100)
    .default(3),
  stop_loss_pct: z
    .number()
    .min(0.1)
    .max(50)
    .default(2),
  trailing_stop: z.boolean().default(false),
  trailing_stop_pct: z
    .number()
    .min(0.1)
    .max(20)
    .default(1),
  max_concurrent_positions: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(1),
  use_ai_signals: z.boolean().default(false),
  custom_params: z.record(z.string(), z.unknown()).default({}),
}).refine(
  (data) => new Date(data.start_date) < new Date(data.end_date),
  { message: 'La date de debut doit etre anterieure a la date de fin', path: ['end_date'] }
);

export type BacktestInput = z.infer<typeof backtestSchema>;

// --- Withdrawal ---

export const withdrawalSchema = z.object({
  amount: z
    .number()
    .min(10, 'Montant minimum de retrait : 10 EUR')
    .max(1000, 'Montant maximum de retrait : 1000 EUR'),
  method: z.enum(['stripe', 'bank_transfer']),
  bank_iban: z
    .string()
    .regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, 'IBAN invalide')
    .optional(),
  bank_bic: z
    .string()
    .regex(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'BIC invalide')
    .optional(),
  holder_name: z
    .string()
    .min(2, 'Nom du titulaire requis')
    .max(100)
    .trim()
    .optional(),
}).refine(
  (data) => {
    if (data.method === 'bank_transfer') {
      return !!data.bank_iban && !!data.bank_bic && !!data.holder_name;
    }
    return true;
  },
  { message: 'IBAN, BIC et nom du titulaire requis pour un virement bancaire', path: ['bank_iban'] }
);

export type WithdrawalInput = z.infer<typeof withdrawalSchema>;

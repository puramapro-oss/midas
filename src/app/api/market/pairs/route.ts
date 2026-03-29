import { NextResponse } from 'next/server';

const SUPPORTED_PAIRS: Record<string, string[]> = {
  binance: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
    'ADA/USDT', 'DOGE/USDT', 'DOT/USDT', 'AVAX/USDT', 'LINK/USDT',
    'MATIC/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'ARB/USDT',
    'OP/USDT', 'APT/USDT', 'INJ/USDT', 'FET/USDT', 'NEAR/USDT',
    'AAVE/USDT', 'FIL/USDT', 'RENDER/USDT', 'TIA/USDT', 'SUI/USDT',
    'BTC/USDC', 'ETH/USDC', 'ETH/BTC', 'SOL/BTC',
  ],
  bybit: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'DOT/USDT', 'AVAX/USDT', 'LINK/USDT', 'MATIC/USDT',
    'UNI/USDT', 'ATOM/USDT', 'ARB/USDT', 'OP/USDT', 'APT/USDT',
    'INJ/USDT', 'NEAR/USDT', 'SUI/USDT', 'FET/USDT', 'TIA/USDT',
    'BTC/USDC', 'ETH/USDC',
  ],
  okx: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'DOT/USDT', 'AVAX/USDT', 'LINK/USDT', 'MATIC/USDT',
    'UNI/USDT', 'ARB/USDT', 'OP/USDT', 'APT/USDT', 'INJ/USDT',
    'NEAR/USDT', 'SUI/USDT', 'BTC/USDC', 'ETH/USDC',
  ],
  bitget: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ARB/USDT', 'OP/USDT',
    'INJ/USDT', 'NEAR/USDT', 'SUI/USDT', 'FET/USDT',
  ],
  kucoin: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'DOT/USDT', 'AVAX/USDT', 'LINK/USDT', 'UNI/USDT',
    'ATOM/USDT', 'ARB/USDT', 'NEAR/USDT',
  ],
  gate: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ARB/USDT', 'OP/USDT',
    'INJ/USDT', 'FET/USDT',
  ],
  mexc: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ARB/USDT', 'FET/USDT',
  ],
  htx: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT',
    'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'ARB/USDT',
  ],
  coinbase: [
    'BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'ADA/USD',
    'DOGE/USD', 'DOT/USD', 'AVAX/USD', 'LINK/USD', 'UNI/USD',
    'ATOM/USD', 'BTC/USDC', 'ETH/USDC',
  ],
  kraken: [
    'BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'ADA/USD',
    'DOGE/USD', 'DOT/USD', 'AVAX/USD', 'LINK/USD', 'UNI/USD',
    'ATOM/USD', 'BTC/EUR', 'ETH/EUR',
  ],
};

const CACHE_MAX_AGE = 3600; // 1 hour — pairs rarely change

export async function GET() {
  try {
    return NextResponse.json(
      { pairs: SUPPORTED_PAIRS },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

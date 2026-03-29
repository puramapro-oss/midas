import type { Exchange } from 'ccxt';

export interface ExchangeBalance {
  total: Record<string, number>;
  free: Record<string, number>;
  used: Record<string, number>;
  totalUsd: number;
}

const EXCHANGE_DISPLAY_NAMES: Record<string, string> = {
  binance: 'Binance',
  kraken: 'Kraken',
  bybit: 'Bybit',
  okx: 'OKX',
  coinbase: 'Coinbase',
};

export function formatExchangeName(name: string): string {
  return EXCHANGE_DISPLAY_NAMES[name.toLowerCase()] ?? name.charAt(0).toUpperCase() + name.slice(1);
}

export async function testConnection(client: Exchange): Promise<boolean> {
  try {
    await client.fetchBalance();
    return true;
  } catch {
    return false;
  }
}

export async function getBalance(client: Exchange): Promise<ExchangeBalance> {
  const balance = await client.fetchBalance();

  const total: Record<string, number> = {};
  const free: Record<string, number> = {};
  const used: Record<string, number> = {};

  for (const [currency, amount] of Object.entries(balance.total ?? {})) {
    const value = Number(amount);
    if (value > 0) {
      total[currency] = value;
    }
  }

  for (const [currency, amount] of Object.entries(balance.free ?? {})) {
    const value = Number(amount);
    if (value > 0) {
      free[currency] = value;
    }
  }

  for (const [currency, amount] of Object.entries(balance.used ?? {})) {
    const value = Number(amount);
    if (value > 0) {
      used[currency] = value;
    }
  }

  let totalUsd = 0;
  const tickers = await client.fetchTickers(
    Object.keys(total)
      .filter((c) => c !== 'USDT' && c !== 'USD' && c !== 'USDC')
      .map((c) => `${c}/USDT`)
      .slice(0, 20),
  ).catch(() => ({}));

  for (const [currency, amount] of Object.entries(total)) {
    if (currency === 'USDT' || currency === 'USD' || currency === 'USDC') {
      totalUsd += amount;
    } else {
      const ticker = (tickers as Record<string, { last?: number }>)[`${currency}/USDT`];
      if (ticker?.last) {
        totalUsd += amount * ticker.last;
      }
    }
  }

  return { total, free, used, totalUsd };
}

export async function getSupportedPairs(client: Exchange): Promise<string[]> {
  const markets = await client.loadMarkets();
  return Object.keys(markets)
    .filter((symbol) => {
      const market = markets[symbol];
      return market?.active && market.spot;
    })
    .sort();
}

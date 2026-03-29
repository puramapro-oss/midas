import ccxt, { type Exchange } from 'ccxt';

const SUPPORTED_EXCHANGES = ['binance', 'kraken', 'bybit', 'okx', 'coinbase'] as const;
export type SupportedExchange = (typeof SUPPORTED_EXCHANGES)[number];

export function isSupportedExchange(name: string): name is SupportedExchange {
  return SUPPORTED_EXCHANGES.includes(name as SupportedExchange);
}

export function getSupportedExchanges(): readonly string[] {
  return SUPPORTED_EXCHANGES;
}

interface ExchangeOptions {
  apiKey: string;
  secret: string;
  testnet?: boolean;
}

export function createExchangeClient(
  exchangeName: SupportedExchange,
  options: ExchangeOptions,
): Exchange {
  if (!isSupportedExchange(exchangeName)) {
    throw new Error(`Unsupported exchange: ${exchangeName}. Supported: ${SUPPORTED_EXCHANGES.join(', ')}`);
  }

  const baseConfig: Record<string, unknown> = {
    apiKey: options.apiKey,
    secret: options.secret,
    enableRateLimit: true,
    timeout: 30000,
  };

  switch (exchangeName) {
    case 'binance': {
      const client = new ccxt.binance({
        ...baseConfig,
        options: {
          defaultType: 'spot',
          adjustForTimeDifference: true,
        },
      });
      if (options.testnet) {
        client.setSandboxMode(true);
      }
      return client;
    }

    case 'kraken': {
      return new ccxt.kraken({
        ...baseConfig,
        options: {
          defaultType: 'spot',
        },
      });
    }

    case 'bybit': {
      const client = new ccxt.bybit({
        ...baseConfig,
        options: {
          defaultType: 'spot',
        },
      });
      if (options.testnet) {
        client.setSandboxMode(true);
      }
      return client;
    }

    case 'okx': {
      const client = new ccxt.okx({
        ...baseConfig,
        options: {
          defaultType: 'spot',
        },
      });
      if (options.testnet) {
        client.setSandboxMode(true);
      }
      return client;
    }

    case 'coinbase': {
      return new ccxt.coinbase({
        ...baseConfig,
        options: {
          defaultType: 'spot',
        },
      });
    }
  }
}

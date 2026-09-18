export type IntegrationKind = 'core' | 'ai' | 'payment' | 'market-data' | 'optional-feature';

export interface IntegrationDefinition {
  id: string;
  label: string;
  kind: IntegrationKind;
  required: boolean;
  env: string[];
  freeFallback?: string;
  note?: string;
}

export const INTEGRATIONS: readonly IntegrationDefinition[] = [
  { id: 'supabase', label: 'Supabase', kind: 'core', required: true, env: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] },
  { id: 'upstash', label: 'Upstash Redis', kind: 'core', required: true, env: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
  { id: 'security', label: 'Secrets internes', kind: 'core', required: true, env: ['CRON_SECRET', 'ENCRYPTION_KEY'] },
  { id: 'anthropic', label: 'Anthropic / SMARANA', kind: 'ai', required: true, env: ['ANTHROPIC_API_KEY'], note: 'Analyse MIDAS et streaming Claude.' },
  { id: 'openai', label: 'OpenAI Whisper', kind: 'optional-feature', required: false, env: ['OPENAI_API_KEY'], note: 'Transcription vocale uniquement.' },
  { id: 'elevenlabs', label: 'ElevenLabs', kind: 'optional-feature', required: false, env: ['ELEVENLABS_API_KEY'], note: 'Synthese vocale uniquement.' },
  { id: 'stripe', label: 'Stripe', kind: 'payment', required: true, env: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'INTERNAL_WEBHOOK_SECRET'] },
  { id: 'resend', label: 'Resend', kind: 'optional-feature', required: false, env: ['RESEND_API_KEY'], note: 'Emails, rapports et alertes de quota.' },
  { id: 'coinmarketcap', label: 'CoinMarketCap', kind: 'market-data', required: false, env: ['COINMARKETCAP_API_KEY'], freeFallback: 'CoinPaprika, Binance, CoinGecko' },
  { id: 'coinmarketcal', label: 'CoinMarketCal', kind: 'market-data', required: false, env: ['COINMARKETCAL_API_KEY'], freeFallback: 'CoinPaprika' },
  { id: 'newsapi', label: 'NewsAPI', kind: 'market-data', required: false, env: ['NEWSAPI_API_KEY'], freeFallback: 'Free Crypto News, Reddit' },
  { id: 'etherscan', label: 'Etherscan', kind: 'market-data', required: false, env: ['ETHERSCAN_API_KEY'], freeFallback: 'Dune, Binance' },
  { id: 'dune', label: 'Dune', kind: 'market-data', required: false, env: ['DUNE_API_KEY'], freeFallback: 'Etherscan' },
  { id: 'whale-alert', label: 'Whale Alert', kind: 'market-data', required: false, env: ['WHALE_ALERT_API_KEY'], freeFallback: 'Binance large trades' },
  { id: 'youtube', label: 'YouTube Data', kind: 'market-data', required: false, env: ['YOUTUBE_API_KEY'], freeFallback: 'Reddit, Google Trends' },
] as const;

function hasValue(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function getIntegrationConfiguration() {
  return INTEGRATIONS.map((integration) => {
    const missing = integration.env.filter((name) => !hasValue(name));
    return { ...integration, configured: missing.length === 0, missing };
  });
}

export function getRequiredEnvironmentErrors(): string[] {
  return getIntegrationConfiguration()
    .filter((integration) => integration.required && !integration.configured)
    .flatMap((integration) => integration.missing.map((name) => `${integration.label}: ${name}`));
}

export const KEYLESS_DATA_SOURCES = [
  'Binance public market data',
  'CoinGecko',
  'CoinPaprika',
  'DefiLlama',
  'Alternative.me Fear & Greed',
  'Reddit public feeds',
  'Google Trends public endpoint',
  'Free Crypto News',
] as const;

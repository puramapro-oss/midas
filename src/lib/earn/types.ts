export interface EarnOpportunity {
  id: string;
  asset: string;
  symbol: string;
  protocol: string;
  chain: string;
  apy: number;
  tvlUsd: number;
  category: 'stablecoin' | 'crypto';
  ilRisk: string;
  exposure: string;
  url: string;
}

export type Tab = 'opportunities' | 'positions' | 'history';
export type Filter = 'all' | 'stablecoin' | 'crypto';

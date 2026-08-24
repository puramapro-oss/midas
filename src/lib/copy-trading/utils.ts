import { Users, Trophy, Copy, UserPlus } from 'lucide-react';

export type Tab = 'traders' | 'my-copies' | 'become';

export const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'traders', label: 'Top Traders', icon: Trophy },
  { id: 'my-copies', label: 'Mes Copies', icon: Copy },
  { id: 'become', label: 'Devenir Trader', icon: UserPlus },
];

export function formatPnl(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

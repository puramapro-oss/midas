'use client';

import { Users, Pause, Play, StopCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { TraderProfile, CopyRelationship } from '@/types/database';

interface CopyCardProps {
  copy: CopyRelationship;
  onPause: (traderId: string) => void;
  onResume: (traderId: string) => void;
  onStop: (traderId: string) => void;
  isLoading: boolean;
}

export default function CopyCard({ copy, onPause, onResume, onStop, isLoading }: CopyCardProps) {
  const trader = copy.trader as TraderProfile | undefined;

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
              <Users className="size-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">{trader?.display_name ?? 'Trader'}</h3>
              <p className="text-xs text-white/50">{copy.total_copied_trades} trades copiés</p>
            </div>
          </div>
          <Badge
            variant={copy.status === 'active' ? 'success' : copy.status === 'paused' ? 'warning' : 'default'}
          >
            {copy.status === 'active' ? 'Actif' : copy.status === 'paused' ? 'Pause' : 'Arrêté'}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="text-xs text-white/50">Capital alloué</p>
            <p className="font-bold text-white font-mono">${copy.copy_amount}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="text-xs text-white/50">P&L total</p>
            <p className={`font-bold font-mono ${copy.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {copy.total_pnl >= 0 ? '+' : ''}{copy.total_pnl.toFixed(2)}$
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="text-xs text-white/50">Commission</p>
            <p className="font-bold text-white/70 font-mono">${copy.commission_paid.toFixed(2)}</p>
          </div>
        </div>
        {copy.status !== 'stopped' && (
          <div className="flex gap-2">
            {copy.status === 'active' ? (
              <button
                onClick={() => onPause(copy.trader_id)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm hover:bg-white/10 transition"
              >
                <Pause className="size-4" /> Pause
              </button>
            ) : (
              <button
                onClick={() => onResume(copy.trader_id)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm hover:bg-emerald-500/20 transition"
              >
                <Play className="size-4" /> Reprendre
              </button>
            )}
            <button
              onClick={() => onStop(copy.trader_id)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm hover:bg-red-500/20 transition"
            >
              <StopCircle className="size-4" /> Arrêter
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

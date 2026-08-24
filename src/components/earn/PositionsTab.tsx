'use client';

import { ArrowDownToLine, BarChart3, Coins, Loader2, PiggyBank, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { EarnPosition } from '@/types/database';

interface PositionsTabProps {
  loading: boolean;
  posStats: {
    totalInvested: number;
    totalEarnings: number;
    dailyEarnings: number;
    avgApy: number;
    count: number;
  };
  positions: EarnPosition[];
  subscribing: string | null;
  onRedeem: (positionId: string) => void;
  onViewOpportunities: () => void;
}

export default function PositionsTab({
  loading,
  posStats,
  positions,
  subscribing,
  onRedeem,
  onViewOpportunities,
}: PositionsTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <Wallet className="size-4" /> Capital investi
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono">
              {loading ? '...' : `$${posStats.totalInvested.toFixed(2)}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <TrendingUp className="size-4" /> Gains totaux
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
              {loading ? '...' : `+$${posStats.totalEarnings.toFixed(4)}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <BarChart3 className="size-4" /> Gains/jour
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">
              {loading ? '...' : `+$${posStats.dailyEarnings.toFixed(4)}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <PiggyBank className="size-4" /> APY moyen
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">
              {loading ? '...' : `${posStats.avgApy.toFixed(2)}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="size-6 animate-spin text-amber-400" />
        </div>
      ) : positions.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <PiggyBank className="size-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Aucune position active</h3>
            <p className="text-sm text-white/50 max-w-md mx-auto">
              Explore les opportunités et place ton capital pour générer des revenus passifs.
            </p>
            <button
              onClick={onViewOpportunities}
              className="mt-4 px-6 py-2 bg-amber-500 text-black rounded-xl font-medium hover:brightness-110 transition"
            >
              Voir les opportunités
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => (
            <Card key={pos.id}>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                      <Coins className="size-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{pos.asset}</h3>
                      <p className="text-xs text-white/50 capitalize">
                        {pos.product_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={pos.lock_period_days > 0 ? 'warning' : 'success'}>
                    {pos.lock_period_days > 0 ? `Verrouillé ${pos.lock_period_days}j` : 'Flexible'}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-xs text-white/50">Montant</p>
                    <p className="font-bold text-white font-mono text-sm">
                      {Number(pos.amount).toFixed(4)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-xs text-white/50">APY</p>
                    <p className="font-bold text-amber-400 font-mono text-sm">
                      {Number(pos.apy).toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-xs text-white/50">Gains/jour</p>
                    <p className="font-bold text-emerald-400 font-mono text-sm">
                      +{Number(pos.daily_earnings).toFixed(6)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-xs text-white/50">Gains totaux</p>
                    <p className="font-bold text-emerald-400 font-mono text-sm">
                      +{Number(pos.total_earnings).toFixed(6)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRedeem(pos.id)}
                  disabled={subscribing === pos.id}
                  className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {subscribing === pos.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowDownToLine className="size-4" />
                      Retirer
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

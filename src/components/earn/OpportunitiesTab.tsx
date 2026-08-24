'use client';

import { AlertCircle, ExternalLink, Loader2, Lock, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { EarnOpportunity, Filter } from '@/lib/earn/types';
import { formatTvl, formatProtocol } from '@/lib/earn/utils';

interface OpportunitiesTabProps {
  loading: boolean;
  fallback: boolean;
  oppStats: { avgApy: number; maxApy: number; totalTvl: number };
  filter: Filter;
  setFilter: (f: Filter) => void;
  filtered: EarnOpportunity[];
}

export default function OpportunitiesTab({
  loading,
  fallback,
  oppStats,
  filter,
  setFilter,
  filtered,
}: OpportunitiesTabProps) {
  return (
    <>
      {fallback && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100/80">
            Données DefiLlama indisponibles — affichage de la liste de secours.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <TrendingUp className="size-4" /> APY moyen
            </div>
            <div className="mt-2 text-3xl font-bold text-amber-400">
              {loading ? '...' : `${oppStats.avgApy.toFixed(2)}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <Zap className="size-4" /> APY max
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-400">
              {loading ? '...' : `${oppStats.maxApy.toFixed(2)}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <ShieldCheck className="size-4" /> TVL totale
            </div>
            <div className="mt-2 text-3xl font-bold text-white">
              {loading ? '...' : formatTvl(oppStats.totalTvl)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {[
          { id: 'all' as const, label: 'Tout' },
          { id: 'stablecoin' as const, label: 'Stablecoins' },
          { id: 'crypto' as const, label: 'Crypto' },
        ].map((f) => (
          <button
            key={f.id}
            data-testid={`earn-filter-${f.id}`}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f.id ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-white/50 flex items-center justify-center gap-2">
              <Loader2 className="size-5 animate-spin" />
              Chargement des opportunités...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-white/50">Aucune opportunité pour ce filtre.</div>
          ) : (
            <table className="w-full text-sm" data-testid="earn-table">
              <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Protocole</th>
                  <th className="px-4 py-3">Chain</th>
                  <th className="px-4 py-3 text-right">APY</th>
                  <th className="px-4 py-3 text-right">TVL</th>
                  <th className="px-4 py-3 text-right">Risque IL</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{o.symbol}</span>
                        {o.category === 'stablecoin' && (
                          <Badge variant="success" className="text-[10px]">
                            STABLE
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{formatProtocol(o.protocol)}</td>
                    <td className="px-4 py-3 text-white/50">{o.chain}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-400">
                      {o.apy.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-white/60">{formatTvl(o.tvlUsd)}</td>
                    <td className="px-4 py-3 text-right">
                      {o.ilRisk === 'no' ? (
                        <Badge variant="success" className="text-[10px]">
                          <Lock className="size-2.5 mr-1 inline" /> Aucun
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">
                          Présent
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs"
                      >
                        Ouvrir <ExternalLink className="size-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

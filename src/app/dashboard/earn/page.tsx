'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Coins, Lock, Zap, ExternalLink, RefreshCw, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface EarnOpportunity {
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

type Filter = 'all' | 'stablecoin' | 'crypto';

function formatTvl(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatProtocol(p: string): string {
  return p
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function EarnPage() {
  const [opps, setOpps] = useState<EarnOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [fallback, setFallback] = useState(false);

  const fetchOpps = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/earn/opportunities');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setOpps(json.opportunities ?? []);
      setFallback(Boolean(json.fallback));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpps();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return opps;
    return opps.filter((o) => o.category === filter);
  }, [opps, filter]);

  const stats = useMemo(() => {
    if (opps.length === 0) return { avgApy: 0, maxApy: 0, totalTvl: 0 };
    return {
      avgApy: opps.reduce((s, o) => s + o.apy, 0) / opps.length,
      maxApy: Math.max(...opps.map((o) => o.apy)),
      totalTvl: opps.reduce((s, o) => s + o.tvlUsd, 0),
    };
  }, [opps]);

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="earn-page">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Coins className="text-amber-400" />
            Revenus Passifs
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Meilleurs rendements DeFi & Binance Earn — Aucun argent qui dort.
          </p>
        </div>
        <button
          onClick={fetchOpps}
          disabled={loading}
          data-testid="earn-refresh"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Actualiser
        </button>
      </motion.div>

      {fallback && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100/80">
            Données DefiLlama indisponibles — affichage de la liste de secours. Réessaie dans quelques minutes.
          </div>
        </div>
      )}

      {error && !fallback && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
          <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-100/80">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <TrendingUp className="size-4" /> APY moyen
            </div>
            <div className="mt-2 text-3xl font-bold text-amber-400">
              {loading ? '…' : `${stats.avgApy.toFixed(2)}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <Zap className="size-4" /> APY max
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-400">
              {loading ? '…' : `${stats.maxApy.toFixed(2)}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <ShieldCheck className="size-4" /> TVL totale
            </div>
            <div className="mt-2 text-3xl font-bold text-white">
              {loading ? '…' : formatTvl(stats.totalTvl)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2" role="tablist">
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
              filter === f.id
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
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
              Chargement des opportunités…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-white/50">
              Aucune opportunité trouvée pour ce filtre.
            </div>
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
                          <Badge variant="success" className="text-[10px]">STABLE</Badge>
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
                        <Badge variant="warning" className="text-[10px]">Présent</Badge>
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

      <p className="text-xs text-white/40 text-center">
        Données fournies par DefiLlama (open-source) — APY indicatifs, peuvent varier. MIDAS Risk Agent
        valide chaque allocation avant exécution.
      </p>
    </div>
  );
}

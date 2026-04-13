'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Coins, Lock, Zap, ExternalLink, RefreshCw, Loader2, AlertCircle,
  ShieldCheck, Wallet, PiggyBank, Clock, Plus, ArrowDownToLine, BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { toast } from 'sonner';
import type { EarnPosition } from '@/types/database';

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

type Tab = 'opportunities' | 'positions' | 'history';
type Filter = 'all' | 'stablecoin' | 'crypto';

function formatTvl(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatProtocol(p: string): string {
  return p.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function EarnPage() {
  const [tab, setTab] = useState<Tab>('opportunities');
  const [opps, setOpps] = useState<EarnOpportunity[]>([]);
  const [positions, setPositions] = useState<EarnPosition[]>([]);
  const [posStats, setPosStats] = useState({ totalInvested: 0, totalEarnings: 0, dailyEarnings: 0, avgApy: 0, count: 0 });
  const [history, setHistory] = useState<{ id: string; action: string; asset: string; amount: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [fallback, setFallback] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const fetchOpps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/earn/opportunities');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setOpps(json.opportunities ?? []);
      setFallback(Boolean(json.fallback));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/earn/positions?tab=positions');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPositions(json.positions ?? []);
      setPosStats(json.stats ?? { totalInvested: 0, totalEarnings: 0, dailyEarnings: 0, avgApy: 0, count: 0 });
    } catch {
      toast.error('Erreur de chargement des positions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/earn/positions?tab=history');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setHistory(json.history ?? []);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'opportunities') fetchOpps();
    else if (tab === 'positions') fetchPositions();
    else if (tab === 'history') fetchHistory();
  }, [tab, fetchOpps, fetchPositions, fetchHistory]);

  const filtered = useMemo(() => {
    if (filter === 'all') return opps;
    return opps.filter((o) => o.category === filter);
  }, [opps, filter]);

  const oppStats = useMemo(() => {
    if (opps.length === 0) return { avgApy: 0, maxApy: 0, totalTvl: 0 };
    return {
      avgApy: opps.reduce((s, o) => s + o.apy, 0) / opps.length,
      maxApy: Math.max(...opps.map((o) => o.apy)),
      totalTvl: opps.reduce((s, o) => s + o.tvlUsd, 0),
    };
  }, [opps]);

  const handleRedeem = async (positionId: string) => {
    setSubscribing(positionId);
    try {
      const res = await fetch('/api/earn/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', position_id: positionId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success(json.message);
      fetchPositions();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSubscribing(null);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Coins }[] = [
    { id: 'opportunities', label: 'Opportunités', icon: TrendingUp },
    { id: 'positions', label: 'Mes Positions', icon: PiggyBank },
    { id: 'history', label: 'Historique', icon: Clock },
  ];

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
            Binance Earn & DeFi — Fais travailler ton capital.
          </p>
        </div>
        <button
          onClick={() => tab === 'opportunities' ? fetchOpps() : tab === 'positions' ? fetchPositions() : fetchHistory()}
          disabled={loading}
          data-testid="earn-refresh"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Actualiser
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`earn-tab-${t.id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.id ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* OPPORTUNITIES TAB */}
      {tab === 'opportunities' && (
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
                              <Badge variant="success" className="text-[10px]">STABLE</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/70">{formatProtocol(o.protocol)}</td>
                        <td className="px-4 py-3 text-white/50">{o.chain}</td>
                        <td className="px-4 py-3 text-right font-bold text-amber-400">{o.apy.toFixed(2)}%</td>
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
        </>
      )}

      {/* POSITIONS TAB */}
      {tab === 'positions' && (
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
                  onClick={() => setTab('opportunities')}
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
                          <p className="text-xs text-white/50 capitalize">{pos.product_type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <Badge variant={pos.lock_period_days > 0 ? 'warning' : 'success'}>
                        {pos.lock_period_days > 0 ? `Verrouillé ${pos.lock_period_days}j` : 'Flexible'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-xs text-white/50">Montant</p>
                        <p className="font-bold text-white font-mono text-sm">{Number(pos.amount).toFixed(4)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-xs text-white/50">APY</p>
                        <p className="font-bold text-amber-400 font-mono text-sm">{Number(pos.apy).toFixed(2)}%</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-xs text-white/50">Gains/jour</p>
                        <p className="font-bold text-emerald-400 font-mono text-sm">+{Number(pos.daily_earnings).toFixed(6)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-xs text-white/50">Gains totaux</p>
                        <p className="font-bold text-emerald-400 font-mono text-sm">+{Number(pos.total_earnings).toFixed(6)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedeem(pos.id)}
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
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="size-6 animate-spin text-amber-400 mx-auto" />
              </div>
            ) : history.length === 0 ? (
              <div className="p-10 text-center text-white/50">Aucun historique pour le moment.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/50">
                        {new Date(h.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={h.action === 'interest' || h.action === 'bonus' ? 'success' : 'default'}>
                          {h.action === 'subscribe' ? 'Souscription' :
                           h.action === 'redeem' ? 'Retrait' :
                           h.action === 'interest' ? 'Intérêts' : 'Bonus'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{h.asset}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{Number(h.amount).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-white/40 text-center">
        Données fournies par DefiLlama (open-source) — APY indicatifs, peuvent varier. MIDAS Risk Agent
        valide chaque allocation avant exécution.
      </p>
    </div>
  );
}

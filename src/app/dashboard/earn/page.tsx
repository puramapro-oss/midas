'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coins, RefreshCw, Loader2, TrendingUp, PiggyBank, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { EarnPosition } from '@/types/database';
import type { EarnOpportunity, Tab, Filter } from '@/lib/earn/types';
import OpportunitiesTab from '@/components/earn/OpportunitiesTab';
import PositionsTab from '@/components/earn/PositionsTab';
import HistoryTab from '@/components/earn/HistoryTab';

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
    if (tab === 'opportunities') queueMicrotask(() => fetchOpps());
    else if (tab === 'positions') queueMicrotask(() => fetchPositions());
    else if (tab === 'history') queueMicrotask(() => fetchHistory());
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

      {tab === 'opportunities' && (
        <OpportunitiesTab
          loading={loading}
          fallback={fallback}
          oppStats={oppStats}
          filter={filter}
          setFilter={setFilter}
          filtered={filtered}
        />
      )}

      {tab === 'positions' && (
        <PositionsTab
          loading={loading}
          posStats={posStats}
          positions={positions}
          subscribing={subscribing}
          onRedeem={handleRedeem}
          onViewOpportunities={() => setTab('opportunities')}
        />
      )}

      {tab === 'history' && <HistoryTab loading={loading} history={history} />}

      <p className="text-xs text-white/40 text-center">
        Données fournies par DefiLlama (open-source) — APY indicatifs, peuvent varier. MIDAS Risk Agent
        valide chaque allocation avant exécution.
      </p>
    </div>
  );
}

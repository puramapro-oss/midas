'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TraderProfile, CopyRelationship } from '@/types/database';
import { tabs, type Tab } from '@/lib/copy-trading/utils';
import TraderCard from '@/components/copy-trading/TraderCard';
import CopyCard from '@/components/copy-trading/CopyCard';
import EmptyState from '@/components/copy-trading/EmptyState';
import BecomeTraderForm from '@/components/copy-trading/BecomeTraderForm';

export default function CopyTradingPage() {
  const [tab, setTab] = useState<Tab>('traders');
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [copies, setCopies] = useState<CopyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/copy-trading?tab=${t === 'become' ? 'my-profile' : t === 'my-copies' ? 'my-copies' : 'traders'}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (t === 'traders') setTraders(json.traders ?? []);
      if (t === 'my-copies') setCopies(json.copies ?? []);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => fetchData(tab)); }, [tab, fetchData]);

  const handleAction = async (
    action: string,
    trader_id?: string,
    params?: { display_name?: string; bio?: string; copy_amount?: number }
  ) => {
    setActionLoading(trader_id ?? 'global');
    try {
      const res = await fetch('/api/copy-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          trader_id,
          copy_amount: params?.copy_amount ?? 100,
          copy_ratio: 1,
          display_name: params?.display_name,
          bio: params?.bio,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success(json.message);
      fetchData(tab);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="copy-trading-page">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Users className="text-amber-400" />
          Copy Trading
        </h1>
        <p className="text-white/60 text-sm mt-1">
          Copie les meilleurs traders ou partage tes stratégies.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`copy-tab-${t.id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.id
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="size-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <>
          {/* TOP TRADERS */}
          {tab === 'traders' && (
            <div className="space-y-3">
              {traders.length === 0 ? (
                <EmptyState variant="no-traders" onAction={() => setTab('become')} />
              ) : (
                traders.map((trader, i) => (
                  <TraderCard
                    key={trader.id}
                    trader={trader}
                    index={i}
                    onFollow={(id) => handleAction('follow', id)}
                    isLoading={actionLoading === trader.id}
                  />
                ))
              )}
            </div>
          )}

          {/* MY COPIES */}
          {tab === 'my-copies' && (
            <div className="space-y-3">
              {copies.length === 0 ? (
                <EmptyState variant="no-copies" onAction={() => setTab('traders')} />
              ) : (
                copies.map((copy) => (
                  <CopyCard
                    key={copy.id}
                    copy={copy}
                    onPause={(id) => handleAction('pause', id)}
                    onResume={(id) => handleAction('resume', id)}
                    onStop={(id) => handleAction('unfollow', id)}
                    isLoading={actionLoading === copy.trader_id}
                  />
                ))
              )}
            </div>
          )}

          {/* BECOME TRADER */}
          {tab === 'become' && (
            <BecomeTraderForm
              onSubmit={(name, bio) => handleAction('become_trader', undefined, { display_name: name, bio })}
              isLoading={actionLoading === 'global'}
            />
          )}
        </>
      )}
    </div>
  );
}

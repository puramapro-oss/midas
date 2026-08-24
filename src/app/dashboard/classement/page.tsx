'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Gift, Loader2 } from 'lucide-react';
import type { RankingData, ContestData } from '@/lib/classement/types';
import ClassementTab from '@/components/classement/ClassementTab';
import RecompensesTab from '@/components/classement/RecompensesTab';

type Tab = 'classement' | 'recompenses';

export default function ClassementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('classement');
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [contestData, setContestData] = useState<ContestData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [rankingRes, contestRes] = await Promise.all([
        fetch('/api/ranking'),
        fetch('/api/contest'),
      ]);
      if (rankingRes.ok) {
        const r = await rankingRes.json();
        setRankingData(r);
      }
      if (contestRes.ok) {
        const c = await contestRes.json();
        setContestData(c);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  return (
    <div className="space-y-5" data-testid="classement-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          Classement & Récompenses
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Les portefeuilles les mieux protégés sont récompensés.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
        {([
          { key: 'classement' as Tab, label: 'Classement', icon: Trophy },
          { key: 'recompenses' as Tab, label: 'Récompenses', icon: Gift },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/[0.08]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-[#FFD700]' : ''}`} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'classement' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 'classement' ? 12 : -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'classement' ? (
              <ClassementTab data={rankingData} />
            ) : (
              <RecompensesTab data={contestData} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

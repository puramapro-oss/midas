'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Search, Loader2, ArrowRight, QrCode, TrendingUp, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TIER_LABELS, TIER_COLORS, CHANNEL_LABELS } from '@/types/partnership';
import type { Partner } from '@/types/partnership';

export default function AdminPartenairesPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const fetchPartners = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setPartners(data as Partner[]);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPartners();
    }
  }, [isSuperAdmin, fetchPartners]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  const filteredPartners = partners.filter((p) => {
    const matchesSearch = p.display_name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalEarnings = partners.reduce((sum, p) => sum + Number(p.total_earned), 0);
  const totalReferrals = partners.reduce((sum, p) => sum + p.total_referrals, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
          Gestion des partenaires
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {partners.length} partenaire{partners.length !== 1 ? 's' : ''} inscrits
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <Users className="w-4 h-4 text-[var(--info)] mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{partners.length}</p>
          <p className="text-xs text-[var(--text-tertiary)]">Partenaires</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <TrendingUp className="w-4 h-4 text-[var(--success)] mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{totalReferrals}</p>
          <p className="text-xs text-[var(--text-tertiary)]">Filleuls totaux</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <QrCode className="w-4 h-4 text-[var(--gold-primary)] mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {partners.reduce((sum, p) => sum + p.total_scans, 0)}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Scans totaux</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-xl p-4">
          <Trophy className="w-4 h-4 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{totalEarnings.toFixed(0)} EUR</p>
          <p className="text-xs text-[var(--text-tertiary)]">Commissions versees</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou code..."
            className="w-full bg-white/5 border border-white/[0.06] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold-primary)]/30"
            data-testid="admin-partner-search"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/5 border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none"
          data-testid="admin-partner-filter"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="pending">En attente</option>
          <option value="suspended">Suspendu</option>
          <option value="banned">Banni</option>
        </select>
      </div>

      {/* Partners list */}
      {filteredPartners.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Aucun partenaire trouve</p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-6 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-[var(--text-tertiary)] font-medium">
            <span>Partenaire</span>
            <span>Canal</span>
            <span>Tier</span>
            <span>Filleuls</span>
            <span>Gains</span>
            <span className="text-right">Actions</span>
          </div>

          {filteredPartners.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-2 md:grid-cols-6 gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{p.display_name}</p>
                <p className="text-xs text-[var(--text-tertiary)] font-mono">{p.code}</p>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {CHANNEL_LABELS[p.channel]}
              </div>
              <div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${TIER_COLORS[p.tier]}20`, color: TIER_COLORS[p.tier] }}
                >
                  {TIER_LABELS[p.tier]}
                </span>
              </div>
              <div className="text-sm text-[var(--text-primary)]">{p.total_referrals}</div>
              <div className="text-sm text-[var(--gold-primary)] font-medium">{Number(p.total_earned).toFixed(2)} EUR</div>
              <div className="text-right">
                <Link
                  href={`/admin/partenaires/${p.id}`}
                  className="inline-flex items-center gap-1 text-xs text-[var(--gold-primary)] hover:underline"
                  data-testid={`admin-partner-view-${p.id}`}
                >
                  Details
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

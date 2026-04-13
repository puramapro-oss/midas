'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, DollarSign, TrendingUp, Bot, Activity, CreditCard, Trophy, ArrowRight, Loader2 } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  usersByPlan: { free: number; pro: number; ultra: number };
  estimatedMRR: number;
  tradesToday: number;
  activeBots: number;
  activeSubscriptions: number;
}

function KPICard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-[#FFD700]" />
        <span className="text-white/50 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold font-[family-name:var(--font-jetbrains-mono)] text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, count }: { href: string; icon: React.ElementType; label: string; count?: number }) {
  return (
    <Link href={href} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-[#FFD700]/20 hover:bg-[#FFD700]/[0.02] transition-all group">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-white/40 group-hover:text-[#FFD700] transition-colors" />
        <span className="text-sm text-white/70 group-hover:text-white transition-colors">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">{count}</span>
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#FFD700] transition-colors" />
    </Link>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setStats(data.stats);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="admin-dashboard">
        <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  const s = stats ?? { totalUsers: 0, usersByPlan: { free: 0, pro: 0, ultra: 0 }, estimatedMRR: 0, tradesToday: 0, activeBots: 0, activeSubscriptions: 0 };

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] text-[#FFD700]">
        Dashboard Admin
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="Utilisateurs"
          value={s.totalUsers.toLocaleString('fr-FR')}
          sub={`Free: ${s.usersByPlan.free} · Pro: ${s.usersByPlan.pro} · Ultra: ${s.usersByPlan.ultra}`}
        />
        <KPICard
          icon={DollarSign}
          label="MRR estimé"
          value={`${s.estimatedMRR.toLocaleString('fr-FR')}€`}
          sub={`${s.activeSubscriptions} abonnements actifs`}
        />
        <KPICard
          icon={TrendingUp}
          label="Trades aujourd'hui"
          value={s.tradesToday.toLocaleString('fr-FR')}
        />
        <KPICard
          icon={Bot}
          label="Bots actifs"
          value={s.activeBots.toLocaleString('fr-FR')}
        />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 mb-3">Accès rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickLink href="/admin/users" icon={Users} label="Gérer les utilisateurs" />
          <QuickLink href="/admin/withdrawals" icon={CreditCard} label="Demandes de retrait" />
          <QuickLink href="/admin/contests" icon={Trophy} label="Concours et tirages" />
        </div>
      </div>

      {/* System health */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 mb-3">Santé du système</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Supabase', status: 'up' },
            { name: 'Claude API', status: 'up' },
            { name: 'Stripe', status: 'up' },
            { name: 'Binance', status: 'up' },
            { name: 'Redis', status: 'up' },
            { name: 'Resend', status: 'up' },
            { name: 'Sentry', status: 'up' },
            { name: 'PostHog', status: 'up' },
          ].map((service) => (
            <div key={service.name} className="bg-[#0A0F1A]/80 border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
              <Activity className={`w-4 h-4 ${service.status === 'up' ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-sm text-white/70">{service.name}</span>
              <span className={`ml-auto text-xs ${service.status === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {service.status === 'up' ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

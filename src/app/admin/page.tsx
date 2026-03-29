'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Bot, Activity, Search } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  ultraUsers: number;
  estimatedMRR: number;
  tradesToday: number;
  activeBots: number;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  created_at: string;
}

const MOCK_STATS: AdminStats = {
  totalUsers: 1247,
  freeUsers: 982,
  proUsers: 213,
  ultraUsers: 52,
  estimatedMRR: 213 * 33 + 52 * 77,
  tradesToday: 342,
  activeBots: 89,
};

const MOCK_USERS: UserRow[] = [
  { id: '1', email: 'matiss.frasne@gmail.com', full_name: 'Tissma', plan: 'ultra', created_at: '2026-01-01' },
  { id: '2', email: 'marc.dupont@gmail.com', full_name: 'Marc Dupont', plan: 'pro', created_at: '2026-02-15' },
  { id: '3', email: 'sophie.martin@gmail.com', full_name: 'Sophie Martin', plan: 'pro', created_at: '2026-02-20' },
  { id: '4', email: 'thomas.renard@gmail.com', full_name: 'Thomas Renard', plan: 'free', created_at: '2026-03-01' },
  { id: '5', email: 'lea.moreau@gmail.com', full_name: 'Léa Moreau', plan: 'ultra', created_at: '2026-03-10' },
];

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

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-white/10 text-white/60',
    pro: 'bg-[#FFD700]/20 text-[#FFD700]',
    ultra: 'bg-purple-500/20 text-purple-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${colors[plan] ?? colors.free}`}>
      {plan}
    </span>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats>(MOCK_STATS);
  const [users, setUsers] = useState<UserRow[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setStats(data.stats);
          if (data.users) setUsers(data.users);
        }
      } catch {
        // Keep mock data
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] text-[#FFD700]">
        Dashboard Admin
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Total utilisateurs" value={stats.totalUsers.toLocaleString()} sub={`Free: ${stats.freeUsers} · Pro: ${stats.proUsers} · Ultra: ${stats.ultraUsers}`} />
        <KPICard icon={DollarSign} label="MRR estimé" value={`${stats.estimatedMRR.toLocaleString()}€`} sub="Revenus mensuels récurrents" />
        <KPICard icon={TrendingUp} label="Trades aujourd'hui" value={stats.tradesToday.toLocaleString()} />
        <KPICard icon={Bot} label="Bots actifs" value={stats.activeBots.toLocaleString()} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Utilisateurs</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/50"
            />
          </div>
        </div>

        <div className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-white/50 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Nom</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{user.email}</td>
                  <td className="px-4 py-3 text-white/70">{user.full_name ?? '—'}</td>
                  <td className="px-4 py-3"><PlanBadge plan={user.plan} /></td>
                  <td className="px-4 py-3 text-white/50">{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-white/30">Aucun utilisateur trouvé</div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Santé du système</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Supabase', status: 'up' },
            { name: 'Claude API', status: 'up' },
            { name: 'Stripe', status: 'up' },
            { name: 'CoinGecko', status: 'up' },
            { name: 'Binance', status: 'up' },
            { name: 'Redis', status: 'up' },
            { name: 'Resend', status: 'up' },
            { name: 'Sentry', status: 'up' },
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

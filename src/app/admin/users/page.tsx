'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Users, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  role: string;
  subscription_status: string | null;
  auto_trade_enabled: boolean;
  created_at: string;
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-white/10 text-white/60',
    pro: 'bg-[#FFD700]/20 text-[#FFD700]',
    ultra: 'bg-purple-500/20 text-purple-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${colors[plan] ?? colors.free}`}>
      {plan}
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6" data-testid="admin-users">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white font-[family-name:var(--font-orbitron)]">Utilisateurs</h1>
          <p className="text-sm text-white/40 mt-1">{total} utilisateurs inscrits</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher email ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/50 w-64"
            data-testid="users-search"
          />
        </div>
      </div>

      <div className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-white/50 font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-white/50 font-medium">Nom</th>
                    <th className="text-left px-4 py-3 text-white/50 font-medium">Plan</th>
                    <th className="text-left px-4 py-3 text-white/50 font-medium">Rôle</th>
                    <th className="text-left px-4 py-3 text-white/50 font-medium">Abo</th>
                    <th className="text-left px-4 py-3 text-white/50 font-medium">Auto-trade</th>
                    <th className="text-left px-4 py-3 text-white/50 font-medium">Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white text-xs font-mono" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{u.email}</td>
                      <td className="px-4 py-3 text-white/70 text-xs">{u.full_name ?? '—'}</td>
                      <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                      <td className="px-4 py-3 text-xs text-white/50">{u.role}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.subscription_status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                          {u.subscription_status ?? 'inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`w-2 h-2 rounded-full inline-block ${u.auto_trade_enabled ? 'bg-emerald-400' : 'bg-white/10'}`} />
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">Aucun utilisateur trouvé</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white disabled:opacity-30 transition-colors"
            data-testid="users-prev"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Précédent
          </button>
          <span className="text-xs text-white/40">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white disabled:opacity-30 transition-colors"
            data-testid="users-next"
          >
            Suivant <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/formatters';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  plan: 'free' | 'pro' | 'ultra';
  role: string;
  tier: string | null;
  subscription_status: string | null;
  auto_trade_enabled: boolean;
  created_at: string;
}

interface AdminUsersTableProps {
  users: AdminUser[];
  onSearch: (query: string) => void;
}

const planColors: Record<string, string> = {
  free: 'bg-white/10 text-white/70',
  pro: 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30',
  ultra: 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 text-[#FFD700] border border-[#FFD700]/40',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminUsersTable({ users, onSearch }: AdminUsersTableProps) {
  const [searchValue, setSearchValue] = useState('');

  function handleSearch(value: string) {
    setSearchValue(value);
    onSearch(value);
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          data-testid="admin-users-search"
          type="text"
          placeholder="Rechercher par email ou nom..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className={cn(
            'w-full pl-10 pr-4 py-3 rounded-xl text-sm',
            'bg-white/[0.03] border border-white/[0.06] text-[#F8FAFC]',
            'placeholder:text-white/30',
            'focus:outline-none focus:border-[#FFD700]/30 focus:shadow-[0_0_20px_rgba(255,215,0,0.05)]',
            'transition-all duration-200'
          )}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-white/50 font-medium px-6 py-4">Email</th>
                <th className="text-left text-white/50 font-medium px-6 py-4">Nom</th>
                <th className="text-left text-white/50 font-medium px-6 py-4">Plan</th>
                <th className="text-left text-white/50 font-medium px-6 py-4">Statut</th>
                <th className="text-left text-white/50 font-medium px-6 py-4">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">
                    Aucun utilisateur trouve
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 text-[#F8FAFC] truncate max-w-[200px]">{u.email}</td>
                  <td className="px-6 py-4 text-white/70">{u.full_name ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', planColors[u.plan] ?? planColors.free)}>
                      {u.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.subscription_status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Actif
                      </span>
                    ) : (
                      <span className="text-white/40 text-xs">
                        {u.subscription_status ?? 'Gratuit'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-white/50">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {users.length === 0 && (
            <div className="px-6 py-12 text-center text-white/40">
              Aucun utilisateur trouve
            </div>
          )}
          {users.map((u) => (
            <div key={u.id} className="px-4 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#F8FAFC] text-sm font-medium truncate max-w-[200px]">{u.email}</span>
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', planColors[u.plan] ?? planColors.free)}>
                  {u.plan.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>{u.full_name ?? '-'}</span>
                <span>{formatDate(u.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

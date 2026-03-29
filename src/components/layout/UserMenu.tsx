'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, CreditCard, LogOut, ChevronDown, User } from 'lucide-react';
import type { Profile } from '@/types/database';
import { getInitials } from '@/lib/utils/formatters';

interface UserMenuProps {
  profile: Profile | null;
  onSignOut: () => void;
}

const planLabels: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'text-[var(--text-tertiary)] bg-white/5' },
  starter: { label: 'Starter', color: 'text-blue-400 bg-blue-500/10' },
  pro: { label: 'Pro', color: 'text-[var(--gold-primary)] bg-[var(--gold-muted)]' },
  ultra: { label: 'Ultra', color: 'text-purple-400 bg-purple-500/10' },
};

export default function UserMenu({ profile, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = profile?.full_name ? getInitials(profile.full_name) : 'U';
  const planInfo = planLabels[profile?.plan ?? 'free'];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        data-testid="user-menu-trigger"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? 'Avatar'}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-[var(--border-default)]"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--gold-muted)] flex items-center justify-center text-xs font-semibold text-[var(--gold-primary)]">
            {initials}
          </div>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform duration-200 hidden md:block ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 glass rounded-xl overflow-hidden shadow-xl shadow-black/30 z-50"
            data-testid="user-menu-dropdown"
          >
            {/* User info */}
            <div className="p-3 border-b border-[var(--border-subtle)]">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? 'Utilisateur'}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate">{profile?.email ?? ''}</p>
              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${planInfo.color}`}>
                {planInfo.label}
              </span>
            </div>

            {/* Links */}
            <div className="py-1">
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Mon plan
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors"
              >
                <User className="w-4 h-4" />
                Profil
              </Link>
            </div>

            {/* Sign out */}
            <div className="py-1 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/5 transition-colors"
                data-testid="signout-button"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

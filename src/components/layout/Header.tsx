'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import MidasLogo from './MidasLogo';
import UserMenu from './UserMenu';
import PulseDot from '@/components/shared/PulseDot';
import type { Profile } from '@/types/database';

interface HeaderProps {
  profile: Profile | null;
  onSignOut: () => void;
  onOpenChat: () => void;
}

function LiveClock() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Europe/Paris',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <span
      className="text-sm font-medium text-[var(--text-secondary)] tabular-nums hidden sm:block"
      style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      data-testid="header-clock"
    >
      {time}
    </span>
  );
}

export default function Header({ profile, onSignOut, onOpenChat }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]"
      data-testid="header"
    >
      {/* Left: logo on mobile */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="md:hidden" data-testid="header-logo">
          <MidasLogo size="sm" glow />
        </Link>
        <div className="flex items-center gap-2.5">
          <PulseDot color="green" label="LIVE" />
          <LiveClock />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenChat}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:text-[var(--gold-primary)] hover:border-[var(--gold-primary)]/30 transition-all duration-200"
          data-testid="header-ai-button"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Assistant IA</span>
        </button>
        <UserMenu profile={profile} onSignOut={onSignOut} />
      </div>
    </header>
  );
}

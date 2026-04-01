'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CandlestickChart, PieChart, MessageSquare, Settings } from 'lucide-react';

const items = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Trading', icon: CandlestickChart, href: '/dashboard/trading' },
  { label: 'Portfolio', icon: PieChart, href: '/dashboard/portfolio' },
  { label: 'Chat', icon: MessageSquare, href: '/dashboard/chat' },
  { label: 'Reglages', icon: Settings, href: '/dashboard/settings' },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)]/90 backdrop-blur-xl border-t border-[var(--border-subtle)] bottom-nav"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                active
                  ? 'text-[var(--gold-primary)]'
                  : 'text-[var(--text-tertiary)]'
              }`}
              data-testid={`bottomnav-${item.label.toLowerCase()}`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'drop-shadow-[0_0_6px_rgba(255,215,0,0.4)]' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

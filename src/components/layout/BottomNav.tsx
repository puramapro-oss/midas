'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, CandlestickChart, MessageSquare, Gift, Trophy } from 'lucide-react';

const items = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Trading', icon: CandlestickChart, href: '/dashboard/trading' },
  { label: 'Classement', icon: Trophy, href: '/dashboard/classement' },
  { label: 'Chat', icon: MessageSquare, href: '/dashboard/chat' },
  { label: 'Parrainage', icon: Gift, href: '/dashboard/referral' },
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
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors"
              data-testid={`bottomnav-${item.label.toLowerCase()}`}
            >
              {active && (
                <motion.div
                  layoutId="bottomnav-dot"
                  className="absolute -top-1 w-4 h-[3px] rounded-full bg-[var(--gold-primary)] shadow-[0_0_8px_rgba(255,215,0,0.5)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <motion.div
                animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    active ? 'text-[var(--gold-primary)] drop-shadow-[0_0_6px_rgba(255,215,0,0.4)]' : 'text-[var(--text-tertiary)]'
                  }`}
                />
              </motion.div>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${
                active ? 'text-[var(--gold-primary)]' : 'text-[var(--text-tertiary)]'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

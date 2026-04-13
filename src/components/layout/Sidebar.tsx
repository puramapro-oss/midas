'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  CandlestickChart,
  Bot,
  FlaskConical,
  MessageSquare,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Signal,
  PieChart,
  Bell,
  Trophy,
  Gift,
  Wallet,
  BookOpen,
  Handshake,
  Coins,
  FileText,
  ShoppingBag,
  Award,
  Heart,
  Ticket,
  Banknote,
  CalendarHeart,
  Gem,
} from 'lucide-react';
import MidasLogo from './MidasLogo';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', testId: 'sidebar-dashboard' },
  { label: 'Trading', icon: CandlestickChart, href: '/dashboard/trading', testId: 'sidebar-trading' },
  { label: 'Marchés', icon: TrendingUp, href: '/dashboard/markets', testId: 'sidebar-markets' },
  { label: 'Portfolio', icon: PieChart, href: '/dashboard/portfolio', testId: 'sidebar-portfolio' },
  { label: 'Signaux', icon: Signal, href: '/dashboard/signals', testId: 'sidebar-signals' },
  { label: 'Agents IA', icon: Bot, href: '/dashboard/agents', testId: 'sidebar-agents' },
  { label: 'Mes Bots', icon: Bot, href: '/dashboard/bots', testId: 'sidebar-bots' },
  { label: 'Alertes', icon: Bell, href: '/dashboard/alerts', testId: 'sidebar-alerts' },
  { label: 'Leaderboard', icon: Trophy, href: '/dashboard/leaderboard', testId: 'sidebar-leaderboard' },
  { label: 'Paper Trading', icon: FlaskConical, href: '/dashboard/paper', testId: 'sidebar-paper' },
  { label: 'Earn', icon: Coins, href: '/dashboard/earn', testId: 'sidebar-earn' },
  { label: 'Backtesting', icon: FlaskConical, href: '/dashboard/backtesting', testId: 'sidebar-backtesting' },
  { label: 'Chat IA', icon: MessageSquare, href: '/dashboard/chat', testId: 'sidebar-chat' },
  { label: 'Parrainage', icon: Gift, href: '/dashboard/referral', testId: 'sidebar-referral' },
  { label: 'Classement', icon: Trophy, href: '/dashboard/classement', testId: 'sidebar-classement' },
  { label: 'Wallet', icon: Wallet, href: '/dashboard/wallet', testId: 'sidebar-wallet' },
  { label: 'Fiscalité', icon: FileText, href: '/dashboard/tax', testId: 'sidebar-tax' },
  { label: 'Partenariat', icon: Handshake, href: '/dashboard/partenaire', testId: 'sidebar-partenaire' },
  { label: 'Boutique', icon: ShoppingBag, href: '/dashboard/boutique', testId: 'sidebar-boutique' },
  { label: 'Achievements', icon: Award, href: '/dashboard/achievements', testId: 'sidebar-achievements' },
  { label: 'Communauté', icon: Heart, href: '/dashboard/community', testId: 'sidebar-community' },
  { label: 'Tirage', icon: Ticket, href: '/dashboard/lottery', testId: 'sidebar-lottery' },
  { label: 'Wealth Engine', icon: Gem, href: '/dashboard/wealth', testId: 'sidebar-wealth' },
  { label: 'Financer', icon: Banknote, href: '/financer', testId: 'sidebar-financer' },
  { label: 'Mon Wrapped', icon: CalendarHeart, href: '/dashboard/wrapped', testId: 'sidebar-wrapped' },
];

const bottomItems = [
  { label: 'Guide', icon: BookOpen, href: '/dashboard/guide', testId: 'sidebar-guide' },
  { label: 'Aide', icon: HelpCircle, href: '/dashboard/help', testId: 'sidebar-help' },
  { label: 'Paramètres', icon: Settings, href: '/dashboard/settings', testId: 'sidebar-settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      data-testid="sidebar"
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="hidden md:flex flex-col h-screen sticky top-0 bg-[var(--bg-secondary)]/60 backdrop-blur-xl border-r border-[var(--border-subtle)] z-30"
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border-subtle)]">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Link href="/dashboard">
                <MidasLogo size="md" glow />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
          data-testid="sidebar-toggle"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'text-[var(--gold-primary)] bg-[var(--gold-muted)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[var(--gold-primary)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-[var(--gold-primary)]' : 'group-hover:text-[var(--text-primary)]'}`} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="py-4 px-2 space-y-1 border-t border-[var(--border-subtle)]">
        {bottomItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'text-[var(--gold-primary)] bg-[var(--gold-muted)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-[var(--gold-primary)]' : 'group-hover:text-[var(--text-primary)]'}`} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>
    </motion.aside>
  );
}

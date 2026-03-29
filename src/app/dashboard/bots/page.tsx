'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Bot,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Activity,
  ExternalLink,
  Target,
  BarChart3,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface SampleBot {
  id: string;
  name: string;
  pair: string;
  strategy: string;
  status: 'active' | 'paused' | 'error';
  totalPnl: number;
  winRate: number;
  totalTrades: number;
}

const SAMPLE_BOTS: SampleBot[] = [
  {
    id: 'bot-1',
    name: 'BTC Momentum',
    pair: 'BTC/USDT',
    strategy: 'Momentum',
    status: 'active',
    totalPnl: 1234.56,
    winRate: 68.2,
    totalTrades: 142,
  },
  {
    id: 'bot-2',
    name: 'ETH Grid',
    pair: 'ETH/USDT',
    strategy: 'Grid',
    status: 'paused',
    totalPnl: 456.78,
    winRate: 54.3,
    totalTrades: 89,
  },
  {
    id: 'bot-3',
    name: 'SOL Swing',
    pair: 'SOL/USDT',
    strategy: 'Breakout',
    status: 'active',
    totalPnl: -89.12,
    winRate: 41.7,
    totalTrades: 36,
  },
];

const statusConfig = {
  active: {
    label: 'Actif',
    dotColor: 'bg-emerald-400',
    dotGlow: 'shadow-[0_0_6px_rgba(52,211,153,0.5)]',
  },
  paused: {
    label: 'En pause',
    dotColor: 'bg-yellow-400',
    dotGlow: 'shadow-[0_0_6px_rgba(250,204,21,0.5)]',
  },
  error: {
    label: 'Erreur',
    dotColor: 'bg-red-400',
    dotGlow: 'shadow-[0_0_6px_rgba(248,113,113,0.5)]',
  },
};

export default function BotsPage() {
  const router = useRouter();
  const [bots, setBots] = useState<SampleBot[]>(SAMPLE_BOTS);
  const [search, setSearch] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);

  const filteredBots = bots.filter(
    (bot) =>
      bot.name.toLowerCase().includes(search.toLowerCase()) ||
      bot.pair.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (botId: string) => {
    setBots((prev) =>
      prev.map((b) =>
        b.id === botId
          ? { ...b, status: b.status === 'active' ? 'paused' : 'active' }
          : b
      )
    );
  };

  const displayBots = showEmpty ? [] : filteredBots;

  return (
    <div className="space-y-6" data-testid="bots-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
            Mes Bots
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {bots.length} bot{bots.length > 1 ? 's' : ''} configur&eacute;{bots.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => router.push('/dashboard/bots/new')}
          data-testid="create-bot-button"
        >
          Cr&eacute;er un Bot
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          type="text"
          placeholder="Rechercher un bot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]"
          data-testid="bots-search"
        />
      </div>

      {/* Bot Grid or Empty State */}
      <AnimatePresence mode="wait">
        {displayBots.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EmptyState
              icon={<Bot className="h-8 w-8" />}
              title="Aucun bot actif"
              description="Cr&eacute;e ton premier bot de trading automatis&eacute; et laisse MIDAS travailler pour toi 24h/24."
              action={{
                label: 'Cr&eacute;er mon premier bot',
                onClick: () => router.push('/dashboard/bots/new'),
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {displayBots.map((bot, index) => {
              const status = statusConfig[bot.status];
              const isProfitable = bot.totalPnl >= 0;
              const pnlFormatted = `${isProfitable ? '+' : ''}${bot.totalPnl.toFixed(2)} $`;

              return (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -2 }}
                  className="relative rounded-2xl border backdrop-blur-xl p-5 transition-all duration-300 bg-white/[0.03] border-white/[0.06] hover:border-[#FFD700]/20 hover:shadow-[0_0_30px_rgba(255,215,0,0.05)]"
                  data-testid={`bot-card-${bot.id}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {bot.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="gold" size="sm">
                          {bot.pair}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {bot.strategy}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          status.dotColor,
                          status.dotGlow
                        )}
                      />
                      <span className="text-[10px] text-white/50">{status.label}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-white/40">
                        {isProfitable ? (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        )}
                        <span>P&amp;L</span>
                      </div>
                      <p
                        className={cn(
                          'text-sm font-semibold font-mono',
                          isProfitable ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {pnlFormatted}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-white/40">
                        <Target className="h-3 w-3" />
                        <span>Win Rate</span>
                      </div>
                      <p className="text-sm font-semibold text-white font-mono">
                        {bot.winRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-white/40">
                        <BarChart3 className="h-3 w-3" />
                        <span>Trades</span>
                      </div>
                      <p className="text-sm font-semibold text-white font-mono">
                        {bot.totalTrades}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleToggle(bot.id)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200',
                        bot.status === 'active'
                          ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                      )}
                      data-testid={`bot-toggle-${bot.id}`}
                    >
                      {bot.status === 'active' ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Reprendre</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => router.push(`/dashboard/bots/${bot.id}`)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all duration-200"
                      data-testid={`bot-details-${bot.id}`}
                    >
                      <Activity className="h-3.5 w-3.5" />
                      <span>D&eacute;tails</span>
                      <ExternalLink className="h-3 w-3" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

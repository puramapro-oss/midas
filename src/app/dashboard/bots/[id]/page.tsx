'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface BotDetail {
  id: string;
  name: string;
  pair: string;
  strategy: string;
  status: 'active' | 'paused' | 'error';
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  createdAt: string;
  exchange: string;
}

interface TradeRow {
  id: string;
  date: string;
  pair: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  duration: string;
}

const SAMPLE_BOTS: Record<string, BotDetail> = {
  'bot-1': {
    id: 'bot-1',
    name: 'BTC Momentum',
    pair: 'BTC/USDT',
    strategy: 'Momentum',
    status: 'active',
    totalPnl: 1234.56,
    winRate: 68.2,
    totalTrades: 142,
    maxDrawdown: 8.4,
    createdAt: '2026-01-15',
    exchange: 'Binance',
  },
  'bot-2': {
    id: 'bot-2',
    name: 'ETH Grid',
    pair: 'ETH/USDT',
    strategy: 'Grid',
    status: 'paused',
    totalPnl: 456.78,
    winRate: 54.3,
    totalTrades: 89,
    maxDrawdown: 12.1,
    createdAt: '2026-02-03',
    exchange: 'Kraken',
  },
  'bot-3': {
    id: 'bot-3',
    name: 'SOL Swing',
    pair: 'SOL/USDT',
    strategy: 'Breakout',
    status: 'active',
    totalPnl: -89.12,
    winRate: 41.7,
    totalTrades: 36,
    maxDrawdown: 18.5,
    createdAt: '2026-03-10',
    exchange: 'Bybit',
  },
};

const SAMPLE_TRADES: TradeRow[] = [
  {
    id: 't-1',
    date: '2026-03-28 14:32',
    pair: 'BTC/USDT',
    side: 'buy',
    entryPrice: 86240.5,
    exitPrice: 87120.0,
    quantity: 0.05,
    pnl: 43.98,
    duration: '2h 14m',
  },
  {
    id: 't-2',
    date: '2026-03-28 10:15',
    pair: 'BTC/USDT',
    side: 'sell',
    entryPrice: 86890.0,
    exitPrice: 86120.0,
    quantity: 0.03,
    pnl: 23.1,
    duration: '4h 02m',
  },
  {
    id: 't-3',
    date: '2026-03-27 22:48',
    pair: 'BTC/USDT',
    side: 'buy',
    entryPrice: 85950.0,
    exitPrice: 85710.0,
    quantity: 0.04,
    pnl: -9.6,
    duration: '1h 33m',
  },
  {
    id: 't-4',
    date: '2026-03-27 16:05',
    pair: 'BTC/USDT',
    side: 'buy',
    entryPrice: 85200.0,
    exitPrice: 85980.0,
    quantity: 0.06,
    pnl: 46.8,
    duration: '5h 12m',
  },
  {
    id: 't-5',
    date: '2026-03-27 09:22',
    pair: 'BTC/USDT',
    side: 'sell',
    entryPrice: 85650.0,
    exitPrice: 85320.0,
    quantity: 0.02,
    pnl: 6.6,
    duration: '3h 45m',
  },
  {
    id: 't-6',
    date: '2026-03-26 20:11',
    pair: 'BTC/USDT',
    side: 'buy',
    entryPrice: 84890.0,
    exitPrice: 84520.0,
    quantity: 0.05,
    pnl: -18.5,
    duration: '2h 08m',
  },
];

const statusConfig = {
  active: { label: 'Actif', variant: 'success' as const },
  paused: { label: 'En pause', variant: 'warning' as const },
  error: { label: 'Erreur', variant: 'danger' as const },
};

export default function BotDetailPage() {
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const bot = SAMPLE_BOTS[botId] ?? SAMPLE_BOTS['bot-1'];
  const [status, setStatus] = useState(bot.status);
  const [deleting, setDeleting] = useState(false);

  const isProfitable = bot.totalPnl >= 0;
  const pnlFormatted = `${isProfitable ? '+' : ''}${bot.totalPnl.toFixed(2)} $`;
  const statusInfo = statusConfig[status];

  const handleToggle = () => {
    setStatus((prev) => (prev === 'active' ? 'paused' : 'active'));
  };

  const handleDelete = () => {
    setDeleting(true);
    setTimeout(() => {
      router.push('/dashboard/bots');
    }, 800);
  };

  const kpis = [
    {
      label: 'P&L Total',
      value: pnlFormatted,
      icon: isProfitable ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />,
      color: isProfitable ? 'text-emerald-400' : 'text-red-400',
      bg: isProfitable ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20',
    },
    {
      label: 'Win Rate',
      value: `${bot.winRate}%`,
      icon: <Target className="h-5 w-5" />,
      color: bot.winRate >= 50 ? 'text-emerald-400' : 'text-orange-400',
      bg: bot.winRate >= 50 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20',
    },
    {
      label: 'Trades',
      value: String(bot.totalTrades),
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'text-[#FFD700]',
      bg: 'bg-[#FFD700]/10 border-[#FFD700]/20',
    },
    {
      label: 'Max Drawdown',
      value: `${bot.maxDrawdown}%`,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: bot.maxDrawdown > 15 ? 'text-red-400' : 'text-orange-400',
      bg: bot.maxDrawdown > 15 ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20',
    },
  ];

  return (
    <div className="space-y-6" data-testid="bot-detail-page">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/dashboard/bots')}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4" />
          </motion.button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white font-[family-name:var(--font-orbitron)]">
                {bot.name}
              </h1>
              <Badge variant={statusInfo.variant} size="md">
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
              <span>{bot.pair}</span>
              <span>&#183;</span>
              <span>{bot.strategy}</span>
              <span>&#183;</span>
              <span>{bot.exchange}</span>
              <span>&#183;</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Depuis le {new Date(bot.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={status === 'active' ? 'secondary' : 'primary'}
            size="sm"
            icon={
              status === 'active' ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )
            }
            onClick={handleToggle}
            data-testid="bot-toggle-button"
          >
            {status === 'active' ? 'Mettre en pause' : 'Reprendre'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            loading={deleting}
            onClick={handleDelete}
            data-testid="bot-delete-button"
          >
            Supprimer
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              'rounded-2xl border backdrop-blur-xl p-5 transition-all duration-300',
              kpi.bg
            )}
            data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40">{kpi.label}</span>
              <div className={cn('opacity-60', kpi.color)}>{kpi.icon}</div>
            </div>
            <p className={cn('text-2xl font-bold font-mono', kpi.color)}>
              {kpi.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Trade History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden"
        data-testid="trade-history"
      >
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#FFD700]/60" />
            <h2 className="text-sm font-semibold text-white">
              Historique des trades
            </h2>
          </div>
          <span className="text-xs text-white/30">
            {SAMPLE_TRADES.length} derniers trades
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Date', 'Side', 'Entree', 'Sortie', 'Quantite', 'P&L', 'Duree'].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_TRADES.map((trade, index) => {
                const tradeProfit = trade.pnl >= 0;
                return (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    data-testid={`trade-row-${trade.id}`}
                  >
                    <td className="px-6 py-3.5 text-xs text-white/60 font-mono">
                      {trade.date}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge
                        variant={trade.side === 'buy' ? 'success' : 'danger'}
                        size="sm"
                      >
                        {trade.side === 'buy' ? 'LONG' : 'SHORT'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-white/70 font-mono">
                      {trade.entryPrice.toLocaleString('fr-FR')} $
                    </td>
                    <td className="px-6 py-3.5 text-xs text-white/70 font-mono">
                      {trade.exitPrice.toLocaleString('fr-FR')} $
                    </td>
                    <td className="px-6 py-3.5 text-xs text-white/70 font-mono">
                      {trade.quantity}
                    </td>
                    <td
                      className={cn(
                        'px-6 py-3.5 text-xs font-semibold font-mono',
                        tradeProfit ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {tradeProfit ? '+' : ''}{trade.pnl.toFixed(2)} $
                    </td>
                    <td className="px-6 py-3.5 text-xs text-white/40 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {trade.duration}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

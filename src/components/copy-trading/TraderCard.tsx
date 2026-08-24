'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Shield, BarChart3, Target,
  Users, Percent, Copy, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatPnl } from '@/lib/copy-trading/utils';
import type { TraderProfile } from '@/types/database';

interface TraderCardProps {
  trader: TraderProfile;
  index: number;
  onFollow: (traderId: string) => void;
  isLoading: boolean;
}

export default function TraderCard({ trader, index, onFollow, isLoading }: TraderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="hover:border-amber-500/20 transition">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start gap-4">
            {/* Rank */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-400">#{index + 1}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-white truncate">{trader.display_name}</h3>
                {trader.is_verified && (
                  <Shield className="size-4 text-emerald-400 flex-shrink-0" />
                )}
              </div>
              {trader.bio && (
                <p className="text-xs text-white/50 line-clamp-1 mb-2">{trader.bio}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1 text-white/60">
                  <BarChart3 className="size-3" />
                  {trader.total_trades} trades
                </span>
                <span className={`flex items-center gap-1 font-mono ${trader.total_pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trader.total_pnl_pct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {formatPnl(trader.total_pnl_pct)}
                </span>
                <span className="flex items-center gap-1 text-white/60">
                  <Target className="size-3" />
                  WR {trader.win_rate.toFixed(0)}%
                </span>
                <span className="flex items-center gap-1 text-white/60">
                  <Users className="size-3" />
                  {trader.copiers_count} copieurs
                </span>
                <span className="flex items-center gap-1 text-white/60">
                  <Percent className="size-3" />
                  {trader.commission_pct}% commission
                </span>
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={() => onFollow(trader.id)}
              disabled={isLoading}
              data-testid={`copy-follow-${trader.id}`}
              className="flex-shrink-0 px-4 py-2 bg-amber-500 text-black rounded-xl text-sm font-medium hover:brightness-110 transition disabled:opacity-50 flex items-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copier
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

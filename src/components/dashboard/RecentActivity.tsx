'use client';

import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';

export default function RecentActivity() {
  const { recentTrades: closedTrades, loading } = useTrades();

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="recent-activity"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-orbitron)]">
        Activite Recente
      </h3>

      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      ) : closedTrades.length === 0 ? (
        <div className="py-8 text-center">
          <Clock className="h-8 w-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-[var(--text-tertiary)]">Aucun trade recent</p>
          <p className="text-xs text-white/20 mt-1">Tes trades termines apparaitront ici</p>
        </div>
      ) : (
      <div className="space-y-1">
        {closedTrades.map((trade) => {
          const pnl = Number(trade.pnl ?? 0);
          const isWin = pnl >= 0;
          return (
            <div
              key={trade.id}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  trade.side === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {trade.side === 'buy' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{trade.pair}</span>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                    ${Number(trade.entry_price).toLocaleString('en-US')} → ${Number(trade.exit_price ?? 0).toLocaleString('en-US')}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className={`text-xs font-semibold ${isWin ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {isWin ? '+' : ''}${pnl.toFixed(2)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

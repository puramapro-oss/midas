'use client';

import { TrendingUp, TrendingDown, X, BarChart3 } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';

export default function OpenPositions() {
  const { openPositions: positions, loading } = useTrades();

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="open-positions"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-orbitron)]">
          Positions Ouvertes
        </h3>
        <span
          className="text-xs text-[var(--text-tertiary)] px-2 py-0.5 rounded-md bg-white/[0.04]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {positions.length} active{positions.length > 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin" />
        </div>
      ) : positions.length === 0 ? (
        <div className="py-8 text-center">
          <BarChart3 className="h-8 w-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-[var(--text-tertiary)]">Aucune position ouverte</p>
          <p className="text-xs text-white/20 mt-1">Les trades actifs apparaitront ici</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-white/[0.06]">
                <th className="text-left pb-3 font-medium">Paire</th>
                <th className="text-left pb-3 font-medium">Exchange</th>
                <th className="text-right pb-3 font-medium">Entry</th>
                <th className="text-right pb-3 font-medium">Current</th>
                <th className="text-right pb-3 font-medium">P&L ($)</th>
                <th className="text-right pb-3 font-medium">P&L (%)</th>
                <th className="text-left pb-3 font-medium">Strategy</th>
                <th className="text-right pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const pnl = Number(pos.pnl ?? 0);
                const isPositive = pnl >= 0;
                const isBuy = pos.side === 'buy';
                return (
                  <tr
                    key={pos.id}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{pos.pair}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-[var(--text-secondary)]">{pos.exchange}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-xs text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        ${Number(pos.entry_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-xs text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {isBuy ? 'LONG' : 'SHORT'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {isPositive ? '+' : ''}${pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 text-right" colSpan={2}>
                      <span className="text-xs text-[var(--text-secondary)] px-2 py-0.5 rounded bg-white/[0.04]">
                        {pos.stop_loss ? `SL: $${Number(pos.stop_loss).toFixed(0)}` : '-'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                        aria-label={`Fermer position ${pos.pair}`}
                        onClick={() => fetch('/api/trade/close', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId: pos.id }) })}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

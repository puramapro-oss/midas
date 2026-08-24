'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRATEGIES } from '@/lib/analysis/constants';

export default function TradePanel() {
  const [strategy, setStrategy] = useState('momentum');
  const [amount, setAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('2');
  const [takeProfit, setTakeProfit] = useState('6');

  return (
    <Card variant="highlighted">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-[#FFD700]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Panneau de Trade
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Strategie</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            data-testid="strategy-select"
            className="w-full h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none transition-all appearance-none cursor-pointer"
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#111116]">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Montant (USDT)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            data-testid="amount-input"
            className="w-full h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm font-mono placeholder:text-white/20 focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)] focus:outline-none transition-all"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          />
          <div className="flex gap-2 mt-2">
            {['25', '50', '75', '100'].map((pct) => (
              <button
                key={pct}
                onClick={() => setAmount((Number(pct) * 10).toString())}
                className="flex-1 py-1.5 rounded-lg text-xs text-white/40 border border-white/[0.06] hover:border-[#FFD700]/30 hover:text-[#FFD700]/60 transition-all"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Stop Loss (%)</label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              data-testid="stop-loss-input"
              className="w-full h-11 px-4 rounded-xl border border-red-500/20 bg-red-500/[0.03] text-red-400 text-sm font-mono placeholder:text-white/20 focus:border-red-500/40 focus:outline-none transition-all"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">Take Profit (%)</label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              data-testid="take-profit-input"
              className="w-full h-11 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-400 text-sm font-mono placeholder:text-white/20 focus:border-emerald-500/40 focus:outline-none transition-all"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            />
          </div>
        </div>

        {stopLoss && takeProfit && Number(stopLoss) > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
          >
            <span className="text-xs text-[var(--text-tertiary)]">Ratio Risque/Rendement</span>
            <span
              className="text-sm font-medium text-[#FFD700]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              1:{(Number(takeProfit) / Number(stopLoss)).toFixed(1)}
            </span>
          </motion.div>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          data-testid="execute-trade"
          disabled={!amount || Number(amount) <= 0}
        >
          Executer le Trade
        </Button>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/[0.06] border border-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-orange-400/80 leading-relaxed">
            Le trading comporte des risques de perte en capital. Les signaux IA ne constituent pas des conseils financiers. Investissez uniquement ce que vous pouvez vous permettre de perdre.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

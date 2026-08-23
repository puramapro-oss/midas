'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Zap, Sparkles, ShieldCheck, Activity } from 'lucide-react';

function Sparkline({ color = '#FFD700', trend = 'up' }: { color?: string; trend?: 'up' | 'down' }) {
  const points =
    trend === 'up'
      ? '0,28 10,24 20,26 30,20 40,22 50,16 60,18 70,12 80,14 90,8 100,10'
      : '0,10 10,14 20,12 30,18 40,16 50,22 60,20 70,26 80,24 90,28 100,30';
  return (
    <svg viewBox="0 0 100 32" className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${trend}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`${points} 100,32 0,32`} fill={`url(#grad-${trend})`} />
    </svg>
  );
}

export default function DeviceMockup() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setTyping((v) => !v), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: -8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: '1200px' }}
      className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px]"
    >
      {/* Glow halo */}
      <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.18)_0%,transparent_60%)] blur-2xl pointer-events-none" />

      {/* Phone frame */}
      <div className="relative rounded-[44px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-[3px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_rgba(255,215,0,0.08)]">
        <div className="relative rounded-[42px] bg-[#0A0C16] p-2 border border-white/[0.06]">
          <div className="relative rounded-[34px] bg-gradient-to-b from-[#0E1220] to-[#06080F] overflow-hidden">
            {/* Dynamic island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-black z-20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/60" />
            </div>

            {/* Status bar */}
            <div className="flex justify-between items-center px-6 pt-3 pb-2 text-[10px] font-semibold text-white/70 tabular-nums">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-[1px] border border-white/60" />
                <span>100</span>
              </span>
            </div>

            {/* App content */}
            <div className="px-4 pt-4 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Portfolio</div>
                  <div className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)] tabular-nums">
                    $24 812<span className="text-white/40 text-base">.44</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] flex items-center justify-center shadow-lg shadow-[#FFD700]/30">
                  <Bot className="w-5 h-5 text-[#06080F]" />
                </div>
              </div>

              {/* Chart card */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-white/60">24H</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 tabular-nums">+$412.18 · +1.69%</span>
                </div>
                <Sparkline color="#10B981" trend="up" />
              </div>

              {/* Agent signal */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="rounded-2xl bg-gradient-to-br from-[#FFD700]/10 to-transparent border border-[#FFD700]/20 p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span className="text-[10px] font-bold tracking-widest text-[#FFD700] uppercase">Signal IA</span>
                  <span className="ml-auto text-[9px] text-white/40">à l&apos;instant</span>
                </div>
                <div className="text-[11px] text-white leading-snug">
                  Breakout confirmé sur <span className="font-semibold text-[#FFD700]">SOL</span> — volume x2.4, RSI 62.{' '}
                  <span className="text-white/60">Entrée suggérée avec stop-loss à -1.8%.</span>
                </div>
              </motion.div>

              {/* Positions */}
              <div className="space-y-2">
                {[
                  { sym: 'BTC', name: 'Bitcoin', amt: '0.148', val: '+2.41%', up: true },
                  { sym: 'ETH', name: 'Ethereum', amt: '2.104', val: '+1.87%', up: true },
                  { sym: 'SOL', name: 'Solana', amt: '18.42', val: '+4.12%', up: true },
                ].map((p) => (
                  <div
                    key={p.sym}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#B8860B]/10 flex items-center justify-center text-[9px] font-bold text-[#FFD700] font-mono">
                        {p.sym}
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-white">{p.name}</div>
                        <div className="text-[9px] text-white/40 font-mono">
                          {p.amt} {p.sym}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold tabular-nums ${p.up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat input */}
              <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD700] flex-shrink-0" />
                <div className="text-[11px] text-white/50 truncate">{typing ? 'MIDAS analyse le marché…' : 'Demande à MIDAS…'}</div>
                {typing && (
                  <div className="flex gap-0.5 ml-auto">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                        className="w-1 h-1 rounded-full bg-[#FFD700]"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Home indicator */}
              <div className="flex justify-center pt-1">
                <div className="w-24 h-1 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating glass card left */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="hidden md:flex absolute -left-20 top-1/3 items-center gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl px-4 py-3 shadow-2xl"
      >
        <div className="w-9 h-9 rounded-full bg-emerald-400/15 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">SHIELD actif</div>
          <div className="text-xs text-white font-semibold">Niveau 5 · Capital protégé</div>
        </div>
      </motion.div>

      {/* Floating glass card right */}
      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="hidden md:flex absolute -right-16 top-20 items-center gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl px-4 py-3 shadow-2xl"
      >
        <div className="w-9 h-9 rounded-full bg-[#FFD700]/15 flex items-center justify-center">
          <Activity className="w-4 w-4 text-[#FFD700]" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">6 Agents IA</div>
          <div className="text-xs text-white font-semibold">Analyse 24/7 · En ligne</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

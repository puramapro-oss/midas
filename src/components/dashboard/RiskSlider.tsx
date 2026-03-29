'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';

const levels = [
  {
    id: 0,
    label: 'Très Conservateur',
    icon: Shield,
    color: '#06B6D4',
    description: 'Risque minimal, trades rares',
  },
  {
    id: 1,
    label: 'Conservateur',
    icon: ShieldCheck,
    color: '#10B981',
    description: 'Positions prudentes',
  },
  {
    id: 2,
    label: 'Modéré',
    icon: ShieldAlert,
    color: '#FFD700',
    description: 'Équilibre risque/rendement',
  },
  {
    id: 3,
    label: 'Agressif',
    icon: Zap,
    color: '#EF4444',
    description: 'Rendement max, risque élevé',
  },
];

export default function RiskSlider() {
  const [level, setLevel] = useState(2);
  const current = levels[level];

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="risk-slider"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 font-[family-name:var(--font-orbitron)]">
        Profil de Risque
      </h3>

      {/* Current level display */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${current.color}15`, color: current.color }}
        >
          <current.icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: current.color }}>
            {current.label}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">{current.description}</p>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          {levels.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              data-testid={`risk-level-${l.id}`}
              className="relative z-10 w-8 h-8 flex items-center justify-center"
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                  l.id === level
                    ? 'scale-125'
                    : l.id < level
                      ? 'opacity-60'
                      : 'opacity-30'
                }`}
                style={{
                  borderColor: l.id <= level ? l.color : 'rgba(255,255,255,0.15)',
                  backgroundColor: l.id <= level ? l.color : 'transparent',
                  boxShadow: l.id === level ? `0 0 10px ${l.color}40` : 'none',
                }}
              />
            </button>
          ))}
        </div>

        {/* Track background */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-[calc(50%+4px)] h-1 rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: current.color }}
            initial={false}
            animate={{ width: `${(level / (levels.length - 1)) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        </div>

        {/* Labels */}
        <div className="flex items-center justify-between mt-1">
          {levels.map((l) => (
            <span
              key={l.id}
              className={`text-[9px] font-medium transition-colors duration-200 text-center w-16 ${
                l.id === level ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
              }`}
            >
              {l.label.split(' ').pop()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

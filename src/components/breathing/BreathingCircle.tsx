'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Timer, Zap } from 'lucide-react';

type Phase = 'inhale' | 'hold' | 'exhale' | 'holdAfter';

interface BreathingCircleProps {
  phase: Phase;
  phaseTime: number;
  phaseDuration: number;
  progress: number;
  completed: boolean;
  totalTime: number;
  cycles: number;
  targetCycles: number;
}

const getPhaseLabel = (p: Phase) => {
  switch (p) {
    case 'inhale': return 'Inspire';
    case 'hold': return 'Retiens';
    case 'exhale': return 'Expire';
    case 'holdAfter': return 'Pause';
  }
};

export default function BreathingCircle({
  phase,
  phaseTime,
  phaseDuration,
  progress,
  completed,
  totalTime,
  cycles,
  targetCycles,
}: BreathingCircleProps) {
  const circleSize = 200;
  const radius = 85;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative" style={{ width: circleSize, height: circleSize }}>
        <svg width={circleSize} height={circleSize} className="transform -rotate-90">
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <motion.circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="url(#breathGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transition={{ duration: 0.3 }}
          />
          <defs>
            <linearGradient id="breathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center"
            >
              {completed ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                  <p className="text-sm font-medium text-emerald-400">Termine !</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {phaseDuration - phaseTime}
                  </p>
                  <p className="text-sm font-medium text-cyan-400">{getPhaseLabel(phase)}</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-6 text-sm text-[var(--text-secondary)]">
        <span className="flex items-center gap-1"><Timer className="w-4 h-4" />{totalTime}s</span>
        <span className="flex items-center gap-1"><Zap className="w-4 h-4" />{cycles}/{targetCycles} cycles</span>
      </div>
    </div>
  );
}

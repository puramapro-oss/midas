'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Timer,
  Zap,
} from 'lucide-react';

type Technique = '4-7-8' | 'box' | 'coherent' | 'wim_hof';

interface TechniqueConfig {
  key: Technique;
  label: string;
  description: string;
  inhale: number;
  hold: number;
  exhale: number;
  holdAfter: number;
  color: string;
}

const TECHNIQUES: TechniqueConfig[] = [
  { key: '4-7-8', label: '4-7-8 Relaxation', description: 'Calme le stress avant un trade important', inhale: 4, hold: 7, exhale: 8, holdAfter: 0, color: 'from-blue-500 to-cyan-500' },
  { key: 'box', label: 'Box Breathing', description: 'Focus intense pour l\'analyse technique', inhale: 4, hold: 4, exhale: 4, holdAfter: 4, color: 'from-emerald-500 to-teal-500' },
  { key: 'coherent', label: 'Coherence Cardiaque', description: 'Equilibre emotionnel pour le trading', inhale: 5, hold: 0, exhale: 5, holdAfter: 0, color: 'from-purple-500 to-pink-500' },
  { key: 'wim_hof', label: 'Wim Hof', description: 'Energie et determination', inhale: 2, hold: 0, exhale: 2, holdAfter: 0, color: 'from-amber-500 to-red-500' },
];

type Phase = 'inhale' | 'hold' | 'exhale' | 'holdAfter';

export default function BreathingPage() {
  const [selectedTechnique, setSelectedTechnique] = useState<TechniqueConfig>(TECHNIQUES[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [phaseTime, setPhaseTime] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetCycles = 6;

  useEffect(() => {
    fetch('/api/breathing')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTotalSessions(data.total); })
      .catch(() => {});
  }, []);

  const getPhaseLabel = (p: Phase) => {
    switch (p) {
      case 'inhale': return 'Inspire';
      case 'hold': return 'Retiens';
      case 'exhale': return 'Expire';
      case 'holdAfter': return 'Pause';
    }
  };

  const getPhaseDuration = useCallback((p: Phase): number => {
    switch (p) {
      case 'inhale': return selectedTechnique.inhale;
      case 'hold': return selectedTechnique.hold;
      case 'exhale': return selectedTechnique.exhale;
      case 'holdAfter': return selectedTechnique.holdAfter;
    }
  }, [selectedTechnique]);

  const getNextPhase = useCallback((current: Phase): Phase => {
    const order: Phase[] = ['inhale', 'hold', 'exhale', 'holdAfter'];
    const idx = order.indexOf(current);
    for (let i = 1; i <= 4; i++) {
      const next = order[(idx + i) % 4];
      if (getPhaseDuration(next) > 0) return next;
    }
    return 'inhale';
  }, [getPhaseDuration]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTotalTime(t => t + 1);
      setPhaseTime(t => {
        const duration = getPhaseDuration(phase);
        if (t + 1 >= duration) {
          const nextPhase = getNextPhase(phase);
          if (nextPhase === 'inhale') {
            setCycles(c => {
              const newC = c + 1;
              if (newC >= targetCycles) {
                setIsRunning(false);
                setCompleted(true);
              }
              return newC;
            });
          }
          setPhase(nextPhase);
          return 0;
        }
        return t + 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase, getPhaseDuration, getNextPhase]);

  const handleStart = () => {
    setIsRunning(true);
    setPhase('inhale');
    setPhaseTime(0);
    setCycles(0);
    setTotalTime(0);
    setCompleted(false);
    setPointsEarned(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/breathing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technique: selectedTechnique.key,
          duration_seconds: totalTime,
          cycles,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPointsEarned(data.points_earned);
        setTotalSessions(t => t + 1);
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  const progress = getPhaseDuration(phase) > 0 ? phaseTime / getPhaseDuration(phase) : 0;
  const circleSize = 200;
  const radius = 85;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Wind className="w-7 h-7 text-cyan-400" />
            Respiration Guidee
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Calme ton esprit pour trader avec lucidite
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[var(--text-secondary)]">{totalSessions} sessions</p>
          <p className="text-xs text-[var(--text-secondary)]">+30 pts/session</p>
        </div>
      </div>

      {/* Technique selector */}
      {!isRunning && !completed && (
        <div className="grid grid-cols-2 gap-3">
          {TECHNIQUES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedTechnique(t)}
              className={`glass-card p-4 text-left transition-all ${
                selectedTechnique.key === t.key
                  ? 'border-cyan-400/30 ring-1 ring-cyan-400/20'
                  : 'hover:bg-white/[0.04]'
              }`}
              data-testid={`technique-${t.key}`}
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t.label}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{t.description}</p>
              <div className="flex gap-1 mt-2">
                {[
                  { label: 'In', val: t.inhale },
                  { label: 'Hold', val: t.hold },
                  { label: 'Out', val: t.exhale },
                  { label: 'Hold', val: t.holdAfter },
                ].filter(s => s.val > 0).map((s, i) => (
                  <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-secondary)]">
                    {s.val}s
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Breathing circle */}
      {(isRunning || completed) && (
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
                        {getPhaseDuration(phase) - phaseTime}
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
      )}

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {!isRunning && !completed && (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            data-testid="start-breathing"
          >
            <Play className="w-5 h-5" />
            Commencer
          </button>
        )}
        {isRunning && (
          <button
            onClick={() => setIsRunning(false)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] text-[var(--text-primary)] font-semibold text-sm hover:bg-white/[0.1] transition-colors"
          >
            <Pause className="w-5 h-5" />
            Pause
          </button>
        )}
        {!isRunning && (phaseTime > 0 || completed) && (
          <>
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] text-[var(--text-primary)] font-semibold text-sm hover:bg-white/[0.1] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Recommencer
            </button>
            {completed && (
              <button
                onClick={handleSave}
                disabled={saving || pointsEarned !== null}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                data-testid="save-breathing"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {pointsEarned ? `+${pointsEarned} pts !` : 'Sauvegarder'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

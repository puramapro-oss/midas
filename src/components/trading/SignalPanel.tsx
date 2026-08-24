'use client';

import { Brain, RefreshCw, Loader2, Play, Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { SAMPLE_AGENTS, signalColors } from '@/lib/trading/constants';

interface SignalPanelProps {
  selectedPair: string;
  analyzing: boolean;
  onAnalyze: () => void;
}

export default function SignalPanel({ selectedPair, analyzing, onAnalyze }: SignalPanelProps) {
  return (
    <div className="space-y-4">
      {/* Current signal */}
      <Card variant="highlighted">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              Signal IA
            </h3>
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-50"
              data-testid="refresh-signal"
            >
              {analyzing ? (
                <Loader2 className="h-3.5 w-3.5 text-[#FFD700] animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-white/30 hover:text-[#FFD700]" />
              )}
            </button>
          </div>

          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/[0.04] border-white/[0.08] mb-3">
              <span className="text-sm font-semibold text-white/60">Aucun signal actif</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed max-w-[220px] mx-auto">
              Clique sur rafraichir pour lancer une analyse IA complete sur {selectedPair}.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Agents breakdown */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-3.5 w-3.5 text-[#FFD700]" />
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Sous-Agents
            </h3>
          </div>

          <div className="space-y-2">
            {SAMPLE_AGENTS.map((agent) => {
              const colors = signalColors[agent.signal];
              return (
                <div
                  key={agent.agent}
                  className="flex items-center justify-between py-1.5"
                  data-testid={`agent-${agent.agent}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{agent.icon}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{agent.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                    >
                      {agent.signal}
                    </span>
                    <span
                      className="text-xs text-white/40 w-8 text-right"
                      style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                    >
                      {agent.confidence}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all"
          data-testid="execute-trade"
        >
          <Play className="h-4 w-4" />
          Executer le trade
        </button>
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-all"
          data-testid="let-bot-decide"
        >
          <Bot className="h-4 w-4" />
          Laisser le bot decider
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Play,
  Brain,
  TrendingUp,
  Coins,
  Database,
  Shield,
  BarChart3,
  Globe2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface Agent {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'safe_mode';
  last_beat_ms: number;
  seconds_since_last_beat: number | null;
  last_error?: string | null;
  metrics?: Record<string, number | string | null>;
}

interface Signal {
  agent: string;
  type: string;
  symbol?: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
  ts: number;
}

const AGENT_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  master: { icon: Brain, label: 'Maître', color: 'text-amber-400' },
  market_data: { icon: BarChart3, label: 'Market Data', color: 'text-cyan-400' },
  technical: { icon: TrendingUp, label: 'Technique', color: 'text-blue-400' },
  sentiment: { icon: Sparkles, label: 'Sentiment', color: 'text-pink-400' },
  onchain: { icon: Database, label: 'On-Chain', color: 'text-purple-400' },
  macro: { icon: Globe2, label: 'Macro', color: 'text-emerald-400' },
  defi: { icon: Coins, label: 'DeFi', color: 'text-amber-300' },
  risk: { icon: Shield, label: 'Risk', color: 'text-red-400' },
  memory: { icon: Database, label: 'Mémoire', color: 'text-indigo-400' },
  execution: { icon: Activity, label: 'Execution', color: 'text-green-400' },
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/agents/status');
      const json = await res.json();
      setAgents(json.agents ?? []);
      setSignals(json.signals ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const runAgents = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pair: 'BTC/USDT' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `HTTP ${res.status}`);
      } else {
        setError(null);
      }
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur run');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 15_000);
    return () => clearInterval(id);
  }, []);

  const runningCount = agents.filter((a) => a.status === 'running').length;

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="agents-page">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="text-amber-400" />
            Agents IA
          </h1>
          <p className="text-white/60 text-sm mt-1">
            9 agents spécialisés — Heartbeats Redis, signaux temps réel, consensus du Maître.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            data-testid="agents-refresh"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </button>
          <button
            onClick={runAgents}
            disabled={running}
            data-testid="agents-run"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-xl transition disabled:opacity-50"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Lancer cycle
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
          <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-100/80">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-white/60 text-xs uppercase">Agents actifs</div>
            <div className="mt-2 text-3xl font-bold text-emerald-400" data-testid="agents-running">
              {runningCount} / {agents.length || 10}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-white/60 text-xs uppercase">Signaux récents</div>
            <div className="mt-2 text-3xl font-bold text-white">{signals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-white/60 text-xs uppercase">Dernier cycle</div>
            <div className="mt-2 text-3xl font-bold text-amber-400">
              {signals[0] ? `${Math.round((Date.now() - signals[0].ts) / 1000)}s` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="agents-grid">
        {agents.map((a) => {
          const meta = AGENT_META[a.name] ?? { icon: Bot, label: a.name, color: 'text-white' };
          const Icon = meta.icon;
          return (
            <Card key={a.name}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${meta.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">{meta.label}</div>
                      <div className="text-xs text-white/40">{a.name}</div>
                    </div>
                  </div>
                  {a.status === 'running' ? (
                    <Badge variant="success">
                      <CheckCircle2 className="size-3 mr-1 inline" /> ACTIF
                    </Badge>
                  ) : a.status === 'error' ? (
                    <Badge variant="danger">
                      <XCircle className="size-3 mr-1 inline" /> ERREUR
                    </Badge>
                  ) : a.status === 'safe_mode' ? (
                    <Badge variant="warning">SAFE</Badge>
                  ) : (
                    <Badge variant="default">STOPPÉ</Badge>
                  )}
                </div>
                <div className="mt-3 text-xs text-white/50">
                  {a.seconds_since_last_beat !== null
                    ? `Heartbeat il y a ${a.seconds_since_last_beat}s`
                    : 'Aucun heartbeat'}
                </div>
                {a.last_error && (
                  <div className="mt-2 text-xs text-red-400 truncate">{a.last_error}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          <h3 className="px-5 pt-5 pb-3 text-white font-semibold">Signaux récents</h3>
          {signals.length === 0 ? (
            <div className="px-5 pb-5 text-white/40 text-sm">
              Aucun signal pour l&apos;instant. Lance un cycle pour activer les agents.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {signals.slice(0, 10).map((s, i) => (
                <div key={i} className="px-5 py-3 hover:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge
                        variant={
                          s.direction === 'bullish'
                            ? 'success'
                            : s.direction === 'bearish'
                              ? 'danger'
                              : 'default'
                        }
                      >
                        {s.direction.toUpperCase()}
                      </Badge>
                      <span className="text-white/80 font-medium">{s.agent}</span>
                      {s.symbol && <span className="text-white/50 text-xs">{s.symbol}</span>}
                    </div>
                    <span className="text-white/40 text-xs flex-shrink-0">
                      {Math.round(s.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">{s.reasoning}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

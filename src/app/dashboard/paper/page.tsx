'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, TrendingUp, TrendingDown, RefreshCw, Loader2, Activity, Target, Trophy, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface PaperTrade {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  entry_price: number | null;
  exit_price: number | null;
  amount: number | null;
  pnl: number | null;
  pnl_percent: number | null;
  status: 'open' | 'closed' | 'cancelled';
  strategy: string | null;
  created_at: string;
  closed_at: string | null;
}

interface Stats {
  total: number;
  open: number;
  closed: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
}

const EMPTY_STATS: Stats = { total: 0, open: 0, closed: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0 };

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PaperTradingPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/paper/trades');
      if (res.status === 401) {
        setError('Tu dois être connecté pour voir tes trades simulés.');
        setTrades([]);
        setStats(EMPTY_STATS);
        return;
      }
      const json = await res.json();
      setTrades(json.trades ?? []);
      setStats(json.stats ?? EMPTY_STATS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="paper-page">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <FlaskConical className="text-purple-400" />
            Paper Trading
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Trade simulé avec prix réels — Aucun argent réel risqué.
          </p>
        </div>
        <button
          onClick={fetchTrades}
          disabled={loading}
          data-testid="paper-refresh"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Actualiser
        </button>
      </motion.div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100/80">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <Activity className="size-4" /> Total
            </div>
            <div className="mt-2 text-2xl md:text-3xl font-bold text-white" data-testid="paper-stat-total">
              {stats.total}
            </div>
            <div className="text-xs text-white/40 mt-1">{stats.open} ouverts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <Target className="size-4" /> Win Rate
            </div>
            <div className="mt-2 text-2xl md:text-3xl font-bold text-emerald-400" data-testid="paper-stat-winrate">
              {stats.winRate.toFixed(0)}%
            </div>
            <div className="text-xs text-white/40 mt-1">
              {stats.wins}W / {stats.losses}L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <Trophy className="size-4" /> P&L Total
            </div>
            <div
              className={`mt-2 text-2xl md:text-3xl font-bold ${
                stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
              data-testid="paper-stat-pnl"
            >
              {stats.totalPnl >= 0 ? '+' : ''}
              {stats.totalPnl.toFixed(2)}$
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
              <FlaskConical className="size-4" /> Mode
            </div>
            <div className="mt-2">
              <Badge variant="info">SIMULATION</Badge>
            </div>
            <div className="text-xs text-white/40 mt-1">Capital fictif</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-white/50 flex items-center justify-center gap-2">
              <Loader2 className="size-5 animate-spin" />
              Chargement…
            </div>
          ) : trades.length === 0 ? (
            <div className="p-12 text-center" data-testid="paper-empty">
              <FlaskConical className="size-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 font-medium">Aucun trade simulé pour l&apos;instant</p>
              <p className="text-white/40 text-sm mt-1">
                Active le mode Paper Trading dans Paramètres pour voir tes trades fictifs apparaître ici.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="paper-table">
              <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-4 py-3">Paire</th>
                  <th className="px-4 py-3">Sens</th>
                  <th className="px-4 py-3 text-right">Entrée</th>
                  <th className="px-4 py-3 text-right">Sortie</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                  <th className="px-4 py-3">Stratégie</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trades.map((t) => {
                  const pnl = Number(t.pnl ?? 0);
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 font-semibold text-white">{t.pair}</td>
                      <td className="px-4 py-3">
                        {t.side === 'buy' ? (
                          <Badge variant="success">
                            <TrendingUp className="size-3 mr-1 inline" /> LONG
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <TrendingDown className="size-3 mr-1 inline" /> SHORT
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">
                        {Number(t.entry_price ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">
                        {t.exit_price ? Number(t.exit_price).toFixed(2) : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-white/50'
                        }`}
                      >
                        {pnl !== 0 ? `${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}$` : '—'}
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">{t.strategy ?? '—'}</td>
                      <td className="px-4 py-3">
                        {t.status === 'open' && <Badge variant="info">Ouvert</Badge>}
                        {t.status === 'closed' && <Badge variant="default">Fermé</Badge>}
                        {t.status === 'cancelled' && <Badge variant="warning">Annulé</Badge>}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{formatDate(t.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-white/40 text-center">
        Le paper trading utilise les prix réels du marché avec slippage et frais simulés. Idéal pour tester
        une stratégie avant de la passer en live.
      </p>
    </div>
  );
}

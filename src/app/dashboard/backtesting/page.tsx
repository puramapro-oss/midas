'use client';

import { useEffect, useRef, useState } from 'react';
import { requestBacktest } from '@/lib/trading/backtest-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Play,
  TrendingUp,
  Target,
  BarChart3,
  Clock,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import {
  pairOptions,
  periodOptions,
  strategyOptions,
  slOptions,
  tpOptions,
  type BacktestResult,
} from './constants';

export default function BacktestingPage() {
  const [pair, setPair] = useState('BTC/USDT');
  const [period, setPeriod] = useState('3m');
  const [strategy, setStrategy] = useState('momentum');
  const [capital, setCapital] = useState('10000');
  const [sl, setSl] = useState('2');
  const [tp, setTp] = useState('5');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);

  const handleRun = async () => {
    if (active.current) return;
    const amount = Number(capital);
    if (!Number.isFinite(amount) || amount < 100 || amount > 10000000) {
      setError('Le capital doit être compris entre 100 et 10 000 000 USDT.'); return;
    }
    const days = ({ '1m': 30, '3m': 90, '6m': 180, '1y': 365, '2y': 730 } as Record<string, number>)[period];
    const end = Date.now();
    const controller = new AbortController(); active.current = controller;
    const deadline = setTimeout(() => controller.abort(), 60000);
    setRunning(true); setResult(null); setError(null);
    try {
      const response = await requestBacktest({ pair, strategy, timeframe: '4h', capital: amount,
        startDate: new Date(end - days * 86400000).toISOString(), endDate: new Date(end).toISOString(),
        stopLossPct: Number(sl), takeProfitPct: Number(tp) }, controller.signal);
      const summary = response.result.summary;
      setResult({ pair: response.result.config.symbol, strategy: response.result.config.strategy,
        initialCapital: response.result.config.initial_capital, stopLossPct: response.result.config.stop_loss_pct,
        takeProfitPct: response.result.config.take_profit_pct,
        pnlPercent: summary.total_pnl_pct, pnlAbsolute: summary.total_pnl, winRate: summary.win_rate,
        sharpeRatio: summary.sharpe_ratio, totalTrades: summary.total_trades, maxDrawdown: summary.max_drawdown_pct,
        avgTradeDuration: `${summary.avg_holding_time_hours.toFixed(1)} h`, bestTrade: summary.best_trade,
        worstTrade: summary.worst_trade, profitFactor: summary.profit_factor, source: response.market_data_source,
        start: response.coverage.first_open_time, end: response.coverage.end_exclusive,
        candles: response.coverage.candles, fees: summary.total_fees });
    } catch (cause) {
      setError(controller.signal.aborted ? 'Simulation interrompue ou délai dépassé. Tu peux réessayer.'
        : cause instanceof Error ? cause.message : 'Simulation indisponible.');
    } finally { clearTimeout(deadline); active.current = null; setRunning(false); }
  };
  const ratio = (value: number | null) => value === null ? 'Non défini' : value.toFixed(2);
  const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

  const resultCards = result
    ? [
        {
          label: 'P&L',
          value: `${signed(result.pnlPercent)}%`,
          sub: `${signed(result.pnlAbsolute)} USDT`,
          icon: <TrendingUp className="h-4 w-4" />,
          color: result.pnlAbsolute >= 0 ? 'text-emerald-400' : 'text-red-400',
          bg: result.pnlAbsolute >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20',
        },
        {
          label: 'Win Rate',
          value: `${result.winRate.toFixed(1)}%`,
          sub: `${result.totalTrades} trades`,
          icon: <Target className="h-4 w-4" />,
          color: 'text-[#FFD700]',
          bg: 'bg-[#FFD700]/10 border-[#FFD700]/20',
        },
        {
          label: 'Sharpe Ratio',
          value: ratio(result.sharpeRatio),
          sub: 'Annualisation indicative, taux de référence 0%',
          icon: <BarChart3 className="h-4 w-4" />,
          color: 'text-white',
          bg: 'bg-white/5 border-white/10',
        },
        {
          label: 'Max Drawdown',
          value: `${result.maxDrawdown.toFixed(2)}%`,
          sub: `Profit Factor: ${ratio(result.profitFactor)}`,
          icon: <ArrowUpRight className="h-4 w-4" />,
          color: result.maxDrawdown > 15 ? 'text-red-400' : 'text-orange-400',
          bg: result.maxDrawdown > 15 ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20',
        },
      ]
    : [];

  return (
    <div className="space-y-6" data-testid="backtesting-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          Backtesting
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Simulation pédagogique sur des données historiques. Les résultats passés ne prédisent pas les résultats futurs.
        </p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      {/* Configuration Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6"
        data-testid="backtest-form"
      >
        <div className="flex items-center gap-2 mb-6">
          <FlaskConical className="h-5 w-5 text-[#FFD700]/60" />
          <h2 className="text-sm font-semibold text-white">Configuration du backtest</h2>
        </div>

        <fieldset disabled={running} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Paire"
            options={pairOptions}
            value={pair}
            onChange={setPair}
          />
          <Select
            label="Periode"
            options={periodOptions}
            value={period}
            onChange={setPeriod}
          />
          <Select
            label="Strategie"
            options={strategyOptions}
            value={strategy}
            onChange={setStrategy}
          />
          <div className="space-y-1.5">
            <label htmlFor="backtest-capital" className="block text-xs text-white/40">Capital simulé (USDT)</label>
            <input
              id="backtest-capital"
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              min="100"
              step="100"
              className="w-full h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white outline-none transition-all duration-200 hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)] font-mono"
              data-testid="capital-input"
            />
          </div>
          <Select
            label="Stop Loss"
            options={slOptions}
            value={sl}
            onChange={setSl}
          />
          <Select
            label="Take Profit"
            options={tpOptions}
            value={tp}
            onChange={setTp}
          />
        </fieldset>

        <p className="mt-4 text-xs text-white/50">Bougies de 4 h, une position à la fois, sans levier. Frais de 0,1% par côté et glissement simulé de 0,05%.</p>
        <div className="mt-6 flex justify-end gap-3" aria-live="polite" aria-busy={running}>
          {running && <Button variant="secondary" onClick={() => active.current?.abort()}>Annuler</Button>}
          <Button
            variant="primary"
            size="lg"
            icon={<Play className="h-4 w-4" />}
            loading={running}
            onClick={handleRun}
            disabled={running}
            data-testid="run-backtest-button"
          >
            {running ? 'Simulation en cours...' : 'Lancer le Backtest'}
          </Button>
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
            data-testid="backtest-results"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#FFD700]/60" />
              <h2 className="text-sm font-semibold text-white">R&eacute;sultats du backtest</h2>
              <Badge variant="success" size="sm">
                Termin&eacute;
              </Badge>
            </div>

            <p className="text-xs text-white/60">{result.pair} · {result.strategy} · capital initial : {result.initialCapital.toLocaleString('fr-FR')} USDT · stop {result.stopLossPct}% · objectif {result.takeProfitPct}%.</p>
            <p className="text-xs text-white/60">Source : {result.source} · {result.candles} bougies · du {new Date(result.start).toLocaleDateString('fr-FR')} au {new Date(result.end).toLocaleDateString('fr-FR')} · frais simulés : {result.fees.toFixed(2)} USDT.</p>
            <p className="text-xs text-white/50">Les ratios sur périodes courtes sont instables. Leur annualisation suppose des rendements sans corrélation temporelle ; un ratio non défini ne signifie pas zéro risque.</p>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {resultCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className={cn(
                    'rounded-2xl border backdrop-blur-xl p-5 transition-all duration-300',
                    card.bg
                  )}
                  data-testid={`result-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40">{card.label}</span>
                    <div className={cn('opacity-60', card.color)}>{card.icon}</div>
                  </div>
                  <p className={cn('text-2xl font-bold font-mono', card.color)}>
                    {card.value}
                  </p>
                  <p className="text-[10px] text-white/30 mt-1">{card.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Extra stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6"
            >
              <h3 className="text-xs text-white/40 mb-4 uppercase tracking-wider">
                D&eacute;tails suppl&eacute;mentaires
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] text-white/30 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Dur&eacute;e moy. trade
                  </p>
                  <p className="text-sm font-semibold text-white mt-1 font-mono">
                    {result.avgTradeDuration}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Meilleur trade
                  </p>
                  <p className="text-sm font-semibold text-emerald-400 mt-1 font-mono">
                    {signed(result.bestTrade)} USDT
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Pire trade
                  </p>
                  <p className="text-sm font-semibold text-red-400 mt-1 font-mono">
                    {signed(result.worstTrade)} USDT
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Profit Factor
                  </p>
                  <p className="text-sm font-semibold text-[#FFD700] mt-1 font-mono">
                    {ratio(result.profitFactor)}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

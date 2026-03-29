'use client';

import { useState } from 'react';
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
  Lock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

interface BacktestResult {
  pnlPercent: number;
  pnlAbsolute: number;
  winRate: number;
  sharpeRatio: number;
  totalTrades: number;
  maxDrawdown: number;
  avgTradeDuration: string;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

const SAMPLE_RESULT: BacktestResult = {
  pnlPercent: 24.5,
  pnlAbsolute: 2450.0,
  winRate: 67.3,
  sharpeRatio: 1.82,
  totalTrades: 156,
  maxDrawdown: 9.2,
  avgTradeDuration: '3h 28m',
  bestTrade: 412.5,
  worstTrade: -189.3,
  profitFactor: 2.14,
};

const pairOptions = [
  { value: 'BTC/USDT', label: 'BTC/USDT' },
  { value: 'ETH/USDT', label: 'ETH/USDT' },
  { value: 'SOL/USDT', label: 'SOL/USDT' },
  { value: 'BNB/USDT', label: 'BNB/USDT' },
  { value: 'XRP/USDT', label: 'XRP/USDT' },
  { value: 'ADA/USDT', label: 'ADA/USDT' },
];

const periodOptions = [
  { value: '1m', label: '1 mois' },
  { value: '3m', label: '3 mois' },
  { value: '6m', label: '6 mois' },
  { value: '1y', label: '1 an' },
  { value: '2y', label: '2 ans' },
];

const strategyOptions = [
  { value: 'momentum', label: 'Momentum' },
  { value: 'grid', label: 'Grid Trading' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'dca', label: 'DCA' },
  { value: 'scalping', label: 'Scalping' },
];

const slOptions = [
  { value: '1', label: '1%' },
  { value: '2', label: '2%' },
  { value: '3', label: '3%' },
  { value: '5', label: '5%' },
  { value: '10', label: '10%' },
];

const tpOptions = [
  { value: '2', label: '2%' },
  { value: '3', label: '3%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '15', label: '15%' },
];

export default function BacktestingPage() {
  const [pair, setPair] = useState('BTC/USDT');
  const [period, setPeriod] = useState('3m');
  const [strategy, setStrategy] = useState('momentum');
  const [capital, setCapital] = useState('10000');
  const [sl, setSl] = useState('2');
  const [tp, setTp] = useState('5');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isFreeUser] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      setResult(SAMPLE_RESULT);
      setRunning(false);
    }, 2000);
  };

  const resultCards = result
    ? [
        {
          label: 'P&L',
          value: `+${result.pnlPercent}%`,
          sub: `+${result.pnlAbsolute.toLocaleString('fr-FR')} $`,
          icon: <TrendingUp className="h-4 w-4" />,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
        },
        {
          label: 'Win Rate',
          value: `${result.winRate}%`,
          sub: `${result.totalTrades} trades`,
          icon: <Target className="h-4 w-4" />,
          color: 'text-[#FFD700]',
          bg: 'bg-[#FFD700]/10 border-[#FFD700]/20',
        },
        {
          label: 'Sharpe Ratio',
          value: result.sharpeRatio.toFixed(2),
          sub: result.sharpeRatio >= 1.5 ? 'Excellent' : result.sharpeRatio >= 1 ? 'Bon' : 'Faible',
          icon: <BarChart3 className="h-4 w-4" />,
          color: result.sharpeRatio >= 1.5 ? 'text-emerald-400' : 'text-orange-400',
          bg: result.sharpeRatio >= 1.5 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20',
        },
        {
          label: 'Max Drawdown',
          value: `${result.maxDrawdown}%`,
          sub: `Profit Factor: ${result.profitFactor}`,
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
          Teste tes strat&eacute;gies sur des donn&eacute;es historiques avant de risquer du capital r&eacute;el.
        </p>
      </div>

      {/* Free user upgrade prompt */}
      {isFreeUser && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/[0.03] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          data-testid="upgrade-prompt"
        >
          <div className="w-12 h-12 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5 text-[#FFD700]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">
              Fonctionnalit&eacute; Premium
            </h3>
            <p className="text-xs text-white/40 mt-1">
              Le backtesting avanc&eacute; est r&eacute;serv&eacute; aux plans Starter et sup&eacute;rieurs. Acc&egrave;de &agrave; des simulations illimit&eacute;es, toutes les strat&eacute;gies et des rapports d&eacute;taill&eacute;s.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Zap className="h-4 w-4" />}
            data-testid="upgrade-button"
          >
            Passer &agrave; Starter
          </Button>
        </motion.div>
      )}

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Paire"
            options={pairOptions}
            value={pair}
            onChange={setPair}
          />
          <Select
            label="P\u00e9riode"
            options={periodOptions}
            value={period}
            onChange={setPeriod}
          />
          <Select
            label="Strat\u00e9gie"
            options={strategyOptions}
            value={strategy}
            onChange={setStrategy}
          />
          <div className="space-y-1.5">
            <label className="block text-xs text-white/40">Capital initial ($)</label>
            <input
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
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            icon={<Play className="h-4 w-4" />}
            loading={running}
            onClick={handleRun}
            disabled={isFreeUser}
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
                    +{result.bestTrade.toFixed(2)} $
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Pire trade
                  </p>
                  <p className="text-sm font-semibold text-red-400 mt-1 font-mono">
                    {result.worstTrade.toFixed(2)} $
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Profit Factor
                  </p>
                  <p className="text-sm font-semibold text-[#FFD700] mt-1 font-mono">
                    {result.profitFactor}
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

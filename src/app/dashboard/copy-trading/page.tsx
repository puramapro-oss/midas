'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, TrendingDown, Trophy, Copy, Pause, Play,
  StopCircle, Plus, Loader2, AlertCircle, Star, Shield, BarChart3,
  Percent, Clock, Target, UserPlus, ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { toast } from 'sonner';
import type { TraderProfile, CopyRelationship } from '@/types/database';

type Tab = 'traders' | 'my-copies' | 'become';

function formatPnl(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export default function CopyTradingPage() {
  const [tab, setTab] = useState<Tab>('traders');
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [copies, setCopies] = useState<CopyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Become trader form
  const [traderName, setTraderName] = useState('');
  const [traderBio, setTraderBio] = useState('');
  const [copyAmount, setCopyAmount] = useState(100);

  const fetchData = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/copy-trading?tab=${t === 'become' ? 'my-profile' : t === 'my-copies' ? 'my-copies' : 'traders'}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (t === 'traders') setTraders(json.traders ?? []);
      if (t === 'my-copies') setCopies(json.copies ?? []);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(tab); }, [tab, fetchData]);

  const handleAction = async (action: string, trader_id?: string) => {
    setActionLoading(trader_id ?? 'global');
    try {
      const res = await fetch('/api/copy-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          trader_id,
          copy_amount: copyAmount,
          copy_ratio: 1,
          display_name: traderName || undefined,
          bio: traderBio || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }
      toast.success(json.message);
      fetchData(tab);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'traders', label: 'Top Traders', icon: Trophy },
    { id: 'my-copies', label: 'Mes Copies', icon: Copy },
    { id: 'become', label: 'Devenir Trader', icon: UserPlus },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="copy-trading-page">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Users className="text-amber-400" />
          Copy Trading
        </h1>
        <p className="text-white/60 text-sm mt-1">
          Copie les meilleurs traders ou partage tes stratégies.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`copy-tab-${t.id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.id
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="size-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <>
          {/* TOP TRADERS */}
          {tab === 'traders' && (
            <div className="space-y-3">
              {traders.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center">
                    <Trophy className="size-12 text-amber-400/30 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Pas encore de traders publics</h3>
                    <p className="text-sm text-white/50 max-w-md mx-auto">
                      Le copy trading sera activé dès que la communauté MIDAS aura assez de traders
                      actifs avec des statistiques réelles. Deviens le premier !
                    </p>
                    <button
                      onClick={() => setTab('become')}
                      className="mt-4 px-6 py-2 bg-amber-500 text-black rounded-xl font-medium hover:brightness-110 transition"
                    >
                      Devenir trader
                    </button>
                  </CardContent>
                </Card>
              ) : (
                traders.map((trader, i) => (
                  <motion.div
                    key={trader.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:border-amber-500/20 transition">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-start gap-4">
                          {/* Rank */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-amber-400">#{i + 1}</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-white truncate">{trader.display_name}</h3>
                              {trader.is_verified && (
                                <Shield className="size-4 text-emerald-400 flex-shrink-0" />
                              )}
                            </div>
                            {trader.bio && (
                              <p className="text-xs text-white/50 line-clamp-1 mb-2">{trader.bio}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs">
                              <span className="flex items-center gap-1 text-white/60">
                                <BarChart3 className="size-3" />
                                {trader.total_trades} trades
                              </span>
                              <span className={`flex items-center gap-1 font-mono ${trader.total_pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trader.total_pnl_pct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                                {formatPnl(trader.total_pnl_pct)}
                              </span>
                              <span className="flex items-center gap-1 text-white/60">
                                <Target className="size-3" />
                                WR {trader.win_rate.toFixed(0)}%
                              </span>
                              <span className="flex items-center gap-1 text-white/60">
                                <Users className="size-3" />
                                {trader.copiers_count} copieurs
                              </span>
                              <span className="flex items-center gap-1 text-white/60">
                                <Percent className="size-3" />
                                {trader.commission_pct}% commission
                              </span>
                            </div>
                          </div>

                          {/* Copy button */}
                          <button
                            onClick={() => handleAction('follow', trader.id)}
                            disabled={actionLoading === trader.id}
                            data-testid={`copy-follow-${trader.id}`}
                            className="flex-shrink-0 px-4 py-2 bg-amber-500 text-black rounded-xl text-sm font-medium hover:brightness-110 transition disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoading === trader.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <>
                                <Copy className="size-3.5" />
                                Copier
                              </>
                            )}
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* MY COPIES */}
          {tab === 'my-copies' && (
            <div className="space-y-3">
              {copies.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center">
                    <Copy className="size-12 text-white/20 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Aucun copy trading actif</h3>
                    <p className="text-sm text-white/50 max-w-md mx-auto">
                      Explore les top traders et commence à copier leurs trades automatiquement.
                    </p>
                    <button
                      onClick={() => setTab('traders')}
                      className="mt-4 px-6 py-2 bg-amber-500 text-black rounded-xl font-medium hover:brightness-110 transition"
                    >
                      Voir les traders
                    </button>
                  </CardContent>
                </Card>
              ) : (
                copies.map((copy) => {
                  const trader = copy.trader as TraderProfile | undefined;
                  return (
                    <Card key={copy.id}>
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                              <Users className="size-5 text-amber-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white">{trader?.display_name ?? 'Trader'}</h3>
                              <p className="text-xs text-white/50">{copy.total_copied_trades} trades copiés</p>
                            </div>
                          </div>
                          <Badge
                            variant={copy.status === 'active' ? 'success' : copy.status === 'paused' ? 'warning' : 'default'}
                          >
                            {copy.status === 'active' ? 'Actif' : copy.status === 'paused' ? 'Pause' : 'Arrêté'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="p-3 rounded-lg bg-white/[0.03]">
                            <p className="text-xs text-white/50">Capital alloué</p>
                            <p className="font-bold text-white font-mono">${copy.copy_amount}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03]">
                            <p className="text-xs text-white/50">P&L total</p>
                            <p className={`font-bold font-mono ${copy.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {copy.total_pnl >= 0 ? '+' : ''}{copy.total_pnl.toFixed(2)}$
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03]">
                            <p className="text-xs text-white/50">Commission</p>
                            <p className="font-bold text-white/70 font-mono">${copy.commission_paid.toFixed(2)}</p>
                          </div>
                        </div>
                        {copy.status !== 'stopped' && (
                          <div className="flex gap-2">
                            {copy.status === 'active' ? (
                              <button
                                onClick={() => handleAction('pause', copy.trader_id)}
                                disabled={actionLoading === copy.trader_id}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm hover:bg-white/10 transition"
                              >
                                <Pause className="size-4" /> Pause
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction('resume', copy.trader_id)}
                                disabled={actionLoading === copy.trader_id}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm hover:bg-emerald-500/20 transition"
                              >
                                <Play className="size-4" /> Reprendre
                              </button>
                            )}
                            <button
                              onClick={() => handleAction('unfollow', copy.trader_id)}
                              disabled={actionLoading === copy.trader_id}
                              className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm hover:bg-red-500/20 transition"
                            >
                              <StopCircle className="size-4" /> Arrêter
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* BECOME TRADER */}
          {tab === 'become' && (
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                    <Star className="size-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Devenir Trader Public</h2>
                    <p className="text-sm text-white/50">Partage tes trades et gagne des commissions</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: Copy, title: 'Tes trades sont copiés', desc: 'Les copieurs répliquent automatiquement tes positions' },
                    { icon: Percent, title: '10% de commission', desc: 'Sur les profits générés par tes copieurs' },
                    { icon: Trophy, title: 'Classement public', desc: 'Monte dans le classement et attire plus de copieurs' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <item.icon className="size-8 text-amber-400 mb-2" />
                      <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                      <p className="text-xs text-white/50 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Nom de trader</label>
                    <input
                      type="text"
                      value={traderName}
                      onChange={(e) => setTraderName(e.target.value)}
                      placeholder="ex: GoldHunter, CryptoWolf..."
                      data-testid="copy-trader-name"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Bio (optionnel)</label>
                    <textarea
                      value={traderBio}
                      onChange={(e) => setTraderBio(e.target.value)}
                      placeholder="Décris ta stratégie de trading..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleAction('become_trader')}
                  disabled={!traderName || actionLoading === 'global'}
                  data-testid="copy-become-trader"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === 'global' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="size-5" />
                      Créer mon profil trader
                    </>
                  )}
                </button>

                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="size-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/40">
                      Les performances passées ne garantissent pas les résultats futurs. Les copieurs sont
                      responsables de leurs propres décisions d&apos;investissement. Commission de 10% sur les
                      profits uniquement (pas de commission sur les pertes).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

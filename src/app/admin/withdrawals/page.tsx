'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, X, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Withdrawal {
  id: string;
  user_email: string;
  user_name: string;
  amount: number;
  iban: string;
  status: 'pending' | 'processed' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  processed: { label: 'Traité', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Check },
  rejected: { label: 'Rejeté', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: X },
};

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/withdrawals');
      if (!res.ok) return;
      const data = await res.json();
      setWithdrawals(data.withdrawals ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleAction = async (id: string, action: 'processed' | 'rejected') => {
    setProcessing(id);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Erreur');
        return;
      }
      toast.success(action === 'processed' ? 'Retrait approuvé' : 'Retrait rejeté');
      fetchWithdrawals();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setProcessing(null);
    }
  };

  const pending = withdrawals.filter((w) => w.status === 'pending');
  const history = withdrawals.filter((w) => w.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="admin-withdrawals">
        <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-withdrawals">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-[family-name:var(--font-orbitron)]">Demandes de retrait</h1>
          <p className="text-sm text-white/40 mt-1">{pending.length} en attente</p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">{pending.length} à traiter</span>
          </div>
        )}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60">En attente</h2>
          {pending.map((w) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-amber-500/15 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{w.user_name}</p>
                  <p className="text-xs text-white/40">{w.user_email}</p>
                  <p className="text-xs text-white/30 mt-1 font-mono" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {w.iban.slice(0, 4)}****{w.iban.slice(-4)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{Number(w.amount).toFixed(2)}€</p>
                  <p className="text-[10px] text-white/30">{new Date(w.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleAction(w.id, 'processed')}
                  disabled={processing === w.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
                  data-testid={`approve-${w.id}`}
                >
                  {processing === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approuver
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(w.id, 'rejected')}
                  disabled={processing === w.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-40"
                  data-testid={`reject-${w.id}`}
                >
                  {processing === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Rejeter
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {pending.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <CreditCard className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Aucune demande en attente</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60">Historique</h2>
          {history.map((w) => {
            const cfg = STATUS_CONFIG[w.status];
            return (
              <div key={w.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{w.user_name} — <span className="text-white/40">{w.user_email}</span></p>
                  <p className="text-xs text-white/30 mt-0.5">{new Date(w.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{Number(w.amount).toFixed(2)}€</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bg} ${cfg.color}`}>
                    <cfg.icon className="w-3 h-3" /> {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

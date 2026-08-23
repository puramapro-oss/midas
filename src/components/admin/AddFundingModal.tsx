'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Landmark, Loader2, X } from 'lucide-react';

interface AddFundingModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddFundingModal({ onClose, onSuccess }: AddFundingModalProps) {
  const [poolType, setPoolType] = useState<'reward' | 'asso' | 'partner'>('reward');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    setSubmitting(true);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Le montant doit etre un nombre positif');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/financement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool_type: poolType,
          amount: numAmount,
          reason,
          source_name: sourceName,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? 'Erreur lors de l\'ajout');
      } else {
        setFormSuccess(true);
        setAmount('');
        setReason('');
        setSourceName('');
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch {
      setFormError('Erreur reseau');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0A0F1A] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Landmark className="w-5 h-5 text-[#FFD700]" />
            <h2 className="text-lg font-bold font-[family-name:var(--font-orbitron)] text-white">
              Ajouter un financement
            </h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-white/50 mb-1 block">Pool</label>
            <select
              value={poolType}
              onChange={(e) => setPoolType(e.target.value as 'reward' | 'asso' | 'partner')}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]/30"
            >
              <option value="reward">Reward Pool (utilisateurs)</option>
              <option value="asso">Association PURAMA</option>
              <option value="partner">Partenaires</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-white/50 mb-1 block">Montant (EUR)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]/30 font-[family-name:var(--font-jetbrains-mono)]"
            />
          </div>

          <div>
            <label className="text-sm text-white/50 mb-1 block">Source</label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="Stripe CA, Aide SASU, Don asso..."
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]/30"
            />
          </div>

          <div>
            <label className="text-sm text-white/50 mb-1 block">Raison</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Depot CA mensuel, aide BPI..."
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]/30"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          {formSuccess && (
            <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
              Financement ajoute avec succes
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:border-white/20 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ajout...</span>
                </>
              ) : (
                'Ajouter'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

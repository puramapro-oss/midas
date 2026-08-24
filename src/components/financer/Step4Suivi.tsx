'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import { statutIcon } from '@/lib/financer/utils';
import type { Aide, Dossier } from '@/lib/financer/types';

interface Step4SuiviProps {
  dossiers: Dossier[];
  onBack: () => void;
}

export default function Step4Suivi({ dossiers, onBack }: Step4SuiviProps) {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#F59E0B]" /> Suivi de tes demandes
        </h2>

        {dossiers.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Aucun dossier en cours.</p>
            <p className="text-xs mt-1">Genere des dossiers a l&apos;etape precedente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dossiers.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  {statutIcon(d.statut)}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {(d.aide as Aide)?.nom ?? 'Aide'}
                    </p>
                    <p className="text-xs text-white/40">
                      {new Date(d.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    d.statut === 'accepte'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : d.statut === 'refuse'
                        ? 'bg-red-500/10 text-red-400'
                        : d.statut === 'renouveler'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {d.statut === 'en_cours'
                    ? 'En cours'
                    : d.statut === 'accepte'
                      ? 'Accepte'
                      : d.statut === 'refuse'
                        ? 'Refuse'
                        : 'A renouveler'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="w-full h-12 rounded-xl border border-white/10 text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all"
      >
        <ArrowLeft className="h-4 w-4" /> Nouvelle recherche
      </button>
    </motion.div>
  );
}

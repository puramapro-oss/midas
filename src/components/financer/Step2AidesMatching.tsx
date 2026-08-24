'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Euro, FileText, Loader2 } from 'lucide-react';
import { probabilityBadge } from '@/lib/financer/utils';
import type { Aide } from '@/lib/financer/types';

interface Step2AidesMatchingProps {
  loading: boolean;
  aides: Aide[];
  totalCumul: number;
  onBack: () => void;
  onNext: () => void;
}

export default function Step2AidesMatching({
  loading,
  aides,
  totalCumul,
  onBack,
  onNext,
}: Step2AidesMatchingProps) {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {totalCumul > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Euro className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-emerald-300 font-medium">
              Ton abonnement peut te couter 0 EUR
            </p>
            <p className="text-2xl font-bold text-emerald-400 font-[family-name:var(--font-orbitron)]">
              Jusqu&apos;a {totalCumul.toLocaleString('fr-FR')} EUR recuperables
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
        </div>
      ) : (
        <div className="space-y-3">
          {aides.map((aide) => (
            <div
              key={aide.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{aide.nom}</h3>
                    {aide.probability && probabilityBadge(aide.probability)}
                  </div>
                  <p className="text-xs text-white/40 mb-2">{aide.description}</p>
                  {aide.url_officielle && (
                    <a
                      href={aide.url_officielle}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#F59E0B]/70 hover:text-[#F59E0B] transition-colors"
                    >
                      Voir le site officiel
                    </a>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {aide.montant_max ? (
                    <p className="text-lg font-bold text-[#F59E0B] font-mono">
                      {aide.montant_max.toLocaleString('fr-FR')} EUR
                    </p>
                  ) : (
                    <p className="text-sm text-white/40">Variable</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {aides.length === 0 && (
            <div className="text-center py-12 text-white/30">
              Aucune aide trouvee pour ce profil. Essaie de modifier tes criteres.
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 h-12 rounded-xl border border-white/10 text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Modifier
        </button>
        <button
          onClick={onNext}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          Generer les dossiers <FileText className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

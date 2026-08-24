'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Download, FileText, Loader2 } from 'lucide-react';
import type { Aide } from '@/lib/financer/types';

interface Step3PdfGenerationProps {
  aides: Aide[];
  generatingPdf: string | null;
  onGeneratePdf: (aideId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function Step3PdfGeneration({
  aides,
  generatingPdf,
  onGeneratePdf,
  onBack,
  onNext,
}: Step3PdfGenerationProps) {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#F59E0B]" /> Telecharger tes dossiers
        </h2>
        <p className="text-sm text-white/40 mb-6">
          Clique sur chaque aide pour generer le dossier PDF pre-rempli.
        </p>

        <div className="space-y-3">
          {aides
            .filter((a) => a.probability === 'probable' || a.probability === 'possible')
            .map((aide) => (
              <div
                key={aide.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div>
                  <p className="text-sm font-medium text-white">{aide.nom}</p>
                  <p className="text-xs text-white/40">
                    {aide.montant_max
                      ? `${aide.montant_max.toLocaleString('fr-FR')} EUR max`
                      : 'Montant variable'}
                  </p>
                </div>
                <button
                  onClick={() => onGeneratePdf(aide.id)}
                  disabled={generatingPdf === aide.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-sm font-medium hover:bg-[#F59E0B]/20 transition-all disabled:opacity-50"
                >
                  {generatingPdf === aide.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  PDF
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 h-12 rounded-xl border border-white/10 text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <button
          onClick={onNext}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          Suivi de mes dossiers <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

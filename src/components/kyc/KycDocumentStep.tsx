'use client';

import { motion } from 'framer-motion';
import { AlertCircle, FileCheck, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { DOCUMENT_TYPES } from '@/lib/kyc/constants';

interface KycDocumentStepProps {
  documentType: 'passport' | 'id_card' | 'driver_license';
  setDocumentType: (v: 'passport' | 'id_card' | 'driver_license') => void;
  onBack: () => void;
  onNext: () => void;
}

export default function KycDocumentStep({
  documentType,
  setDocumentType,
  onBack,
  onNext,
}: KycDocumentStepProps) {
  return (
    <motion.div
      key="document"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
    >
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileCheck className="size-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Document</h2>
              <p className="text-xs text-white/50">Étape 3/3</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Type de document</label>
              <div className="grid grid-cols-3 gap-2">
                {DOCUMENT_TYPES.map((dt) => (
                  <button
                    key={dt.id}
                    onClick={() => setDocumentType(dt.id)}
                    data-testid={`kyc-doc-${dt.id}`}
                    className={`p-3 rounded-xl border text-center transition ${
                      documentType === dt.id
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{dt.icon}</span>
                    <span className="text-xs text-white/70">{dt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-white/60 space-y-1">
                  <p className="font-medium text-white/80">Instructions pour la photo</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Document original, pas de photocopie</li>
                    <li>Bonne luminosité, pas de reflet</li>
                    <li>Tous les coins du document visibles</li>
                    <li>Texte lisible, pas de flou</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-6 rounded-xl border-2 border-dashed border-white/10 hover:border-amber-500/30 transition cursor-pointer text-center">
                <Upload className="size-8 text-white/30 mx-auto mb-2" />
                <p className="text-sm text-white/50">Recto du document</p>
                <p className="text-xs text-white/30 mt-1">JPG, PNG — max 10 Mo</p>
              </div>
              <div className="p-6 rounded-xl border-2 border-dashed border-white/10 hover:border-amber-500/30 transition cursor-pointer text-center">
                <Upload className="size-8 text-white/30 mx-auto mb-2" />
                <p className="text-sm text-white/50">Verso du document</p>
                <p className="text-xs text-white/30 mt-1">JPG, PNG — max 10 Mo</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition"
            >
              Retour
            </button>
            <button
              onClick={onNext}
              data-testid="kyc-next-review"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition"
            >
              Vérifier et soumettre
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

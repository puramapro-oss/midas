'use client';

import { motion } from 'framer-motion';
import { FileCheck, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { DOCUMENT_TYPES } from '@/lib/kyc/constants';

interface KycReviewStepProps {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  addressLine: string;
  postalCode: string;
  city: string;
  country: string;
  documentType: 'passport' | 'id_card' | 'driver_license';
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export default function KycReviewStep({
  fullName,
  dateOfBirth,
  nationality,
  addressLine,
  postalCode,
  city,
  country,
  documentType,
  submitting,
  onBack,
  onSubmit,
}: KycReviewStepProps) {
  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
    >
      <Card>
        <CardContent className="p-6 md:p-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileCheck className="size-5 text-amber-400" />
            Récapitulatif
          </h2>
          <div className="space-y-3 mb-6">
            {[
              { label: 'Nom', value: fullName },
              { label: 'Date de naissance', value: dateOfBirth },
              { label: 'Nationalité', value: nationality },
              {
                label: 'Adresse',
                value: `${addressLine}, ${postalCode} ${city}, ${country}`,
              },
              {
                label: 'Document',
                value: DOCUMENT_TYPES.find((d) => d.id === documentType)?.label ?? '',
              },
            ].map((row, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03]"
              >
                <span className="text-sm text-white/50">{row.label}</span>
                <span className="text-sm text-white font-medium">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition"
            >
              Modifier
            </button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              data-testid="kyc-submit"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Soumettre la vérification'
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

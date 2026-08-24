'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { toast } from 'sonner';

interface KycIdentityStepProps {
  fullName: string;
  setFullName: (v: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (v: string) => void;
  nationality: string;
  setNationality: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function KycIdentityStep({
  fullName,
  setFullName,
  dateOfBirth,
  setDateOfBirth,
  nationality,
  setNationality,
  onBack,
  onNext,
}: KycIdentityStepProps) {
  const handleNext = () => {
    if (!fullName || !dateOfBirth) {
      toast.error('Nom et date de naissance requis');
      return;
    }
    onNext();
  };

  return (
    <motion.div
      key="identity"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
    >
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <User className="size-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Identité</h2>
              <p className="text-xs text-white/50">Étape 1/3</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                data-testid="kyc-fullname"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Date de naissance</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                data-testid="kyc-dob"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-500/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Nationalité</label>
              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                data-testid="kyc-nationality"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-500/50 focus:outline-none transition"
              >
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
                <option value="CA">Canada</option>
                <option value="LU">Luxembourg</option>
                <option value="MC">Monaco</option>
              </select>
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
              onClick={handleNext}
              data-testid="kyc-next-address"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition"
            >
              Suivant
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

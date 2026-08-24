'use client';

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { toast } from 'sonner';

interface KycAddressStepProps {
  addressLine: string;
  setAddressLine: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  postalCode: string;
  setPostalCode: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function KycAddressStep({
  addressLine,
  setAddressLine,
  city,
  setCity,
  postalCode,
  setPostalCode,
  country,
  setCountry,
  onBack,
  onNext,
}: KycAddressStepProps) {
  const handleNext = () => {
    if (!addressLine || !city || !postalCode) {
      toast.error('Adresse complète requise');
      return;
    }
    onNext();
  };

  return (
    <motion.div
      key="address"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
    >
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <MapPin className="size-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Adresse</h2>
              <p className="text-xs text-white/50">Étape 2/3</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Adresse</label>
              <input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="8 Rue de la Chapelle"
                data-testid="kyc-address"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-white/70 mb-1">Ville</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Frasne"
                  data-testid="kyc-city"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Code postal</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="25560"
                  data-testid="kyc-postal"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Pays</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-500/50 focus:outline-none transition"
              >
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
                <option value="CA">Canada</option>
                <option value="LU">Luxembourg</option>
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
              data-testid="kyc-next-document"
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

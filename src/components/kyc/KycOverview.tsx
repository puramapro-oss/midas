'use client';

import { motion } from 'framer-motion';
import { ChevronRight, CreditCard, MapPin, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import type { Step } from '@/lib/kyc/constants';

interface KycOverviewProps {
  onStart: () => void;
}

export default function KycOverview({ onStart }: KycOverviewProps) {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardContent className="p-6 md:p-8">
          <h2 className="text-lg font-bold text-white mb-4">Commencer la vérification</h2>
          <div className="space-y-3 mb-6">
            {[
              { icon: User, text: 'Informations personnelles', step: 'identity' as const },
              { icon: MapPin, text: 'Adresse de résidence', step: 'address' as const },
              { icon: CreditCard, text: "Document d'identité", step: 'document' as const },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                  <item.icon className="size-5 text-amber-400" />
                </div>
                <span className="text-sm text-white/80 flex-1">{item.text}</span>
                <ChevronRight className="size-4 text-white/30" />
              </div>
            ))}
          </div>
          <button
            onClick={onStart}
            data-testid="kyc-start"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition"
          >
            Vérifier mon identité
          </button>
          <p className="text-xs text-white/40 text-center mt-3">
            Tes données sont chiffrées et stockées de manière sécurisée. Conforme RGPD.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

'use client';

import { Trophy, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

interface EmptyStateProps {
  variant: 'no-traders' | 'no-copies';
  onAction: () => void;
}

export default function EmptyState({ variant, onAction }: EmptyStateProps) {
  if (variant === 'no-traders') {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <Trophy className="size-12 text-amber-400/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Pas encore de traders publics</h3>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Le copy trading sera activé dès que la communauté MIDAS aura assez de traders
            actifs avec des statistiques réelles. Deviens le premier !
          </p>
          <button
            onClick={onAction}
            className="mt-4 px-6 py-2 bg-amber-500 text-black rounded-xl font-medium hover:brightness-110 transition"
          >
            Devenir trader
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-10 text-center">
        <Copy className="size-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Aucun copy trading actif</h3>
        <p className="text-sm text-white/50 max-w-md mx-auto">
          Explore les top traders et commence à copier leurs trades automatiquement.
        </p>
        <button
          onClick={onAction}
          className="mt-4 px-6 py-2 bg-amber-500 text-black rounded-xl font-medium hover:brightness-110 transition"
        >
          Voir les traders
        </button>
      </CardContent>
    </Card>
  );
}

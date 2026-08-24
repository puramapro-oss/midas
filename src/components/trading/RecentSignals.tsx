'use client';

import { Clock, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function RecentSignals() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#FFD700]" />
            <h3
              className="text-sm font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-orbitron)' }}
            >
              Signaux recents
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">MIDAS SHIELD actif</span>
          </div>
        </div>

        <div className="py-10 text-center">
          <Clock className="h-6 w-6 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/50">Aucun signal recent</p>
          <p className="text-xs text-white/30 mt-1">
            Les signaux generes par les 6 agents s&apos;afficheront ici des qu&apos;une analyse sera lancee.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

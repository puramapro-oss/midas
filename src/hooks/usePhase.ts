'use client';

// V6 §19 — Hook client pour lire la phase active.
// En client, on lit via API /api/status (côté serveur => process.env).

import { useEffect, useState } from 'react';

export interface PhaseFlags {
  phase: 1 | 2;
  walletMode: 'points' | 'euros';
  cardAvailable: boolean;
  withdrawalAvailable: boolean;
}

const FALLBACK: PhaseFlags = {
  phase: 1,
  walletMode: 'points',
  cardAvailable: false,
  withdrawalAvailable: false,
};

export function usePhase(): PhaseFlags {
  const [flags, setFlags] = useState<PhaseFlags>(FALLBACK);

  useEffect(() => {
    fetch('/api/phase')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setFlags(d);
      })
      .catch(() => {});
  }, []);

  return flags;
}

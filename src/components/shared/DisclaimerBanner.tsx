'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] px-4 py-2 md:py-2.5 flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]"
      data-testid="disclaimer-banner"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
      <span>Le trading comporte des risques de perte en capital. Les performances passées ne préjugent pas des performances futures.</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 p-0.5 rounded hover:bg-white/5 transition-colors shrink-0"
        aria-label="Fermer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

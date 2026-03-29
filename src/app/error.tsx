'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Sentry capture would go here
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center px-4" data-testid="error-page">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-500/[0.04] blur-[120px]" />
      </div>

      <div className="relative text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl font-bold text-white/90 mb-3"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="error-title"
        >
          Une erreur est survenue
        </h1>

        <p className="text-white/50 text-sm sm:text-base mb-8 leading-relaxed">
          Un probleme inattendu s&apos;est produit. Vous pouvez reessayer
          ou retourner au tableau de bord.
        </p>

        {/* Error digest for debugging */}
        {error.digest && (
          <p className="text-xs text-white/20 mb-6 font-mono" data-testid="error-digest">
            Code: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-[#06080F] hover:shadow-[0_0_30px_rgba(255,215,0,0.25)] hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center"
            data-testid="error-retry-button"
          >
            <RotateCcw className="w-4 h-4" />
            Reessayer
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.03] w-full sm:w-auto justify-center"
            data-testid="error-dashboard-link"
          >
            <LayoutDashboard className="w-4 h-4" />
            Retour au dashboard
          </Link>
        </div>

        {/* Decorative line */}
        <div className="mt-12 flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#FFD700]/30" />
          <span
            className="text-[10px] uppercase tracking-[0.2em] text-[#FFD700]/40 font-medium"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            MIDAS
          </span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#FFD700]/30" />
        </div>
      </div>
    </div>
  );
}

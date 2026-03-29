import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center px-4" data-testid="not-found-page">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#FFD700]/[0.03] blur-[120px]" />
      </div>

      <div className="relative text-center max-w-md mx-auto">
        {/* 404 number */}
        <h1
          className="text-[120px] sm:text-[160px] font-black leading-none tracking-tighter"
          style={{
            fontFamily: 'var(--font-orbitron)',
            background: 'linear-gradient(135deg, #FFD700 0%, #B8860B 40%, #FFD700 60%, #DAA520 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.15))',
          }}
          data-testid="not-found-title"
        >
          404
        </h1>

        {/* Subtitle */}
        <h2
          className="text-xl sm:text-2xl font-semibold text-white/90 mt-2 mb-3"
          style={{ fontFamily: 'var(--font-orbitron)' }}
        >
          Page introuvable
        </h2>

        <p className="text-white/50 text-sm sm:text-base mb-8 leading-relaxed">
          Cette page n&apos;existe pas ou a ete deplacee.
          Verifiez l&apos;URL ou retournez a l&apos;accueil.
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-[#06080F] hover:shadow-[0_0_30px_rgba(255,215,0,0.25)] hover:scale-[1.02] active:scale-[0.98]"
          data-testid="not-found-home-link"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour a l&apos;accueil
        </Link>

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

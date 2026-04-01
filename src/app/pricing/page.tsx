import Pricing from '@/components/landing/Pricing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarifs — MIDAS',
  description: 'Decouvrez les plans MIDAS : Free, Pro (39€/mois) et Ultra (79€/mois). L\'IA de trading la plus avancee, 2x moins chere que la concurrence.',
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F]">
      <div className="pt-16">
        <Pricing />
      </div>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <h2
          className="text-2xl font-bold text-white text-center mb-8"
          style={{ fontFamily: 'var(--font-orbitron)' }}
        >
          2x moins cher. 10x plus puissant.
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="comparison-table">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs text-white/30 uppercase tracking-wider py-4 px-4"></th>
                <th className="text-center text-xs text-[#FFD700] uppercase tracking-wider py-4 px-4 font-bold">MIDAS</th>
                <th className="text-center text-xs text-white/30 uppercase tracking-wider py-4 px-4">3Commas</th>
                <th className="text-center text-xs text-white/30 uppercase tracking-wider py-4 px-4">Cryptohopper</th>
                <th className="text-center text-xs text-white/30 uppercase tracking-wider py-4 px-4">Bitsgap</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Prix Pro/mois', midas: '39€', c3: '59€', ch: '58€', bg: '44€' },
                { feature: 'Prix Ultra/mois', midas: '79€', c3: '92€', ch: '108€', bg: '120€' },
                { feature: 'IA conversationnelle', midas: true, c3: false, ch: false, bg: false },
                { feature: '6 sous-agents IA', midas: true, c3: false, ch: false, bg: false },
                { feature: '47 indicateurs combines', midas: true, c3: '~10', ch: '~15', bg: '~10' },
                { feature: 'Memoire IA', midas: true, c3: false, ch: false, bg: false },
                { feature: 'Anti-perte 7 niveaux', midas: true, c3: 'Basique', ch: 'Basique', bg: 'Basique' },
                { feature: 'Detection regime marche', midas: true, c3: false, ch: false, bg: false },
                { feature: 'Multi-timeframe 6 niv.', midas: true, c3: '1-2', ch: '1-2', bg: '1-2' },
                { feature: 'Anti-manipulation', midas: true, c3: false, ch: false, bg: false },
                { feature: 'Paper trading live', midas: true, c3: 'Basique', ch: 'Basique', bg: 'Basique' },
              ].map((row) => (
                <tr key={row.feature} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-white/60">{row.feature}</td>
                  <td className="py-3 px-4 text-center">
                    {row.midas === true ? (
                      <span className="text-emerald-400 font-bold">&#10003;</span>
                    ) : (
                      <span className="text-[#FFD700] font-bold">{row.midas}</span>
                    )}
                  </td>
                  {[row.c3, row.ch, row.bg].map((val, i) => (
                    <td key={i} className="py-3 px-4 text-center text-white/30">
                      {val === true ? '&#10003;' : val === false ? '&#10007;' : val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Le trading comporte des risques de perte en capital. Les performances passees ne garantissent pas les resultats futurs.
        </p>
      </section>
    </main>
  )
}

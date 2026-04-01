import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Changelog — MIDAS',
  description: 'Historique des mises a jour de MIDAS, l\'IA de trading la plus avancee.',
}

const ENTRIES = [
  {
    version: '1.2.0',
    date: '1 avril 2026',
    tag: 'Nouveau',
    changes: [
      'Page Trading avec chart TradingView temps reel',
      'Page Signaux avec historique complet et detail des 6 sous-agents',
      'Page Portfolio avec courbe de performance et allocation',
      'Systeme d\'alertes configurables (prix, volume, signal IA, drawdown)',
      'Guide interactif Binance en 8 etapes',
      'Donnees avancees Binance Futures (Open Interest, Funding Rate, Liquidations)',
      'Page leaderboard et copy trading',
    ],
  },
  {
    version: '1.1.0',
    date: '25 mars 2026',
    tag: 'Amelioration',
    changes: [
      'Moteur IA 6 couches : technique, sentiment, on-chain, calendrier, patterns, risque',
      'MIDAS SHIELD anti-perte 7 niveaux',
      '8 strategies de trading automatisees',
      'Backtesting avec courbe equity et comparaison',
      'Dashboard marchés temps reel',
      'Onboarding intelligent en 5 etapes',
    ],
  },
  {
    version: '1.0.0',
    date: '15 mars 2026',
    tag: 'Lancement',
    changes: [
      'Lancement de MIDAS — IA de trading autonome',
      'Chat IA expert avec Claude',
      'Connexion multi-exchange (Binance, Kraken, Bybit, OKX, Coinbase)',
      'Paper trading 50 000$ virtuels',
      'Plans Free, Pro (39€/mois) et Ultra (79€/mois)',
      'Authentification Supabase + Google OAuth',
    ],
  },
]

const tagColors: Record<string, string> = {
  Nouveau: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Amelioration: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
  Lancement: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-orbitron)' }} data-testid="changelog-title">
            Changelog
          </h1>
          <p className="text-sm text-white/40">Historique des mises a jour de MIDAS</p>
        </div>

        <div className="space-y-8">
          {ENTRIES.map((entry) => (
            <div key={entry.version} className="relative pl-6 border-l border-white/[0.06]">
              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.3)]" />

              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  v{entry.version}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagColors[entry.tag] ?? tagColors.Nouveau}`}>
                  {entry.tag}
                </span>
                <span className="text-xs text-white/30">{entry.date}</span>
              </div>

              <ul className="space-y-1.5">
                {entry.changes.map((change) => (
                  <li key={change} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="text-[#FFD700] mt-1.5 text-[6px]">&#9679;</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

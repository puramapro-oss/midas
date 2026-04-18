// =============================================================================
// MIDAS — Page /fiscal
// V7 §25 — Notification fiscale plateforme numérique (article 242 bis CGI)
// Différent de /dashboard/tax (CERFA 2086 P&L crypto trading).
// Public + connecté.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, Download, ExternalLink, FileText, Info } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Fiscalité — Plateforme numérique',
  description:
    'Tout ce qu\'il faut savoir sur les obligations déclaratives quand tu gagnes de l\'argent via MIDAS (parrainage, primes, etc.).',
};

export default function FiscalPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-white/85">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-orbitron)]">
            Fiscalité
          </h1>
          <p className="text-white/60 mt-2 text-sm md:text-base">
            Tout savoir sur les obligations déclaratives liées à tes gains MIDAS (parrainage,
            primes, missions). <strong className="text-white">Aucune action requise tant que tu
            n&apos;as pas dépassé 3000€ par an.</strong>
          </p>
        </header>

        {/* Seuils */}
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-white">Le seuil de 3000€</h2>
          </div>
          <p className="text-sm leading-relaxed">
            En France, les revenus perçus via une plateforme numérique doivent être déclarés à
            partir de <strong className="text-amber-300">3000€ par année civile</strong>. En
            dessous : aucune obligation, aucune action requise.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            {[
              { palier: '1500€', label: 'Notification amicale', desc: 'On te prévient gentiment.' },
              { palier: '2500€', label: 'Notification rappel', desc: 'Plus que 500€ avant le seuil.' },
              { palier: '3000€', label: 'Bandeau in-app', desc: 'Tu dois déclarer.' },
            ].map((p) => (
              <div
                key={p.palier}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"
              >
                <div className="text-2xl font-bold text-amber-400">{p.palier}</div>
                <div className="text-xs uppercase tracking-wider text-white/50 mt-1">{p.label}</div>
                <div className="text-xs text-white/60 mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Comment déclarer */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white/70" />
            <h2 className="text-xl font-semibold text-white">Comment déclarer (3 étapes)</h2>
          </div>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center">1</span>
              <div>
                Va sur{' '}
                <a
                  href="https://www.impots.gouv.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  impots.gouv.fr <ExternalLink className="w-3 h-3" />
                </a>{' '}
                et connecte-toi à ton espace.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center">2</span>
              <div>
                Dans ta déclaration, ajoute la <strong className="text-white">case 5NG</strong> (revenus non commerciaux non professionnels).
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center">3</span>
              <div>
                Reporte le montant total que MIDAS t&apos;a versé sur l&apos;année (visible
                sur ton récapitulatif PDF — voir bouton ci-dessous).
              </div>
            </li>
          </ol>
        </section>

        {/* Abattement */}
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 space-y-3">
          <h2 className="text-xl font-semibold text-white">Abattement automatique 34%</h2>
          <p className="text-sm leading-relaxed">
            L&apos;administration applique automatiquement un{' '}
            <strong className="text-emerald-300">abattement forfaitaire de 34%</strong> sur le
            montant déclaré (régime BNC micro). Tu n&apos;es donc imposé que sur 66% du total.
          </p>
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3 text-xs text-white/70 font-mono">
            Exemple : 5000€ déclarés → −34% abattement = <strong className="text-emerald-300">3300€ imposable</strong>
          </div>
        </section>

        {/* Récap PDF */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-white/70" />
            <h2 className="text-xl font-semibold text-white">Récapitulatif annuel</h2>
          </div>
          <p className="text-sm">
            Chaque 1er janvier, MIDAS génère automatiquement un PDF avec le détail de tes gains
            de l&apos;année écoulée (primes, parrainage, missions). Tu le reçois par email et il
            est disponible dans tes documents.
          </p>
          <Link
            href="/dashboard/tax"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition"
          >
            <FileText className="w-4 h-4" /> Mes récapitulatifs
          </Link>
        </section>

        {/* Crypto = différent */}
        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-6 space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Et tes plus-values crypto ?</h2>
          </div>
          <p className="text-sm leading-relaxed">
            Les gains/pertes liés à tes <strong className="text-white">trades crypto</strong>{' '}
            (et non aux récompenses MIDAS) suivent un régime différent (article 150 VH bis CGI,
            <strong className="text-white"> formulaire 2086</strong>, flat tax 30%).{' '}
            <Link href="/dashboard/tax" className="text-blue-300 hover:underline">
              Génère ton rapport CERFA 2086 →
            </Link>
          </p>
        </section>

        {/* Disclaimer */}
        <p className="text-xs text-white/40 leading-relaxed border-t border-white/[0.06] pt-6">
          Les gains perçus via MIDAS peuvent être soumis à l&apos;impôt sur le revenu selon ta
          situation fiscale et le montant perçu. En France, un seuil de déclaration s&apos;applique
          à partir de 3000€ de revenus annuels via des plateformes numériques. MIDAS te prévient
          automatiquement quand tu approches de ce seuil. MIDAS ne saurait être tenue
          responsable des obligations fiscales individuelles de ses utilisateurs. Pour ta
          situation personnelle, consulte un conseiller fiscal.
        </p>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Bot, Calculator, ChevronDown } from 'lucide-react';

export default function InvestmentModeActions() {
  return (
    <div className="space-y-2">
      <a
        href="#comparer-les-couts"
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20"
        data-testid="execute-trade"
      >
        <Calculator aria-hidden="true" className="h-4 w-4 shrink-0" />
        Comparer un ordre manuel
      </a>
      <details className="group rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/10">
        <summary
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/10"
          data-testid="let-bot-decide"
        >
          <Bot aria-hidden="true" className="h-4 w-4 shrink-0" />
          Comprendre le mode automatique
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 group-open:rotate-180" />
        </summary>
        <div className="space-y-3 px-4 pb-4 text-sm text-[var(--text-secondary)]">
          <p>
            Dans le parcours envisagé, tu confierais un mandat à un prestataire habilité.
            Ce mandat préciserait les actifs autorisés, le montant confié et les limites
            de risque. Tu pourrais le suspendre pour arrêter les nouveaux ordres.
          </p>
          <p>
            Aujourd’hui, MIDAS permet de consulter tes simulations. Le trading automatique
            en argent réel est indisponible.
          </p>
          <Link href="/dashboard/paper" className="inline-block text-[#FFD700] underline">
            Mon journal de simulations (espace connecté)
          </Link>
        </div>
      </details>
    </div>
  );
}

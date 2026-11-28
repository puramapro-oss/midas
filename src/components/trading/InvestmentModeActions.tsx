import Link from 'next/link';
import { Bell, Bot, Calculator, ChevronDown } from 'lucide-react';

interface InvestmentModeActionsProps {
  comparisonAvailable?: boolean;
  comparisonHref?: string;
}

export default function InvestmentModeActions({
  comparisonAvailable = true,
  comparisonHref = '#comparer-les-couts',
}: InvestmentModeActionsProps) {
  return (
    <section aria-label="Modes MIDAS" className="space-y-3">
      <p className="text-sm text-[var(--text-primary)]">
        Deux modes prévus, selon qui passe les ordres. Leur présentation n’active aucun service.
      </p>

      <article
        className="space-y-3 rounded-xl border border-blue-400/25 bg-blue-400/5 p-4"
        data-testid="midas-assisted-mode"
      >
        <h3 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Bell aria-hidden="true" className="h-4 w-4 shrink-0" />
          Assisté — je passe mes ordres
        </h3>
        <p className="text-sm text-[var(--text-primary)]">
          Dans ce mode prévu, MIDAS analyse et t’envoie des notifications d’entrée,
          de modification ou de sortie. Tu ouvres, modifies et fermes chaque position toi-même.
        </p>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Lire ou valider une alerte ne transmet aucun ordre.
        </p>
        <details className="group text-sm text-[var(--text-primary)]">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500">
            Comprendre les alertes
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 group-open:rotate-180" />
          </summary>
          <div className="space-y-2 pb-2">
            <p>
              Une alerte devra préciser l’instrument, les conditions proposées, les risques,
              la date des données et son expiration. Une alerte périmée ne sera plus présentée comme active.
            </p>
            <p>
              Une alerte de sortie restera une recommandation : MIDAS ne fermera pas la position.
              Sans confirmation du courtier, une opération déclarée restera indiquée comme non vérifiée.
            </p>
          </div>
        </details>
        <p className="text-sm text-[var(--text-primary)]">
          Les alertes de trading en direct sont indisponibles. La comparaison des coûts reste accessible.
        </p>
        <a
          href={comparisonAvailable ? comparisonHref : '#marches'}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-400/25 bg-blue-400/10 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-blue-400/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
          data-testid="execute-trade"
        >
          <Calculator aria-hidden="true" className="h-4 w-4 shrink-0" />
          {comparisonAvailable ? 'Comparer un ordre manuel' : 'Choisir un actif à comparer'}
        </a>
      </article>

      <article
        className="space-y-3 rounded-xl border border-violet-400/25 bg-violet-400/5 p-4"
        data-testid="midas-automatic-mode"
      >
        <h3 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Bot aria-hidden="true" className="h-4 w-4 shrink-0" />
          Automatique — MIDAS exécute
        </h3>
        <p className="text-sm text-[var(--text-primary)]">
          Avec un service disponible et un mandat actif, MIDAS pourrait analyser,
          ouvrir, gérer et fermer les positions dans les limites que tu as autorisées.
        </p>
        <p className="text-sm text-[var(--text-primary)]">
          Le trading automatique en argent réel est indisponible.
        </p>
        <details className="group text-sm text-[var(--text-primary)]">
          <summary
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg font-semibold text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500"
            data-testid="let-bot-decide"
          >
            Comprendre le mode automatique
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 group-open:rotate-180" />
          </summary>
          <div className="space-y-3 pb-2">
            <p>
              Dans le parcours envisagé, tu confierais un mandat révocable à un prestataire habilité.
              Il préciserait les actifs, les actions, le montant confié et les limites de risque.
            </p>
            <p>
              Revenir au mode assisté arrêterait les nouvelles initiatives de MIDAS, sans fermer
              automatiquement tes positions. Les ordres et protections déjà placés chez le courtier
              pourraient encore se déclencher tant qu’ils ne sont pas modifiés ou annulés.
              Activer l’automatique ne rejouerait pas les anciennes alertes.
            </p>
            <Link href="/dashboard/paper" prefetch={false} className="inline-block text-[var(--text-primary)] underline">
              Mon journal de simulations (espace connecté)
            </Link>
          </div>
        </details>
      </article>
    </section>
  );
}

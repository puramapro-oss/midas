import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-white/80">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-8 font-[family-name:var(--font-orbitron)]">
          Politique de Confidentialité
        </h1>
        <p className="text-white/50 mb-8">Dernière mise à jour : 29 mars 2026 — Conforme au RGPD</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">1. Responsable du traitement</h2>
            <p>Purama, micro-entreprise — Contact : matiss.frasne@gmail.com</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">2. Données collectées</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Données d&apos;inscription :</strong> adresse email, nom complet, mot de passe (hashé)</li>
              <li><strong className="text-white">Données de profil :</strong> photo de profil, préférences d&apos;interface, profil de risque</li>
              <li><strong className="text-white">Clés API d&apos;exchange :</strong> chiffrées en AES-256-GCM, jamais stockées en clair</li>
              <li><strong className="text-white">Données de trading :</strong> historique des trades, performances, configurations de bots</li>
              <li><strong className="text-white">Conversations IA :</strong> messages échangés avec l&apos;assistant MIDAS</li>
              <li><strong className="text-white">Données d&apos;utilisation :</strong> pages visitées, fonctionnalités utilisées, logs d&apos;erreur</li>
              <li><strong className="text-white">Données de paiement :</strong> gérées entièrement par Stripe, nous ne stockons aucun numéro de carte</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">3. Finalités et bases légales</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Exécution du contrat :</strong> fourniture du service MIDAS, exécution des trades, gestion des abonnements</li>
              <li><strong className="text-white">Consentement :</strong> envoi d&apos;emails de rapport quotidien, notifications</li>
              <li><strong className="text-white">Intérêt légitime :</strong> amélioration du service, détection de fraude, sécurité</li>
              <li><strong className="text-white">Obligation légale :</strong> conservation des données de facturation</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">4. Durée de conservation</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Données de compte : jusqu&apos;à suppression du compte + 30 jours</li>
              <li>Historique des trades : 5 ans (obligations fiscales)</li>
              <li>Données de facturation : 10 ans (obligations comptables)</li>
              <li>Logs techniques : 12 mois</li>
              <li>Conversations IA : jusqu&apos;à suppression du compte</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">5. Sous-traitants</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Supabase Inc.</strong> (États-Unis) — Base de données et authentification</li>
              <li><strong className="text-white">Stripe Inc.</strong> (États-Unis) — Traitement des paiements</li>
              <li><strong className="text-white">Vercel Inc.</strong> (États-Unis) — Hébergement de l&apos;application</li>
              <li><strong className="text-white">Anthropic PBC</strong> (États-Unis) — Intelligence artificielle</li>
              <li><strong className="text-white">Upstash Inc.</strong> (États-Unis) — Cache et file d&apos;attente</li>
              <li><strong className="text-white">Resend Inc.</strong> (États-Unis) — Envoi d&apos;emails</li>
            </ul>
            <p className="mt-2">Des clauses contractuelles types (SCC) encadrent ces transferts hors UE.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">6. Vos droits (RGPD)</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-white">Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
              <li><strong className="text-white">Droit de rectification :</strong> corriger vos données inexactes</li>
              <li><strong className="text-white">Droit à l&apos;effacement :</strong> supprimer votre compte et vos données</li>
              <li><strong className="text-white">Droit à la portabilité :</strong> exporter vos données (CSV disponible)</li>
              <li><strong className="text-white">Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</li>
              <li><strong className="text-white">Droit de retrait du consentement :</strong> à tout moment pour les emails</li>
            </ul>
            <p className="mt-2">Pour exercer vos droits : matiss.frasne@gmail.com. Délai de réponse : 30 jours maximum.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
            <p>MIDAS utilise uniquement des cookies strictement nécessaires au fonctionnement du service (session d&apos;authentification). Aucun cookie de tracking ou publicitaire n&apos;est utilisé.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">8. Sécurité</h2>
            <p>Nous mettons en œuvre des mesures de sécurité appropriées : chiffrement AES-256-GCM des clés API, HTTPS, Row Level Security sur la base de données, authentification sécurisée, monitoring continu.</p>
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-white/40">Contact DPO : matiss.frasne@gmail.com</p>
            <p className="text-white/40">Autorité de contrôle : CNIL — www.cnil.fr</p>
          </div>
        </section>
      </div>
    </div>
  );
}

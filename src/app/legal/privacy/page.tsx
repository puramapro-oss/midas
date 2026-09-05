import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Politique de Confidentialité — MIDAS' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#06080F] px-4 py-16 text-white/80">
      <article className="mx-auto max-w-3xl space-y-7 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold text-white">Politique de Confidentialité</h1>
        <p className="text-white/50">Dernière mise à jour : 5 septembre 2026</p>
        <section><h2 className="mb-2 text-xl font-semibold text-white">1. Responsable</h2><p>PURAMA SASU — SIRET 941 200 105 00011 — 8 Rue de la Chapelle, 25560 Frasne. Contact : contact@purama.dev.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">2. Données traitées</h2><p>Données de compte, préférences d&apos;interface, simulations fictives, conversations avec l&apos;assistant, journaux techniques et données de paiement gérées par Stripe. MIDAS ne collecte aucune clé d&apos;exchange, position réelle ou historique d&apos;ordre réel.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">3. Finalités</h2><p>Authentification, fourniture des contenus éducatifs, sauvegarde des simulations, sécurité, support, gestion des droits PURAMA et obligations comptables. Les données ne servent pas à produire un conseil financier personnalisé.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">4. Conservation</h2><p>Compte : durée du compte puis suppression opérationnelle sous 30 jours ; facturation : durée légale applicable ; journaux techniques : 12 mois ; conversations IA : jusqu&apos;à suppression par l&apos;utilisateur ou du compte.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">5. Destinataires</h2><p>Prestataires strictement nécessaires à l&apos;hébergement, l&apos;authentification, l&apos;IA, au paiement, au cache et aux emails, dans la limite de leur mission et avec les garanties applicables.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">6. Droits</h2><p>Accès, rectification, effacement, limitation, opposition, portabilité et retrait du consentement lorsque celui-ci fonde le traitement. Demande : contact@purama.dev. Réclamation possible auprès de la CNIL.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">7. Cookies et sécurité</h2><p>Cookies strictement nécessaires uniquement ; aucun suivi publicitaire. Mesures techniques : HTTPS, contrôle d&apos;accès, Row Level Security et journalisation de sécurité.</p></section>
      </article>
    </main>
  );
}

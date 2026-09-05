import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: "Conditions Générales d'Utilisation — MIDAS" };

export default function CGUPage() {
  return (
    <main className="min-h-screen bg-[#06080F] px-4 py-16 text-white/80">
      <article className="mx-auto max-w-3xl space-y-7 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold text-white">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-white/50">Dernière mise à jour : 5 septembre 2026</p>
        <section><h2 className="mb-2 text-xl font-semibold text-white">1. Objet</h2><p>MIDAS est un service d&apos;information générale et d&apos;éducation sur les marchés crypto édité par PURAMA SASU. Il ne fournit aucun conseil personnalisé, aucune recommandation d&apos;achat ou de vente et aucune exécution d&apos;ordre.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">2. Fonctionnalités</h2><p>Les contenus, données publiques, exercices et backtests sont pédagogiques. Les simulations utilisent des unités fictives. MIDAS ne se connecte à aucun exchange, ne demande aucune clé API et ne détient aucun fonds.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">3. Compte</h2><p>L&apos;accès est réservé aux personnes majeures. Les informations de compte doivent être exactes et les identifiants conservés confidentiellement.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">4. Accès PURAMA</h2><p>Les droits d&apos;accès relèvent de l&apos;abonnement unique PURAMA et de sa configuration centrale. MIDAS ne commercialise aucun abonnement propre. L&apos;application mobile permet uniquement de se connecter à un compte existant et ne comporte aucun achat ni lien d&apos;achat.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">5. Points</h2><p>La Phase 1 fonctionne uniquement en points. Aucun retrait monétaire ni IBAN n&apos;est proposé tant qu&apos;un montage Swan écrit et validé n&apos;existe pas.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">6. Risques et IA</h2><p>Les crypto-actifs exposent à une perte totale. Les contenus générés avec l&apos;aide d&apos;une IA peuvent être inexacts et doivent pouvoir faire l&apos;objet d&apos;un réexamen humain. Pour une décision personnelle, adressez-vous à un professionnel habilité.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">7. Données</h2><p>Le traitement des données est décrit dans la <Link className="text-[#FFD700]" href="/legal/privacy">politique de confidentialité</Link>.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">8. Contact</h2><p>Droit français. Contact : contact@purama.dev. PURAMA SASU — 8 Rue de la Chapelle, 25560 Frasne.</p></section>
      </article>
    </main>
  );
}

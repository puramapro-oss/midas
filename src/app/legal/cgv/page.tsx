import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conditions Générales de Vente — MIDAS' };

export default function CGVPage() {
  return (
    <main className="min-h-screen bg-[#06080F] px-4 py-16 text-white/80">
      <article className="mx-auto max-w-3xl space-y-7 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold text-white">Conditions Générales de Vente</h1>
        <p className="text-white/50">Dernière mise à jour : 5 septembre 2026</p>
        <section><h2 className="mb-2 text-xl font-semibold text-white">1. Vendeur</h2><p>PURAMA SASU — SIRET 941 200 105 00011 — 8 Rue de la Chapelle, 25560 Frasne — contact@purama.dev.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">2. Offre</h2><p>MIDAS est un espace d&apos;information générale et de simulation éducative inclus dans les droits de l&apos;abonnement unique PURAMA. Aucun abonnement MIDAS distinct, service d&apos;exécution, conseil personnalisé ou promotion crypto en France n&apos;est vendu.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">3. Souscription</h2><p>Toute souscription est effectuée sur le site officiel PURAMA selon les conditions centrales affichées avant paiement. Aucun paiement ni lien d&apos;achat n&apos;est présenté dans l&apos;application mobile.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">4. Durée et résiliation</h2><p>La durée, le renouvellement, la rétractation, la résiliation et les éventuels remboursements sont ceux présentés et acceptés dans le parcours central PURAMA. La résiliation est accessible depuis le portail client.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">5. Nature éducative</h2><p>Les simulations et données historiques ne préjugent pas d&apos;une performance future. Les crypto-actifs peuvent entraîner une perte totale.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">6. Médiation</h2><p>Après une réclamation écrite restée sans solution, le consommateur peut saisir le médiateur CM2C via cm2c.net, sous réserve des conditions de recevabilité du médiateur.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">7. Droit applicable</h2><p>Droit français, sous réserve des dispositions impératives applicables au consommateur.</p></section>
      </article>
    </main>
  );
}

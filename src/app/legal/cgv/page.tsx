import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Generales de Vente — MIDAS',
  description: 'Conditions Generales de Vente de la plateforme MIDAS par PURAMA SASU.',
};

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-white/80">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-8 font-[family-name:var(--font-orbitron)]">
          Conditions Generales de Vente
        </h1>
        <p className="text-white/50 mb-8">Derniere mise a jour : 2 avril 2026</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">1. Vendeur</h2>
            <p><strong className="text-white">PURAMA SASU</strong> (Societe par Actions Simplifiee Unipersonnelle)</p>
            <p>SIRET : 941 200 105 00011</p>
            <p>Capital social : 1 euro</p>
            <p>Siege social : 8 Rue de la Chapelle, 25560 Frasne, France</p>
            <p>Email : contact@purama.dev</p>
            <p>TVA non applicable, article 293 B du Code General des Impots.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">2. Objet</h2>
            <p>Les presentes Conditions Generales de Vente (CGV) regissent la vente des abonnements a la plateforme MIDAS, un logiciel d&apos;aide a la decision pour le trading de cryptomonnaies, edite par PURAMA SASU.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">3. Offres et tarifs</h2>
            <p>MIDAS propose trois formules d&apos;abonnement :</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-white">Free</strong> — Gratuit, sans engagement. Fonctionnalites limitees (5 questions IA/jour, paper trading, 1 exchange).</li>
              <li><strong className="text-white">Pro</strong> — 39€/mois ou 313€/an (soit 26€/mois, -33%). Chat IA illimite, backtesting, signaux avances, MIDAS SHIELD complet.</li>
              <li><strong className="text-white">Ultra</strong> — 79€/mois ou 635€/an (soit 53€/mois, -33%). Toutes les fonctionnalites Pro + trades illimites, strategies exclusives, support prioritaire 24/7, acces API.</li>
            </ul>
            <p className="mt-2">Les prix sont exprimes en euros TTC. TVA non applicable conformement a l&apos;article 293 B du CGI.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">4. Commande et paiement</h2>
            <p>La souscription a un abonnement payant s&apos;effectue en ligne via la plateforme MIDAS. Le paiement est traite de maniere securisee par notre prestataire <strong className="text-white">Stripe Inc.</strong> PURAMA SASU ne collecte ni ne stocke aucune donnee bancaire.</p>
            <p className="mt-2">Moyens de paiement acceptes : carte bancaire (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay.</p>
            <p className="mt-2">La commande est confirmee des reception du paiement. Un email de confirmation est envoye a l&apos;adresse associee au compte.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">5. Duree et renouvellement</h2>
            <p>Les abonnements sont souscrits pour une duree mensuelle ou annuelle selon le choix de l&apos;utilisateur. Ils sont reconduits automatiquement a chaque echeance sauf resiliation prealable.</p>
            <p className="mt-2">La resiliation prend effet a la fin de la periode en cours. L&apos;acces aux fonctionnalites payantes est maintenu jusqu&apos;a cette date.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">6. Droit de retractation</h2>
            <p>Conformement aux articles L221-18 et suivants du Code de la consommation, vous disposez d&apos;un delai de <strong className="text-white">14 jours</strong> a compter de la souscription pour exercer votre droit de retractation, sans avoir a justifier de motifs ni a payer de penalites.</p>
            <p className="mt-2">Toutefois, conformement a l&apos;article L221-28, si vous demandez expressement que l&apos;execution du service commence avant la fin du delai de retractation, vous reconnaissez renoncer a votre droit de retractation une fois que le service a ete pleinement execute.</p>
            <p className="mt-2">Pour exercer votre droit de retractation dans le delai de 14 jours : envoyez un email a <strong className="text-white">contact@purama.dev</strong> avec votre nom, email et date de souscription. Le remboursement sera effectue sous 14 jours via le meme moyen de paiement utilise lors de la souscription.</p>
            <p className="mt-2">Neanmoins, PURAMA SASU s&apos;engage a rembourser tout abonnement en cas de dysfonctionnement majeur avere du service emportant impossibilite totale d&apos;utilisation pendant plus de 72 heures consecutives.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">7. Resiliation</h2>
            <p>Vous pouvez resilier votre abonnement a tout moment depuis votre espace client (Parametres &gt; Abonnement) ou via le portail Stripe. La resiliation prend effet a la fin de la periode de facturation en cours. Aucun remboursement au prorata n&apos;est effectue.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation de responsabilite</h2>
            <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl p-4 mb-3">
              <p className="text-[#FFD700] font-semibold text-sm">MIDAS est un outil logiciel d&apos;aide a la decision. Il ne constitue en aucun cas un conseil en investissement, une gestion de portefeuille ou un service d&apos;intermediation financiere.</p>
            </div>
            <p>PURAMA SASU n&apos;est pas enregistree aupres de l&apos;Autorite des Marches Financiers (AMF) en tant que Prestataire de Services sur Actifs Numeriques (PSAN) ou Conseiller en Investissements Financiers (CIF). Le trading de cryptomonnaies comporte des risques significatifs de perte en capital. L&apos;utilisateur est seul responsable de ses decisions de trading.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">9. Donnees personnelles</h2>
            <p>Le traitement des donnees personnelles est detaille dans notre <a href="/legal/privacy" className="text-[#FFD700] hover:underline">Politique de Confidentialite</a>.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">10. Service client</h2>
            <p>Pour toute question relative a votre abonnement : <strong className="text-white">contact@purama.dev</strong></p>
            <p className="mt-1">Delai de reponse : 48 heures ouvrables maximum.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">11. Mediation</h2>
            <p>En cas de litige non resolu, vous pouvez recourir gratuitement au mediateur de la consommation. La liste des mediateurs agrees est disponible sur le site de la Commission d&apos;evaluation et de controle de la mediation de la consommation : <span className="text-white/60">cecmc.fr</span></p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">12. Droit applicable</h2>
            <p>Les presentes CGV sont soumises au droit francais. Tout litige sera soumis aux tribunaux competents du ressort du siege social de PURAMA SASU, sauf disposition legale contraire.</p>
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-white/40">PURAMA SASU — 8 Rue de la Chapelle, 25560 Frasne</p>
            <p className="text-white/40">Contact : contact@purama.dev</p>
          </div>
        </section>
      </div>
    </div>
  );
}

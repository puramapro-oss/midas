import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-white/80">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-8 font-[family-name:var(--font-orbitron)]">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-white/50 mb-8">Dernière mise à jour : 29 mars 2026</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">1. Objet</h2>
            <p>Les presentes Conditions Generales d&apos;Utilisation (CGU) regissent l&apos;utilisation de la plateforme MIDAS, editee par PURAMA SASU (Societe par Actions Simplifiee Unipersonnelle), capital 1 euro, siege social 8 Rue de la Chapelle, 25560 Frasne, France. MIDAS est un logiciel d&apos;aide a la decision pour le trading de cryptomonnaies. En utilisant MIDAS, vous acceptez ces CGU dans leur integralite.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description du service</h2>
            <p>MIDAS est un outil logiciel qui analyse les marchés de cryptomonnaies à l&apos;aide de l&apos;intelligence artificielle. Il propose des signaux de trading, des analyses techniques et fondamentales, et peut exécuter des ordres sur les exchanges des utilisateurs via leurs clés API. MIDAS ne constitue en aucun cas un service de conseil en investissement, un service de gestion de portefeuille, ou un intermédiaire financier.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">3. Inscription et compte</h2>
            <p>L&apos;inscription est ouverte à toute personne majeure. Vous devez fournir des informations exactes et maintenir la confidentialité de vos identifiants. Vous êtes responsable de toute activité sur votre compte. Un seul compte par personne est autorisé.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">4. Abonnements et paiements</h2>
            <p>MIDAS propose trois formules : Free (gratuit), Pro (39€/mois ou 313€/an) et Ultra (79€/mois ou 635€/an). Les prix sont exprimes en euros TTC (TVA non applicable, art. 293 B du CGI). Les paiements sont geres par Stripe. Les abonnements sont reconduits automatiquement. Vous pouvez annuler a tout moment depuis votre espace client ; l&apos;acces est maintenu jusqu&apos;a la fin de la periode payee. Aucun remboursement n&apos;est effectue pour la periode en cours. Les conditions de vente detaillees sont disponibles dans nos <a href="/legal/cgv" className="text-[#FFD700] hover:underline">Conditions Generales de Vente</a>.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">5. Clés API et sécurité</h2>
            <p>Pour utiliser les fonctionnalités de trading automatique, vous devez fournir vos clés API d&apos;exchange. Ces clés sont chiffrées avec AES-256-GCM et ne sont jamais stockées en clair. Vous devez impérativement ne PAS activer la permission de retrait sur vos clés API. MIDAS ne peut en aucun cas retirer des fonds de votre exchange. Vous êtes seul responsable de la sécurité de vos clés API.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">6. Limitation de responsabilité</h2>
            <p className="font-semibold text-[#FFD700]">Le trading de cryptomonnaies comporte des risques significatifs de perte en capital, pouvant aller jusqu&apos;à la perte totale des fonds investis.</p>
            <p className="mt-2">MIDAS est un outil d&apos;aide à la décision. L&apos;utilisateur est seul responsable de ses décisions de trading et de leurs conséquences financières. Purama ne saurait être tenue responsable des pertes financières subies lors de l&apos;utilisation de MIDAS. Les performances passées affichées ne préjugent pas des performances futures.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">7. Données personnelles</h2>
            <p>Le traitement de vos données personnelles est détaillé dans notre <a href="/legal/privacy" className="text-[#FFD700] hover:underline">Politique de Confidentialité</a>. En utilisant MIDAS, vous consentez à ce traitement conformément au RGPD.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">8. Propriété intellectuelle</h2>
            <p>L&apos;ensemble des éléments de MIDAS (code, design, algorithmes, marque, contenu) sont la propriété exclusive de Purama. Toute reproduction, modification ou utilisation non autorisée est interdite.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">9. Résiliation</h2>
            <p>Vous pouvez supprimer votre compte à tout moment depuis les paramètres. La suppression entraîne la destruction de vos données sous 30 jours. Purama se réserve le droit de suspendre ou supprimer un compte en cas de violation des CGU ou d&apos;utilisation frauduleuse.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">10. Droit applicable</h2>
            <p>Les présentes CGU sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents de Paris, France.</p>
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

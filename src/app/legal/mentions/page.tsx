import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions Legales — MIDAS',
  description: 'Mentions legales de la plateforme MIDAS editee par PURAMA SASU.',
};

export default function MentionsPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-white/80">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-8 font-[family-name:var(--font-orbitron)]">
          Mentions Legales
        </h1>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Editeur</h2>
            <p><strong className="text-white">PURAMA SASU</strong> (Societe par Actions Simplifiee Unipersonnelle)</p>
            <p>SIRET : 941 200 105 00011</p>
            <p>Capital social : 1 euro</p>
            <p>Siege social : 8 Rue de la Chapelle, 25560 Frasne, France</p>
            <p>Representant legal : Matiss Dornier, President</p>
            <p>Email : contact@purama.dev</p>
            <p>TVA non applicable, article 293 B du Code General des Impots.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Directeur de la publication</h2>
            <p>Matiss Dornier — contact@purama.dev</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Hebergement</h2>
            <p><strong className="text-white">Vercel Inc.</strong></p>
            <p>440 N Barranca Ave #4133, Covina, CA 91723, Etats-Unis</p>
            <p>Site : vercel.com</p>
            <p>Telephone : +1 559 288 7060</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Base de donnees</h2>
            <p><strong className="text-white">Supabase</strong> — Infrastructure auto-hebergee sur serveur dedie (OVHcloud, France).</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Activite</h2>
            <p>MIDAS est un <strong className="text-white">logiciel d&apos;aide a la decision</strong> pour le trading de cryptomonnaies. PURAMA SASU n&apos;est pas enregistree en tant que :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Prestataire de Services sur Actifs Numeriques (PSAN) aupres de l&apos;AMF</li>
              <li>Conseiller en Investissements Financiers (CIF)</li>
              <li>Intermediaire en operations de banque et services de paiement</li>
            </ul>
            <p className="mt-2">MIDAS ne fournit aucun conseil en investissement, ne gere aucun portefeuille, et ne detient a aucun moment les fonds des utilisateurs.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Propriete intellectuelle</h2>
            <p>L&apos;ensemble des elements constituant le site et l&apos;application MIDAS (textes, graphismes, logiciels, algorithmes, marques, logos, bases de donnees) sont la propriete exclusive de PURAMA SASU et sont proteges par les legislations francaises et internationales relatives a la propriete intellectuelle.</p>
            <p className="mt-2">Toute reproduction, representation, modification, publication ou adaptation totale ou partielle est interdite sans autorisation prealable ecrite de PURAMA SASU.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Donnees personnelles</h2>
            <p>Le traitement des donnees personnelles est detaille dans notre <a href="/legal/privacy" className="text-[#FFD700] hover:underline">Politique de Confidentialite</a>.</p>
            <p className="mt-1">Delegue a la protection des donnees : matiss.frasne@gmail.com</p>
            <p className="mt-1">Autorite de controle : CNIL — www.cnil.fr</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Credits</h2>
            <p>Design et developpement : PURAMA SASU</p>
            <p>Intelligence artificielle : Anthropic (Claude)</p>
            <p>Icones : Lucide React (licence MIT)</p>
            <p>Polices : Google Fonts (licence Open Font)</p>
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-white/40">PURAMA SASU — 8 Rue de la Chapelle, 25560 Frasne, France</p>
            <p className="text-white/40">Contact : contact@purama.dev</p>
          </div>
        </section>
      </div>
    </div>
  );
}

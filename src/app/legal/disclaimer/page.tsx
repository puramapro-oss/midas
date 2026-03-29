import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Avertissement sur les Risques',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-white/80">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-8">
          <AlertTriangle className="w-8 h-8 text-[#FFD700]" />
          <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-orbitron)]">
            Avertissement sur les Risques
          </h1>
        </div>

        <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl p-6 mb-8">
          <p className="text-[#FFD700] font-semibold text-lg">
            Le trading de cryptomonnaies est une activité hautement spéculative qui comporte des risques significatifs de perte en capital, pouvant aller jusqu&apos;à la perte totale des fonds investis.
          </p>
        </div>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Risques liés aux cryptomonnaies</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Les cryptomonnaies sont des actifs extrêmement volatils. Leur valeur peut fluctuer de manière significative en très peu de temps, à la hausse comme à la baisse.</li>
              <li>Le marché des cryptomonnaies fonctionne 24h/24, 7j/7. Des mouvements importants peuvent survenir à tout moment, y compris pendant votre sommeil.</li>
              <li>Les cryptomonnaies ne sont pas garanties par un État ou une banque centrale. Leur valeur repose sur l&apos;offre et la demande du marché.</li>
              <li>Le cadre réglementaire des cryptomonnaies évolue rapidement. De nouvelles régulations peuvent impacter significativement la valeur des actifs.</li>
              <li>Les exchanges de cryptomonnaies peuvent faire l&apos;objet de piratages, de pannes techniques ou de faillites.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">MIDAS ne garantit aucun rendement</h2>
            <p>MIDAS est un outil logiciel d&apos;aide à la décision basé sur l&apos;intelligence artificielle. Malgré l&apos;utilisation de 47 indicateurs techniques, 6 couches d&apos;intelligence et 7 niveaux de protection :</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-white">Aucun rendement n&apos;est garanti.</strong> Les performances passées affichées par MIDAS, y compris les résultats de backtesting, ne préjugent pas des performances futures.</li>
              <li><strong className="text-white">L&apos;IA peut se tromper.</strong> Les analyses et décisions de l&apos;intelligence artificielle sont basées sur des données historiques et des modèles statistiques qui ne peuvent pas prédire l&apos;avenir avec certitude.</li>
              <li><strong className="text-white">Le système MIDAS SHIELD réduit les risques mais ne les élimine pas.</strong> Des pertes sont possibles et probables dans toute activité de trading.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Recommandations</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-[#FFD700]">N&apos;investissez que ce que vous pouvez vous permettre de perdre.</strong> Ne tradez jamais avec de l&apos;argent dont vous avez besoin pour vos dépenses courantes, votre loyer ou vos obligations financières.</li>
              <li><strong className="text-white">Consultez un conseiller financier professionnel</strong> avant de prendre des décisions d&apos;investissement importantes.</li>
              <li><strong className="text-white">Commencez par le paper trading</strong> (simulation) pour vous familiariser avec la plateforme sans risquer de capital réel.</li>
              <li><strong className="text-white">Configurez vos limites de perte</strong> dans les paramètres MIDAS SHIELD et respectez-les.</li>
              <li><strong className="text-white">Diversifiez vos investissements.</strong> Ne mettez pas tous vos fonds dans un seul actif ou une seule stratégie.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Nature du service</h2>
            <p>MIDAS est un <strong className="text-white">logiciel</strong>, pas un service de conseil en investissement, de gestion de portefeuille, ou d&apos;intermédiation financière. Purama n&apos;est pas un conseiller en investissement financier (CIF), ni un prestataire de services sur actifs numériques (PSAN) au sens de la réglementation française. L&apos;utilisateur est seul décisionnaire et seul responsable de ses opérations de trading.</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <p className="text-red-400 font-semibold">
              En utilisant MIDAS, vous reconnaissez avoir lu et compris cet avertissement, et vous acceptez les risques inhérents au trading de cryptomonnaies. Vous confirmez que vous êtes seul responsable de vos décisions de trading et de leurs conséquences financières.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

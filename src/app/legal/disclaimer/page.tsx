import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = { title: 'Avertissement — MIDAS' };

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-[#06080F] px-4 py-16 text-white/80">
      <article className="mx-auto max-w-3xl space-y-7 text-sm leading-relaxed">
        <div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-[#FFD700]" aria-hidden="true" /><h1 className="text-3xl font-bold text-white">Avertissement sur les risques</h1></div>
        <p className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/10 p-5 font-semibold text-[#FFD700]">Les crypto-actifs sont hautement volatils et peuvent entraîner une perte totale.</p>
        <section><h2 className="mb-2 text-xl font-semibold text-white">Nature du service</h2><p>MIDAS fournit uniquement de l&apos;information générale et des simulations éducatives. Il ne fournit ni conseil personnalisé, ni recommandation, ni gestion de portefeuille, ni intermédiaire, ni exécution d&apos;ordre.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">Limites des contenus</h2><p>Les données historiques et productions assistées par IA peuvent être incomplètes ou inexactes. Elles ne prédisent aucune performance future. Un réexamen humain peut être demandé.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">Décisions personnelles</h2><p>MIDAS ne tient pas compte de votre patrimoine, de vos objectifs ou de votre tolérance au risque. Pour toute décision personnelle, consultez un professionnel habilité.</p></section>
        <section><h2 className="mb-2 text-xl font-semibold text-white">Absence de promotion et d&apos;exécution</h2><p>MIDAS ne promeut aucun service crypto en France, ne connecte aucun exchange, ne collecte aucune clé API et ne déclenche aucune opération réelle.</p></section>
      </article>
    </main>
  );
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Évolutions — MIDAS',
  description: "Historique du cadre éducatif de MIDAS.",
};

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-[#06080F] px-4 py-16 text-white">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-white/60"><ArrowLeft className="h-4 w-4" />Retour</Link>
        <h1 className="mt-8 text-3xl font-bold">Évolutions de MIDAS</h1>
        <section className="mt-8 rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/5 p-6">
          <p className="text-sm text-white/50">5 septembre 2026</p>
          <h2 className="mt-2 text-xl font-semibold">Cadre information et éducation</h2>
          <p className="mt-3 leading-relaxed text-white/70">Les connexions d’exchange, clés API, ordres réels, signaux personnalisés et promotions de services crypto en France sont désactivés. Les parcours accessibles sont limités aux données générales et simulations fictives.</p>
        </section>
      </article>
    </main>
  );
}

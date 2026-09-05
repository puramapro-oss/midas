import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accès — MIDAS',
  description: "MIDAS relève de l'abonnement unique PURAMA et ne propose aucun abonnement propre.",
};

export default function PricingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06080F] px-6 text-white">
      <section className="max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <h1 className="text-3xl font-bold">Accès via PURAMA</h1>
        <p className="mt-4 leading-relaxed text-white/70">MIDAS ne propose aucun abonnement propre. Les droits et quotas proviennent de l’abonnement unique PURAMA. Sur mobile, aucun achat ni lien d’achat n’est présenté.</p>
        <Link href="/" className="mt-7 inline-flex min-h-11 items-center rounded-xl border border-white/20 px-6 py-3 font-semibold">Retour à MIDAS</Link>
      </section>
    </main>
  );
}

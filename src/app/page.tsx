import Link from 'next/link';
import { BookOpen, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#06080F] text-white">
      <section className="mx-auto flex min-h-[78vh] max-w-5xl flex-col justify-center px-6 py-20">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#FFD700]">Information générale · Éducation</p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">Comprendre les marchés crypto sans ordre réel ni conseil personnalisé.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/70">MIDAS explique des notions de marché et propose des simulations pédagogiques. Le service ne se connecte à aucun exchange, ne collecte aucune clé API, ne recommande aucun actif et ne déclenche aucune opération.</p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link href="/register" className="min-h-11 rounded-xl bg-[#FFD700] px-6 py-3 font-semibold text-black">Accéder à l’espace éducatif</Link>
          <Link href="/legal/disclaimer" className="min-h-11 rounded-xl border border-white/20 px-6 py-3 font-semibold">Lire l’avertissement</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-20 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <BookOpen className="mb-4 h-7 w-7 text-[#FFD700]" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Apprentissage général</h2>
          <p className="mt-3 text-white/65">Définitions, données publiques et exercices fictifs, sans adaptation à ta situation personnelle.</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <ShieldCheck className="mb-4 h-7 w-7 text-[#FFD700]" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Limites explicites</h2>
          <p className="mt-3 text-white/65">Les crypto-actifs peuvent entraîner une perte totale. Pour une décision personnelle, consulte un professionnel habilité.</p>
        </article>
      </section>
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-white/55">
        <nav className="flex flex-wrap justify-center gap-5" aria-label="Liens légaux">
          <Link href="/legal/cgu">CGU</Link><Link href="/legal/cgv">CGV</Link><Link href="/legal/privacy">Confidentialité</Link><Link href="/legal/mentions">Mentions légales</Link>
        </nav>
      </footer>
    </main>
  );
}

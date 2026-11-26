import type { Metadata } from 'next';
import Link from 'next/link';
import MarketExplorer from '@/components/trading/MarketExplorer';

const title = 'Investir et trader | MIDAS';
const description = 'Explore les marchés et compare les coûts de tes opérations avec MIDAS. Version de simulation.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, type: 'website', locale: 'fr_FR', siteName: 'MIDAS' },
  twitter: { title, description, card: 'summary' },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#06080F] text-white">
      <section className="mx-auto max-w-5xl px-6 pb-8 pt-12 sm:pt-16">
        <div className="mb-5 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-violet-300">PURAMA · MIDAS</span>
          <Link href="/dashboard" className="underline">Mon espace</Link>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Investir et trader</h1>
        <p className="mt-4 text-lg text-white/80">Choisis ton marché et compare le coût d’un achat ou d’une vente.</p>
        <p className="mt-2 text-sm text-violet-200">Mode simulation · Les ordres en argent réel sont indisponibles.</p>
      </section>
      <div className="mx-auto max-w-5xl px-6 pb-12 [--text-primary:#f8fafc] [--text-secondary:#bfc7d4]">
        <MarketExplorer />
      </div>
      <footer className="border-t border-white/10 px-6 py-8 text-sm text-white/70">
        <p className="mx-auto max-w-5xl">MIDAS ne se connecte à aucun exchange, ne collecte aucune clé API et ne fournit pas de conseil personnalisé. La disponibilité des produits dépend du pays, de l’âge et du prestataire habilité.</p>
        <nav className="mx-auto mt-4 flex max-w-5xl flex-wrap gap-5" aria-label="Liens légaux">
          <Link href="/legal/disclaimer">Lire l’avertissement</Link><Link href="/legal/cgu">CGU</Link><Link href="/legal/cgv">CGV</Link><Link href="/legal/privacy">Confidentialité</Link><Link href="/legal/mentions">Mentions légales</Link>
        </nav>
      </footer>
    </main>
  );
}

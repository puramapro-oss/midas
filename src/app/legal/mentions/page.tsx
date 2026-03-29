import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions Légales',
};

export default function MentionsPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-white/80">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-8 font-[family-name:var(--font-orbitron)]">
          Mentions Légales
        </h1>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Éditeur</h2>
            <p>MIDAS est édité par <strong className="text-white">Purama</strong>, micro-entreprise.</p>
            <p>Directeur de la publication : Tissma</p>
            <p>Contact : matiss.frasne@gmail.com</p>
            <p>TVA non applicable, article 293 B du CGI.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Hébergement</h2>
            <p><strong className="text-white">Vercel Inc.</strong></p>
            <p>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</p>
            <p>Site : vercel.com</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Base de données</h2>
            <p><strong className="text-white">Supabase Inc.</strong></p>
            <p>Infrastructure auto-hébergée sur serveur dédié.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Propriété intellectuelle</h2>
            <p>L&apos;ensemble des éléments constituant le site MIDAS (textes, graphismes, logiciels, photographies, images, sons, plans, noms, logos, marques, créations et œuvres protégeables diverses, bases de données, etc.) ainsi que le site lui-même, relèvent des législations françaises et internationales sur le droit d&apos;auteur et la propriété intellectuelle.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Crédits</h2>
            <p>Design et développement : Purama</p>
            <p>Intelligence artificielle : Anthropic (Claude)</p>
            <p>Icônes : Lucide React</p>
          </div>
        </section>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Cookies — MIDAS',
  description: 'Politique de cookies de la plateforme MIDAS. Informations sur les cookies utilises et vos droits RGPD.',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#06080F] text-white/80">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-8 font-[family-name:var(--font-orbitron)]">
          Politique de Cookies
        </h1>
        <p className="text-white/50 mb-8">Derniere mise a jour : 2 avril 2026 — Conforme RGPD et directive ePrivacy</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
            <p>Un cookie est un petit fichier texte depose sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d&apos;un site web. Il permet au site de se souvenir de vos actions et preferences pendant une duree determinee.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">2. Cookies utilises par MIDAS</h2>

            <div className="mt-4 space-y-4">
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <h3 className="text-white font-semibold mb-2">Cookies strictement necessaires</h3>
                <p className="text-white/50 text-xs mb-2">Ces cookies sont indispensables au fonctionnement du site. Ils ne peuvent pas etre desactives.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-2 pr-4 text-white/60">Nom</th>
                        <th className="text-left py-2 pr-4 text-white/60">Finalite</th>
                        <th className="text-left py-2 text-white/60">Duree</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/50">
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 text-white/70">sb-*-auth-token</td>
                        <td className="py-2 pr-4">Session d&apos;authentification Supabase</td>
                        <td className="py-2">Session / 1 an</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 text-white/70">midas-cookie-consent</td>
                        <td className="py-2 pr-4">Memorise votre choix de cookies</td>
                        <td className="py-2">12 mois</td>
                      </tr>
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 text-white/70">midas-theme</td>
                        <td className="py-2 pr-4">Preference de theme (dark/light)</td>
                        <td className="py-2">12 mois</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <h3 className="text-white font-semibold mb-2">Cookies analytiques (optionnels)</h3>
                <p className="text-white/50 text-xs mb-2">Ces cookies nous aident a comprendre comment les visiteurs utilisent MIDAS. Ils sont deposes uniquement avec votre consentement.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-2 pr-4 text-white/60">Nom</th>
                        <th className="text-left py-2 pr-4 text-white/60">Finalite</th>
                        <th className="text-left py-2 pr-4 text-white/60">Fournisseur</th>
                        <th className="text-left py-2 text-white/60">Duree</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/50">
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 text-white/70">ph_*</td>
                        <td className="py-2 pr-4">Analyse d&apos;usage anonymisee</td>
                        <td className="py-2 pr-4">PostHog (UE)</td>
                        <td className="py-2">12 mois</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <h3 className="text-white font-semibold mb-2">Cookies de performance (optionnels)</h3>
                <p className="text-white/50 text-xs mb-2">Ces cookies mesurent les performances du site pour ameliorer l&apos;experience utilisateur.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-2 pr-4 text-white/60">Nom</th>
                        <th className="text-left py-2 pr-4 text-white/60">Finalite</th>
                        <th className="text-left py-2 pr-4 text-white/60">Fournisseur</th>
                        <th className="text-left py-2 text-white/60">Duree</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/50">
                      <tr className="border-b border-white/[0.04]">
                        <td className="py-2 pr-4 text-white/70">__vercel_*</td>
                        <td className="py-2 pr-4">Mesure de performance (Web Vitals)</td>
                        <td className="py-2 pr-4">Vercel Analytics</td>
                        <td className="py-2">Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">3. Gestion de vos preferences</h2>
            <p>Lors de votre premiere visite, une banniere vous permet d&apos;accepter ou de refuser les cookies optionnels. Vous pouvez modifier vos preferences a tout moment :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>En cliquant sur le bouton &quot;Gerer les cookies&quot; en bas de page</li>
              <li>En configurant les parametres de votre navigateur</li>
              <li>En supprimant les cookies existants depuis votre navigateur</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">4. Cookies tiers</h2>
            <p>MIDAS n&apos;utilise <strong className="text-white">aucun cookie publicitaire</strong> et ne partage aucune donnee avec des regies publicitaires. Les seuls tiers deposant des cookies sur MIDAS sont :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-white">Stripe</strong> — Pour la securite des paiements (cookies techniques necessaires)</li>
              <li><strong className="text-white">PostHog</strong> — Pour l&apos;analyse d&apos;usage (heberge en UE, soumis a votre consentement)</li>
              <li><strong className="text-white">Vercel</strong> — Pour la mesure de performance (soumis a votre consentement)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">5. Duree de conservation</h2>
            <p>Les cookies de session sont supprimes a la fermeture de votre navigateur. Les cookies persistants ont une duree maximale de 12 mois conformement aux recommandations de la CNIL.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">6. Vos droits</h2>
            <p>Conformement au RGPD et a la loi Informatique et Libertes, vous disposez d&apos;un droit d&apos;acces, de rectification, de suppression et d&apos;opposition concernant vos donnees. Pour exercer ces droits : <strong className="text-white">contact@purama.dev</strong></p>
            <p className="mt-2">Autorite de controle : CNIL — <span className="text-white/60">www.cnil.fr</span></p>
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-white/40">PURAMA SASU — 8 Rue de la Chapelle, 25560 Frasne</p>
          </div>
        </section>
      </div>
    </div>
  );
}

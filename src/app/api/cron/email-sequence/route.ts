import { NextResponse, type NextRequest } from 'next/server';
import { assertCronAuth } from '@/lib/cron-auth';
import { createClient } from '@/lib/supabase/server';

// 7 email sequences: J0 Bienvenue, J1 Astuce, J3 Relance, J7 Tips, J14 Découverte,
// J21 Fonctionnalités, J30 Win-back — contenus éducatifs uniquement (D2=A).

// D2=A : contenus strictement éducatifs — aucun signalement d'opportunité,
// aucune promotion d'abonnement, aucun témoignage ou chiffre de gain, et des
// CTA uniquement vers des pages atteignables (voir src/middleware.ts).
const SEQUENCES = [
  { type: 'welcome', day: 0, subject: 'Bienvenue sur MIDAS — apprends les marchés pas à pas', delay_days: 0 },
  { type: 'tip', day: 1, subject: 'Astuce MIDAS : ta première analyse éducative en 30 secondes', delay_days: 1 },
  { type: 'reminder', day: 3, subject: 'Des questions sur les marchés ? L’aide MIDAS est là', delay_days: 3 },
  { type: 'tips', day: 7, subject: '3 notions de marché que tout le monde devrait connaître', delay_days: 7 },
  { type: 'upgrade', day: 14, subject: 'MIDAS : explore tout ce que ton compte te permet déjà', delay_days: 14 },
  { type: 'testimonial', day: 21, subject: 'MIDAS : 3 fonctionnalités que tu n’as pas encore essayées', delay_days: 21 },
  { type: 'winback', day: 30, subject: 'Tu nous manques ! Les marchés n’attendent pas', delay_days: 30 },
] as const;

export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const supabase = await createClient();
    const now = new Date();

    // Get all users who need emails
    for (const seq of SEQUENCES) {
      const targetDate = new Date(now.getTime() - seq.delay_days * 86400000);
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      // Find users created on the target day who haven't received this email
      const { data: users } = await supabase.schema('midas').from('profiles')
        .select('id, email, full_name, plan')
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString())
        .limit(100);

      if (!users?.length) continue;

      for (const user of users) {
        // Check if already sent
        const { count } = await supabase.schema('midas').from('email_sequences')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('email_type', seq.type);

        if ((count ?? 0) > 0) continue;

        // Skip upgrade email for paying users
        if (seq.type === 'upgrade' && user.plan !== 'free') continue;
        if (seq.type === 'winback' && user.plan !== 'free') continue;

        // Send email via Resend
        try {
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              signal: AbortSignal.timeout(15_000),
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'MIDAS <noreply@purama.dev>',
                to: user.email,
                subject: seq.subject,
                html: generateEmailHtml(seq.type, user.full_name ?? 'Trader'),
              }),
            });
            if (!res.ok) {
              console.error(`[email-sequence] Resend ${res.status} pour ${seq.type}/${user.email} — envoi non confirmé`);
            }
          }

          // Record sent
          await supabase.schema('midas').from('email_sequences').insert({
            user_id: user.id,
            email_type: seq.type,
          });
        } catch {
          // Continue with next user
        }
      }
    }

    return NextResponse.json({ ok: true, processed: SEQUENCES.length });
  } catch {
    console.error('[email-sequence] échec CRON — détail serveur uniquement');
    return NextResponse.json({ error: 'Erreur CRON email' }, { status: 500 });
  }
}

function generateEmailHtml(type: string, name: string): string {
  const baseStyle = `
    <style>
      body { background: #0A0A0F; color: #fff; font-family: -apple-system, sans-serif; padding: 40px 20px; }
      .container { max-width: 500px; margin: 0 auto; }
      .logo { color: #F59E0B; font-size: 28px; font-weight: bold; margin-bottom: 24px; }
      .cta { display: inline-block; background: linear-gradient(135deg, #F59E0B, #D97706); color: #000; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; margin: 24px 0; }
      .footer { color: #555; font-size: 12px; margin-top: 40px; border-top: 1px solid #222; padding-top: 16px; }
      p { color: #ccc; line-height: 1.6; }
    </style>
  `;

  const footer = `
    <div class="footer">
      <p>MIDAS par Purama — Trading IA avancé</p>
      <p>TVA non applicable, art. 293 B du CGI</p>
    </div>
  `;

  const templates: Record<string, string> = {
    welcome: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Bienvenue ${name} !</h2><p>Ton compte MIDAS est prêt. MIDAS est un outil d'information générale et de simulation éducative : aucune clé d'exchange, aucun ordre réel, uniquement de l'apprentissage.</p><p>Commence par découvrir les marchés et l'aide intégrée.</p><a href="https://midas.purama.dev/dashboard" class="cta">Accéder à MIDAS</a>${footer}</div>`,
    tip: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Astuce du jour</h2><p>Salut ${name} ! Savais-tu que tu peux poser toutes tes questions de compréhension des marchés au chat IA de MIDAS ?</p><p>Essaie : "Explique-moi le RSI et ses limites sur BTC/USDT en 4h"</p><a href="https://midas.purama.dev/dashboard/chat" class="cta">Essayer maintenant</a>${footer}</div>`,
    reminder: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Une question sur les marchés ?</h2><p>${name}, le centre d'aide MIDAS rassemble FAQ, glossaire et réflexes de prudence.</p><p>Aucune recommandation personnalisée — juste de la pédagogie claire.</p><a href="https://midas.purama.dev/dashboard/help" class="cta">Ouvrir l'aide</a>${footer}</div>`,
    tips: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>3 notions de marché</h2><p>${name}, voici trois concepts que MIDAS t'aide à comprendre :</p><ol style="color:#ccc"><li>Tendance et moyennes mobiles (EMA)</li><li>Volatilité et ATR</li><li>Psychologie de marché et biais cognitifs</li></ol><a href="https://midas.purama.dev/dashboard/help" class="cta">Approfondir</a>${footer}</div>`,
    upgrade: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Tu n'as pas tout vu</h2><p>${name}, ton compte donne déjà accès à :</p><ul style="color:#ccc"><li>Analyses de marché générales</li><li>Backtesting pédagogique</li><li>Simulation éducative</li><li>Chat IA illimité en questions</li></ul><a href="https://midas.purama.dev/dashboard" class="cta">Explorer MIDAS</a>${footer}</div>`,
    testimonial: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>3 fonctionnalités à essayer</h2><p>${name}, si tu n'as pas encore exploré ces outils éducatifs, c'est le moment :</p><ul style="color:#ccc"><li>Le suivi des marchés en temps réel</li><li>Le backtesting pour tester une idée de stratégie</li><li>Le chat IA pour poser tes questions de compréhension</li></ul><a href="https://midas.purama.dev/dashboard" class="cta">Découvrir</a>${footer}</div>`,
    winback: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Tu nous manques ${name} !</h2><p>Les marchés évoluent et MIDAS aussi. Reprends où tu t'étais arrêté :</p><ul style="color:#ccc"><li>Suivi pédagogique des marchés</li><li>Simulation éducative</li><li>Aide et glossaire complets</li></ul><a href="https://midas.purama.dev/dashboard" class="cta">Revenir sur MIDAS</a>${footer}</div>`,
  };

  return templates[type] ?? templates.welcome;
}

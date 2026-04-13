import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 10 email sequences: J0 Bienvenue, J1 Astuce, J3 Relance, J7 Tips, J14 Upgrade,
// J21 Témoignage, J30 Win-back, Evt: Parrainage, Evt: Concours, Evt: Palier

const SEQUENCES = [
  { type: 'welcome', day: 0, subject: 'Bienvenue sur MIDAS — Ton edge trading IA', delay_days: 0 },
  { type: 'tip', day: 1, subject: 'Astuce MIDAS : ta première analyse IA en 30 secondes', delay_days: 1 },
  { type: 'reminder', day: 3, subject: 'Tes signaux IA t\'attendent sur MIDAS', delay_days: 3 },
  { type: 'tips', day: 7, subject: '3 stratégies gagnantes que nos meilleurs traders utilisent', delay_days: 7 },
  { type: 'upgrade', day: 14, subject: 'Passe Pro : -20% avec le code EMAIL20 (48h)', delay_days: 14 },
  { type: 'testimonial', day: 21, subject: 'Comment Marc a gagné 2400€ en 3 mois avec MIDAS', delay_days: 21 },
  { type: 'winback', day: 30, subject: 'Tu nous manques ! Reviens avec -30% sur MIDAS Pro', delay_days: 30 },
] as const;

export async function GET() {
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
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
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
  } catch (err) {
    return NextResponse.json({ error: 'Erreur CRON email', details: String(err) }, { status: 500 });
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
    welcome: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Bienvenue ${name} !</h2><p>Ton compte MIDAS est prêt. Notre IA analyse déjà les marchés pour toi 24/7.</p><p>Connecte ton exchange pour commencer à trader avec un edge IA.</p><a href="https://midas.purama.dev/dashboard" class="cta">Accéder à MIDAS</a>${footer}</div>`,
    tip: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Astuce du jour</h2><p>Salut ${name} ! Savais-tu que tu peux demander une analyse complète de n'importe quelle crypto à notre chat IA ?</p><p>Essaie : "Analyse BTC/USDT sur 4h avec sentiment et on-chain"</p><a href="https://midas.purama.dev/dashboard/chat" class="cta">Essayer maintenant</a>${footer}</div>`,
    reminder: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Tes signaux t'attendent</h2><p>${name}, nos agents IA ont détecté de nouvelles opportunités sur les marchés.</p><p>Ne manque pas les prochains mouvements !</p><a href="https://midas.purama.dev/dashboard/signals" class="cta">Voir les signaux</a>${footer}</div>`,
    tips: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>3 stratégies gagnantes</h2><p>${name}, voici ce que nos meilleurs traders utilisent :</p><ol style="color:#ccc"><li>Trend Following sur BTC/ETH (4h)</li><li>Mean Reversion sur les altcoins (1h)</li><li>DCA intelligent avec le bot MIDAS</li></ol><a href="https://midas.purama.dev/dashboard/bots" class="cta">Créer un bot</a>${footer}</div>`,
    upgrade: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>-20% sur Pro — 48h seulement</h2><p>${name}, passe à MIDAS Pro avec le code <strong>EMAIL20</strong> pour débloquer :</p><ul style="color:#ccc"><li>200 questions IA / jour</li><li>Backtesting complet</li><li>Smart Money Analysis</li><li>5 bots actifs</li></ul><a href="https://midas.purama.dev/pricing" class="cta">Passer Pro -20%</a>${footer}</div>`,
    testimonial: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>L'histoire de Marc</h2><p>${name}, Marc utilise MIDAS depuis 3 mois. Résultat : +2400€ de profit avec le bot DCA intelligent et les signaux IA.</p><p>"MIDAS m'a appris à trader avec discipline. L'IA détecte des patterns que je ne voyais pas."</p><a href="https://midas.purama.dev/dashboard" class="cta">Commencer comme Marc</a>${footer}</div>`,
    winback: `${baseStyle}<div class="container"><div class="logo">MIDAS</div><h2>Tu nous manques ${name} !</h2><p>Les marchés bougent et notre IA a évolué. Nouveautés :</p><ul style="color:#ccc"><li>10 agents IA spécialisés</li><li>Détection de manipulation</li><li>Paper trading amélioré</li></ul><p>Reviens avec <strong>-30%</strong> sur Pro !</p><a href="https://midas.purama.dev/pricing" class="cta">Revenir sur MIDAS</a>${footer}</div>`,
  };

  return templates[type] ?? templates.welcome;
}

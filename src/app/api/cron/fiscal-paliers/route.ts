// =============================================================================
// MIDAS — CRON Fiscal Paliers (V7 §25)
// Détecte les users qui franchissent 1500€ / 2500€ / 3000€ sur l'année civile
// (gains plateforme : primes + parrainage + récompenses, hors P&L crypto trading).
// 1 seule notification par palier (table midas.fiscal_notifications).
// Schedule recommandé : 1× / jour (vercel.json)
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const PALIERS = [
  {
    palier: 1,
    threshold: 1500,
    subject: '🎯 Tu as gagné 1500€ avec MIDAS',
    body_intro: 'Tu approches du seuil de déclaration fiscale.',
    body_action: 'Aucune action requise pour le moment. À 3000€, tu devras déclarer.',
  },
  {
    palier: 2,
    threshold: 2500,
    subject: '⚠️ Plus que 500€ avant le seuil de déclaration fiscale',
    body_intro: 'Tu as gagné 2500€ sur MIDAS cette année.',
    body_action:
      'À 3000€ tu devras déclarer (case 5NG sur impots.gouv.fr, abattement auto 34%).',
  },
  {
    palier: 3,
    threshold: 3000,
    subject: '📋 Tu dois déclarer tes gains MIDAS aux impôts',
    body_intro: 'Tu as franchi le seuil des 3000€ de gains plateforme cette année.',
    body_action:
      'Ta déclaration : impots.gouv.fr → case 5NG → montant total. Abattement auto 34%. On t\'envoie le récapitulatif PDF en janvier.',
  },
];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    db: { schema: 'midas' as never },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getResend() {
  const k = process.env.RESEND_API_KEY?.trim();
  return k ? new Resend(k) : null;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  total_gains: number;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supa = getServiceClient();
    if (!supa) {
      return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
    }
    const resend = getResend();

    const yearStart = new Date(new Date().getUTCFullYear(), 0, 1).toISOString();

    // Agrégation gains plateforme depuis wallet_transactions credits
    // (sources : referral, contest, bonus, prime, mission — exclut withdrawal)
    type RpcRow = { user_id: string; total: number };
    const { data: gainsRaw } = await (supa as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: RpcRow[] | null }>;
    }).rpc('compute_yearly_platform_gains', { since: yearStart });

    // Fallback : si l'RPC n'existe pas, calcul direct via wallet_transactions
    let userGains: Map<string, number> = new Map();
    if (gainsRaw && Array.isArray(gainsRaw)) {
      for (const g of gainsRaw) {
        userGains.set(g.user_id, Number(g.total) || 0);
      }
    } else {
      const txRes = await (supa as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              gte: (c: string, v: string) => {
                neq: (c: string, v: string) => Promise<{ data: Array<{ user_id: string; amount: number }> | null }>;
              };
            };
          };
        };
      })
        .from('wallet_transactions')
        .select('user_id, amount')
        .eq('type', 'credit')
        .gte('created_at', yearStart)
        .neq('source', 'withdrawal');
      const tx = txRes.data ?? [];
      userGains = new Map();
      for (const t of tx) {
        userGains.set(t.user_id, (userGains.get(t.user_id) ?? 0) + Number(t.amount));
      }
    }

    let notifsSent = 0;
    let emailsSent = 0;

    for (const [userId, total] of userGains.entries()) {
      // Pour chaque palier, vérifier si franchi ET pas déjà notifié
      for (const p of PALIERS) {
        if (total < p.threshold) continue;

        // Existe déjà ?
        const existsRes = await (supa as unknown as {
          from: (t: string) => {
            select: (s: string, opts?: { count: string; head: boolean }) => {
              eq: (c: string, v: string | number) => {
                eq: (c: string, v: string | number) => Promise<{ count: number | null }>;
              };
            };
          };
        })
          .from('fiscal_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('palier', p.palier);

        if ((existsRes.count ?? 0) > 0) continue;

        // Insert notification
        await (supa as unknown as {
          from: (t: string) => { insert: (v: unknown) => Promise<unknown> };
        })
          .from('fiscal_notifications')
          .insert({
            user_id: userId,
            palier: p.palier,
            threshold_eur: p.threshold,
            total_at_trigger: total,
            email_sent: !!resend,
            push_sent: false,
            acknowledged: false,
          });
        notifsSent += 1;

        // Email (si Resend configuré)
        if (resend) {
          // Lire l'email du user
          const profRes = await (supa as unknown as {
            from: (t: string) => {
              select: (s: string) => {
                eq: (c: string, v: string) => { single: () => Promise<{ data: UserRow | null }> };
              };
            };
          })
            .from('profiles')
            .select('id, email, full_name, total_gains')
            .eq('id', userId)
            .single();

          const email = profRes.data?.email;
          const name = profRes.data?.full_name ?? '';

          if (email) {
            try {
              await resend.emails.send({
                from: 'MIDAS <noreply@purama.dev>',
                to: [email],
                subject: p.subject,
                html: `
                  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#0A0A0F;color:#fff;padding:32px;border-radius:16px">
                    <h2 style="color:#FFD700;margin:0 0 16px">${p.subject}</h2>
                    <p style="color:#ccc">${name ? `Salut ${name},` : 'Salut,'}</p>
                    <p>${p.body_intro}</p>
                    <p style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:12px;color:#fbbf24">
                      ${p.body_action}
                    </p>
                    <p style="font-size:14px;color:#888">
                      Tout savoir : <a href="https://midas.purama.dev/fiscal" style="color:#FFD700">midas.purama.dev/fiscal</a>
                    </p>
                  </div>
                `,
              });
              emailsSent += 1;
            } catch {
              /* silent */
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      users_checked: userGains.size,
      notifications_sent: notifsSent,
      emails_sent: emailsSent,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// =============================================================================
// MIDAS — CRON Fiscal Annual PDF (V7 §25)
// Génère le 1er janvier le récapitulatif PDF des gains plateforme de
// l'année précédente pour chaque user avec total_annuel > 0€.
// Stocke pdf_url dans midas.annual_summaries, envoie email Resend.
// Idempotent via UNIQUE(user_id, year).
// Schedule : "0 9 1 1 *" (1er janvier à 9h UTC)
// =============================================================================

import { NextResponse } from 'next/server'
import { getServiceClient, getResend, classifySource, type WalletTx, type ProfileRow, type Totals } from './fiscal-helpers'
import { buildAnnualPdfBase64 } from './fiscal-pdf-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  // Auth Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supa = getServiceClient();
    if (!supa) {
      return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
    }
    const resend = getResend();

    // Permettre le forçage d'une année (pour test manuel / catch-up)
    const url = new URL(request.url);
    const forcedYear = Number(url.searchParams.get('year'));
    const year =
      Number.isFinite(forcedYear) && forcedYear > 2020 && forcedYear < 2100
        ? forcedYear
        : new Date().getUTCFullYear() - 1;

    const yearStart = new Date(Date.UTC(year, 0, 1)).toISOString();
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

    // Fenêtre d'exécution : uniquement du 1er janvier au 10 janvier pour la prod,
    // sauf override via ?force=1 (test manuel)
    const forceRun = url.searchParams.get('force') === '1';
    const today = new Date();
    const isJanuaryWindow = today.getUTCMonth() === 0 && today.getUTCDate() <= 10;
    if (!forceRun && !isJanuaryWindow) {
      return NextResponse.json({
        ok: true,
        skipped: 'outside_january_window',
        today: today.toISOString(),
      });
    }

    // Aggrégation wallet_transactions credits (hors withdrawal)
    const txRes = await (supa as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            gte: (c: string, v: string) => {
              lt: (c: string, v: string) => Promise<{ data: WalletTx[] | null }>;
            };
          };
        };
      };
    })
      .from('wallet_transactions')
      .select('user_id, amount, source, type')
      .eq('type', 'credit')
      .gte('created_at', yearStart)
      .lt('created_at', yearEnd);

    const txs = txRes.data ?? [];

    // Regroupe par user
    const perUser = new Map<string, Totals>();
    for (const t of txs) {
      if (!t.user_id) continue;
      const kind = classifySource(t.source);
      const amount = Number(t.amount) || 0;
      if (amount <= 0) continue;
      const cur = perUser.get(t.user_id) ?? {
        primes: 0,
        parrainage: 0,
        nature: 0,
        marketplace: 0,
        missions: 0,
        other: 0,
        annuel: 0,
      };
      cur[kind] += amount;
      cur.annuel += amount;
      perUser.set(t.user_id, cur);
    }

    let generated = 0;
    let skipped = 0;
    let emailsSent = 0;
    const errors: Array<{ user: string; error: string }> = [];

    for (const [userId, totals] of perUser.entries()) {
      if (totals.annuel <= 0) {
        skipped += 1;
        continue;
      }

      // Idempotent : skip si déjà présent
      const exists = await (supa as unknown as {
        from: (t: string) => {
          select: (s: string, opts?: { count: string; head: boolean }) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: number) => Promise<{ count: number | null }>;
            };
          };
        };
      })
        .from('annual_summaries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('year', year);

      if ((exists.count ?? 0) > 0) {
        skipped += 1;
        continue;
      }

      // Fetch profile
      const profRes = await (supa as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              maybeSingle: () => Promise<{ data: ProfileRow | null }>;
            };
          };
        };
      })
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', userId)
        .maybeSingle();

      const profile = profRes.data;
      if (!profile?.email) {
        skipped += 1;
        continue;
      }

      // PDF
      let pdfDataUri = '';
      try {
        pdfDataUri = await buildAnnualPdfBase64({
          fullName: profile.full_name ?? '',
          email: profile.email,
          year,
          totals,
        });
      } catch (e) {
        errors.push({ user: userId, error: e instanceof Error ? e.message : 'pdf_failed' });
        continue;
      }

      // Insert summary (pdf_url = dataURI — un bucket Supabase Storage pourra remplacer
      // plus tard, mais pour un doc fiscal personnel on privilégie l'envoi email immédiat)
      const insertRes = await (supa as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
        };
      })
        .from('annual_summaries')
        .insert({
          user_id: userId,
          year,
          total_primes: totals.primes,
          total_parrainage: totals.parrainage,
          total_nature: totals.nature,
          total_marketplace: totals.marketplace,
          total_missions: totals.missions,
          total_other: totals.other,
          total_annuel: totals.annuel,
          pdf_url: null, // pas de bucket pour l'instant — email uniquement
        });

      if (insertRes.error) {
        errors.push({ user: userId, error: insertRes.error.message });
        continue;
      }
      generated += 1;

      // Email Resend avec PDF attaché
      if (resend && pdfDataUri) {
        try {
          // extract base64 from "data:application/pdf;filename=...;base64,..."
          const b64 = pdfDataUri.split(',').pop() ?? '';
          const name = profile.full_name ?? '';
          await resend.emails.send({
            from: 'MIDAS <noreply@purama.dev>',
            to: [profile.email],
            subject: `📋 Ton récapitulatif fiscal MIDAS ${year}`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#0A0A0F;color:#fff;padding:32px;border-radius:16px">
                <h2 style="color:#FFD700;margin:0 0 16px">Récapitulatif fiscal ${year}</h2>
                <p style="color:#ccc">${name ? `Salut ${name},` : 'Salut,'}</p>
                <p>Ton total de gains plateforme pour l'année ${year} :</p>
                <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:16px;margin:16px 0">
                  <div style="font-size:28px;font-weight:700;color:#FFD700">${totals.annuel.toFixed(2)} €</div>
                  <div style="font-size:12px;color:#aaa;margin-top:4px">Primes, parrainage, missions, récompenses (hors P&amp;L trading)</div>
                </div>
                <p>Le PDF détaillé est en pièce jointe. Tu retrouves toutes les infos de déclaration sur <a href="https://midas.purama.dev/fiscal" style="color:#FFD700">midas.purama.dev/fiscal</a>.</p>
                <p style="font-size:13px;color:#888;margin-top:24px">
                  ${totals.annuel >= 3000
                    ? 'Ton total dépasse 3 000 € : tu dois déclarer (case 5NG sur impots.gouv.fr). Nous transmettons par ailleurs ces montants via DAS2.'
                    : 'Ton total reste sous le seuil de 3 000 €, donc pas d\'obligation déclarative automatique cette année.'}
                </p>
                <p style="font-size:12px;color:#666">MIDAS — SASU PURAMA — 8 Rue de la Chapelle, 25560 Frasne</p>
              </div>
            `,
            attachments: [
              {
                filename: `midas-fiscal-${year}.pdf`,
                content: b64,
              },
            ],
          });
          emailsSent += 1;
        } catch (e) {
          errors.push({
            user: userId,
            error: `email_failed:${e instanceof Error ? e.message : 'unknown'}`,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      year,
      users_checked: perUser.size,
      summaries_generated: generated,
      skipped,
      emails_sent: emailsSent,
      errors: errors.slice(0, 20),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

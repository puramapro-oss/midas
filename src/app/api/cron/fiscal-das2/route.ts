// =============================================================================
// MIDAS — CRON Fiscal DAS2 (V7 §25)
// Génère le 31 janvier un export DAS2-ready (CSV) de tous les users avec
// total_annuel ≥ 3 000 € sur l'année précédente.
// Source = midas.annual_summaries (doit être peuplé par fiscal-annual-pdf).
// Marque das2_sent=true + das2_sent_at=now() (idempotent).
// Envoie email admin avec CSV attaché — upload manuel Pennylane ensuite.
// Schedule : "0 10 31 1 *" (31 janvier à 10h UTC)
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DAS2_THRESHOLD_EUR = 3000;
const ADMIN_EMAIL = 'matiss.frasne@gmail.com';

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

interface SummaryRow {
  id: string;
  user_id: string;
  year: number;
  total_primes: number;
  total_parrainage: number;
  total_nature: number;
  total_marketplace: number;
  total_missions: number;
  total_other: number;
  total_annuel: number;
  das2_sent: boolean;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  // champs KYC optionnels — s'ils existent, ils alimenteront le CSV Pennylane
  metadata?: Record<string, unknown> | null;
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildDas2Csv(rows: Array<{
  nom: string;
  prenom: string;
  email: string;
  total_annuel: number;
  total_primes: number;
  total_parrainage: number;
  total_missions: number;
  total_other: number;
  year: number;
  user_id: string;
}>): string {
  const header = [
    'user_id',
    'nom',
    'prenom',
    'email',
    'year',
    'total_primes_eur',
    'total_parrainage_eur',
    'total_missions_eur',
    'total_other_eur',
    'total_annuel_eur',
    'code_nature', // DAS2 nature du revenu
    'code_beneficiaire', // personne physique
  ].join(',');

  const lines = rows.map((r) =>
    [
      r.user_id,
      csvEscape(r.nom),
      csvEscape(r.prenom),
      csvEscape(r.email),
      r.year,
      r.total_primes.toFixed(2),
      r.total_parrainage.toFixed(2),
      r.total_missions.toFixed(2),
      r.total_other.toFixed(2),
      r.total_annuel.toFixed(2),
      'CN', // "Commissions et courtages" (code Pennylane/DAS2)
      'PP', // personne physique
    ].join(',')
  );

  return [header, ...lines].join('\n');
}

function splitName(full: string | null): { nom: string; prenom: string } {
  if (!full) return { nom: '', prenom: '' };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { nom: '', prenom: '' };
  if (parts.length === 1) return { nom: parts[0], prenom: '' };
  // Convention : prénom puis nom — on prend le dernier comme nom, le reste comme prénom
  const nom = parts[parts.length - 1];
  const prenom = parts.slice(0, -1).join(' ');
  return { nom, prenom };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supa = getServiceClient();
    if (!supa) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const url = new URL(request.url);
    const forcedYear = Number(url.searchParams.get('year'));
    const year =
      Number.isFinite(forcedYear) && forcedYear > 2020 && forcedYear < 2100
        ? forcedYear
        : new Date().getUTCFullYear() - 1;

    // Fenêtre d'exécution : du 20 janvier au 10 février (prod). Override via ?force=1.
    const forceRun = url.searchParams.get('force') === '1';
    const today = new Date();
    const month = today.getUTCMonth();
    const day = today.getUTCDate();
    const inWindow = (month === 0 && day >= 20) || (month === 1 && day <= 10);
    if (!forceRun && !inWindow) {
      return NextResponse.json({
        ok: true,
        skipped: 'outside_das2_window',
        today: today.toISOString(),
      });
    }

    // Fetch summaries non déclarés >= 3000€ pour l'année cible
    const sumRes = await (supa as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: number) => {
            eq: (c: string, v: boolean) => {
              gte: (c: string, v: number) => Promise<{ data: SummaryRow[] | null }>;
            };
          };
        };
      };
    })
      .from('annual_summaries')
      .select(
        'id, user_id, year, total_primes, total_parrainage, total_nature, total_marketplace, total_missions, total_other, total_annuel, das2_sent',
      )
      .eq('year', year)
      .eq('das2_sent', false)
      .gte('total_annuel', DAS2_THRESHOLD_EUR);

    const summaries = sumRes.data ?? [];

    if (summaries.length === 0) {
      return NextResponse.json({
        ok: true,
        year,
        eligible_users: 0,
        message: 'No users above DAS2 threshold this year',
      });
    }

    // Fetch profiles
    const userIds = summaries.map((s) => s.user_id);
    const profRes = await (supa as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          in: (c: string, v: string[]) => Promise<{ data: ProfileRow[] | null }>;
        };
      };
    })
      .from('profiles')
      .select('id, email, full_name, metadata')
      .in('id', userIds);

    const profilesById = new Map<string, ProfileRow>();
    for (const p of profRes.data ?? []) profilesById.set(p.id, p);

    // Build CSV rows
    const rows = summaries.map((s) => {
      const p = profilesById.get(s.user_id);
      const { nom, prenom } = splitName(p?.full_name ?? null);
      return {
        user_id: s.user_id,
        nom,
        prenom,
        email: p?.email ?? '',
        year: s.year,
        total_primes: Number(s.total_primes),
        total_parrainage: Number(s.total_parrainage),
        total_missions: Number(s.total_missions),
        total_other:
          Number(s.total_nature) + Number(s.total_marketplace) + Number(s.total_other),
        total_annuel: Number(s.total_annuel),
      };
    });

    const csv = buildDas2Csv(rows);
    const csvBase64 = Buffer.from(csv, 'utf-8').toString('base64');

    // Mark as sent (idempotent)
    const nowIso = new Date().toISOString();
    const ids = summaries.map((s) => s.id);
    await (supa as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }>;
        };
      };
    })
      .from('annual_summaries')
      .update({ das2_sent: true, das2_sent_at: nowIso })
      .in('id', ids);

    // Send admin email with CSV attached
    const resend = getResend();
    if (resend) {
      try {
        const totalCA = rows.reduce((sum, r) => sum + r.total_annuel, 0);
        await resend.emails.send({
          from: 'MIDAS Admin <noreply@purama.dev>',
          to: [ADMIN_EMAIL],
          subject: `[DAS2 ${year}] ${rows.length} bénéficiaires — ${totalCA.toFixed(2)}€ à déclarer`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px">
              <h2>DAS2 ${year} — Export Pennylane</h2>
              <p><strong>${rows.length}</strong> bénéficiaires à déclarer (seuil 3 000 €).</p>
              <p>Total CA : <strong>${totalCA.toFixed(2)} €</strong></p>
              <p>CSV en pièce jointe, upload direct Pennylane → DAS2 → Import CSV.</p>
              <p>Les lignes ont été marquées <code>das2_sent=true</code> dans <code>midas.annual_summaries</code>.</p>
              <hr>
              <p style="font-size:12px;color:#666">SASU PURAMA — Déclaration à faire avant le 31 janvier ${year + 1} sur impots.gouv.fr</p>
            </div>
          `,
          attachments: [
            {
              filename: `das2-midas-${year}.csv`,
              content: csvBase64,
            },
          ],
        });
      } catch {
        /* silent */
      }
    }

    return NextResponse.json({
      ok: true,
      year,
      eligible_users: rows.length,
      total_declared_eur: rows.reduce((sum, r) => sum + r.total_annuel, 0),
      csv_rows: rows.length,
      admin_email_sent: !!resend,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

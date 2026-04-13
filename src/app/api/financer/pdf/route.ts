import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const bodySchema = z.object({
  aide_id: z.string().uuid(),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'midas' } }
  );
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'aide_id requis' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch aide
    const { data: aide } = await supabase
      .from('aides')
      .select('*')
      .eq('id', parsed.data.aide_id)
      .single();

    if (!aide) {
      return NextResponse.json({ error: 'Aide introuvable' }, { status: 404 });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, metadata')
      .eq('id', user.id)
      .single();

    // Generate PDF using jsPDF (server-side)
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(245, 158, 11); // MIDAS gold
    doc.text('MIDAS', 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Dossier de financement', 20, 32);
    doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 20, 38);

    // Line separator
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Identity section
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Identite du demandeur', 20, 55);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Nom : ${profile?.full_name ?? 'Non renseigne'}`, 20, 63);
    doc.text(`Email : ${profile?.email ?? user.email ?? ''}`, 20, 70);

    const meta = profile?.metadata as Record<string, unknown> | null;
    const fp = meta?.financement_profil as Record<string, unknown> | null;
    if (fp) {
      doc.text(`Profil : ${fp.type_profil ?? ''}`, 20, 77);
      doc.text(`Situation : ${fp.situation ?? ''}`, 20, 84);
      doc.text(`Departement : ${fp.departement ?? ''}`, 20, 91);
      doc.text(`Handicap : ${fp.handicap ? 'Oui' : 'Non'}`, 20, 98);
    }

    // Aide details
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Aide demandee', 20, 115);
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`${aide.nom}`, 20, 124);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Type : ${aide.type_aide ?? ''}`, 20, 132);
    doc.text(`Montant maximum : ${aide.montant_max ? aide.montant_max.toLocaleString('fr-FR') + ' EUR' : 'Variable'}`, 20, 139);

    if (aide.description) {
      const lines = doc.splitTextToSize(aide.description as string, 160);
      doc.text(lines, 20, 148);
    }

    // Application info
    const yPos = 175;
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Application concernee', 20, yPos);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text('MIDAS — Plateforme de trading IA automatique', 20, yPos + 9);
    doc.text('Editeur : SASU PURAMA — 8 Rue de la Chapelle, 25560 Frasne', 20, yPos + 16);
    doc.text('TVA non applicable, art. 293B du CGI', 20, yPos + 23);

    if (aide.url_officielle) {
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text('Lien officiel', 20, yPos + 40);
      doc.setFontSize(10);
      doc.setTextColor(0, 100, 200);
      doc.text(aide.url_officielle as string, 20, yPos + 49);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Document genere automatiquement par MIDAS (midas.purama.dev) — Ne constitue pas un engagement de financement.', 20, 280);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dossier-${aide.nom?.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

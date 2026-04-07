// =============================================================================
// MIDAS — Cerfa 2086 PDF Generator
// Génère un PDF récapitulatif basé sur le rapport fiscal calculé.
// PAS le formulaire Cerfa officiel (qui requiert le template scanné), mais
// un récapitulatif lisible reprenant les lignes 211→215 prêtes à recopier.
// =============================================================================

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { FrTaxReport } from './fr-2086';

export async function generateTaxPdf(report: FrTaxReport, userEmail: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); // A4
  const width = PAGE_WIDTH;
  const height = PAGE_HEIGHT;
  const margin = 50;
  let y = height - margin;

  const gold = rgb(0.96, 0.62, 0.04);
  const dark = rgb(0.07, 0.07, 0.1);
  const grey = rgb(0.4, 0.4, 0.45);
  const black = rgb(0, 0, 0);
  const lightBg = rgb(0.96, 0.96, 0.97);

  // --- Header ---
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: dark,
  });
  page.drawText('MIDAS', {
    x: margin,
    y: height - 45,
    size: 24,
    font: fontBold,
    color: gold,
  });
  page.drawText('Rapport Fiscal France — Cerfa 2086', {
    x: margin,
    y: height - 65,
    size: 11,
    font,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Annee ${report.year}`, {
    x: width - margin - 80,
    y: height - 45,
    size: 14,
    font: fontBold,
    color: gold,
  });

  y = height - 110;

  // --- Meta ---
  page.drawText(`Genere le : ${new Date(report.generated_at).toLocaleDateString('fr-FR')}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: grey,
  });
  page.drawText(`Compte : ${userEmail}`, {
    x: margin,
    y: y - 12,
    size: 9,
    font,
    color: grey,
  });
  y -= 35;

  // --- Synthese ---
  page.drawText('SYNTHESE', { x: margin, y, size: 12, font: fontBold, color: dark });
  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: gold,
  });
  y -= 18;

  const drawRow = (label: string, value: string, highlight = false) => {
    if (highlight) {
      page.drawRectangle({
        x: margin - 5,
        y: y - 4,
        width: width - 2 * margin + 10,
        height: 18,
        color: lightBg,
      });
    }
    page.drawText(label, { x: margin, y, size: 10, font, color: dark });
    page.drawText(value, {
      x: width - margin - font.widthOfTextAtSize(value, 10),
      y,
      size: 10,
      font: highlight ? fontBold : font,
      color: highlight ? gold : black,
    });
    y -= 18;
  };

  const eur = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  drawRow('Total trades clos', String(report.closed_trades));
  drawRow('Plus-values brutes', eur(report.total_gains_eur));
  drawRow('Moins-values', eur(report.total_losses_eur));
  drawRow('Net imposable', eur(report.net_taxable_eur), true);
  drawRow('Impot du (PFU 30%)', eur(report.flat_tax_due_eur), true);
  drawRow('  dont impot sur le revenu (12.8%)', eur(report.income_tax_eur));
  drawRow('  dont prelevements sociaux (17.2%)', eur(report.social_charges_eur));
  y -= 10;

  // --- Cerfa 2086 lines ---
  page.drawText('CERFA 2086 — LIGNES A REPORTER', { x: margin, y, size: 12, font: fontBold, color: dark });
  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: gold,
  });
  y -= 18;

  drawRow('Ligne 211 — Prix de cession total', eur(report.cerfa_2086.ligne_211_prix_cession));
  drawRow("Ligne 212 — Prix d'acquisition total", eur(report.cerfa_2086.ligne_212_prix_acquisition));
  drawRow('Ligne 213 — Plus-value brute', eur(report.cerfa_2086.ligne_213_plus_value_brute));
  drawRow('Ligne 214 — Moins-value compensable', eur(report.cerfa_2086.ligne_214_moins_value_compensable));
  drawRow('Ligne 215 — Plus-value imposable', eur(report.cerfa_2086.ligne_215_plus_value_imposable), true);
  y -= 10;

  // --- Monthly breakdown ---
  if (report.monthly_breakdown.length > 0) {
    if (y < 200) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - margin;
    }
    page.drawText('REPARTITION MENSUELLE', { x: margin, y, size: 12, font: fontBold, color: dark });
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: gold,
    });
    y -= 18;

    page.drawText('Mois', { x: margin, y, size: 9, font: fontBold, color: grey });
    page.drawText('Gains', { x: margin + 150, y, size: 9, font: fontBold, color: grey });
    page.drawText('Pertes', { x: margin + 250, y, size: 9, font: fontBold, color: grey });
    page.drawText('Net', { x: margin + 350, y, size: 9, font: fontBold, color: grey });
    y -= 14;

    for (const m of report.monthly_breakdown) {
      if (y < 80) {
        page = pdf.addPage([595.28, 841.89]);
        y = height - margin;
      }
      page.drawText(m.month, { x: margin, y, size: 9, font, color: dark });
      page.drawText(eur(m.gains), { x: margin + 150, y, size: 9, font, color: dark });
      page.drawText(eur(m.losses), { x: margin + 250, y, size: 9, font, color: dark });
      page.drawText(eur(m.net), { x: margin + 350, y, size: 9, font: fontBold, color: dark });
      y -= 14;
    }
    y -= 10;
  }

  // --- By pair ---
  if (report.by_pair.length > 0) {
    if (y < 150) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - margin;
    }
    page.drawText('REPARTITION PAR PAIRE', { x: margin, y, size: 12, font: fontBold, color: dark });
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: gold,
    });
    y -= 18;

    for (const p of report.by_pair) {
      if (y < 80) {
        page = pdf.addPage([595.28, 841.89]);
        y = height - margin;
      }
      page.drawText(p.pair, { x: margin, y, size: 9, font, color: dark });
      page.drawText(`${p.trades} trades`, { x: margin + 150, y, size: 9, font, color: grey });
      page.drawText(eur(p.net_pnl), {
        x: width - margin - font.widthOfTextAtSize(eur(p.net_pnl), 9),
        y,
        size: 9,
        font: fontBold,
        color: dark,
      });
      y -= 14;
    }
  }

  // --- Footer ---
  const footer = `Document informatif genere par MIDAS. A reporter sur la declaration 2042 case 3AN. Conserver 6 ans. Taux USD/EUR applique : 0.92`;
  page.drawText(footer, {
    x: margin,
    y: 30,
    size: 7,
    font,
    color: grey,
    maxWidth: width - 2 * margin,
  });

  return await pdf.save();
}

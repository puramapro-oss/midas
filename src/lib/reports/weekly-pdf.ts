// =============================================================================
// MIDAS — Weekly Report PDF
// Brief MIDAS-BRIEF-ULTIMATE.md : "Rapport PDF hebdo" (plan Ultra)
// Génère un PDF récapitulant : trades de la semaine, win rate, P&L, top signaux,
// régime marché, recommandations IA. Envoyé par Resend.
// =============================================================================

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface WeeklyReportData {
  user_email: string;
  user_name: string;
  period_start: string;
  period_end: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  total_pnl_eur: number;
  best_trade: { pair: string; pnl: number } | null;
  worst_trade: { pair: string; pnl: number } | null;
  top_pairs: Array<{ pair: string; trades: number; pnl: number }>;
  market_regime: string;
  fear_greed_avg: number;
  ai_summary: string;
}

export async function generateWeeklyReportPdf(data: WeeklyReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const margin = 50;
  let y = PAGE_HEIGHT - margin;

  const gold = rgb(0.96, 0.62, 0.04);
  const dark = rgb(0.07, 0.07, 0.1);
  const grey = rgb(0.4, 0.4, 0.45);
  const black = rgb(0, 0, 0);
  const green = rgb(0.13, 0.7, 0.4);
  const red = rgb(0.85, 0.2, 0.2);

  // --- Header bar ---
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 80,
    width: PAGE_WIDTH,
    height: 80,
    color: dark,
  });
  page.drawText('MIDAS', { x: margin, y: PAGE_HEIGHT - 40, size: 26, font: fontBold, color: gold });
  page.drawText('Rapport hebdomadaire', {
    x: margin,
    y: PAGE_HEIGHT - 60,
    size: 12,
    font,
    color: rgb(1, 1, 1),
  });
  page.drawText(`${data.period_start} → ${data.period_end}`, {
    x: PAGE_WIDTH - margin - 200,
    y: PAGE_HEIGHT - 50,
    size: 10,
    font,
    color: rgb(0.8, 0.8, 0.8),
  });

  y = PAGE_HEIGHT - 110;

  // --- User ---
  page.drawText(`Pour : ${data.user_name}`, { x: margin, y, size: 12, font: fontBold, color: black });
  y -= 16;
  page.drawText(data.user_email, { x: margin, y, size: 10, font, color: grey });
  y -= 30;

  // --- KPIs ---
  page.drawText('Performance', { x: margin, y, size: 14, font: fontBold, color: dark });
  y -= 20;
  const kpis: Array<[string, string, ReturnType<typeof rgb>]> = [
    ['Trades exécutés', String(data.total_trades), black],
    ['Trades gagnants', String(data.winning_trades), green],
    ['Trades perdants', String(data.losing_trades), red],
    ['Win rate', `${data.win_rate_pct.toFixed(1)}%`, data.win_rate_pct >= 50 ? green : red],
    ['P&L total', `${data.total_pnl_eur >= 0 ? '+' : ''}${data.total_pnl_eur.toFixed(2)} €`, data.total_pnl_eur >= 0 ? green : red],
  ];
  for (const [label, value, color] of kpis) {
    page.drawText(label, { x: margin + 10, y, size: 11, font, color: grey });
    page.drawText(value, { x: margin + 200, y, size: 11, font: fontBold, color });
    y -= 16;
  }
  y -= 14;

  // --- Best / Worst ---
  if (data.best_trade) {
    page.drawText(`Meilleur trade : ${data.best_trade.pair} (+${data.best_trade.pnl.toFixed(2)} €)`, {
      x: margin,
      y,
      size: 11,
      font,
      color: green,
    });
    y -= 16;
  }
  if (data.worst_trade) {
    page.drawText(`Pire trade : ${data.worst_trade.pair} (${data.worst_trade.pnl.toFixed(2)} €)`, {
      x: margin,
      y,
      size: 11,
      font,
      color: red,
    });
    y -= 24;
  }

  // --- Top pairs ---
  if (data.top_pairs.length > 0) {
    page.drawText('Top paires', { x: margin, y, size: 14, font: fontBold, color: dark });
    y -= 18;
    for (const p of data.top_pairs.slice(0, 5)) {
      page.drawText(`${p.pair} — ${p.trades} trades`, { x: margin + 10, y, size: 10, font, color: black });
      page.drawText(
        `${p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)} €`,
        { x: margin + 250, y, size: 10, font: fontBold, color: p.pnl >= 0 ? green : red },
      );
      y -= 14;
    }
    y -= 14;
  }

  // --- Market context ---
  page.drawText('Contexte marché', { x: margin, y, size: 14, font: fontBold, color: dark });
  y -= 18;
  page.drawText(`Régime : ${data.market_regime}`, { x: margin + 10, y, size: 11, font, color: black });
  y -= 14;
  page.drawText(`Fear & Greed moyen : ${data.fear_greed_avg.toFixed(0)}/100`, {
    x: margin + 10,
    y,
    size: 11,
    font,
    color: black,
  });
  y -= 24;

  // --- AI summary ---
  page.drawText('Synthèse IA', { x: margin, y, size: 14, font: fontBold, color: dark });
  y -= 18;
  // Wrap simple à 80 caractères
  const lines = wrapText(data.ai_summary, 90);
  for (const line of lines.slice(0, 12)) {
    page.drawText(line, { x: margin + 10, y, size: 10, font, color: black });
    y -= 13;
  }

  // --- Footer ---
  page.drawText('MIDAS — L\'IA de trading la plus puissante. midas.purama.dev', {
    x: margin,
    y: 30,
    size: 8,
    font,
    color: grey,
  });

  return await pdf.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? `${current} ${w}` : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

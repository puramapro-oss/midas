import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = 'MIDAS <noreply@purama.dev>';

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    return { success: false, error: message };
  }
}

interface TradeAlertData {
  pair: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  exchange: string;
  timestamp: string;
}

export async function sendTradeAlert(
  email: string,
  trade: TradeAlertData,
): Promise<EmailResult> {
  const sideLabel = trade.side === 'buy' ? 'ACHAT' : 'VENTE';
  const sideColor = trade.side === 'buy' ? '#10B981' : '#EF4444';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #F8FAFC; padding: 32px; border-radius: 16px;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">MIDAS</h1>
      <h2 style="font-size: 18px; color: ${sideColor}; margin-bottom: 24px;">${sideLabel} execute</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Paire</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${trade.pair}</td></tr>
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Prix</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">$${trade.price.toLocaleString('fr-FR')}</td></tr>
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Quantite</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${trade.quantity}</td></tr>
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Exchange</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${trade.exchange}</td></tr>
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Date</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${new Date(trade.timestamp).toLocaleString('fr-FR')}</td></tr>
      </table>
      <p style="margin-top: 24px; font-size: 12px; color: rgba(255,255,255,0.4);">MIDAS Trading AI - purama.dev</p>
    </div>
  `;

  return sendEmail(email, `MIDAS - ${sideLabel} ${trade.pair} a $${trade.price}`, html);
}

interface DailyReportData {
  date: string;
  totalPnl: number;
  totalPnlPercent: number;
  tradesExecuted: number;
  winRate: number;
  portfolioValue: number;
  topPerformer: { pair: string; pnl: number } | null;
}

export async function sendDailyReport(
  email: string,
  report: DailyReportData,
): Promise<EmailResult> {
  const pnlColor = report.totalPnl >= 0 ? '#10B981' : '#EF4444';
  const pnlSign = report.totalPnl >= 0 ? '+' : '';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #F8FAFC; padding: 32px; border-radius: 16px;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">MIDAS</h1>
      <h2 style="font-size: 18px; margin-bottom: 24px;">Rapport du ${report.date}</h2>
      <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
        <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">P&L du jour</p>
        <p style="font-size: 32px; font-weight: 700; color: ${pnlColor}; margin: 0;">${pnlSign}$${Math.abs(report.totalPnl).toLocaleString('fr-FR')} (${pnlSign}${report.totalPnlPercent.toFixed(2)}%)</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Trades executes</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${report.tradesExecuted}</td></tr>
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Win rate</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${report.winRate.toFixed(1)}%</td></tr>
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Valeur portefeuille</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">$${report.portfolioValue.toLocaleString('fr-FR')}</td></tr>
        ${report.topPerformer ? `<tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Meilleur trade</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${report.topPerformer.pair} (+$${report.topPerformer.pnl.toLocaleString('fr-FR')})</td></tr>` : ''}
      </table>
      <p style="margin-top: 24px; font-size: 12px; color: rgba(255,255,255,0.4);">MIDAS Trading AI - purama.dev</p>
    </div>
  `;

  return sendEmail(email, `MIDAS - Rapport ${report.date} | ${pnlSign}$${Math.abs(report.totalPnl).toFixed(2)}`, html);
}

interface ShieldAlertData {
  type: 'anomaly' | 'key_blocked' | 'key_rotated';
  provider: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
}

export async function sendShieldAlert(
  email: string,
  alert: ShieldAlertData,
): Promise<EmailResult> {
  const severityColors: Record<string, string> = {
    low: '#3B82F6',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  };
  const color = severityColors[alert.severity] ?? '#F59E0B';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #F8FAFC; padding: 32px; border-radius: 16px;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">MIDAS - API Shield</h1>
      <div style="background: ${color}20; border-left: 4px solid ${color}; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <p style="font-size: 16px; font-weight: 600; color: ${color}; margin: 0 0 4px;">${alert.type.toUpperCase()} - ${alert.severity.toUpperCase()}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.8);">${alert.description}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Provider</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${alert.provider}</td></tr>
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Date</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${new Date(alert.timestamp).toLocaleString('fr-FR')}</td></tr>
      </table>
      <p style="margin-top: 24px; font-size: 12px; color: rgba(255,255,255,0.4);">MIDAS Trading AI - API Shield - purama.dev</p>
    </div>
  `;

  return sendEmail(email, `[${alert.severity.toUpperCase()}] MIDAS Shield - ${alert.type} ${alert.provider}`, html);
}

// =============================================================================
// MIDAS — Tax Report FR (Cerfa 2086)
// Calcule plus-values / moins-values crypto pour la déclaration française.
// Méthode : flat tax 30% (PFU) sur le gain net.
// =============================================================================

export interface TaxTradeRow {
  pair: string;
  side: string;
  entry_price: number | null;
  exit_price: number | null;
  amount: number | null;
  pnl: number | null;
  fee?: number | null;
  status: string | null;
  created_at: string;
  closed_at?: string | null;
}

export interface FrTaxReport {
  year: number;
  total_trades: number;
  closed_trades: number;
  total_gains_eur: number;
  total_losses_eur: number;
  net_taxable_eur: number;
  flat_tax_due_eur: number; // PFU 30%
  social_charges_eur: number; // 17.2% inclus dans PFU
  income_tax_eur: number; // 12.8% inclus dans PFU
  monthly_breakdown: { month: string; gains: number; losses: number; net: number }[];
  by_pair: { pair: string; trades: number; net_pnl: number }[];
  // Cerfa 2086 lignes principales
  cerfa_2086: {
    ligne_211_prix_cession: number;
    ligne_212_prix_acquisition: number;
    ligne_213_plus_value_brute: number;
    ligne_214_moins_value_compensable: number;
    ligne_215_plus_value_imposable: number;
  };
  generated_at: string;
}

const PFU_TOTAL_RATE = 0.30;
const PFU_INCOME_RATE = 0.128;
const PFU_SOCIAL_RATE = 0.172;
const USD_EUR_RATE = 0.92; // Approximation, idéalement fetch live

export function computeFrTaxReport(year: number, trades: TaxTradeRow[]): FrTaxReport {
  // Filtre : trades clos sur l'année cible
  const closedThisYear = trades.filter((t) => {
    if (t.status !== 'closed') return false;
    const closeDate = t.closed_at ?? t.created_at;
    return new Date(closeDate).getFullYear() === year;
  });

  let totalGainsUsd = 0;
  let totalLossesUsd = 0;
  let totalCessionUsd = 0;
  let totalAcquisitionUsd = 0;

  const monthlyMap = new Map<string, { gains: number; losses: number }>();
  const pairMap = new Map<string, { trades: number; net: number }>();

  for (const t of closedThisYear) {
    const pnl = Number(t.pnl ?? 0);
    const qty = Number(t.amount ?? 0);
    const entry = Number(t.entry_price ?? 0);
    const exit = Number(t.exit_price ?? 0);

    totalCessionUsd += qty * exit;
    totalAcquisitionUsd += qty * entry;

    if (pnl > 0) totalGainsUsd += pnl;
    else if (pnl < 0) totalLossesUsd += Math.abs(pnl);

    // Monthly
    const closeDate = new Date(t.closed_at ?? t.created_at);
    const monthKey = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, '0')}`;
    const m = monthlyMap.get(monthKey) ?? { gains: 0, losses: 0 };
    if (pnl > 0) m.gains += pnl;
    else m.losses += Math.abs(pnl);
    monthlyMap.set(monthKey, m);

    // By pair
    const p = pairMap.get(t.pair) ?? { trades: 0, net: 0 };
    p.trades += 1;
    p.net += pnl;
    pairMap.set(t.pair, p);
  }

  const totalGainsEur = totalGainsUsd * USD_EUR_RATE;
  const totalLossesEur = totalLossesUsd * USD_EUR_RATE;
  const netTaxableEur = Math.max(0, totalGainsEur - totalLossesEur);

  return {
    year,
    total_trades: trades.length,
    closed_trades: closedThisYear.length,
    total_gains_eur: round2(totalGainsEur),
    total_losses_eur: round2(totalLossesEur),
    net_taxable_eur: round2(netTaxableEur),
    flat_tax_due_eur: round2(netTaxableEur * PFU_TOTAL_RATE),
    income_tax_eur: round2(netTaxableEur * PFU_INCOME_RATE),
    social_charges_eur: round2(netTaxableEur * PFU_SOCIAL_RATE),
    monthly_breakdown: Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        gains: round2(v.gains * USD_EUR_RATE),
        losses: round2(v.losses * USD_EUR_RATE),
        net: round2((v.gains - v.losses) * USD_EUR_RATE),
      })),
    by_pair: Array.from(pairMap.entries())
      .sort(([, a], [, b]) => b.net - a.net)
      .map(([pair, v]) => ({
        pair,
        trades: v.trades,
        net_pnl: round2(v.net * USD_EUR_RATE),
      })),
    cerfa_2086: {
      ligne_211_prix_cession: round2(totalCessionUsd * USD_EUR_RATE),
      ligne_212_prix_acquisition: round2(totalAcquisitionUsd * USD_EUR_RATE),
      ligne_213_plus_value_brute: round2(totalGainsEur),
      ligne_214_moins_value_compensable: round2(totalLossesEur),
      ligne_215_plus_value_imposable: round2(netTaxableEur),
    },
    generated_at: new Date().toISOString(),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

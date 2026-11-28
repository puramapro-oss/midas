// Educational anniversary projections in one currency. No account or ledger access.
const MAX_MINOR = 9_999_999_999;

export const destinations = ['bank', 'savings', 'investment', 'shopping'] as const;
export type Destination = (typeof destinations)[number];
export type Allocation = Record<Destination, number>;

export function readAmount(value: string, signed = false): number | null {
  const match = /^(-?)(\d{1,8})(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match || (match[1] && !signed)) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? '').padEnd(2, '0'));
  return match[1] && cents ? -cents : cents;
}

export interface FirstYear {
  realized: number;
  marketCosts: number;
  subscription: number;
  earlierLoss: number;
  openPnl: number;
  target: number;
}

function validAmount(value: number, signed = false) {
  return Number.isSafeInteger(value) && Math.abs(value) <= MAX_MINOR && (signed || value >= 0);
}

export interface AnnualProjection {
  realizedNet: number;
  annualEconomicGain: number;
  economicGain: number;
  previousHigh: number;
  highWaterMark: number;
  lossToRecover: number;
  feeBase: number;
  cumulativeFeeBase: number;
  fee: number;
  totalFees: number;
  annualNetGain: number;
  netGain: number;
}

/**
 * Chronological anniversaries of a single mandate, in integer cents. Realized P&L,
 * costs, fixed fees and any separate realized losses are flows for that year only.
 * Inputs exclude capital movements and performance-fee debits. Open P&L is the
 * closing snapshot. Target is the required gain for that year, already adjusted
 * for changes in capital; this example does not compute a benchmark from deposits.
 */
export function projectGainHistory(years: readonly FirstYear[]): AnnualProjection[] {
  const history: AnnualProjection[] = [];
  let cumulativeRealized = 0;
  let openingEconomicGain = 0;
  let previousHigh = 0;
  let cumulativeFeeBase = 0;
  let previousFees = 0;

  for (const { realized, marketCosts, subscription, earlierLoss, openPnl, target } of years) {
    if (!validAmount(realized, true) || !validAmount(openPnl, true) ||
        ![marketCosts, subscription, earlierLoss, target].every(value => validAmount(value))) {
      throw new RangeError('Montants hors limites.');
    }
    const realizedNet = realized - earlierLoss - marketCosts - subscription;
    cumulativeRealized += realizedNet;
    const economicGain = cumulativeRealized + Math.min(0, openPnl);
    const annualEconomicGain = economicGain - openingEconomicGain;
    const highWaterMark = Math.max(previousHigh, economicGain);
    // Every new economic high is retained, including gains exempted by the annual target.
    const newHighGain = highWaterMark - previousHigh;
    const outperformance = Math.max(0, annualEconomicGain - target);
    const feeBase = Math.min(newHighGain, outperformance);
    cumulativeFeeBase += feeBase;
    const hundredthsOfCent = cumulativeFeeBase * 3;
    const lossToRecover = highWaterMark - economicGain;
    const totalFees = Math.floor(hundredthsOfCent / 100);
    const fee = totalFees - previousFees;
    const netGain = economicGain - totalFees;
    if (![cumulativeRealized, economicGain, lossToRecover, hundredthsOfCent, netGain].every(Number.isSafeInteger)) {
      throw new RangeError('Historique hors des limites de précision en centimes.');
    }
    history.push({
      realizedNet, annualEconomicGain, economicGain, previousHigh, highWaterMark, lossToRecover,
      feeBase, cumulativeFeeBase, fee, totalFees, annualNetGain: annualEconomicGain - fee, netGain,
    });
    openingEconomicGain = economicGain;
    previousHigh = highWaterMark;
    previousFees = totalFees;
  }
  return history;
}

export function projectFirstYear(input: FirstYear) {
  const { realizedNet, economicGain, feeBase, fee, netGain, lossToRecover } = projectGainHistory([input])[0];
  return { realizedNet, economicGain, feeBase, fee, netGain, lossToRecover };
}

export function allocateGain(netGain: number, availableCash: number, percentages: Allocation) {
  if (!Number.isSafeInteger(netGain) || !validAmount(availableCash)) {
    throw new RangeError('Disponibilité inconnue ou invalide.');
  }
  let total = 0;
  const available = Math.min(Math.max(0, netGain), availableCash);
  const amounts: Allocation = { bank: 0, savings: 0, investment: 0, shopping: 0 };
  for (const destination of destinations) {
    const percent = percentages[destination];
    if (!Number.isSafeInteger(percent) || percent < 0 || percent > 100) {
      throw new RangeError('Chaque part doit être comprise entre 0 et 100 %.');
    }
    total += percent;
    amounts[destination] = Math.floor(available * percent / 100);
  }
  if (total > 100) throw new RangeError('Le total dépasse 100 %.');
  const unassigned = available - Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
  return { available, amounts, unassigned };
}

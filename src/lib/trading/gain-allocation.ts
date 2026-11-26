// An educational first-anniversary projection in one currency. No account or ledger access.
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

export function projectFirstYear(input: FirstYear) {
  const { realized, marketCosts, subscription, earlierLoss, openPnl, target } = input;
  if (!validAmount(realized, true) || !validAmount(openPnl, true) ||
      ![marketCosts, subscription, earlierLoss, target].every(value => validAmount(value))) {
    throw new RangeError('Montants hors limites.');
  }
  const realizedNet = realized - earlierLoss - marketCosts - subscription;
  const economicGain = realizedNet + Math.min(0, openPnl);
  const feeBase = Math.max(0, economicGain - target);
  const fee = Math.floor(feeBase * 3 / 100);
  const netGain = economicGain - fee;
  return { realizedNet, economicGain, feeBase, fee, netGain, lossToRecover: Math.max(0, -economicGain) };
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

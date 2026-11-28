export interface CostQuote {
  ask: string;
  bid: string;
  commission: string;
  fees: string;
  saleCharges?: { commission: string; fees: string };
}

const scale = BigInt(100_000_000);
const hundred = BigInt(100);
const percentBase = hundred * scale;

// Eight decimal places accommodate fractional units and unit prices. Keeping
// integer numerators until the final cent avoids rounding either one too early.
function decimal(value: string): bigint | null {
  const normalized = value.trim().replace(/^[.,]/, '0.');
  const match = /^(\d{1,12})(?:[.,](\d{1,8}))?$/.exec(normalized);
  if (!match) return null;
  return BigInt(match[1]) * scale + BigInt((match[2] ?? '').padEnd(8, '0'));
}

function cents(amount: bigint, divisor: bigint) {
  const magnitude = amount < 0 ? -amount : amount;
  const rounded = (magnitude * hundred + divisor / BigInt(2)) / divisor;
  return Number(amount < 0 ? -rounded : rounded);
}

export type OrderSide = 'buy' | 'sell';
const maxCents = 100_000_000_000_000;
const rangeError = 'Le montant dépasse la plage de calcul de ce simulateur (1 000 milliards dans la devise de calcul).';

export function previewOrderCost(units: string, quote: CostQuote, side: OrderSide) {
  const quantity = decimal(units);
  const buying = side === 'buy';
  const price = decimal(buying ? quote.ask : quote.bid);
  const charges = buying ? quote : (quote.saleCharges ?? quote);
  const rate = decimal(charges.commission);
  const fees = decimal(charges.fees);
  if (quantity === null || quantity <= 0) {
    return { error: 'Indique une quantité positive, avec au plus 8 décimales.' } as const;
  }
  if (price === null || price <= 0) {
    return { error: 'Indique un prix unitaire positif, avec au plus 8 décimales.' } as const;
  }
  if (rate === null || rate > percentBase || fees === null) {
    return { error: 'Indique une commission de 0 à 100 % et des frais positifs ou nuls (8 décimales maximum).' } as const;
  }
  const notional = quantity * price;
  const chargeNumerator = notional * rate + fees * scale * percentBase;
  const gross = cents(notional, scale * scale);
  const net = cents(notional * percentBase + (buying ? chargeNumerator : -chargeNumerator),
    scale * scale * percentBase);
  // Reconcile the displayed fees to the two rounded cash amounts.
  const totalFees = buying ? net - gross : gross - net;
  if ([gross, net, totalFees].some(value => Math.abs(value) > maxCents)) {
    return { error: rangeError } as const;
  }
  return { gross, totalFees, net } as const;
}

export function compareOrderCost(units: string, quote: CostQuote) {
  const buy = previewOrderCost(units, quote, 'buy');
  const sell = previewOrderCost(units, quote, 'sell');
  if (buy.error !== undefined) return { error: buy.error } as const;
  if (sell.error !== undefined) return { error: sell.error } as const;
  // Compare unrounded prices even when the two cash amounts round to the same cent.
  if (decimal(quote.bid)! > decimal(quote.ask)!) {
    return { error: 'À un même instant, le prix de vente doit être inférieur ou égal au prix d’achat.' } as const;
  }
  const roundTrip = buy.net - sell.net;
  if (Math.abs(roundTrip) > maxCents) return { error: rangeError } as const;
  return { purchase: buy.net, sale: sell.net, spread: buy.gross - sell.gross, roundTrip } as const;
}

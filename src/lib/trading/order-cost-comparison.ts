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

export function compareOrderCost(units: string, quote: CostQuote) {
  const quantity = decimal(units);
  const ask = decimal(quote.ask);
  const bid = decimal(quote.bid);
  const rate = decimal(quote.commission);
  const fees = decimal(quote.fees);
  const saleRate = decimal(quote.saleCharges?.commission ?? quote.commission);
  const saleFees = decimal(quote.saleCharges?.fees ?? quote.fees);
  if (quantity === null || quantity <= 0) {
    return { error: 'Indique une quantité positive, avec au plus 8 décimales.' } as const;
  }
  if (ask === null || bid === null || ask <= 0 || bid <= 0) {
    return { error: 'Indique deux prix positifs, avec au plus 8 décimales.' } as const;
  }
  if (bid > ask) {
    return { error: 'À un même instant, le prix de vente doit être inférieur ou égal au prix d’achat.' } as const;
  }
  if (rate === null || rate > percentBase || fees === null || saleRate === null || saleRate > percentBase || saleFees === null) {
    return { error: 'Indique une commission de 0 à 100 % et des frais positifs ou nuls (8 décimales maximum).' } as const;
  }

  const divisor = scale * scale * percentBase;
  const fixedFeeUnit = scale * percentBase;
  const purchase = cents(quantity * ask * (percentBase + rate) + fees * fixedFeeUnit, divisor);
  const sale = cents(quantity * bid * (percentBase - saleRate) - saleFees * fixedFeeUnit, divisor);
  const spread = cents(quantity * ask, scale * scale) - cents(quantity * bid, scale * scale);
  const roundTrip = purchase - sale;
  // The shared EUR formatter uses Number. Stay within its cent precision.
  if ([purchase, sale, spread, roundTrip].some(value => Math.abs(value) > 100_000_000_000_000)) {
    return { error: 'Le montant dépasse la plage de calcul de ce simulateur (1 000 milliards d’euros).' } as const;
  }
  return { purchase, sale, spread, roundTrip } as const;
}

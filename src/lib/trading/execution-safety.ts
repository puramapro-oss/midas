import type { Exchange, Market, Order } from 'ccxt';

export interface OrderSizingInput {
  side: 'buy' | 'sell';
  price: number;
  positionSizePct: number;
  configuredCapital: number;
  requestedQuoteAmount?: number;
  freeBase: number;
  freeQuote: number;
}

export interface OrderSizingResult {
  quantity: number;
  quoteAmount: number;
}

export function calculateSpotOrderSize(input: OrderSizingInput): OrderSizingResult {
  const values = [input.price, input.positionSizePct, input.configuredCapital, input.freeBase, input.freeQuote];
  if (values.some((value) => !Number.isFinite(value) || value < 0) || input.price <= 0) {
    throw new Error('Invalid or unavailable balance/price data');
  }
  if (input.positionSizePct <= 0 || input.positionSizePct > 100) {
    throw new Error('Position size must be between 0 and 100 percent');
  }

  const budget = input.requestedQuoteAmount ?? input.configuredCapital * (input.positionSizePct / 100);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error('Quote budget must be positive');
  }

  if (input.side === 'buy') {
    const quoteAmount = Math.min(budget, input.freeQuote);
    return { quantity: quoteAmount / input.price, quoteAmount };
  }

  const requestedBase = budget / input.price;
  const quantity = Math.min(requestedBase, input.freeBase);
  return { quantity, quoteAmount: quantity * input.price };
}

export function normalizeQuantity(exchange: Exchange, market: Market, rawQuantity: number, price: number): number {
  if (!market) throw new Error('Exchange market metadata is unavailable');
  const quantity = Number(exchange.amountToPrecision(market.symbol, rawQuantity));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Order quantity is zero after exchange precision rules');
  }

  const minAmount = market.limits?.amount?.min;
  const maxAmount = market.limits?.amount?.max;
  const cost = quantity * price;
  const minCost = market.limits?.cost?.min;
  const maxCost = market.limits?.cost?.max;

  if (minAmount != null && quantity < minAmount) throw new Error(`Quantity below exchange minimum (${minAmount})`);
  if (maxAmount != null && quantity > maxAmount) throw new Error(`Quantity above exchange maximum (${maxAmount})`);
  if (minCost != null && cost < minCost) throw new Error(`Order value below exchange minimum (${minCost})`);
  if (maxCost != null && cost > maxCost) throw new Error(`Order value above exchange maximum (${maxCost})`);
  return quantity;
}

export function confirmedExecution(order: Order): { price: number; quantity: number; fees: number } {
  const quantity = Number(order.filled);
  const price = Number(order.average ?? order.price);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Exchange did not confirm an executed quantity');
  if (!Number.isFinite(price) || price <= 0) throw new Error('Exchange did not confirm an execution price');
  const remaining = Number(order.remaining ?? 0);
  if (Number.isFinite(remaining) && remaining > 0) {
    throw new Error(`Exchange order is only partially filled (${quantity} filled, ${remaining} remaining)`);
  }

  const directFee = Number(order.fee?.cost ?? 0);
  return { price, quantity, fees: Number.isFinite(directFee) && directFee >= 0 ? directFee : 0 };
}

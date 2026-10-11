/** CoinGecko /coins/markets, vs_currency=usd, price_change_percentage=1h.
 * Unavailable observations must never be reported as a stable zero change. */
export function parseCrashObservation(data: unknown, now = Date.now()) {
  if (!Array.isArray(data) || data.length !== 1 || !data[0] || typeof data[0] !== 'object')
    throw new Error('Observation BTC indisponible');
  const row = data[0] as Record<string, unknown>;
  const change = row.price_change_percentage_1h_in_currency;
  const observed = typeof row.last_updated === 'string' ? Date.parse(row.last_updated) : NaN;
  if (row.id !== 'bitcoin' || typeof change !== 'number' || !Number.isFinite(change) || change < -100 ||
      !Number.isFinite(now) || !Number.isFinite(observed) || observed < now - 120000 || observed > now + 5000)
    throw new Error('Observation BTC invalide ou périmée');
  return { change1h: change, observedAt: observed, isCrash: change <= -5,
    source: 'coingecko' as const, currency: 'USD' as const };
}

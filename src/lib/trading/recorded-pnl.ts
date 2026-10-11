/** Database trades store gross P&L and cumulative recorded fees separately.
 * This helper must not be applied to backtest trades, whose P&L is already net. */
export function netRecordedPnl(pnl: unknown, fees: unknown = 0): number | null {
  const amount = (value: unknown) => {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return NaN;
    return Number(value);
  };
  const gross = amount(pnl);
  const cost = amount(fees);
  const net = gross - cost;
  return Number.isFinite(gross) && Number.isFinite(cost) && cost >= 0 && Number.isFinite(net) ? net : null;
}

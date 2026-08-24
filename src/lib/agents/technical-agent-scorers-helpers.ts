// =============================================================================
// MIDAS — Technical Scorers Helpers
// Utility functions for scorer modules
// =============================================================================

export function lastValue<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

export function secondToLast<T>(arr: T[]): T | undefined {
  return arr.length > 1 ? arr[arr.length - 2] : undefined;
}

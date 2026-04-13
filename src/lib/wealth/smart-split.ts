// =============================================================================
// WEALTH ENGINE V2 — Smart Split Logic
// =============================================================================

import { WALLET_SPLITS, type WalletType, type SubWallet } from './types';

/**
 * Split an incoming amount across 6 sub-wallets according to percentages.
 * If emergency wallet has reached its cap, redistribute to principal.
 */
export function computeSplit(
  amount: number,
  currentBalances: Record<WalletType, number>,
  emergencyCap: number = 3000 // 3 months of expenses default
): Record<WalletType, number> {
  const allocations: Record<WalletType, number> = {
    principal: 0,
    boost: 0,
    emergency: 0,
    dream: 0,
    pending: 0,
    solidaire: 0,
  };

  for (const [type, config] of Object.entries(WALLET_SPLITS)) {
    const walletType = type as WalletType;
    if (walletType === 'pending') continue; // pending is manual
    allocations[walletType] = Math.round((amount * config.pct / 100) * 100) / 100;
  }

  // Emergency cap: if emergency would exceed cap, redirect to principal
  const emergencyAfter = (currentBalances.emergency ?? 0) + allocations.emergency;
  if (emergencyAfter > emergencyCap) {
    const excess = emergencyAfter - emergencyCap;
    allocations.emergency -= excess;
    allocations.principal += excess;
  }

  return allocations;
}

/**
 * Build the full sub-wallet state from DB data
 */
export function buildSubWallets(
  balances: Record<string, number>
): SubWallet[] {
  return Object.entries(WALLET_SPLITS).map(([type, config]) => ({
    type: type as WalletType,
    balance: balances[type] ?? 0,
    label: config.label,
    description: config.desc,
    split_pct: config.pct,
    color: config.color,
  }));
}

/**
 * Calculate the Boost yield for locked funds
 * +2% per month locked for 30 days
 */
export function calculateBoostYield(
  boostBalance: number,
  lockedSinceDays: number
): number {
  const months = Math.floor(lockedSinceDays / 30);
  const rate = 0.02 * months; // 2% per month
  return Math.round(boostBalance * rate * 100) / 100;
}

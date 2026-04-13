# MIDAS — Findings

## Architecture
- Next.js 16.2.1 + React 19 + Tailwind + Zustand + CCXT + lightweight-charts
- 77 lib files, 78 components, 12 hooks, 46+ API routes
- 7 agents IA complets, 8 stratégies de trading
- Supabase auth via middleware.ts

## Current State
- Build: PASS
- Pages existantes: 19/23
- CRONs dans vercel.json: 1/15 (reset-counters uniquement)
- Stores Zustand: 3/7

## Key Paths
- lib/agents/ — 7 agents complets
- lib/trading/strategies/ — 8 stratégies
- lib/analysis/ — indicateurs, order flow, wyckoff, etc.
- stores/ — ui-store, market-store, trade-store

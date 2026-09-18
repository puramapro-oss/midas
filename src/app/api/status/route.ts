import { NextResponse } from 'next/server'

const BINANCE_PING_URL = 'https://api.binance.com/api/v3/ping'

export async function GET() {
  const startedAt = Date.now()
  let marketData: 'operational' | 'degraded' = 'degraded'
  try {
    const response = await fetch(BINANCE_PING_URL, { signal: AbortSignal.timeout(5000) })
    marketData = response.ok ? 'operational' : 'degraded'
  } catch {
    marketData = 'degraded'
  }

  return NextResponse.json({
    app: 'midas',
    status: marketData === 'operational' ? 'ok' : 'degraded',
    services: { public_market_data: marketData },
    latency_ms: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
  })
}

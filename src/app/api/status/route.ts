import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const services: Record<string, { status: string; latency_ms?: number }> = {}

    // Supabase
    const supabaseStart = Date.now()
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { db: { schema: 'public' } }
      )
      const { error } = await supabase.from('profiles').select('id').limit(1)
      services.supabase = {
        status: error ? 'degraded' : 'operational',
        latency_ms: Date.now() - supabaseStart,
      }
    } catch {
      services.supabase = { status: 'down', latency_ms: Date.now() - supabaseStart }
    }

    // Stripe
    const stripeStart = Date.now()
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        signal: AbortSignal.timeout(5000),
      })
      services.stripe = {
        status: res.ok ? 'operational' : 'degraded',
        latency_ms: Date.now() - stripeStart,
      }
    } catch {
      services.stripe = { status: 'down', latency_ms: Date.now() - stripeStart }
    }

    // Binance
    const binanceStart = Date.now()
    try {
      const res = await fetch('https://api.binance.com/api/v3/ping', {
        signal: AbortSignal.timeout(5000),
      })
      services.binance = {
        status: res.ok ? 'operational' : 'degraded',
        latency_ms: Date.now() - binanceStart,
      }
    } catch {
      services.binance = { status: 'down', latency_ms: Date.now() - binanceStart }
    }

    // Anthropic
    const anthropicStart = Date.now()
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(8000),
      })
      services.anthropic = {
        status: res.ok ? 'operational' : 'degraded',
        latency_ms: Date.now() - anthropicStart,
      }
    } catch {
      services.anthropic = { status: 'down', latency_ms: Date.now() - anthropicStart }
    }

    const allOperational = Object.values(services).every((s) => s.status === 'operational')
    const anyDown = Object.values(services).some((s) => s.status === 'down')

    return NextResponse.json({
      app: 'midas',
      status: anyDown ? 'partial_outage' : allOperational ? 'ok' : 'degraded',
      services,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json(
      { app: 'midas', status: 'error', message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

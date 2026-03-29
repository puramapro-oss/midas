import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import type { AgentResult } from '@/lib/agents/types';

const bodySchema = z.object({
  pair: z.string().min(1).max(30),
});

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

function buildMockOnChainResult(pair: string): AgentResult {
  const coin = pair.split('/')[0] ?? pair;
  const isPositive = Math.random() > 0.45;
  const score = isPositive ? 0.2 + Math.random() * 0.5 : -(0.2 + Math.random() * 0.5);

  return {
    agent_name: 'onchain',
    signal: score > 0.15 ? 'bullish' : score < -0.15 ? 'bearish' : 'neutral',
    score: parseFloat(score.toFixed(3)),
    confidence: parseFloat((0.4 + Math.random() * 0.4).toFixed(3)),
    reasoning: isPositive
      ? `Accumulation on-chain detectee pour ${coin}: hausse des adresses actives (+12.4%), ratio volume/market cap sain (0.08), flux entrants exchanges en baisse (-18%) indiquant un holding pattern.`
      : `Signaux on-chain mitiges pour ${coin}: baisse des adresses actives (-6.2%), flux entrants exchanges en hausse (+22%) suggerant une pression vendeuse potentielle. Volume/market cap ratio eleve (0.14).`,
    data: {
      active_addresses_change_7d: isPositive ? 12.4 : -6.2,
      exchange_inflow_change_7d: isPositive ? -18.0 : 22.0,
      exchange_outflow_change_7d: isPositive ? 8.5 : -3.2,
      volume_to_mcap_ratio: isPositive ? 0.08 : 0.14,
      large_tx_count_24h: Math.floor(150 + Math.random() * 300),
      whale_accumulation: isPositive,
      supply_on_exchanges_pct: parseFloat((10 + Math.random() * 8).toFixed(2)),
      nvt_ratio: parseFloat((45 + Math.random() * 40).toFixed(1)),
      mvrv_ratio: parseFloat((1.2 + Math.random() * 1.5).toFixed(2)),
    },
    timestamp: new Date(),
  };
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { pair } = parsed.data;

    const result = buildMockOnChainResult(pair);

    return NextResponse.json({ result, pair });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

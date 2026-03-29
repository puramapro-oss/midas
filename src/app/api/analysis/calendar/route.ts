import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

interface CalendarEventItem {
  name: string;
  date: string;
  days_until: number;
  impact: 'high' | 'medium' | 'low';
  bias: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  description: string;
  affects: string[];
  source: string;
}

function getUpcomingEvents(): CalendarEventItem[] {
  const now = new Date();

  const staticEvents: Array<Omit<CalendarEventItem, 'days_until'>> = [
    {
      name: 'FOMC Meeting',
      date: '2026-04-29',
      impact: 'high',
      bias: 'volatile',
      description: 'Reunion de la Fed sur les taux directeurs. Impact majeur sur la liquidite globale et les marches crypto.',
      affects: ['BTC', 'ETH', 'ALL'],
      source: 'federal_reserve',
    },
    {
      name: 'ETH Dencun Upgrade Anniversary',
      date: '2026-04-13',
      impact: 'medium',
      bias: 'bullish',
      description: 'Anniversaire du upgrade Dencun. Focus communautaire sur les avancees L2.',
      affects: ['ETH', 'ARB', 'OP', 'MATIC'],
      source: 'ethereum_foundation',
    },
    {
      name: 'BTC Options Expiry',
      date: '2026-04-04',
      impact: 'high',
      bias: 'volatile',
      description: 'Expiration trimestrielle des options BTC sur Deribit. Volatilite attendue autour du max pain price.',
      affects: ['BTC'],
      source: 'deribit',
    },
    {
      name: 'SOL Token Unlock',
      date: '2026-04-08',
      impact: 'medium',
      bias: 'bearish',
      description: 'Deverrouillage de tokens SOL issus de staking. Pression vendeuse potentielle a court terme.',
      affects: ['SOL'],
      source: 'token_unlocks',
    },
    {
      name: 'US CPI Data Release',
      date: '2026-04-10',
      impact: 'high',
      bias: 'volatile',
      description: 'Publication des donnees d\'inflation US. Impact direct sur les anticipations de politique monetaire.',
      affects: ['BTC', 'ETH', 'ALL'],
      source: 'bls_gov',
    },
    {
      name: 'ARB Airdrop Season 2 Snapshot',
      date: '2026-04-15',
      impact: 'medium',
      bias: 'bullish',
      description: 'Snapshot pour la saison 2 du programme d\'incentives Arbitrum. Afflux de liquidite attendu.',
      affects: ['ARB'],
      source: 'arbitrum_foundation',
    },
    {
      name: 'G20 Crypto Regulation Summit',
      date: '2026-04-20',
      impact: 'high',
      bias: 'neutral',
      description: 'Discussion du cadre regulatoire crypto au sommet du G20. Incertitude reglementaire.',
      affects: ['ALL'],
      source: 'g20',
    },
    {
      name: 'Ethereum Shanghai+ Upgrade',
      date: '2026-05-01',
      impact: 'high',
      bias: 'bullish',
      description: 'Mise a jour majeure du reseau Ethereum avec optimisations de performance et reduction des frais.',
      affects: ['ETH'],
      source: 'ethereum_foundation',
    },
  ];

  return staticEvents
    .map((event) => {
      const eventDate = new Date(event.date);
      const diffMs = eventDate.getTime() - now.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        ...event,
        days_until: daysUntil,
      };
    })
    .filter((event) => event.days_until >= -1 && event.days_until <= 60)
    .sort((a, b) => a.days_until - b.days_until);
}

export async function GET() {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const events = getUpcomingEvents();

    return NextResponse.json({
      events,
      total: events.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

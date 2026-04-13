import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Relevant cross-promos for MIDAS traders
const PROMO_APPS = [
  { slug: 'kash', name: 'KASH', desc: 'Finance personnelle & épargne', color: '#F59E0B', relevance: 'Optimise tes gains trading' },
  { slug: 'jurispurama', name: 'JurisPurama', desc: 'Fiscalité crypto & conseils juridiques', color: '#6D28D9', relevance: 'Déclare tes plus-values' },
  { slug: 'vida', name: 'VIDA Santé', desc: 'Bien-être & gestion du stress', color: '#10B981', relevance: 'Gère le stress du trading' },
  { slug: 'kaia', name: 'KAÏA', desc: 'Méditation & focus mental', color: '#06B6D4', relevance: 'Améliore ta concentration' },
];

// GET: recommended cross-promos (max 2)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Check which promos user has already used
    const { data: usedPromos } = await supabase.schema('midas').from('cross_promos')
      .select('target_app').eq('user_id', user.id).eq('used', true);

    const usedApps = new Set((usedPromos ?? []).map(p => p.target_app));
    const available = PROMO_APPS.filter(app => !usedApps.has(app.slug)).slice(0, 2);

    return NextResponse.json({
      promos: available.map(app => ({
        ...app,
        url: `https://${app.slug}.purama.dev`,
        coupon: 'CROSS50',
        discount: 50,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

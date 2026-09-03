import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveEligibility, getActiveReferralsCount } from '@/lib/retention';
import { buildLadderSteps } from '@purama/retention';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { eligible, profile } = await resolveEligibility(user.id);
    const referrals = await getActiveReferralsCount(user.id);
    const steps = buildLadderSteps(eligible);

    return NextResponse.json({
      steps,
      eligible,
      plan: profile.plan,
      planPeriod: profile.plan_period,
      referrals,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

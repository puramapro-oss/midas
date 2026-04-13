import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const adminDb = getAdminDb();

    // Get partner
    const { data: partner, error: partnerError } = await adminDb
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Partenaire non trouve' }, { status: 404 });
    }

    // Get this month's data
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthStart = startOfMonth.toISOString();

    // Scans this month
    const { count: scansThisMonth } = await adminDb
      .from('partner_scans')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', partner.id)
      .gte('created_at', monthStart);

    // Referrals this month
    const { count: referralsThisMonth } = await adminDb
      .from('partner_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', partner.id)
      .gte('created_at', monthStart);

    // Earnings this month
    const { data: monthCommissions } = await adminDb
      .from('partner_commissions')
      .select('amount')
      .eq('partner_id', partner.id)
      .in('status', ['approved', 'paid'])
      .gte('created_at', monthStart);

    const earningsThisMonth = (monthCommissions ?? []).reduce(
      (sum: number, c: { amount: number }) => sum + Number(c.amount),
      0
    );

    // Pending commissions
    const { data: pendingComm } = await adminDb
      .from('partner_commissions')
      .select('amount')
      .eq('partner_id', partner.id)
      .eq('status', 'pending');

    const pendingCommissions = (pendingComm ?? []).reduce(
      (sum: number, c: { amount: number }) => sum + Number(c.amount),
      0
    );

    // Conversion rate
    const totalScans = partner.total_scans ?? 0;
    const totalReferrals = partner.total_referrals ?? 0;
    const conversionRate = totalScans > 0 ? (totalReferrals / totalScans) * 100 : 0;

    const stats = {
      totalScans,
      totalReferrals,
      totalEarned: Number(partner.total_earned ?? 0),
      currentBalance: Number(partner.current_balance ?? 0),
      pendingCommissions,
      tier: partner.tier ?? 'bronze',
      milestoneReached: partner.milestone_reached ?? 0,
      scansThisMonth: scansThisMonth ?? 0,
      referralsThisMonth: referralsThisMonth ?? 0,
      earningsThisMonth,
      conversionRate: Math.round(conversionRate * 10) / 10,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

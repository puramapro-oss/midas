import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'midas' } }
);

// Prize distribution: Top 10 gets 25/18/14/10/8/7/6/5/4/3%
const PRIZE_DISTRIBUTION = [25, 18, 14, 10, 8, 7, 6, 5, 4, 3];

function generatePseudo(userId: string): string {
  const hash = userId.replace(/-/g, '').substring(0, 4).toUpperCase();
  return `Trader #${hash}`;
}

function calculateRiskScore(profile: Record<string, unknown>): number {
  // Risk-adjusted performance (max 30 pts)
  // Based on: account age, plan level, shield active, positions tracked
  const plan = profile.plan as string;
  const shieldEnabled = profile.metadata && typeof profile.metadata === 'object' && 'shield_enabled' in (profile.metadata as Record<string, unknown>);
  const createdAt = new Date(profile.created_at as string);
  const ageMonths = Math.max(1, (Date.now() - createdAt.getTime()) / (30 * 86400000));

  let score = 0;
  // Plan quality (more investment = better risk management assumed)
  if (plan === 'ultra') score += 12;
  else if (plan === 'pro') score += 8;
  else score += 3;

  // Shield enabled = good risk management
  if (shieldEnabled) score += 8;

  // Account maturity (capped at 10 pts for 6+ months)
  score += Math.min(10, Math.floor(ageMonths * 1.67));

  return Math.min(30, score);
}

function calculateRegularityScore(profile: Record<string, unknown>): number {
  // Regularity of usage (max 25 pts)
  const streak = (profile.streak as number) ?? 0;
  const dailyQuestions = (profile.daily_questions_used as number) ?? 0;

  let score = 0;
  // Streak = consistent usage
  score += Math.min(12, streak * 2);
  // Daily engagement
  score += Math.min(8, dailyQuestions);
  // Level progression = consistent growth
  const level = (profile.level as number) ?? 1;
  score += Math.min(5, level);

  return Math.min(25, score);
}

function calculatePreservationScore(profile: Record<string, unknown>): number {
  // Capital preservation (max 25 pts)
  const plan = profile.plan as string;
  const xp = (profile.xp as number) ?? 0;

  let score = 0;
  // Higher plan = more tools for capital preservation
  if (plan === 'ultra') score += 10;
  else if (plan === 'pro') score += 7;
  else score += 3;

  // XP reflects good usage patterns
  score += Math.min(10, Math.floor(xp / 100));

  // Onboarding completed = properly configured
  if (profile.onboarding_completed) score += 5;

  return Math.min(25, score);
}

function calculateLoyaltyScore(profile: Record<string, unknown>): number {
  // Usage duration & loyalty (max 20 pts)
  const createdAt = new Date(profile.created_at as string);
  const ageDays = Math.max(1, (Date.now() - createdAt.getTime()) / 86400000);
  const subscriptionStatus = profile.subscription_status as string;

  let score = 0;
  // Account age (1 pt per week, max 12)
  score += Math.min(12, Math.floor(ageDays / 7));
  // Active subscription = loyalty
  if (subscriptionStatus === 'active') score += 5;
  // Referral code used = community engagement
  if (profile.referred_by) score += 3;

  return Math.min(20, score);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Evaluate PREVIOUS month (cron runs on 1st of new month)
    const evalMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // previous month
    const evalYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    // Check if already evaluated
    const { data: existing } = await supabase
      .from('ranking_contests')
      .select('id, status')
      .eq('month', evalMonth)
      .eq('year', evalYear)
      .single();

    if (existing?.status === 'completed') {
      return NextResponse.json({ ok: true, message: 'Already evaluated' });
    }

    // Create or get ranking contest
    let contestId: string;
    if (existing) {
      contestId = existing.id;
      await supabase
        .from('ranking_contests')
        .update({ status: 'evaluating' })
        .eq('id', contestId);
    } else {
      const { data: newContest } = await supabase
        .from('ranking_contests')
        .insert({ month: evalMonth, year: evalYear, status: 'evaluating' })
        .select('id')
        .single();
      if (!newContest) throw new Error('Failed to create ranking contest');
      contestId = newContest.id;
    }

    // Get all active profiles (accounts with activity)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .not('plan', 'is', null);

    if (!profiles || profiles.length === 0) {
      await supabase
        .from('ranking_contests')
        .update({ status: 'completed', total_participants: 0, evaluated_at: new Date().toISOString() })
        .eq('id', contestId);
      return NextResponse.json({ ok: true, participants: 0 });
    }

    // Calculate scores for each profile
    const scored = profiles.map((p) => {
      const riskScore = calculateRiskScore(p);
      const regularityScore = calculateRegularityScore(p);
      const preservationScore = calculatePreservationScore(p);
      const loyaltyScore = calculateLoyaltyScore(p);
      const totalScore = riskScore + regularityScore + preservationScore + loyaltyScore;

      return {
        ranking_contest_id: contestId,
        user_id: p.id,
        pseudo: generatePseudo(p.id),
        risk_score: riskScore,
        regularity_score: regularityScore,
        preservation_score: preservationScore,
        loyalty_score: loyaltyScore,
        total_score: totalScore,
      };
    });

    // Sort by total score descending
    scored.sort((a, b) => b.total_score - a.total_score);

    // Assign ranks
    scored.forEach((s, i) => {
      (s as Record<string, unknown>).rank = i + 1;
    });

    // Calculate prize pool (3% of monthly revenue — placeholder: use contest prize_pool)
    // For now, set a base prize pool. In production, this would be calculated from Stripe revenue.
    const prizePool = Math.max(50, profiles.length * 2); // Minimum 50€, or 2€ per participant

    // Assign prizes to top 10
    const top10 = scored.slice(0, 10);
    top10.forEach((entry, i) => {
      (entry as Record<string, unknown>).prize_amount = Math.round((prizePool * PRIZE_DISTRIBUTION[i] / 100) * 100) / 100;
    });

    // Insert all rankings
    const { error: insertError } = await supabase
      .from('portfolio_rankings')
      .upsert(scored.map((s, i) => ({
        ...s,
        rank: i + 1,
        prize_amount: i < 10 ? Math.round((prizePool * PRIZE_DISTRIBUTION[i] / 100) * 100) / 100 : 0,
      })), { onConflict: 'ranking_contest_id,user_id' });

    if (insertError) throw new Error(`Insert rankings: ${insertError.message}`);

    // Credit wallets for top 10
    for (const entry of top10) {
      const prizeAmount = (entry as Record<string, unknown>).prize_amount as number;
      if (prizeAmount <= 0) continue;

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', entry.user_id)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: Number(wallet.balance) + prizeAmount })
          .eq('user_id', entry.user_id);
      } else {
        await supabase
          .from('wallets')
          .insert({ user_id: entry.user_id, balance: prizeAmount });
      }

      await supabase.from('wallet_transactions').insert({
        user_id: entry.user_id,
        type: 'credit',
        amount: prizeAmount,
        source: 'contest',
        description: `Classement mensuel ${evalMonth}/${evalYear} — Rang ${(entry as Record<string, unknown>).rank}`,
        reference_id: contestId,
      });
    }

    // Mark as completed
    await supabase
      .from('ranking_contests')
      .update({
        status: 'completed',
        prize_pool: prizePool,
        total_participants: scored.length,
        evaluated_at: new Date().toISOString(),
      })
      .eq('id', contestId);

    // Create next month's active ranking contest
    const nextMonth = now.getMonth() + 1;
    const nextYear = now.getFullYear();
    await supabase
      .from('ranking_contests')
      .upsert({ month: nextMonth, year: nextYear, status: 'active' }, { onConflict: 'month,year' });

    return NextResponse.json({
      ok: true,
      month: evalMonth,
      year: evalYear,
      participants: scored.length,
      prizePool,
      top3: top10.slice(0, 3).map((t) => ({
        pseudo: t.pseudo,
        score: t.total_score,
        prize: (t as Record<string, unknown>).prize_amount,
      })),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

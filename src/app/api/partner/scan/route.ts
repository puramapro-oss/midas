import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const bodySchema = z.object({
  code: z.string().min(1).max(100),
  referrer_url: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 });
    }

    const { code, referrer_url } = parsed.data;
    const adminDb = getAdminDb();

    // Find partner by code
    const { data: partner, error: partnerError } = await adminDb
      .from('partners')
      .select('id, display_name, avatar_url, bio, tier, status')
      .eq('code', code)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Code partenaire invalide' }, { status: 404 });
    }

    if (partner.status !== 'active') {
      return NextResponse.json({ error: 'Partenaire inactif' }, { status: 403 });
    }

    // Get IP from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? '';

    // Anti-fraud: check 1 scan per IP per 24h for this code
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: ipCount } = await adminDb
      .from('partner_scans')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)
      .eq('ip_address', ip)
      .gte('created_at', oneDayAgo);

    if ((ipCount ?? 0) > 0) {
      // Still return partner info but don't log duplicate
      return NextResponse.json({ success: true, partner, duplicate: true });
    }

    // Anti-fraud: max 100 scans per day per code
    const { count: dailyCount } = await adminDb
      .from('partner_scans')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)
      .gte('created_at', oneDayAgo);

    if ((dailyCount ?? 0) >= 100) {
      return NextResponse.json({ success: true, partner, limit_reached: true });
    }

    // Parse user agent for device info
    const device = /Mobile|Android|iPhone/i.test(userAgent) ? 'mobile' : 'desktop';
    const os = extractOS(userAgent);
    const browser = extractBrowser(userAgent);

    // Log scan
    await adminDb.from('partner_scans').insert({
      partner_id: partner.id,
      code,
      ip_address: ip,
      user_agent: userAgent.substring(0, 500),
      device,
      os,
      browser,
      referrer_url: referrer_url ?? null,
    });

    // Increment total_scans
    const { data: currentPartner } = await adminDb
      .from('partners')
      .select('total_scans')
      .eq('id', partner.id)
      .single();

    if (currentPartner) {
      await adminDb
        .from('partners')
        .update({ total_scans: (currentPartner.total_scans ?? 0) + 1 })
        .eq('id', partner.id);
    }

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractOS(ua: string): string {
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  return 'Inconnu';
}

function extractBrowser(ua: string): string {
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Edge/i.test(ua)) return 'Edge';
  return 'Autre';
}

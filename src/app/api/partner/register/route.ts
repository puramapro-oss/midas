import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

function getAdminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 20);
}

function generateCode(name: string): string {
  const base = slugify(name).substring(0, 12);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${base}-${suffix}`;
}

const bodySchema = z.object({
  channel: z.enum(['influencer', 'website', 'media', 'physical']),
  display_name: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  social_links: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const { channel, display_name, bio, website_url, social_links } = parsed.data;
    const adminDb = getAdminDb();

    // Check if user is already a partner
    const { data: existing } = await adminDb
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Vous etes deja partenaire' }, { status: 409 });
    }

    // Generate unique code and slug
    let code = generateCode(display_name);
    let slug = slugify(display_name);

    // Ensure uniqueness
    const { data: codeExists } = await adminDb
      .from('partners')
      .select('id')
      .eq('code', code)
      .single();

    if (codeExists) {
      code = generateCode(display_name + Date.now());
    }

    const { data: slugExists } = await adminDb
      .from('partners')
      .select('id')
      .eq('slug', slug)
      .single();

    if (slugExists) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const { data: partner, error: insertError } = await adminDb
      .from('partners')
      .insert({
        user_id: user.id,
        channel,
        code,
        slug,
        display_name,
        bio: bio ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        website_url: website_url || null,
        social_links: social_links ?? {},
        status: 'active', // Auto-approve for now
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Erreur creation partenaire', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, partner }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

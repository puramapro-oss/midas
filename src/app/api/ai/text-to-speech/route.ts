import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import {
  DEFAULT_VOICE_ID,
  ELEVENLABS_API_URL,
  TTS_DAILY_LIMIT,
  TTS_MODEL_ID,
  TTS_VOICE_SETTINGS,
} from '@/lib/voice/constants';

const bodySchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
});

/** In-memory rate limit tracker (resets on cold start — acceptable for edge protection) */
const ttsUsage = new Map<string, { count: number; resetAt: number }>();

function checkTtsRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = ttsUsage.get(userId);

  if (!entry || now >= entry.resetAt) {
    ttsUsage.set(userId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= TTS_DAILY_LIMIT) {
    return false;
  }

  entry.count += 1;
  return true;
}

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

  let isSuperAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isSuperAdmin = profile?.role === 'super_admin';
  }

  return { user, supabase, isSuperAdmin };
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? 'ceb3c780b157ff7b2cf71853c5dfbe8b3f4273b72a3d64cbfcb55a0fb9f7033d';

export async function POST(request: Request) {
  try {
    const { user, isSuperAdmin } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Donnees invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { text, voiceId } = parsed.data;

    // Rate limit (super_admin bypass)
    if (!isSuperAdmin && !checkTtsRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Limite quotidienne de synthese vocale atteinte', limit: TTS_DAILY_LIMIT },
        { status: 429 }
      );
    }

    const selectedVoiceId = voiceId ?? DEFAULT_VOICE_ID;

    const elevenLabsResponse = await fetch(
      `${ELEVENLABS_API_URL}/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL_ID,
          voice_settings: TTS_VOICE_SETTINGS,
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text().catch(() => 'Erreur inconnue');
      return NextResponse.json(
        { error: `Erreur ElevenLabs: ${elevenLabsResponse.status}`, details: errorText },
        { status: 502 }
      );
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de synthese vocale';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

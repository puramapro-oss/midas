import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import OpenAI from 'openai';

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

export async function POST(request: Request) {
  try {
    const { user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Transcription serveur indisponible',
          fallback: 'browser',
          message: 'Utilisez la Web Speech API du navigateur. Definissez OPENAI_API_KEY pour activer Whisper.',
        },
        { status: 501 }
      );
    }

    const formData = (await request.formData()) as unknown as FormData;
    const audioFile = formData.get('audio');
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: 'Fichier audio requis (champ "audio")' }, { status: 400 });
    }

    const language = (formData.get('language') as string | null) ?? 'fr';

    const openai = new OpenAI({ apiKey });

    const file = new File([audioFile], 'audio.webm', {
      type: audioFile.type || 'audio/webm',
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      response_format: 'json',
    });

    return NextResponse.json({
      text: transcription.text,
      language,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de transcription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

const contactSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  email: z.string().email('Email invalide'),
  subject: z.string().min(1, 'Le sujet est requis').max(200),
  message: z.string().min(10, 'Le message doit faire au moins 10 caractères').max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, subject, message } = parsed.data;
    const supabase = createServiceClient();

    const { error } = await supabase
      .schema('midas')
      .from('contact_messages')
      .insert({ name, email, subject, message });

    if (error) {
      return NextResponse.json(
        { error: 'Impossible d\'envoyer le message. Réessaie dans quelques instants.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur. Réessaie plus tard.' },
      { status: 500 }
    );
  }
}

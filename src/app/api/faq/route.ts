import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .schema('midas')
      .from('faq_articles')
      .select('id, category, question, answer, search_keywords, view_count, helpful_count')
      .order('view_count', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Impossible de charger les articles.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ articles: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  id: z.string().uuid('ID invalide'),
  field: z.enum(['view', 'helpful']),
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const { id, field } = parsed.data;
    const column = field === 'view' ? 'view_count' : 'helpful_count';
    const supabase = createServiceClient();

    const { data: current, error: fetchError } = await supabase
      .schema('midas')
      .from('faq_articles')
      .select(column)
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }

    const currentValue = (current as Record<string, number>)[column] ?? 0;

    const { error: updateError } = await supabase
      .schema('midas')
      .from('faq_articles')
      .update({ [column]: currentValue + 1 })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Impossible de mettre à jour.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertCronAuth } from '@/lib/cron-auth';
import { getPhase } from '@/lib/phase';
import { generateAndPersistSignals } from '@/lib/signals/generate-and-persist';

export async function GET(request: NextRequest) {
  if (!getPhase().personalizedCryptoAdvice) {
    return NextResponse.json(
      { error: 'La génération de signaux est désactivée : information et éducation uniquement.', policy: 'D2=A' },
      { status: 403 },
    );
  }
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: 'public' } });
    const result = await generateAndPersistSignals(supabase);
    if (!result.ok) {
      return NextResponse.json({ error: 'Aucun signal verifie genere', failures: result.failures }, { status: 503 });
    }
    return NextResponse.json({
      success: true,
      generated: result.generated,
      failures: result.failures,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 });
  }
}

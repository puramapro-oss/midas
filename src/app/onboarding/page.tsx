'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading, refetch } = useAuth();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && profile?.onboarding_completed) {
      router.replace('/dashboard');
    }
  }, [loading, profile?.onboarding_completed, router]);

  const handleFinish = useCallback(async () => {
    if (!user) {
      router.push('/dashboard');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/onboarding/complete', { method: 'POST' });
      if (!response.ok) throw new Error('onboarding_failed');
      await refetch();
      router.push('/dashboard');
    } catch {
      toast.error('Impossible de terminer l’accueil pour le moment.');
    } finally {
      setSaving(false);
    }
  }, [refetch, router, user]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080C14] px-6 py-12 text-white">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-12">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          <BookOpen aria-hidden="true" className="h-7 w-7" />
        </div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          Information et éducation uniquement
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Comprendre les marchés avec MIDAS</h1>
        <p className="mt-5 text-base leading-7 text-white/70">
          MIDAS explique des notions générales et permet d’observer des scénarios pédagogiques.
          Il ne fournit aucun conseil personnalisé, aucune recommandation d’achat ou de vente et
          n’exécute aucun ordre.
        </p>

        <div className="mt-8 space-y-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5">
          <div className="flex gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <p className="text-sm leading-6 text-white/75">
              Aucune connexion d’exchange, aucune clé API et aucun ordre réel. Les exercices
              utilisent uniquement une simulation éducative.
            </p>
          </div>
          <p className="text-sm leading-6 text-white/60">
            Les crypto-actifs sont très risqués : une perte totale du capital est possible. Pour
            une décision adaptée à votre situation, consultez un professionnel autorisé.
          </p>
        </div>

        <button
          type="button"
          data-testid="activate-midas"
          onClick={handleFinish}
          disabled={saving || loading}
          className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : null}
          Accéder aux contenus éducatifs
        </button>
      </section>
    </main>
  );
}

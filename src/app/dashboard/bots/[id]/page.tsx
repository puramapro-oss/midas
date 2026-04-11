'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Page bot-detail : aucun bot fabriqué. Tant qu'on n'a pas branché la table
// réelle des bots utilisateur, on redirige vers la liste pour éviter d'afficher
// des chiffres bidons (PnL, winrate, trades inventés).
export default function BotDetailPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/dashboard/bots'), 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center mb-5">
        <Bot className="h-7 w-7 text-[#FFD700]" />
      </div>
      <h2
        className="text-xl font-bold text-white mb-2"
        style={{ fontFamily: 'var(--font-orbitron)' }}
      >
        Bot introuvable
      </h2>
      <p className="text-sm text-white/50 max-w-md mb-6">
        Ce bot n&apos;existe pas ou n&apos;a pas encore ete cree. On te ramene
        sur la liste des bots.
      </p>
      <Button type="button" variant="secondary" onClick={() => router.replace('/dashboard/bots')}>
        Retour aux bots
      </Button>
    </div>
  );
}

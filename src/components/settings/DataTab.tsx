'use client';

import Link from 'next/link';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DataTab() {
  return (
    <div className="space-y-6" data-testid="settings-donnees">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
        <div className="flex items-center gap-3 mb-2">
          <Download className="h-5 w-5 text-[#FFD700]/60" />
          <h3 className="text-sm font-semibold text-white">Ma mémoire</h3>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Consulte tes acceptations légales, exporte l&apos;ensemble de tes données (profil, trades,
          conversations) au format JSON, ou programme la suppression de ton compte (RGPD art. 15/17/20).
        </p>
        <Link href="/dashboard/ma-memoire" data-testid="ma-memoire-link">
          <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />}>
            Accéder à Ma mémoire
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
        <div className="flex items-center gap-3 mb-2">
          <Trash2 className="h-5 w-5 text-red-400/60" />
          <h3 className="text-sm font-semibold text-white">Supprimer l&apos;historique</h3>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Supprime définitivement l&apos;historique de tes conversations IA. Tes trades et paramètres sont conservés.
        </p>
        <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />}>
          Supprimer l&apos;historique
        </Button>
      </div>
    </div>
  );
}

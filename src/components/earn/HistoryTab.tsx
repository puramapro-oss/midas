'use client';

import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface HistoryTabProps {
  loading: boolean;
  history: { id: string; action: string; asset: string; amount: number; created_at: string }[];
}

export default function HistoryTab({ loading, history }: HistoryTabProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="size-6 animate-spin text-amber-400 mx-auto" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-10 text-center text-white/50">Aucun historique pour le moment.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/50">
                    {new Date(h.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={h.action === 'interest' || h.action === 'bonus' ? 'success' : 'default'}
                    >
                      {h.action === 'subscribe'
                        ? 'Souscription'
                        : h.action === 'redeem'
                          ? 'Retrait'
                          : h.action === 'interest'
                            ? 'Intérêts'
                            : 'Bonus'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{h.asset}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {Number(h.amount).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import {
  Star, Copy, Percent, Trophy, UserPlus, AlertCircle, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

interface BecomeTraderFormProps {
  onSubmit: (name: string, bio: string) => void;
  isLoading: boolean;
}

export default function BecomeTraderForm({ onSubmit, isLoading }: BecomeTraderFormProps) {
  const [traderName, setTraderName] = useState('');
  const [traderBio, setTraderBio] = useState('');

  const handleSubmit = () => {
    if (traderName) {
      onSubmit(traderName, traderBio);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
            <Star className="size-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Devenir Trader Public</h2>
            <p className="text-sm text-white/50">Partage tes trades et gagne des commissions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { icon: Copy, title: 'Tes trades sont copiés', desc: 'Les copieurs répliquent automatiquement tes positions' },
            { icon: Percent, title: '10% de commission', desc: 'Sur les profits générés par tes copieurs' },
            { icon: Trophy, title: 'Classement public', desc: 'Monte dans le classement et attire plus de copieurs' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <item.icon className="size-8 text-amber-400 mb-2" />
              <h4 className="font-semibold text-white text-sm">{item.title}</h4>
              <p className="text-xs text-white/50 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-white/70 mb-1">Nom de trader</label>
            <input
              type="text"
              value={traderName}
              onChange={(e) => setTraderName(e.target.value)}
              placeholder="ex: GoldHunter, CryptoWolf..."
              data-testid="copy-trader-name"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Bio (optionnel)</label>
            <textarea
              value={traderBio}
              onChange={(e) => setTraderBio(e.target.value)}
              placeholder="Décris ta stratégie de trading..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!traderName || isLoading}
          data-testid="copy-become-trader"
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="size-5" />
              Créer mon profil trader
            </>
          )}
        </button>

        <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/40">
              Les performances passées ne garantissent pas les résultats futurs. Les copieurs sont
              responsables de leurs propres décisions d&apos;investissement. Commission de 10% sur les
              profits uniquement (pas de commission sur les pertes).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

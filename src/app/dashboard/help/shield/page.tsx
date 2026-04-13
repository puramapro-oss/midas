'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, AlertTriangle, Zap, Lock, BarChart3, Activity, Timer } from 'lucide-react';

const LEVELS = [
  { level: 1, name: 'Position Sizing', icon: BarChart3, color: '#10B981', desc: 'Chaque trade utilise maximum 2% de ton capital. Si ton portefeuille vaut 10 000€, un trade risque au max 200€. Ça te protège contre les mauvaises surprises.' },
  { level: 2, name: 'Stop Loss ATR', icon: AlertTriangle, color: '#3B82F6', desc: "Le stop loss est calculé automatiquement en fonction de la volatilité (ATR). En marché calme, SL serré. En marché agité, SL plus large. S'adapte en temps réel." },
  { level: 3, name: 'Trailing Stop', icon: Activity, color: '#A855F7', desc: "Quand ton trade est en profit, le stop loss monte automatiquement pour protéger tes gains. Si le prix chute, tu sors avec un profit plutôt qu'une perte." },
  { level: 4, name: 'Circuit Breaker', icon: Zap, color: '#F59E0B', desc: "Après 3 pertes consécutives, MIDAS fait une pause de 4 heures. Ça évite le tilt et les décisions émotionnelles. Les meilleurs traders font des pauses." },
  { level: 5, name: 'Crash Detection', icon: AlertTriangle, color: '#EF4444', desc: "Si Bitcoin chute de plus de 5% en 1 heure, MIDAS bloque TOUS les trades automatiquement. Les crashs sont imprévisibles — mieux vaut attendre que ça se calme." },
  { level: 6, name: 'Diversification', icon: Lock, color: '#06B6D4', desc: 'Maximum 20% de ton capital sur un seul token, maximum 5 positions simultanées. Pas tous les œufs dans le même panier.' },
  { level: 7, name: 'Limites utilisateur', icon: Timer, color: '#FFD700', desc: "Tu définis toi-même ta perte max par jour, par semaine et par mois. Quand la limite est atteinte, MIDAS s'arrête. C'est TOI qui décides du risque max." },
];

export default function ShieldGuidePage() {
  return (
    <div className="space-y-6" data-testid="guide-shield">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/help" className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white font-[family-name:var(--font-orbitron)]">MIDAS Shield</h1>
          <p className="text-sm text-white/40">7 niveaux de protection automatique pour ton capital.</p>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <p className="text-sm text-emerald-400 font-medium">Le Shield est toujours actif. Il protège ton capital 24/7, même quand tu dors.</p>
        </div>
      </div>
      <div className="space-y-4">
        {LEVELS.map((l) => (
          <div key={l.level} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${l.color}15`, color: l.color }}>
                {l.level}
              </div>
              <div className="flex items-center gap-2">
                <l.icon className="w-4 h-4" style={{ color: l.color }} />
                <h3 className="text-sm font-semibold text-white">{l.name}</h3>
              </div>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{l.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

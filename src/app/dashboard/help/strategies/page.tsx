'use client';

import Link from 'next/link';
import { ArrowLeft, TrendingUp, BarChart3, ArrowUpDown, Zap, DollarSign, Target } from 'lucide-react';

const STRATEGIES = [
  { name: 'Momentum', icon: TrendingUp, color: '#10B981', risk: 'Modéré', desc: "Suit la tendance dominante. L'IA détecte les accélérations de prix confirmées par le volume et les indicateurs (RSI, MACD). Idéal en marché haussier ou baissier fort. Entry quand le momentum s'accélère, exit quand il s'essouffle.", best: 'Marchés en tendance claire' },
  { name: 'Grid Trading', icon: BarChart3, color: '#3B82F6', risk: 'Conservateur', desc: "Place des ordres d'achat et vente à intervalles réguliers dans un range défini. Profite des oscillations naturelles du prix. Pas besoin de prédire la direction — tant que le prix oscille, tu gagnes.", best: 'Marchés latéraux (range)' },
  { name: 'Mean Reversion', icon: ArrowUpDown, color: '#A855F7', risk: 'Modéré', desc: "Parie sur le retour du prix à sa moyenne. Quand le prix s'écarte trop de sa moyenne mobile, l'IA ouvre une position dans le sens inverse. Utilise les Bollinger Bands et le RSI en surachat/survente.", best: 'Actifs à forte volatilité' },
  { name: 'Breakout', icon: Zap, color: '#F59E0B', risk: 'Agressif', desc: "Détecte les cassures de niveaux clés (support/résistance). Quand le prix franchit un niveau avec du volume, l'IA entre en position. Stop loss serré juste sous le niveau cassé. Potentiel de gain élevé.", best: 'Périodes de consolidation' },
  { name: 'DCA Intelligent', icon: DollarSign, color: '#06B6D4', risk: 'Conservateur', desc: "Investissement programmé mais optimisé par l'IA. Au lieu d'acheter à intervalles fixes, l'IA attend les meilleurs moments (RSI bas, Fear & Greed en zone peur). Réduit le prix moyen d'achat.", best: 'Investissement long terme' },
  { name: 'Scalping', icon: Target, color: '#EF4444', risk: 'Agressif', desc: "Trades très rapides (secondes à minutes) qui captent de petits mouvements. Nécessite une connexion stable et des frais bas. L'IA détecte les micro-patterns et exécute avec précision.", best: 'Paires à forte liquidité (BTC, ETH)' },
];

export default function StrategiesGuidePage() {
  return (
    <div className="space-y-6" data-testid="guide-strategies">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/help" className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white font-[family-name:var(--font-orbitron)]">Stratégies de trading</h1>
          <p className="text-sm text-white/40">Comprends chaque stratégie et choisis celle adaptée à ton profil.</p>
        </div>
      </div>
      <div className="space-y-4">
        {STRATEGIES.map((s) => (
          <div key={s.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: s.color, borderColor: `${s.color}40`, backgroundColor: `${s.color}10` }}>Risque {s.risk}</span>
              </div>
            </div>
            <p className="text-xs text-white/50 leading-relaxed mb-3">{s.desc}</p>
            <p className="text-[10px] text-white/30"><strong className="text-white/50">Idéal pour :</strong> {s.best}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Shield, TrendingUp, Rocket } from 'lucide-react';

export const BINANCE_REF = 'https://www.binance.com/en/register';
export const TOTAL_STEPS = 6;
export const STEP_LABELS = ['Bienvenue', 'Binance', 'Clés API', 'Coller', 'Risque', 'Prêt'];

export const RISK_PROFILES = [
  { id: 0, label: 'Prudent', pct: '1-2%', color: '#10B981', icon: Shield, desc: 'Préservation du capital. Idéal pour débuter.' },
  { id: 1, label: 'Modéré', pct: '2-5%', color: '#F59E0B', icon: TrendingUp, desc: 'Équilibre risque/rendement. Le plus populaire.' },
  { id: 2, label: 'Agressif', pct: '5-10%', color: '#EF4444', icon: Rocket, desc: 'Rendements maximaux. Pour les traders expérimentés.' },
];

export const API_STEPS = [
  { letter: 'a', text: 'Va dans Paramètres > Gestion API sur Binance' },
  { letter: 'b', text: 'Clique "Créer une API"' },
  { letter: 'c', text: 'Choisis "Clé API générée par le système"' },
  { letter: 'd', text: 'Active UNIQUEMENT : Lecture + Trading Spot' },
  { letter: 'e', text: 'Copie la clé API et la clé secrète' },
];

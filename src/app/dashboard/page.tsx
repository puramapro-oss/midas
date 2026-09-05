import Link from 'next/link';
import { BookOpen, ChartNoAxesCombined, FlaskConical, MessageSquare, ShieldCheck } from 'lucide-react';

const resources = [
  { href: '/dashboard/markets', label: 'Données de marché', description: 'Consulter des données générales sans recommandation.', icon: ChartNoAxesCombined },
  { href: '/dashboard/paper', label: 'Simulation fictive', description: 'Expérimenter avec des unités fictives, sans ordre réel.', icon: FlaskConical },
  { href: '/dashboard/backtesting', label: 'Backtesting pédagogique', description: 'Étudier le passé sans prédiction de performance future.', icon: BookOpen },
  { href: '/dashboard/chat', label: 'Assistant éducatif', description: 'Poser une question générale, sans conseil personnalisé.', icon: MessageSquare },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <section className="rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/5 p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-1 h-7 w-7 shrink-0 text-[#FFD700]" aria-hidden="true" />
          <div><h1 className="text-2xl font-bold text-white">Espace d’éducation MIDAS</h1><p className="mt-2 max-w-3xl text-white/70">Information générale et simulations uniquement. Aucun conseil personnalisé, aucune clé d’exchange, aucun ordre réel et aucune promotion de service crypto en France.</p></div>
        </div>
      </section>
      <section className="grid gap-5 md:grid-cols-2" aria-label="Ressources éducatives">
        {resources.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="min-h-44 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#FFD700]/35">
            <Icon className="mb-4 h-7 w-7 text-[#FFD700]" aria-hidden="true" /><h2 className="text-lg font-semibold text-white">{label}</h2><p className="mt-2 text-sm leading-relaxed text-white/65">{description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

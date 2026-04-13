'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Shield, Users, CreditCard, Trophy, LayoutDashboard, Activity, Landmark } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Utilisateurs', href: '/admin/users', icon: Users },
  { label: 'Retraits', href: '/admin/withdrawals', icon: CreditCard },
  { label: 'Concours', href: '/admin/contests', icon: Trophy },
  { label: 'Monitoring', href: '/admin/monitoring', icon: Activity },
  { label: 'Financement', href: '/admin/financement', icon: Landmark },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#06080F] text-white">
      <header className="border-b border-white/10 bg-[#0A0F1A]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#FFD700]" />
              <span className="font-bold font-[family-name:var(--font-orbitron)] text-[#FFD700]">
                MIDAS ADMIN
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-[#FFD700]/10 text-[#FFD700]' : 'text-white/40 hover:text-white/70'}`}>
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

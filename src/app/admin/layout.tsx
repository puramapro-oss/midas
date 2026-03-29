import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
          <span className="text-xs text-white/30">matiss.frasne@gmail.com</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

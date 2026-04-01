'use client'

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
          <WifiOff className="h-10 w-10 text-white/20" />
        </div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-orbitron)' }}>
          Hors ligne
        </h1>
        <p className="text-sm text-white/40 leading-relaxed">
          MIDAS a besoin d'une connexion internet pour fonctionner. Verifie ta connexion et reessaie.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-sm font-semibold hover:bg-[#FFD700]/20 transition-all"
        >
          Reessayer
        </button>
      </div>
    </main>
  )
}

'use client'

import { motion } from 'framer-motion'
import { Trophy, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-orbitron)' }}
          data-testid="leaderboard-title"
        >
          Leaderboard
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Classement des meilleurs traders MIDAS et copy trading.
        </p>
      </div>

      {/* Empty state — aucune donnée fabriquée */}
      <Card>
        <CardContent className="p-10 sm:p-14 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/20 mb-5"
          >
            <Trophy className="h-7 w-7 text-[#FFD700]" />
          </motion.div>
          <h2
            className="text-xl font-bold text-white mb-2"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            Bientot disponible
          </h2>
          <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed">
            Le classement live et le copy trading seront actives des que la
            communaute MIDAS aura assez de traders actifs pour produire des
            statistiques reelles. On prefere t&apos;afficher rien plutot que
            des chiffres bidon.
          </p>
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <Shield className="h-4 w-4 text-[#FFD700] shrink-0 mt-0.5" />
        <div className="text-xs text-white/40 leading-relaxed">
          <p className="font-medium text-white/60 mb-1">
            Comment fonctionnera le copy trading ?
          </p>
          <p>
            Des que le classement sera actif, tu pourras copier un trader : chaque
            trade qu&apos;il execute sera automatiquement replique sur ton
            compte, proportionnellement a ton capital. Tu pourras arreter de
            copier a tout moment. Les performances passees ne garantissent pas
            les resultats futurs.
          </p>
        </div>
      </div>
    </div>
  )
}

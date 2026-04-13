'use client';

import { motion } from 'framer-motion';
import { Users, QrCode } from 'lucide-react';
import { TIER_LABELS, TIER_COLORS, CHANNEL_LABELS } from '@/types/partnership';
import type { Partner } from '@/types/partnership';

interface PartnerCardProps {
  partner: Partner;
  index?: number;
}

export default function PartnerCard({ partner, index = 0 }: PartnerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:border-[var(--gold-primary)]/20 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-white font-bold text-lg shrink-0">
          {partner.display_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">
              {partner.display_name}
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${TIER_COLORS[partner.tier]}20`,
                color: TIER_COLORS[partner.tier],
                border: `1px solid ${TIER_COLORS[partner.tier]}30`,
              }}
            >
              {TIER_LABELS[partner.tier]}
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mb-2">
            {CHANNEL_LABELS[partner.channel]}
          </p>
          {partner.bio && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
              {partner.bio}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {partner.total_referrals} filleul{partner.total_referrals !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <QrCode className="w-3 h-3" />
              {partner.total_scans} scan{partner.total_scans !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

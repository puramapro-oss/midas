'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign } from 'lucide-react';
import { MILESTONE_TIERS, TIER_THRESHOLDS, TIER_LABELS, TIER_COLORS } from '@/types/partnership';
import type { PartnerTier } from '@/types/partnership';

// Average subscription price for estimation
const AVG_MONTHLY_PRICE = 19.99;

export default function CommissionSimulator() {
  const [referrals, setReferrals] = useState(25);

  const estimates = useMemo(() => {
    const firstMonthEarnings = referrals * AVG_MONTHLY_PRICE * 0.5;
    const recurringMonthly = referrals * AVG_MONTHLY_PRICE * 0.1;
    const yearlyRecurring = recurringMonthly * 12;

    // Calculate milestone bonuses earned
    let milestoneBonus = 0;
    for (const [threshold, bonus] of Object.entries(MILESTONE_TIERS)) {
      if (referrals >= Number(threshold)) {
        milestoneBonus += bonus;
      }
    }

    // Determine tier
    let currentTier: PartnerTier = 'bronze';
    for (const [tier, threshold] of Object.entries(TIER_THRESHOLDS)) {
      if (referrals >= threshold) {
        currentTier = tier as PartnerTier;
      }
    }

    return {
      firstMonthEarnings,
      recurringMonthly,
      yearlyRecurring,
      milestoneBonus,
      totalFirstYear: firstMonthEarnings + yearlyRecurring + milestoneBonus,
      currentTier,
    };
  }, [referrals]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 md:p-8">
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6" style={{ fontFamily: 'var(--font-orbitron)' }}>
        Simulateur de revenus
      </h3>

      {/* Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[var(--text-secondary)]">Nombre de filleuls</span>
          <span className="text-2xl font-bold text-[var(--gold-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            {referrals}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={500}
          value={referrals}
          onChange={(e) => setReferrals(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #F59E0B 0%, #D97706 ${(referrals / 500) * 100}%, rgba(255,255,255,0.1) ${(referrals / 500) * 100}%)`,
          }}
          data-testid="simulator-slider"
        />
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
          <span>1</span>
          <span>100</span>
          <span>250</span>
          <span>500</span>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <motion.div
          key={`first-${referrals}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/5 rounded-xl p-4 text-center"
        >
          <DollarSign className="w-5 h-5 text-[var(--gold-primary)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text-secondary)] mb-1">1er mois</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {estimates.firstMonthEarnings.toFixed(0)} EUR
          </p>
        </motion.div>

        <motion.div
          key={`monthly-${referrals}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-white/5 rounded-xl p-4 text-center"
        >
          <TrendingUp className="w-5 h-5 text-[var(--success)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text-secondary)] mb-1">Recurrent / mois</p>
          <p className="text-lg font-bold text-[var(--success)]">
            {estimates.recurringMonthly.toFixed(0)} EUR
          </p>
        </motion.div>

        <motion.div
          key={`yearly-${referrals}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-xl p-4 text-center"
        >
          <Users className="w-5 h-5 text-[var(--info)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text-secondary)] mb-1">Bonus paliers</p>
          <p className="text-lg font-bold text-[var(--info)]">
            {estimates.milestoneBonus.toFixed(0)} EUR
          </p>
        </motion.div>
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-[#F59E0B]/10 to-[#D97706]/10 border border-[#F59E0B]/20 rounded-xl p-4 text-center mb-6">
        <p className="text-sm text-[var(--text-secondary)] mb-1">Estimation 1ere annee</p>
        <motion.p
          key={`total-${referrals}`}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold text-[var(--gold-primary)]"
          style={{ fontFamily: 'var(--font-orbitron)' }}
        >
          {estimates.totalFirstYear.toFixed(0)} EUR
        </motion.p>
      </div>

      {/* Current tier */}
      <div className="text-center">
        <span className="text-sm text-[var(--text-secondary)]">Votre palier : </span>
        <span
          className="text-sm font-bold"
          style={{ color: TIER_COLORS[estimates.currentTier] }}
        >
          {TIER_LABELS[estimates.currentTier]}
        </span>
      </div>
    </div>
  );
}

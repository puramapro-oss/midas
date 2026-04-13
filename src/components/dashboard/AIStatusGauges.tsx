'use client';

import { motion } from 'framer-motion';
import RingGauge from '@/components/charts/RingGauge';

const gauges = [
  { value: 75, label: 'Score Global', color: '#06B6D4' },
  { value: 82, label: 'Technique', color: '#10B981' },
  { value: 68, label: 'Sentiment', color: '#A855F7' },
  { value: 71, label: 'On-Chain', color: '#FF6B00' },
];

const gaugeVariants = {
  hidden: { opacity: 0, scale: 0.7, rotate: -10 } as const,
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
      delay: i * 0.1,
    },
  }),
};

export default function AIStatusGauges() {
  return (
    <motion.div
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
      data-testid="ai-status-gauges"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      <div className="flex items-center gap-2 mb-5">
        <motion.div
          className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-orbitron)]">
          Analyse IA
        </h3>
        <span className="text-[10px] text-emerald-400/80 font-medium ml-auto">LIVE</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gauges.map((gauge, i) => (
          <motion.div
            key={gauge.label}
            custom={i}
            variants={gaugeVariants}
            initial="hidden"
            animate="visible"
            whileHover={{
              scale: 1.08,
              filter: `drop-shadow(0 0 12px ${gauge.color}40)`,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="cursor-default"
          >
            <RingGauge
              value={gauge.value}
              label={gauge.label}
              color={gauge.color}
              size={100}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

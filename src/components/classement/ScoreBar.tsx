import { motion } from 'framer-motion';

export default function ScoreBar({ label, score, max, icon: Icon, color }: {
  label: string; score: number; max: number; icon: React.ComponentType<{ className?: string; color?: string }>; color: string;
}) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" color={color} />
          <span className="text-xs text-white/50">{label}</span>
        </div>
        <span className="text-xs font-bold text-white/70" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
          {score.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

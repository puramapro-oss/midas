import { motion } from 'framer-motion';

export default function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl sm:text-2xl font-bold text-[#FFD700]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

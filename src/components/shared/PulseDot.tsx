'use client';

interface PulseDotProps {
  color?: 'green' | 'red' | 'gold' | 'blue';
  size?: 'sm' | 'md';
  label?: string;
}

const colorMap = {
  green: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', shadow: 'shadow-emerald-500/40' },
  red: { bg: 'bg-red-500', ring: 'ring-red-500/30', shadow: 'shadow-red-500/40' },
  gold: { bg: 'bg-[var(--gold-primary)]', ring: 'ring-[var(--gold-primary)]/30', shadow: 'shadow-[var(--gold-primary)]/40' },
  blue: { bg: 'bg-blue-500', ring: 'ring-blue-500/30', shadow: 'shadow-blue-500/40' },
};

const sizeMap = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
};

export default function PulseDot({ color = 'green', size = 'sm', label }: PulseDotProps) {
  const c = colorMap[color];

  return (
    <span className="inline-flex items-center gap-1.5" data-testid="pulse-dot">
      <span className="relative flex">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c.bg} opacity-40`}
        />
        <span
          className={`relative inline-flex rounded-full ${sizeMap[size]} ${c.bg} ${c.shadow} ring-2 ${c.ring}`}
        />
      </span>
      {label && (
        <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      )}
    </span>
  );
}

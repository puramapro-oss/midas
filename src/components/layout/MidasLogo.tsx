'use client';

interface MidasLogoProps {
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export default function MidasLogo({ size = 'md', glow = false, className = '' }: MidasLogoProps) {
  return (
    <span
      data-testid="midas-logo"
      className={`font-[var(--font-orbitron)] font-bold tracking-wider gradient-text-gold select-none ${sizeMap[size]} ${glow ? 'drop-shadow-[0_0_12px_rgba(255,215,0,0.4)]' : ''} ${className}`}
      style={{ fontFamily: 'var(--font-orbitron)' }}
    >
      MIDAS
    </span>
  );
}

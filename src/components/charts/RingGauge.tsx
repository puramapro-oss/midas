'use client';

import { useEffect, useState, useRef } from 'react';

interface RingGaugeProps {
  value: number;
  label: string;
  color: string;
  size?: number;
}

export default function RingGauge({ value, label, color, size = 120 }: RingGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const hasAnimated = useRef(false);

  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    let start: number | null = null;
    const duration = 1200;

    function animate(timestamp: number) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(eased * clampedValue);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [clampedValue]);

  return (
    <div className="flex flex-col items-center gap-2" data-testid={`ring-gauge-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Value ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
              transition: 'stroke-dashoffset 0.1s ease-out',
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold text-[var(--gold-primary)]"
            style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: size * 0.22,
              lineHeight: 1,
            }}
          >
            {Math.round(animatedValue)}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-[var(--text-secondary)] text-center">
        {label}
      </span>
    </div>
  );
}

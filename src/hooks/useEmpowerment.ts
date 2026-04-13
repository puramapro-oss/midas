'use client';

import { useCallback, useMemo } from 'react';
import { EMPOWERING_TEXTS, getEmpoweringText } from '@/lib/spiritual/affirmations';

// Golden ratio and Fibonacci for layout harmony
const PHI = 1.618;
const FIBONACCI = [8, 13, 21, 34, 55] as const;

interface EmpowermentUtils {
  /** Get empowering text for a UI state key */
  getText: (key: string) => string;
  /** Get a Fibonacci spacing value by index (0-4) */
  spacing: (index: number) => number;
  /** Golden ratio multiplier */
  phi: number;
  /** All empowering texts for direct access */
  texts: Record<string, string>;
  /** Sacred numbers for timing/counts */
  sacredNumbers: readonly number[];
}

export function useEmpowerment(): EmpowermentUtils {
  const getText = useCallback((key: string) => getEmpoweringText(key), []);

  return useMemo(
    () => ({
      getText,
      spacing: (index: number) => FIBONACCI[Math.min(index, FIBONACCI.length - 1)],
      phi: PHI,
      texts: EMPOWERING_TEXTS,
      sacredNumbers: [7, 21, 33, 40, 108] as const,
    }),
    [getText],
  );
}

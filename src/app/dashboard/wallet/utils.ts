export const SOURCE_LABELS: Record<string, string> = {
  referral: 'Parrainage',
  contest: 'Concours',
  withdrawal: 'Retrait',
  manual: 'Manuel',
};

export function validateIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean);
}

export const rowFade = {
  hidden: { opacity: 0, x: -10 } as const,
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24, delay: i * 0.04 },
  }),
};

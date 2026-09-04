// =============================================================================
// MIDAS — Karma Split engine unit tests (pure function)
// Utilise Playwright comme runner (déjà installé) — teste computeKarmaSplit
// sans toucher la DB. V4.1 Axe 2. Split gravé 50/0/30/20 (reward/adya/asso=pool
// affiliés-parrains/sasu) — FACTS.md source unique.
// =============================================================================

import { test, expect } from '@playwright/test';
import { computeKarmaSplit } from '../src/lib/karma/split';
import { KARMA_SPLIT_RATES } from '../src/types/karma';

test.describe('computeKarmaSplit — cas nominaux', () => {
  test('abo 9,99 € → 5,00 / 0,00 / 3,00 / 1,99 (SASU absorbe le reliquat)', () => {
    const r = computeKarmaSplit(999); // 9,99 €
    // 50% = 499.5 → round 500 = 5,00 €
    // 0%  = 0                  = 0,00 €
    // 30% = 299.7 → round 300  = 3,00 €
    // 999 - 500 - 0 - 300 = 199 → 1,99 € (SASU encaisse le reliquat)
    expect(r.reward_eur).toBe(5.00);
    expect(r.adya_eur).toBe(0.00);
    expect(r.asso_eur).toBe(3.00);
    expect(r.sasu_eur).toBe(1.99);
    expect(r.total_eur).toBe(9.99);
  });

  test('abo 39 € (plan pro) → 19,50 / 0,00 / 11,70 / 7,80', () => {
    const r = computeKarmaSplit(3900);
    expect(r.reward_eur).toBe(19.50);
    expect(r.adya_eur).toBe(0.00);
    expect(r.asso_eur).toBe(11.70);
    expect(r.sasu_eur).toBe(7.80);
    expect(r.total_eur).toBe(39.00);
  });

  test('abo 79 € (plan expert) → 39,50 / 0,00 / 23,70 / 15,80', () => {
    const r = computeKarmaSplit(7900);
    expect(r.reward_eur).toBe(39.50);
    expect(r.adya_eur).toBe(0.00);
    expect(r.asso_eur).toBe(23.70);
    expect(r.sasu_eur).toBe(15.80);
    expect(r.total_eur).toBe(79.00);
  });

  test('abo annuel 390 € → 195 / 0 / 117 / 78', () => {
    const r = computeKarmaSplit(39000);
    expect(r.reward_eur).toBe(195.00);
    expect(r.adya_eur).toBe(0.00);
    expect(r.asso_eur).toBe(117.00);
    expect(r.sasu_eur).toBe(78.00);
    expect(r.total_eur).toBe(390.00);
  });
});

test.describe('computeKarmaSplit — bornes', () => {
  test('0 cent → tous à zéro', () => {
    const r = computeKarmaSplit(0);
    expect(r.reward_eur).toBe(0);
    expect(r.adya_eur).toBe(0);
    expect(r.asso_eur).toBe(0);
    expect(r.sasu_eur).toBe(0);
    expect(r.total_eur).toBe(0);
  });

  test('1 cent → 1 cent entier va au reward (arrondi absorbé)', () => {
    const r = computeKarmaSplit(1);
    // 50% → round(0.5) = 1 cent (JS arrondit 0.5 loin de zéro)
    // 0%  → 0
    // 30% → round(0.3) = 0
    // SASU = 1 - 1 - 0 - 0 = 0
    expect(r.reward_eur + r.adya_eur + r.asso_eur + r.sasu_eur).toBe(r.total_eur);
    expect(r.total_eur).toBe(0.01);
  });

  test('100 cents (1 €) → 0,50 / 0,00 / 0,30 / 0,20', () => {
    const r = computeKarmaSplit(100);
    expect(r.reward_eur).toBe(0.50);
    expect(r.adya_eur).toBe(0.00);
    expect(r.asso_eur).toBe(0.30);
    expect(r.sasu_eur).toBe(0.20);
    expect(r.total_eur).toBe(1.00);
  });

  test('montant très élevé 100 000 € → split correct', () => {
    const r = computeKarmaSplit(10_000_000);
    expect(r.reward_eur).toBe(50_000);
    expect(r.adya_eur).toBe(0);
    expect(r.asso_eur).toBe(30_000);
    expect(r.sasu_eur).toBe(20_000);
    expect(r.total_eur).toBe(100_000);
  });
});

test.describe('computeKarmaSplit — invariants', () => {
  test('invariant somme=total_eur pour 1000 montants aléatoires', () => {
    // Seeded PRNG pour déterminisme des tests
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < 1000; i++) {
      const cents = Math.floor(rand() * 1_000_000);
      const r = computeKarmaSplit(cents);
      const sumCents =
        Math.round(r.reward_eur * 100) +
        Math.round(r.adya_eur * 100) +
        Math.round(r.asso_eur * 100) +
        Math.round(r.sasu_eur * 100);
      expect(sumCents).toBe(cents);
      expect(r.total_eur).toBe(cents / 100);
    }
  });

  test('ratios individuels dans [pct-0,01€, pct+0,01€] (borne arrondi)', () => {
    // Pour 9,99 € : SASU vrai = 20% = 1,998, on accepte 1,99 (reliquat)
    const r = computeKarmaSplit(999);
    const totalCents = 999;
    expect(Math.abs(r.reward_eur * 100 - totalCents * KARMA_SPLIT_RATES.reward)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(r.adya_eur * 100 - totalCents * KARMA_SPLIT_RATES.adya)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(r.asso_eur * 100 - totalCents * KARMA_SPLIT_RATES.asso)).toBeLessThanOrEqual(0.5);
    // SASU absorbe jusqu'à 1,5 cent de reliquat (3 arrondis potentiels)
    expect(Math.abs(r.sasu_eur * 100 - totalCents * KARMA_SPLIT_RATES.sasu)).toBeLessThanOrEqual(1.5);
  });

  test('KARMA_SPLIT_RATES somme à 1.00 pile', () => {
    const sum =
      KARMA_SPLIT_RATES.reward +
      KARMA_SPLIT_RATES.adya +
      KARMA_SPLIT_RATES.asso +
      KARMA_SPLIT_RATES.sasu;
    expect(sum).toBeCloseTo(1, 10);
  });
});

test.describe('computeKarmaSplit — entrées invalides', () => {
  test('montant négatif → throw', () => {
    expect(() => computeKarmaSplit(-1)).toThrow(/>= 0/);
    expect(() => computeKarmaSplit(-100)).toThrow(/>= 0/);
  });

  test('NaN → throw', () => {
    expect(() => computeKarmaSplit(NaN)).toThrow(/finite/);
  });

  test('Infinity → throw', () => {
    expect(() => computeKarmaSplit(Infinity)).toThrow(/finite/);
    expect(() => computeKarmaSplit(-Infinity)).toThrow(/finite/);
  });

  test('montant non-entier 999.7 → arrondi à 1000 avant split', () => {
    const r = computeKarmaSplit(999.7);
    // arrondi à 1000 cents → 500/0/300/200
    expect(r.reward_eur).toBe(5.00);
    expect(r.adya_eur).toBe(0.00);
    expect(r.asso_eur).toBe(3.00);
    expect(r.sasu_eur).toBe(2.00);
    expect(r.total_eur).toBe(10.00);
  });
});

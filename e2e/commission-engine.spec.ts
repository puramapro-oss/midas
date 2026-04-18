// =============================================================================
// MIDAS — Commission Engine unit tests (pure function)
// Utilise Playwright comme runner (déjà installé) — teste computeCommissions
// sans toucher la DB.
// =============================================================================

import { test, expect } from '@playwright/test';
import { computeCommissions } from '../src/lib/commission-engine';

type Minimal = {
  id: string;
  partnership_version: 'v2' | 'v3';
  level2_partner_id: string | null;
  level3_partner_id: string | null;
  status: string;
};

const activeV2 = (id: string, over: Partial<Minimal> = {}): Minimal => ({
  id,
  partnership_version: 'v2',
  level2_partner_id: null,
  level3_partner_id: null,
  status: 'active',
  ...over,
});

const activeV3 = (id: string, over: Partial<Minimal> = {}): Minimal => ({
  id,
  partnership_version: 'v3',
  level2_partner_id: null,
  level3_partner_id: null,
  status: 'active',
  ...over,
});

test.describe('Commission Engine — V2 (legacy)', () => {
  test('V2 L1 seul, first payment → first_month 50%', () => {
    const rows = computeCommissions({
      chain: { l1: activeV2('L1'), l2: null, l3: null },
      paidAmountEur: 39,
      isFirstPayment: true,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('first_month');
    expect(rows[0].amount).toBe(19.5);
    expect(rows[0].partnership_version).toBe('v2');
  });

  test('V2 L1 seul, recurring → 10%', () => {
    const rows = computeCommissions({
      chain: { l1: activeV2('L1'), l2: null, l3: null },
      paidAmountEur: 39,
      isFirstPayment: false,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('recurring');
    expect(rows[0].amount).toBe(3.9);
  });

  test('V2 L1+L2 → first_month + level2 15%', () => {
    const rows = computeCommissions({
      chain: { l1: activeV2('L1'), l2: activeV2('L2'), l3: null },
      paidAmountEur: 100,
      isFirstPayment: true,
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.type === 'first_month')?.amount).toBe(50);
    expect(rows.find((r) => r.type === 'level2')?.amount).toBe(15);
  });

  test('V2 : PAS de level3 même si chain.l3 existe', () => {
    const rows = computeCommissions({
      chain: {
        l1: activeV2('L1'),
        l2: activeV2('L2'),
        l3: activeV2('L3'),
      },
      paidAmountEur: 100,
      isFirstPayment: false,
    });
    expect(rows.find((r) => r.type === 'level3')).toBeUndefined();
    expect(rows).toHaveLength(2); // L1 recurring + L2
  });
});

test.describe('Commission Engine — V3 (lifetime 3 niveaux)', () => {
  test('V3 L1 seul, first payment → 50% lifetime', () => {
    const rows = computeCommissions({
      chain: { l1: activeV3('L1'), l2: null, l3: null },
      paidAmountEur: 39,
      isFirstPayment: true,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('first_month');
    expect(rows[0].amount).toBe(19.5); // 50% lifetime (même valeur que first_month)
    expect(rows[0].partnership_version).toBe('v3');
  });

  test('V3 L1 recurring → 50% lifetime (pas dégressif comme v2)', () => {
    const rows = computeCommissions({
      chain: { l1: activeV3('L1'), l2: null, l3: null },
      paidAmountEur: 39,
      isFirstPayment: false,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(19.5); // 50% — PAS 3.9€ comme v2
  });

  test('V3 chaîne complète L1+L2+L3 → 50% + 15% + 7%', () => {
    const rows = computeCommissions({
      chain: {
        l1: activeV3('L1'),
        l2: activeV3('L2'),
        l3: activeV3('L3'),
      },
      paidAmountEur: 100,
      isFirstPayment: true,
    });
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.partner_id === 'L1')?.amount).toBe(50);
    expect(rows.find((r) => r.partner_id === 'L2')?.amount).toBe(15);
    expect(rows.find((r) => r.partner_id === 'L3')?.amount).toBe(7);
  });

  test('V3 L2 inactive → skip L2, L3 toujours crédité si actif', () => {
    const rows = computeCommissions({
      chain: {
        l1: activeV3('L1'),
        l2: activeV3('L2', { status: 'suspended' }),
        l3: activeV3('L3'),
      },
      paidAmountEur: 100,
      isFirstPayment: false,
    });
    const ids = rows.map((r) => r.partner_id);
    expect(ids).toContain('L1');
    expect(ids).not.toContain('L2');
    expect(ids).toContain('L3');
  });
});

test.describe('Commission Engine — edge cases', () => {
  test('paidAmountEur = 0 → aucune commission', () => {
    const rows = computeCommissions({
      chain: { l1: activeV3('L1'), l2: activeV3('L2'), l3: activeV3('L3') },
      paidAmountEur: 0,
      isFirstPayment: true,
    });
    expect(rows).toHaveLength(0);
  });

  test('paidAmountEur négatif → aucune commission', () => {
    const rows = computeCommissions({
      chain: { l1: activeV3('L1'), l2: null, l3: null },
      paidAmountEur: -10,
      isFirstPayment: false,
    });
    expect(rows).toHaveLength(0);
  });

  test('arrondi à 2 décimales', () => {
    const rows = computeCommissions({
      chain: { l1: activeV3('L1'), l2: activeV3('L2'), l3: null },
      paidAmountEur: 9.99,
      isFirstPayment: false,
    });
    // 50% of 9.99 = 4.995 → 5.00 (rounded half-up by Math.round)
    expect(rows.find((r) => r.partner_id === 'L1')?.amount).toBe(5);
    // 15% of 9.99 = 1.4985 → 1.50
    expect(rows.find((r) => r.partner_id === 'L2')?.amount).toBe(1.5);
  });
});

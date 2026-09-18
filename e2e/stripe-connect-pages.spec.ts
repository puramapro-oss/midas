// =============================================================================
// MIDAS — E2E pages /compte/* (NIYAMA D1=C)
// Tissma D1=C (2026-09-05) : retraits/KYC/Stripe Connect inaccessibles.
// Le middleware (EDUCATION_ONLY_PAGE_PREFIXES '/compte/') redirige TOUTE page
// /compte/* vers /dashboard/help ; anonyme, la cascade continue vers
// /login?next=%2Fdashboard%2Fhelp. Point clé verrouillé : le `next` ne pointe
// PLUS vers /compte/* — retourner au hub Connect après login est impossible.
// =============================================================================

import { test, expect } from '@playwright/test';

const CONNECT_PAGES = [
  'configuration',
  'gestion',
  'virements',
  'paiements',
  'soldes',
  'documents',
  'notifications',
] as const;

for (const slug of CONNECT_PAGES) {
  test(`GET /compte/${slug} anonyme → neutralisé, atterrit sur /login (next=/dashboard/help)`, async ({ page }) => {
    await page.goto(`/compte/${slug}`);
    await expect(page).toHaveURL(/\/login/);
    // Le hub Connect n'est jamais la destination de retour
    await expect(page).not.toHaveURL(/compte/);
  });
}

import { test, expect } from '@playwright/test';

const BASE = 'https://midas.purama.dev';

const PUBLIC_PAGES = [
  '/',
  '/pricing',
  '/login',
  '/register',
  '/status',
  '/changelog',
  '/offline',
];

interface ButtonInfo {
  page: string;
  tag: string;
  text: string;
  href: string | null;
  issue: string;
}

test('Audit all buttons and links on public pages', async ({ page }) => {
  const issues: ButtonInfo[] = [];

  for (const path of PUBLIC_PAGES) {
    const url = `${BASE}${path}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Collect all visible clickable elements
    const elements = await page.$$eval(
      'a:not([hidden]), button:not([hidden])',
      (els) => els.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 100),
        href: el.getAttribute('href'),
        disabled: (el as HTMLButtonElement).disabled,
      }))
    );

    console.log(`\n${path}: ${elements.length} clickable elements`);
    for (const el of elements) {
      if (el.disabled) continue;

      // Links with href="#" or empty
      if (el.tag === 'a' && (!el.href || el.href === '#' || el.href === '')) {
        issues.push({ page: path, tag: el.tag, text: el.text, href: el.href, issue: 'Empty/hash href' });
        console.log(`  ❌ <a> "${el.text}" href="${el.href}" — dead link`);
      }

      // Log all elements for review
      if (el.text) {
        console.log(`  ${el.tag === 'a' ? '🔗' : '🔘'} "${el.text}" ${el.href ? `→ ${el.href}` : ''}`);
      }
    }
  }

  // Now click-test each link on landing page to check for 404s
  console.log('\n\n=== CLICK TESTING LANDING PAGE LINKS ===');
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const landingLinks = await page.$$eval('a[href]', (els) =>
    els.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map(el => ({
      href: el.getAttribute('href') || '',
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 80),
    }))
  );

  const checked = new Set<string>();
  for (const link of landingLinks) {
    if (checked.has(link.href)) continue;
    checked.add(link.href);

    // Skip external, mailto, anchor-only
    if (link.href.startsWith('http') && !link.href.includes('purama.dev')) continue;
    if (link.href.startsWith('mailto:') || link.href.startsWith('tel:')) continue;
    if (link.href === '#' || link.href.startsWith('#')) continue;

    const fullUrl = link.href.startsWith('http') ? link.href : `${BASE}${link.href}`;
    try {
      const resp = await page.request.get(fullUrl);
      const status = resp.status();
      if (status >= 400) {
        issues.push({ page: '/', tag: 'a', text: link.text, href: link.href, issue: `HTTP ${status}` });
        console.log(`  ❌ "${link.text}" → ${link.href} — HTTP ${status}`);
      } else {
        console.log(`  ✅ "${link.text}" → ${link.href} — ${status}`);
      }
    } catch (err) {
      console.log(`  ⚠️ "${link.text}" → ${link.href} — error`);
    }
  }

  console.log('\n\n=== DEAD BUTTONS SUMMARY ===');
  if (issues.length === 0) {
    console.log('✅ No dead buttons found!');
  } else {
    for (const i of issues) {
      console.log(`❌ [${i.page}] <${i.tag}> "${i.text}" — ${i.issue}`);
    }
  }
  console.log(`Total issues: ${issues.length}`);
});

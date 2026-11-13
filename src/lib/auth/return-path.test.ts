import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSafeReturnPath } from './return-path.ts';

test('missing, empty and non-string return values use the dashboard', () => {
  for (const value of [undefined, null, '', 0, false, {}, ['/dashboard']]) {
    assert.equal(getSafeReturnPath(value), '/dashboard');
  }
});

test('internal paths preserve their query string and fragment exactly', () => {
  for (const value of [
    '/',
    '/dashboard/help',
    '/dashboard/ma-memoire?section=mes%20notes#saved',
    '/dashboard/help?q=hello world#guide',
    '/dashboard/éducation?lang=fr#été',
    '/partenariat/association',
    '/subscribe?plan=pro&period=monthly',
  ]) {
    assert.equal(getSafeReturnPath(value), value);
  }
});

test('host suffixes, user information and absolute URLs cannot become destinations', () => {
  for (const value of [
    '.outside.invalid/entry',
    '@outside.invalid/entry',
    ':443@outside.invalid/entry',
    'https://outside.invalid/entry',
    'https://midas.example/dashboard',
    '//outside.invalid/entry',
    '///outside.invalid/entry',
    'dashboard/help',
    '?next=/dashboard',
    '#dashboard',
    'javascript:alert(1)',
    ' /dashboard',
  ]) {
    assert.equal(getSafeReturnPath(value), '/dashboard', value);
  }
});

test('backslashes cannot turn an accepted return into an external authority', () => {
  for (const value of ['/\\outside.invalid/entry', '\\outside.invalid', '/dashboard\\settings']) {
    assert.equal(getSafeReturnPath(value), '/dashboard');
  }
});

test('every ASCII control and DEL is rejected wherever it occurs', () => {
  for (const code of [...Array.from({ length: 32 }, (_, i) => i), 127]) {
    const control = String.fromCharCode(code);
    for (const value of [`/${control}/outside.invalid`, `/dashboard${control}/help`, `/dashboard?x=${control}`]) {
      assert.equal(getSafeReturnPath(value), '/dashboard', `control ${code}`);
    }
  }
});

test('percent-encoded path and query data is preserved without a second decode', () => {
  for (const value of [
    '/dashboard/%2Fnotes?next=%2F%2Foutside.invalid',
    '/dashboard/%5Cnotes',
    '/%252F%252Foutside.invalid',
    '/dashboard?search=%0A&target=https%3A%2F%2Foutside.invalid',
  ]) {
    assert.equal(getSafeReturnPath(value), value);
    assert.equal(new URL(value, 'https://midas.example/login').origin, 'https://midas.example');
  }
});

test('URL query decoding happens before validation for encoded authority attacks', () => {
  for (const query of [
    'next=%2F%5Coutside.invalid',
    'next=%2F%09%2Foutside.invalid',
    'next=%2F%0A%2Foutside.invalid',
    'next=%40outside.invalid',
  ]) {
    assert.equal(getSafeReturnPath(new URLSearchParams(query).get('next')), '/dashboard');
  }
});

test('accepted destinations keep the origin for client and callback URL construction', () => {
  const origin = 'https://midas.example';
  const prefixes = ['/', '//', '/\\', '/\t/', '/\n/', '/\r/', '/./', '/../', '/%2f', '/%5c'];
  for (const prefix of prefixes) {
    for (const suffix of ['outside.invalid', '@outside.invalid', ':443@outside.invalid', '/dashboard?tab=help#part']) {
      const destination = getSafeReturnPath(prefix + suffix);
      assert.equal(new URL(destination, origin + '/login').origin, origin);
      assert.equal(new URL(origin + destination).origin, origin);
    }
  }
});

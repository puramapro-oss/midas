import assert from 'node:assert/strict';

export function requireDisposableDatabase(connectionString, disposable) {
  assert.equal(disposable, 'true', 'Disposable database opt-in required');
  assert.equal(typeof connectionString, 'string', 'A disposable PostgreSQL URL is required');
  let url;
  try { url = new URL(connectionString); }
  catch { throw new Error('Invalid disposable PostgreSQL connection URL'); }
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol)
    && ['localhost', '127.0.0.1'].includes(url.hostname)
    && /^\d+$/.test(url.port) && Number(url.port) > 0 && Number(url.port) <= 65535
    && url.pathname === '/midas_ci' && url.search === '' && url.hash === '',
  'Only an explicit local disposable PostgreSQL database without URL options is allowed');
  return connectionString;
}

'use strict';
const { appendFileSync, readFileSync, lstatSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { createServer, request: httpRequest } = require('node:http');
const { connect } = require('node:net');
const path = require('node:path');

const ORIGIN = 'http://127.0.0.1:3000';
const ANON_KEY = 'midas-e2e-anon-no-authority';
const SERVICE_KEY = 'midas-e2e-service-no-authority';
const REDIS_KEY = 'midas-e2e-redis-no-authority';
const COIN_IDS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 'chainlink', 'avalanche-2', 'polygon'];
const PRICE_QUERY = new URLSearchParams({
  ids: COIN_IDS.join(','), vs_currencies: 'usd', include_24hr_change: 'true', include_24hr_vol: 'true',
}).toString();
// Deliberately synthetic values, not market observations.
const PRICES = Object.fromEntries(COIN_IDS.map((id, index) => [id, {
  usd: 100 + index, usd_24h_change: index - 3, usd_24h_vol: 1000 + index,
}]));
const MARKET_URL = 'https://api.coingecko.com/api/v3/simple/price?' + PRICE_QUERY;

function record(file, event) {
  appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n');
}
function createFetchTransport(originalFetch, journal, origin = ORIGIN) {
  const destination = new URL(origin);
  if (destination.protocol !== 'http:' || destination.hostname !== '127.0.0.1'
    || destination.username || destination.password || destination.pathname !== '/' || destination.search || destination.hash) {
    throw new Error('Fixture transport must target an owned IPv4 loopback origin');
  }
  return function fixtureFetch(input, init) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const method = (init?.method ?? input?.method ?? 'GET').toUpperCase();
    const rewrite = target => originalFetch(new Request(target, new Request(input, init)), init);
    // Next 16.4.5 HMR probes this exact URL even with telemetry disabled.
    // Keep metadata explicitly unknown offline; do not invent a current version.
    if (method === 'GET' && url.href === 'https://registry.npmjs.org/-/package/next/dist-tags'
      && init?.body == null && (!(input instanceof Request) || input.body === null)) {
      record(journal, { type: 'fixture', contract: 'next-dev-version-metadata-unavailable', status: 503 });
      return Promise.resolve(new Response(null, { status: 503, headers: { 'cache-control': 'no-store' } }));
    }
    if (method === 'GET' && url.href === MARKET_URL) {
      return rewrite(origin + '/__e2e/coingecko' + url.pathname + url.search);
    }
    if (method === 'GET' && url.href === 'https://api.binance.com/api/v3/ping') {
      return rewrite(origin + '/__e2e/binance' + url.pathname);
    }
    if (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return originalFetch(input, init);
    record(journal, { type: 'unexpected-external-fetch', method, origin: url.origin, pathname: url.pathname });
    return Promise.reject(new TypeError('External request refused by the isolated E2E transport'));
  };
}
function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store',
    'x-supabase-api-version': '2024-01-01' });
  response.end(JSON.stringify(body));
}
async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16384) throw new Error('Fixture body limit exceeded');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function validateFonts(directory, manifest) {
  const fonts = new Map();
  for (const item of manifest.files) {
    if (!/^[a-f0-9]{64}\.woff2$/.test(item.file) || item.sha256 + '.woff2' !== item.file) {
      throw new Error('Invalid pinned font filename');
    }
    const filename = path.join(directory, item.file);
    if (!lstatSync(filename).isFile()) throw new Error('Prepared font must be a regular file');
    const bytes = readFileSync(filename);
    if (bytes.length !== item.bytes || createHash('sha256').update(bytes).digest('hex') !== item.sha256
      || bytes.subarray(0, 4).toString() !== 'wOF2') throw new Error('Pinned font verification failed');
    fonts.set('/__e2e/fonts/' + item.file, bytes);
  }
  return fonts;
}

function createFixtureServer({ journal, fonts = new Map(), appPort = 3001 }) {
  const sockets = new Set();
  const contactQuota = new Map();
  let contacts = 0;
  let ready = false;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, ORIGIN);
    if (!url.pathname.startsWith('/__e2e/')) {
      const upstream = httpRequest({ hostname: '127.0.0.1', port: appPort,
        path: request.url, method: request.method, headers: request.headers }, incoming => {
        if (incoming.statusCode >= 500) {
          record(journal, { type: 'application-5xx', method: request.method, pathname: url.pathname, status: incoming.statusCode });
        }
        response.writeHead(incoming.statusCode, incoming.headers);
        incoming.pipe(response);
      });
      upstream.on('error', error => {
        const expectedStartup = !ready && request.method === 'GET' && url.pathname === '/login' && error.code === 'ECONNREFUSED';
        record(journal, { type: expectedStartup ? 'startup-wait' : 'application-proxy-error',
          method: request.method, pathname: url.pathname, code: error.code });
        if (!response.headersSent) json(response, 502, { error: 'Isolated Next server not ready' });
        else response.destroy();
      });
      request.pipe(upstream);
      return;
    }
    try {
      if (request.method === 'POST' && url.pathname === '/__e2e/redis/pipeline' && !url.search
        && request.headers.authorization === 'Bearer ' + REDIS_KEY) {
        const commands = await body(request);
        // Exact HTTP contract of the locked SDK, for anonymous contact tests
        // only. This in-memory fixture does not execute Lua or qualify Redis.
        const quotaKey = /^midas:rl:global:free:contact:[A-Za-z0-9:.%-]+:\d+$/;
        const valid = Array.isArray(commands) && commands.length > 0 && commands.length <= 10
          && commands.every(command => Array.isArray(command) && (
            (command.length === 10 && command[0] === 'evalsha'
              && command[1] === '977fb636fb5ceb7e98a96d1b3a1272ba018efdae' && command[2] === 3
              && quotaKey.test(command[3]) && quotaKey.test(command[4]) && command[5] === ''
              && command[6] === 30 && Number.isSafeInteger(command[7])
              && Math.abs(command[7] - Date.now()) < 5000 && command[8] === 60000 && command[9] === 1
              && command[3].endsWith(':' + Math.floor(command[7] / 60000))
              && command[4] === command[3].slice(0, command[3].lastIndexOf(':') + 1)
                + (Math.floor(command[7] / 60000) - 1))
            || (command.length === 4 && command[0] === 'zincrby'
              && /^midas:rl:global:free:events:\d+$/.test(command[1]) && command[2] === 1
              && typeof command[3] === 'string' && command[3].length < 512
              && (() => {
                try {
                  const event = JSON.parse(command[3]);
                  return Object.keys(event).sort().join(',') === 'identifier,success'
                    && /^contact:[A-Za-z0-9:.%-]+$/.test(event.identifier) && typeof event.success === 'boolean';
                } catch { return false; }
              })())
          ));
        if (valid) {
          const results = commands.map(command => {
            if (command[0] === 'zincrby') return { result: 1 };
            const used = (contactQuota.get(command[3]) ?? 0) + 1;
            contactQuota.set(command[3], used);
            return { result: [30 - used, 30] };
          });
          record(journal, { type: 'fixture', contract: 'synthetic-contact-quota', status: 200 });
          return json(response, 200, results);
        }
      }
      if (request.method === 'GET' && !url.search && fonts.has(url.pathname)) {
        record(journal, { type: 'fixture', contract: 'pinned-woff2', pathname: url.pathname });
        response.writeHead(200, { 'content-type': 'font/woff2', 'cache-control': 'public, max-age=31536000, immutable' });
        response.end(fonts.get(url.pathname));
        return;
      }
      if (request.method === 'GET' && url.pathname === '/__e2e/coingecko/api/v3/simple/price'
        && url.searchParams.toString() === PRICE_QUERY && request.headers.accept === 'application/json') {
        record(journal, { type: 'fixture', contract: 'synthetic-public-prices', status: 200 });
        return json(response, 200, PRICES);
      }
      if (request.method === 'GET' && url.pathname === '/__e2e/binance/api/v3/ping' && !url.search) {
        record(journal, { type: 'fixture', contract: 'synthetic-public-ping', status: 200 });
        return json(response, 200, {});
      }
      const anon = request.headers.apikey === ANON_KEY;
      const service = request.headers.apikey === SERVICE_KEY;
      if (request.method === 'POST' && url.pathname === '/__e2e/supabase/auth/v1/token'
        && url.search === '?grant_type=password' && anon) {
        const data = await body(request);
        if (typeof data.email === 'string' && typeof data.password === 'string'
          && Object.keys(data).every(key => ['email', 'password', 'gotrue_meta_security'].includes(key))
          && (!data.gotrue_meta_security || Object.keys(data.gotrue_meta_security).length === 0)) {
          record(journal, { type: 'fixture', contract: 'invalid-credentials-only', status: 400 });
          return json(response, 400, { code: 'invalid_credentials', message: 'Invalid login credentials' });
        }
      }
      if (request.method === 'GET' && url.pathname === '/__e2e/supabase/auth/v1/authorize'
        && url.searchParams.get('provider') === 'google'
        && url.searchParams.get('redirect_to') === ORIGIN + '/api/auth/callback'
        && [...url.searchParams.keys()].every(key => ['provider', 'redirect_to', 'code_challenge', 'code_challenge_method'].includes(key))) {
        record(journal, { type: 'fixture', contract: 'oauth-disabled-no-redirect', status: 403 });
        return json(response, 403, { code: 'provider_disabled_for_fixture', message: 'OAuth is not available in this anonymous fixture.' });
      }
      if (request.method === 'GET' && url.pathname === '/__e2e/supabase/rest/v1/faq_articles'
        && service && request.headers['accept-profile'] === 'midas'
        && url.searchParams.get('select') === 'id,category,question,answer,search_keywords,view_count,helpful_count'
        && url.searchParams.get('order') === 'view_count.desc'
        && [...url.searchParams.keys()].length === 2) {
        record(journal, { type: 'fixture', contract: 'empty-public-faq', status: 200 });
        return json(response, 200, []);
      }
      if (request.method === 'POST' && url.pathname === '/__e2e/supabase/rest/v1/contact_messages'
        && service && request.headers['content-profile'] === 'midas' && !url.search) {
        const data = await body(request);
        if (data && Object.keys(data).sort().join(',') === 'email,message,name,subject'
          && Object.values(data).every(value => typeof value === 'string')
          && data.name.length > 0 && data.name.length <= 100
          && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)
          && data.subject.length > 0 && data.subject.length <= 200
          && data.message.length >= 10 && data.message.length <= 5000) {
          contacts++;
          record(journal, { type: 'fixture', contract: 'in-memory-contact-insert', status: 201, count: contacts });
          return json(response, 201, null);
        }
      }
      record(journal, { type: 'unexpected-fixture-request', method: request.method, pathname: url.pathname });
      json(response, 501, { code: 'unexpected_fixture_request', message: 'No fixture contract matches this request.' });
    } catch (error) {
      record(journal, { type: 'fixture-error', method: request.method, pathname: url.pathname, message: error.message });
      json(response, 500, { code: 'fixture_error' });
    }
  });
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (request, socket, head) => {
    if (!request.url.startsWith('/_next/')) {
      record(journal, { type: 'unexpected-upgrade', pathname: new URL(request.url, ORIGIN).pathname });
      socket.destroy();
      return;
    }
    const upstream = connect(appPort, '127.0.0.1', () => {
      const headers = request.rawHeaders.map((value, index, all) =>
        index % 2 ? null : value + ': ' + all[index + 1]).filter(Boolean).join('\r\n');
      upstream.write(request.method + ' ' + request.url + ' HTTP/1.1\r\n' + headers + '\r\n\r\n');
      if (head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
  });
  return { server, markReady: () => { ready = true; }, close: async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  }};
}
module.exports = { ORIGIN, ANON_KEY, SERVICE_KEY, REDIS_KEY, PRICE_QUERY, MARKET_URL, PRICES, record, validateFonts, createFixtureServer, createFetchTransport };

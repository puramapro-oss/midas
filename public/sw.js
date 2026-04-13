/// <reference lib="webworker" />

const CACHE_VERSION = 'midas-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const TRADING_CACHE = `${CACHE_VERSION}-trading`
const API_CACHE = `${CACHE_VERSION}-api`

const STATIC_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days
const TRADING_MAX_AGE = 60 * 60 * 1000 // 1 hour

// Static asset patterns (Cache First)
const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/fonts\//,
  /\.woff2?$/,
  /\.ttf$/,
  /\.ico$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.svg$/,
  /\.webp$/,
  /\/manifest\.json$/,
]

// Trading data endpoints (Network First with cache fallback)
const TRADING_PATTERNS = [
  /\/api\/signals/,
  /\/api\/portfolio/,
  /\/api\/market/,
  /\/api\/prices/,
]

// General API patterns (Network First)
const API_PATTERN = /\/api\//

function isStaticAsset(url) {
  return STATIC_PATTERNS.some((pattern) => pattern.test(url))
}

function isTradingData(url) {
  return TRADING_PATTERNS.some((pattern) => pattern.test(url))
}

function isApiRequest(url) {
  return API_PATTERN.test(url)
}

function isCacheExpired(response, maxAge) {
  const dateHeader = response.headers.get('date') || response.headers.get('sw-cached-at')
  if (!dateHeader) return true
  const cachedAt = new Date(dateHeader).getTime()
  return Date.now() - cachedAt > maxAge
}

function addCacheTimestamp(response) {
  const headers = new Headers(response.headers)
  headers.set('sw-cached-at', new Date().toISOString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// Install — pre-cache minimal shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/offline'])
    )
  )
  self.skipWaiting()
})

// Activate — purge old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('midas-') && key !== STATIC_CACHE && key !== TRADING_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = request.url

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension and other non-http
  if (!url.startsWith('http')) return

  // Cache First — static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached && !isCacheExpired(cached, STATIC_MAX_AGE)) {
            return cached
          }
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                cache.put(request, addCacheTimestamp(response.clone()))
              }
              return response
            })
            .catch(() => cached || new Response('', { status: 503 }))
        })
      )
    )
    return
  }

  // Network First — trading data
  if (isTradingData(url)) {
    event.respondWith(
      caches.open(TRADING_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, addCacheTimestamp(response.clone()))
            }
            return response
          })
          .catch(() =>
            cache.match(request).then((cached) => {
              if (cached && !isCacheExpired(cached, TRADING_MAX_AGE)) {
                return cached
              }
              return new Response(
                JSON.stringify({ error: 'offline', cached: false }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' },
                }
              )
            })
          )
      )
    )
    return
  }

  // Network First — general API
  if (isApiRequest(url)) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, addCacheTimestamp(response.clone()))
            }
            return response
          })
          .catch(() =>
            cache.match(request).then(
              (cached) =>
                cached ||
                new Response(
                  JSON.stringify({ error: 'offline' }),
                  {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                  }
                )
            )
          )
      )
    )
    return
  }

  // Navigation — network first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline').then((r) => r || new Response('Offline', { status: 503 })))
    )
  }
})

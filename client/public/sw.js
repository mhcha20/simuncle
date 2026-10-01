// SIM uncle Service Worker
// Handles: PWA caching (offline support) + Web Push Notifications
// v6: page loads never fail with a browser error screen; if the network is down they fall back to a cached page or a small offline page
// v5: Removed CloudFront CDN cache (all images now served via /manus-storage/ proxy with proper Cache-Control)

const CACHE_NAME = 'simuncle-v6';
const STATIC_CACHE = 'simuncle-static-v6';
const ALL_CACHES = [CACHE_NAME, STATIC_CACHE];

// ─── Install: skip waiting immediately ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// ─── Activate: claim clients & purge ALL old caches ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !ALL_CACHES.includes(n))
            .map((n) => {
              console.log('[SW] Deleting old cache:', n);
              return caches.delete(n);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: strict caching — JS/CSS NEVER get index.html fallback ─────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Never cache API calls
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // Only handle same-origin from here
  if (url.origin !== self.location.origin) return;

  // ── Static assets (manus-storage images, icons): cache-first ─────────────
  // /manus-storage/ images are served with Cache-Control: public, max-age=86400
  // SW provides an additional offline cache layer
  if (
    url.pathname.startsWith('/manus-storage/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // ── JS/CSS bundles (/assets/*): stale-while-revalidate ───────────────────
  // CRITICAL: NEVER fallback to index.html for JS/CSS — that breaks React bootstrap
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((response) => {
          // Only cache valid JS/CSS responses (not HTML error pages)
          const ct = response.headers.get('content-type') || '';
          if (response.ok && (ct.includes('javascript') || ct.includes('css') || ct.includes('wasm'))) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => {
          // If network fails and we have a cached version, use it
          // If no cache, return 404 — do NOT fallback to index.html
          return cached || new Response('// network error', {
            status: 503,
            headers: { 'Content-Type': 'application/javascript' }
          });
        });
        // Return cached immediately if available, revalidate in background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── HTML navigation (mode === 'navigate'): network-first ─────────────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(async () => {
          const cached = (await caches.match(request)) || (await caches.match('/'));
          if (cached) return cached;
          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SIM uncle</title></head>' +
            '<body style="font-family:-apple-system,Arial,sans-serif;text-align:center;padding:48px 24px;color:#374151">' +
            '<h2>連線失敗 Connection problem</h2><p>請檢查網絡後重試。Please check your connection and try again.</p>' +
            '<p><a href="" onclick="location.reload();return false" style="color:#16a34a">重新載入 Reload</a></p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // All other requests: network-only (no caching)
});

// ─── Web Push Notifications ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'SIM uncle', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'SIM uncle', {
      body: payload.body || '',
      icon: '/manus-storage/icon-192x192_4bcb6a0b.png',
      badge: '/manus-storage/icon-72x72_3ab4ed22.png',
      data: { url: payload.url || '/' },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

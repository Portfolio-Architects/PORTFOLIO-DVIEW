const CACHE_NAME = 'dview-cache-v-1782396861898';
const DYNAMIC_CACHE_NAME = 'dview-dynamic-v-1782396861898';

// 1. Install & Activate
self.addEventListener('install', (event) => {
  // Removed self.skipWaiting() to prevent unexpected hard-reloads of open tabs
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.webmanifest?v=10',
        '/icon-192x192.png',
        '/icon-512x512.png',
        '/d-view-icon.png',
        '/offline.html',
        '/data/apartments-by-dong.json',
        '/data/coordinate-corrections.json',
        '/data/local-ads.json',
        '/data/local-events.json',
        '/data/location-scores.json',
        '/data/macro-trend.json',
        '/data/public-prices.json',
        '/data/type-map.json',
        '/tx-data/_index.json'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache timestamp helper
function addCacheTimestamp(res) {
  if (!res) return res;
  try {
    const newHeaders = new Headers(res.headers);
    newHeaders.set('x-sw-cached-at', Date.now().toString());
    const clone = res.clone();
    return new Response(clone.body, {
      status: clone.status,
      statusText: clone.statusText,
      headers: newHeaders
    });
  } catch (err) {
    return res;
  }
}

// Expire warning notifier
function checkCacheExpiration(cachedRes, req) {
  if (!cachedRes) return;
  const cachedAt = cachedRes.headers.get('x-sw-cached-at');
  if (cachedAt) {
    const age = Date.now() - parseInt(cachedAt, 10);
    const EXPIRATION_LIMIT = 24 * 60 * 60 * 1000; // 24시간 만료 임계값
    if (age > EXPIRATION_LIMIT) {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'CACHE_EXPIRED_WARNING',
            url: req.url,
            ageMs: age
          });
        });
      });
    }
  }
}

// 2. Fetch (Advanced Caching: Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests or cross-origin (unless specific APIs)
  if (req.method !== 'GET') return;

  // Static Assets (Next.js build files, images) -> Cache First, Network Fallback
  if (url.pathname.startsWith('/_next/') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        if (cachedRes) return cachedRes;
        return fetch(req).then((networkRes) => {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, addCacheTimestamp(clone)));
          return networkRes;
        });
      })
    );
    return;
  }
  
  // Static Data & JSON files (e.g. /data/*.json, /tx-data/*.json) -> Stale-While-Revalidate
  // 단, 용량이 크고 실시간 데이터와 정합이 중요한 tx-summary.json은 캐싱 레이턴시 배제를 위해 SWR 캐시에서 제외합니다.
  if ((url.pathname.includes('/data/') || url.pathname.includes('/tx-data/') || url.pathname.endsWith('.json')) && !url.pathname.includes('tx-summary.json')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        return cache.match(req).then((cachedRes) => {
          const fetchPromise = fetch(req).then((networkRes) => {
            if (networkRes.status === 200) {
              cache.put(req, addCacheTimestamp(networkRes.clone()));
            }
            return networkRes;
          }).catch(() => null);

          if (cachedRes) {
            checkCacheExpiration(cachedRes, req);
            return cachedRes;
          }
          return fetchPromise;
        });
      })
    );
    return;
  }

  // Default: Network First, Fallback to Cache (and save to Dynamic Cache on success)
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // Cache successful GET requests for same origin, excluding admin pages/APIs
        if (
          req.method === 'GET' && 
          networkRes.status === 200 && 
          url.origin === location.origin &&
          !url.pathname.includes('/admin')
        ) {
          const clone = networkRes.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(req, addCacheTimestamp(clone)));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) {
            checkCacheExpiration(cachedRes, req);
            return cachedRes;
          }
          // Fallback to offline.html if navigation fails
          if (req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// --- Background Sync ---
const DB_NAME = 'dview-offline-db';
const STORE_NAME = 'sync-queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getOfflineMutations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => a.timestamp - b.timestamp));
    req.onerror = () => reject(req.error);
  });
}

async function deleteMutation(id) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
  });
}

async function updateMutation(mutation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(mutation);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function handleSyncFailure(m) {
  m.retries = (m.retries || 0) + 1;
  if (m.retries > 5) {
    await deleteMutation(m.id);
    console.error(`[SW Sync] Mutation discarded after 5 failed retries: ${m.id}`);
  } else {
    const jitter = Math.random() * 1000;
    const delay = 1000 * Math.pow(2, m.retries) + jitter;
    m.nextAttempt = Date.now() + delay;
    await updateMutation(m);
    console.warn(`[SW Sync] Mutation failed (Retry #${m.retries}). Next attempt in ${Math.round(delay)}ms`);
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(
      (async () => {
        try {
          const mutations = await getOfflineMutations();
          const now = Date.now();
          for (const m of mutations) {
            // Check nextAttempt timing boundary
            if (m.nextAttempt && m.nextAttempt > now) {
              continue;
            }

            if (m.type === 'API_REQUEST') {
              try {
                const res = await fetch(m.payload.url, {
                  method: m.payload.method,
                  headers: m.payload.headers,
                  body: JSON.stringify(m.payload.body)
                });

                if (res.ok) {
                  await deleteMutation(m.id);
                  console.log(`[SW Sync] Successfully replayed mutation: ${m.id}`);
                } else {
                  if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                    await deleteMutation(m.id);
                    console.warn(`[SW Sync] Discarded mutation due to client error (${res.status}): ${m.id}`);
                  } else {
                    await handleSyncFailure(m);
                  }
                }
              } catch (err) {
                await handleSyncFailure(m);
              }
            }
          }
        } catch (err) {
          console.error('Background Sync failed', err);
        }
      })()
    );
  }
});

// --- Web Push Notifications ---
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'D-VIEW 알림';
      const options = {
        body: data.body || '새로운 변동사항이 있습니다.',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' }
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      // If plain text
      event.waitUntil(
        self.registration.showNotification('D-VIEW', {
          body: event.data.text(),
          icon: '/icon-192x192.png'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const origin = location.origin;
  const targetUrl = event.notification.data?.url || '/';
  const absoluteTargetUrl = new URL(targetUrl, origin).toString();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. First, check if there is an exact URL match open
      for (const client of clientList) {
        if (client.url === absoluteTargetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. Otherwise, find any open tab on the same origin, focus and navigate it
      for (const client of clientList) {
        const clientUrlObj = new URL(client.url, origin);
        if (clientUrlObj.origin === origin && 'focus' in client && 'navigate' in client) {
          client.focus();
          return client.navigate(absoluteTargetUrl);
        }
      }
      // 3. Or open a new window if no tabs are open
      if (clients.openWindow) {
        return clients.openWindow(absoluteTargetUrl);
      }
    })
  );
});

// --- Message handling for updates ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


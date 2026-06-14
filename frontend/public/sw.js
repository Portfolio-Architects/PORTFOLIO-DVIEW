const CACHE_NAME = 'dview-cache-v-1781449254780';
const DYNAMIC_CACHE_NAME = 'dview-dynamic-v-1781449254780';

// 1. Install & Activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.webmanifest?v=10',
        '/icon-192x192.png',
        '/icon-512x512.png',
        '/d-view-icon.png'
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
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return networkRes;
        });
      })
    );
    return;
  }
  // Static Data & JSON files (e.g. /data/*.json, /tx-data/*.json) -> Stale-While-Revalidate
  if (url.pathname.includes('/data/') || url.pathname.includes('/tx-data/') || url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        return cache.match(req).then((cachedRes) => {
          const fetchPromise = fetch(req).then((networkRes) => {
            if (networkRes.status === 200) {
              cache.put(req, networkRes.clone());
            }
            return networkRes;
          }).catch(() => null);
          return cachedRes || fetchPromise;
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
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      })
      .catch(() => caches.match(req))
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

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(
      (async () => {
        try {
          const mutations = await getOfflineMutations();
          for (const m of mutations) {
            // Replay the request
            // We assume payload contains URL, method, headers, and body
            if (m.type === 'API_REQUEST') {
              await fetch(m.payload.url, {
                method: m.payload.method,
                headers: m.payload.headers,
                body: JSON.stringify(m.payload.body)
              });
              await deleteMutation(m.id);
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
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Or open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});


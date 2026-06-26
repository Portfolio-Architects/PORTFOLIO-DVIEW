const DB_NAME = 'dview-offline-db';
const STORE_NAME = 'sync-queue';
import { logger } from '@/lib/services/logger';

export interface OfflineRequestPayload {
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body: unknown;
}

export interface OfflineMutation {
  id: string;
  type: 'API_REQUEST';
  payload: OfflineRequestPayload;
  timestamp: number;
  retries?: number;
  nextAttempt?: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const target = e.target as IDBOpenDBRequest;
      const db = target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: Event) => {
      const target = e.target as IDBOpenDBRequest;
      resolve(target.result);
    };
    request.onerror = (e: Event) => {
      const target = e.target as IDBOpenDBRequest;
      reject(target.error);
    };
  });
}

/**
 * Enqueues a failed or offline HTTP request to IndexedDB for Background Sync replay.
 */
export async function enqueueOfflineRequest(payload: OfflineRequestPayload): Promise<void> {
  const db = await openDB();
  const mutation: OfflineMutation = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type: 'API_REQUEST',
    payload,
    timestamp: Date.now(),
    retries: 0,
    nextAttempt: Date.now()
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(mutation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  logger.info('OfflineSync', 'Request enqueued to offline DB', { id: mutation.id, url: payload.url });

  // Register background sync if service worker is active and sync is supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const syncReg = (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
      if (syncReg) {
        await syncReg.register('sync-mutations');
        logger.info('OfflineSync', 'Registered sync-mutations tag in Service Worker');
      }
    } catch (err) {
      logger.warn('OfflineSync', 'Background Sync registration failed, will rely on next online event', {}, err as Error);
    }
  }
}

/**
 * Safely triggers offline mutation sync manually (primarily for browsers without SyncManager, e.g. Safari).
 */
export async function retryOfflineRequests(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  try {
    const db = await openDB();
    const mutations = await new Promise<OfflineMutation[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a: OfflineMutation, b: OfflineMutation) => a.timestamp - b.timestamp));
      req.onerror = () => reject(req.error);
    });

    const now = Date.now();
    for (const m of mutations) {
      if (m.nextAttempt && m.nextAttempt > now) continue;

      if (m.type === 'API_REQUEST') {
        try {
          const res = await fetch(m.payload.url, {
            method: m.payload.method,
            headers: {
              'Content-Type': 'application/json',
              ...m.payload.headers,
            },
            body: JSON.stringify(m.payload.body),
          });

          if (res.ok) {
            await new Promise<void>((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              const req = store.delete(m.id);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
            logger.info('OfflineSync', 'Manual sync replayed successfully', { id: m.id });
          } else {
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
              await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.delete(m.id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
              });
              logger.warn('OfflineSync', `Manual sync discarded (Client Error ${res.status})`, { id: m.id });
            } else {
              await handleManualSyncFailure(db, m);
            }
          }
        } catch (err: unknown) {
          await handleManualSyncFailure(db, m);
        }
      }
    }
  } catch (err: unknown) {
    logger.error('OfflineSync', 'Manual queue processing failed', {}, err instanceof Error ? err : new Error(String(err)));
  }
}

async function handleManualSyncFailure(db: IDBDatabase, m: OfflineMutation): Promise<void> {
  m.retries = (m.retries || 0) + 1;
  if (m.retries > 5) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(m.id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    logger.error('OfflineSync', 'Manual sync discarded after 5 retries', { id: m.id });
  } else {
    const jitter = Math.random() * 1000;
    const delay = 1000 * Math.pow(2, m.retries) + jitter;
    m.nextAttempt = Date.now() + delay;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(m);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    logger.warn('OfflineSync', `Manual sync failed (Retry #${m.retries}). Next in ${Math.round(delay)}ms`, { id: m.id });
  }
}

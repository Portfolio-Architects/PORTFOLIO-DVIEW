const DB_NAME = 'dview-offline-db';
const STORE_NAME = 'sync-queue';

export interface OfflineRequestPayload {
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body: any;
}

export interface OfflineMutation {
  id: string;
  type: 'API_REQUEST';
  payload: OfflineRequestPayload;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e: any) => reject(e.target.error);
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
    timestamp: Date.now()
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(mutation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  console.log('[OfflineSync] Request enqueued to offline DB:', mutation);

  // Register background sync if service worker is active and sync is supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const syncReg = (registration as any).sync;
      if (syncReg) {
        await syncReg.register('sync-mutations');
        console.log('[OfflineSync] Registered sync-mutations tag in Service Worker');
      }
    } catch (err) {
      console.warn('[OfflineSync] Background Sync registration failed, will rely on next online event', err);
    }
  }
}

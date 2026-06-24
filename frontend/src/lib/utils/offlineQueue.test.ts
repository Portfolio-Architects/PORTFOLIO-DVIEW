import {
  enqueueOfflineRequest,
  retryOfflineRequests,
  OfflineRequestPayload,
  OfflineMutation,
} from './offlineQueue';

// Mock MockIDB classes
class MockIDBRequest {
  onsuccess: any = null;
  onerror: any = null;
  result: any = null;
  error: any = null;
}

class MockIDBTransaction {
  store: MockIDBObjectStore;
  constructor(store: MockIDBObjectStore) {
    this.store = store;
  }
  objectStore() {
    return this.store;
  }
}

class MockIDBObjectStore {
  data: Map<string, any>;
  constructor(data: Map<string, any>) {
    this.data = data;
  }
  add(item: any) {
    this.data.set(item.id, item);
    const req = new MockIDBRequest();
    req.result = item.id;
    setTimeout(() => req.onsuccess?.({ target: req }), 0);
    return req;
  }
  getAll() {
    const req = new MockIDBRequest();
    req.result = Array.from(this.data.values());
    setTimeout(() => req.onsuccess?.({ target: req }), 0);
    return req;
  }
  put(item: any) {
    this.data.set(item.id, item);
    const req = new MockIDBRequest();
    req.result = item.id;
    setTimeout(() => req.onsuccess?.({ target: req }), 0);
    return req;
  }
  delete(id: string) {
    this.data.delete(id);
    const req = new MockIDBRequest();
    setTimeout(() => req.onsuccess?.({ target: req }), 0);
    return req;
  }
}

class MockIDBDatabase {
  store: MockIDBObjectStore;
  constructor(store: MockIDBObjectStore) {
    this.store = store;
  }
  transaction() {
    return new MockIDBTransaction(this.store);
  }
}

describe('offlineQueue Utility', () => {
  let mockStoreData: Map<string, any>;
  let mockDb: MockIDBDatabase;
  let mockSyncRegister: jest.Mock;
  let originalFetch: typeof fetch;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    mockStoreData = new Map();
    const store = new MockIDBObjectStore(mockStoreData);
    mockDb = new MockIDBDatabase(store);

    originalIndexedDB = window.indexedDB;
    originalFetch = global.fetch;

    // Mock window.indexedDB.open
    const mockOpen = jest.fn().mockImplementation(() => {
      const req = new MockIDBRequest();
      req.result = mockDb;
      setTimeout(() => req.onsuccess?.({ target: req }), 0);
      return req;
    });

    Object.defineProperty(window, 'indexedDB', {
      value: { open: mockOpen },
      configurable: true,
      writable: true,
    });

    // Mock navigator.serviceWorker and SyncManager
    mockSyncRegister = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          sync: {
            register: mockSyncRegister,
          },
        }),
      },
      configurable: true,
      writable: true,
    });

    (window as any).SyncManager = {};

    // Mock fetch
    global.fetch = jest.fn();

    // Mock online state
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'indexedDB', {
      value: originalIndexedDB,
      configurable: true,
      writable: true,
    });
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('enqueueOfflineRequest', () => {
    it('should successfully add request payload to IndexedDB sync-queue', async () => {
      const payload: OfflineRequestPayload = {
        url: '/api/v1/posts',
        method: 'POST',
        body: { title: 'New Curation' },
      };

      await enqueueOfflineRequest(payload);

      expect(mockStoreData.size).toBe(1);
      const mutation = Array.from(mockStoreData.values())[0] as OfflineMutation;
      expect(mutation.type).toBe('API_REQUEST');
      expect(mutation.payload).toEqual(payload);
      expect(mutation.retries).toBe(0);
      expect(mockSyncRegister).toHaveBeenCalledWith('sync-mutations');
    });

    it('should fall back gracefully if Service Worker sync is not supported', async () => {
      // Remove sync support
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        configurable: true,
        writable: true,
      });

      const payload: OfflineRequestPayload = {
        url: '/api/v1/posts',
        method: 'POST',
        body: { title: 'New Curation' },
      };

      await enqueueOfflineRequest(payload);

      expect(mockStoreData.size).toBe(1);
      expect(mockSyncRegister).not.toHaveBeenCalled();
    });
  });

  describe('retryOfflineRequests', () => {
    it('should not run if navigator is offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true,
      });

      mockStoreData.set('req-123', {
        id: 'req-123',
        type: 'API_REQUEST',
        payload: { url: '/api/test', method: 'GET', body: null },
        timestamp: Date.now(),
      });

      await retryOfflineRequests();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockStoreData.size).toBe(1); // request remains in queue
    });

    it('should replay enqueued requests and delete them on 200 OK success', async () => {
      const payload = { url: '/api/test', method: 'POST', body: { x: 1 } };
      mockStoreData.set('req-123', {
        id: 'req-123',
        type: 'API_REQUEST',
        payload,
        timestamp: Date.now(),
        retries: 0,
        nextAttempt: Date.now() - 1000, // in the past
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await retryOfflineRequests();

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: 1 }),
      });
      expect(mockStoreData.size).toBe(0); // successfully deleted
    });

    it('should increment retries and calculate backoff delay on network failures (e.g. 500 Server Error)', async () => {
      const payload = { url: '/api/test', method: 'POST', body: { x: 1 } };
      mockStoreData.set('req-123', {
        id: 'req-123',
        type: 'API_REQUEST',
        payload,
        timestamp: Date.now(),
        retries: 1,
        nextAttempt: Date.now() - 1000,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await retryOfflineRequests();

      expect(mockStoreData.size).toBe(1);
      const m = mockStoreData.get('req-123') as OfflineMutation;
      expect(m.retries).toBe(2);
      expect(m.nextAttempt).toBeGreaterThan(Date.now());
    });

    it('should discard and delete requests that fail with client-side error (e.g. 400 Bad Request)', async () => {
      const payload = { url: '/api/test2', method: 'PUT', body: null };
      mockStoreData.set('req-400', {
        id: 'req-400',
        type: 'API_REQUEST',
        payload,
        timestamp: Date.now(),
        retries: 0,
        nextAttempt: Date.now() - 1000,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      });

      await retryOfflineRequests();

      expect(mockStoreData.size).toBe(0); // discarded
    });

    it('should discard requests that exceed max retries (retries > 5)', async () => {
      const payload = { url: '/api/test-limit', method: 'GET', body: null };
      mockStoreData.set('req-limit', {
        id: 'req-limit',
        type: 'API_REQUEST',
        payload,
        timestamp: Date.now(),
        retries: 5,
        nextAttempt: Date.now() - 1000,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 502,
      });

      await retryOfflineRequests();

      expect(mockStoreData.size).toBe(0); // discarded after exceeding 5 retries
    });
  });
});

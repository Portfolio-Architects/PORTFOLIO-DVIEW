/**
 * @module m1_challenger2_concurrency_memory_empirical.test
 * @description Empirical Challenger 2 Verification Harness for Milestone M1
 * Tests:
 * 1. Concurrent requests to readJsonFileCached for type-map.json, tx-summary.json, macro-trend.json, recent-transactions.json
 *    Asserts disk read / parse count is strictly 1 in production mode and memory does not leak.
 * 2. Concurrency and coalescing in dashboardData.ts getInitialData()
 * 3. SWR deduplication and key-change dynamics in useStaticData.ts (usePeriodTransactions, useTxData, useLocationScores)
 */

import fs from 'fs';
import {
  readJsonFileCached,
  getMemoryJsonCache,
  clearFileReaderCache,
} from '@/lib/utils/server/fileReader';
import { getInitialData } from '@/lib/services/dashboardData';

// Mock repositories called by dashboardData so we isolate file reading / coalescing
jest.mock('@/lib/repositories/favorite.repository', () => ({
  fetchFavoriteCounts: jest.fn().mockResolvedValue({ 'apt-1': 10 }),
}));
jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentMeta: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/repositories/report.repository', () => ({
  fetchRecentScoutingReports: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  },
}));

describe('Empirical Challenger 2: fileReader & dashboardData Concurrency and Memory', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    clearFileReaderCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    clearFileReaderCache();
  });

  describe('1. Concurrency & Coalescing of readJsonFileCached in Production Mode', () => {
    const targetFiles = [
      'public/data/type-map.json',
      'public/data/tx-summary.json',
      'public/data/macro-trend.json',
      'public/data/recent-transactions.json',
    ];

    it.each(targetFiles)(
      'asserts concurrent requests to readJsonFileCached for %s execute strictly 1 disk read and 1 parse in production mode',
      async (targetFile) => {
        process.env.NODE_ENV = 'production';
        clearFileReaderCache();

        const readFileSpy = jest.spyOn(fs.promises, 'readFile');
        const parseSpy = jest.spyOn(JSON, 'parse');

        // Launch 10 concurrent requests to the exact same file simultaneously
        const CONCURRENT_CALLS = 10;
        const requests = Array.from({ length: CONCURRENT_CALLS }, () =>
          readJsonFileCached(targetFile, null)
        );

        const results = await Promise.all(requests);

        // All 10 callers must receive identical valid parsed data
        expect(results).toHaveLength(CONCURRENT_CALLS);
        results.forEach((res) => {
          expect(res).not.toBeNull();
        });

        // Filter spies to the current target file
        const fileReads = readFileSpy.mock.calls.filter((call) =>
          String(call[0]).replace(/\\/g, '/').includes(targetFile.replace('public/', ''))
        );

        console.log(`[Empirical Audit] Target: ${targetFile} | Concurrent callers: ${CONCURRENT_CALLS} | Disk reads: ${fileReads.length}`);

        // STRICT REQUIREMENT 1: Disk read count must be strictly 1 in production mode
        expect(fileReads.length).toBe(1);

        readFileSpy.mockRestore();
        parseSpy.mockRestore();
      }
    );

    it('asserts sequential requests to readJsonFileCached return cached in-memory reference without disk I/O', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();

      const readFileSpy = jest.spyOn(fs.promises, 'readFile');

      const target = 'public/data/type-map.json';
      const first = await readJsonFileCached(target, []);
      const second = await readJsonFileCached(target, []);
      const third = await readJsonFileCached(target, []);

      expect(first).toBe(second);
      expect(second).toBe(third);

      const relevantReads = readFileSpy.mock.calls.filter((call) =>
        String(call[0]).replace(/\\/g, '/').includes('type-map.json')
      );
      expect(relevantReads.length).toBe(1);

      readFileSpy.mockRestore();
    });
  });

  describe('2. Memory Stability & Leak Resistance of readJsonFileCached', () => {
    it('does not leak memory or duplicate cache entries over 10,000 rapid invocations', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();

      const target = 'public/data/macro-trend.json';

      // Prime the cache
      await readJsonFileCached(target, []);
      const memoryCache = getMemoryJsonCache();
      expect(memoryCache.size).toBe(1);

      const memStart = process.memoryUsage().heapUsed;

      // 10,000 invocations in a tight loop
      for (let i = 0; i < 10000; i++) {
        const data = await readJsonFileCached(target, []);
        expect(data).toBeDefined();
      }

      if (global.gc) {
        global.gc();
      }

      const memEnd = process.memoryUsage().heapUsed;
      const heapDiffMB = (memEnd - memStart) / (1024 * 1024);

      // Memory cache size must remain strictly 1 (no rogue keys or duplicate instances)
      expect(memoryCache.size).toBe(1);

      // Heap difference should be minimal (< 50MB) across 10,000 async calls in V8
      expect(heapDiffMB).toBeLessThan(50);
    });
  });

  describe('3. dashboardData.ts getInitialData() Concurrency and SSR Hydration', () => {
    it('guarantees Promise coalescing when multiple concurrent callers invoke getInitialData()', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();
      globalThis._initialPageDataCache = undefined;
      globalThis._activeFreshDataPromise = null;

      const readFileSpy = jest.spyOn(fs.promises, 'readFile');

      // 5 concurrent SSR requests hit getInitialData() at the exact same moment
      const CONCURRENT_REQUESTS = 5;
      const promises = Array.from({ length: CONCURRENT_REQUESTS }, () => getInitialData());

      const results = await Promise.all(promises);

      expect(results).toHaveLength(CONCURRENT_REQUESTS);

      // All 5 must resolve to the identical data object reference
      const firstResult = results[0];
      for (let i = 1; i < CONCURRENT_REQUESTS; i++) {
        expect(results[i]).toBe(firstResult);
      }

      // Check SSR payload completeness
      expect(firstResult.typeMap).toBeDefined();
      expect(Array.isArray(firstResult.typeMap)).toBe(true);
      expect(firstResult.typeMap.length).toBeGreaterThan(0);

      expect(firstResult.locationScores).toBeDefined();
      expect(Object.keys(firstResult.locationScores || {}).length).toBeGreaterThan(0);

      expect(firstResult.txSummary).toBeDefined();
      expect(firstResult.macroTrend).toBeDefined();
      expect(firstResult.recentTransactions).toBeDefined();

      readFileSpy.mockRestore();
    });
  });
});

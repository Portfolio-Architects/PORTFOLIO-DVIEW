/**
 * @module m1_challenger2_error_resilience.test
 * @description Empirical Challenger 2 Verification Harness for Error Resilience & In-Flight Promise Cleanup
 * Verifies:
 * 1. If a file read fails (e.g. ENOENT / I/O error), readJsonFileCached returns fallback and cleans up inFlightPromises.
 * 2. Concurrent callers awaiting a failing read all receive fallback without unhandled rejection.
 * 3. Subsequent retry after failure successfully executes new read without getting stuck on rejected promise.
 * 4. Corrupted JSON parse error cleans up inFlightPromises and allows clean retry.
 * 5. dashboardData.ts getInitialData() clears _activeFreshDataPromise on failure, allowing retry.
 */

import fs from 'fs';
import {
  readJsonFileCached,
  getMemoryJsonCache,
  getInFlightFilePromises,
  clearFileReaderCache,
} from '@/lib/utils/server/fileReader';
import { getInitialData } from '@/lib/services/dashboardData';

jest.mock('@/lib/repositories/favorite.repository', () => ({
  fetchFavoriteCounts: jest.fn().mockResolvedValue({}),
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

describe('Empirical Challenger 2: Error Resilience & In-Flight Promise Cleanup', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    clearFileReaderCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    clearFileReaderCache();
  });

  describe('1. readJsonFileCached Error Cleanup & Retry Resilience', () => {
    it('cleans up in-flight promise and memory cache when disk read fails, returning fallback', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();

      const testPath = 'public/data/failing-test-target.json';
      const fallback = { status: 'fallback_default' };

      const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockRejectedValueOnce(
        new Error('ENOENT: no such file or directory')
      );

      const result = await readJsonFileCached(testPath, fallback);

      // Must return fallback gracefully
      expect(result).toEqual(fallback);

      // In-flight promise map must be completely clean (no leftover rejected promise)
      const inFlight = getInFlightFilePromises();
      expect(inFlight.has(testPath)).toBe(false);
      expect(inFlight.size).toBe(0);

      // Memory cache must NOT contain an entry for the failed path
      const memCache = getMemoryJsonCache();
      expect(memCache.has(testPath)).toBe(false);

      readFileSpy.mockRestore();
    });

    it('coalesces concurrent callers on failure, returns fallback to all, and cleans up completely', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();

      const testPath = 'public/data/concurrent-fail.json';
      const fallback = { fallback: true };

      let rejectFn: (err: Error) => void;
      const delayedErrorPromise = new Promise<string>((_, reject) => {
        rejectFn = reject;
      });

      const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockImplementationOnce(() => delayedErrorPromise);

      // Launch 5 concurrent callers
      const calls = Array.from({ length: 5 }, () => readJsonFileCached(testPath, fallback));

      // In-flight promise must be active while pending
      const inFlight = getInFlightFilePromises();
      expect(inFlight.has(testPath)).toBe(true);

      // Trigger failure
      rejectFn!(new Error('Disk read timeout error'));

      const results = await Promise.all(calls);

      // All 5 callers receive fallback safely
      expect(results).toHaveLength(5);
      results.forEach((r) => expect(r).toEqual(fallback));

      // After resolution, in-flight promise is removed
      expect(inFlight.has(testPath)).toBe(false);

      // Disk read was only attempted ONCE across all 5 callers
      expect(readFileSpy).toHaveBeenCalledTimes(1);

      readFileSpy.mockRestore();
    });

    it('allows clean retry after previous failure and caches successful response', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();

      const testPath = 'public/data/retry-test.json';
      const fallback = { status: 'failed' };
      const successData = { status: 'recovered_successfully', value: 42 };

      const readFileSpy = jest.spyOn(fs.promises, 'readFile');

      // Call 1: fails
      readFileSpy.mockRejectedValueOnce(new Error('Temporary EIO error'));
      const failResult = await readJsonFileCached(testPath, fallback);
      expect(failResult).toEqual(fallback);
      expect(getInFlightFilePromises().has(testPath)).toBe(false);
      expect(getMemoryJsonCache().has(testPath)).toBe(false);

      // Call 2 (Retry): succeeds
      readFileSpy.mockResolvedValueOnce(JSON.stringify(successData));
      const retryResult = await readJsonFileCached(testPath, fallback);
      expect(retryResult).toEqual(successData);
      expect(getInFlightFilePromises().has(testPath)).toBe(false);
      expect(getMemoryJsonCache().get(testPath)).toEqual(successData);

      // Call 3: served from memory cache without disk read
      const cachedResult = await readJsonFileCached(testPath, fallback);
      expect(cachedResult).toBe(retryResult);
      expect(readFileSpy).toHaveBeenCalledTimes(2); // 1 fail + 1 success, 0 for 3rd call

      readFileSpy.mockRestore();
    });

    it('cleans up in-flight promise when JSON.parse throws syntax error and permits subsequent retry', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();

      const testPath = 'public/data/corrupted.json';
      const fallback = [];
      const recoveredData = [{ id: 1, name: 'valid' }];

      const readFileSpy = jest.spyOn(fs.promises, 'readFile');

      // Call 1: Corrupted JSON
      readFileSpy.mockResolvedValueOnce('{ invalid json content: [ ]');
      const corruptedResult = await readJsonFileCached(testPath, fallback);
      expect(corruptedResult).toEqual(fallback);
      expect(getInFlightFilePromises().has(testPath)).toBe(false);
      expect(getMemoryJsonCache().has(testPath)).toBe(false);

      // Call 2: Recovered valid JSON
      readFileSpy.mockResolvedValueOnce(JSON.stringify(recoveredData));
      const recoveredResult = await readJsonFileCached(testPath, fallback);
      expect(recoveredResult).toEqual(recoveredData);
      expect(getMemoryJsonCache().get(testPath)).toEqual(recoveredData);

      readFileSpy.mockRestore();
    });
  });

  describe('2. dashboardData.ts getInitialData() In-Flight Promise Error Cleanup', () => {
    it('resets _activeFreshDataPromise to null on failure so subsequent calls can retry', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();
      globalThis._initialPageDataCache = undefined;
      globalThis._activeFreshDataPromise = null;

      // Mock readJsonFileCached to throw during fetchFreshData
      const readFileSpy = jest.spyOn(fs.promises, 'readFile');
      readFileSpy.mockRejectedValueOnce(new Error('Fatal disk read error'));

      // First call: should complete without holding _activeFreshDataPromise forever
      const res1 = await getInitialData();
      expect(res1).toBeDefined();

      // Ensure active fresh data promise was reset to null in finally
      expect(globalThis._activeFreshDataPromise).toBeNull();

      // Subsequent call: can execute again cleanly
      const res2 = await getInitialData();
      expect(res2).toBeDefined();
      expect(globalThis._activeFreshDataPromise).toBeNull();

      readFileSpy.mockRestore();
    });
  });
});

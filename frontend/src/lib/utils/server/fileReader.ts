import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/services/logger';

interface StaticDataCacheEntry<T> {
  data: T;
  mtimeMs: number;
}

declare global {
  var _globalStaticDataCache: Record<string, StaticDataCacheEntry<unknown>> | undefined;
  var _globalStaticJsonMapCache: Map<string, unknown> | undefined;
  var _globalInFlightFilePromises: Map<string, Promise<unknown>> | undefined;
}

const getGlobalStaticDataCache = (): Record<string, StaticDataCacheEntry<unknown>> => {
  if (!globalThis._globalStaticDataCache) {
    globalThis._globalStaticDataCache = {};
  }
  return globalThis._globalStaticDataCache;
};

export const getMemoryJsonCache = (): Map<string, unknown> => {
  if (!globalThis._globalStaticJsonMapCache) {
    globalThis._globalStaticJsonMapCache = new Map<string, unknown>();
  }
  return globalThis._globalStaticJsonMapCache;
};

export const getInFlightFilePromises = (): Map<string, Promise<unknown>> => {
  if (!globalThis._globalInFlightFilePromises) {
    globalThis._globalInFlightFilePromises = new Map<string, Promise<unknown>>();
  }
  return globalThis._globalInFlightFilePromises;
};

export function clearFileReaderCache(): void {
  getMemoryJsonCache().clear();
  getInFlightFilePromises().clear();
  if (globalThis._globalStaticDataCache) {
    globalThis._globalStaticDataCache = {};
  }
}

export function clearMemoryJsonCache(): void {
  clearFileReaderCache();
}

export async function readJsonFileCached<T>(relativePath: string, fallback: T): Promise<T> {
  const memoryCache = getMemoryJsonCache();
  const inFlightPromises = getInFlightFilePromises();
  const isDev = process.env.NODE_ENV === 'development';

  // In production/SSR, use the in-memory Map cache to avoid repeating fs.promises.stat() and file reads
  if (!isDev && memoryCache.has(relativePath)) {
    return memoryCache.get(relativePath) as T;
  }

  const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath);
  try {
    if (!isDev) {
      if (inFlightPromises.has(relativePath)) {
        return (await inFlightPromises.get(relativePath)) as T;
      }

      const promise = (async () => {
        try {
          const raw = await fs.promises.readFile(filePath, 'utf-8');
          const data = JSON.parse(raw);
          memoryCache.set(relativePath, data);
          return data;
        } finally {
          inFlightPromises.delete(relativePath);
        }
      })();
      inFlightPromises.set(relativePath, promise);
      return (await promise) as T;
    }

    // In local development, check mtime to support hot reloading of static data files
    const stats = await fs.promises.stat(filePath);
    const mtimeMs = stats.mtimeMs;
    const cache = getGlobalStaticDataCache();
    
    if (cache[relativePath] && cache[relativePath].mtimeMs === mtimeMs) {
      return cache[relativePath].data as T;
    }
    
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent) as T;
    cache[relativePath] = { data: parsed, mtimeMs };
    memoryCache.set(relativePath, parsed);
    return parsed;
  } catch (e: unknown) {
    logger.warn('FileReader', `Failed to read or parse cached JSON file: ${relativePath}`, {}, e instanceof Error ? e : new Error(String(e)));
    return fallback;
  }
}

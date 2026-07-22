import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/services/logger';

interface StaticDataCacheEntry<T> {
  data: T;
  mtimeMs: number;
}

declare global {
  var _globalStaticDataCache: Record<string, StaticDataCacheEntry<unknown>> | undefined;
}

const getGlobalStaticDataCache = (): Record<string, StaticDataCacheEntry<unknown>> => {
  if (!globalThis._globalStaticDataCache) {
    globalThis._globalStaticDataCache = {};
  }
  return globalThis._globalStaticDataCache;
};

export async function readJsonFileCached<T>(relativePath: string, fallback: T): Promise<T> {
  const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath);
  try {
    const stats = await fs.promises.stat(filePath);
    const mtimeMs = stats.mtimeMs;
    const cache = getGlobalStaticDataCache();
    
    if (cache[relativePath] && cache[relativePath].mtimeMs === mtimeMs) {
      return cache[relativePath].data as T;
    }
    
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent) as T;
    cache[relativePath] = { data: parsed, mtimeMs };
    return parsed;
  } catch (e: unknown) {
    logger.warn('FileReader', `Failed to read or parse cached JSON file: ${relativePath}`, {}, e instanceof Error ? e : new Error(String(e)));
    return fallback;
  }
}

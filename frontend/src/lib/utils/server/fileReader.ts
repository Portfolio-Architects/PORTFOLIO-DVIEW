import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/services/logger';

interface StaticDataCacheEntry<T> {
  data: T;
  mtimeMs: number;
}

const getGlobalStaticDataCache = (): Record<string, StaticDataCacheEntry<any>> => {
  if (!(globalThis as any)._globalStaticDataCache) {
    (globalThis as any)._globalStaticDataCache = {};
  }
  return (globalThis as any)._globalStaticDataCache;
};

export async function readJsonFileCached<T>(relativePath: string, fallback: T): Promise<T> {
  const filePath = path.resolve(process.cwd(), relativePath);
  try {
    const stats = await fs.promises.stat(filePath);
    const mtimeMs = stats.mtimeMs;
    const cache = getGlobalStaticDataCache();
    
    if (cache[relativePath] && cache[relativePath].mtimeMs === mtimeMs) {
      return cache[relativePath].data;
    }
    
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    cache[relativePath] = { data: parsed, mtimeMs };
    return parsed;
  } catch (e) {
    logger.warn('FileReader', `Failed to read or parse cached JSON file: ${relativePath}`, {}, e as Error);
    return fallback;
  }
}

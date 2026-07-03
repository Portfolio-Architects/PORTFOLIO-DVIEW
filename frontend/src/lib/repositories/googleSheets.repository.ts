/**
 * @module googleSheets.repository
 * @description Data Access Layer for Google Sheets API/CSV pulling and multi-level caching (Memory, Local fs, Redis).
 * Architecture Layer: Repository (Raw I/O & Caching only)
 */
import { SHEET_ID, parseCsvLine } from '@/lib/constants';
import { logger } from '@/lib/services/logger';
import { redis } from '@/lib/redis';
import fs from 'fs';
import path from 'path';

declare global {
  var _sheetsMemoryCache: Record<string, { data: unknown; timestamp: number }> | undefined;
}

// In-memory cache to bypass Redis roundtrips in local/serverless environments
const sheetsMemoryCache = globalThis._sheetsMemoryCache || {};
if (!globalThis._sheetsMemoryCache) {
  globalThis._sheetsMemoryCache = sheetsMemoryCache;
}

const SHEETS_CACHE_TTL = 86400; // 24 hours

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, delayMs = 1000): Promise<Response> {
  const TIMEOUT_MS = 8000; // 8 seconds timeout per attempt
  
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      
      if (response.ok) {
        return response;
      }
      
      logger.warn('googleSheets.repository.fetchWithRetry', `Google Sheets fetch attempt ${i + 1}/${retries} returned status ${response.status}`);
    } catch (err: unknown) {
      clearTimeout(id);
      const errorObject = err instanceof Error ? err : new Error(String(err));
      const isTimeout = errorObject.name === 'AbortError';
      logger.warn('googleSheets.repository.fetchWithRetry', `Google Sheets fetch attempt ${i + 1}/${retries} ${isTimeout ? 'TIMED OUT' : 'FAILED'}`, {
        error: errorObject.message
      });
    }
    
    if (i < retries - 1) {
      const jitter = Math.random() * 200;
      const currentDelay = delayMs * Math.pow(2, i) + jitter;
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw new Error(`Google Sheets fetch failed after ${retries} attempts`);
}

async function fetchCsvFromGoogle(sheetName: string, bypassCache: boolean = false): Promise<string[][]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1&_t=${Date.now()}`;
  try {
    const res = await fetchWithRetry(csvUrl, { next: { revalidate: bypassCache ? 0 : 3600 } });
    const text = await res.text();
    return text.split('\n').filter(l => l.trim()).map(parseCsvLine).map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));
  } catch (e: unknown) {
    logger.error('googleSheets.repository.fetchCsvFromGoogle', `Exponential Backoff retry failed fetching sheet: ${sheetName}`, undefined, e instanceof Error ? e : new Error(String(e)));
    throw e;
  }
}

export async function fetchCsv(sheetName: string, bypassCache: boolean = false): Promise<string[][]> {
  const cacheKey = `DTDLS:cache:sheets:${sheetName}`;
  const now = Date.now();
  const LOCAL_CACHE_DIR = path.resolve(process.cwd(), 'scratch/sheets-cache');
  const localCachePath = path.join(LOCAL_CACHE_DIR, `${sheetName}.json`);

  // 1. Check in-memory cache first
  if (!bypassCache) {
    const memCached = sheetsMemoryCache[cacheKey];
    if (memCached) {
      const isStale = (now - memCached.timestamp) > SHEETS_CACHE_TTL * 1000;
      if (!isStale) {
        return memCached.data as string[][];
      }
    }
  }

  // 2. Check Redis cache
  if (!bypassCache && redis) {
    try {
      const cached = await redis.get<{ data: string[][]; timestamp: number }>(cacheKey);
      if (cached) {
        const isStale = (now - cached.timestamp) > SHEETS_CACHE_TTL * 1000;
        if (isStale) {
          // Stale-While-Revalidate: fetch in background
          fetchCsvFromGoogle(sheetName).then(freshData => {
            redis?.set(cacheKey, { data: freshData, timestamp: Date.now() });
            sheetsMemoryCache[cacheKey] = { data: freshData, timestamp: Date.now() };
            // Save to local file cache as well
            try {
              if (!fs.existsSync(LOCAL_CACHE_DIR)) {
                fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });
              }
              fs.writeFileSync(localCachePath, JSON.stringify({ data: freshData, timestamp: Date.now() }), 'utf-8');
            } catch (err: unknown) {
              logger.error('googleSheets.repository.fetchCsv', `Local file cache write failed on background refresh: ${sheetName}`, undefined, err instanceof Error ? err : new Error(String(err)));
            }
          }).catch((err: unknown) => {
            logger.error('googleSheets.repository.fetchCsv', `Failed to background refresh sheet: ${sheetName}`, undefined, err instanceof Error ? err : new Error(String(err)));
          });
        }
        // Write to memory cache
        sheetsMemoryCache[cacheKey] = { data: cached.data, timestamp: cached.timestamp };
        return cached.data;
      }
    } catch (e: unknown) {
      logger.error('googleSheets.repository.fetchCsv', `Redis read failed for sheet: ${sheetName}`, undefined, e instanceof Error ? e : new Error(String(e)));
    }
  }

  // 3. Live fetch with resilient fallback on failure
  try {
    const freshData = await fetchCsvFromGoogle(sheetName, bypassCache);
    sheetsMemoryCache[cacheKey] = { data: freshData, timestamp: now };

    // Write to local file cache
    try {
      if (!fs.existsSync(LOCAL_CACHE_DIR)) {
        fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(localCachePath, JSON.stringify({ data: freshData, timestamp: now }), 'utf-8');
    } catch (e: unknown) {
      logger.error('googleSheets.repository.fetchCsv', `Local file cache write failed for sheet: ${sheetName}`, undefined, e instanceof Error ? e : new Error(String(e)));
    }

    if (redis) {
      try {
        await redis.set(cacheKey, { data: freshData, timestamp: now });
      } catch (e: unknown) {
        logger.error('googleSheets.repository.fetchCsv', `Redis write failed for sheet: ${sheetName}`, undefined, e instanceof Error ? e : new Error(String(e)));
      }
    }
    return freshData;
  } catch (error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('googleSheets.repository.fetchCsv', `Live fetch failed for sheet: ${sheetName}, attempting fallback cache`, undefined, errorObj);

    // Fallback 1: Stale memory cache
    if (sheetsMemoryCache[cacheKey]) {
      logger.warn('googleSheets.repository.fetchCsv', `Falling back to stale memory cache for sheet: ${sheetName}`);
      return sheetsMemoryCache[cacheKey].data as string[][];
    }

    // Fallback 2: Local file cache
    try {
      if (fs.existsSync(localCachePath)) {
        const fileContent = fs.readFileSync(localCachePath, 'utf-8');
        const cached = JSON.parse(fileContent);
        if (cached && cached.data) {
          logger.warn('googleSheets.repository.fetchCsv', `Falling back to local file cache for sheet: ${sheetName}`);
          return cached.data as string[][];
        }
      }
    } catch (fileError: unknown) {
      logger.error('googleSheets.repository.fetchCsv', `Local file cache read fallback failed for sheet: ${sheetName}`, undefined, fileError instanceof Error ? fileError : new Error(String(fileError)));
    }

    // Fallback 3: Stale Redis cache
    if (redis) {
      try {
        const cached = await redis.get<{ data: string[][]; timestamp: number }>(cacheKey);
        if (cached && cached.data) {
          logger.warn('googleSheets.repository.fetchCsv', `Falling back to stale Redis cache for sheet: ${sheetName}`);
          return cached.data;
        }
      } catch (redisError: unknown) {
        logger.error('googleSheets.repository.fetchCsv', `Redis read fallback failed for sheet: ${sheetName}`, undefined, redisError instanceof Error ? redisError : new Error(String(redisError)));
      }
    }

    // Fallback 4: Return empty array
    logger.error('googleSheets.repository.fetchCsv', `No cache available for sheet: ${sheetName}. Returning empty array.`, undefined, errorObj);
    return [];
  }
}

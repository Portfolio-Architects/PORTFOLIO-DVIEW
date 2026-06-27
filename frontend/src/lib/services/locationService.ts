import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';
import { Coord, parseCoordString } from '@/lib/utils/haversine';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// ── Zod Schemas ─────────────────────────────────────

export const POISchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

export const SchoolPOISchema = POISchema.extend({
  type: z.string(),
});

export const StationPOISchema = POISchema.extend({
  line: z.string(),
});

export const AcademyPOISchema = POISchema.extend({
  category: z.string(),
});

export const RestaurantPOISchema = POISchema.extend({
  category: z.string(),
});

export const ApartmentPOISchema = POISchema.extend({
  householdCount: z.number().optional(),
  yearBuilt: z.string().optional(),
  far: z.number().optional(),
  bcr: z.number().optional(),
  parkingCount: z.number().optional(),
  brand: z.string().optional(),
});

// ── Types ──────────────────────────────────────────

export type POI = z.infer<typeof POISchema>;
export type SchoolPOI = z.infer<typeof SchoolPOISchema>;
export type StationPOI = z.infer<typeof StationPOISchema>;
export type AcademyPOI = z.infer<typeof AcademyPOISchema>;
export type RestaurantPOI = z.infer<typeof RestaurantPOISchema>;
export type ApartmentPOI = z.infer<typeof ApartmentPOISchema>;

// ── Module-Level In-Memory Cache ───────────────────

export interface CachedData {
  apartments: ApartmentPOI[];
  schools: SchoolPOI[];
  stations: StationPOI[];
  academies: AcademyPOI[];
  restaurants: RestaurantPOI[];
  sboyds: RestaurantPOI[];
}

let _cache: CachedData | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 3600_000; // 1 hour

export async function loadAllCached(forceRefresh = false): Promise<CachedData> {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _cache;
  }

  const [apartments, schools, stations, academies, restaurants, sboyds] = await Promise.all([
    loadApartments(forceRefresh),
    loadSchools(forceRefresh),
    loadStations(forceRefresh),
    loadAcademies(forceRefresh),
    loadRestaurants(forceRefresh),
    loadSboyds(forceRefresh),
  ]);

  _cache = { apartments, schools, stations, academies, restaurants, sboyds };
  _cacheTimestamp = now;
  return _cache;
}

export function clearCache() {
  _cache = null;
  _cacheTimestamp = 0;
}

// ── Bounding Box Pre-Filter ────────────────────────

const BBOX_DEGREES = 0.012;

export function filterByBBox<T extends Coord>(origin: Coord, pois: T[]): T[] {
  return pois.filter(p =>
    Math.abs(p.lat - origin.lat) <= BBOX_DEGREES &&
    Math.abs(p.lng - origin.lng) <= BBOX_DEGREES
  );
}

// ── Google Sheet Loaders ───────────────────────────

async function fetchCSVWithRetry(url: string, options: RequestInit = {}, retries = 3, delayMs = 1000): Promise<Response> {
  const TIMEOUT_MS = 5000; // 5 seconds timeout per attempt
  
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
      
      logger.warn('locationService.fetchCSVWithRetry', `Google Sheets fetch attempt ${i + 1}/${retries} returned status ${response.status}`);
    } catch (err: unknown) {
      clearTimeout(id);
      const errorObj = err as Record<string, unknown>;
      const isTimeout = errorObj?.name === 'AbortError';
      logger.warn('locationService.fetchCSVWithRetry', `Google Sheets fetch attempt ${i + 1}/${retries} ${isTimeout ? 'TIMED OUT' : 'FAILED'}`, {
        error: String(errorObj?.message || err)
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

async function fetchSheetCSV(tabName: string, forceRefresh = false): Promise<string[][]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&_t=${Date.now()}`;
  const fetchOptions: RequestInit = forceRefresh 
    ? { cache: 'no-store' } 
    : { next: { revalidate: 86400 } };
  
  try {
    const res = await fetchCSVWithRetry(csvUrl, fetchOptions);
    const csvText = await res.text();
    const lines = csvText.split('\n').filter(l => l.trim());
    return lines.map(l => parseCsvLine(l));
  } catch (err) {
    logger.error('locationService.fetchSheetCSV', 'Google Sheets CSV fetch failed completely after retries', { tabName }, err as Error);
    return [];
  }
}

async function loadApartments(forceRefresh = false): Promise<ApartmentPOI[]> {
  const rows = await fetchSheetCSV(SHEET_TABS.APARTMENTS, forceRefresh);
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase().trim());
  const col = (names: string[], fallback: number) => {
    const idx = header.findIndex(h => names.some(n => h === n || h.startsWith(n)));
    return idx !== -1 ? idx : fallback;
  };
  const nameIdx  = col(['아파트명', 'name', '이름'], 0);
  const coordIdx = col(['좌표', 'coordinates', 'coord'], 1);
  const hhIdx    = col(['세대수', 'householdcount', 'households'], 2);
  const yearIdx  = col(['사용승인', '시공&준공인', '준공연도', 'yearbuilt', '준공'], 3);
  const farIdx   = col(['용적률', 'far'], 4);
  const bcrIdx   = col(['건폐율', 'bcr'], 5);
  const parkIdx  = col(['주차대수', 'parkingcount', '주차'], 6);
  const brandIdx = col(['시공사', 'brand', '브랜드'], 7);

  const result: ApartmentPOI[] = [];
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i];
    const name = c[nameIdx];
    const coordStr = c[coordIdx];
    if (!name || !coordStr) continue;
    const coord = parseCoordString(coordStr);
    if (!coord) continue;

    const householdCount = c[hhIdx] ? parseInt(c[hhIdx].replace(/,/g, '')) : undefined;
    const parkingCount = c[parkIdx] ? parseInt(c[parkIdx].replace(/,/g, '')) : undefined;

    const raw = {
      name: name.trim(),
      ...coord,
      householdCount: isNaN(householdCount as number) ? undefined : householdCount,
      yearBuilt: c[yearIdx]?.trim() || undefined,
      far: c[farIdx] ? parseFloat(c[farIdx].replace(/,/g, '')) || undefined : undefined,
      bcr: c[bcrIdx] ? parseFloat(c[bcrIdx].replace(/,/g, '')) || undefined : undefined,
      parkingCount: isNaN(parkingCount as number) ? undefined : parkingCount,
      brand: c[brandIdx]?.trim() || undefined,
    };

    const parsed = ApartmentPOISchema.safeParse(raw);
    if (parsed.success) {
      result.push(parsed.data);
    } else {
      logger.warn('locationService.loadApartments', 'Skipped invalid apartment POI', { name, errorInfo: parsed.error.format() as any });
    }
  }
  return result;
}

async function loadSchools(forceRefresh = false): Promise<SchoolPOI[]> {
  const rows = await fetchSheetCSV(SHEET_TABS.SCHOOLS, forceRefresh);
  const result: SchoolPOI[] = [];
  for (let i = 1; i < rows.length; i++) {
    const [name, coordStr, type] = rows[i];
    if (!name || !coordStr || !type) continue;
    const coord = parseCoordString(coordStr);
    if (coord) {
      const raw = { name: name.trim(), ...coord, type: type.trim() };
      const parsed = SchoolPOISchema.safeParse(raw);
      if (parsed.success) {
        result.push(parsed.data);
      } else {
        logger.warn('locationService.loadSchools', 'Skipped invalid school POI', { name, errorInfo: parsed.error.format() as any });
      }
    }
  }
  return result;
}

async function loadStations(forceRefresh = false): Promise<StationPOI[]> {
  const rows = await fetchSheetCSV(SHEET_TABS.STATIONS, forceRefresh);
  const result: StationPOI[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols[0] || !cols[1]) continue;
    const coord = parseCoordString(cols[1]);
    if (coord) {
      const raw = { name: cols[0].trim(), ...coord, line: (cols[2] || '').trim() };
      const parsed = StationPOISchema.safeParse(raw);
      if (parsed.success) {
        result.push(parsed.data);
      } else {
        logger.warn('locationService.loadStations', 'Skipped invalid station POI', { name: cols[0], errorInfo: parsed.error.format() as any });
      }
    }
  }
  return result;
}

async function loadAcademies(forceRefresh = false): Promise<AcademyPOI[]> {
  const rows = await fetchSheetCSV(SHEET_TABS.ACADEMIES, forceRefresh);
  const result: AcademyPOI[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 3) continue;
    const lat = parseFloat(cols[1]);
    const lng = parseFloat(cols[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0 && cols[0]) {
      const raw = { lat, lng, name: cols[0].trim(), category: (cols[3] || '기타').trim() };
      const parsed = AcademyPOISchema.safeParse(raw);
      if (parsed.success) {
        result.push(parsed.data);
      } else {
        logger.warn('locationService.loadAcademies', 'Skipped invalid academy POI', { name: cols[0], errorInfo: parsed.error.format() as any });
      }
    }
  }
  return result;
}

async function loadRestaurants(forceRefresh = false): Promise<RestaurantPOI[]> {
  const rows = await fetchSheetCSV(SHEET_TABS.RESTAURANTS, forceRefresh);
  const result: RestaurantPOI[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 3) continue;
    const lat = parseFloat(cols[1]);
    const lng = parseFloat(cols[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0 && cols[0]) {
      let rawName = cols[0].trim();
      if (rawName.includes('배스킨라빈스') || rawName.includes('베스킨라빈스')) {
        const dong = cols[4]?.trim() || '';
        let displayName = rawName.replace('베스킨라빈스', '배스킨라빈스');
        if (displayName === '배스킨라빈스' || displayName === '배스킨라빈스동탄') {
          displayName = dong ? `배스킨라빈스 ${dong}점` : '배스킨라빈스 동탄점';
        } else {
          displayName = displayName.replace('배스킨라빈스', '배스킨라빈스 ');
          displayName = displayName.replace(/\s+/g, ' ').trim();
        }
        if (!displayName.endsWith('점')) {
          displayName += '점';
        }
        rawName = displayName;
      }
      const raw = { 
        lat, 
        lng, 
        name: rawName, 
        category: (cols[3] || '기타').trim(),
        address: cols[5]?.trim() || undefined
      };
      const parsed = RestaurantPOISchema.safeParse(raw);
      if (parsed.success) {
        result.push(parsed.data);
      } else {
        logger.warn('locationService.loadRestaurants', 'Skipped invalid restaurant POI', { name: rawName, errorInfo: parsed.error.format() as any });
      }
    }
  }
  return result;
}

async function loadSboyds(forceRefresh = false): Promise<RestaurantPOI[]> {
  const rows = await fetchSheetCSV(SHEET_TABS.SBOYDS, forceRefresh);
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase().trim());
  const col = (names: string[], fallback: number) => {
    const idx = header.findIndex(h => names.some(n => h === n || h.startsWith(n)));
    return idx !== -1 ? idx : fallback;
  };

  const nameIdx = col(['상호명', 'name', '이름'], 0);
  const latIdx = col(['위도', 'latitude', 'lat'], 1);
  const lngIdx = col(['경도', 'longitude', 'lng'], 2);
  const catIdx = col(['업종', '분류', 'category', 'cat'], 3);
  const addrIdx = col(['주소', 'address', 'addr'], 4);

  const result: RestaurantPOI[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length <= Math.max(nameIdx, latIdx, lngIdx)) continue;
    const name = cols[nameIdx]?.trim();
    if (!name) continue;
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0) {
      const raw = { 
        lat, 
        lng, 
        name, 
        category: (catIdx !== -1 && cols[catIdx]?.trim()) || '기타',
        address: (addrIdx !== -1 && cols[addrIdx]?.trim()) || undefined
      };
      const parsed = RestaurantPOISchema.safeParse(raw);
      if (parsed.success) {
        result.push(parsed.data);
      } else {
        logger.warn('locationService.loadSboyds', 'Skipped invalid sboyd POI', { name, errorInfo: parsed.error.format() as any });
      }
    }
  }
  return result;
}


export function resolveApartment(name: string, apartments: ApartmentPOI[]): ApartmentPOI | null {
  const cleanName = name.replace(/\[.*?\]\s*/, '').trim();
  const norm = (s: string) => s.replace(/\s/g, '');

  const exact = apartments.find(a => a.name === cleanName || a.name === name);
  if (exact) return exact;

  const normalized = apartments.find(a => norm(a.name) === norm(cleanName));
  if (normalized) return normalized;

  const partial = apartments.find(a =>
    cleanName.includes(a.name) || a.name.includes(cleanName)
  );
  if (partial) return partial;

  const partialNorm = apartments.find(a =>
    norm(cleanName).includes(norm(a.name)) || norm(a.name).includes(norm(cleanName))
  );
  if (partialNorm) return partialNorm;

  return null;
}

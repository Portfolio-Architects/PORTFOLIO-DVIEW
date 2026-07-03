/**
 * @module location.repository
 * @description Data Access Layer for location-based Google Sheet POIs.
 * Architecture Layer: Repository (CRUD & raw fetch only)
 */
import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';
import { parseCoordString } from '@/lib/utils/haversine';
import { logger } from '@/lib/services/logger';
import {
  ApartmentPOISchema,
  SchoolPOISchema,
  StationPOISchema,
  AcademyPOISchema,
  RestaurantPOISchema,
} from '@/lib/validation/facade.schemas';
import type { ApartmentPOI, SchoolPOI, StationPOI, AcademyPOI, RestaurantPOI } from '@/lib/services/locationService';

async function fetchCSVWithRetry(url: string, options: RequestInit = {}, retries = 3, delayMs = 1000): Promise<Response> {
  const TIMEOUT_MS = 5000;
  
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
      
      logger.warn('location.repository.fetchCSVWithRetry', `Google Sheets fetch attempt ${i + 1}/${retries} returned status ${response.status}`);
    } catch (err: unknown) {
      clearTimeout(id);
      const errorObj = err as Record<string, unknown>;
      const isTimeout = errorObj?.name === 'AbortError';
      logger.warn('location.repository.fetchCSVWithRetry', `Google Sheets fetch attempt ${i + 1}/${retries} ${isTimeout ? 'TIMED OUT' : 'FAILED'}`, {
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
    logger.error('location.repository.fetchSheetCSV', 'Google Sheets CSV fetch failed completely after retries', { tabName }, err as Error);
    return [];
  }
}

export async function loadApartments(forceRefresh = false): Promise<ApartmentPOI[]> {
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
      logger.warn('location.repository.loadApartments', 'Skipped invalid apartment POI', { name, errorInfo: parsed.error.format() as unknown });
    }
  }
  return result;
}

export async function loadSchools(forceRefresh = false): Promise<SchoolPOI[]> {
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
        logger.warn('location.repository.loadSchools', 'Skipped invalid school POI', { name, errorInfo: parsed.error.format() as unknown });
      }
    }
  }
  return result;
}

export async function loadStations(forceRefresh = false): Promise<StationPOI[]> {
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
        logger.warn('location.repository.loadStations', 'Skipped invalid station POI', { name: cols[0], errorInfo: parsed.error.format() as unknown });
      }
    }
  }
  return result;
}

export async function loadAcademies(forceRefresh = false): Promise<AcademyPOI[]> {
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
        logger.warn('location.repository.loadAcademies', 'Skipped invalid academy POI', { name: cols[0], errorInfo: parsed.error.format() as unknown });
      }
    }
  }
  return result;
}

export async function loadRestaurants(forceRefresh = false): Promise<RestaurantPOI[]> {
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
        logger.warn('location.repository.loadRestaurants', 'Skipped invalid restaurant POI', { name: rawName, errorInfo: parsed.error.format() as unknown });
      }
    }
  }
  return result;
}

export async function loadSboyds(forceRefresh = false): Promise<RestaurantPOI[]> {
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
        logger.warn('location.repository.loadSboyds', 'Skipped invalid sboyd POI', { name, errorInfo: parsed.error.format() as unknown });
      }
    }
  }
  return result;
}

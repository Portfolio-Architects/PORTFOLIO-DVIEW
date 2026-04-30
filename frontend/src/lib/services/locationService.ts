import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';
import { Coord, haversineDistance, findNearest, countWithinRadius, parseCoordString } from '@/lib/utils/haversine';

// ── Types ──────────────────────────────────────────

export interface POI extends Coord { name: string; }
export interface SchoolPOI extends POI { type: string; }
export interface StationPOI extends POI { line: string; }
export interface AcademyPOI extends POI { category: string; }
export interface RestaurantPOI extends POI { category: string; }
export interface ApartmentPOI extends POI {
  householdCount?: number;
  yearBuilt?: string;
  far?: number;
  bcr?: number;
  parkingCount?: number;
  brand?: string;
}

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

async function fetchSheetCSV(tabName: string, forceRefresh = false): Promise<string[][]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&_t=${Date.now()}`;
  const fetchOptions: RequestInit = forceRefresh 
    ? { cache: 'no-store' } 
    : { next: { revalidate: 86400 } };
  
  const res = await fetch(csvUrl, fetchOptions);
  if (!res.ok) return [];
  const csvText = await res.text();
  const lines = csvText.split('\n').filter(l => l.trim());
  return lines.map(l => parseCsvLine(l));
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

    const householdCount = c[hhIdx] ? parseInt(c[hhIdx]) : undefined;
    const parkingCount = c[parkIdx] ? parseInt(c[parkIdx]) : undefined;

    result.push({
      name: name.trim(),
      ...coord,
      householdCount: isNaN(householdCount as number) ? undefined : householdCount,
      yearBuilt: c[yearIdx]?.trim() || undefined,
      far: c[farIdx] ? parseFloat(c[farIdx]) || undefined : undefined,
      bcr: c[bcrIdx] ? parseFloat(c[bcrIdx]) || undefined : undefined,
      parkingCount: isNaN(parkingCount as number) ? undefined : parkingCount,
      brand: c[brandIdx]?.trim() || undefined,
    });
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
    if (coord) result.push({ name: name.trim(), ...coord, type: type.trim() });
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
    if (coord) result.push({ name: cols[0].trim(), ...coord, line: (cols[2] || '').trim() });
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
      result.push({ lat, lng, name: cols[0].trim(), category: (cols[3] || '기타').trim() });
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
      result.push({ lat, lng, name: cols[0].trim(), category: (cols[3] || '기타').trim() });
    }
  }
  return result;
}

async function loadSboyds(forceRefresh = false): Promise<RestaurantPOI[]> {
  const rows = await fetchSheetCSV(SHEET_TABS.SBOYDS, forceRefresh);
  const result: RestaurantPOI[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 3) continue;
    const lat = parseFloat(cols[1]);
    const lng = parseFloat(cols[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0 && cols[0]) {
      result.push({ lat, lng, name: cols[0].trim(), category: (cols[3] || '기타').trim() });
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

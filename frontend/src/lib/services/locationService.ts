/**
 * @module locationService
 * @description Domain logic for location-based calculations (distance, bounding box filtering).
 * Architecture Layer: Service (Domain Logic & Orchestration)
 */
import { Coord } from '@/lib/utils/haversine';
import { z } from 'zod';
import * as LocationRepo from '@/lib/repositories/location.repository';
import {
  POISchema,
  SchoolPOISchema,
  StationPOISchema,
  AcademyPOISchema,
  RestaurantPOISchema,
  ApartmentPOISchema,
} from '@/lib/validation/facade.schemas';

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
    LocationRepo.loadApartments(forceRefresh),
    LocationRepo.loadSchools(forceRefresh),
    LocationRepo.loadStations(forceRefresh),
    LocationRepo.loadAcademies(forceRefresh),
    LocationRepo.loadRestaurants(forceRefresh),
    LocationRepo.loadSboyds(forceRefresh),
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

// ── Apartment Resolution ───────────────────────────
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


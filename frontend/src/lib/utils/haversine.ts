/**
 * @module haversine
 * @description Haversine formula for calculating great-circle distance
 * between two points on Earth's surface.
 * Used for apartment-to-POI distance calculations.
 */

import { z } from 'zod';
import { logger } from '@/lib/services/logger';

/** Earth's mean radius in meters */
const EARTH_RADIUS_M = 6_371_000;

const TO_RAD = Math.PI / 180;

/** Zod schema for geographic coordinates */
export const CoordSchema = z.object({
  lat: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => !isNaN(val) && val >= -90 && val <= 90),
  lng: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => !isNaN(val) && val >= -180 && val <= 180),
});

/** A geographic coordinate (latitude, longitude in degrees) */
/** A geographic coordinate (latitude, longitude in degrees) */
export type Coord = z.infer<typeof CoordSchema>;

/**
 * Calculates the Haversine distance between two coordinates.
 * @returns Distance in meters (rounded to nearest integer)
 */
export function haversineDistance(a: any, b: any): number {
  if (!a || !b) return 0;

  let latA: number, lngA: number;
  let latB: number, lngB: number;

  if (a && typeof a.lat === 'number' && typeof a.lng === 'number' && !isNaN(a.lat) && !isNaN(a.lng)) {
    latA = a.lat;
    lngA = a.lng;
  } else {
    const parsedA = CoordSchema.safeParse(a);
    if (!parsedA.success) return 0;
    latA = parsedA.data.lat;
    lngA = parsedA.data.lng;
  }

  if (b && typeof b.lat === 'number' && typeof b.lng === 'number' && !isNaN(b.lat) && !isNaN(b.lng)) {
    latB = b.lat;
    lngB = b.lng;
  } else {
    const parsedB = CoordSchema.safeParse(b);
    if (!parsedB.success) return 0;
    latB = parsedB.data.lat;
    lngB = parsedB.data.lng;
  }

  // Fast path for identical coordinates
  if (latA === latB && lngA === lngB) return 0;

  // Check bounds
  if (latA < -90 || latA > 90 || lngA < -180 || lngA > 180) return 0;
  if (latB < -90 || latB > 90 || lngB < -180 || lngB > 180) return 0;

  const dLat = (latB - latA) * TO_RAD;
  const dLng = (lngB - lngA) * TO_RAD;

  const sinLat = Math.sin(dLat * 0.5);
  const sinLng = Math.sin(dLng * 0.5);

  const h = sinLat * sinLat +
    Math.cos(latA * TO_RAD) * Math.cos(latB * TO_RAD) * sinLng * sinLng;

  // Prevent Math.asin(Math.sqrt(h)) from returning NaN if h is slightly out of [0, 1] bounds due to precision errors
  const clampedH = Math.max(0, Math.min(1, h));
  if (isNaN(clampedH)) return 0;

  const result = Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(clampedH)));
  return isNaN(result) ? 0 : result;
}

/**
 * Finds the nearest POI from a list and returns its name + distance.
 */
export function findNearest<T extends Coord & { name: string }>(
  origin: Coord,
  pois: T[]
): (T & { distance: number }) | null {
  let vOriginLat: number, vOriginLng: number;
  if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number' && !isNaN(origin.lat) && !isNaN(origin.lng)) {
    vOriginLat = origin.lat;
    vOriginLng = origin.lng;
  } else {
    const parsedOrigin = CoordSchema.safeParse(origin);
    if (!parsedOrigin.success) {
      logger.warn('haversine.findNearest', 'Invalid origin coordinate', { origin, error: String(parsedOrigin.error) });
      return null;
    }
    vOriginLat = parsedOrigin.data.lat;
    vOriginLng = parsedOrigin.data.lng;
  }

  if (!pois || pois.length === 0) return null;

  let nearest: T | null = null;
  let minDist = Infinity;
  const originObj = { lat: vOriginLat, lng: vOriginLng };

  for (const poi of pois) {
    let poiLat: number, poiLng: number;
    if (poi && typeof poi.lat === 'number' && typeof poi.lng === 'number' && !isNaN(poi.lat) && !isNaN(poi.lng)) {
      poiLat = poi.lat;
      poiLng = poi.lng;
    } else {
      const parsedPoi = CoordSchema.safeParse(poi);
      if (!parsedPoi.success) {
        logger.warn('haversine.findNearest', `Invalid POI coordinate for ${poi?.name}`, { poi, error: String(parsedPoi.error) });
        continue;
      }
      poiLat = parsedPoi.data.lat;
      poiLng = parsedPoi.data.lng;
    }

    const dist = haversineDistance(originObj, { lat: poiLat, lng: poiLng });
    if (dist < minDist) {
      minDist = dist;
      nearest = poi;
    }
  }

  if (!nearest) return null;
  return { ...nearest, distance: minDist };
}

/**
 * Counts POIs within a given radius (meters) from origin.
 */
export function countWithinRadius(origin: Coord, pois: Coord[], radiusM: number): number {
  let originLat: number, originLng: number;
  if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number' && !isNaN(origin.lat) && !isNaN(origin.lng)) {
    originLat = origin.lat;
    originLng = origin.lng;
  } else {
    const parsedOrigin = CoordSchema.safeParse(origin);
    if (!parsedOrigin.success) return 0;
    originLat = parsedOrigin.data.lat;
    originLng = parsedOrigin.data.lng;
  }

  if (!pois || !Array.isArray(pois)) return 0;

  const originObj = { lat: originLat, lng: originLng };
  let count = 0;

  for (const p of pois) {
    let pLat: number, pLng: number;
    if (p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)) {
      pLat = p.lat;
      pLng = p.lng;
    } else {
      const parsedP = CoordSchema.safeParse(p);
      if (!parsedP.success) continue;
      pLat = parsedP.data.lat;
      pLng = parsedP.data.lng;
    }
    if (haversineDistance(originObj, { lat: pLat, lng: pLng }) <= radiusM) {
      count++;
    }
  }
  return count;
}

/**
 * Parses a "lat, lng" string into a Coord object.
 * Supports both "37.2083, 127.0588" and separate lat/lng values.
 */
export function parseCoordString(coordStr: string): Coord | null {
  if (!coordStr || typeof coordStr !== 'string') return null;
  // Clean brackets, parentheses, braces, and spaces
  const cleaned = coordStr.replace(/[\[\]\(\)\{\}\s]/g, '');
  const parts = cleaned.split(',').map(s => parseFloat(s));
  if (parts.length >= 2) {
    const parsed = CoordSchema.safeParse({ lat: parts[0], lng: parts[1] });
    if (parsed.success) {
      return parsed.data;
    }
  }
  return null;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}


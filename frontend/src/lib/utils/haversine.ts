/**
 * @module haversine
 * @description Haversine formula for calculating great-circle distance
 * between two points on Earth's surface.
 * Used for apartment-to-POI distance calculations.
 */

/** Earth's mean radius in meters */
const EARTH_RADIUS_M = 6_371_000;

/** A geographic coordinate (latitude, longitude in degrees) */
export interface Coord {
  lat: number;
  lng: number;
}

/**
 * Calculates the Haversine distance between two coordinates.
 * @returns Distance in meters (rounded to nearest integer)
 */
export function haversineDistance(a: Coord, b: Coord): number {
  if (!a || !b || isNaN(a.lat) || isNaN(a.lng) || isNaN(b.lat) || isNaN(b.lng)) {
    return 0;
  }
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h = sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;

  // Prevent Math.asin(Math.sqrt(h)) from returning NaN if h is slightly out of [0, 1] bounds due to precision errors
  const clampedH = Math.max(0, Math.min(1, h));
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(clampedH)));
}

/**
 * Finds the nearest POI from a list and returns its name + distance.
 */
export function findNearest<T extends Coord & { name: string }>(
  origin: Coord,
  pois: T[]
): (T & { distance: number }) | null {
  if (pois.length === 0) return null;

  let nearest = pois[0];
  let minDist = haversineDistance(origin, pois[0]);

  for (let i = 1; i < pois.length; i++) {
    const dist = haversineDistance(origin, pois[i]);
    if (dist < minDist) {
      minDist = dist;
      nearest = pois[i];
    }
  }

  return { ...nearest, distance: minDist };
}

/**
 * Counts POIs within a given radius (meters) from origin.
 */
export function countWithinRadius(origin: Coord, pois: Coord[], radiusM: number): number {
  return pois.filter(p => haversineDistance(origin, p) <= radiusM).length;
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
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const lat = parts[0];
    const lng = parts[1];
    // Validate bounds for Earth coordinates to prevent downstream errors
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

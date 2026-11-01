/**
 * Milestone 2 Adversarial Stress Suite: GPS 300m Haversine & Zero-Persistence Privacy
 *
 * Empirical Challenger: challenger_m2_1
 *
 * 1. Floating-Point Distance Precision: Exactly 299.9m (true), 300.0m (true), 300.1m (false, OUT_OF_RANGE)
 *    - North-South meridian delta
 *    - East-West parallel delta
 *    - Diagonal 45-degree delta
 *    - Multi-complex cross-validation across distinct dongs
 * 2. Extreme & Adversarial Coordinates Stress Testing:
 *    - Boundary latitude ([-90, 90]) and longitude ([-180, 180])
 *    - Out-of-bounds (>90, <-90, >180, <-180)
 *    - Non-finite floats: NaN, Infinity, -Infinity
 *    - Null Island: (0, 0)
 *    - String/object injections and type coercion attempts
 * 3. Unmapped Complex Boundary:
 *    - Exhaustive verification of all 56 unmapped complexes (lat:0, lng:0) -> 100% COORDINATES_UNAVAILABLE
 * 4. Virtual Title '동탄 예비입주민':
 *    - Safe fallback to COORDINATES_UNAVAILABLE at engine and API level
 * 5. Zero GPS Persistence Verification:
 *    - Memory repository entity inspection: profiles, posts, comments
 *    - REST API JSON responses, headers, and Set-Cookie inspection
 *    - Hostile coordinate injection attempts into profile, post, and comment payloads
 * 6. GPS Badge Integrity & Anti-Spoofing:
 *    - Unauthorized isGpsVerified: true neutralization
 *    - Cross-complex verification blocking under active 30-day title lock
 */

import { NextRequest } from 'next/server';
import {
  VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
  EARTH_RADIUS_METERS,
  GPS_VERIFICATION_THRESHOLD_METERS,
  getAllComplexes,
  getGeocodedComplexes,
  getUnmappedComplexes,
  getComplexData,
  calculateHaversineDistance,
  verifyComplexLocation,
  BoardAuthorProfile,
} from '@/lib/board/boardEngine';
import {
  MemoryBoardRepository,
  setBoardRepository,
  getBoardRepository,
} from '@/lib/board/boardRepository';
import {
  generateAuthorToken,
  hashAuthorToken,
  AUTHOR_TOKEN_HEADER_NAME,
} from '@/lib/board/boardAuth';
import { POST as verifyLocationRoute } from '@/app/api/board/verify-location/route';
import {
  GET as getProfileRoute,
  POST as setProfileRoute,
} from '@/app/api/board/profile/route';
import {
  GET as getPostsRoute,
  POST as createPostRoute,
} from '@/app/api/board/posts/route';
import { POST as createCommentRoute } from '@/app/api/board/posts/[id]/comments/route';

describe('Milestone 2 Adversarial Stress Suite: GPS 300m Haversine & Zero-Persistence Privacy', () => {
  let memoryRepo: MemoryBoardRepository;

  beforeEach(() => {
    memoryRepo = new MemoryBoardRepository();
    setBoardRepository(memoryRepo);
  });

  afterEach(() => {
    setBoardRepository(null);
  });

  // =========================================================================
  // Challenge 1: Floating-Point Distance Precision (299.9m, 300.0m, 300.1m)
  // =========================================================================
  describe('Challenge 1: Floating-Point Haversine Precision at Exact 300m Threshold', () => {
    const targetComplex = '동탄역 롯데캐슬'; // lat: 37.201452, lng: 127.096841
    const baseLat = 37.201452;
    const baseLng = 127.096841;

    // Helper: Calculate exact latitude delta in degrees for target distance in meters along meridian
    function getLatDelta(distanceMeters: number): number {
      return (distanceMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
    }

    // Helper: Calculate exact longitude delta in degrees for target distance in meters along parallel
    function getLngDelta(distanceMeters: number, latDegrees: number): number {
      const phi = (latDegrees * Math.PI) / 180;
      const sinHalfDelta = Math.sin(distanceMeters / (2 * EARTH_RADIUS_METERS)) / Math.cos(phi);
      return 2 * Math.asin(sinHalfDelta) * (180 / Math.PI);
    }

    it('verifies exact North-South meridian distance: 299.9m (true), 300.0m (true), 300.1m (false OUT_OF_RANGE)', () => {
      // 1. Exactly 299.9 meters North
      const lat299_9 = baseLat + getLatDelta(299.9);
      const dist299_9 = calculateHaversineDistance(baseLat, baseLng, lat299_9, baseLng);
      expect(dist299_9).toBeCloseTo(299.9, 3);
      expect(dist299_9).toBeLessThanOrEqual(300.0);

      const res299_9 = verifyComplexLocation(targetComplex, lat299_9, baseLng);
      expect(res299_9).toBeDefined();
      expect(res299_9.verified).toBe(true);
      expect(res299_9.distanceMeters).toBe(300); // 299.9 rounds to 300
      expect(res299_9.code).toBeUndefined();

      // 2. Exactly 300.0 meters North (Boundary value)
      const lat300_0 = baseLat + getLatDelta(300.0);
      const dist300_0 = calculateHaversineDistance(baseLat, baseLng, lat300_0, baseLng);
      expect(dist300_0).toBeCloseTo(300.0, 3);
      expect(dist300_0).toBeLessThanOrEqual(300.0);

      const res300_0 = verifyComplexLocation(targetComplex, lat300_0, baseLng);
      expect(res300_0.verified).toBe(true);
      expect(res300_0.distanceMeters).toBe(300);
      expect(res300_0.code).toBeUndefined();

      // 3. Exactly 300.1 meters North (Out of range by 10cm)
      const lat300_1 = baseLat + getLatDelta(300.1);
      const dist300_1 = calculateHaversineDistance(baseLat, baseLng, lat300_1, baseLng);
      expect(dist300_1).toBeCloseTo(300.1, 3);
      expect(dist300_1).toBeGreaterThan(300.0);

      const res300_1 = verifyComplexLocation(targetComplex, lat300_1, baseLng);
      expect(res300_1.verified).toBe(false);
      expect(res300_1.code).toBe('OUT_OF_RANGE');
      expect(res300_1.distanceMeters).toBe(300); // 300.1 rounds to 300
    });

    it('verifies exact East-West parallel distance: 299.9m (true), 300.0m (true), 300.1m (false OUT_OF_RANGE)', () => {
      // 1. Exactly 299.9 meters East
      const lng299_9 = baseLng + getLngDelta(299.9, baseLat);
      const dist299_9 = calculateHaversineDistance(baseLat, baseLng, baseLat, lng299_9);
      expect(dist299_9).toBeCloseTo(299.9, 3);
      expect(dist299_9).toBeLessThanOrEqual(300.0);

      const res299_9 = verifyComplexLocation(targetComplex, baseLat, lng299_9);
      expect(res299_9.verified).toBe(true);
      expect(res299_9.distanceMeters).toBe(300);

      // 2. Exactly 300.0 meters East
      const lng300_0 = baseLng + getLngDelta(300.0, baseLat);
      const dist300_0 = calculateHaversineDistance(baseLat, baseLng, baseLat, lng300_0);
      expect(dist300_0).toBeCloseTo(300.0, 3);
      expect(dist300_0).toBeLessThanOrEqual(300.0);

      const res300_0 = verifyComplexLocation(targetComplex, baseLat, lng300_0);
      expect(res300_0.verified).toBe(true);
      expect(res300_0.distanceMeters).toBe(300);

      // 3. Exactly 300.1 meters East
      const lng300_1 = baseLng + getLngDelta(300.1, baseLat);
      const dist300_1 = calculateHaversineDistance(baseLat, baseLng, baseLat, lng300_1);
      expect(dist300_1).toBeCloseTo(300.1, 3);
      expect(dist300_1).toBeGreaterThan(300.0);

      const res300_1 = verifyComplexLocation(targetComplex, baseLat, lng300_1);
      expect(res300_1.verified).toBe(false);
      expect(res300_1.code).toBe('OUT_OF_RANGE');
    });

    it('verifies 45-degree diagonal bearing: 299.9m (true), 300.0m (true), 300.1m (false OUT_OF_RANGE)', () => {
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);

      function getDiagonalPoint(d: number): { lat: number; lng: number } {
        const dy = d * cos45;
        const dx = d * sin45;
        const dLat = (dy / EARTH_RADIUS_METERS) * (180 / Math.PI);
        const phi = ((baseLat + dLat / 2) * Math.PI) / 180;
        const dLng = (dx / (EARTH_RADIUS_METERS * Math.cos(phi))) * (180 / Math.PI);
        return { lat: baseLat + dLat, lng: baseLng + dLng };
      }

      // 299.9m diagonal
      const pt299_9 = getDiagonalPoint(299.9);
      const dist299_9 = calculateHaversineDistance(baseLat, baseLng, pt299_9.lat, pt299_9.lng);
      expect(dist299_9).toBeLessThanOrEqual(300.0);
      expect(verifyComplexLocation(targetComplex, pt299_9.lat, pt299_9.lng).verified).toBe(true);

      // 300.0m diagonal
      const pt300_0 = getDiagonalPoint(300.0);
      const dist300_0 = calculateHaversineDistance(baseLat, baseLng, pt300_0.lat, pt300_0.lng);
      expect(dist300_0).toBeLessThanOrEqual(300.0);
      expect(verifyComplexLocation(targetComplex, pt300_0.lat, pt300_0.lng).verified).toBe(true);

      // 300.1m diagonal
      const pt300_1 = getDiagonalPoint(300.1);
      const dist300_1 = calculateHaversineDistance(baseLat, baseLng, pt300_1.lat, pt300_1.lng);
      expect(dist300_1).toBeGreaterThan(300.0);
      const res300_1 = verifyComplexLocation(targetComplex, pt300_1.lat, pt300_1.lng);
      expect(res300_1.verified).toBe(false);
      expect(res300_1.code).toBe('OUT_OF_RANGE');
    });

    it('consistently evaluates 300.0m vs 300.1m across disparate geocoded complexes in multiple dongs', () => {
      const sampleComplexes = [
        '동탄역 시범 한화꿈에그린 프레스티지', // 청계동
        '동탄린스트라우스 더레이크',            // 송동
        '동탄역 린스트라우스',                 // 오산동
        '동탄역 시범 우남퍼스트빌',             // 청계동
        '동탄역 롯데캐슬',                     // 오산동
      ];

      for (const name of sampleComplexes) {
        const data = getComplexData(name);
        expect(data).not.toBeNull();
        if (!data) continue;

        // Exactly 300.0m North
        const lat300_0 = data.lat + getLatDelta(300.0);
        const res300_0 = verifyComplexLocation(name, lat300_0, data.lng);
        expect(res300_0.verified).toBe(true);

        // Exactly 300.1m North
        const lat300_1 = data.lat + getLatDelta(300.1);
        const res300_1 = verifyComplexLocation(name, lat300_1, data.lng);
        expect(res300_1.verified).toBe(false);
        expect(res300_1.code).toBe('OUT_OF_RANGE');
      }
    });

    it('enforces boundary precision via POST /api/board/verify-location route', async () => {
      const token = generateAuthorToken();

      // 1. Boundary 299.9m
      const lat299_9 = baseLat + getLatDelta(299.9);
      const req299 = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName: targetComplex,
          lat: lat299_9,
          lng: baseLng,
          authorToken: token,
        }),
      });
      const res299 = await verifyLocationRoute(req299);
      const json299 = await res299.json();
      expect(res299.status).toBe(200);
      expect(json299.data.verified).toBe(true);

      // 2. Boundary 300.0m
      const lat300_0 = baseLat + getLatDelta(300.0);
      const req300 = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName: targetComplex,
          lat: lat300_0,
          lng: baseLng,
          authorToken: token,
        }),
      });
      const res300 = await verifyLocationRoute(req300);
      const json300 = await res300.json();
      expect(res300.status).toBe(200);
      expect(json300.data.verified).toBe(true);

      // 3. Boundary 300.1m
      const lat300_1 = baseLat + getLatDelta(300.1);
      const req301 = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName: targetComplex,
          lat: lat300_1,
          lng: baseLng,
          authorToken: token,
        }),
      });
      const res301 = await verifyLocationRoute(req301);
      const json301 = await res301.json();
      expect(res301.status).toBe(200);
      expect(json301.data.verified).toBe(false);
      expect(json301.data.code).toBe('OUT_OF_RANGE');
    });
  });

  // =========================================================================
  // Challenge 2: Extreme Coordinates & Adversarial Input Stress
  // =========================================================================
  describe('Challenge 2: Extreme Coordinates & Adversarial Input Stress', () => {
    const complexName = '동탄역 롯데캐슬';

    it('safely rejects latitude boundary violations (>90, <-90)', () => {
      const outOfBoundsLats = [90.000001, 91, 120, 1000, -90.000001, -91, -120, -1000];

      for (const badLat of outOfBoundsLats) {
        const result = verifyComplexLocation(complexName, badLat, 127.096841);
        expect(result.verified).toBe(false);
        expect(result.code).toBe('INVALID_COORDINATES');
      }
    });

    it('safely rejects longitude boundary violations (>180, <-180)', () => {
      const outOfBoundsLngs = [180.000001, 181, 250, 10000, -180.000001, -181, -250, -10000];

      for (const badLng of outOfBoundsLngs) {
        const result = verifyComplexLocation(complexName, 37.201452, badLng);
        expect(result.verified).toBe(false);
        expect(result.code).toBe('INVALID_COORDINATES');
      }
    });

    it('safely rejects Null Island (0, 0) as invalid GPS', () => {
      const result = verifyComplexLocation(complexName, 0, 0);
      expect(result.verified).toBe(false);
      expect(result.code).toBe('INVALID_COORDINATES');
    });

    it('safely rejects non-finite IEEE 754 floats (NaN, Infinity, -Infinity)', () => {
      const nonFiniteCases = [
        { lat: NaN, lng: 127.096841 },
        { lat: 37.201452, lng: NaN },
        { lat: NaN, lng: NaN },
        { lat: Infinity, lng: 127.096841 },
        { lat: 37.201452, lng: -Infinity },
        { lat: Infinity, lng: Infinity },
      ];

      for (const c of nonFiniteCases) {
        const result = verifyComplexLocation(complexName, c.lat, c.lng);
        expect(result.verified).toBe(false);
        expect(result.code).toBe('INVALID_COORDINATES');
      }
    });

    it('safely rejects hostile string injections and type mismatches directly in engine', () => {
      const maliciousCases: any[] = [
        { lat: '37.201452', lng: 127.096841 },
        { lat: 37.201452, lng: '127.096841' },
        { lat: '<script>alert(1)</script>', lng: 127.096841 },
        { lat: "'; DROP TABLE board_posts;--", lng: 127.096841 },
        { lat: null, lng: 127.096841 },
        { lat: undefined, lng: 127.096841 },
        { lat: {}, lng: [] },
        { lat: true, lng: false },
      ];

      for (const c of maliciousCases) {
        const result = verifyComplexLocation(complexName, c.lat, c.lng);
        expect(result.verified).toBe(false);
        expect(result.code).toBe('INVALID_COORDINATES');
      }
    });

    it('safely rejects invalid inputs at the REST API layer (/api/board/verify-location)', async () => {
      // 1. Malformed JSON payload
      const reqMalformed = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'NOT_VALID_JSON{',
      });
      const resMalformed = await verifyLocationRoute(reqMalformed);
      expect(resMalformed.status).toBe(400);
      const jsonMalformed = await resMalformed.json();
      expect(jsonMalformed.code || jsonMalformed.error).toBe('MALFORMED_JSON');

      // 2. String latitude injection
      const reqString = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName,
          lat: '37.201452',
          lng: 127.096841,
        }),
      });
      const resString = await verifyLocationRoute(reqString);
      expect(resString.status).toBe(400);
      const jsonString = await resString.json();
      expect(jsonString.code || jsonString.error).toBe('INVALID_PARAMETERS');

      // 3. Null coordinates
      const reqNull = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName,
          lat: null,
          lng: null,
        }),
      });
      const resNull = await verifyLocationRoute(reqNull);
      expect(resNull.status).toBe(400);
      const jsonNull = await resNull.json();
      expect(jsonNull.code || jsonNull.error).toBe('INVALID_PARAMETERS');

      // 4. Out of bounds latitude at API level
      const reqOOB = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName,
          lat: 95.0,
          lng: 127.096841,
        }),
      });
      const resOOB = await verifyLocationRoute(reqOOB);
      expect(resOOB.status).toBe(200);
      const jsonOOB = await resOOB.json();
      expect(jsonOOB.data.verified).toBe(false);
      expect(jsonOOB.data.code).toBe('INVALID_COORDINATES');

      // 5. Non-existent complex name
      const reqFake = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName: '가짜 아파트 999차',
          lat: 37.201452,
          lng: 127.096841,
        }),
      });
      const resFake = await verifyLocationRoute(reqFake);
      expect(resFake.status).toBe(200);
      const jsonFake = await resFake.json();
      expect(jsonFake.data.verified).toBe(false);
      expect(jsonFake.data.code).toBe('INVALID_COMPLEX');
    });
  });

  // =========================================================================
  // Challenge 3: Unmapped Complex Boundary (All 56 Complexes)
  // =========================================================================
  describe('Challenge 3: Unmapped Complex Boundary (All 56 Complexes)', () => {
    it('returns COORDINATES_UNAVAILABLE for 100% of the 56 unmapped complexes without exception', () => {
      const unmapped = getUnmappedComplexes();
      expect(unmapped).toHaveLength(56);

      const centerDongtanLat = 37.201452;
      const centerDongtanLng = 127.096841;

      let rejectedCount = 0;

      for (const complex of unmapped) {
        expect(complex.hasCoords).toBe(false);
        expect(complex.lat).toBe(0);
        expect(complex.lng).toBe(0);

        // Attempt verification with valid Dongtan coordinates
        const result = verifyComplexLocation(complex.name, centerDongtanLat, centerDongtanLng);
        expect(result.verified).toBe(false);
        expect(result.code).toBe('COORDINATES_UNAVAILABLE');
        expect(result.message).toContain('공식 위치 좌표가 등록되지 않아');

        // Attempt verification with (0, 0)
        const zeroResult = verifyComplexLocation(complex.name, 0, 0);
        expect(zeroResult.verified).toBe(false);
        expect(['COORDINATES_UNAVAILABLE', 'INVALID_COORDINATES']).toContain(zeroResult.code);

        rejectedCount++;
      }

      expect(rejectedCount).toBe(56);
    });

    it('handles unmapped complexes safely through POST /api/board/verify-location', async () => {
      const token = generateAuthorToken();
      const testUnmappedNames = [
        '동탄 레이크자이 더테라스',
        '능동마을 주공',
        '동탄파라곤',
      ];

      for (const name of testUnmappedNames) {
        const req = new NextRequest('http://localhost/api/board/verify-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            complexName: name,
            lat: 37.201452,
            lng: 127.096841,
            authorToken: token,
          }),
        });

        const res = await verifyLocationRoute(req);
        expect(res.status).toBe(200);
        const json = await res.json();

        expect(json.data.verified).toBe(false);
        expect(json.data.code).toBe('COORDINATES_UNAVAILABLE');

        // Verify repository profile was NOT marked verified
        const authorHash = hashAuthorToken(token);
        const profile = await memoryRepo.getAuthorProfile(authorHash);
        expect(profile?.isGpsVerified).toBeFalsy();
      }
    });
  });

  // =========================================================================
  // Challenge 4: Virtual Title '동탄 예비입주민' Boundary
  // =========================================================================
  describe('Challenge 4: Virtual Title "동탄 예비입주민" Boundary', () => {
    it('returns COORDINATES_UNAVAILABLE for "동탄 예비입주민" under any coordinates', () => {
      const testCoords = [
        { lat: 37.201452, lng: 127.096841 },
        { lat: 37.5665, lng: 126.978 },     // Seoul
        { lat: 35.1796, lng: 129.0756 },    // Busan
        { lat: 0, lng: 0 },
      ];

      for (const coord of testCoords) {
        const res = verifyComplexLocation(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE, coord.lat, coord.lng);
        expect(res.verified).toBe(false);
        expect(res.code).toBe('COORDINATES_UNAVAILABLE');
        expect(res.message).toContain('동탄 예비입주민 타이틀은 위치 인증 대상이 아닙니다');
      }
    });

    it('rejects "동탄 예비입주민" location verification through API route without modifying profile', async () => {
      const token = generateAuthorToken();
      const authorHash = hashAuthorToken(token);

      const req = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName: VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
          lat: 37.201452,
          lng: 127.096841,
          authorToken: token,
        }),
      });

      const res = await verifyLocationRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data.verified).toBe(false);
      expect(json.data.code).toBe('COORDINATES_UNAVAILABLE');

      const profile = await memoryRepo.getAuthorProfile(authorHash);
      expect(profile?.isGpsVerified).toBeFalsy();
    });
  });

  // =========================================================================
  // Challenge 5: Zero GPS Persistence Verification
  // =========================================================================
  describe('Challenge 5: Zero GPS Persistence Verification (Deep Forensic Inspection)', () => {
    const complexName = '동탄역 롯데캐슬';
    const rawLat = 37.201452;
    const rawLng = 127.096841;

    it('guarantees 0 bytes of GPS coordinates leaked into API responses and cookies', async () => {
      const token = generateAuthorToken();

      const req = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName,
          lat: rawLat,
          lng: rawLng,
          authorToken: token,
        }),
      });

      const res = await verifyLocationRoute(req);
      expect(res.status).toBe(200);

      // 1. Check response JSON
      const json = await res.json();
      expect(json.data.verified).toBe(true);

      const responseString = JSON.stringify(json);
      expect(responseString).not.toContain(String(rawLat));
      expect(responseString).not.toContain(String(rawLng));
      expect(responseString).not.toMatch(/"lat":/);
      expect(responseString).not.toMatch(/"lng":/);
      expect(responseString).not.toMatch(/"latitude":/);
      expect(responseString).not.toMatch(/"longitude":/);
      expect(responseString).not.toMatch(/"coordinates":/);

      // 2. Check Set-Cookie headers
      const setCookie = res.headers.get('set-cookie') || '';
      expect(setCookie).not.toContain(String(rawLat));
      expect(setCookie).not.toContain(String(rawLng));
    });

    it('guarantees 0 bytes of GPS coordinates stored in repository BoardAuthorProfile entity', async () => {
      const token = generateAuthorToken();
      const authorHash = hashAuthorToken(token);

      const req = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName,
          lat: rawLat,
          lng: rawLng,
          authorToken: token,
        }),
      });

      await verifyLocationRoute(req);

      const profile = await memoryRepo.getAuthorProfile(authorHash);
      expect(profile).not.toBeNull();
      expect(profile?.isGpsVerified).toBe(true);
      expect(profile?.gpsVerifiedComplex).toBe(complexName);

      // Inspect every single key in the stored profile object
      const profileKeys = Object.keys(profile as object);
      const forbiddenKeyPatterns = [
        'lat', 'lng', 'latitude', 'longitude', 'coord', 'coords', 'userLat', 'userLng',
      ];

      for (const forbidden of forbiddenKeyPatterns) {
        expect(profileKeys).not.toContain(forbidden);
      }

      // Deep serialize inspection
      const profileSerialized = JSON.stringify(profile);
      expect(profileSerialized).not.toContain(String(rawLat));
      expect(profileSerialized).not.toContain(String(rawLng));
    });

    it('guarantees 0 bytes of GPS coordinates in BoardPost and BoardPostDto entities', async () => {
      const token = generateAuthorToken();

      // 1. Verify location first
      const verifyReq = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName,
          lat: rawLat,
          lng: rawLng,
          authorToken: token,
        }),
      });
      await verifyLocationRoute(verifyReq);

      // 2. Create post
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          title: '동탄역 롯데캐슬 입주민 인증 글',
          content: 'GPS 300m 반경 인증을 통과한 작성자의 게시글입니다.',
          authorTitle: complexName,
          isGpsVerified: true,
        }),
      });

      const postRes = await createPostRoute(postReq);
      expect(postRes.status).toBe(201);
      const postJson = await postRes.json();

      expect(postJson.data.isGpsVerified).toBe(true);
      expect(postJson.data.authorTitle).toBe(complexName);

      // Inspect response DTO
      const dtoSerialized = JSON.stringify(postJson.data);
      expect(dtoSerialized).not.toContain(String(rawLat));
      expect(dtoSerialized).not.toContain(String(rawLng));
      expect(dtoSerialized).not.toMatch(/"lat":/);
      expect(dtoSerialized).not.toMatch(/"lng":/);

      // Inspect repository entity
      const { posts } = await memoryRepo.getPosts();
      expect(posts).toHaveLength(1);
      const rawPost = posts[0];

      const postKeys = Object.keys(rawPost);
      expect(postKeys).not.toContain('lat');
      expect(postKeys).not.toContain('lng');
      expect(postKeys).not.toContain('latitude');
      expect(postKeys).not.toContain('longitude');

      const rawPostSerialized = JSON.stringify(rawPost);
      expect(rawPostSerialized).not.toContain(String(rawLat));
      expect(rawPostSerialized).not.toContain(String(rawLng));
    });

    it('guarantees 0 bytes of GPS coordinates in BoardComment and BoardCommentDto entities', async () => {
      const token = generateAuthorToken();

      // 1. Verify location
      const verifyReq = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexName,
          lat: rawLat,
          lng: rawLng,
          authorToken: token,
        }),
      });
      await verifyLocationRoute(verifyReq);

      // 2. Create base post
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          title: '기준 게시글',
          content: '댓글 테스트용 기준 게시글 내용입니다.',
          authorTitle: complexName,
        }),
      });
      const postRes = await createPostRoute(postReq);
      const postJson = await postRes.json();
      const postId = postJson.data.id;

      // 3. Create comment
      const commentReq = new NextRequest(`http://localhost/api/board/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          content: '인증 입주민의 청정 댓글입니다.',
          authorTitle: complexName,
          isGpsVerified: true,
        }),
      });

      const commentRes = await createCommentRoute(commentReq, {
        params: Promise.resolve({ id: postId }),
      });
      expect(commentRes.status).toBe(201);
      const commentJson = await commentRes.json();

      expect(commentJson.data.isGpsVerified).toBe(true);

      // Inspect comment DTO
      const commentDtoSerialized = JSON.stringify(commentJson.data);
      expect(commentDtoSerialized).not.toContain(String(rawLat));
      expect(commentDtoSerialized).not.toContain(String(rawLng));

      // Inspect raw comment in repository
      const comments = await memoryRepo.getComments(postId);
      expect(comments).toHaveLength(1);
      const rawComment = comments[0];

      const commentKeys = Object.keys(rawComment);
      expect(commentKeys).not.toContain('lat');
      expect(commentKeys).not.toContain('lng');
      expect(commentKeys).not.toContain('latitude');
      expect(commentKeys).not.toContain('longitude');
    });

    it('neutralizes adversarial coordinate injections across profile, post, and comment endpoints', async () => {
      const token = generateAuthorToken();

      // 1. Attempt coordinate injection into POST /api/board/profile
      const injectProfileReq = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          selectedTitle: complexName,
          lat: rawLat,
          lng: rawLng,
          latitude: rawLat,
          longitude: rawLng,
          coordinates: [rawLat, rawLng],
        }),
      });
      const profileRes = await setProfileRoute(injectProfileReq);
      expect(profileRes.status).toBe(200);

      const authorHash = hashAuthorToken(token);
      const profile = await memoryRepo.getAuthorProfile(authorHash);
      expect((profile as any).lat).toBeUndefined();
      expect((profile as any).lng).toBeUndefined();
      expect((profile as any).coordinates).toBeUndefined();

      // 2. Attempt coordinate injection into POST /api/board/posts
      const injectPostReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          title: '악의적 좌표 주입 시도 게시글',
          content: '게시글 페이로드에 위도 경도를 강제로 주입하려고 시도합니다.',
          authorTitle: complexName,
          lat: rawLat,
          lng: rawLng,
          userCoords: { lat: rawLat, lng: rawLng },
        }),
      });
      const postRes = await createPostRoute(injectPostReq);
      expect(postRes.status).toBe(201);

      const { posts } = await memoryRepo.getPosts();
      const injectedPost = posts[0];
      expect((injectedPost as any).lat).toBeUndefined();
      expect((injectedPost as any).lng).toBeUndefined();
      expect((injectedPost as any).userCoords).toBeUndefined();

      // 3. Attempt coordinate injection into POST /api/board/posts/[id]/comments
      const injectCommentReq = new NextRequest(
        `http://localhost/api/board/posts/${injectedPost.id}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: token,
          },
          body: JSON.stringify({
            content: '댓글 페이로드 좌표 주입 시도',
            authorTitle: complexName,
            lat: rawLat,
            lng: rawLng,
          }),
        }
      );
      const commentRes = await createCommentRoute(injectCommentReq, {
        params: Promise.resolve({ id: injectedPost.id }),
      });
      expect(commentRes.status).toBe(201);

      const comments = await memoryRepo.getComments(injectedPost.id);
      expect((comments[0] as any).lat).toBeUndefined();
      expect((comments[0] as any).lng).toBeUndefined();
    });
  });

  // =========================================================================
  // Challenge 6: GPS Verification Integrity & Anti-Spoofing
  // =========================================================================
  describe('Challenge 6: GPS Verification Integrity & Anti-Spoofing', () => {
    it('neutralizes unverified author claiming isGpsVerified: true in POST /api/board/posts', async () => {
      const token = generateAuthorToken();

      // Attacker has never verified GPS, but crafts payload claiming isGpsVerified = true
      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          title: '스푸핑 시도 게시글',
          content: 'GPS 인증 없이 배지만 가로채려는 시도입니다.',
          authorTitle: '동탄역 롯데캐슬',
          isGpsVerified: true, // Spoofed claim
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      // Must be forced to false by the server
      expect(json.data.isGpsVerified).toBe(false);

      const { posts } = await memoryRepo.getPosts();
      expect(posts[0].isGpsVerified).toBe(false);
    });

    it('neutralizes unverified author claiming isGpsVerified: true in comments', async () => {
      const token = generateAuthorToken();

      const post = await memoryRepo.createPost({
        title: '기준 글',
        content: '내용입니다.',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(token),
      });

      const req = new NextRequest(`http://localhost/api/board/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          content: '댓글 스푸핑 시도',
          authorTitle: '동탄역 롯데캐슬',
          isGpsVerified: true, // Spoofed claim
        }),
      });

      const res = await createCommentRoute(req, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.isGpsVerified).toBe(false);

      const comments = await memoryRepo.getComments(post.id);
      expect(comments[0].isGpsVerified).toBe(false);
    });

    it('bars GPS verification of Complex B when user profile is 30-day locked to Complex A', async () => {
      const token = generateAuthorToken();
      const authorHash = hashAuthorToken(token);

      // 1. Establish 30-day title lock to Complex A ('동탄역 롯데캐슬')
      const profileReq = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          selectedTitle: '동탄역 롯데캐슬',
        }),
      });
      const profileRes = await setProfileRoute(profileReq);
      expect(profileRes.status).toBe(200);

      // 2. Attacker moves to Complex B ('동탄역 시범 우남퍼스트빌' lat: 37.202396, lng: 127.103986)
      // and tries to verify location for Complex B while still locked to Complex A
      const uNamData = getComplexData('동탄역 시범 우남퍼스트빌');
      expect(uNamData).not.toBeNull();

      const verifyReq = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          complexName: '동탄역 시범 우남퍼스트빌',
          lat: uNamData!.lat,
          lng: uNamData!.lng,
          authorToken: token,
        }),
      });

      const verifyRes = await verifyLocationRoute(verifyReq);
      expect(verifyRes.status).toBe(400);
      const verifyJson = await verifyRes.json();
      expect(verifyJson.error || verifyJson.code).toBe('TITLE_LOCKED_30_DAYS');
      expect(verifyJson.message).toContain('30일 타이틀 고정 기간 중에는 다른 단지 위치 인증을 진행할 수 없습니다');

      // Verify profile is still locked to Complex A and unverified for Complex B
      const currentProfile = await memoryRepo.getAuthorProfile(authorHash);
      expect(currentProfile?.selectedTitle).toBe('동탄역 롯데캐슬');
      expect(currentProfile?.gpsVerifiedComplex).toBeUndefined();
    });
  });
});

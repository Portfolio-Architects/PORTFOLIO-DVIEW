/**
 * Unit & Integration Test Suite for Board Domain Engines (Milestone 2)
 *
 * 1. Complex Title Registry & Constants (184 titles, 127 geocoded, 56 unmapped)
 * 2. Deterministic GPS 300m Haversine Verification & Exact Boundaries (299m, 300m, 301m)
 * 3. 56 Unmapped Complexes & '동탄 예비입주민' Fallback Handling
 * 4. 30-Day Anti-Impersonation Title Locking Math (Day 1, 29, 30, 31)
 * 5. Zero GPS Persistence Guarantee (Transient only, 0 bytes in DB/responses)
 * 6. REST API Routes (/api/board/verify-location, /api/board/profile, enforcement on posts & comments)
 */

import { NextRequest } from 'next/server';
import {
  VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
  EARTH_RADIUS_METERS,
  GPS_VERIFICATION_THRESHOLD_METERS,
  TITLE_LOCK_DURATION_MS,
  getAllSelectableTitles,
  getAllComplexes,
  getGeocodedComplexes,
  getUnmappedComplexes,
  getComplexData,
  isUnmappedComplex,
  isGeocodedComplex,
  calculateHaversineDistance,
  verifyComplexLocation,
  checkTitleLock,
} from '@/lib/board/boardEngine';
import {
  getBoardRepository,
  MemoryBoardRepository,
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
import { POST as createPostRoute } from '@/app/api/board/posts/route';
import { POST as createCommentRoute } from '@/app/api/board/posts/[id]/comments/route';

describe('Milestone 2 — Domain Engines & API Integration', () => {
  let memoryRepo: MemoryBoardRepository;

  beforeEach(() => {
    memoryRepo = getBoardRepository(true) as MemoryBoardRepository;
    memoryRepo.clearForTest?.();
  });

  // =========================================================================
  // 1. Complex Title Registry & Dataset Partitioning
  // =========================================================================
  describe('1. Complex Title Registry & Dataset Partitioning', () => {
    it('provides exactly 184 selectable titles (183 complexes + 동탄 예비입주민)', () => {
      const titles = getAllSelectableTitles();
      expect(titles).toHaveLength(184);

      // Must be unique
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(184);

      // Must contain virtual prospective resident title
      expect(titles).toContain(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE);
      expect(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE).toBe('동탄 예비입주민');
    });

    it('partitions complexes into exactly 127 geocoded and 56 unmapped complexes', () => {
      const allComplexes = getAllComplexes();
      expect(allComplexes).toHaveLength(183);

      const geocoded = getGeocodedComplexes();
      expect(geocoded).toHaveLength(127);

      const unmapped = getUnmappedComplexes();
      expect(unmapped).toHaveLength(56);

      // Sum must equal total
      expect(geocoded.length + unmapped.length).toBe(183);

      // All geocoded must have lat > 0 and lng > 0
      for (const c of geocoded) {
        expect(c.hasCoords).toBe(true);
        expect(c.lat).toBeGreaterThan(0);
        expect(c.lng).toBeGreaterThan(0);
        expect(isGeocodedComplex(c.name)).toBe(true);
        expect(isUnmappedComplex(c.name)).toBe(false);
      }

      // All unmapped must have lat === 0 and lng === 0
      for (const c of unmapped) {
        expect(c.hasCoords).toBe(false);
        expect(c.lat).toBe(0);
        expect(c.lng).toBe(0);
        expect(isUnmappedComplex(c.name)).toBe(true);
        expect(isGeocodedComplex(c.name)).toBe(false);
      }
    });

    it('retrieves complex metadata by name and returns null for virtual or invalid titles', () => {
      // 1. Geocoded complex
      const lotte = getComplexData('동탄역 롯데캐슬');
      expect(lotte).not.toBeNull();
      expect(lotte?.name).toBe('동탄역 롯데캐슬');
      expect(lotte?.dong).toBe('여울동');
      expect(lotte?.hasCoords).toBe(true);
      expect(lotte?.lat).toBeCloseTo(37.201452, 4);
      expect(lotte?.lng).toBeCloseTo(127.096841, 4);

      // 2. Unmapped complex
      const paragon = getComplexData('동탄파라곤');
      expect(paragon).not.toBeNull();
      expect(paragon?.name).toBe('동탄파라곤');
      expect(paragon?.dong).toBe('반송동');
      expect(paragon?.hasCoords).toBe(false);
      expect(paragon?.lat).toBe(0);
      expect(paragon?.lng).toBe(0);

      // 3. Virtual title '동탄 예비입주민' is not in physical complex table
      expect(getComplexData(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE)).toBeNull();

      // 4. Unknown title
      expect(getComplexData('가상의 아파트 99차')).toBeNull();
    });
  });

  // =========================================================================
  // 2. Spherical Haversine Distance & Exact 300m Boundaries
  // =========================================================================
  describe('2. Spherical Haversine Distance & Exact 300m Boundaries', () => {
    it('verifies standard constants and numerical identity', () => {
      expect(EARTH_RADIUS_METERS).toBe(6371000);
      expect(GPS_VERIFICATION_THRESHOLD_METERS).toBe(300);
      expect(TITLE_LOCK_DURATION_MS).toBe(30 * 24 * 60 * 60 * 1000);

      // Distance to same point is 0
      const distSame = calculateHaversineDistance(37.20055, 127.09491, 37.20055, 127.09491);
      expect(distSame).toBe(0);

      // Distance with invalid numbers is 0
      expect(calculateHaversineDistance(NaN, 127, 37, 127)).toBe(0);
      expect(calculateHaversineDistance(37, Infinity, 37, 127)).toBe(0);
    });

    it('enforces mathematical 300m threshold boundaries: 299m -> true, 300m -> true, 301m -> false', () => {
      const lotte = getComplexData('동탄역 롯데캐슬')!;
      expect(lotte).toBeDefined();

      // Delta latitude in degrees for exact meters along meridian:
      // deltaLat = meters * (180 / (PI * R))
      const deltaLatForMeters = (m: number) => m * (180 / (Math.PI * EARTH_RADIUS_METERS));

      // 1. Boundary: 299 meters
      const lat299 = lotte.lat + deltaLatForMeters(299);
      const res299 = verifyComplexLocation('동탄역 롯데캐슬', lat299, lotte.lng);
      expect(res299.verified).toBe(true);
      expect(res299.distanceMeters).toBe(299);
      expect(res299.message).toContain('단지 위치 인증이 완료되었습니다');

      // 2. Boundary: 300 meters (Exact threshold)
      const lat300 = lotte.lat + deltaLatForMeters(300);
      const res300 = verifyComplexLocation('동탄역 롯데캐슬', lat300, lotte.lng);
      expect(res300.verified).toBe(true);
      expect(res300.distanceMeters).toBe(300);
      expect(res300.message).toContain('300m 이내');

      // 3. Boundary: 301 meters (Out of range)
      const lat301 = lotte.lat + deltaLatForMeters(301);
      const res301 = verifyComplexLocation('동탄역 롯데캐슬', lat301, lotte.lng);
      expect(res301.verified).toBe(false);
      expect(res301.distanceMeters).toBe(301);
      expect(res301.code).toBe('OUT_OF_RANGE');
      expect(res301.message).toContain('300m 이내에 위치하지 않습니다');
    });

    it('rejects coordinates when user is far away (e.g. 5km distance)', () => {
      const lotte = getComplexData('동탄역 롯데캐슬')!;
      // ~5km north
      const farLat = lotte.lat + 0.045;
      const res = verifyComplexLocation('동탄역 롯데캐슬', farLat, lotte.lng);
      expect(res.verified).toBe(false);
      expect(res.code).toBe('OUT_OF_RANGE');
      expect(res.distanceMeters).toBeGreaterThan(4000);
    });

    it('safely handles degenerate and invalid coordinates without crashing', () => {
      const resNaN = verifyComplexLocation('동탄역 롯데캐슬', NaN, 127.09491);
      expect(resNaN.verified).toBe(false);
      expect(resNaN.code).toBe('INVALID_COORDINATES');

      const resZero = verifyComplexLocation('동탄역 롯데캐슬', 0, 0);
      expect(resZero.verified).toBe(false);
      expect(resZero.code).toBe('INVALID_COORDINATES');

      const resOutRange = verifyComplexLocation('동탄역 롯데캐슬', 120.0, 300.0);
      expect(resOutRange.verified).toBe(false);
      expect(resOutRange.code).toBe('INVALID_COORDINATES');

      const resUnknown = verifyComplexLocation('미등록단지', 37.2, 127.1);
      expect(resUnknown.verified).toBe(false);
      expect(resUnknown.code).toBe('INVALID_COMPLEX');
    });
  });

  // =========================================================================
  // 3. 56 Unmapped Complexes & Virtual Title Fallback Handling
  // =========================================================================
  describe('3. 56 Unmapped Complexes & Virtual Title Fallback Handling', () => {
    it('always returns COORDINATES_UNAVAILABLE for virtual title 동탄 예비입주민', () => {
      const res = verifyComplexLocation(
        VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
        37.20055,
        127.09491
      );
      expect(res.verified).toBe(false);
      expect(res.code).toBe('COORDINATES_UNAVAILABLE');
      expect(res.message).toBe('동탄 예비입주민 타이틀은 위치 인증 대상이 아닙니다.');
    });

    it('always returns COORDINATES_UNAVAILABLE for all 56 unmapped complexes', () => {
      const unmapped = getUnmappedComplexes();
      expect(unmapped).toHaveLength(56);

      // Test a representative sample of unmapped complexes
      const sampleUnmapped = [
        '능동마을 주공',
        '동탄 레이크자이 더테라스',
        '동탄2신도시 동탄역 대방엘리움',
        '동탄호수공원 리슈빌',
        'e편한세상 동탄 파크아너스',
        '동탄 중흥에스클래스 파크뷰',
        '동탄파라곤',
      ];

      for (const name of sampleUnmapped) {
        const res = verifyComplexLocation(name, 37.20055, 127.09491);
        expect(res.verified).toBe(false);
        expect(res.code).toBe('COORDINATES_UNAVAILABLE');
        expect(res.message).toBe(
          '해당 단지는 공식 위치 좌표가 등록되지 않아 GPS 인증이 지원되지 않습니다.'
        );
      }
    });
  });

  // =========================================================================
  // 4. 30-Day Anti-Impersonation Title Locking Math
  // =========================================================================
  describe('4. 30-Day Anti-Impersonation Title Locking Math', () => {
    it('allows title selection when author has no profile or profile is expired', () => {
      // 1. No profile
      const res1 = checkTitleLock(null, '동탄역 롯데캐슬');
      expect(res1.allowed).toBe(true);

      // 2. Expired profile
      const now = Date.now();
      const expiredProfile = {
        authorTokenHash: 'hash',
        selectedTitle: '동탄역 롯데캐슬',
        titleSetAt: now - 35 * 24 * 60 * 60 * 1000,
        titleExpiresAt: now - 5 * 24 * 60 * 60 * 1000,
        isGpsVerified: true,
      };
      const res2 = checkTitleLock(expiredProfile, '동탄린스트라우스 더레이크', now);
      expect(res2.allowed).toBe(true);
    });

    it('allows same title re-selection anytime during lock period', () => {
      const now = Date.now();
      const activeProfile = {
        authorTokenHash: 'hash',
        selectedTitle: '동탄역 롯데캐슬',
        titleSetAt: now,
        titleExpiresAt: now + TITLE_LOCK_DURATION_MS,
        isGpsVerified: true,
      };

      const res = checkTitleLock(activeProfile, '동탄역 롯데캐슬', now + 10 * 24 * 60 * 60 * 1000);
      expect(res.allowed).toBe(true);
    });

    it('accurately calculates remaining days: Day 1 -> 30/29 rejected, Day 29 -> 1 rejected, Day 31 -> allowed', () => {
      const t0 = 1762000000000; // baseline timestamp
      const DAY_MS = 24 * 60 * 60 * 1000;
      const lockedProfile = {
        authorTokenHash: 'hash',
        selectedTitle: '동탄역 롯데캐슬',
        titleSetAt: t0,
        titleExpiresAt: t0 + TITLE_LOCK_DURATION_MS, // t0 + 30 days
        isGpsVerified: false,
      };

      // Day 1 (t0 + 1 day): 29 days left -> REJECTED
      const day1 = checkTitleLock(lockedProfile, '동탄역 린스트라우스', t0 + 1 * DAY_MS);
      expect(day1.allowed).toBe(false);
      expect(day1.reason).toBe('TITLE_LOCKED_30_DAYS');
      expect(day1.daysRemaining).toBe(29);

      // Day 15 (t0 + 15 days): 15 days left -> REJECTED
      const day15 = checkTitleLock(lockedProfile, '동탄역 린스트라우스', t0 + 15 * DAY_MS);
      expect(day15.allowed).toBe(false);
      expect(day15.daysRemaining).toBe(15);

      // Day 29 (t0 + 29 days): 1 day left -> REJECTED
      const day29 = checkTitleLock(lockedProfile, '동탄역 린스트라우스', t0 + 29 * DAY_MS);
      expect(day29.allowed).toBe(false);
      expect(day29.daysRemaining).toBe(1);

      // Day 30 (t0 + 30 days exact expiry timestamp): ALLOWED
      const day30 = checkTitleLock(lockedProfile, '동탄역 린스트라우스', t0 + 30 * DAY_MS);
      expect(day30.allowed).toBe(true);

      // Day 31 (t0 + 31 days): ALLOWED
      const day31 = checkTitleLock(lockedProfile, '동탄역 린스트라우스', t0 + 31 * DAY_MS);
      expect(day31.allowed).toBe(true);
    });
  });

  // =========================================================================
  // 5. Zero GPS Persistence Guarantee
  // =========================================================================
  describe('5. Zero GPS Persistence Guarantee', () => {
    it('guarantees that POST /api/board/verify-location never persists or leaks coordinates', async () => {
      const token = generateAuthorToken();
      const lotte = getComplexData('동탄역 롯데캐슬')!;

      const req = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          complexName: '동탄역 롯데캐슬',
          lat: lotte.lat,
          lng: lotte.lng,
        }),
      });

      const res = await verifyLocationRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.verified).toBe(true);

      // Response payload must NEVER contain lat/lng/latitude/longitude
      expect((json.data as Record<string, unknown>).lat).toBeUndefined();
      expect((json.data as Record<string, unknown>).lng).toBeUndefined();
      expect((json.data as Record<string, unknown>).latitude).toBeUndefined();
      expect((json.data as Record<string, unknown>).longitude).toBeUndefined();

      // Repository profile must NEVER store lat/lng
      const authorHash = hashAuthorToken(token);
      const profile = await memoryRepo.getAuthorProfile(authorHash);
      expect(profile).not.toBeNull();
      expect(profile?.isGpsVerified).toBe(true);
      expect(profile?.gpsVerifiedComplex).toBe('동탄역 롯데캐슬');

      const rawProfile = profile as unknown as Record<string, unknown>;
      expect(rawProfile.lat).toBeUndefined();
      expect(rawProfile.lng).toBeUndefined();
      expect(rawProfile.latitude).toBeUndefined();
      expect(rawProfile.longitude).toBeUndefined();
      expect(rawProfile.userCoords).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. REST API Route Handlers Integration
  // =========================================================================
  describe('6. REST API Route Handlers Integration', () => {
    const authorToken = generateAuthorToken();
    const authorHash = hashAuthorToken(authorToken);

    it('POST /api/board/profile sets title and establishes 30-day lock', async () => {
      const req = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
        },
        body: JSON.stringify({
          selectedTitle: '동탄역 롯데캐슬',
        }),
      });

      const res = await setProfileRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.profile.selectedTitle).toBe('동탄역 롯데캐슬');
      expect(json.data.profile.dong).toBe('여울동');
      expect(json.data.profile.isLocked).toBe(true);
      expect(json.data.profile.daysRemaining).toBe(30);

      // Verify profile in repo
      const profileInRepo = await memoryRepo.getAuthorProfile(authorHash);
      expect(profileInRepo?.selectedTitle).toBe('동탄역 롯데캐슬');
    });

    it('POST /api/board/profile rejects unauthorized title change during 30-day lock', async () => {
      // Setup initial profile locked to '동탄역 롯데캐슬'
      await setProfileRoute(
        new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({ selectedTitle: '동탄역 롯데캐슬' }),
        })
      );

      // Attempt to change title to another complex
      const req = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
        },
        body: JSON.stringify({
          selectedTitle: '동탄린스트라우스 더레이크',
        }),
      });

      const res = await setProfileRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('TITLE_LOCKED_30_DAYS');
      expect((json.details as { daysRemaining?: number })?.daysRemaining).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/board/profile rejects invalid title not in 184 list', async () => {
      const intruderToken = generateAuthorToken();
      const req = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
        },
        body: JSON.stringify({
          selectedTitle: '강남 아크로리버파크',
        }),
      });

      const res = await setProfileRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('INVALID_TITLE');
    });

    it('GET /api/board/profile returns caller profile and lock status', async () => {
      // Setup initial profile
      await setProfileRoute(
        new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({ selectedTitle: '동탄역 롯데캐슬' }),
        })
      );

      const req = new NextRequest('http://localhost/api/board/profile', {
        headers: {
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
        },
      });

      const res = await getProfileRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.profile.selectedTitle).toBe('동탄역 롯데캐슬');
      expect(json.data.profile.isLocked).toBe(true);
      expect(json.data.profile.daysRemaining).toBe(30);
      expect(json.data.profile.isGpsVerified).toBe(false);
    });

    it('POST /api/board/verify-location handles out of range and unmapped cases', async () => {
      // 1. Out of range (>300m)
      const reqOut = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
        },
        body: JSON.stringify({
          complexName: '동탄역 롯데캐슬',
          lat: 37.25, // Far away
          lng: 127.09,
        }),
      });

      const resOut = await verifyLocationRoute(reqOut);
      expect(resOut.status).toBe(200);
      const jsonOut = await resOut.json();
      expect(jsonOut.data.verified).toBe(false);
      expect(jsonOut.data.code).toBe('OUT_OF_RANGE');

      // 2. Unmapped complex
      const reqUnmapped = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          complexName: '동탄파라곤',
          lat: 37.20055,
          lng: 127.09491,
        }),
      });

      const resUnmapped = await verifyLocationRoute(reqUnmapped);
      expect(resUnmapped.status).toBe(200);
      const jsonUnmapped = await resUnmapped.json();
      expect(jsonUnmapped.data.verified).toBe(false);
      expect(jsonUnmapped.data.code).toBe('COORDINATES_UNAVAILABLE');
    });

    it('enforces 30-day title lock on POST /api/board/posts: rejects posting under different title', async () => {
      // Lock author to '동탄역 롯데캐슬'
      await setProfileRoute(
        new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({ selectedTitle: '동탄역 롯데캐슬' }),
        })
      );

      // authorToken is locked to '동탄역 롯데캐슬'
      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
        },
        body: JSON.stringify({
          title: '사칭 시도 게시글',
          content: '다른 단지 이름으로 사칭하여 글을 작성하려고 합니다.',
          authorTitle: '동탄린스트라우스 더레이크',
          isGpsVerified: false,
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('TITLE_LOCKED_30_DAYS');
      expect(json.message).toContain('30일 타이틀 고정 기간 중에는');
    });

    it('enforces verified badge integrity: rejects forged isGpsVerified: true', async () => {
      const rogueToken = generateAuthorToken();
      // Rogue caller claims isGpsVerified: true without passing GPS verification
      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: rogueToken,
        },
        body: JSON.stringify({
          title: '위치 인증 위조 시도',
          content: '실제 단지 위치에 가지 않고 뱃지만 가짜로 보내는 요청입니다.',
          authorTitle: '동탄역 롯데캐슬',
          isGpsVerified: true,
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      // Forged badge MUST BE neutralized to false
      expect(json.data.isGpsVerified).toBe(false);
    });

    it('confers verified badge only when author is legitimately GPS verified in repository', async () => {
      const verifiedToken = generateAuthorToken();
      const lotte = getComplexData('동탄역 롯데캐슬')!;

      // 1. Pass legitimate GPS verification
      const verifyReq = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: verifiedToken,
        },
        body: JSON.stringify({
          complexName: '동탄역 롯데캐슬',
          lat: lotte.lat,
          lng: lotte.lng,
        }),
      });
      const verifyRes = await verifyLocationRoute(verifyReq);
      expect(verifyRes.status).toBe(200);
      const verifyJson = await verifyRes.json();
      expect(verifyJson.data.verified).toBe(true);

      // 2. Post under verified title
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: verifiedToken,
        },
        body: JSON.stringify({
          title: '공인 인증 입주민 게시글',
          content: 'GPS 300m 이내 인증을 완료한 진정한 입주민의 게시글입니다.',
          authorTitle: '동탄역 롯데캐슬',
        }),
      });

      const postRes = await createPostRoute(postReq);
      expect(postRes.status).toBe(201);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);
      // Legitimately verified post has isGpsVerified: true
      expect(postJson.data.isGpsVerified).toBe(true);

      // 3. Comment under verified title
      const commentReq = new NextRequest(
        `http://localhost/api/board/posts/${postJson.data.id}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: verifiedToken,
          },
          body: JSON.stringify({
            content: '인증 뱃지가 유지되는 진성 입주민 댓글입니다.',
            authorTitle: '동탄역 롯데캐슬',
          }),
        }
      );

      const commentRes = await createCommentRoute(commentReq, {
        params: Promise.resolve({ id: postJson.data.id }),
      });
      expect(commentRes.status).toBe(201);
      const commentJson = await commentRes.json();
      expect(commentJson.data.isGpsVerified).toBe(true);
    });

    it('enforces 30-day title lock on POST /api/board/posts/[id]/comments: rejects comment under different title', async () => {
      // Post created by authorToken (locked to '동탄역 롯데캐슬')
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
        },
        body: JSON.stringify({
          title: '댓글 단지 사칭 방지 테스트',
          content: '댓글 작성 시에도 단지 사칭이 차단되어야 합니다.',
          authorTitle: '동탄역 롯데캐슬',
        }),
      });
      const postRes = await createPostRoute(postReq);
      const postJson = await postRes.json();

      // Attempt to comment under different title using same authorToken
      const commentReq = new NextRequest(
        `http://localhost/api/board/posts/${postJson.data.id}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({
            content: '댓글 단지 사칭 시도',
            authorTitle: '동탄린스트라우스 더레이크',
          }),
        }
      );

      const commentRes = await createCommentRoute(commentReq, {
        params: Promise.resolve({ id: postJson.data.id }),
      });
      expect(commentRes.status).toBe(400);
      const commentJson = await commentRes.json();
      expect(commentJson.code).toBe('TITLE_LOCKED_30_DAYS');
      expect(commentJson.message).toContain('30일 타이틀 고정 기간 중에는');
    });

    it('POST /api/board/posts rejects unlisted or arbitrary titles not in 184 title list with 400 INVALID_TITLE', async () => {
      const rogueToken = generateAuthorToken();
      const rogueHash = hashAuthorToken(rogueToken);

      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: rogueToken,
        },
        body: JSON.stringify({
          title: '임의 단지 사칭 게시글',
          content: '존재하지 않거나 비인가된 단지명으로 글을 작성하려고 시도합니다.',
          authorTitle: '가짜아파트',
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('INVALID_TITLE');
      expect(json.message).toBe('유효하지 않은 단지명입니다.');

      // Ensure no post was created and no profile was stored
      const { total } = await memoryRepo.getPosts();
      expect(total).toBe(0);
      const storedProfile = await memoryRepo.getAuthorProfile(rogueHash);
      expect(storedProfile).toBeNull();
    });

    it('POST /api/board/posts/[id]/comments rejects unlisted or arbitrary titles with 400 INVALID_TITLE', async () => {
      // Create a valid post first
      const validToken = generateAuthorToken();
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: validToken,
        },
        body: JSON.stringify({
          title: '정상 게시글',
          content: '댓글 테스트를 위한 정상 게시글 본문입니다.',
          authorTitle: '동탄역 롯데캐슬',
        }),
      });
      const postRes = await createPostRoute(postReq);
      const postJson = await postRes.json();
      expect(postRes.status).toBe(201);

      // Attempt to comment with unlisted title
      const rogueCommenterToken = generateAuthorToken();
      const commentReq = new NextRequest(
        `http://localhost/api/board/posts/${postJson.data.id}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: rogueCommenterToken,
          },
          body: JSON.stringify({
            content: '비인가 단지 타이틀 댓글 작성 시도',
            authorTitle: '국토교통부',
          }),
        }
      );

      const commentRes = await createCommentRoute(commentReq, {
        params: Promise.resolve({ id: postJson.data.id }),
      });
      expect(commentRes.status).toBe(400);

      const commentJson = await commentRes.json();
      expect(commentJson.success).toBe(false);
      expect(commentJson.code).toBe('INVALID_TITLE');
      expect(commentJson.message).toBe('유효하지 않은 단지명입니다.');

      // Verify comment count on post remains 0
      const fetchedPost = await memoryRepo.getPostById(postJson.data.id);
      expect(fetchedPost?.commentCount).toBe(0);
    });

    it('re-establishes 30-day lock when posting under a new title after previous profile expires', async () => {
      const expiredToken = generateAuthorToken();
      const expiredHash = hashAuthorToken(expiredToken);
      const pastTime = Date.now() - 35 * 24 * 60 * 60 * 1000;

      // Seed an expired profile locked to '동탄역 롯데캐슬'
      await memoryRepo.saveAuthorProfile({
        authorTokenHash: expiredHash,
        selectedTitle: '동탄역 롯데캐슬',
        dong: '여울동',
        titleSetAt: pastTime,
        titleExpiresAt: pastTime + TITLE_LOCK_DURATION_MS, // expired 5 days ago
        isGpsVerified: true,
        gpsVerifiedComplex: '동탄역 롯데캐슬',
        gpsVerifiedAt: pastTime,
      });

      // Post under a new title '동탄린스트라우스 더레이크'
      const postReq1 = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: expiredToken,
        },
        body: JSON.stringify({
          title: '만료 후 단지 변경 게시글',
          content: '30일 잠금 기간 만료 후 합법적으로 새로운 단지명으로 작성합니다.',
          authorTitle: '동탄린스트라우스 더레이크',
        }),
      });

      const postRes1 = await createPostRoute(postReq1);
      expect(postRes1.status).toBe(201);
      const postJson1 = await postRes1.json();
      expect(postJson1.success).toBe(true);
      expect(postJson1.data.authorTitle).toBe('동탄린스트라우스 더레이크');

      // Verify repository profile: must be re-locked for 30 days under new title, isGpsVerified reset to false
      const updatedProfile = await memoryRepo.getAuthorProfile(expiredHash);
      expect(updatedProfile).not.toBeNull();
      expect(updatedProfile?.selectedTitle).toBe('동탄린스트라우스 더레이크');
      expect(updatedProfile?.isGpsVerified).toBe(false);
      const now = Date.now();
      expect(updatedProfile?.titleExpiresAt).toBeGreaterThan(now + 29 * 24 * 60 * 60 * 1000);

      // Attempt immediate second post under a third title -> must be rejected with TITLE_LOCKED_30_DAYS
      const postReq2 = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: expiredToken,
        },
        body: JSON.stringify({
          title: '무한 페르소나 전환 시도',
          content: '재잠금 없이 또 다른 단지로 바로 전환하려고 시도합니다.',
          authorTitle: '동탄역 반도유보라 아이비파크 8.0',
        }),
      });

      const postRes2 = await createPostRoute(postReq2);
      expect(postRes2.status).toBe(400);
      const postJson2 = await postRes2.json();
      expect(postJson2.code).toBe('TITLE_LOCKED_30_DAYS');
      expect((postJson2.details as { daysRemaining?: number })?.daysRemaining).toBe(30);
    });

    it('re-establishes 30-day lock when commenting under a new title after previous profile expires', async () => {
      // 1. Create a post
      const hostToken = generateAuthorToken();
      const postRes = await createPostRoute(
        new NextRequest('http://localhost/api/board/posts', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: hostToken,
          },
          body: JSON.stringify({
            title: '댓글 재잠금 테스트 글',
            content: '댓글 작성 시의 재잠금 동작을 검증하기 위한 게시글입니다.',
            authorTitle: '동탄역 롯데캐슬',
          }),
        })
      );
      const postJson = await postRes.json();

      // 2. Setup expired commenter profile
      const expiredCommenterToken = generateAuthorToken();
      const expiredCommenterHash = hashAuthorToken(expiredCommenterToken);
      const pastTime = Date.now() - 40 * 24 * 60 * 60 * 1000;
      await memoryRepo.saveAuthorProfile({
        authorTokenHash: expiredCommenterHash,
        selectedTitle: '동탄역 롯데캐슬',
        dong: '여울동',
        titleSetAt: pastTime,
        titleExpiresAt: pastTime + TITLE_LOCK_DURATION_MS,
        isGpsVerified: true,
      });

      // 3. Comment under new title '동탄린스트라우스 더레이크'
      const commentRes1 = await createCommentRoute(
        new NextRequest(
          `http://localhost/api/board/posts/${postJson.data.id}/comments`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              [AUTHOR_TOKEN_HEADER_NAME]: expiredCommenterToken,
            },
            body: JSON.stringify({
              content: '만료 후 새로운 단지로 작성하는 첫 댓글',
              authorTitle: '동탄린스트라우스 더레이크',
            }),
          }
        ),
        { params: Promise.resolve({ id: postJson.data.id }) }
      );
      expect(commentRes1.status).toBe(201);

      // Verify profile is re-locked for 30 days under '동탄린스트라우스 더레이크'
      const reLockedProfile = await memoryRepo.getAuthorProfile(expiredCommenterHash);
      expect(reLockedProfile?.selectedTitle).toBe('동탄린스트라우스 더레이크');
      expect(reLockedProfile?.titleExpiresAt).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);

      // 4. Immediate second comment under another title -> rejected
      const commentRes2 = await createCommentRoute(
        new NextRequest(
          `http://localhost/api/board/posts/${postJson.data.id}/comments`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              [AUTHOR_TOKEN_HEADER_NAME]: expiredCommenterToken,
            },
            body: JSON.stringify({
              content: '재잠금 기간 중 또 다른 단지로 댓글 시도',
              authorTitle: '동탄역 롯데캐슬',
            }),
          }
        ),
        { params: Promise.resolve({ id: postJson.data.id }) }
      );
      expect(commentRes2.status).toBe(400);
      const commentJson2 = await commentRes2.json();
      expect(commentJson2.code).toBe('TITLE_LOCKED_30_DAYS');
    });

    it('refreshes expired titleExpiresAt on successful location verification', async () => {
      const expiredToken = generateAuthorToken();
      const expiredHash = hashAuthorToken(expiredToken);
      const pastTime = Date.now() - 35 * 24 * 60 * 60 * 1000;
      const lotte = getComplexData('동탄역 롯데캐슬')!;

      // Profile expired 5 days ago
      await memoryRepo.saveAuthorProfile({
        authorTokenHash: expiredHash,
        selectedTitle: '동탄역 롯데캐슬',
        dong: '여울동',
        titleSetAt: pastTime,
        titleExpiresAt: pastTime + TITLE_LOCK_DURATION_MS,
        isGpsVerified: false,
      });

      // Verify location successfully
      const req = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: expiredToken,
        },
        body: JSON.stringify({
          complexName: '동탄역 롯데캐슬',
          lat: lotte.lat,
          lng: lotte.lng,
        }),
      });

      const res = await verifyLocationRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.verified).toBe(true);

      const refreshedProfile = await memoryRepo.getAuthorProfile(expiredHash);
      expect(refreshedProfile).not.toBeNull();
      expect(refreshedProfile?.isGpsVerified).toBe(true);
      expect(refreshedProfile?.titleExpiresAt).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    });
  });
});

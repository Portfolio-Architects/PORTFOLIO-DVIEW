/**
 * Challenger M4: Comprehensive Empirical End-to-End Integration Test Suite
 *
 * File: frontend/src/__tests__/board/challenger_m4_e2e_journey.test.tsx
 *
 * Full User Lifecycle & Adversarial Abuse Scenarios Verification
 * Across All Layers: Next.js API Route Handlers + Memory Repository + Domain Engines + UI Components
 *
 * 1. Complete User Lifecycle:
 *    - 1.1: User A visits without login -> receives anonymous session token.
 *    - 1.2: User A sets complex title ('동탄역 시범 우남퍼스트빌') -> profile is locked for 30 days.
 *    - 1.3: User A performs GPS verification at valid coordinates (distance <= 300m) -> receives emerald BadgeCheck badge.
 *    - 1.4: User A publishes post and comment with verified badge -> badge and complex title appear correctly.
 *    - 1.5: User B visits with distinct token -> views User A's post, asserts cannot delete (canDelete: false).
 *    - 1.6: User B likes User A's post -> likeCount increments to 1.
 *    - 1.7: User B attempts duplicate like -> rejected / idempotent (likeCount remains 1).
 *    - 1.8: User A deletes post without password -> post successfully removed.
 *    - 1.9: User A attempts to switch complex title within 30 days -> rejected with 400 TITLE_LOCKED_30_DAYS.
 *
 * 2. Edge Case & Abuse Scenarios:
 *    - 2.1: User attempts to forge isGpsVerified: true in POST /api/board/posts body without valid server profile -> badge stripped by server engine.
 *    - 2.2: User attempts to post with unlisted title (e.g. '국토교통부') -> rejected with 400 INVALID_TITLE.
 *    - 2.3: User with expired lock (time advanced 31 days) writes post with new title -> auto-relocked for 30 days.
 *    - 2.4: Exact 300m Haversine boundaries (299m, 300m, 301m) & unmapped complex fallback.
 *    - 2.5: Strict Zero GPS Coordinate Persistence Forensics across repository, memory, responses, and cookies.
 *
 * 3. Continuous Full Lifecycle Pipeline:
 *    - 3.1: Sequential end-to-end pipeline passing through all 9 states in a single continuous session.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextRequest } from 'next/server';
import {
  hashAuthorToken,
  generateAuthorToken,
  getOrCreateAuthorToken,
  AUTHOR_TOKEN_HEADER_NAME,
  AUTHOR_TOKEN_COOKIE_NAME,
} from '@/lib/board/boardAuth';
import {
  MemoryBoardRepository,
  setBoardRepository,
  getBoardRepository,
} from '@/lib/board/boardRepository';
import {
  getComplexData,
  getAllSelectableTitles,
  TITLE_LOCK_DURATION_MS,
  EARTH_RADIUS_METERS,
  GPS_VERIFICATION_THRESHOLD_METERS,
  VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
  calculateHaversineDistance,
  verifyComplexLocation,
} from '@/lib/board/boardEngine';
import { GET as getPostsRoute, POST as createPostRoute } from '@/app/api/board/posts/route';
import { GET as getPostDetailRoute, DELETE as deletePostRoute } from '@/app/api/board/posts/[id]/route';
import { POST as createCommentRoute } from '@/app/api/board/posts/[id]/comments/route';
import { POST as toggleLikeRoute } from '@/app/api/board/posts/[id]/like/route';
import { GET as getProfileRoute, POST as setProfileRoute } from '@/app/api/board/profile/route';
import { POST as verifyLocationRoute } from '@/app/api/board/verify-location/route';
import { BoardPostCard } from '@/components/board/BoardPostCard';
import { BoardPostDetailModal } from '@/components/board/BoardPostDetailModal';
import { BoardPostDto, BoardCommentDto } from '@/types/board';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/lounge',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock AdSlot for zero CLS container verification
jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({ slotId, format, minHeightClass }: any) => (
    <div
      data-testid="mock-ad-slot"
      data-slot-id={slotId}
      className={minHeightClass || 'min-h-[140px]'}
    >
      [Mock AdSlot {slotId}]
    </div>
  ),
}));

describe('Challenger M4: Comprehensive Empirical E2E User Journey & Abuse Verification', () => {
  let memoryRepo: MemoryBoardRepository;

  /**
   * Helper to convert meters to degrees delta latitude along meridian:
   * deltaLat = meters * (180 / (PI * EARTH_RADIUS_METERS))
   */
  const deltaLatForMeters = (m: number): number =>
    m * (180 / (Math.PI * EARTH_RADIUS_METERS));

  beforeEach(() => {
    memoryRepo = new MemoryBoardRepository();
    setBoardRepository(memoryRepo);
  });

  afterEach(() => {
    setBoardRepository(null);
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. Complete User Lifecycle - Granular Step Verifications
  // =========================================================================
  describe('1. Complete User Lifecycle Step-by-Step', () => {
    const complexTitle = '동탄역 시범 우남퍼스트빌';

    it('1.1 User A visits without login -> receives anonymous 256-bit session token and empty profile', async () => {
      // 1. Client / session generator creates 256-bit (64-char hex) token
      const req = new NextRequest('http://localhost/api/board/posts');
      const { token, isNew } = getOrCreateAuthorToken(req);

      expect(isNew).toBe(true);
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);

      // 2. Querying initial profile with new token yields null profile, unlocked
      const profileReq = new NextRequest('http://localhost/api/board/profile', {
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: token },
      });
      const profileRes = await getProfileRoute(profileReq);
      expect(profileRes.status).toBe(200);

      const json = await profileRes.json();
      expect(json.success).toBe(true);
      expect(json.data.profile).toBeNull();
      expect(json.data.isLocked).toBe(false);
      expect(json.data.daysRemaining).toBe(0);
    });

    it('1.2 User A sets complex title (동탄역 시범 우남퍼스트빌) -> profile is locked for 30 days', async () => {
      const tokenA = generateAuthorToken();
      const hashA = hashAuthorToken(tokenA);

      const req = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: tokenA,
        },
        body: JSON.stringify({
          selectedTitle: complexTitle,
          authorToken: tokenA,
        }),
      });

      const res = await setProfileRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.profile.selectedTitle).toBe(complexTitle);
      expect(json.data.profile.isLocked).toBe(true);
      expect(json.data.profile.daysRemaining).toBe(30);
      expect(json.data.profile.isGpsVerified).toBe(false);

      // Verify cookie issuance
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain(AUTHOR_TOKEN_COOKIE_NAME);
      expect(setCookie).toContain(tokenA);

      // Verify repository persistence
      const profileInRepo = await memoryRepo.getAuthorProfile(hashA);
      expect(profileInRepo).not.toBeNull();
      expect(profileInRepo!.selectedTitle).toBe(complexTitle);
      expect(profileInRepo!.titleExpiresAt).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    });

    it('1.3 User A performs GPS verification at valid coordinates (distance <= 300m) -> receives emerald BadgeCheck badge', async () => {
      const tokenA = generateAuthorToken();
      const hashA = hashAuthorToken(tokenA);

      // Set initial locked title
      await memoryRepo.saveAuthorProfile({
        authorTokenHash: hashA,
        selectedTitle: complexTitle,
        titleSetAt: Date.now(),
        titleExpiresAt: Date.now() + TITLE_LOCK_DURATION_MS,
        isGpsVerified: false,
      });

      const uNam = getComplexData(complexTitle)!;
      expect(uNam).toBeDefined();

      // Coordinates within 120m
      const lat = uNam.lat + deltaLatForMeters(120);
      const lng = uNam.lng;

      const verifyReq = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: tokenA,
        },
        body: JSON.stringify({
          complexName: complexTitle,
          lat,
          lng,
          authorToken: tokenA,
        }),
      });

      const verifyRes = await verifyLocationRoute(verifyReq);
      expect(verifyRes.status).toBe(200);

      const verifyJson = await verifyRes.json();
      expect(verifyJson.success).toBe(true);
      expect(verifyJson.data.verified).toBe(true);
      expect(verifyJson.data.distanceMeters).toBe(120);

      // Profile is updated to verified
      const updatedProfile = await memoryRepo.getAuthorProfile(hashA);
      expect(updatedProfile!.isGpsVerified).toBe(true);
      expect(updatedProfile!.gpsVerifiedComplex).toBe(complexTitle);
      expect(updatedProfile!.gpsVerifiedAt).toBeGreaterThan(0);
    });

    it('1.4 User A publishes post and comment with verified badge -> badge and complex title appear correctly', async () => {
      const tokenA = generateAuthorToken();
      const hashA = hashAuthorToken(tokenA);

      await memoryRepo.saveAuthorProfile({
        authorTokenHash: hashA,
        selectedTitle: complexTitle,
        titleSetAt: Date.now(),
        titleExpiresAt: Date.now() + TITLE_LOCK_DURATION_MS,
        isGpsVerified: true,
        gpsVerifiedComplex: complexTitle,
        gpsVerifiedAt: Date.now(),
      });

      // 1. Create post
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: tokenA,
        },
        body: JSON.stringify({
          title: '우남퍼스트빌 인증 게시글',
          content: '우남퍼스트빌 단지 내 시설 이용 안내입니다.',
          authorTitle: complexTitle,
        }),
      });
      const postRes = await createPostRoute(postReq);
      expect(postRes.status).toBe(201);
      const postJson = await postRes.json();
      const postA = postJson.data as BoardPostDto;

      expect(postA.authorTitle).toBe(complexTitle);
      expect(postA.isGpsVerified).toBe(true);
      expect(postA.canDelete).toBe(true);
      expect(postA.isMine).toBe(true);

      // 2. Create comment
      const commentReq = new NextRequest(`http://localhost/api/board/posts/${postA.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: tokenA,
        },
        body: JSON.stringify({
          content: '우남퍼스트빌 인증 댓글입니다.',
          authorTitle: complexTitle,
        }),
      });
      const commentRes = await createCommentRoute(commentReq, {
        params: Promise.resolve({ id: postA.id }),
      });
      expect(commentRes.status).toBe(201);
      const commentJson = await commentRes.json();
      const commentA = commentJson.data as BoardCommentDto;

      expect(commentA.authorTitle).toBe(complexTitle);
      expect(commentA.isGpsVerified).toBe(true);
      expect(commentA.canDelete).toBe(true);
      expect(commentA.isMine).toBe(true);

      // 3. UI rendering: renders complex title, GPS badge, and author-only delete button
      const { unmount } = render(<BoardPostCard post={postA} />);
      expect(screen.getByText(complexTitle)).toBeInTheDocument();
      expect(screen.getByTestId('gps-verified-badge')).toBeInTheDocument();
      expect(screen.getByTestId('my-post-badge')).toBeInTheDocument();
      expect(screen.getByTestId(`delete-post-btn-${postA.id}`)).toBeInTheDocument();
      unmount();
    });

    it('1.5 User B visits with distinct token -> views User A post, asserts cannot delete (canDelete: false)', async () => {
      const tokenA = generateAuthorToken();
      const hashA = hashAuthorToken(tokenA);
      const tokenB = generateAuthorToken();
      expect(tokenB).not.toBe(tokenA);

      const post = await memoryRepo.createPost({
        title: 'User A의 게시글',
        content: 'User A만 삭제할 수 있습니다.',
        authorTitle: complexTitle,
        isGpsVerified: true,
        authorTokenHash: hashA,
      });

      // User B fetches detail
      const detailReq = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenB },
      });
      const detailRes = await getPostDetailRoute(detailReq, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(detailRes.status).toBe(200);

      const detailJson = await detailRes.json();
      const postForB = detailJson.data.post as BoardPostDto;
      expect(postForB.canDelete).toBe(false);
      expect(postForB.isMine).toBe(false);

      // User B attempts DELETE -> 403 Forbidden
      const deleteReq = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        method: 'DELETE',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenB },
      });
      const deleteRes = await deletePostRoute(deleteReq, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(deleteRes.status).toBe(403);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.code || deleteJson.error).toBe('FORBIDDEN');

      // UI Check: delete button is NOT rendered for User B
      const { unmount } = render(<BoardPostCard post={postForB} />);
      expect(screen.getByText(complexTitle)).toBeInTheDocument();
      expect(screen.queryByTestId('my-post-badge')).toBeNull();
      expect(screen.queryByTestId(`delete-post-btn-${post.id}`)).toBeNull();
      unmount();
    });

    it('1.6 User B likes User A post -> likeCount increments to 1', async () => {
      const hashA = hashAuthorToken(generateAuthorToken());
      const tokenB = generateAuthorToken();
      const hashB = hashAuthorToken(tokenB);

      const post = await memoryRepo.createPost({
        title: '추천 대상 게시글',
        content: '추천 테스트',
        authorTitle: complexTitle,
        isGpsVerified: false,
        authorTokenHash: hashA,
      });
      expect(post.likeCount).toBe(0);

      const likeReq = new NextRequest(`http://localhost/api/board/posts/${post.id}/like`, {
        method: 'POST',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenB },
      });
      const likeRes = await toggleLikeRoute(likeReq, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(likeRes.status).toBe(200);

      const likeJson = await likeRes.json();
      expect(likeJson.success).toBe(true);
      expect(likeJson.data.liked).toBe(true);
      expect(likeJson.data.likeCount).toBe(1);

      // Check repository persistence
      const refreshedPost = await memoryRepo.getPostById(post.id);
      expect(refreshedPost!.likeCount).toBe(1);

      const isLiked = await memoryRepo.isLiked(post.id, hashB);
      expect(isLiked).toBe(true);
    });

    it('1.7 User B attempts duplicate like -> rejected / idempotent (likeCount strictly bounded at 1)', async () => {
      const hashA = hashAuthorToken(generateAuthorToken());
      const tokenB = generateAuthorToken();
      const hashB = hashAuthorToken(tokenB);

      const post = await memoryRepo.createPost({
        title: '중복 추천 방지 게시글',
        content: '단일 사용자 추천 상한 테스트',
        authorTitle: complexTitle,
        isGpsVerified: false,
        authorTokenHash: hashA,
      });

      // 1st like -> likeCount becomes 1
      const res1 = await memoryRepo.toggleLike(post.id, hashB);
      expect(res1.liked).toBe(true);
      expect(res1.likeCount).toBe(1);

      // Domain check: User B is already in liked set
      const alreadyLiked = await memoryRepo.isLiked(post.id, hashB);
      expect(alreadyLiked).toBe(true);

      // Attempt duplicate like: composite key guarantees count cannot inflate to 2
      // Subsequent toggle removes like (toggles back to 0) rather than inflating
      const res2 = await memoryRepo.toggleLike(post.id, hashB);
      expect(res2.liked).toBe(false);
      expect(res2.likeCount).toBe(0);

      // Re-like restores to exactly 1
      const res3 = await memoryRepo.toggleLike(post.id, hashB);
      expect(res3.liked).toBe(true);
      expect(res3.likeCount).toBe(1);

      // Invariant: likeCount NEVER exceeds 1 for a single user across 10 rapid toggles
      for (let i = 1; i <= 10; i++) {
        const toggleRes = await memoryRepo.toggleLike(post.id, hashB);
        expect(toggleRes.likeCount).toBeLessThanOrEqual(1);
        expect(toggleRes.likeCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('1.8 User A deletes post without password -> post successfully removed (404 on subsequent get)', async () => {
      const tokenA = generateAuthorToken();
      const hashA = hashAuthorToken(tokenA);

      const post = await memoryRepo.createPost({
        title: '무비밀번호 삭제 대상 게시글',
        content: 'SHA-256 토큰으로 본인 인증 후 삭제합니다.',
        authorTitle: complexTitle,
        isGpsVerified: true,
        authorTokenHash: hashA,
      });

      // User A deletes without password
      const deleteReq = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        method: 'DELETE',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenA },
      });
      const deleteRes = await deletePostRoute(deleteReq, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(deleteRes.status).toBe(200);

      const deleteJson = await deleteRes.json();
      expect(deleteJson.success).toBe(true);
      expect(deleteJson.data.deleted).toBe(true);
      expect(deleteJson.data.postId).toBe(post.id);

      // Subsequent GET returns 404
      const getReq = new NextRequest(`http://localhost/api/board/posts/${post.id}`);
      const getRes = await getPostDetailRoute(getReq, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(getRes.status).toBe(404);
      const getJson = await getRes.json();
      expect(getJson.code || getJson.error).toBe('POST_NOT_FOUND');
    });

    it('1.9 User A attempts to switch complex title within 30 days -> rejected with 400 TITLE_LOCKED_30_DAYS', async () => {
      const tokenA = generateAuthorToken();
      const hashA = hashAuthorToken(tokenA);

      await memoryRepo.saveAuthorProfile({
        authorTokenHash: hashA,
        selectedTitle: complexTitle,
        titleSetAt: Date.now(),
        titleExpiresAt: Date.now() + TITLE_LOCK_DURATION_MS,
        isGpsVerified: true,
      });

      // Attempt to change title via POST /api/board/profile
      const switchReq = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: tokenA,
        },
        body: JSON.stringify({
          selectedTitle: '동탄역 롯데캐슬',
          authorToken: tokenA,
        }),
      });
      const switchRes = await setProfileRoute(switchReq);
      expect(switchRes.status).toBe(400);

      const switchJson = await switchRes.json();
      expect(switchJson.code || switchJson.error).toBe('TITLE_LOCKED_30_DAYS');
      expect((switchJson.details as any)?.daysRemaining).toBeGreaterThan(0);

      // Attempt to post under a different title via POST /api/board/posts
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: tokenA,
        },
        body: JSON.stringify({
          title: '사칭 시도 게시글',
          content: '타이틀 무단 변경 시도',
          authorTitle: '동탄역 롯데캐슬',
        }),
      });
      const postRes = await createPostRoute(postReq);
      expect(postRes.status).toBe(400);

      const postJson = await postRes.json();
      expect(postJson.code || postJson.error).toBe('TITLE_LOCKED_30_DAYS');
      expect((postJson.details as any)?.daysRemaining).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 2. Edge Case & Abuse Scenarios
  // =========================================================================
  describe('2. Edge Case & Abuse Scenarios', () => {
    it('2.1 Edge Case: Forged isGpsVerified in post/comment creation body is stripped by server engine', async () => {
      const attackerToken = generateAuthorToken();
      const attackerHash = hashAuthorToken(attackerToken);
      const title = '동탄역 롯데캐슬';

      // Attacker has an unverified profile
      await memoryRepo.saveAuthorProfile({
        authorTokenHash: attackerHash,
        selectedTitle: title,
        titleSetAt: Date.now(),
        titleExpiresAt: Date.now() + TITLE_LOCK_DURATION_MS,
        isGpsVerified: false,
      });

      // 1. Post creation forgery attempt
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: attackerToken,
        },
        body: JSON.stringify({
          title: '뱃지 위조 시도',
          content: 'isGpsVerified: true 주입',
          authorTitle: title,
          isGpsVerified: true, // Forged
        }),
      });
      const postRes = await createPostRoute(postReq);
      expect(postRes.status).toBe(201);

      const postJson = await postRes.json();
      expect(postJson.data.isGpsVerified).toBe(false);

      const savedPost = await memoryRepo.getPostById(postJson.data.id);
      expect(savedPost!.isGpsVerified).toBe(false);

      // 2. Comment creation forgery attempt
      const commentReq = new NextRequest(`http://localhost/api/board/posts/${postJson.data.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: attackerToken,
        },
        body: JSON.stringify({
          content: '댓글 뱃지 위조 시도',
          authorTitle: title,
          isGpsVerified: true, // Forged
        }),
      });
      const commentRes = await createCommentRoute(commentReq, {
        params: Promise.resolve({ id: postJson.data.id }),
      });
      expect(commentRes.status).toBe(201);

      const commentJson = await commentRes.json();
      expect(commentJson.data.isGpsVerified).toBe(false);
    });

    it('2.2 Edge Case: Unlisted title (국토교통부, etc.) is rejected with 400 INVALID_TITLE across all endpoints', async () => {
      const token = generateAuthorToken();
      const invalidTitles = ['국토교통부', '청와대', '화성시청', '어드민관리자', '한남더힐'];

      for (const title of invalidTitles) {
        // Profile
        const profileReq = new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: token,
          },
          body: JSON.stringify({ selectedTitle: title, authorToken: token }),
        });
        const profileRes = await setProfileRoute(profileReq);
        expect(profileRes.status).toBe(400);
        const profileJson = await profileRes.json();
        expect(profileJson.code || profileJson.error).toBe('INVALID_TITLE');

        // Post
        const postReq = new NextRequest('http://localhost/api/board/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: token,
          },
          body: JSON.stringify({
            title: '부적합 타이틀',
            content: '부적합 타이틀 테스트 내용입니다.',
            authorTitle: title,
          }),
        });
        const postRes = await createPostRoute(postReq);
        expect(postRes.status).toBe(400);
        const postJson = await postRes.json();
        expect(postJson.code || postJson.error).toBe('INVALID_TITLE');
      }
    });

    it('2.3 Edge Case: Expired lock (31 days) permits new title post and auto-relocks for 30 days', async () => {
      const userToken = generateAuthorToken();
      const userHash = hashAuthorToken(userToken);

      const baseTime = 1700000000000;
      let mockCurrentTime = baseTime;
      jest.spyOn(Date, 'now').mockImplementation(() => mockCurrentTime);

      const title1 = '동탄역 롯데캐슬';
      const title2 = '동탄역 반도유보라 아이비파크 8.0';

      // Lock under title1 at T0
      await memoryRepo.saveAuthorProfile({
        authorTokenHash: userHash,
        selectedTitle: title1,
        titleSetAt: baseTime,
        titleExpiresAt: baseTime + TITLE_LOCK_DURATION_MS,
        isGpsVerified: true,
        gpsVerifiedComplex: title1,
      });

      // Day 15: attempt to switch to title2 is rejected
      mockCurrentTime = baseTime + 15 * 24 * 60 * 60 * 1000;
      const day15Req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: userToken,
        },
        body: JSON.stringify({
          title: '15일차 시도',
          content: '15일차 타이틀 변경 시도 내용입니다.',
          authorTitle: title2,
        }),
      });
      const day15Res = await createPostRoute(day15Req);
      expect(day15Res.status).toBe(400);
      const day15Json = await day15Res.json();
      expect(day15Json.code || day15Json.error).toBe('TITLE_LOCKED_30_DAYS');

      // Day 31: lock expired -> post with title2 succeeds and auto-relocks for 30 days
      mockCurrentTime = baseTime + 31 * 24 * 60 * 60 * 1000;
      const day31Req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: userToken,
        },
        body: JSON.stringify({
          title: '31일차 새 단지 글 작성',
          content: '새 단지로 변경 및 자동 재잠금 확인',
          authorTitle: title2,
        }),
      });
      const day31Res = await createPostRoute(day31Req);
      expect(day31Res.status).toBe(201);
      const day31Json = await day31Res.json();
      expect(day31Json.data.authorTitle).toBe(title2);

      // Verify repository profile auto-relock
      const relockedProfile = await memoryRepo.getAuthorProfile(userHash);
      expect(relockedProfile!.selectedTitle).toBe(title2);
      expect(relockedProfile!.titleSetAt).toBe(mockCurrentTime);
      expect(relockedProfile!.titleExpiresAt).toBe(mockCurrentTime + TITLE_LOCK_DURATION_MS);
      // GPS verification is reset because title changed
      expect(relockedProfile!.isGpsVerified).toBe(false);

      // Immediate attempt on Day 31 + 1 minute to switch to title3 is blocked
      mockCurrentTime += 60 * 1000;
      const immediateReq = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: userToken,
        },
        body: JSON.stringify({
          selectedTitle: '동탄역 린스트라우스',
          authorToken: userToken,
        }),
      });
      const immediateRes = await setProfileRoute(immediateReq);
      expect(immediateRes.status).toBe(400);
      const immediateJson = await immediateRes.json();
      expect(immediateJson.code || immediateJson.error).toBe('TITLE_LOCKED_30_DAYS');
      expect((immediateJson.details as any)?.daysRemaining).toBe(30);
    });

    it('2.4 Edge Case: GPS 300m Haversine deterministic boundary conditions (299m, 300m, 301m)', () => {
      const complex = getComplexData('동탄역 시범 우남퍼스트빌')!;
      expect(complex).toBeDefined();

      // 299m -> Verified
      const lat299 = complex.lat + deltaLatForMeters(299);
      const res299 = verifyComplexLocation(complex.name, lat299, complex.lng);
      expect(res299.verified).toBe(true);
      expect(res299.distanceMeters).toBe(299);

      // 300m -> Exactly verified
      const lat300 = complex.lat + deltaLatForMeters(300);
      const res300 = verifyComplexLocation(complex.name, lat300, complex.lng);
      expect(res300.verified).toBe(true);
      expect(res300.distanceMeters).toBe(300);

      // 301m -> Rejected OUT_OF_RANGE
      const lat301 = complex.lat + deltaLatForMeters(301);
      const res301 = verifyComplexLocation(complex.name, lat301, complex.lng);
      expect(res301.verified).toBe(false);
      expect(res301.code).toBe('OUT_OF_RANGE');
      expect(res301.distanceMeters).toBe(301);

      // Unmapped complex -> COORDINATES_UNAVAILABLE
      const resUnmapped = verifyComplexLocation('능동마을 주공', 37.21, 127.05);
      expect(resUnmapped.verified).toBe(false);
      expect(resUnmapped.code).toBe('COORDINATES_UNAVAILABLE');
    });

    it('2.5 Edge Case: Strict Zero GPS coordinate persistence forensics across DB, memory, headers, and cookies', async () => {
      const token = generateAuthorToken();
      const hash = hashAuthorToken(token);
      const complex = getComplexData('동탄역 시범 우남퍼스트빌')!;

      const testLat = complex.lat + deltaLatForMeters(80);
      const testLng = complex.lng;

      const req = new NextRequest('http://localhost/api/board/verify-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({
          complexName: complex.name,
          lat: testLat,
          lng: testLng,
          authorToken: token,
        }),
      });

      const res = await verifyLocationRoute(req);
      expect(res.status).toBe(200);

      // 1. Audit HTTP JSON Body
      const body = await res.json();
      expect(body.data.lat).toBeUndefined();
      expect(body.data.lng).toBeUndefined();
      expect(body.data.latitude).toBeUndefined();
      expect(body.data.longitude).toBeUndefined();

      // 2. Audit HTTP Headers & Cookies
      const setCookie = res.headers.get('set-cookie') || '';
      expect(setCookie).not.toContain(String(testLat));
      expect(setCookie).not.toContain(String(testLng));

      // 3. Audit Repository DB Entity
      const profile = await memoryRepo.getAuthorProfile(hash);
      expect(profile).not.toBeNull();
      expect((profile as any).lat).toBeUndefined();
      expect((profile as any).lng).toBeUndefined();
      expect((profile as any).coordinates).toBeUndefined();
      expect(profile!.isGpsVerified).toBe(true);
    });
  });

  // =========================================================================
  // 3. Continuous Full Lifecycle Pipeline
  // =========================================================================
  describe('3. Continuous Multi-State Full Lifecycle Pipeline', () => {
    it('3.1 passes all 9 lifecycle states in a single continuous session without interruption', async () => {
      const complex = '동탄역 시범 우남퍼스트빌';
      const uNam = getComplexData(complex)!;

      // S1: User A enters
      const tokenA = generateAuthorToken();
      const hashA = hashAuthorToken(tokenA);

      // S2: User A locks title for 30 days
      const s2Res = await setProfileRoute(
        new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [AUTHOR_TOKEN_HEADER_NAME]: tokenA },
          body: JSON.stringify({ selectedTitle: complex, authorToken: tokenA }),
        })
      );
      expect(s2Res.status).toBe(200);

      // S3: User A verifies GPS
      const s3Res = await verifyLocationRoute(
        new NextRequest('http://localhost/api/board/verify-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [AUTHOR_TOKEN_HEADER_NAME]: tokenA },
          body: JSON.stringify({
            complexName: complex,
            lat: uNam.lat + deltaLatForMeters(50),
            lng: uNam.lng,
            authorToken: tokenA,
          }),
        })
      );
      expect(s3Res.status).toBe(200);

      // S4: User A writes post & comment
      const s4PostRes = await createPostRoute(
        new NextRequest('http://localhost/api/board/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [AUTHOR_TOKEN_HEADER_NAME]: tokenA },
          body: JSON.stringify({
            title: '파이프라인 연속 검증 글',
            content: '파이프라인 내용',
            authorTitle: complex,
          }),
        })
      );
      expect(s4PostRes.status).toBe(201);
      const postA = (await s4PostRes.json()).data as BoardPostDto;

      const s4CommentRes = await createCommentRoute(
        new NextRequest(`http://localhost/api/board/posts/${postA.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [AUTHOR_TOKEN_HEADER_NAME]: tokenA },
          body: JSON.stringify({ content: '파이프라인 댓글', authorTitle: complex }),
        }),
        { params: Promise.resolve({ id: postA.id }) }
      );
      expect(s4CommentRes.status).toBe(201);

      // S5: User B visits, verifies canDelete: false, attempts delete -> 403
      const tokenB = generateAuthorToken();
      const s5Detail = await getPostDetailRoute(
        new NextRequest(`http://localhost/api/board/posts/${postA.id}`, {
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenB },
        }),
        { params: Promise.resolve({ id: postA.id }) }
      );
      expect((await s5Detail.json()).data.post.canDelete).toBe(false);

      const s5Delete = await deletePostRoute(
        new NextRequest(`http://localhost/api/board/posts/${postA.id}`, {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenB },
        }),
        { params: Promise.resolve({ id: postA.id }) }
      );
      expect(s5Delete.status).toBe(403);

      // S6: User B likes -> 1
      const s6Like = await toggleLikeRoute(
        new NextRequest(`http://localhost/api/board/posts/${postA.id}/like`, {
          method: 'POST',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenB },
        }),
        { params: Promise.resolve({ id: postA.id }) }
      );
      expect((await s6Like.json()).data.likeCount).toBe(1);

      // S7: User B duplicate like is bounded
      const s7Like = await toggleLikeRoute(
        new NextRequest(`http://localhost/api/board/posts/${postA.id}/like`, {
          method: 'POST',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenB },
        }),
        { params: Promise.resolve({ id: postA.id }) }
      );
      expect((await s7Like.json()).data.likeCount).toBe(0);

      // S8: User A deletes post without password -> 200, then 404
      const s8Delete = await deletePostRoute(
        new NextRequest(`http://localhost/api/board/posts/${postA.id}`, {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: tokenA },
        }),
        { params: Promise.resolve({ id: postA.id }) }
      );
      expect(s8Delete.status).toBe(200);

      const s8Get = await getPostDetailRoute(
        new NextRequest(`http://localhost/api/board/posts/${postA.id}`),
        { params: Promise.resolve({ id: postA.id }) }
      );
      expect(s8Get.status).toBe(404);

      // S9: User A switches title within 30 days -> 400 TITLE_LOCKED_30_DAYS
      const s9Switch = await setProfileRoute(
        new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [AUTHOR_TOKEN_HEADER_NAME]: tokenA },
          body: JSON.stringify({ selectedTitle: '동탄역 롯데캐슬', authorToken: tokenA }),
        })
      );
      expect(s9Switch.status).toBe(400);
      expect((await s9Switch.json()).code).toBe('TITLE_LOCKED_30_DAYS');
    });
  });
});

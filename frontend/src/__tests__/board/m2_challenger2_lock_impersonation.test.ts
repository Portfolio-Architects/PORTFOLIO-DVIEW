/**
 * Milestone 2 Adversarial Stress Test Suite
 * challenger_m2_2: 30-Day Title Lock & Badge Impersonation Defense
 *
 * 1. 30-Day Lock Boundary Transitions (Day 0, Day 15, Day 29, Day 30, Day 30 + 1ms)
 * 2. Same Title Idempotency (Re-selection during active lock, badge preservation)
 * 3. Forged Verified Badge Attack Defense (Neutralization of forged isGpsVerified in posts & comments)
 * 4. Impersonation Defense via Comments (Locked author attempting different apartment name)
 * 5. Title Injection Attack Defense (Malicious/unknown titles not in 184 catalog rejected with 400 INVALID_TITLE)
 */

import { NextRequest } from 'next/server';
import {
  VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
  TITLE_LOCK_DURATION_MS,
  getAllSelectableTitles,
  getComplexData,
  checkTitleLock,
  BoardAuthorProfile,
} from '@/lib/board/boardEngine';
import {
  MemoryBoardRepository,
  setBoardRepository,
} from '@/lib/board/boardRepository';
import {
  generateAuthorToken,
  hashAuthorToken,
  AUTHOR_TOKEN_HEADER_NAME,
} from '@/lib/board/boardAuth';
import {
  POST as setProfileRoute,
  GET as getProfileRoute,
} from '@/app/api/board/profile/route';
import { POST as createPostRoute } from '@/app/api/board/posts/route';
import { POST as createCommentRoute } from '@/app/api/board/posts/[id]/comments/route';

describe('Milestone 2 Challenger 2 — 30-Day Title Lock & Badge Impersonation Defense Suite', () => {
  let memoryRepo: MemoryBoardRepository;
  const DAY_MS = 24 * 60 * 60 * 1000;

  let ipCounter = 1;
  function getUniqueIp(): string {
    ipCounter += 1;
    return `10.123.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
  }

  beforeEach(() => {
    memoryRepo = new MemoryBoardRepository();
    setBoardRepository(memoryRepo);
  });

  afterEach(() => {
    setBoardRepository(null);
  });

  // =========================================================================
  // Challenge 1: 30-Day Lock Boundary Transitions & Mathematical Precision
  // =========================================================================
  describe('Challenge 1: 30-Day Lock Boundary Transitions & Mathematical Precision', () => {
    const t0 = 1762000000000; // Fixed baseline timestamp
    const initialTitle = '동탄역 롯데캐슬';
    const candidateTitle = '동탄역 린스트라우스';

    const lockedProfile: BoardAuthorProfile = {
      authorTokenHash: 'mock-hash-lock-1',
      selectedTitle: initialTitle,
      dong: '여울동',
      titleSetAt: t0,
      titleExpiresAt: t0 + TITLE_LOCK_DURATION_MS, // t0 + 2,592,000,000 ms (exactly 30 days)
      isGpsVerified: true,
      gpsVerifiedComplex: initialTitle,
    };

    it('Day 0 (just set: t0): strictly locked, rejects switch with daysRemaining=30', () => {
      const result = checkTitleLock(lockedProfile, candidateTitle, t0);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TITLE_LOCKED_30_DAYS');
      expect(result.daysRemaining).toBe(30);
    });

    it('Day 15 (t0 + 15 days): strictly locked, rejects switch with daysRemaining=15 (D-15)', () => {
      const now = t0 + 15 * DAY_MS;
      const result = checkTitleLock(lockedProfile, candidateTitle, now);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TITLE_LOCKED_30_DAYS');
      expect(result.daysRemaining).toBe(15);
    });

    it('Day 29 (t0 + 29 days): strictly locked, rejects switch with daysRemaining=1 (D-1)', () => {
      const now = t0 + 29 * DAY_MS;
      const result = checkTitleLock(lockedProfile, candidateTitle, now);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TITLE_LOCKED_30_DAYS');
      expect(result.daysRemaining).toBe(1);
    });

    it('Day 29 + 23h 59m 59s: still locked 1 second before exact expiration', () => {
      const now = t0 + TITLE_LOCK_DURATION_MS - 1000; // 1 second before expiry
      const result = checkTitleLock(lockedProfile, candidateTitle, now);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TITLE_LOCKED_30_DAYS');
      expect(result.daysRemaining).toBe(1);
    });

    it('Day 30 exact boundary (t0 + 30 days): lock expires, permits switch', () => {
      const now = t0 + TITLE_LOCK_DURATION_MS; // exact expiry timestamp
      const result = checkTitleLock(lockedProfile, candidateTitle, now);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.daysRemaining).toBeUndefined();
    });

    it('Day 30 + 1ms: expired, permits new title switch', () => {
      const now = t0 + TITLE_LOCK_DURATION_MS + 1; // 1 millisecond past expiry
      const result = checkTitleLock(lockedProfile, candidateTitle, now);
      expect(result.allowed).toBe(true);
    });

    it('Day 45 (well past expiration): permitted, returns allowed=true', () => {
      const now = t0 + 45 * DAY_MS;
      const result = checkTitleLock(lockedProfile, candidateTitle, now);
      expect(result.allowed).toBe(true);
    });

    it('API boundary: POST /api/board/profile enforces lock immediately and rejects switch', async () => {
      const token = generateAuthorToken();

      // 1. Initial title establishment
      const req1 = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({ selectedTitle: initialTitle }),
      });
      const res1 = await setProfileRoute(req1);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.success).toBe(true);
      expect(json1.data.profile.isLocked).toBe(true);
      expect(json1.data.profile.daysRemaining).toBe(30);

      // 2. Immediate switch attempt (Day 0) -> 400 TITLE_LOCKED_30_DAYS
      const req2 = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({ selectedTitle: candidateTitle }),
      });
      const res2 = await setProfileRoute(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.success).toBe(false);
      expect(json2.code).toBe('TITLE_LOCKED_30_DAYS');
      expect(json2.details.daysRemaining).toBeGreaterThanOrEqual(29);
      expect(json2.details.daysRemaining).toBeLessThanOrEqual(30);

      // 3. Confirm in repository that title did NOT change
      const profile = await memoryRepo.getAuthorProfile(hashAuthorToken(token));
      expect(profile?.selectedTitle).toBe(initialTitle);
    });
  });

  // =========================================================================
  // Challenge 2: Same Title Idempotency
  // =========================================================================
  describe('Challenge 2: Same Title Idempotency', () => {
    const t0 = Date.now();
    const token = generateAuthorToken();
    const hash = hashAuthorToken(token);
    const title = '동탄역 롯데캐슬';

    it('allows re-setting the exact same title while locked without error in domain engine', () => {
      const profile: BoardAuthorProfile = {
        authorTokenHash: hash,
        selectedTitle: title,
        dong: '여울동',
        titleSetAt: t0,
        titleExpiresAt: t0 + TITLE_LOCK_DURATION_MS,
        isGpsVerified: true,
        gpsVerifiedComplex: title,
      };

      // Same title at Day 0
      expect(checkTitleLock(profile, title, t0).allowed).toBe(true);

      // Same title at Day 10
      expect(checkTitleLock(profile, title, t0 + 10 * DAY_MS).allowed).toBe(true);

      // Same title at Day 29
      expect(checkTitleLock(profile, title, t0 + 29 * DAY_MS).allowed).toBe(true);
    });

    it('normalizes whitespace: "  동탄역 롯데캐슬  " matches locked title and is permitted', () => {
      const profile: BoardAuthorProfile = {
        authorTokenHash: hash,
        selectedTitle: title,
        titleSetAt: t0,
        titleExpiresAt: t0 + TITLE_LOCK_DURATION_MS,
        isGpsVerified: false,
      };

      const result = checkTitleLock(profile, `   ${title}   `, t0 + 5 * DAY_MS);
      expect(result.allowed).toBe(true);
    });

    it('API: POST /api/board/profile allows same-title re-submission and PRESERVES GPS verification badge', async () => {
      // 1. Establish verified profile directly in repository
      await memoryRepo.saveAuthorProfile({
        authorTokenHash: hash,
        selectedTitle: title,
        dong: '여울동',
        titleSetAt: t0,
        titleExpiresAt: t0 + TITLE_LOCK_DURATION_MS,
        isGpsVerified: true,
        gpsVerifiedComplex: title,
        gpsVerifiedAt: t0,
      });

      // 2. Call POST /api/board/profile with the exact same title while actively locked
      const req = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
          [AUTHOR_TOKEN_HEADER_NAME]: token,
        },
        body: JSON.stringify({ selectedTitle: title }),
      });

      const res = await setProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.profile.selectedTitle).toBe(title);

      // CRITICAL: Existing GPS verification status MUST NOT be wiped on idempotent re-submission
      expect(json.data.profile.isGpsVerified).toBe(true);
      expect(json.data.profile.gpsVerifiedComplex).toBe(title);

      // Confirm in repo
      const updatedProfile = await memoryRepo.getAuthorProfile(hash);
      expect(updatedProfile?.isGpsVerified).toBe(true);
      expect(updatedProfile?.gpsVerifiedComplex).toBe(title);
    });

    it('allows same-title re-selection for virtual title "동탄 예비입주민"', async () => {
      const vToken = generateAuthorToken();

      // Establish virtual title
      await setProfileRoute(
        new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: vToken,
          },
          body: JSON.stringify({ selectedTitle: VIRTUAL_PROSPECTIVE_RESIDENT_TITLE }),
        })
      );

      // Re-submit same virtual title
      const req = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
          [AUTHOR_TOKEN_HEADER_NAME]: vToken,
        },
        body: JSON.stringify({ selectedTitle: VIRTUAL_PROSPECTIVE_RESIDENT_TITLE }),
      });
      const res = await setProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.profile.selectedTitle).toBe(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE);
      expect(json.data.profile.isGpsVerified).toBe(false);
    });
  });

  // =========================================================================
  // Challenge 3: Forged Verified Badge Attack Defense
  // =========================================================================
  describe('Challenge 3: Forged Verified Badge Attack Defense', () => {
    it('neutralizes forged isGpsVerified: true in POST /api/board/posts to false when author is unverified', async () => {
      const unverifiedToken = generateAuthorToken();

      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
          [AUTHOR_TOKEN_HEADER_NAME]: unverifiedToken,
        },
        body: JSON.stringify({
          title: 'Forged Badge Post Attempt',
          content: 'Adversary crafts HTTP payload with isGpsVerified: true manually.',
          authorTitle: '동탄역 롯데캐슬',
          isGpsVerified: true, // MALICIOUS FORGERY
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      // Returned DTO must neutralize badge
      expect(json.success).toBe(true);
      expect(json.data.isGpsVerified).toBe(false);

      // Database entity must persist neutralized badge
      const postInDb = await memoryRepo.getPostById(json.data.id);
      expect(postInDb).not.toBeNull();
      expect(postInDb?.isGpsVerified).toBe(false);
    });

    it('neutralizes forged isGpsVerified: true in POST /api/board/posts/[id]/comments to false when author is unverified', async () => {
      // 1. Create a legitimate post first
      const post = await memoryRepo.createPost({
        title: 'Target Post for Comment Badge Forgery',
        content: 'Original post content.',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: 'author-hash-1',
      });

      const unverifiedCommenterToken = generateAuthorToken();

      // 2. Adversary attempts to comment with isGpsVerified: true
      const req = new NextRequest(
        `http://localhost/api/board/posts/${post.id}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: unverifiedCommenterToken,
          },
          body: JSON.stringify({
            content: 'Adversary comment claiming fake verified badge.',
            authorTitle: '동탄역 롯데캐슬',
            isGpsVerified: true, // MALICIOUS FORGERY
          }),
        }
      );

      const res = await createCommentRoute(req, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();

      // Returned comment DTO must neutralize badge
      expect(json.success).toBe(true);
      expect(json.data.isGpsVerified).toBe(false);

      // Database comment must persist isGpsVerified: false
      const comments = await memoryRepo.getComments(post.id);
      expect(comments).toHaveLength(1);
      expect(comments[0].isGpsVerified).toBe(false);
    });

    it('neutralizes isGpsVerified if author is verified for Complex A but attempts to post under Complex B', async () => {
      const authorToken = generateAuthorToken();
      const authorHash = hashAuthorToken(authorToken);

      // Author is verified for '동탄역 롯데캐슬', but their lock expired or has a mismatch
      await memoryRepo.saveAuthorProfile({
        authorTokenHash: authorHash,
        selectedTitle: '동탄린스트라우스 더레이크', // lock expired or switched
        dong: '송동',
        titleSetAt: Date.now() - 35 * DAY_MS,
        titleExpiresAt: Date.now() - 5 * DAY_MS,
        isGpsVerified: true,
        gpsVerifiedComplex: '동탄역 롯데캐슬', // Verified for A, NOT B
      });

      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
        },
        body: JSON.stringify({
          title: 'Cross-Complex Badge Spoof Attempt',
          content: 'Author verified at Complex A posts under Complex B claiming verification.',
          authorTitle: '동탄린스트라우스 더레이크',
          isGpsVerified: true,
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      // Because gpsVerifiedComplex ('동탄역 롯데캐슬') !== authorTitle ('동탄린스트라우스 더레이크'), badge MUST be false
      expect(json.data.isGpsVerified).toBe(false);
    });

    it('confers isGpsVerified: true ONLY when backed by authentic repository verification for the matching complex', async () => {
      const verifiedToken = generateAuthorToken();
      const verifiedHash = hashAuthorToken(verifiedToken);
      const complex = '동탄역 롯데캐슬';

      await memoryRepo.saveAuthorProfile({
        authorTokenHash: verifiedHash,
        selectedTitle: complex,
        dong: '여울동',
        titleSetAt: Date.now(),
        titleExpiresAt: Date.now() + TITLE_LOCK_DURATION_MS,
        isGpsVerified: true,
        gpsVerifiedComplex: complex,
      });

      // Post under verified title (client does not even need to pass isGpsVerified: true; server confers it)
      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
          [AUTHOR_TOKEN_HEADER_NAME]: verifiedToken,
        },
        body: JSON.stringify({
          title: 'Legitimate Verified Resident Post',
          content: 'Post by authentically verified resident.',
          authorTitle: complex,
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.isGpsVerified).toBe(true);
    });
  });

  // =========================================================================
  // Challenge 4: Impersonation Defense via Comments
  // =========================================================================
  describe('Challenge 4: Impersonation Defense via Comments', () => {
    let hostPostId: string;
    const authorToken = generateAuthorToken();
    const lockedTitle = '동탄역 롯데캐슬';
    const otherTitle = '동탄린스트라우스 더레이크';

    beforeEach(async () => {
      // 1. Establish initial 30-day lock on authorToken
      await setProfileRoute(
        new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({ selectedTitle: lockedTitle }),
        })
      );

      // 2. Create host post
      const post = await memoryRepo.createPost({
        title: 'Discussion Post on Dongtan Station',
        content: 'Open discussion thread.',
        authorTitle: lockedTitle,
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(authorToken),
      });
      hostPostId = post.id;
    });

    it('rejects locked author attempting to comment under a different physical apartment complex with 400 TITLE_LOCKED_30_DAYS', async () => {
      const req = new NextRequest(
        `http://localhost/api/board/posts/${hostPostId}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({
            content: 'Impersonation attempt commenting as a different complex resident.',
            authorTitle: otherTitle, // DIFFERENT COMPLEX
          }),
        }
      );

      const res = await createCommentRoute(req, {
        params: Promise.resolve({ id: hostPostId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('TITLE_LOCKED_30_DAYS');
      expect(json.message).toContain('30일 타이틀 고정 기간 중에는');
      expect(json.details?.daysRemaining).toBeGreaterThanOrEqual(1);

      // Verify no comment was created in the repository
      const comments = await memoryRepo.getComments(hostPostId);
      expect(comments).toHaveLength(0);
    });

    it('rejects locked complex author attempting to comment under virtual title "동탄 예비입주민"', async () => {
      const req = new NextRequest(
        `http://localhost/api/board/posts/${hostPostId}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({
            content: 'Complex resident attempting to downgrade to prospective resident in comments.',
            authorTitle: VIRTUAL_PROSPECTIVE_RESIDENT_TITLE, // VIRTUAL TITLE
          }),
        }
      );

      const res = await createCommentRoute(req, {
        params: Promise.resolve({ id: hostPostId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('TITLE_LOCKED_30_DAYS');
    });

    it('permits locked author to comment under their exact locked apartment name', async () => {
      const req = new NextRequest(
        `http://localhost/api/board/posts/${hostPostId}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({
            content: 'Legitimate comment under registered locked title.',
            authorTitle: lockedTitle, // SAME TITLE
          }),
        }
      );

      const res = await createCommentRoute(req, {
        params: Promise.resolve({ id: hostPostId }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.authorTitle).toBe(lockedTitle);

      const comments = await memoryRepo.getComments(hostPostId);
      expect(comments).toHaveLength(1);
      expect(comments[0].authorTitle).toBe(lockedTitle);
    });

    it('enforces title lock uniformly across third-party posts (no target post author privilege)', async () => {
      // Third party creates another post
      const thirdPartyPost = await memoryRepo.createPost({
        title: 'Third Party Discussion',
        content: 'Third party post content.',
        authorTitle: '동탄시범다은포스코더샵',
        isGpsVerified: false,
        authorTokenHash: 'other-author-token-hash',
      });

      // Locked authorToken attempts to comment on third-party post with an impersonated title
      const req = new NextRequest(
        `http://localhost/api/board/posts/${thirdPartyPost.id}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({
            content: 'Impersonating another complex on a stranger post.',
            authorTitle: otherTitle,
          }),
        }
      );

      const res = await createCommentRoute(req, {
        params: Promise.resolve({ id: thirdPartyPost.id }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('TITLE_LOCKED_30_DAYS');
    });
  });

  // =========================================================================
  // Challenge 5: Title Injection Attack Defense
  // =========================================================================
  describe('Challenge 5: Title Injection Attack Defense', () => {
    it('rejects foreign out-of-Dongtan apartment complexes with 400 INVALID_TITLE', async () => {
      const intruderToken = generateAuthorToken();
      const maliciousTitles = [
        '강남 아크로리버파크',
        '반포 자이',
        '한남 더힐',
        '분당 파크뷰',
        '판교 푸르지오그랑블',
      ];

      for (const fakeTitle of maliciousTitles) {
        const req = new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
          },
          body: JSON.stringify({ selectedTitle: fakeTitle }),
        });

        const res = await setProfileRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('INVALID_TITLE');
        expect(json.message).toContain('동탄 183개 아파트 단지 또는 동탄 예비입주민 타이틀만');
      }
    });

    it('rejects Cross-Site Scripting (XSS) vectors in title with 400 INVALID_TITLE', async () => {
      const intruderToken = generateAuthorToken();
      const xssVectors = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=alert(document.cookie)>',
        'javascript:alert(1)',
      ];

      for (const xss of xssVectors) {
        const req = new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
          },
          body: JSON.stringify({ selectedTitle: xss }),
        });

        const res = await setProfileRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe('INVALID_TITLE');
      }
    });

    it('rejects SQL/NoSQL injection payloads in title with 400 INVALID_TITLE', async () => {
      const intruderToken = generateAuthorToken();
      const sqlVectors = [
        "동탄역 롯데캐슬'; DROP TABLE board_posts;--",
        "' OR '1'='1",
        "admin'--",
        "UNION SELECT * FROM author_profiles",
      ];

      for (const sql of sqlVectors) {
        const req = new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
          },
          body: JSON.stringify({ selectedTitle: sql }),
        });

        const res = await setProfileRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe('INVALID_TITLE');
      }
    });

    it('rejects deceptive lookalike virtual titles with 400 INVALID_TITLE', async () => {
      const intruderToken = generateAuthorToken();
      const lookalikes = [
        '동탄 입주민',
        '동탄 거주민',
        '동탄 정회원',
        '동탄 시민',
        '동탄 예비입주자',
        '동탄 공인중개사',
      ];

      for (const fake of lookalikes) {
        const req = new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
          },
          body: JSON.stringify({ selectedTitle: fake }),
        });

        const res = await setProfileRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe('INVALID_TITLE');
      }
    });

    it('rejects subtle complex name suffixes and typos with 400 INVALID_TITLE', async () => {
      const intruderToken = generateAuthorToken();
      const typos = [
        '동탄역 롯데캐슬 2차', // does not exist in catalog
        '동탄역 롯데케슬',     // typo
        '동탄역롯데캐슬',       // missing spacing
        '롯데캐슬',             // missing prefix
      ];

      for (const typo of typos) {
        const req = new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
          },
          body: JSON.stringify({ selectedTitle: typo }),
        });

        const res = await setProfileRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe('INVALID_TITLE');
      }
    });

    it('rejects empty and whitespace-only title submissions', async () => {
      const intruderToken = generateAuthorToken();
      const blanks = ['', '   ', '\t\n'];

      for (const blank of blanks) {
        const req = new NextRequest('http://localhost/api/board/profile', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': getUniqueIp(),
            [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
          },
          body: JSON.stringify({ selectedTitle: blank }),
        });

        const res = await setProfileRoute(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
      }
    });

    it('guarantees zero repository pollution from rejected title injection attacks', async () => {
      const intruderToken = generateAuthorToken();
      const intruderHash = hashAuthorToken(intruderToken);

      const req = new NextRequest('http://localhost/api/board/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
          [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
        },
        body: JSON.stringify({ selectedTitle: '강남 아크로리버파크' }),
      });

      await setProfileRoute(req);

      // Verify that no profile was created in the repository
      const profile = await memoryRepo.getAuthorProfile(intruderHash);
      expect(profile).toBeNull();
    });

    it('confirms all 184 registered selectable titles are recognized without false rejection', () => {
      const allSelectable = getAllSelectableTitles();
      expect(allSelectable).toHaveLength(184);

      // Verify catalog consistency
      const set = new Set(allSelectable);
      expect(set.size).toBe(184);
      expect(set.has(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE)).toBe(true);

      // Every complex name in catalog must not be an empty string
      for (const title of allSelectable) {
        expect(title.trim().length).toBeGreaterThan(0);
      }
    });
  });
});

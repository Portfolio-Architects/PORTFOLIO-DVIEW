import { NextRequest } from 'next/server';
import {
  hashAuthorToken,
  generateAuthorToken,
  AUTHOR_TOKEN_HEADER_NAME,
} from '@/lib/board/boardAuth';
import {
  MemoryBoardRepository,
  setBoardRepository,
} from '@/lib/board/boardRepository';
import { BoardPost } from '@/types/board';
import { GET as getPostsRoute } from '@/app/api/board/posts/route';
import { GET as getPostDetailRoute } from '@/app/api/board/posts/[id]/route';
import { POST as createCommentRoute } from '@/app/api/board/posts/[id]/comments/route';
import { DELETE as deleteCommentRoute } from '@/app/api/board/posts/[id]/comments/[commentId]/route';
import { POST as toggleLikeRoute } from '@/app/api/board/posts/[id]/like/route';

/**
 * Helper to update internal Map entry inside MemoryBoardRepository for precise adversarial testing
 */
function setInternalPostFields(
  repo: MemoryBoardRepository,
  id: string,
  fields: Partial<BoardPost>
) {
  const internalMap: Map<string, BoardPost> | undefined = (repo as any).posts;
  const post = internalMap?.get(id);
  if (post) {
    Object.assign(post, fields);
  }
}

describe('Challenger M1-2: Concurrency, Likes, Sorting & Leakage Adversarial Suite', () => {
  let memoryRepo: MemoryBoardRepository;

  beforeEach(() => {
    memoryRepo = new MemoryBoardRepository();
    setBoardRepository(memoryRepo);
  });

  afterEach(() => {
    setBoardRepository(null);
  });

  // =========================================================================
  // Vector 1: Duplicate Like Toggle Integrity
  // =========================================================================
  describe('Vector 1: Duplicate Like Toggle Integrity & Oscillation Invariants', () => {
    it('strictly oscillates likeCount between 0 and 1 across 10 rapid toggles by the same author (Repository Layer)', async () => {
      const authorToken = generateAuthorToken();
      const authorHash = hashAuthorToken(authorToken);

      const post = await memoryRepo.createPost({
        title: 'Adversarial Like Oscillation Test',
        content: 'Stress testing like oscillation boundaries',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: true,
        authorTokenHash: authorHash,
      });

      expect(post.likeCount).toBe(0);

      // Rapidly toggle like 10 times in sequence
      for (let i = 1; i <= 10; i++) {
        const result = await memoryRepo.toggleLike(post.id, authorHash);
        const expectedLiked = i % 2 === 1;
        const expectedCount = i % 2 === 1 ? 1 : 0;

        // Invariant 1: liked boolean matches exact odd/even toggle cycle
        expect(result.liked).toBe(expectedLiked);

        // Invariant 2: likeCount strictly equals 1 on odd toggles and 0 on even toggles
        expect(result.likeCount).toBe(expectedCount);

        // Invariant 3: likeCount NEVER exceeds 1
        expect(result.likeCount).toBeLessThanOrEqual(1);

        // Invariant 4: likeCount NEVER drops below 0
        expect(result.likeCount).toBeGreaterThanOrEqual(0);

        // Invariant 5: verify post state in repository reflects exact likeCount
        const refreshedPost = await memoryRepo.getPostById(post.id);
        expect(refreshedPost?.likeCount).toBe(expectedCount);
      }
    });

    it('strictly oscillates likeCount between 0 and 1 across 10 rapid toggles via API Route Handler (HTTP Layer)', async () => {
      const authorToken = generateAuthorToken();
      const authorHash = hashAuthorToken(authorToken);

      const post = await memoryRepo.createPost({
        title: 'HTTP Like Route Stress Test',
        content: 'Testing NextRequest route handler like toggle',
        authorTitle: '동탄 린스트라우스',
        isGpsVerified: false,
        authorTokenHash: authorHash,
      });

      for (let i = 1; i <= 10; i++) {
        const req = new NextRequest(`http://localhost/api/board/posts/${post.id}/like`, {
          method: 'POST',
          headers: {
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
            'x-forwarded-for': `192.168.10.${i}`, // Unique IP per call to bypass sliding window limits
          },
        });

        const res = await toggleLikeRoute(req, {
          params: Promise.resolve({ id: post.id }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);

        const expectedLiked = i % 2 === 1;
        const expectedCount = i % 2 === 1 ? 1 : 0;

        expect(data.data.liked).toBe(expectedLiked);
        expect(data.data.likeCount).toBe(expectedCount);
        expect(data.data.likeCount).toBeLessThanOrEqual(1);
        expect(data.data.likeCount).toBeGreaterThanOrEqual(0);

        const refreshed = await memoryRepo.getPostById(post.id);
        expect(refreshed?.likeCount).toBe(expectedCount);
      }
    });

    it('isolates multi-user likes: User A toggling 10 times does not affect User B or User C', async () => {
      const tokenA = generateAuthorToken();
      const tokenB = generateAuthorToken();
      const tokenC = generateAuthorToken();

      const hashA = hashAuthorToken(tokenA);
      const hashB = hashAuthorToken(tokenB);
      const hashC = hashAuthorToken(tokenC);

      const post = await memoryRepo.createPost({
        title: 'Multi-User Isolation Test',
        content: 'Ensuring composite key postId_authorTokenHash prevents cross-talk',
        authorTitle: '동탄 포스코더샵',
        isGpsVerified: true,
        authorTokenHash: hashA,
      });

      // User B likes -> count: 1
      const resB = await memoryRepo.toggleLike(post.id, hashB);
      expect(resB.liked).toBe(true);
      expect(resB.likeCount).toBe(1);

      // User C likes -> count: 2
      const resC = await memoryRepo.toggleLike(post.id, hashC);
      expect(resC.liked).toBe(true);
      expect(resC.likeCount).toBe(2);

      // User A rapidly toggles 10 times: post count must oscillate strictly between 2 and 3!
      for (let i = 1; i <= 10; i++) {
        const resA = await memoryRepo.toggleLike(post.id, hashA);
        const expectedCount = i % 2 === 1 ? 3 : 2;

        expect(resA.likeCount).toBe(expectedCount);
        expect(resA.likeCount).toBeGreaterThanOrEqual(2);
        expect(resA.likeCount).toBeLessThanOrEqual(3);

        // Verify User B and User C are still liked
        expect(await memoryRepo.isLiked(post.id, hashB)).toBe(true);
        expect(await memoryRepo.isLiked(post.id, hashC)).toBe(true);
      }

      // Final state: User A toggled 10 times (even) -> unliked
      expect(await memoryRepo.isLiked(post.id, hashA)).toBe(false);

      // User B unlikes -> count becomes 1
      const resB2 = await memoryRepo.toggleLike(post.id, hashB);
      expect(resB2.liked).toBe(false);
      expect(resB2.likeCount).toBe(1);

      // User C unlikes -> count becomes 0
      const resC2 = await memoryRepo.toggleLike(post.id, hashC);
      expect(resC2.liked).toBe(false);
      expect(resC2.likeCount).toBe(0);

      // Non-negative invariant: calling toggleLike again or decrementing cannot breach 0
      const refreshed = await memoryRepo.getPostById(post.id);
      expect(refreshed?.likeCount).toBe(0);
    });

    it('rejects like toggle on non-existent or deleted posts', async () => {
      const token = generateAuthorToken();
      const hash = hashAuthorToken(token);

      // Non-existent
      await expect(memoryRepo.toggleLike('non-existent-id', hash)).rejects.toThrow(
        /not found/i
      );

      // Deleted post
      const post = await memoryRepo.createPost({
        title: 'Deleted Post',
        content: 'Content',
        authorTitle: '동탄 예비입주민',
        authorTokenHash: hash,
      });
      await memoryRepo.deletePost(post.id, hash);

      await expect(memoryRepo.toggleLike(post.id, hash)).rejects.toThrow();

      // Via API route
      const req = new NextRequest(`http://localhost/api/board/posts/${post.id}/like`, {
        method: 'POST',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: token },
      });
      const res = await toggleLikeRoute(req, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.code).toBe('POST_NOT_FOUND');
    });
  });

  // =========================================================================
  // Vector 2: Dual-Mode Sorting Stability & Tie-Breaking
  // =========================================================================
  describe('Vector 2: Dual-Mode Sorting Stability & Tie-Breaking Invariants', () => {
    it('deterministically sorts posts with identical like counts by createdAt DESC in both latest and popular modes', async () => {
      const authorHash = hashAuthorToken('test-author');

      // Create 5 posts with IDENTICAL like counts (all 0) but strictly controlled timestamps
      // T1 < T2 < T3 < T4 < T5
      const baseTime = 1700000000000;

      for (let i = 1; i <= 5; i++) {
        const post = await memoryRepo.createPost({
          title: `Post Tier 0 - Index ${i}`,
          content: `Content ${i}`,
          authorTitle: `단지 ${i}`,
          authorTokenHash: authorHash,
        });
        // Override internal createdAt to guarantee non-flaky monotonic timestamps
        setInternalPostFields(memoryRepo, post.id, {
          createdAt: baseTime + i * 1000,
        });
      }

      // Latest sort: strictly createdAt DESC (Post 5, 4, 3, 2, 1)
      const latestResult = await memoryRepo.getPosts({ sort: 'latest' });
      expect(latestResult.posts).toHaveLength(5);
      expect(latestResult.posts[0].title).toBe('Post Tier 0 - Index 5');
      expect(latestResult.posts[1].title).toBe('Post Tier 0 - Index 4');
      expect(latestResult.posts[2].title).toBe('Post Tier 0 - Index 3');
      expect(latestResult.posts[3].title).toBe('Post Tier 0 - Index 2');
      expect(latestResult.posts[4].title).toBe('Post Tier 0 - Index 1');

      // Popular sort: all like counts are 0, so secondary tie-breaker MUST be createdAt DESC
      const popularResult = await memoryRepo.getPosts({ sort: 'popular' });
      expect(popularResult.posts).toHaveLength(5);
      expect(popularResult.posts[0].title).toBe('Post Tier 0 - Index 5');
      expect(popularResult.posts[1].title).toBe('Post Tier 0 - Index 4');
      expect(popularResult.posts[2].title).toBe('Post Tier 0 - Index 3');
      expect(popularResult.posts[3].title).toBe('Post Tier 0 - Index 2');
      expect(popularResult.posts[4].title).toBe('Post Tier 0 - Index 1');

      // Check timestamps are strictly decreasing
      for (let i = 0; i < popularResult.posts.length - 1; i++) {
        expect(popularResult.posts[i].createdAt).toBeGreaterThan(
          popularResult.posts[i + 1].createdAt
        );
      }
    });

    it('orders tiered like-count collisions deterministically across complex ties', async () => {
      const baseTime = 1700000000000;

      // Define 6 posts across 3 like tiers with interleaved timestamps:
      // Tier 1 (10 likes): Post A (created: base + 1000), Post B (created: base + 3000)
      // Tier 2 (5 likes):  Post C (created: base + 2000), Post D (created: base + 5000), Post E (created: base + 4000)
      // Tier 3 (0 likes):  Post F (created: base + 6000)
      const pA = await memoryRepo.createPost({ title: 'Post A', content: 'c', authorTitle: 't', authorTokenHash: hashAuthorToken('a') });
      const pB = await memoryRepo.createPost({ title: 'Post B', content: 'c', authorTitle: 't', authorTokenHash: hashAuthorToken('b') });
      const pC = await memoryRepo.createPost({ title: 'Post C', content: 'c', authorTitle: 't', authorTokenHash: hashAuthorToken('c') });
      const pD = await memoryRepo.createPost({ title: 'Post D', content: 'c', authorTitle: 't', authorTokenHash: hashAuthorToken('d') });
      const pE = await memoryRepo.createPost({ title: 'Post E', content: 'c', authorTitle: 't', authorTokenHash: hashAuthorToken('e') });
      const pF = await memoryRepo.createPost({ title: 'Post F', content: 'c', authorTitle: 't', authorTokenHash: hashAuthorToken('f') });

      setInternalPostFields(memoryRepo, pA.id, { likeCount: 10, createdAt: baseTime + 1000 });
      setInternalPostFields(memoryRepo, pB.id, { likeCount: 10, createdAt: baseTime + 3000 });
      setInternalPostFields(memoryRepo, pC.id, { likeCount: 5, createdAt: baseTime + 2000 });
      setInternalPostFields(memoryRepo, pD.id, { likeCount: 5, createdAt: baseTime + 5000 });
      setInternalPostFields(memoryRepo, pE.id, { likeCount: 5, createdAt: baseTime + 4000 });
      setInternalPostFields(memoryRepo, pF.id, { likeCount: 0, createdAt: baseTime + 6000 });

      // In sort=popular:
      // 10 likes tier: Post B (3000) then Post A (1000)
      // 5 likes tier:  Post D (5000) then Post E (4000) then Post C (2000)
      // 0 likes tier:  Post F (6000)
      const popular = await memoryRepo.getPosts({ sort: 'popular' });
      const popularTitles = popular.posts.map((p) => p.title);
      expect(popularTitles).toEqual([
        'Post B',
        'Post A',
        'Post D',
        'Post E',
        'Post C',
        'Post F',
      ]);

      // In sort=latest:
      // Pure timestamp DESC: Post F (6000), Post D (5000), Post E (4000), Post B (3000), Post C (2000), Post A (1000)
      const latest = await memoryRepo.getPosts({ sort: 'latest' });
      const latestTitles = latest.posts.map((p) => p.title);
      expect(latestTitles).toEqual([
        'Post F',
        'Post D',
        'Post E',
        'Post B',
        'Post C',
        'Post A',
      ]);

      // Verify pagination partition stability across pages (2 posts per page)
      const page1 = await memoryRepo.getPosts({ sort: 'popular', page: 1, limit: 2 });
      const page2 = await memoryRepo.getPosts({ sort: 'popular', page: 2, limit: 2 });
      const page3 = await memoryRepo.getPosts({ sort: 'popular', page: 3, limit: 2 });

      expect(page1.posts.map((p) => p.title)).toEqual(['Post B', 'Post A']);
      expect(page2.posts.map((p) => p.title)).toEqual(['Post D', 'Post E']);
      expect(page3.posts.map((p) => p.title)).toEqual(['Post C', 'Post F']);

      // Disjoint set invariant: all 6 posts are partitioned without duplication or omission
      const combined = [
        ...page1.posts.map((p) => p.id),
        ...page2.posts.map((p) => p.id),
        ...page3.posts.map((p) => p.id),
      ];
      expect(new Set(combined).size).toBe(6);
    });

    it('preserves sorting stability via GET /api/board/posts HTTP Route Handler', async () => {
      const baseTime = 1710000000000;
      const p1 = await memoryRepo.createPost({ title: 'Post 1', content: 'c', authorTitle: 't', authorTokenHash: 'h1' });
      const p2 = await memoryRepo.createPost({ title: 'Post 2', content: 'c', authorTitle: 't', authorTokenHash: 'h2' });
      const p3 = await memoryRepo.createPost({ title: 'Post 3', content: 'c', authorTitle: 't', authorTokenHash: 'h3' });

      setInternalPostFields(memoryRepo, p1.id, { likeCount: 3, createdAt: baseTime + 1000 });
      setInternalPostFields(memoryRepo, p2.id, { likeCount: 3, createdAt: baseTime + 2000 });
      setInternalPostFields(memoryRepo, p3.id, { likeCount: 7, createdAt: baseTime + 500 });

      // GET /api/board/posts?sort=popular
      const reqPopular = new NextRequest('http://localhost/api/board/posts?sort=popular', {
        headers: { 'x-forwarded-for': '10.50.0.1' },
      });
      const resPopular = await getPostsRoute(reqPopular);
      expect(resPopular.status).toBe(200);
      const dataPopular = await resPopular.json();
      expect(dataPopular.data.posts.map((p: any) => p.title)).toEqual([
        'Post 3', // 7 likes
        'Post 2', // 3 likes, newer (2000)
        'Post 1', // 3 likes, older (1000)
      ]);

      // GET /api/board/posts?sort=latest
      const reqLatest = new NextRequest('http://localhost/api/board/posts?sort=latest', {
        headers: { 'x-forwarded-for': '10.50.0.2' },
      });
      const resLatest = await getPostsRoute(reqLatest);
      expect(resLatest.status).toBe(200);
      const dataLatest = await resLatest.json();
      expect(dataLatest.data.posts.map((p: any) => p.title)).toEqual([
        'Post 2', // 2000
        'Post 1', // 1000
        'Post 3', // 500
      ]);
    });
  });

  // =========================================================================
  // Vector 3: Comment Count Synchronization Under Heavy Churn
  // =========================================================================
  describe('Vector 3: Comment Count Synchronization Under 20 Operations', () => {
    it('maintains exact synchronization between post.commentCount and active comments under 20 additions and deletions', async () => {
      const authorHash = hashAuthorToken('author-comments-sync');
      const post = await memoryRepo.createPost({
        title: 'Comment Churn Test Post',
        content: 'Content',
        authorTitle: '동탄역 유림노르웨이숲',
        isGpsVerified: true,
        authorTokenHash: authorHash,
      });

      expect(post.commentCount).toBe(0);

      // Phase 1: Rapidly create 20 comments
      const createdComments = [];
      for (let i = 1; i <= 20; i++) {
        const commentAuthorToken = `commenter_token_${i}`;
        const commentAuthorHash = hashAuthorToken(commentAuthorToken);

        const comment = await memoryRepo.createComment({
          postId: post.id,
          content: `Churn comment #${i}`,
          authorTitle: `단지 ${i % 10}`,
          isGpsVerified: i % 2 === 0,
          authorTokenHash: commentAuthorHash,
        });

        createdComments.push({ comment, token: commentAuthorToken, hash: commentAuthorHash });

        // Assert count increments monotonically at each step
        const refreshed = await memoryRepo.getPostById(post.id);
        expect(refreshed?.commentCount).toBe(i);
      }

      // Assert full state after 20 creations
      let currentActiveComments = await memoryRepo.getComments(post.id);
      expect(currentActiveComments).toHaveLength(20);
      let refreshedPost = await memoryRepo.getPostById(post.id);
      expect(refreshedPost?.commentCount).toBe(20);

      // Phase 2: Delete 5 even-indexed comments (indices 0, 2, 4, 6, 8 -> 5 comments)
      const toDeletePhase1 = [0, 2, 4, 6, 8];
      for (const idx of toDeletePhase1) {
        const item = createdComments[idx];
        const deleted = await memoryRepo.deleteComment(post.id, item.comment.id, item.hash);
        expect(deleted).toBe(true);
      }

      // Assert synchronization: exactly 15 active comments remain
      currentActiveComments = await memoryRepo.getComments(post.id);
      expect(currentActiveComments).toHaveLength(15);
      refreshedPost = await memoryRepo.getPostById(post.id);
      expect(refreshedPost?.commentCount).toBe(15);

      // Phase 3: Adversarial double-deletion attempt
      // Attempting to delete an already deleted comment must fail and NOT decrement commentCount
      const doubleDeleteTarget = createdComments[0];
      const reDeleteResult = await memoryRepo.deleteComment(
        post.id,
        doubleDeleteTarget.comment.id,
        doubleDeleteTarget.hash
      );
      expect(reDeleteResult).toBe(false);

      refreshedPost = await memoryRepo.getPostById(post.id);
      expect(refreshedPost?.commentCount).toBe(15); // Must remain strictly 15!

      // Phase 4: Delete 10 more comments
      const toDeletePhase2 = [1, 3, 5, 7, 9, 10, 11, 12, 13, 14];
      for (const idx of toDeletePhase2) {
        const item = createdComments[idx];
        const deleted = await memoryRepo.deleteComment(post.id, item.comment.id, item.hash);
        expect(deleted).toBe(true);
      }

      // Assert synchronization: exactly 5 active comments remain
      currentActiveComments = await memoryRepo.getComments(post.id);
      expect(currentActiveComments).toHaveLength(5);
      refreshedPost = await memoryRepo.getPostById(post.id);
      expect(refreshedPost?.commentCount).toBe(5);

      // Phase 5: Delete remaining 5 comments (indices 15, 16, 17, 18, 19)
      const toDeletePhase3 = [15, 16, 17, 18, 19];
      for (const idx of toDeletePhase3) {
        const item = createdComments[idx];
        const deleted = await memoryRepo.deleteComment(post.id, item.comment.id, item.hash);
        expect(deleted).toBe(true);
      }

      // Assert zero comments: commentCount must be exactly 0, never negative
      currentActiveComments = await memoryRepo.getComments(post.id);
      expect(currentActiveComments).toHaveLength(0);
      refreshedPost = await memoryRepo.getPostById(post.id);
      expect(refreshedPost?.commentCount).toBe(0);

      // Boundary condition: attempt to delete non-existent comment when count is 0
      const ghostDelete = await memoryRepo.deleteComment(post.id, 'ghost_comment_id', authorHash);
      expect(ghostDelete).toBe(false);
      refreshedPost = await memoryRepo.getPostById(post.id);
      expect(refreshedPost?.commentCount).toBe(0); // Invariant: commentCount >= 0
    });

    it('maintains commentCount synchronization through HTTP Route Handlers', async () => {
      const authorToken = generateAuthorToken();
      const authorHash = hashAuthorToken(authorToken);

      const post = await memoryRepo.createPost({
        title: 'HTTP Comment Churn Post',
        content: 'Content',
        authorTitle: '동탄역 헤리엇',
        authorTokenHash: authorHash,
      });

      const commentIds: string[] = [];

      // Create 5 comments via POST /api/board/posts/[id]/comments
      for (let i = 1; i <= 5; i++) {
        const req = new NextRequest(`http://localhost/api/board/posts/${post.id}/comments`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
            'x-forwarded-for': `10.88.1.${i}`,
          },
          body: JSON.stringify({
            content: `HTTP Comment ${i}`,
            authorTitle: '동탄 예비입주민',
          }),
        });

        const res = await createCommentRoute(req, {
          params: Promise.resolve({ id: post.id }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        commentIds.push(data.data.id);
      }

      // Verify post detail reflects 5 comments
      const reqDetail5 = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        headers: { 'x-forwarded-for': '10.88.2.1' },
      });
      const resDetail5 = await getPostDetailRoute(reqDetail5, {
        params: Promise.resolve({ id: post.id }),
      });
      const dataDetail5 = await resDetail5.json();
      expect(dataDetail5.data.post.commentCount).toBe(5);
      expect(dataDetail5.data.comments).toHaveLength(5);

      // Delete 3 comments via DELETE /api/board/posts/[id]/comments/[commentId]
      for (let i = 0; i < 3; i++) {
        const commentId = commentIds[i];
        const reqDel = new NextRequest(
          `http://localhost/api/board/posts/${post.id}/comments/${commentId}`,
          {
            method: 'DELETE',
            headers: {
              [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
              'x-forwarded-for': `10.88.3.${i}`,
            },
          }
        );
        const resDel = await deleteCommentRoute(reqDel, {
          params: Promise.resolve({ id: post.id, commentId }),
        });
        expect(resDel.status).toBe(200);
      }

      // Verify post detail reflects 2 comments remaining
      const reqDetail2 = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        headers: { 'x-forwarded-for': '10.88.2.2' },
      });
      const resDetail2 = await getPostDetailRoute(reqDetail2, {
        params: Promise.resolve({ id: post.id }),
      });
      const dataDetail2 = await resDetail2.json();
      expect(dataDetail2.data.post.commentCount).toBe(2);
      expect(dataDetail2.data.comments).toHaveLength(2);
    });
  });

  // =========================================================================
  // Vector 4: Information Leakage Prevention (authorTokenHash Redaction)
  // =========================================================================
  describe('Vector 4: Strict Information Leakage Prevention & authorTokenHash Zero-Exposure', () => {
    it('asserts that authorTokenHash is NEVER present in any property of items returned by GET /api/board/posts', async () => {
      const token1 = generateAuthorToken();
      const token2 = generateAuthorToken();
      const hash1 = hashAuthorToken(token1);
      const hash2 = hashAuthorToken(token2);

      await memoryRepo.createPost({
        title: 'Leakage Test Post 1',
        content: 'Content 1',
        authorTitle: '단지 1',
        isGpsVerified: true,
        authorTokenHash: hash1,
      });

      await memoryRepo.createPost({
        title: 'Leakage Test Post 2',
        content: 'Content 2',
        authorTitle: '단지 2',
        isGpsVerified: false,
        authorTokenHash: hash2,
      });

      // Query GET /api/board/posts as anonymous (no author token)
      const reqAnon = new NextRequest('http://localhost/api/board/posts', {
        headers: { 'x-forwarded-for': '10.99.1.1' },
      });
      const resAnon = await getPostsRoute(reqAnon);
      expect(resAnon.status).toBe(200);

      const jsonAnon = await resAnon.json();
      expect(jsonAnon.success).toBe(true);
      expect(jsonAnon.data.posts).toHaveLength(2);

      // Deep inspection of every post item
      for (const p of jsonAnon.data.posts) {
        // Direct property assertion
        expect(p).not.toHaveProperty('authorTokenHash');
        expect(p).not.toHaveProperty('authorToken');
        expect(p).not.toHaveProperty('tokenHash');

        // Check canDelete and isMine are properly sanitized to false for anonymous
        expect(p.canDelete).toBe(false);
        expect(p.isMine).toBe(false);

        // Verify keys of post object
        const keys = Object.keys(p);
        expect(keys.some((k) => k.toLowerCase().includes('hash'))).toBe(false);
        expect(keys.some((k) => k.toLowerCase().includes('token'))).toBe(false);
      }

      // String serialization search: neither hash1 nor hash2 nor the word 'authorTokenHash' may appear anywhere in body
      const serializedAnon = JSON.stringify(jsonAnon);
      expect(serializedAnon).not.toContain(hash1);
      expect(serializedAnon).not.toContain(hash2);
      expect(serializedAnon).not.toContain(token1);
      expect(serializedAnon).not.toContain(token2);
      expect(serializedAnon).not.toContain('authorTokenHash');

      // Query GET /api/board/posts as Author 1
      const reqAuth1 = new NextRequest('http://localhost/api/board/posts', {
        headers: {
          [AUTHOR_TOKEN_HEADER_NAME]: token1,
          'x-forwarded-for': '10.99.1.2',
        },
      });
      const resAuth1 = await getPostsRoute(reqAuth1);
      const jsonAuth1 = await resAuth1.json();

      for (const p of jsonAuth1.data.posts) {
        expect(p).not.toHaveProperty('authorTokenHash');
        expect(p).not.toHaveProperty('authorToken');

        // Verify canDelete is true ONLY for Author 1's post
        if (p.title === 'Leakage Test Post 1') {
          expect(p.canDelete).toBe(true);
          expect(p.isMine).toBe(true);
        } else {
          expect(p.canDelete).toBe(false);
          expect(p.isMine).toBe(false);
        }
      }

      const serializedAuth1 = JSON.stringify(jsonAuth1);
      expect(serializedAuth1).not.toContain(hash1);
      expect(serializedAuth1).not.toContain(hash2);
      expect(serializedAuth1).not.toContain('authorTokenHash');
    });

    it('asserts that authorTokenHash is NEVER present in any property of items returned by GET /api/board/posts/[id]', async () => {
      const postAuthorToken = generateAuthorToken();
      const commentAuthorToken = generateAuthorToken();
      const postAuthorHash = hashAuthorToken(postAuthorToken);
      const commentAuthorHash = hashAuthorToken(commentAuthorToken);

      const post = await memoryRepo.createPost({
        title: 'Detail Leakage Test Post',
        content: 'Confidential content verification',
        authorTitle: '동탄역 파라곤',
        isGpsVerified: true,
        authorTokenHash: postAuthorHash,
      });

      await memoryRepo.createComment({
        postId: post.id,
        content: 'Confidential comment verification',
        authorTitle: '동탄역 반도유보라',
        isGpsVerified: false,
        authorTokenHash: commentAuthorHash,
      });

      // 1. Anonymous caller check
      const reqAnon = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        headers: { 'x-forwarded-for': '10.99.2.1' },
      });
      const resAnon = await getPostDetailRoute(reqAnon, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(resAnon.status).toBe(200);

      const jsonAnon = await resAnon.json();
      expect(jsonAnon.success).toBe(true);

      const detailPost = jsonAnon.data.post;
      const detailComments = jsonAnon.data.comments;

      // Post object inspection
      expect(detailPost).not.toHaveProperty('authorTokenHash');
      expect(detailPost).not.toHaveProperty('authorToken');
      expect(detailPost.canDelete).toBe(false);
      expect(detailPost.isMine).toBe(false);

      // Comments array inspection
      expect(detailComments).toHaveLength(1);
      const detailComment = detailComments[0];
      expect(detailComment).not.toHaveProperty('authorTokenHash');
      expect(detailComment).not.toHaveProperty('authorToken');
      expect(detailComment.canDelete).toBe(false);
      expect(detailComment.isMine).toBe(false);

      // Full payload string search
      const serializedAnon = JSON.stringify(jsonAnon);
      expect(serializedAnon).not.toContain(postAuthorHash);
      expect(serializedAnon).not.toContain(commentAuthorHash);
      expect(serializedAnon).not.toContain(postAuthorToken);
      expect(serializedAnon).not.toContain(commentAuthorToken);
      expect(serializedAnon).not.toContain('authorTokenHash');

      // 2. Caller is the comment author (commentAuthorToken)
      const reqCommenter = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        headers: {
          [AUTHOR_TOKEN_HEADER_NAME]: commentAuthorToken,
          'x-forwarded-for': '10.99.2.2',
        },
      });
      const resCommenter = await getPostDetailRoute(reqCommenter, {
        params: Promise.resolve({ id: post.id }),
      });
      const jsonCommenter = await resCommenter.json();

      expect(jsonCommenter.data.post.canDelete).toBe(false);
      expect(jsonCommenter.data.comments[0].canDelete).toBe(true);
      expect(jsonCommenter.data.comments[0].isMine).toBe(true);

      // Even when caller owns comment, authorTokenHash MUST NOT be returned in commentDto
      expect(jsonCommenter.data.comments[0]).not.toHaveProperty('authorTokenHash');

      const serializedCommenter = JSON.stringify(jsonCommenter);
      expect(serializedCommenter).not.toContain(postAuthorHash);
      expect(serializedCommenter).not.toContain(commentAuthorHash);
      expect(serializedCommenter).not.toContain('authorTokenHash');
    });
  });
});

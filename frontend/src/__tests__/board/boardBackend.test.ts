import { NextRequest } from 'next/server';
import {
  hashAuthorToken,
  generateAuthorToken,
  extractAuthorToken,
  getOrCreateAuthorToken,
  canDelete,
  AUTHOR_TOKEN_COOKIE_NAME,
  AUTHOR_TOKEN_HEADER_NAME,
  AUTHOR_TOKEN_HEADER_ALT,
} from '@/lib/board/boardAuth';
import {
  BoardRepository,
  MemoryBoardRepository,
  getBoardRepository,
  setBoardRepository,
} from '@/lib/board/boardRepository';
import { GET as getPostsRoute, POST as createPostRoute } from '@/app/api/board/posts/route';
import { GET as getPostDetailRoute, DELETE as deletePostRoute } from '@/app/api/board/posts/[id]/route';
import { POST as createCommentRoute } from '@/app/api/board/posts/[id]/comments/route';
import { DELETE as deleteCommentRoute } from '@/app/api/board/posts/[id]/comments/[commentId]/route';
import { POST as toggleLikeRoute } from '@/app/api/board/posts/[id]/like/route';

describe('Milestone 1 — Board Backend Core & Data Layer', () => {
  let memoryRepo: MemoryBoardRepository;

  beforeEach(() => {
    // Ensure clean in-memory repository for each test
    memoryRepo = new MemoryBoardRepository();
    setBoardRepository(memoryRepo);
  });

  afterEach(() => {
    setBoardRepository(null);
  });

  // =========================================================================
  // 1. Author Token & Cryptographic Hashing Tests (`boardAuth.ts`)
  // =========================================================================
  describe('1. Author Token & Cryptographic Authentication', () => {
    it('generates a 64-character hex cryptographic author token', () => {
      const token = generateAuthorToken();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it('hashes author token deterministically using SHA-256', () => {
      const token = 'test-device-author-token-12345';
      const hash1 = hashAuthorToken(token);
      const hash2 = hashAuthorToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);

      // Different tokens produce different hashes
      const otherHash = hashAuthorToken('different-token');
      expect(hash1).not.toBe(otherHash);
    });

    it('throws when hashing an empty or invalid token', () => {
      expect(() => hashAuthorToken('')).toThrow();
      expect(() => hashAuthorToken(null as unknown as string)).toThrow();
    });

    it('extracts author token from x-author-token header', () => {
      const req = new NextRequest('http://localhost/api/board/posts', {
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: 'header-token-xyz' },
      });
      expect(extractAuthorToken(req)).toBe('header-token-xyz');
    });

    it('extracts author token from x-dview-author-token alternate header', () => {
      const req = new NextRequest('http://localhost/api/board/posts', {
        headers: { [AUTHOR_TOKEN_HEADER_ALT]: 'alt-header-token-456' },
      });
      expect(extractAuthorToken(req)).toBe('alt-header-token-456');
    });

    it('extracts author token from cookie', () => {
      const req = new NextRequest('http://localhost/api/board/posts', {
        headers: {
          cookie: `${AUTHOR_TOKEN_COOKIE_NAME}=cookie-token-789; other_cookie=abc`,
        },
      });
      expect(extractAuthorToken(req)).toBe('cookie-token-789');
    });

    it('extracts author token from request body fallback if provided', () => {
      const req = new NextRequest('http://localhost/api/board/posts');
      expect(extractAuthorToken(req, 'body-token-abc')).toBe('body-token-abc');
    });

    it('getOrCreateAuthorToken generates new token when none exists', () => {
      const req = new NextRequest('http://localhost/api/board/posts');
      const { token, isNew } = getOrCreateAuthorToken(req);
      expect(isNew).toBe(true);
      expect(token).toHaveLength(64);
    });

    it('getOrCreateAuthorToken reuses existing token if present', () => {
      const req = new NextRequest('http://localhost/api/board/posts', {
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: 'existing-token-111' },
      });
      const { token, isNew } = getOrCreateAuthorToken(req);
      expect(isNew).toBe(false);
      expect(token).toBe('existing-token-111');
    });

    it('canDelete accurately verifies ownership by authorTokenHash', () => {
      const hashA = hashAuthorToken('user-a');
      const hashB = hashAuthorToken('user-b');

      expect(canDelete(hashA, { authorTokenHash: hashA })).toBe(true);
      expect(canDelete(hashB, { authorTokenHash: hashA })).toBe(false);
      expect(canDelete(null, { authorTokenHash: hashA })).toBe(false);
      expect(canDelete(hashA, null)).toBe(false);
    });
  });

  // =========================================================================
  // 2. Repository Layer Tests (`MemoryBoardRepository`)
  // =========================================================================
  describe('2. Repository Data Operations & Ordering', () => {
    it('creates post with initialized zero counts and active status', async () => {
      const hash = hashAuthorToken('author-1');
      const post = await memoryRepo.createPost({
        title: '동탄역 도보 5분 체감 후기',
        content: '출퇴근 시간에 실제로 걸어보니 약 4분 정도 소요됩니다.',
        authorTitle: '동탄역 롯데캐슬',
        authorDong: '오산동',
        isGpsVerified: true,
        authorTokenHash: hash,
      });

      expect(post.id).toBeDefined();
      expect(post.title).toBe('동탄역 도보 5분 체감 후기');
      expect(post.likeCount).toBe(0);
      expect(post.commentCount).toBe(0);
      expect(post.viewCount).toBe(0);
      expect(post.isDeleted).toBe(false);
      expect(post.createdAt).toBeGreaterThan(0);
    });

    it('orders posts by latest (createdAt DESC) by default', async () => {
      const hash = hashAuthorToken('author-1');
      const p1 = await memoryRepo.createPost({
        title: 'First Post',
        content: 'Content 1',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hash,
      });

      // Small delay to ensure timestamp progression
      await new Promise((r) => setTimeout(r, 10));

      const p2 = await memoryRepo.createPost({
        title: 'Second Post',
        content: 'Content 2',
        authorTitle: '동탄역 린스트라우스',
        isGpsVerified: false,
        authorTokenHash: hash,
      });

      const { posts } = await memoryRepo.getPosts({ sort: 'latest' });
      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe(p2.id);
      expect(posts[1].id).toBe(p1.id);
    });

    it('orders posts by popular (likeCount DESC, then createdAt DESC)', async () => {
      const hash = hashAuthorToken('author-1');
      const otherHash = hashAuthorToken('author-2');

      const p1 = await memoryRepo.createPost({
        title: 'Post with 0 likes',
        content: 'Content 1',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hash,
      });

      const p2 = await memoryRepo.createPost({
        title: 'Post with 1 like',
        content: 'Content 2',
        authorTitle: '동탄역 린스트라우스',
        isGpsVerified: false,
        authorTokenHash: hash,
      });

      await memoryRepo.toggleLike(p2.id, otherHash);

      const { posts } = await memoryRepo.getPosts({ sort: 'popular' });
      expect(posts[0].id).toBe(p2.id);
      expect(posts[0].likeCount).toBe(1);
      expect(posts[1].id).toBe(p1.id);
      expect(posts[1].likeCount).toBe(0);
    });

    it('correctly paginates posts using page and limit', async () => {
      const hash = hashAuthorToken('author-1');
      for (let i = 1; i <= 5; i++) {
        await memoryRepo.createPost({
          title: `Post ${i}`,
          content: `Content ${i}`,
          authorTitle: '동탄역 롯데캐슬',
          isGpsVerified: false,
          authorTokenHash: hash,
        });
      }

      const page1 = await memoryRepo.getPosts({ page: 1, limit: 2 });
      expect(page1.posts).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await memoryRepo.getPosts({ page: 2, limit: 2 });
      expect(page2.posts).toHaveLength(2);
      expect(page2.total).toBe(5);

      const page3 = await memoryRepo.getPosts({ page: 3, limit: 2 });
      expect(page3.posts).toHaveLength(1);
      expect(page3.total).toBe(5);
    });

    it('allows author to delete post and rejects non-author deletion', async () => {
      const authorHash = hashAuthorToken('author-original');
      const intruderHash = hashAuthorToken('intruder');

      const post = await memoryRepo.createPost({
        title: 'To be deleted',
        content: 'Content to be deleted',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash,
      });

      // Intruder attempt -> false
      const intruderDelete = await memoryRepo.deletePost(post.id, intruderHash);
      expect(intruderDelete).toBe(false);

      // Post still active
      const fetched = await memoryRepo.getPostById(post.id);
      expect(fetched).not.toBeNull();

      // Legitimate author attempt -> true
      const authorDelete = await memoryRepo.deletePost(post.id, authorHash);
      expect(authorDelete).toBe(true);

      // Post now deleted
      const fetchedAfter = await memoryRepo.getPostById(post.id);
      expect(fetchedAfter).toBeNull();
    });

    it('creates comment and atomically updates parent post commentCount', async () => {
      const authorHash = hashAuthorToken('author-1');
      const post = await memoryRepo.createPost({
        title: 'Post for comment test',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash,
      });

      expect(post.commentCount).toBe(0);

      const comment = await memoryRepo.createComment({
        postId: post.id,
        content: '좋은 정보 감사합니다!',
        authorTitle: '동탄역 린스트라우스',
        isGpsVerified: true,
        authorTokenHash: authorHash,
      });

      expect(comment.id).toBeDefined();
      expect(comment.postId).toBe(post.id);

      const comments = await memoryRepo.getComments(post.id);
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('좋은 정보 감사합니다!');

      const updatedPost = await memoryRepo.getPostById(post.id);
      expect(updatedPost?.commentCount).toBe(1);
    });

    it('allows comment author to delete comment and decrements commentCount', async () => {
      const authorHash = hashAuthorToken('author-1');
      const intruderHash = hashAuthorToken('intruder');

      const post = await memoryRepo.createPost({
        title: 'Post',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash,
      });

      const comment = await memoryRepo.createComment({
        postId: post.id,
        content: '댓글 내용',
        authorTitle: '동탄 예비입주민',
        isGpsVerified: false,
        authorTokenHash: authorHash,
      });

      // Non-author deletion fails
      const failed = await memoryRepo.deleteComment(post.id, comment.id, intruderHash);
      expect(failed).toBe(false);

      // Author deletion succeeds
      const success = await memoryRepo.deleteComment(post.id, comment.id, authorHash);
      expect(success).toBe(true);

      const commentsAfter = await memoryRepo.getComments(post.id);
      expect(commentsAfter).toHaveLength(0);

      const updatedPost = await memoryRepo.getPostById(post.id);
      expect(updatedPost?.commentCount).toBe(0);
    });

    it('handles like toggle: 1st call adds like, 2nd call removes like', async () => {
      const authorHash = hashAuthorToken('author-1');
      const post = await memoryRepo.createPost({
        title: 'Post for like test',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash,
      });

      // 1st like
      const res1 = await memoryRepo.toggleLike(post.id, authorHash);
      expect(res1.liked).toBe(true);
      expect(res1.likeCount).toBe(1);

      // Verify post state
      const postAfterLike = await memoryRepo.getPostById(post.id);
      expect(postAfterLike?.likeCount).toBe(1);

      // 2nd like (unlike)
      const res2 = await memoryRepo.toggleLike(post.id, authorHash);
      expect(res2.liked).toBe(false);
      expect(res2.likeCount).toBe(0);

      const postAfterUnlike = await memoryRepo.getPostById(post.id);
      expect(postAfterUnlike?.likeCount).toBe(0);
    });

    it('prevents duplicate likes from same author without decrements below zero', async () => {
      const authorA = hashAuthorToken('user-a');
      const authorB = hashAuthorToken('user-b');

      const post = await memoryRepo.createPost({
        title: 'Concurrency like test',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorA,
      });

      // A likes (+1)
      await memoryRepo.toggleLike(post.id, authorA);
      // B likes (+1 -> 2)
      const resB = await memoryRepo.toggleLike(post.id, authorB);
      expect(resB.likeCount).toBe(2);

      // B unlikes (-1 -> 1)
      const resB2 = await memoryRepo.toggleLike(post.id, authorB);
      expect(resB2.likeCount).toBe(1);

      // A unlikes (-1 -> 0)
      const resA2 = await memoryRepo.toggleLike(post.id, authorA);
      expect(resA2.likeCount).toBe(0);
    });

    it('persists and retrieves author profiles', async () => {
      const authorHash = hashAuthorToken('profile-author');
      const now = Date.now();
      const profile = {
        authorTokenHash: authorHash,
        selectedTitle: '동탄역 롯데캐슬',
        dong: '오산동',
        titleSetAt: now,
        titleExpiresAt: now + 30 * 24 * 60 * 60 * 1000,
        isGpsVerified: true,
        gpsVerifiedComplex: '동탄역 롯데캐슬',
        gpsVerifiedAt: now,
      };

      await memoryRepo.saveAuthorProfile(profile);

      const fetched = await memoryRepo.getAuthorProfile(authorHash);
      expect(fetched).toEqual(profile);

      const nonExistent = await memoryRepo.getAuthorProfile('non-existent');
      expect(nonExistent).toBeNull();
    });
  });

  // =========================================================================
  // 3. Next.js App Router API Route Handler Integration Tests
  // =========================================================================
  describe('3. Next.js REST API Route Handlers Integration', () => {
    const authorToken1 = generateAuthorToken();
    const authorHash1 = hashAuthorToken(authorToken1);
    const authorToken2 = generateAuthorToken();

    it('POST /api/board/posts creates post and sets author token cookie', async () => {
      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken1,
        },
        body: JSON.stringify({
          title: '동탄 호수공원 루나쇼 관람 후기',
          content: '주말 저녁에 다녀왔는데 분수쇼가 장관이었습니다.',
          authorTitle: '동탄호수공원 금강펜테리움 센트럴파크 2차',
          authorDong: '송동',
          isGpsVerified: true,
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('동탄 호수공원 루나쇼 관람 후기');
      expect(data.data.authorTitle).toBe('동탄호수공원 금강펜테리움 센트럴파크 2차');
      expect(data.data.canDelete).toBe(true);
      expect(data.data.isMine).toBe(true);
      // authorTokenHash must NOT be leaked
      expect(data.data.authorTokenHash).toBeUndefined();

      // Check cookie
      const cookie = res.cookies.get(AUTHOR_TOKEN_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe(authorToken1);
    });

    it('POST /api/board/posts rejects invalid input with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: '짧', // Under 2 chars
          content: '짧', // Under 5 chars
          authorTitle: '',
        }),
      });

      const res = await createPostRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_PARAMETERS');
    });

    it('GET /api/board/posts returns sanitized post list and respects caller identity', async () => {
      // Create post as author 1
      const post = await memoryRepo.createPost({
        title: 'Post by Author 1',
        content: 'Content by Author 1',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash1,
      });

      // Request as author 1
      const reqAuthor1 = new NextRequest('http://localhost/api/board/posts?sort=latest', {
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken1 },
      });
      const res1 = await getPostsRoute(reqAuthor1);
      const data1 = await res1.json();
      expect(data1.success).toBe(true);
      expect(data1.data.posts[0].canDelete).toBe(true);
      expect(data1.data.posts[0].isMine).toBe(true);
      expect(data1.data.posts[0].authorTokenHash).toBeUndefined();

      // Request as author 2 (different user)
      const reqAuthor2 = new NextRequest('http://localhost/api/board/posts?sort=latest', {
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken2 },
      });
      const res2 = await getPostsRoute(reqAuthor2);
      const data2 = await res2.json();
      expect(data2.data.posts[0].canDelete).toBe(false);
      expect(data2.data.posts[0].isMine).toBe(false);
    });

    it('GET /api/board/posts/[id] returns post detail, like status and comments', async () => {
      const post = await memoryRepo.createPost({
        title: 'Detail Test Post',
        content: 'Detail Test Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: true,
        authorTokenHash: authorHash1,
      });

      await memoryRepo.createComment({
        postId: post.id,
        content: '테스트 댓글 1',
        authorTitle: '동탄역 린스트라우스',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(authorToken2),
      });

      const req = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken1 },
      });

      const res = await getPostDetailRoute(req, { params: Promise.resolve({ id: post.id }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.post.id).toBe(post.id);
      expect(data.data.post.canDelete).toBe(true);
      expect(data.data.post.isMine).toBe(true);
      expect(data.data.post.isLiked).toBe(false);
      expect(data.data.comments).toHaveLength(1);
      expect(data.data.comments[0].content).toBe('테스트 댓글 1');
      expect(data.data.comments[0].canDelete).toBe(false); // Written by author 2
    });

    it('GET /api/board/posts/[id] returns 404 for non-existent post', async () => {
      const req = new NextRequest('http://localhost/api/board/posts/ghost-id');
      const res = await getPostDetailRoute(req, { params: Promise.resolve({ id: 'ghost-id' }) });
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('POST_NOT_FOUND');
    });

    it('DELETE /api/board/posts/[id] enforces 403 for non-creator and allows creator', async () => {
      const post = await memoryRepo.createPost({
        title: 'Secure Post',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash1,
      });

      // Non-creator deletion attempt -> 403 Forbidden
      const reqNonAuthor = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        method: 'DELETE',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken2 },
      });
      const resForbidden = await deletePostRoute(reqNonAuthor, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(resForbidden.status).toBe(403);
      const forbiddenData = await resForbidden.json();
      expect(forbiddenData.code).toBe('FORBIDDEN');

      // Creator deletion attempt -> 200 OK
      const reqAuthor = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        method: 'DELETE',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken1 },
      });
      const resSuccess = await deletePostRoute(reqAuthor, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(resSuccess.status).toBe(200);
      const successData = await resSuccess.json();
      expect(successData.data.deleted).toBe(true);

      // Verify post is now gone
      const checkPost = await memoryRepo.getPostById(post.id);
      expect(checkPost).toBeNull();
    });

    it('POST /api/board/posts/[id]/comments creates comment and increments count', async () => {
      const post = await memoryRepo.createPost({
        title: 'Post to Comment On',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash1,
      });

      const req = new NextRequest(`http://localhost/api/board/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken2,
        },
        body: JSON.stringify({
          content: '첫 번째 댓글입니다.',
          authorTitle: '동탄 예비입주민',
          isGpsVerified: false,
        }),
      });

      const res = await createCommentRoute(req, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('첫 번째 댓글입니다.');
      expect(data.data.canDelete).toBe(true);

      const updatedPost = await memoryRepo.getPostById(post.id);
      expect(updatedPost?.commentCount).toBe(1);
    });

    it('DELETE /api/board/posts/[id]/comments/[commentId] allows creator and forbids intruder', async () => {
      const post = await memoryRepo.createPost({
        title: 'Post with comment',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash1,
      });

      const comment = await memoryRepo.createComment({
        postId: post.id,
        content: '댓글 내용',
        authorTitle: '동탄 예비입주민',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(authorToken2),
      });

      // Intruder attempt -> 403
      const reqIntruder = new NextRequest(
        `http://localhost/api/board/posts/${post.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken1 }, // Post author, not comment author
        }
      );
      const resForbidden = await deleteCommentRoute(reqIntruder, {
        params: Promise.resolve({ id: post.id, commentId: comment.id }),
      });
      expect(resForbidden.status).toBe(403);

      // Comment author attempt -> 200
      const reqAuthor = new NextRequest(
        `http://localhost/api/board/posts/${post.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken2 },
        }
      );
      const resSuccess = await deleteCommentRoute(reqAuthor, {
        params: Promise.resolve({ id: post.id, commentId: comment.id }),
      });
      expect(resSuccess.status).toBe(200);

      const updatedPost = await memoryRepo.getPostById(post.id);
      expect(updatedPost?.commentCount).toBe(0);
    });

    it('POST /api/board/posts/[id]/like toggles recommendation on and off', async () => {
      const post = await memoryRepo.createPost({
        title: 'Post to be liked',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash1,
      });

      // 1st like
      const reqLike1 = new NextRequest(`http://localhost/api/board/posts/${post.id}/like`, {
        method: 'POST',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken2 },
      });
      const res1 = await toggleLikeRoute(reqLike1, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.data.liked).toBe(true);
      expect(data1.data.likeCount).toBe(1);

      // 2nd like (unlike)
      const reqLike2 = new NextRequest(`http://localhost/api/board/posts/${post.id}/like`, {
        method: 'POST',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken2 },
      });
      const res2 = await toggleLikeRoute(reqLike2, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.data.liked).toBe(false);
      expect(data2.data.likeCount).toBe(0);
    });
  });
});

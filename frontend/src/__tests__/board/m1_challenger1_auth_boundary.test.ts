import { NextRequest } from 'next/server';
import crypto from 'crypto';
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
  MemoryBoardRepository,
  setBoardRepository,
} from '@/lib/board/boardRepository';
import { GET as getPostsRoute, POST as createPostRoute } from '@/app/api/board/posts/route';
import { GET as getPostDetailRoute, DELETE as deletePostRoute } from '@/app/api/board/posts/[id]/route';
import { POST as createCommentRoute } from '@/app/api/board/posts/[id]/comments/route';
import { DELETE as deleteCommentRoute } from '@/app/api/board/posts/[id]/comments/[commentId]/route';
import { POST as toggleLikeRoute } from '@/app/api/board/posts/[id]/like/route';

describe('Milestone 1 Adversarial Challenge: Authorization & Boundary Stress Suite', () => {
  let memoryRepo: MemoryBoardRepository;

  beforeEach(() => {
    memoryRepo = new MemoryBoardRepository();
    setBoardRepository(memoryRepo);
  });

  afterEach(() => {
    setBoardRepository(null);
  });

  // =========================================================================
  // Challenge 1: Authorization Bypass Attempts & Token Forgery
  // =========================================================================
  describe('Challenge 1: Authorization Bypass & Token Forgery Attempts', () => {
    it('rejects raw SHA-256 hash spoofing attack on DELETE /api/board/posts/[id]', async () => {
      const legitToken = generateAuthorToken();
      const legitHash = hashAuthorToken(legitToken);

      const post = await memoryRepo.createPost({
        title: 'Target Post for Hash Spoofing',
        content: 'Attacker tries to supply the stored SHA-256 hash directly as author token.',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: legitHash,
      });

      // Attacker attempts to pass the raw hash as the token
      const reqSpoof = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        method: 'DELETE',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: legitHash },
      });

      const res = await deletePostRoute(reqSpoof, {
        params: Promise.resolve({ id: post.id }),
      });

      // The server must hash the incoming string again: SHA-256(legitHash) != legitHash
      // Therefore, the server MUST reject with 403 FORBIDDEN
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('FORBIDDEN');

      // Verify post still exists in DB
      const postStillAlive = await memoryRepo.getPostById(post.id);
      expect(postStillAlive).not.toBeNull();
      expect(postStillAlive?.isDeleted).toBe(false);
    });

    it('enforces header precedence over cookie to prevent cookie-stealing spoofing', async () => {
      const legitAuthorToken = generateAuthorToken();
      const intruderToken = generateAuthorToken();

      const post = await memoryRepo.createPost({
        title: 'Header Precedence Test Post',
        content: 'Post content to test conflicting headers and cookies.',
        authorTitle: '동탄역 린스트라우스',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(legitAuthorToken),
      });

      // Attacker has their own invalid token in header, but victim's token in cookie
      const req = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          [AUTHOR_TOKEN_HEADER_NAME]: intruderToken,
          cookie: `${AUTHOR_TOKEN_COOKIE_NAME}=${legitAuthorToken}`,
        },
      });

      // Since header takes precedence, extractor resolves to intruderToken, rejecting deletion
      const res = await deletePostRoute(req, {
        params: Promise.resolve({ id: post.id }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('FORBIDDEN');
    });

    it('guarantees zero information disclosure: authorTokenHash is never leaked in any DTO', async () => {
      const authorToken = generateAuthorToken();
      const authorHash = hashAuthorToken(authorToken);

      // 1. Check POST /api/board/posts response
      const postReq = new NextRequest('http://localhost/api/board/posts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
        },
        body: JSON.stringify({
          title: 'Information Leakage Probe Post',
          content: 'Verifying no hash leakage across any DTO payloads.',
          authorTitle: '동탄 예비입주민',
          isGpsVerified: false,
        }),
      });
      const postRes = await createPostRoute(postReq);
      const postJson = await postRes.json();
      expect(postJson.data.authorTokenHash).toBeUndefined();
      expect(JSON.stringify(postJson)).not.toContain(authorHash);

      const createdPostId = postJson.data.id;

      // 2. Check GET /api/board/posts list response
      const listReq = new NextRequest('http://localhost/api/board/posts');
      const listRes = await getPostsRoute(listReq);
      const listJson = await listRes.json();
      expect(listJson.data.posts[0].authorTokenHash).toBeUndefined();
      expect(JSON.stringify(listJson)).not.toContain(authorHash);

      // 3. Create a comment
      const commentReq = new NextRequest(
        `http://localhost/api/board/posts/${createdPostId}/comments`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [AUTHOR_TOKEN_HEADER_NAME]: authorToken,
          },
          body: JSON.stringify({
            content: 'Test comment to probe comment DTO leakage',
            authorTitle: '동탄 예비입주민',
          }),
        }
      );
      const commentRes = await createCommentRoute(commentReq, {
        params: Promise.resolve({ id: createdPostId }),
      });
      const commentJson = await commentRes.json();
      expect(commentJson.data.authorTokenHash).toBeUndefined();
      expect(JSON.stringify(commentJson)).not.toContain(authorHash);

      // 4. Check GET /api/board/posts/[id] detail response
      const detailReq = new NextRequest(
        `http://localhost/api/board/posts/${createdPostId}`
      );
      const detailRes = await getPostDetailRoute(detailReq, {
        params: Promise.resolve({ id: createdPostId }),
      });
      const detailJson = await detailRes.json();
      expect(detailJson.data.post.authorTokenHash).toBeUndefined();
      expect(detailJson.data.comments[0].authorTokenHash).toBeUndefined();
      expect(JSON.stringify(detailJson)).not.toContain(authorHash);
    });

    it('rejects tampered single-bit and case-altered token variants', async () => {
      const originalToken = generateAuthorToken();
      const originalHash = hashAuthorToken(originalToken);

      const post = await memoryRepo.createPost({
        title: 'Tampered Token Probe',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: originalHash,
      });

      // Bit flip / character replacement
      const tamperedToken =
        originalToken.slice(0, -1) + (originalToken.endsWith('a') ? 'b' : 'a');

      const reqTampered = new NextRequest(
        `http://localhost/api/board/posts/${post.id}`,
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: tamperedToken },
        }
      );
      const resTampered = await deletePostRoute(reqTampered, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(resTampered.status).toBe(403);

      // Upper-cased hex token: SHA-256 is strictly byte-based, so upper case produces completely different hash
      const upperToken = originalToken.toUpperCase();
      const reqUpper = new NextRequest(
        `http://localhost/api/board/posts/${post.id}`,
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: upperToken },
        }
      );
      const resUpper = await deletePostRoute(reqUpper, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(resUpper.status).toBe(403);
    });
  });

  // =========================================================================
  // Challenge 2: Deletion Boundary & Ownership Isolation Tests
  // =========================================================================
  describe('Challenge 2: Deletion Boundary & Ownership Isolation', () => {
    it('strictly forbids User B from deleting User A post, returning 403', async () => {
      const userAToken = generateAuthorToken();
      const userBToken = generateAuthorToken();

      const postA = await memoryRepo.createPost({
        title: 'User A Private Post',
        content: 'Should not be deletable by User B under any circumstances.',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: true,
        authorTokenHash: hashAuthorToken(userAToken),
      });

      const req = new NextRequest(`http://localhost/api/board/posts/${postA.id}`, {
        method: 'DELETE',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: userBToken },
      });

      const res = await deletePostRoute(req, {
        params: Promise.resolve({ id: postA.id }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('FORBIDDEN');
      expect(body.message).toContain('본인이 작성한');

      // Re-query to guarantee no silent deletion
      const activePost = await memoryRepo.getPostById(postA.id);
      expect(activePost).not.toBeNull();
      expect(activePost?.id).toBe(postA.id);
    });

    it('strictly forbids User C (third party) from deleting User B comment on User A post', async () => {
      const userAToken = generateAuthorToken();
      const userBToken = generateAuthorToken();
      const userCToken = generateAuthorToken();

      const post = await memoryRepo.createPost({
        title: 'User A Post',
        content: 'Discussion post',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(userAToken),
      });

      const comment = await memoryRepo.createComment({
        postId: post.id,
        content: 'User B Comment',
        authorTitle: '동탄역 린스트라우스',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(userBToken),
      });

      // User C attempts deletion
      const req = new NextRequest(
        `http://localhost/api/board/posts/${post.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: userCToken },
        }
      );

      const res = await deleteCommentRoute(req, {
        params: Promise.resolve({ id: post.id, commentId: comment.id }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('FORBIDDEN');

      // Verify comment remains
      const comments = await memoryRepo.getComments(post.id);
      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe(comment.id);
    });

    it('strictly forbids Post Author (User A) from deleting another user comment (User B)', async () => {
      const userAToken = generateAuthorToken();
      const userBToken = generateAuthorToken();

      const post = await memoryRepo.createPost({
        title: 'Post by User A',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(userAToken),
      });

      const comment = await memoryRepo.createComment({
        postId: post.id,
        content: 'Comment by User B',
        authorTitle: '동탄 예비입주민',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(userBToken),
      });

      // User A (post author) tries to delete User B's comment
      const req = new NextRequest(
        `http://localhost/api/board/posts/${post.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: userAToken }, // Post author, not comment author
        }
      );

      const res = await deleteCommentRoute(req, {
        params: Promise.resolve({ id: post.id, commentId: comment.id }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('FORBIDDEN');

      // Check commentCount is untouched
      const postAfter = await memoryRepo.getPostById(post.id);
      expect(postAfter?.commentCount).toBe(1);
    });

    it('returns 404 when attempting to delete non-existent post or comment', async () => {
      const validToken = generateAuthorToken();

      // Ghost post deletion
      const reqPost = new NextRequest(
        'http://localhost/api/board/posts/ghost-post-id-999',
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: validToken },
        }
      );
      const resPost = await deletePostRoute(reqPost, {
        params: Promise.resolve({ id: 'ghost-post-id-999' }),
      });
      expect(resPost.status).toBe(404);
      const bodyPost = await resPost.json();
      expect(bodyPost.code).toBe('POST_NOT_FOUND');

      // Create a valid post
      const post = await memoryRepo.createPost({
        title: 'Existing Post',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(validToken),
      });

      // Ghost comment deletion on valid post
      const reqComment = new NextRequest(
        `http://localhost/api/board/posts/${post.id}/comments/ghost-comment-888`,
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: validToken },
        }
      );
      const resComment = await deleteCommentRoute(reqComment, {
        params: Promise.resolve({
          id: post.id,
          commentId: 'ghost-comment-888',
        }),
      });
      expect(resComment.status).toBe(404);
      const bodyComment = await resComment.json();
      expect(bodyComment.code).toBe('COMMENT_NOT_FOUND');
    });

    it('returns 404 when attempting to delete comment on wrong postId route', async () => {
      const validToken = generateAuthorToken();
      const validHash = hashAuthorToken(validToken);

      const post1 = await memoryRepo.createPost({
        title: 'Post 1',
        content: 'Content 1',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: validHash,
      });

      const post2 = await memoryRepo.createPost({
        title: 'Post 2',
        content: 'Content 2',
        authorTitle: '동탄역 린스트라우스',
        isGpsVerified: false,
        authorTokenHash: validHash,
      });

      const comment1 = await memoryRepo.createComment({
        postId: post1.id,
        content: 'Comment on Post 1',
        authorTitle: '동탄 예비입주민',
        isGpsVerified: false,
        authorTokenHash: validHash,
      });

      // Attempt to delete comment1 under post2 URL path
      const reqMismatched = new NextRequest(
        `http://localhost/api/board/posts/${post2.id}/comments/${comment1.id}`,
        {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: validToken },
        }
      );
      const resMismatched = await deleteCommentRoute(reqMismatched, {
        params: Promise.resolve({
          id: post2.id,
          commentId: comment1.id,
        }),
      });
      expect(resMismatched.status).toBe(404);
      const body = await resMismatched.json();
      expect(body.code).toBe('COMMENT_NOT_FOUND');
    });

    it('enforces double-deletion idempotency (second delete returns 404)', async () => {
      const authorToken = generateAuthorToken();
      const authorHash = hashAuthorToken(authorToken);

      const post = await memoryRepo.createPost({
        title: 'Double Delete Test Post',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorHash,
      });

      // 1st deletion -> 200 OK
      const req1 = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        method: 'DELETE',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken },
      });
      const res1 = await deletePostRoute(req1, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(res1.status).toBe(200);

      // 2nd deletion -> 404 POST_NOT_FOUND (since already isDeleted: true)
      const req2 = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
        method: 'DELETE',
        headers: { [AUTHOR_TOKEN_HEADER_NAME]: authorToken },
      });
      const res2 = await deletePostRoute(req2, {
        params: Promise.resolve({ id: post.id }),
      });
      expect(res2.status).toBe(404);
      const body2 = await res2.json();
      expect(body2.code).toBe('POST_NOT_FOUND');
    });
  });

  // =========================================================================
  // Challenge 3: Malformed, Empty, and Null Token Handling
  // =========================================================================
  describe('Challenge 3: Malformed, Empty, and Null Tokens', () => {
    it('returns 401 UNAUTHORIZED when no token is provided for DELETE post', async () => {
      const legitToken = generateAuthorToken();
      const post = await memoryRepo.createPost({
        title: 'No Token Probe Post',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(legitToken),
      });

      const reqNoToken = new NextRequest(
        `http://localhost/api/board/posts/${post.id}`,
        { method: 'DELETE' }
      );
      const res = await deletePostRoute(reqNoToken, {
        params: Promise.resolve({ id: post.id }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 UNAUTHORIZED for empty or whitespace-only headers on DELETE post', async () => {
      const legitToken = generateAuthorToken();
      const post = await memoryRepo.createPost({
        title: 'Whitespace Token Post',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(legitToken),
      });

      // Valid HTTP whitespace strings
      const whitespaces = ['', '   ', '\t', '     \t '];
      for (const ws of whitespaces) {
        const req = new NextRequest(`http://localhost/api/board/posts/${post.id}`, {
          method: 'DELETE',
          headers: { [AUTHOR_TOKEN_HEADER_NAME]: ws },
        });
        const res = await deletePostRoute(req, {
          params: Promise.resolve({ id: post.id }),
        });
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.code).toBe('UNAUTHORIZED');
      }
    });

    it('returns 401 UNAUTHORIZED for empty or whitespace-only cookie on DELETE comment', async () => {
      const legitToken = generateAuthorToken();
      const post = await memoryRepo.createPost({
        title: 'Comment Delete Auth Post',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(legitToken),
      });
      const comment = await memoryRepo.createComment({
        postId: post.id,
        content: 'Comment to test',
        authorTitle: '동탄 예비입주민',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(legitToken),
      });

      const reqWsCookie = new NextRequest(
        `http://localhost/api/board/posts/${post.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { cookie: `${AUTHOR_TOKEN_COOKIE_NAME}=   ` },
        }
      );
      const res = await deleteCommentRoute(reqWsCookie, {
        params: Promise.resolve({ id: post.id, commentId: comment.id }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('safely handles injection payloads in token without crashes, resulting in 403', async () => {
      const legitToken = generateAuthorToken();
      const post = await memoryRepo.createPost({
        title: 'Injection Probe Post',
        content: 'Content',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hashAuthorToken(legitToken),
      });

      // Valid HTTP string injection payloads
      const injectionPayloads = [
        "'; DROP TABLE board_posts; --",
        '{"$gt": ""}',
        '../../../../etc/passwd',
        '<script>alert("xss")</script>',
        'OR 1=1',
      ];

      for (const payload of injectionPayloads) {
        const req = new NextRequest(
          `http://localhost/api/board/posts/${post.id}`,
          {
            method: 'DELETE',
            headers: { [AUTHOR_TOKEN_HEADER_NAME]: payload },
          }
        );
        const res = await deletePostRoute(req, {
          params: Promise.resolve({ id: post.id }),
        });
        expect(res.status).toBe(403);
      }
    });

    it('hashAuthorToken throws on non-string, null, or empty string arguments', () => {
      expect(() => hashAuthorToken('')).toThrow(
        'Valid author token string is required for hashing'
      );
      expect(() => hashAuthorToken(null as unknown as string)).toThrow();
      expect(() => hashAuthorToken(undefined as unknown as string)).toThrow();
      expect(() => hashAuthorToken(12345 as unknown as string)).toThrow();
      expect(() => hashAuthorToken({} as unknown as string)).toThrow();
      expect(() => hashAuthorToken([] as unknown as string)).toThrow();
    });

    it('extractAuthorToken returns null for empty, whitespace, or malformed body fallback', () => {
      const emptyReq = new NextRequest('http://localhost/api/board/posts');
      expect(extractAuthorToken(emptyReq, '')).toBeNull();
      expect(extractAuthorToken(emptyReq, '   ')).toBeNull();
      expect(extractAuthorToken(emptyReq, null)).toBeNull();
      expect(extractAuthorToken(emptyReq, undefined)).toBeNull();
    });

    it('canDelete helper strictly rejects null, undefined, or empty hashes', () => {
      const validHash = hashAuthorToken('token-1');
      expect(canDelete(undefined, { authorTokenHash: validHash })).toBe(false);
      expect(canDelete(null, { authorTokenHash: validHash })).toBe(false);
      expect(canDelete('', { authorTokenHash: validHash })).toBe(false);
      expect(canDelete(validHash, undefined)).toBe(false);
      expect(canDelete(validHash, null)).toBe(false);
      expect(canDelete(validHash, { authorTokenHash: '' })).toBe(false);
      expect(canDelete('   ', { authorTokenHash: validHash })).toBe(false);
    });
  });

  // =========================================================================
  // Challenge 4: Negative and Boundary Pagination Clamping & Validation
  // =========================================================================
  describe('Challenge 4: Negative & Boundary Pagination Clamping & Validation', () => {
    it('MemoryBoardRepository directly clamps negative, zero, and excess pagination parameters', async () => {
      const token = generateAuthorToken();
      const hash = hashAuthorToken(token);

      // Seed repository with 10 posts with monotonic timestamps
      for (let i = 1; i <= 10; i++) {
        await memoryRepo.createPost({
          title: `Post ${i}`,
          content: `Content of post ${i}`,
          authorTitle: '동탄역 롯데캐슬',
          isGpsVerified: false,
          authorTokenHash: hash,
        });
        await new Promise((r) => setTimeout(r, 2));
      }

      // Negative page: clamped to 1
      const resNegPage = await memoryRepo.getPosts({ page: -5, limit: 5 });
      expect(resNegPage.posts).toHaveLength(5);
      expect(resNegPage.total).toBe(10);
      expect(resNegPage.posts[0].title).toBe('Post 10'); // latest first

      // Zero page: clamped to 1 via Math.max(1, 0 || 1)
      const resZeroPage = await memoryRepo.getPosts({ page: 0, limit: 5 });
      expect(resZeroPage.posts).toHaveLength(5);
      expect(resZeroPage.posts[0].title).toBe('Post 10');

      // Zero limit: options?.limit || 20 safely defaults to 20 without crash or negative slice
      const resZeroLimit = await memoryRepo.getPosts({ page: 1, limit: 0 });
      expect(resZeroLimit.posts).toHaveLength(10); // All 10 posts returned safely (within default 20)

      // Negative limit: Math.max(1, -99) clamps safely to 1
      const resNegLimit = await memoryRepo.getPosts({ page: 1, limit: -99 });
      expect(resNegLimit.posts).toHaveLength(1);

      // Massive limit 1000: clamped to maximum 50 via Math.min(50, 1000)
      const resExcessLimit = await memoryRepo.getPosts({ page: 1, limit: 1000 });
      expect(resExcessLimit.posts).toHaveLength(10); // All 10 posts, clamped to 50 max

      // Out of range page (page 999 with 10 items): returns empty list safely without throwing
      const resFarPage = await memoryRepo.getPosts({ page: 999, limit: 10 });
      expect(resFarPage.posts).toEqual([]);
      expect(resFarPage.total).toBe(10);
    });

    it('GET /api/board/posts rejects negative and zero pagination parameters with 400 Bad Request', async () => {
      // page = -1
      const reqNegPage = new NextRequest('http://localhost/api/board/posts?page=-1');
      const resNegPage = await getPostsRoute(reqNegPage);
      expect(resNegPage.status).toBe(400);
      const dataNegPage = await resNegPage.json();
      expect(dataNegPage.success).toBe(false);
      expect(dataNegPage.code).toBe('INVALID_QUERY_PARAMS');

      // page = 0
      const reqZeroPage = new NextRequest('http://localhost/api/board/posts?page=0');
      const resZeroPage = await getPostsRoute(reqZeroPage);
      expect(resZeroPage.status).toBe(400);

      // limit = 0
      const reqZeroLimit = new NextRequest('http://localhost/api/board/posts?limit=0');
      const resZeroLimit = await getPostsRoute(reqZeroLimit);
      expect(resZeroLimit.status).toBe(400);

      // limit = -10
      const reqNegLimit = new NextRequest('http://localhost/api/board/posts?limit=-10');
      const resNegLimit = await getPostsRoute(reqNegLimit);
      expect(resNegLimit.status).toBe(400);

      // limit = 1000 (exceeds max 50)
      const reqExcessLimit = new NextRequest('http://localhost/api/board/posts?limit=1000');
      const resExcessLimit = await getPostsRoute(reqExcessLimit);
      expect(resExcessLimit.status).toBe(400);
      const dataExcessLimit = await resExcessLimit.json();
      expect(dataExcessLimit.code).toBe('INVALID_QUERY_PARAMS');

      // page = "invalid_string"
      const reqInvalidPage = new NextRequest('http://localhost/api/board/posts?page=invalid');
      const resInvalidPage = await getPostsRoute(reqInvalidPage);
      expect(resInvalidPage.status).toBe(400);

      // sort = "unsupported_hacked"
      const reqInvalidSort = new NextRequest('http://localhost/api/board/posts?sort=unsupported_hacked');
      const resInvalidSort = await getPostsRoute(reqInvalidSort);
      expect(resInvalidSort.status).toBe(400);
    });

    it('GET /api/board/posts correctly handles valid boundary parameters (limit=50, limit=1, page=9999)', async () => {
      const token = generateAuthorToken();
      const hash = hashAuthorToken(token);

      // Seed 2 posts
      await memoryRepo.createPost({
        title: 'Post 1',
        content: 'Content 1',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: hash,
      });
      await memoryRepo.createPost({
        title: 'Post 2',
        content: 'Content 2',
        authorTitle: '동탄역 린스트라우스',
        isGpsVerified: false,
        authorTokenHash: hash,
      });

      // Boundary: maximum limit 50
      const reqMax = new NextRequest('http://localhost/api/board/posts?page=1&limit=50');
      const resMax = await getPostsRoute(reqMax);
      expect(resMax.status).toBe(200);
      const dataMax = await resMax.json();
      expect(dataMax.success).toBe(true);
      expect(dataMax.data.limit).toBe(50);
      expect(dataMax.data.posts).toHaveLength(2);

      // Boundary: minimum limit 1
      const reqMin = new NextRequest('http://localhost/api/board/posts?page=1&limit=1');
      const resMin = await getPostsRoute(reqMin);
      expect(resMin.status).toBe(200);
      const dataMin = await resMin.json();
      expect(dataMin.success).toBe(true);
      expect(dataMin.data.limit).toBe(1);
      expect(dataMin.data.posts).toHaveLength(1);

      // Boundary: page far beyond available data
      const reqFar = new NextRequest('http://localhost/api/board/posts?page=9999&limit=10');
      const resFar = await getPostsRoute(reqFar);
      expect(resFar.status).toBe(200);
      const dataFar = await resFar.json();
      expect(dataFar.data.posts).toHaveLength(0);
      expect(dataFar.data.total).toBe(2);
      expect(dataFar.data.page).toBe(9999);
    });

    it('prevents like count from ever dropping below zero under consecutive unlike calls', async () => {
      const authorA = hashAuthorToken('user-a');
      const authorB = hashAuthorToken('user-b');

      const post = await memoryRepo.createPost({
        title: 'Underflow Resistance Test',
        content: 'Testing like count lower boundary',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: false,
        authorTokenHash: authorA,
      });

      expect(post.likeCount).toBe(0);

      // User B likes (+1 -> 1)
      const resLike = await memoryRepo.toggleLike(post.id, authorB);
      expect(resLike.liked).toBe(true);
      expect(resLike.likeCount).toBe(1);

      // User B unlikes (-1 -> 0)
      const resUnlike = await memoryRepo.toggleLike(post.id, authorB);
      expect(resUnlike.liked).toBe(false);
      expect(resUnlike.likeCount).toBe(0);

      // User A (who never liked) toggles like (+1 -> 1)
      const resA1 = await memoryRepo.toggleLike(post.id, authorA);
      expect(resA1.liked).toBe(true);
      expect(resA1.likeCount).toBe(1);

      // User A unlikes (-1 -> 0)
      const resA2 = await memoryRepo.toggleLike(post.id, authorA);
      expect(resA2.liked).toBe(false);
      expect(resA2.likeCount).toBe(0);

      // Check final post in repo
      const finalPost = await memoryRepo.getPostById(post.id);
      expect(finalPost?.likeCount).toBe(0);
    });
  });
});

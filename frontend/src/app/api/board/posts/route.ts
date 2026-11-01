import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getBoardRepository } from '@/lib/board/boardRepository';
import {
  extractAuthorToken,
  getOrCreateAuthorToken,
  hashAuthorToken,
  AUTHOR_TOKEN_COOKIE_NAME,
} from '@/lib/board/boardAuth';
import {
  PostCreateSchema,
  PostQuerySchema,
  BoardPostDto,
} from '@/types/board';
import {
  getAllSelectableTitles,
  getComplexData,
  checkTitleLock,
  TITLE_LOCK_DURATION_MS,
} from '@/lib/board/boardEngine';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_posts_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return (
        rateLimit.response ||
        apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429)
      );
    }

    const { searchParams } = request.nextUrl;
    const queryParsed = PostQuerySchema.safeParse({
      sort: searchParams.get('sort') || 'latest',
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    if (!queryParsed.success) {
      return apiError(
        'INVALID_QUERY_PARAMS',
        '유효하지 않은 정렬 또는 페이지 매개변수입니다.',
        400,
        queryParsed.error.issues
      );
    }

    const { sort, page, limit } = queryParsed.data;

    // Caller token identification
    const callerToken = extractAuthorToken(request);
    const callerHash = callerToken ? hashAuthorToken(callerToken) : null;

    const repo = getBoardRepository();
    const { posts, total } = await repo.getPosts({ sort, page, limit });

    // Sanitize posts: exclude internal authorTokenHash and inject canDelete / isMine
    const sanitizedPosts: BoardPostDto[] = posts.map((p) => {
      const isMine = Boolean(callerHash && p.authorTokenHash === callerHash);
      return {
        id: p.id,
        title: p.title,
        content: p.content,
        authorTitle: p.authorTitle,
        authorDong: p.authorDong,
        isGpsVerified: p.isGpsVerified,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        viewCount: p.viewCount,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        canDelete: isMine,
        isMine,
      };
    });

    return apiSuccess({
      posts: sanitizedPosts,
      total,
      page,
      limit,
      sort,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardPostsAPI.GET', 'Error fetching board posts', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '게시글 목록을 불러오는 중 오류가 발생했습니다.',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_posts_post',
      requestsPerLimit: 15,
      window: '1 m',
    });
    if (!rateLimit.success) {
      return (
        rateLimit.response ||
        apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429)
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiError('MALFORMED_JSON', 'Malformed JSON body payload', 400);
    }

    const parsed = PostCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'INVALID_PARAMETERS',
        '게시글 입력 양식이 올바르지 않습니다.',
        400,
        parsed.error.issues
      );
    }

    const { token, isNew } = getOrCreateAuthorToken(
      request,
      typeof body.authorToken === 'string' ? body.authorToken : null
    );
    const authorTokenHash = hashAuthorToken(token);

    const repo = getBoardRepository();
    const existingProfile = await repo.getAuthorProfile(authorTokenHash);
    const now = Date.now();

    // 0. Validate title belongs to 184 selectable titles
    const allTitles = getAllSelectableTitles();
    if (!allTitles.includes(parsed.data.authorTitle)) {
      return apiError(
        'INVALID_TITLE',
        '유효하지 않은 단지명입니다.',
        400
      );
    }

    // 1. Enforce 30-day title lock
    if (existingProfile) {
      const lockCheck = checkTitleLock(existingProfile, parsed.data.authorTitle, now);
      if (!lockCheck.allowed) {
        return apiError(
          'TITLE_LOCKED_30_DAYS',
          '30일 타이틀 고정 기간 중에는 다른 단지명으로 작성할 수 없습니다.',
          400,
          { daysRemaining: lockCheck.daysRemaining }
        );
      }
    }

    // 2. Re-establish 30-day lock if profile does not exist OR has expired
    let currentProfile = existingProfile;
    if (!existingProfile || !existingProfile.titleExpiresAt || now >= existingProfile.titleExpiresAt) {
      const complexData = getComplexData(parsed.data.authorTitle);
      const isSameTitle = existingProfile?.selectedTitle === parsed.data.authorTitle;
      const isGpsVerified = isSameTitle ? Boolean(existingProfile?.isGpsVerified) : false;
      const gpsVerifiedComplex = isSameTitle ? existingProfile?.gpsVerifiedComplex : undefined;
      const gpsVerifiedAt = isSameTitle ? existingProfile?.gpsVerifiedAt : undefined;

      currentProfile = {
        authorTokenHash,
        selectedTitle: parsed.data.authorTitle,
        dong: complexData?.dong || parsed.data.authorDong || existingProfile?.dong,
        titleSetAt: now,
        titleExpiresAt: now + TITLE_LOCK_DURATION_MS,
        isGpsVerified,
        gpsVerifiedComplex,
        gpsVerifiedAt,
      };
      await repo.saveAuthorProfile(currentProfile);
    }

    // 3. Enforce verified badge integrity against author's profile in repository
    const isActuallyVerified = Boolean(
      currentProfile &&
      currentProfile.isGpsVerified &&
      currentProfile.gpsVerifiedComplex === parsed.data.authorTitle
    );

    const complexData = getComplexData(parsed.data.authorTitle);
    const resolvedDong = parsed.data.authorDong || complexData?.dong || currentProfile?.dong;

    const created = await repo.createPost({
      title: parsed.data.title,
      content: parsed.data.content,
      authorTitle: parsed.data.authorTitle,
      authorDong: resolvedDong,
      isGpsVerified: isActuallyVerified,
      authorTokenHash,
    });

    const postDto: BoardPostDto = {
      id: created.id,
      title: created.title,
      content: created.content,
      authorTitle: created.authorTitle,
      authorDong: created.authorDong,
      isGpsVerified: created.isGpsVerified,
      likeCount: created.likeCount,
      commentCount: created.commentCount,
      viewCount: created.viewCount,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      canDelete: true,
      isMine: true,
      isLiked: false,
    };

    const response = apiSuccess(
      postDto,
      { authorToken: token },
      { status: 201 }
    );

    // Set cookie for browser session persistence
    response.cookies.set(AUTHOR_TOKEN_COOKIE_NAME, token, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardPostsAPI.POST', 'Error creating board post', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '게시글을 작성하는 중 오류가 발생했습니다.',
      500
    );
  }
}

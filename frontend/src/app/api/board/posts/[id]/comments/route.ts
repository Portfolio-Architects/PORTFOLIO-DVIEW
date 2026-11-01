import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getBoardRepository } from '@/lib/board/boardRepository';
import {
  getOrCreateAuthorToken,
  hashAuthorToken,
  AUTHOR_TOKEN_COOKIE_NAME,
} from '@/lib/board/boardAuth';
import { CommentCreateSchema, BoardCommentDto } from '@/types/board';
import {
  getAllSelectableTitles,
  getComplexData,
  checkTitleLock,
  TITLE_LOCK_DURATION_MS,
} from '@/lib/board/boardEngine';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_comments_post',
      requestsPerLimit: 20,
      window: '1 m',
    });
    if (!rateLimit.success) {
      return (
        rateLimit.response ||
        apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429)
      );
    }

    const resolvedParams = await Promise.resolve(context.params);
    const { id: postId } = resolvedParams;

    const repo = getBoardRepository();
    const post = await repo.getPostById(postId);
    if (!post) {
      return apiError(
        'POST_NOT_FOUND',
        '댓글을 작성할 게시글을 찾을 수 없습니다.',
        404
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiError('MALFORMED_JSON', 'Malformed JSON body payload', 400);
    }

    const parsed = CommentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'INVALID_PARAMETERS',
        '댓글 입력 양식이 올바르지 않습니다.',
        400,
        parsed.error.issues
      );
    }

    const { token, isNew } = getOrCreateAuthorToken(
      request,
      typeof body.authorToken === 'string' ? body.authorToken : null
    );
    const authorTokenHash = hashAuthorToken(token);

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
          '30일 타이틀 고정 기간 중에는 다른 단지명으로 댓글을 작성할 수 없습니다.',
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

    const created = await repo.createComment({
      postId,
      content: parsed.data.content,
      authorTitle: parsed.data.authorTitle,
      authorDong: resolvedDong,
      isGpsVerified: isActuallyVerified,
      authorTokenHash,
    });

    const commentDto: BoardCommentDto = {
      id: created.id,
      postId: created.postId,
      content: created.content,
      authorTitle: created.authorTitle,
      authorDong: created.authorDong,
      isGpsVerified: created.isGpsVerified,
      createdAt: created.createdAt,
      canDelete: true,
      isMine: true,
    };

    const response = apiSuccess(
      commentDto,
      { authorToken: token },
      { status: 201 }
    );

    response.cookies.set(AUTHOR_TOKEN_COOKIE_NAME, token, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardCommentsAPI.POST', 'Error creating comment', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '댓글을 작성하는 중 오류가 발생했습니다.',
      500
    );
  }
}

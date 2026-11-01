import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getBoardRepository } from '@/lib/board/boardRepository';
import {
  getOrCreateAuthorToken,
  hashAuthorToken,
  AUTHOR_TOKEN_COOKIE_NAME,
} from '@/lib/board/boardAuth';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_like_post',
      requestsPerLimit: 60,
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
        '추천할 게시글을 찾을 수 없습니다.',
        404
      );
    }

    const { token, isNew } = getOrCreateAuthorToken(request);
    const authorTokenHash = hashAuthorToken(token);

    const result = await repo.toggleLike(postId, authorTokenHash);

    const response = apiSuccess(result, { authorToken: token });

    response.cookies.set(AUTHOR_TOKEN_COOKIE_NAME, token, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardLikeAPI.POST', 'Error toggling like', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '추천 처리 중 오류가 발생했습니다.',
      500
    );
  }
}

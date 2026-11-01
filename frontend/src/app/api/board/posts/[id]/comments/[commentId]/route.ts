import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getBoardRepository } from '@/lib/board/boardRepository';
import {
  extractAuthorToken,
  hashAuthorToken,
} from '@/lib/board/boardAuth';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params:
    | Promise<{ id: string; commentId: string }>
    | { id: string; commentId: string };
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_comment_delete',
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
    const { id: postId, commentId } = resolvedParams;

    const callerToken = extractAuthorToken(request);
    if (!callerToken) {
      return apiError(
        'UNAUTHORIZED',
        '댓글 삭제를 위한 작성자 인증 토큰이 존재하지 않습니다.',
        401
      );
    }

    const callerHash = hashAuthorToken(callerToken);
    const repo = getBoardRepository();

    const comments = await repo.getComments(postId);
    const targetComment = comments.find((c) => c.id === commentId);

    if (!targetComment) {
      return apiError(
        'COMMENT_NOT_FOUND',
        '삭제할 댓글을 찾을 수 없습니다.',
        404
      );
    }

    if (targetComment.authorTokenHash !== callerHash) {
      return apiError(
        'FORBIDDEN',
        '본인이 작성한 댓글만 삭제할 수 있습니다.',
        403
      );
    }

    const deleted = await repo.deleteComment(postId, commentId, callerHash);
    if (!deleted) {
      return apiError(
        'DELETE_FAILED',
        '댓글 삭제 처리에 실패했습니다.',
        500
      );
    }

    return apiSuccess({
      deleted: true,
      commentId,
      postId,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardCommentDeleteAPI.DELETE', 'Error deleting comment', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '댓글을 삭제하는 중 오류가 발생했습니다.',
      500
    );
  }
}

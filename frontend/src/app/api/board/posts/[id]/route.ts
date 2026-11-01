import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getBoardRepository } from '@/lib/board/boardRepository';
import {
  extractAuthorToken,
  hashAuthorToken,
} from '@/lib/board/boardAuth';
import { BoardPostDto, BoardCommentDto } from '@/types/board';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_post_detail_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return (
        rateLimit.response ||
        apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429)
      );
    }

    const resolvedParams = await Promise.resolve(context.params);
    const { id } = resolvedParams;

    const repo = getBoardRepository();
    const post = await repo.getPostById(id);

    if (!post) {
      return apiError(
        'POST_NOT_FOUND',
        '요청하신 게시글을 찾을 수 없습니다.',
        404
      );
    }

    const callerToken = extractAuthorToken(request);
    const callerHash = callerToken ? hashAuthorToken(callerToken) : null;

    const isMine = Boolean(callerHash && post.authorTokenHash === callerHash);
    const isLiked = callerHash
      ? await repo.isLiked(id, callerHash)
      : false;

    const comments = await repo.getComments(id);
    const sanitizedComments: BoardCommentDto[] = comments.map((c) => {
      const commentIsMine = Boolean(
        callerHash && c.authorTokenHash === callerHash
      );
      return {
        id: c.id,
        postId: c.postId,
        content: c.content,
        authorTitle: c.authorTitle,
        authorDong: c.authorDong,
        isGpsVerified: c.isGpsVerified,
        createdAt: c.createdAt,
        canDelete: commentIsMine,
        isMine: commentIsMine,
      };
    });

    const postDto: BoardPostDto = {
      id: post.id,
      title: post.title,
      content: post.content,
      authorTitle: post.authorTitle,
      authorDong: post.authorDong,
      isGpsVerified: post.isGpsVerified,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      canDelete: isMine,
      isMine,
      isLiked,
    };

    return apiSuccess({
      post: postDto,
      comments: sanitizedComments,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardPostDetailAPI.GET', 'Error fetching post detail', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '게시글 상세 정보를 불러오는 중 오류가 발생했습니다.',
      500
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_post_delete',
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
    const { id } = resolvedParams;

    const callerToken = extractAuthorToken(request);
    if (!callerToken) {
      return apiError(
        'UNAUTHORIZED',
        '게시글 삭제를 위한 작성자 인증 토큰이 존재하지 않습니다.',
        401
      );
    }

    const callerHash = hashAuthorToken(callerToken);
    const repo = getBoardRepository();
    const post = await repo.getPostById(id);

    if (!post) {
      return apiError(
        'POST_NOT_FOUND',
        '삭제할 게시글을 찾을 수 없습니다.',
        404
      );
    }

    if (post.authorTokenHash !== callerHash) {
      return apiError(
        'FORBIDDEN',
        '본인이 작성한 게시글만 삭제할 수 있습니다.',
        403
      );
    }

    const deleted = await repo.deletePost(id, callerHash);
    if (!deleted) {
      return apiError(
        'DELETE_FAILED',
        '게시글 삭제 처리에 실패했습니다.',
        500
      );
    }

    return apiSuccess({
      deleted: true,
      postId: id,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardPostDetailAPI.DELETE', 'Error deleting board post', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '게시글을 삭제하는 중 오류가 발생했습니다.',
      500
    );
  }
}

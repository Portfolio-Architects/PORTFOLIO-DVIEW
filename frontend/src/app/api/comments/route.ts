import { NextRequest } from 'next/server';
import { adminDb as db, Timestamp, FieldValue } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const CommentCreateSchema = z.object({
  text: z.string().min(1).max(500),
  authorUid: z.string().min(1),
  authorName: z.string().optional().default('익명'),
  postId: z.string().optional(),
  reportId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.postId && !data.reportId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either postId or reportId must be provided',
      path: ['postId'],
    });
  }
});

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, {
      prefix: 'ratelimit_comments',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('CommentsAPI.POST', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    if (!db) {
      logger.warn('CommentsAPI.POST', 'Firebase Admin DB not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Firebase Admin not initialized', 500);
    }
    const adminDb = db;

    let body: unknown;
    try {
      body = await req.json();
    } catch (jsonErr) {
      logger.warn('CommentsAPI.POST', 'Invalid JSON body structure', {}, jsonErr as Error);
      return apiError('BAD_REQUEST', 'Invalid JSON body structure', 400);
    }

    const parsed = CommentCreateSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('CommentsAPI.POST', 'Invalid comment creation payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Invalid request payload', 400, parsed.error.issues);
    }

    const { text, authorUid, authorName, postId, reportId } = parsed.data;
    const sanitizedText = escapeHtml(text);
    const sanitizedAuthorName = escapeHtml(authorName || '익명');

    if (postId) {
      const postRef = adminDb.collection('posts').doc(postId);

      const commentId = await adminDb.runTransaction(async (transaction) => {
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists) {
          throw new Error('POST_NOT_FOUND');
        }

        const newCommentRef = postRef.collection('comments').doc();
        transaction.set(newCommentRef, {
          text: sanitizedText,
          authorName: sanitizedAuthorName,
          authorUid,
          createdAt: Timestamp.now(),
        });

        transaction.update(postRef, {
          commentCount: FieldValue.increment(1),
        });

        return newCommentRef.id;
      });

      logger.info('CommentsAPI.POST', 'Comment added to post atomically via transaction', { postId, commentId });
      return apiSuccess({ id: commentId }, { status: 'success', id: commentId });
    } else if (reportId) {
      let reportRef = adminDb.collection('field_reports').doc(reportId);

      const commentId = await adminDb.runTransaction(async (transaction) => {
        let reportSnap = await transaction.get(reportRef);
        if (!reportSnap.exists) {
          const scoutingRef = adminDb.collection('scoutingReports').doc(reportId);
          const scoutingSnap = await transaction.get(scoutingRef);
          if (scoutingSnap.exists) {
            reportRef = scoutingRef;
            reportSnap = scoutingSnap;
          } else {
            throw new Error('REPORT_NOT_FOUND');
          }
        }

        const reportData = reportSnap.data();
        const apartmentName = reportData?.apartmentName;

        const newCommentRef = reportRef.collection('comments').doc();
        transaction.set(newCommentRef, {
          text: sanitizedText,
          authorName: sanitizedAuthorName,
          authorUid,
          createdAt: Timestamp.now(),
        });

        if (apartmentName) {
          const newStoryRef = adminDb.collection('lounge_apt_stories').doc();
          transaction.set(newStoryRef, {
            text: sanitizedText,
            authorName: sanitizedAuthorName,
            authorUid,
            apartmentName,
            reportId,
            createdAt: Timestamp.now(),
          });
        }

        transaction.update(reportRef, {
          commentCount: FieldValue.increment(1),
        });

        return newCommentRef.id;
      });

      logger.info('CommentsAPI.POST', 'Comment added to report atomically via transaction', { reportId, commentId });
      return apiSuccess({ id: commentId }, { status: 'success', id: commentId });
    }

    return apiError('INVALID_REQUEST', 'Invalid request', 400);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.message === 'POST_NOT_FOUND') {
      return apiError('POST_NOT_FOUND', 'Target post not found', 404);
    }
    if (err.message === 'REPORT_NOT_FOUND') {
      return apiError('REPORT_NOT_FOUND', 'Target report not found', 404);
    }
    logger.error('CommentsAPI.POST', 'Create comment api error', {}, err);
    return apiError('INTERNAL_ERROR', 'Failed to create comment', 500);
  }
}

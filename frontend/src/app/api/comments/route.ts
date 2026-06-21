import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import { rateLimiter } from '@/lib/rate-limit';

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
      path: ['postId']
    });
  }
});

export async function POST(req: NextRequest) {
  try {
    if (rateLimiter) {
      const forwarded = req.headers.get('x-forwarded-for');
      const realIp = req.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_comments_${rawIp}`);
      if (!success) {
        logger.warn('CommentsAPI.POST', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    if (!db) {
      logger.warn('CommentsAPI.POST', 'Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    const adminDb = db;

    let body;
    try {
      body = await req.json();
    } catch (jsonErr) {
      logger.warn('CommentsAPI.POST', 'Invalid JSON body structure', {}, jsonErr as Error);
      return NextResponse.json({ error: 'Invalid JSON body structure' }, { status: 400 });
    }

    const parsed = CommentCreateSchema.safeParse(body);
    
    if (!parsed.success) {
      logger.warn('CommentsAPI.POST', 'Invalid comment creation payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.issues }, { status: 400 });
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
          createdAt: Timestamp.now()
        });

        transaction.update(postRef, {
          commentCount: FieldValue.increment(1)
        });

        return newCommentRef.id;
      });

      logger.info('CommentsAPI.POST', 'Comment added to post atomically via transaction', { postId, commentId });
      return NextResponse.json({ status: 'success', id: commentId });

    } else if (reportId) {
      const reportRef = adminDb.collection('field_reports').doc(reportId);
      
      const commentId = await adminDb.runTransaction(async (transaction) => {
        const reportSnap = await transaction.get(reportRef);
        if (!reportSnap.exists) {
          throw new Error('REPORT_NOT_FOUND');
        }

        const reportData = reportSnap.data();
        const apartmentName = reportData?.apartmentName;

        const newCommentRef = reportRef.collection('comments').doc();
        transaction.set(newCommentRef, {
          text: sanitizedText,
          authorName: sanitizedAuthorName,
          authorUid,
          createdAt: Timestamp.now()
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
          commentCount: FieldValue.increment(1)
        });

        return newCommentRef.id;
      });

      logger.info('CommentsAPI.POST', 'Comment added to report atomically via transaction', { reportId, commentId });
      return NextResponse.json({ status: 'success', id: commentId });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    if (error?.message === 'POST_NOT_FOUND') {
      return NextResponse.json({ error: 'Target post not found' }, { status: 404 });
    }
    if (error?.message === 'REPORT_NOT_FOUND') {
      return NextResponse.json({ error: 'Target report not found' }, { status: 404 });
    }
    logger.error('CommentsAPI.POST', 'Create comment api error', {}, error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

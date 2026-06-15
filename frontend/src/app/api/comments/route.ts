import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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

export async function POST(req: Request) {
  try {
    if (!db) {
      logger.warn('CommentsAPI.POST', 'Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const body = await req.json();
    const parsed = CommentCreateSchema.safeParse(body);
    
    if (!parsed.success) {
      logger.warn('CommentsAPI.POST', 'Invalid comment creation payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.issues }, { status: 400 });
    }

    const { text, authorUid, authorName, postId, reportId } = parsed.data;

    // Determine target collection and doc ref
    if (postId) {
      const postRef = db.collection('posts').doc(postId);
      const postSnap = await postRef.get();
      if (!postSnap.exists) {
        return NextResponse.json({ error: 'Target post not found' }, { status: 404 });
      }

      const commentRef = await postRef.collection('comments').add({
        text,
        authorName: authorName || '익명',
        authorUid,
        createdAt: Timestamp.now()
      });

      await postRef.update({
        commentCount: FieldValue.increment(1)
      });

      logger.info('CommentsAPI.POST', 'Comment added to post via API', { postId, commentId: commentRef.id });
      return NextResponse.json({ status: 'success', id: commentRef.id });

    } else if (reportId) {
      const reportRef = db.collection('field_reports').doc(reportId);
      const reportSnap = await reportRef.get();
      if (!reportSnap.exists) {
        return NextResponse.json({ error: 'Target report not found' }, { status: 404 });
      }

      const commentRef = await reportRef.collection('comments').add({
        text,
        authorName: authorName || '익명',
        authorUid,
        createdAt: Timestamp.now()
      });

      await reportRef.update({
        commentCount: FieldValue.increment(1)
      });

      logger.info('CommentsAPI.POST', 'Comment added to report via API', { reportId, commentId: commentRef.id });
      return NextResponse.json({ status: 'success', id: commentRef.id });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    logger.error('CommentsAPI.POST', 'Create comment api error', {}, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

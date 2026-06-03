import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const lastCreatedAtStr = searchParams.get('lastCreatedAt');
    const limitVal = parseInt(searchParams.get('limit') || '20', 10);

    let q = db.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limitVal);

    if (lastCreatedAtStr) {
      const lastCreatedAtMs = parseInt(lastCreatedAtStr, 10);
      if (!isNaN(lastCreatedAtMs)) {
        const lastDate = new Date(lastCreatedAtMs);
        const lastTimestamp = Timestamp.fromDate(lastDate);
        q = q.startAfter(lastTimestamp);
      }
    }

    const snapshot = await q.get();
    
    const posts = snapshot.docs.map(doc => {
      const data = doc.data();
      const rawContent = data.content || '';
      
      // Extract first markdown image
      const imgMatch = rawContent.match(/!\[.*?\]\((.*?)\)/);
      
      // Format metadata
      const createdAtMs = data.createdAt ? data.createdAt.toMillis() : Date.now();
      const dateStr = new Date(createdAtMs).toLocaleDateString('ko-KR');

      return {
        id: doc.id,
        title: data.title || '',
        category: data.category || '기타',
        author: data.authorName || '익명',
        imageUrl: imgMatch ? imgMatch[1] : (data.imageUrl || null),
        likes: data.likes || 0,
        views: data.views || 0,
        createdAt: createdAtMs,
        meta: `${dateStr} · ${data.category || '기타'}`,
        summary: rawContent
          .replace(/!\[.*?\]\(.*?\)/g, '')
          .replace(/\[.*?\]\(.*?\)/g, '')
          .replace(/[#*~_\-`(]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/https?:\/\/[^\s]+/g, '')
          .trim()
      };
    });

    return NextResponse.json({
      status: 'success',
      posts
    });
  } catch (error: any) {
    console.error('Fetch posts api error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

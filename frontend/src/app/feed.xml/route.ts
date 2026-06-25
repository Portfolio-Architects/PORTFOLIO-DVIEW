import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';

export const revalidate = 1800; // Cache for 30 minutes

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  
  try {
    if (!adminDb) {
      throw new Error('adminDb is not initialized');
    }
    
    // Direct collection fetch to save Firestore read costs and keep payloads clean
    const postsSnap = await adminDb.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();
      
    let itemsXml = '';
    
    postsSnap.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const title = data.title || '제목 없음';
      const author = data.authorName || '익명';
      
      // Clean markdown tags to generate optimal description text for RSS
      const content = data.content || '';
      const contentWithoutImages = content.replace(/!\[.*?\]\(.*?\)/g, '');
      const summary = contentWithoutImages
        .replace(/[#*`~_\->]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const truncatedSummary = summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
      
      // Parse dates to standard RFC 822 for RSS compatibility
      let pubDate = new Date().toUTCString();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          pubDate = data.createdAt.toDate().toUTCString();
        } else if (data.createdAt._seconds) {
          pubDate = new Date(data.createdAt._seconds * 1000).toUTCString();
        }
      }
      
      const link = `${baseUrl}/lounge/${id}`;
      
      itemsXml += `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${truncatedSummary}]]></description>
      <author><![CDATA[${author}]]></author>
      <pubDate>${pubDate}</pubDate>
    </item>\n`;
    });
    
    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>D-VIEW 라운지</title>
    <link>${baseUrl}/lounge</link>
    <description>동탄 주민들의 실시간 실거래가 및 부동산 소통 라운지</description>
    <language>ko</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
\n${itemsXml}  </channel>
</rss>`;

    return new Response(rssXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600',
      },
    });
    
  } catch (error) {
    logger.error('feed.xml.GET', 'Failed to generate RSS feed', undefined, error as Error);
    // Simple structural fallback under exceptions to prevent page crash
    return new Response(
      `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>D-VIEW</title>
    <link>${baseUrl}</link>
    <description>Temporary Unavailable</description>
  </channel>
</rss>`,
      {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      }
    );
  }
}

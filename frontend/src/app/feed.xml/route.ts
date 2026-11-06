export const runtime = 'nodejs';
export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  
  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>D-VIEW | 동탄 신도시 아파트 실거래 &amp; 가치분석</title>
    <link>${baseUrl}</link>
    <description>동탄 신도시 182개 단지 17만 건 전수 실거래가 및 가치 분석 정보</description>
    <language>ko</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}


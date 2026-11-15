import { buildDviewRssXml } from '@/app/feed.xml/route';

export const runtime = 'nodejs';
export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  const rssXml = buildDviewRssXml({ selfPath: '/rss.xml' });

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}

import { buildDviewRssXml } from '@/app/feed.xml/route';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = false; // Pure SSG

export async function GET() {
  const rssXml = buildDviewRssXml({ selfPath: '/rss.xml' });

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}

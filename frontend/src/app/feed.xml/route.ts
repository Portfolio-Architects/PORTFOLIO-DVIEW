import { GUIDE_ARTICLES, GUIDE_DEFAULT_TX_SUMMARY_MAP } from '@/lib/data/guides';
import { ZONES, dongToZoneId } from '@/lib/zones';

export const runtime = 'nodejs';
export const revalidate = 86400; // Cache for 24 hours

function escapeXml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function parseRssPubDate(
  rawDate: string | undefined | null,
  fallbackUtc: string = new Date().toUTCString(),
  maxNowMs: number = Date.now()
): string {
  if (!rawDate) return fallbackUtc;
  const trimmed = String(rawDate).trim();
  if (!trimmed) return fallbackUtc;

  const maxAllowedTime = Number.isFinite(maxNowMs)
    ? maxNowMs + 60_000
    : Date.now() + 60_000;

  // 1. Date-only formats: YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, or YYYYMMDD
  if (/^\d{4}[-./]?\d{2}[-./]?\d{2}$/.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    const y = parseInt(digits.slice(0, 4), 10);
    const m = parseInt(digits.slice(4, 6), 10) - 1;
    const d = parseInt(digits.slice(6, 8), 10);
    const utcDate = new Date(Date.UTC(y, m, d));
    if (
      !Number.isNaN(utcDate.getTime()) &&
      utcDate.getUTCFullYear() === y &&
      utcDate.getUTCMonth() === m &&
      utcDate.getUTCDate() === d
    ) {
      if (utcDate.getTime() > maxAllowedTime) {
        return fallbackUtc;
      }
      return utcDate.toUTCString();
    }
    return fallbackUtc;
  }

  // 2. Full ISO-8601 or RFC-2822 timestamp
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    if (parsed.getTime() > maxAllowedTime) {
      return fallbackUtc;
    }
    return parsed.toUTCString();
  }

  return fallbackUtc;
}

function buildZoneLatestTxDateMap(): Map<string, string> {
  const latestByZone = new Map<string, string>();
  for (const aptSummary of Object.values(GUIDE_DEFAULT_TX_SUMMARY_MAP || {})) {
    if (!aptSummary?.dong || !aptSummary?.latestDate) continue;
    const zoneId = dongToZoneId(aptSummary.dong);
    if (!zoneId) continue;
    const normalizedDigits = String(aptSummary.latestDate).replace(/\D/g, '');
    if (normalizedDigits.length !== 8) continue;
    const formatted = `${normalizedDigits.slice(0, 4)}-${normalizedDigits.slice(4, 6)}-${normalizedDigits.slice(6, 8)}`;
    const prev = latestByZone.get(zoneId);
    if (!prev || formatted > prev) {
      latestByZone.set(zoneId, formatted);
    }
  }
  return latestByZone;
}

export interface BuildDviewRssXmlOptions {
  baseUrl?: string;
  selfPath?: '/feed.xml' | '/rss.xml' | string;
  nowUtc?: string;
}

export function buildDviewRssXml(options: BuildDviewRssXmlOptions = {}): string {
  const baseUrl = (
    options.baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://dongtanview.com'
  ).replace(/\/+$/, '');
  const selfPath = options.selfPath?.startsWith('/')
    ? options.selfPath
    : `/${options.selfPath || 'feed.xml'}`;
  const nowUtc = options.nowUtc || new Date().toUTCString();
  const parsedNowMs = new Date(nowUtc).getTime();
  const maxNowMs = Number.isFinite(parsedNowMs) ? parsedNowMs : Date.now();
  const zoneLatestDates = buildZoneLatestTxDateMap();

  const guideItemsXml = GUIDE_ARTICLES.map((article) => {
    const itemUrl = `${baseUrl}/guide/${encodeURIComponent(article.slug)}`;
    const pubDate = parseRssPubDate(article.updatedDate || article.date, nowUtc, maxNowMs);
    return [
      '    <item>',
      `      <title>${escapeXml(article.seoTitle || article.title)}</title>`,
      `      <link>${escapeXml(itemUrl)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(itemUrl)}</guid>`,
      `      <category>${escapeXml(article.category)}</category>`,
      `      <pubDate>${pubDate}</pubDate>`,
      `      <description>${escapeXml(article.seoDescription || article.description)}</description>`,
      '    </item>',
    ].join('\n');
  });

  const zoneItemsXml = ZONES.map((zone) => {
    const zoneUrl = `${baseUrl}/zone/${encodeURIComponent(zone.id)}`;
    const zonePubDate = parseRssPubDate(zoneLatestDates.get(zone.id), nowUtc, maxNowMs);
    return [
      '    <item>',
      `      <title>${escapeXml(`${zone.name} (${zone.dongLabel}) 아파트 실거래가·평당가·전세가율 비교 리포트 | D-VIEW`)}</title>`,
      `      <link>${escapeXml(zoneUrl)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(zoneUrl)}</guid>`,
      '      <category>권역별 시세 분석</category>',
      `      <pubDate>${zonePubDate}</pubDate>`,
      `      <description>${escapeXml(zone.description)}</description>`,
      '    </item>',
    ].join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>D-VIEW (디뷰 · 동뷰 · 동탄뷰) | 동탄 신도시 아파트 실거래 &amp; 가치분석</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>국토교통부 실거래가 공개시스템 공식 데이터 기반 동탄 1·2신도시 184개 단지 실거래가·전세가율·집값 추이 그래프 및 56개 지식산업센터 가치 분석 정보</description>
    <language>ko</language>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <atom:link href="${escapeXml(`${baseUrl}${selfPath}`)}" rel="self" type="application/rss+xml" />
${[...guideItemsXml, ...zoneItemsXml].join('\n')}
  </channel>
</rss>`;
}

export async function GET() {
  const rssXml = buildDviewRssXml({ selfPath: '/feed.xml' });

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}

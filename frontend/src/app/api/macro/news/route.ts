import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

const parser = new Parser();

// Helper: Fetch with AbortController timeout guard (3 seconds)
async function fetchWithTimeout(url: string, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 60 } // Cache feed locally for 60 seconds
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

const macroNewsQuerySchema = z.object({
  limit: z.string().optional().transform((v) => {
    if (!v) return 100;
    const parsed = parseInt(v, 10);
    return isNaN(parsed) ? 100 : Math.min(Math.max(parsed, 1), 100);
  }),
});

const googleNewsItemSchema = z.object({
  title: z.string().optional().default(''),
  link: z.string().url().optional().default(''),
  pubDate: z.string().optional().default(''),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = macroNewsQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsedQuery.success) {
      logger.warn('MacroNewsAPI.GET', 'Invalid query parameters', {
        errors: parsedQuery.error.format(),
      });
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const { limit } = parsedQuery.data;

    // Google News RSS Search Query for "동탄 부동산"
    const feedUrl = 'https://news.google.com/rss/search?q=%EB%8F%99%ED%83%84+%EB%B6%80%EB%8F%99%EC%82%B0&hl=ko&gl=KR&ceid=KR:ko';
    
    let rawItems: any[] = [];
    try {
      const response = await fetchWithTimeout(feedUrl, 3000);
      if (response.ok) {
        const xmlText = await response.text();
        
        // 1차 시도: rss-parser를 통한 String 파싱
        try {
          const feed = await parser.parseString(xmlText);
          rawItems = feed.items || [];
        } catch (parseErr) {
          logger.warn('MacroNewsAPI.GET', 'Primary RSS parser failed, falling back to Cheerio', {}, parseErr as Error);
          
          // 2차 시도 (폴백): Cheerio를 통한 XML 직접 파싱
          try {
            const $ = cheerio.load(xmlText, { xmlMode: true });
            const items: any[] = [];
            $('item').each((_, el) => {
              const $el = $(el);
              items.push({
                title: $el.find('title').text() || '',
                link: $el.find('link').text() || '',
                pubDate: $el.find('pubDate').text() || '',
              });
            });
            rawItems = items;
          } catch (cheerioErr) {
            logger.error('MacroNewsAPI.GET', 'Cheerio XML parser fallback failed', {}, cheerioErr as Error);
            rawItems = [];
          }
        }
      } else {
        logger.warn('MacroNewsAPI.GET', `Failed to fetch RSS feed, status: ${response.status}`);
        rawItems = [];
      }
    } catch (fetchErr) {
      logger.error('MacroNewsAPI.GET', 'Fetch RSS feed timed out or failed', {}, fetchErr as Error);
      rawItems = [];
    }

    // Get up to limit news items
    const slicedItems = rawItems.slice(0, limit);

    const newsItems = slicedItems.map((item, index) => {
      const parsedItem = googleNewsItemSchema.safeParse(item);
      let title = '';
      let link = '';
      let pubDate = '';

      if (parsedItem.success) {
        title = parsedItem.data.title;
        link = parsedItem.data.link;
        pubDate = parsedItem.data.pubDate;
      } else {
        logger.warn('MacroNewsAPI.GET', 'Invalid RSS feed item format', {
          errors: parsedItem.error.format(),
          index,
        });
        title = item.title || '';
        link = item.link || '';
        pubDate = item.pubDate || '';
      }

      let publisher = 'NEWS';
      
      // Google News appends the publisher at the end of the title after a ' - '
      const lastDashIndex = title.lastIndexOf(' - ');
      if (lastDashIndex !== -1) {
        publisher = title.substring(lastDashIndex + 3).trim();
        title = title.substring(0, lastDashIndex).trim();
      }

      // Map publisher and title to a specific "Category" tag to fit our UI
      let category = 'MARKET'; // Default
      const textToAnalyze = `${title} ${publisher}`;

      // 1. MACRO: Broad economic indicators, interest rates, financial policies
      const hasMacroKeywords = /(?:^|[^가-힣])(?:금리|한국은행|인플레|유동성|특례|보금자리|대출|경제|파이낸셜)(?:$|[^가-힣])/.test(textToAnalyze);
      const isMacroPublisher = /(매일경제|매경|한국경제|한경|조선비즈|비즈니스|비즈)/.test(publisher) || 
                               /(?:^|[^가-힣])(?:매경|한경|비즈)(?:$|[^가-힣])/.test(title);

      if (hasMacroKeywords || isMacroPublisher) {
        category = 'MACRO';
      }
      // 2. COMMERCIAL: Retail, anchor tenants, commercial zones
      if (/상가|상권|백화점|이마트|트레이더스|쇼핑|업무지구|테크노밸리|기업/.test(title)) {
        category = 'COMMERCIAL';
      }
      // 3. COMMUNITY: Local living, schools, hospitals, parks
      if (/학군|학교|교육|유치원|병원|호수공원|커뮤니티|주거환경/.test(title)) {
        category = 'COMMUNITY';
      }
      // 4. POLICY: Government regulations, taxes, zoning
      if (/정책|규제|세금|취득세|종부세|양도세|국토부|정부|법|DSR|LTV|조정지역|투기/.test(title)) {
        category = 'POLICY';
      }
      // 5. INFRASTRUCTURE: Transport, railways, mega developments
      if (/교통|GTX|트램|동인선|지하철|철도|고속도로|경부|인프라|착공|개통/.test(title)) {
        category = 'INFRASTRUCTURE';
      }

      // Override: If a broad economic paper writes specifically about local price/supply action, revert to MARKET
      if (/전세|매매|실거래|급매|신고가|하락|상승|반등|입주|청약|미분양/.test(title) && category === 'MACRO') {
        category = 'MARKET';
      }

      return {
        id: index + 1,
        category: category,
        sub: publisher, // We use the publisher as the subtitle
        title: title,
        link: link,
        pubDate: pubDate,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: newsItems,
    });
  } catch (error) {
    logger.error('MacroNewsAPI.GET', 'Error fetching Google News RSS', {}, error as Error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch news data' },
      { status: 500 }
    );
  }
}

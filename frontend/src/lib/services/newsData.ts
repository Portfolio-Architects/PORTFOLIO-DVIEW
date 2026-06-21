import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/services/logger';

const parser = new Parser();

// Helper: Fetch with AbortController timeout guard
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

const googleNewsItemSchema = z.object({
  title: z.string().optional().default(''),
  link: z.string().url().optional().default(''),
  pubDate: z.string().optional().default(''),
});

export interface NewsItem {
  id: number;
  category: string;
  sub: string;
  title: string;
  link: string;
  pubDate: string;
}

export async function getMacroNews(limit: number = 40): Promise<NewsItem[]> {
  try {
    // Google News RSS Search Query for "동탄 부동산"
    const feedUrl = 'https://news.google.com/rss/search?q=%EB%8F%99%ED%83%84+%EB%B6%80%EB%8F%99%EC%82%B0&hl=ko&gl=KR&ceid=KR:ko';
    
    let rawItems: any[] = [];
    try {
      const response = await fetchWithTimeout(feedUrl, 3000);
      if (response.ok) {
        const xmlText = await response.text();
        
        try {
          const feed = await parser.parseString(xmlText);
          rawItems = feed.items || [];
        } catch (parseErr) {
          logger.warn('newsData.getMacroNews', 'Primary RSS parser failed, falling back to Cheerio', {}, parseErr as Error);
          
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
            logger.error('newsData.getMacroNews', 'Cheerio XML parser fallback failed', {}, cheerioErr as Error);
            rawItems = [];
          }
        }
      } else {
        logger.warn('newsData.getMacroNews', `Failed to fetch RSS feed, status: ${response.status}`);
        rawItems = [];
      }
    } catch (fetchErr) {
      logger.error('newsData.getMacroNews', 'Fetch RSS feed timed out or failed', {}, fetchErr as Error);
      rawItems = [];
    }

    const slicedItems = rawItems.slice(0, limit);

    return slicedItems.map((item, index) => {
      const parsedItem = googleNewsItemSchema.safeParse(item);
      let title = '';
      let link = '';
      let pubDate = '';

      if (parsedItem.success) {
        title = parsedItem.data.title;
        link = parsedItem.data.link;
        pubDate = parsedItem.data.pubDate;
      } else {
        title = item.title || '';
        link = item.link || '';
        pubDate = item.pubDate || '';
      }

      let publisher = 'NEWS';
      const lastDashIndex = title.lastIndexOf(' - ');
      if (lastDashIndex !== -1) {
        publisher = title.substring(lastDashIndex + 3).trim();
        title = title.substring(0, lastDashIndex).trim();
      }

      let category = 'MARKET';
      const textToAnalyze = `${title} ${publisher}`;

      const hasMacroKeywords = /(?:^|[^가-힣])(?:금리|한국은행|인플레|유동성|특례|보금자리|대출|경제|파이낸셜)(?:$|[^가-힣])/.test(textToAnalyze);
      const isMacroPublisher = /(매일경제|매경|한국경제|한경|조선비즈|비즈니스|비즈)/.test(publisher) || 
                               /(?:^|[^가-힣])(?:매경|한경|비즈)(?:$|[^가-힣])/.test(title);

      if (hasMacroKeywords || isMacroPublisher) {
        category = 'MACRO';
      }
      if (/상가|상권|백화점|이마트|트레이더스|쇼핑|업무지구|테크노밸리|기업/.test(title)) {
        category = 'COMMERCIAL';
      }
      if (/학군|학교|교육|유치원|병원|호수공원|커뮤니티|주거환경/.test(title)) {
        category = 'COMMUNITY';
      }
      if (/정책|규제|세금|취득세|종부세|양도세|국토부|정부|법|DSR|LTV|조정지역|투기/.test(title)) {
        category = 'POLICY';
      }
      if (/교통|GTX|트램|동인선|지하철|철도|고속도로|경부|인프라|착공|개통/.test(title)) {
        category = 'INFRASTRUCTURE';
      }

      if (/전세|매매|실거래|급매|신고가|하락|상승|반등|입주|청약|미분양/.test(title) && category === 'MACRO') {
        category = 'MARKET';
      }

      return {
        id: index + 1,
        category: category,
        sub: publisher,
        title: title,
        link: link,
        pubDate: pubDate,
      };
    });
  } catch (error) {
    logger.error('newsData.getMacroNews', 'Error during getMacroNews', {}, error as Error);
    return [];
  }
}

const noticeSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  dept: z.string().optional(),
  date: z.string(),
  isDongtan: z.boolean(),
  source: z.enum(['bbs', 'gosi', 'rail', 'dong', 'culture']).optional(),
  createdAt: z.string().optional(),
});

type NoticeData = z.infer<typeof noticeSchema>;

export interface LocalNoticesResult {
  notices: NoticeData[];
  lastUpdated: string | null;
}

export async function getLocalNotices(filterDongtan: boolean = true): Promise<LocalNoticesResult> {
  try {
    if (!db) {
      logger.warn('newsData.getLocalNotices', 'Firebase Admin DB not initialized. Returning empty notices.');
      return { notices: [], lastUpdated: null };
    }
    const localDb = db;

    const cacheKey = `DTDLS:cache:localNotices:filterDongtan:${filterDongtan}`;
    if (redis) {
      try {
        const cached = await redis.get<LocalNoticesResult>(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (err) {
        logger.warn('newsData.getLocalNotices', 'Redis localNotices read error', { cacheKey }, err as Error);
      }
    }

    let cityQuery = localDb.collection('local_notices').where('source', 'in', ['gosi', 'bbs']);
    let railQuery = localDb.collection('local_notices').where('source', '==', 'rail');
    let cultureQuery = localDb.collection('local_notices').where('source', '==', 'culture');

    if (filterDongtan) {
      cityQuery = cityQuery.where('isDongtan', '==', true);
      railQuery = railQuery.where('isDongtan', '==', true);
      cultureQuery = cultureQuery.where('isDongtan', '==', true);
    }

    cityQuery = cityQuery.limit(150);
    railQuery = railQuery.limit(150);
    cultureQuery = cultureQuery.limit(150);

    let dongQuery = localDb.collection('local_notices').where('source', '==', 'dong');
    if (filterDongtan) {
      dongQuery = dongQuery.where('isDongtan', '==', true);
    }
    dongQuery = dongQuery.limit(400);

    const isDev = process.env.NODE_ENV === 'development';
    const timeoutMs = isDev ? 1000 : 5000;

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      let timeoutId: any;
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Firebase timeout')), ms);
      });
      return Promise.race([
        promise.then((val) => {
          clearTimeout(timeoutId);
          return val;
        }).catch((err) => {
          clearTimeout(timeoutId);
          throw err;
        }),
        timeoutPromise
      ]);
    };

    const [citySnapshot, railSnapshot, cultureSnapshot, dongSnapshot] = await Promise.all([
      withTimeout(cityQuery.get(), timeoutMs),
      withTimeout(railQuery.get(), timeoutMs),
      withTimeout(cultureQuery.get(), timeoutMs),
      withTimeout(dongQuery.get(), timeoutMs)
    ]);

    const getTopN = (snapshot: any, limitVal = 100) => {
      const validItems: NoticeData[] = [];
      snapshot.docs.forEach((doc: any) => {
        try {
          const data = doc.data();
          if (data && typeof data === 'object') {
            if (data.url) {
              data.url = data.url.trim();
            }
            const rawNotice = { ...data, id: doc.id };
            const parsed = noticeSchema.safeParse(rawNotice);
            if (parsed.success) {
              validItems.push(parsed.data);
            }
          }
        } catch (itemErr) {
          logger.error('newsData.getLocalNotices', `Error parsing doc ${doc.id}`, {}, itemErr as Error);
        }
      });
      return validItems
        .sort((a: NoticeData, b: NoticeData) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.id.localeCompare(a.id);
        })
        .slice(0, limitVal);
    };

    const cityItems = getTopN(citySnapshot, 100);
    const railItems = getTopN(railSnapshot, 100);
    const cultureItems = getTopN(cultureSnapshot, 100);
    const dongItems = getTopN(dongSnapshot, 300);

    const allItems = [...cityItems, ...railItems, ...cultureItems, ...dongItems];

    if (allItems.length === 0) {
      return { notices: [], lastUpdated: null };
    }

    const uniqueMap = new Map<string, NoticeData>();
    const urlToKey = new Map<string, string>();

    allItems.forEach(item => {
      const titleKey = `${(item.title || '').trim()}_${(item.date || '').trim()}`;
      const urlKey = item.url ? item.url.trim() : '';

      let duplicateKey = uniqueMap.has(titleKey) ? titleKey : null;
      if (!duplicateKey && urlKey && urlToKey.has(urlKey)) {
        duplicateKey = urlToKey.get(urlKey) || null;
      }

      if (duplicateKey) {
        const existing = uniqueMap.get(duplicateKey);
        if (existing) {
          const currentIsPrefixed = item.id.includes('_');
          const existingIsPrefixed = existing.id.includes('_');
          if (currentIsPrefixed && !existingIsPrefixed) {
            uniqueMap.set(duplicateKey, item);
            if (urlKey) urlToKey.set(urlKey, duplicateKey);
          }
        }
      } else {
        uniqueMap.set(titleKey, item);
        if (urlKey) urlToKey.set(urlKey, titleKey);
      }
    });

    let notices = Array.from(uniqueMap.values());

    if (filterDongtan) {
      notices = notices.filter((n: NoticeData) => n.isDongtan);
      notices.sort((a: NoticeData, b: NoticeData) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.id.localeCompare(a.id);
      });
    } else {
      notices.sort((a: NoticeData, b: NoticeData) => {
        if (a.isDongtan && !b.isDongtan) return -1;
        if (!a.isDongtan && b.isDongtan) return 1;
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.id.localeCompare(a.id);
      });
    }

    let lastUpdated: string | null = null;
    allItems.forEach(item => {
      if (item.createdAt) {
        if (!lastUpdated || item.createdAt > lastUpdated) {
          lastUpdated = item.createdAt;
        }
      }
    });

    const responseData = { notices, lastUpdated };

    if (redis) {
      redis.set(cacheKey, responseData, { ex: 3600 }).catch(e => logger.warn('newsData.getLocalNotices', 'Redis localNotices write error', { cacheKey }, e as Error));
    }

    return responseData;
  } catch (error) {
    logger.error('newsData.getLocalNotices', 'Error fetching local notices', {}, error as Error);
    return { notices: [], lastUpdated: null };
  }
}

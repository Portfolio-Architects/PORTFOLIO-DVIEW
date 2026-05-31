import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const revalidate = 3600; // Cache for 1 hour

const parser = new Parser();

export async function GET() {
  try {
    // Google News RSS Search Query for "동탄 부동산"
    const feedUrl = 'https://news.google.com/rss/search?q=%EB%8F%99%ED%83%84+%EB%B6%80%EB%8F%99%EC%82%B0&hl=ko&gl=KR&ceid=KR:ko';
    const feed = await parser.parseURL(feedUrl);

    // Get up to 100 news items
    const rawItems = feed.items.slice(0, 100);

    const newsItems = rawItems.map((item, index) => {
      let title = item.title || '';
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
        link: item.link,
        pubDate: item.pubDate,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: newsItems,
    });
  } catch (error) {
    console.error('Error fetching Google News RSS:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch news data' },
      { status: 500 }
    );
  }
}

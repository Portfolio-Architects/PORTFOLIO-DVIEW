import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

// 보안 및 데이터 정합성: GA4 API 응답 및 Mock 데이터 검증용 스키마 정의
const popularAptItemSchema = z.object({
  aptName: z.string().min(1),
  views: z.number().nonnegative(),
});
const popularAptListSchema = z.array(popularAptItemSchema);

const ga4RowSchema = z.object({
  dimensionValues: z.array(z.object({ value: z.string().nullable().optional() })).optional().nullable(),
  metricValues: z.array(z.object({ value: z.string().nullable().optional() })).optional().nullable(),
}).optional().nullable();

const ga4ResponseSchema = z.object({
  rows: z.array(ga4RowSchema).optional().nullable(),
});

export async function GET() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY;

  // 환경변수가 없으면 시뮬레이션 Fallback 모드로 동작
  if (!propertyId || !clientEmail || !privateKey) {
    const mockApts = [
      { aptName: '동탄역 롯데캐슬', baseViews: 85 },
      { aptName: '동탄 레이크자이 더테라스', baseViews: 68 },
      { aptName: '동탄린스트라우스 더레이크', baseViews: 55 },
      { aptName: '동탄역 시범 한화꿈에그린 프레스티지', baseViews: 52 },
      { aptName: '동탄역 삼정그린코아 더베스트', baseViews: 41 },
      { aptName: '동탄역 시범 우남퍼스트빌', baseViews: 38 },
      { aptName: '동탄역 시범 더샵 센트럴시티', baseViews: 32 },
      { aptName: '동탄역 신안인스빌리베라 2차', baseViews: 25 },
    ];

    // 시간대별로 뷰 수에 노이즈 추가하여 실시간 생동감 부여
    const minutes = new Date().getMinutes();
    const seconds = new Date().getSeconds();
    
    const rawData = mockApts
      .map((apt, idx) => {
        // 시간에 따라 랭킹 가중치가 유동적으로 변하게 함
        const noise = Math.sin(minutes + idx) * 15 + Math.cos(seconds + idx) * 5;
        const finalViews = Math.max(5, Math.round(apt.baseViews + noise));
        return { aptName: apt.aptName, views: finalViews };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const parsed = popularAptListSchema.safeParse(rawData);
    if (!parsed.success) {
      logger.warn('RealtimePopularAPI.GET', 'Mock popular apt list schema mismatch', { errors: parsed.error.format() });
      return NextResponse.json({ success: true, isMock: true, data: rawData });
    }

    return NextResponse.json({ success: true, isMock: true, data: parsed.data });
  }

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });

    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'CONTAINS',
            value: 'apt=',
          },
        },
      },
      limit: 20,
    });

    const parsedResponse = ga4ResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      logger.warn('RealtimePopularAPI.GET', 'GA4 runRealtimeReport response schema mismatch', { errors: parsedResponse.error.format() });
    }

    const popularApts: Record<string, number> = {};
    const rows = parsedResponse.success ? parsedResponse.data.rows : response.rows;

    rows?.forEach((row: any) => {
      if (!row) return;
      const path = row.dimensionValues?.[0]?.value || '';
      const views = parseInt(row.metricValues?.[0]?.value || '0', 10);
      
      // /explore?apt=동탄역롯데캐슬 또는 /#apt=동탄역롯데캐슬 에서 아파트 이름 추출
      const match = path.match(/apt=([^&]+)/);
      if (match && match[1]) {
        try {
          const aptName = decodeURIComponent(match[1]).trim();
          if (aptName && aptName !== 'undefined') {
            popularApts[aptName] = (popularApts[aptName] || 0) + views;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    });

    const sortedData = Object.entries(popularApts)
      .map(([aptName, views]) => ({ aptName, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // 실제 데이터가 부족할 경우 가상 데이터를 채워서 반환
    if (sortedData.length < 5) {
      const fallbackList = [
        '동탄역 롯데캐슬',
        '동탄 레이크자이 더테라스',
        '동탄린스트라우스 더레이크',
        '동탄역 시범 한화꿈에그린 프레스티지',
        '동탄역 삼정그린코아 더베스트'
      ];
      
      fallbackList.forEach((apt) => {
        if (sortedData.length < 5 && !sortedData.some(d => d.aptName === apt)) {
          sortedData.push({ aptName: apt, views: Math.floor(Math.random() * 10) + 5 });
        }
      });
    }

    const finalParsed = popularAptListSchema.safeParse(sortedData);
    if (!finalParsed.success) {
      logger.warn('RealtimePopularAPI.GET', 'Final popular apt list schema mismatch', { errors: finalParsed.error.format() });
      return NextResponse.json({ success: true, isMock: false, data: sortedData });
    }

    return NextResponse.json({ success: true, isMock: false, data: finalParsed.data });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('RealtimePopularAPI.GET', 'GA4 Realtime Report Error', {}, error as Error);
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}

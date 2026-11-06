import { Metadata } from 'next';
import { Suspense } from 'react';
import NewsClient from './NewsClient';
import { getNewsMainSchema, safeJsonLd } from '@/lib/utils/structuredData';
import { getMacroNews, getLocalNotices } from '@/lib/services/newsData';

export const revalidate = 3600; // Revalidate every 1 hour (ISR)

export const metadata: Metadata = {
  title: 'D-VIEW 동탄 소식 | 실시간 부동산 뉴스 & 구정 행정 공지',
  description: '동탄 지역의 실시간 부동산 뉴스 및 화성시/동탄구청의 최신 구정 소식, 고시공고, 행사 축제 일정을 한데 모아 제공합니다.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://dongtanview.com/news',
  },
};

function NewsSkeleton() {
  return (
    <div className="w-full flex flex-col bg-transparent animate-pulse px-4 sm:px-6 md:px-10 lg:px-16 pt-3">
      {/* Page Title Skeleton */}
      <div className="min-h-[144px] py-6 flex flex-col gap-3">
        <div className="w-48 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
        <div className="w-72 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
      </div>
      {/* Segment Tab Skeleton */}
      <div className="w-64 h-12 bg-black/5 dark:bg-surface/5 rounded-2xl mb-8" />
      {/* Cards grid skeleton */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="w-full h-[110px] bg-black/5 dark:bg-surface/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function NewsDataLoader() {
  const [initialNews, initialNoticesData] = await Promise.all([
    getMacroNews(40).catch(() => []),
    getLocalNotices(true).catch(() => ({ notices: [], lastUpdated: null }))
  ]);

  return (
    <NewsClient 
      initialNews={initialNews} 
      initialNotices={initialNoticesData.notices}
    />
  );
}

export default async function NewsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const jsonLd = getNewsMainSchema(baseUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <Suspense fallback={<NewsSkeleton />}>
        <NewsDataLoader />
      </Suspense>

      <section
        id="news-ssr-editorial-guide"
        aria-label="동탄 신도시 부동산 정책·광역교통망 및 화성시 행정 고시공고 해설 가이드"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-8 mt-6 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl text-slate-700 dark:text-slate-300 tabular-nums"
      >
        <header className="mb-6">
          <p className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5">
            PUBLIC INFRASTRUCTURE &amp; POLICY BRIEFING
          </p>
          <h1 className="text-[20px] sm:text-[24px] font-black text-slate-900 dark:text-slate-100 tracking-tight">
            D-VIEW 동탄 소식 및 행정 공지
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed font-medium">
            화성시청 및 동탄출장소의 공식 고시공고와 동탄 1·2신도시 핵심 광역교통망(GTX-A, 동탄 도시철도 트램, 동탄인덕원선, 분당선 연장) 추진 현황을 공공 원문 데이터 기반으로 분석하여 제공합니다.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[12.5px] sm:text-[13px] leading-relaxed">
          <article className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 mb-2.5">
              1. 화성시 공공 고시공고 및 지구단위계획 판독 기준
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              동탄 1·2신도시의 주거 환경과 자산 가치는 화성시청 공식 고시공고(도시계획과, 주택과, 철도트램과, 도로과)에서 발표되는 실시계획인가, 지구단위계획 변경 결정, 기반시설 준공 고시를 통해 구체화됩니다. D-VIEW 동탄 소식 센터는 화성시 행정 게시판 데이터를 정기 수집하여 동탄 권역(오산동, 청계동, 영천동, 목동, 산척동, 신동, 송동, 장지동, 반송동, 능동)과 직접 연관된 도시계획 및 생활 인프라 공지를 선별합니다.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              특히 학교 신설(가칭 초·중·고 중앙투자심사 통과 및 개교 일정), 경부고속도로 직선화 상부공원 조성 사업, 문화디자인밸리 및 광역비즈니스콤플렉스 공공청사·복합환승센터 건립 공고는 인근 단지의 실거주 효용(Utility Score)과 장기 가치평가(DCF 성장률)에 직접적인 영향을 미치는 핵심 선행 지표이므로 착공·준공 시점을 원문 공고문 번호와 함께 교차 확인해야 합니다.
            </p>
          </article>

          <article className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 mb-2.5">
              2. 동탄 광역교통망(GTX-A·트램·동탄인덕원선) 단계별 파급력 해설
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              수도권 광역급행철도 GTX-A 수서~동탄 구간의 개통과 향후 삼성역 무정차 통과 및 완전 개통 일정은 동탄역 도보권(오산동·여울동·청계동 시범단지)의 강남·판교 업무지구 접근 시간을 획기적으로 단축시켰습니다. 이에 더해 동탄 도시철도(트램 1·2호선)는 망포~동탄역~오산 및 병점~동탄역~공세 구간을 동서남북으로 연결하여 비역세권 주거단지(목동, 산척동, 신동, 장지동, 반송동)의 동탄역 환승 저항을 구조적으로 낮추는 핵심 내부 순환망 역할을 수행합니다.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              또한 인덕원~동탄 복선전철(동탄인덕원선)은 동탄1신도시(반송동·능동)와 북동탄·남동탄 거점을 경유하여 과천·안양·판교 테크노밸리 권역과의 철도 연결성을 강화합니다. 각 철도 노선의 기본계획 고시, 노반 공사 발주, 정거장 출입구 위치 확정 및 시운전 일정은 단순 개발 구상 단계와 실제 착공 단계에서 시세 반영 탄력성이 다르므로 공식 철도 행정 공지를 기준으로 판단하는 것이 안전합니다.
            </p>
          </article>

          <article className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 mb-2.5">
              3. 부동산 정책·거시경제 뉴스와 실거래 시세의 시차 분석법
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              국토교통부 주택공급 대책, 한국은행 기준금리 결정, 금융위원회의 스트레스 DSR 단계별 시행 및 특례 대출 한도 조정 등 거시경제 뉴스는 동탄 아파트 시장의 거래량(선행 지표)과 실거래 매매가·전세가(동행 지표)에 통상 1개월~3개월의 시차를 두고 반영됩니다. 거래량이 먼저 회복되거나 축소된 이후 대장주 단지(동탄역 시범단지 및 호수공원 핵심 단지)부터 호가와 실거래 체결가가 반응하는 경향이 뚜렷합니다.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              따라서 언론 보도와 행정 공지를 열람할 때는 단일 기사의 자극적인 제목에 의존하기보다, D-VIEW가 제공하는 단지별 3개월 평균 실거래가, 전세가율(매매 대비 전세 비율), 매매-전세 차액(실구매 자금 부담) 및 20편의 동탄 권역별 심층 비교 가이드 리포트를 함께 대조하여 객관적인 의사결정을 내리는 것을 권장합니다.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}


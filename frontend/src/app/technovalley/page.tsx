import React from 'react';
import { Metadata } from 'next';
import { Building2, Landmark, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import TechnoValleyClient from './TechnoValleyClient';
import { AdSlot } from '@/components/ads/AdSlot';
import { safeJsonLd } from '@/lib/utils/structuredData';
import {
  getTechnoValleyJisanList,
  type TechnoValleyJisan,
} from '@/lib/services/apartmentPageService';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '동탄테크노밸리 56개 지식산업센터 전수 카탈로그 및 법인 세제 혜택 분석 | D-VIEW',
  description:
    '경기도 화성시 동탄테크노밸리 56개 지식산업센터 분양·입주 현황, 연면적·호실수 스펙 비교, 중소기업 취득세 35% 감면·재산세 35% 감면·과밀억제권역 법인세 감면 및 정책자금 대출 데이터를 제공합니다.',
  keywords:
    '동탄테크노밸리, 지식산업센터, 동탄 지식산업센터, 취득세 감면, 재산세 감면, 법인세 감면, 과밀억제권역 법인 이전, 중소기업 정책자금 대출, 오피스 분양, 사옥 이전',
  alternates: {
    canonical: 'https://dongtanview.com/technovalley',
  },
  openGraph: {
    title: '동탄테크노밸리 56개 지식산업센터 전수 카탈로그 및 세제 혜택 | D-VIEW',
    description:
      '동탄테크노밸리 56개 지식산업센터 스펙 비교 및 법인 사옥 이전 취득세·재산세·법인세 감면 분석 리포트.',
    url: 'https://dongtanview.com/technovalley',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
  },
};

function formatAreaM2(val?: number | string): string {
  if (val === undefined || val === null || val === '') return '정보 없음';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num) || num <= 0) return String(val);
  return `${num.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}㎡`;
}

function formatUnits(val?: number | string): string {
  if (val === undefined || val === null || val === '') return '미정';
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/,/g, ''), 10);
  if (!Number.isFinite(num) || num <= 0) return '미정';
  return `${num.toLocaleString('ko-KR')}실`;
}

/**
 * Builds Schema.org JSON-LD graph for TechnoValley 56 Knowledge Industry Centers.
 * @complexity Time: O(N), Space: O(N) where N = 56 centers
 * @sideEffects None (Pure deterministic transformation)
 */
export function buildTechnoValleyJsonLd(
  jisanList: TechnoValleyJisan[],
  baseUrl: string = 'https://dongtanview.com'
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${baseUrl}/technovalley#webpage`,
        url: `${baseUrl}/technovalley`,
        name: '동탄테크노밸리 56개 지식산업센터 전수 카탈로그 및 법인 세제 혜택 분석',
        description:
          '화성시 동탄테크노밸리 권역 내 56개 지식산업센터 건축 면적·호실수·분양 현황 및 취득세·재산세·법인세 감면 혜택 종합 데이터',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: jisanList.length,
          itemListElement: jisanList.map((item, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            item: {
              '@type': 'Place',
              name: item.name,
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'KR',
                addressRegion: '경기도',
                addressLocality: '화성시',
                streetAddress: item.roadAddress || item.jibunAddress || '동탄테크노밸리',
              },
              description: `${item.name} (${item.status || item.buildingStatus || '승인'}, 연면적 ${formatAreaM2(item.totalFloorArea)}, 호실수 ${formatUnits(item.unitCount)})`,
            },
          })),
        },
      },
      {
        '@type': ['FinancialProduct', 'LoanOrCredit'],
        '@id': `${baseUrl}/technovalley#b2b-policy-loan`,
        name: '동탄테크노밸리 지식산업센터 입주 기업 정책자금 및 시설자금 대출',
        description:
          '지식산업센터 최초 분양 및 법인 사옥 이전 기업 대상 취득세 35% 감면, 재산세 35% 감면, 분양가 최대 80% 정책자금 시설대출 안내',
        category: '법인 사옥 이전 / 지식산업센터 시설자금 대출 / 중소기업 정책자금',
        currency: 'KRW',
        provider: {
          '@type': 'FinancialService',
          name: 'D-VIEW 부동산 데이터 랩스',
          url: baseUrl,
        },
      },
    ],
  };
}

export default async function TechnoValleyPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const jisanList = await getTechnoValleyJisanList();
  const jsonLd = buildTechnoValleyJsonLd(jisanList, baseUrl);

  const completedCount = jisanList.filter(
    (item) =>
      (item.status && item.status.includes('완료')) ||
      (item.buildingStatus && item.buildingStatus.includes('준공'))
  ).length;

  const totalUnitsSum = jisanList.reduce((acc, item) => {
    const num = typeof item.unitCount === 'number' ? item.unitCount : parseInt(String(item.unitCount || '0'), 10);
    return acc + (Number.isFinite(num) && num > 0 ? num : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-body font-sans pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      {/* Interactive TechnoValley Client Dashboard */}
      <TechnoValleyClient />

      {/* SSR B2B High-CPC Semantic Catalog & Corporate Tax Benefit Section */}
      <section
        id="technovalley-jisan-ssr-catalog"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-8 my-6"
      >
        <div className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-10">
          {/* Header Summary */}
          <div className="border-b border-border/60 pb-6">
            <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[12px] font-extrabold px-3 py-1 rounded-full mb-3 border border-blue-500/20">
              <Building2 size={14} className="shrink-0" />
              <span>D-VIEW B2B 기업이전·지식산업센터 데이터 랩</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
              동탄테크노밸리 {jisanList.length}개 지식산업센터 전수 카탈로그 및 세제 혜택 분석
            </h1>
            <p className="mt-3 text-secondary text-[14px] sm:text-[15.5px] leading-relaxed max-w-[960px] font-medium">
              수도권 남부 최대 첨단 클러스터인 동탄테크노밸리 내 {jisanList.length}개 지식산업센터(준공·완료 {completedCount}개소, 총 집계 호실 {totalUnitsSum.toLocaleString('ko-KR')}실)의 건축 스펙과 법인 사옥 이전 시 적용되는 취득세·재산세·법인세 감면 및 중소기업 정책자금 금융 조건을 실증 분석합니다.
            </p>
          </div>

          {/* Section 1: Corporate Tax Benefits & Policy Finance Table */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <Landmark size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span>지식산업센터 입주 법인 세제 혜택 및 정책자금 대출 기준표</span>
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table className="w-full text-left text-[13px] text-secondary">
                <caption className="sr-only">
                  동탄테크노밸리 지식산업센터 입주 기업 취득세, 재산세, 법인세 감면 및 정책자금 시설대출 요약표
                </caption>
                <thead className="bg-body text-primary font-bold border-b border-border/60">
                  <tr>
                    <th scope="col" className="p-3.5 whitespace-nowrap">구분 항목</th>
                    <th scope="col" className="p-3.5 whitespace-nowrap">적용 법령 및 근거</th>
                    <th scope="col" className="p-3.5 whitespace-nowrap">감면율 / 한도</th>
                    <th scope="col" className="p-3.5">세부 적용 요건 및 실무 유의사항</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  <tr className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                    <th scope="row" className="p-3.5 font-bold text-primary whitespace-nowrap">취득세 감면</th>
                    <td className="p-3.5 whitespace-nowrap">지방세특례제한법 제58조의2</td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">취득세 35% 감면</td>
                    <td className="p-3.5">최초 분양받아 사업시설용으로 직접 사용하는 중소기업 대상 (유예 기한 내 취득 및 1년 내 직접 사용 조건)</td>
                  </tr>
                  <tr className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                    <th scope="row" className="p-3.5 font-bold text-primary whitespace-nowrap">재산세 감면</th>
                    <td className="p-3.5 whitespace-nowrap">지방세특례제한법 제58조의2</td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">재산세 35% 감면 (5년간)</td>
                    <td className="p-3.5">납세의무 성립일 기준 중소기업이 제조·지식·정보통신산업 사업시설용으로 직접 사용 시 적용</td>
                  </tr>
                  <tr className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                    <th scope="row" className="p-3.5 font-bold text-primary whitespace-nowrap">법인세 / 소득세 감면</th>
                    <td className="p-3.5 whitespace-nowrap">조세특례제한법 제63조</td>
                    <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">최대 100% 면제 (4년+2년 50%)</td>
                    <td className="p-3.5">수도권 과밀억제권역(서울·성남·수원 등)에서 성장관리권역인 화성시 동탄으로 본사/공장 전체 이전 시 적용</td>
                  </tr>
                  <tr className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                    <th scope="row" className="p-3.5 font-bold text-primary whitespace-nowrap">시설자금 및 정책자금 대출</th>
                    <td className="p-3.5 whitespace-nowrap">중소벤처기업진흥공단 / 경기도 육성자금</td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">분양가 70% ~ 80% 이내</td>
                    <td className="p-3.5">기업 신용도 및 기술평가 등급에 따라 정책자금 저리 융자 및 지자체 이차보전(금리 지원) 병행 가능</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-body p-4 rounded-2xl border border-border/50 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-secondary">
                  <strong className="text-primary block mb-0.5">성장관리권역 중과세 배제</strong>
                  화성시 동탄권역은 수도권 성장관리권역으로 분류되어 법인 설립 및 부동산 취득 시 중과세(3배)가 면제됩니다.
                </div>
              </div>
              <div className="bg-body p-4 rounded-2xl border border-border/50 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-secondary">
                  <strong className="text-primary block mb-0.5">GTX-A·SRT 동탄역 직결 비즈니스</strong>
                  수서역 20분, 삼성역 연결 예정 광역교통망과 경부고속도로 기흥동탄IC 인접으로 R&amp;D 및 반도체 협력사 입주 최적지입니다.
                </div>
              </div>
              <div className="bg-body p-4 rounded-2xl border border-border/50 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-secondary">
                  <strong className="text-primary block mb-0.5">5년 의무 보유 및 전매·임대 규정</strong>
                  취득세 감면 수혜 후 5년 이내 매각·증여 또는 타 용도(단순 임대 포함) 전환 시 감면 세액 추징 대상 여부를 사전 점검해야 합니다.
                </div>
              </div>
            </div>
          </div>

          {/* B2B Corporate Relocation Zero-CLS AdSlot */}
          <div
            data-testid="technovalley-b2b-adslot-top"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000002"
              refreshSlotId="1000000002_technovalley_b2b"
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="corporate-relocation"
              apartmentName="동탄테크노밸리"
            />
          </div>

          {/* Section 2: Full 56 Knowledge Industry Centers Catalog Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>화성시·동탄테크노밸리 지식산업센터 {jisanList.length}개소 전수 명부</span>
              </h2>
              <span className="text-[12px] font-semibold text-tertiary">
                한국산업단지공단 FactoryOn 및 지자체 인허가 공공데이터 기준
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table id="jisan-catalog" className="w-full text-left text-[12.5px] text-secondary">
                <caption className="sr-only">
                  화성시 및 동탄테크노밸리 56개 지식산업센터 인허가 상태, 연면적, 호실수, 시행사 및 주소 현황표
                </caption>
                <thead className="bg-body text-primary font-bold border-b border-border/60">
                  <tr>
                    <th scope="col" className="p-3 whitespace-nowrap">순번</th>
                    <th scope="col" className="p-3 whitespace-nowrap">지식산업센터명</th>
                    <th scope="col" className="p-3 whitespace-nowrap">진행 상태</th>
                    <th scope="col" className="p-3 whitespace-nowrap">건축 현황</th>
                    <th scope="col" className="p-3 whitespace-nowrap">분양 유형</th>
                    <th scope="col" className="p-3 whitespace-nowrap">대지면적</th>
                    <th scope="col" className="p-3 whitespace-nowrap">연면적</th>
                    <th scope="col" className="p-3 whitespace-nowrap">호실수</th>
                    <th scope="col" className="p-3 whitespace-nowrap">시행사 / 시공사</th>
                    <th scope="col" className="p-3 whitespace-nowrap">소재지 주소</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {jisanList.map((item) => (
                    <tr
                      key={`${item.seq}-${item.name}`}
                      id={`jisan-${item.seq}`}
                      className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors"
                    >
                      <td className="p-3 text-tertiary whitespace-nowrap">{item.seq}</td>
                      <th scope="row" className="p-3 font-bold text-primary whitespace-nowrap">
                        {item.name}
                      </th>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {item.status || item.regType || '승인'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">{item.buildingStatus || '진행중'}</td>
                      <td className="p-3 whitespace-nowrap">{item.saleType || '분양'}</td>
                      <td className="p-3 whitespace-nowrap">{formatAreaM2(item.landArea)}</td>
                      <td className="p-3 font-bold text-primary whitespace-nowrap">
                        {formatAreaM2(item.totalFloorArea)}
                      </td>
                      <td className="p-3 whitespace-nowrap">{formatUnits(item.unitCount)}</td>
                      <td className="p-3 whitespace-nowrap">
                        {item.developer || item.companyName || '-'} / {item.builder || '-'}
                      </td>
                      <td className="p-3 text-tertiary whitespace-nowrap">
                        {item.roadAddress || item.jibunAddress || '경기도 화성시'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom B2B Zero-CLS AdSlot */}
          <div
            data-testid="technovalley-b2b-adslot-bottom"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000001"
              refreshSlotId="1000000001_technovalley_b2b_bottom"
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="corporate-relocation"
              apartmentName="동탄테크노밸리"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

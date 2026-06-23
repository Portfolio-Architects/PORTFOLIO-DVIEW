import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Landmark, TrendingUp, Sparkles, ShieldCheck, MapPin } from 'lucide-react';
import { headers } from 'next/headers';
import { safeJsonLd } from '@/lib/utils/structuredData';

export const metadata = {
  title: 'D-VIEW 소개 | 동탄 아파트 가치분석의 새로운 기준',
  description: 'D-VIEW의 비전, 부동산 가치 평가 모델(실거주 PER, 입지 유틸리티 스코어, 3D 시그널 맵) 및 데이터 출처와 투명성에 대해 알아봅니다.',
  alternates: {
    canonical: '/about',
  },
};

export default async function AboutPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const nonce = (await headers()).get('x-nonce') || undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${baseUrl}/about#webpage`,
        "url": `${baseUrl}/about`,
        "name": "D-VIEW 소개 | 동탄 아파트 가치분석의 새로운 기준",
        "description": "D-VIEW의 비전, 부동산 가치 평가 모델(실거주 PER, 입지 유틸리티 스코어, 3D 시그널 맵) 및 데이터 출처와 투명성에 대해 알아봅니다.",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "홈",
              "item": baseUrl
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "소개",
              "item": `${baseUrl}/about`
            }
          ]
        }
      },
      {
        "@type": "RealEstateAgent",
        "@id": `${baseUrl}/#agent`,
        "name": "D-VIEW 부동산 데이터 랩스",
        "description": "동탄 전역 아파트 비교 분석 및 AI 매도/전세 안전성 진단 전문 부동산 테크 플랫폼",
        "url": baseUrl,
        "telephone": "+82-2-000-0000",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "KR",
          "addressRegion": "경기도",
          "addressLocality": "화성시 동탄역로"
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-body font-sans pb-20">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <div className="sr-only" aria-hidden="true">
        <h1>동탄 아파트 가치분석 플랫폼 D-VIEW 소개</h1>
        <p>D-VIEW의 비전, 부동산 가치 평가 모델(실거주 PER, 입지 유틸리티 스코어, 3D 시그널 맵) 및 데이터 출처와 투명성에 대해 알아봅니다.</p>
      </div>

      {/* 상단 네비게이션 헤더 */}
      <div className="bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-[880px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-surface/5 text-secondary transition-colors"
              aria-label="홈으로 이동"
            >
              <ArrowLeft size={20} />
            </Link>
            <span className="font-extrabold text-primary text-[17px] sm:text-lg tracking-tight">D-VIEW 소개</span>
          </div>
          <Link href="/" className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px] sm:text-sm hover:underline">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      {/* 본문 콘텐츠 */}
      <main className="max-w-[880px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
        {/* 히어로 영역 */}
        <div className="text-center py-10 sm:py-16 bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-neutral-900 rounded-3xl border border-emerald-100/50 dark:border-emerald-950/50 mb-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
          
          <span className="inline-flex items-center gap-1 bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-[12px] font-extrabold px-3 py-1 rounded-full mb-4 border border-emerald-200/50 dark:border-emerald-800/30">
            <Sparkles size={13} className="text-emerald-500" />
            부동산 정보의 새로운 차원
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight px-4">
            동탄 아파트 가치분석 플랫폼<br className="sm:hidden" /> <span className="text-emerald-600 dark:text-emerald-400">D-VIEW</span>
          </h2>
          <p className="mt-4 text-[13px] sm:text-[15px] text-secondary max-w-[620px] mx-auto px-4 leading-relaxed font-medium">
            D-VIEW는 무겁고 불투명한 부동산 시장 데이터를 정량적인 통계 지표와 시각화 솔루션으로 가공하여, 동탄신도시 아파트 매수 대기자 및 실수요자에게 과학적 의사결정을 돕는 동탄 전문 프롭테크(Proptech) 서비스입니다.
          </p>
        </div>

        {/* 4대 분석 핵심 지표 */}
        <div className="space-y-8">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-primary mb-1 tracking-tight">D-VIEW만의 4대 혁신적 분석 지표</h3>
            <p className="text-[12px] sm:text-[13px] text-tertiary font-medium">단순 직관을 넘어, 객관적인 수치로 증명된 아파트의 본질적 가치를 전달합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: 실거주 PER */}
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-100/50 dark:border-emerald-900/30 group-hover:scale-110 transition-transform">
                  <Landmark size={20} />
                </div>
                <h4 className="text-[15px] sm:text-[16px] font-extrabold text-primary tracking-tight">부동산 실거주 PER (가치 분석)</h4>
                <p className="mt-2 text-[12px] sm:text-[13px] text-secondary leading-relaxed font-medium">
                  주식의 주가수익비율(PER) 방법론을 아파트에 투사합니다. 해당 아파트의 <strong>전세가</strong>를 실거주 가치(주당 순이익)로, <strong>매매가</strong>를 가격(주가)으로 설정하여 그 비율을 측정합니다. 전세가 대비 매매가가 지나치게 높은 단지는 거품 가능성(고평가)을, 전세가율이 높은 단지는 실거주 가치 대비 저평가(갭투자 유망) 상태임을 즉각 판별할 수 있습니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                * 공식: 실거주 PER = 매매가 / 전세가 (PER가 낮을수록 실거주 가치 대비 저평가)
              </div>
            </div>

            {/* Card 2: 입지 유틸리티 스코어 */}
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-100/50 dark:border-emerald-900/30 group-hover:scale-110 transition-transform">
                  <MapPin size={20} />
                </div>
                <h4 className="text-[15px] sm:text-[16px] font-extrabold text-primary tracking-tight">입지 유틸리티 스코어 (Utility Score)</h4>
                <p className="mt-2 text-[12px] sm:text-[13px] text-secondary leading-relaxed font-medium">
                  아파트의 쾌적함과 거주 적합성을 4대 요소로 정밀 분석합니다. <strong>초품아(초등학교 도보거리 300m 이내)</strong> 여부 및 등하교 안전도, <strong>보육 인프라(단지 내 시립 어린이집, 사립 유치원 보행 거리)</strong>, <strong>교통 인프라(동탄역 거리, 신설 예정 트램역 이격거리)</strong>, <strong>상업 인프라(학원 밀집도, 병원, 대형 마트 접근성)</strong>를 실측하여 지표화합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                * 특징: 행정구역 폴백 대신 100% 네이버지도 도보 동선 실측 데이터 오버라이드
              </div>
            </div>

            {/* Card 3: 3D 시그널 맵 */}
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-100/50 dark:border-emerald-900/30 group-hover:scale-110 transition-transform">
                  <TrendingUp size={20} />
                </div>
                <h4 className="text-[15px] sm:text-[16px] font-extrabold text-primary tracking-tight">3D 시그널 맵 (Correlation Map)</h4>
                <p className="mt-2 text-[12px] sm:text-[13px] text-secondary leading-relaxed font-medium">
                  부동산 시장의 대표적 특성인 &apos;대장 아파트의 가격 상승이 주변 아파트로 전이되는 현상(갭 메우기)&apos;을 시각화합니다. 단지별 월간 실거래 가격 추이를 다차원 행렬로 분석하여 동조화 상관계수(Correlation Coefficient)를 계산하고, 이를 WebGL 기반의 인터랙티브 **3D 지식 그래프**로 연결하여 실시간 시세 상승 시그널을 추적합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                * 사용처: 대장 단지의 신정고가 갱신 시, 뒤따라 상승할 타깃 단지 탐색
              </div>
            </div>

            {/* Card 4: 현장 임장 리포트 */}
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300 group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-100/50 dark:border-emerald-900/30 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-[15px] sm:text-[16px] font-extrabold text-primary tracking-tight">현장 팩트체크 임장기 (Scouting Report)</h4>
                <p className="mt-2 text-[12px] sm:text-[13px] text-secondary leading-relaxed font-medium">
                  온라인 공공데이터만으로는 볼 수 없는 단지 내부의 실상을 직접 조사합니다. 조사원들이 직접 방문하여 **경사도 및 단차 구조**, **단지 내 소음(철도/도로 인접 영향)**, **동간 조망 및 프라이버시 침해율**, **커뮤니티 센터 가동율** 등을 현장 캡처 사진과 함께 정성 분석하여 가치를 종합 검증합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                * 특징: 무분별한 광고성 후기를 원천 차단한 D-VIEW 내부 데이터 랩 전용 보고서
              </div>
            </div>
          </div>
        </div>

        {/* 데이터 출처 및 투명성 안내 */}
        <div className="mt-14 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
          <h3 className="text-[16px] sm:text-[18px] font-extrabold text-primary mb-4 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
            공공데이터 출처 및 투명성 선언
          </h3>
          <p className="text-[12px] sm:text-[13px] text-secondary leading-relaxed font-medium mb-4">
            D-VIEW는 공공의 이익을 도모하고 사용자에게 정밀한 정보를 보장하기 위해 대한민국 행정기관 및 유관 단체의 공용 API와 데이터 마스터를 엄격하게 정수 및 가공하여 표출합니다.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] text-secondary font-medium pl-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              국토교통부 실거래가 공개시스템 API
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              행정안전부 지방행정인허가 데이터 (보육)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              화성시청 및 동탄구청 고시/공고 수집 시스템
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              국가교통DB 및 철도산업정보센터 노선 현황
            </li>
          </ul>
        </div>

        {/* 면책 고지 */}
        <div className="mt-8 bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10 text-secondary">
          <h4 className="text-[14px] font-extrabold text-amber-700 dark:text-amber-400 tracking-tight mb-2">⚠️ 서비스 이용약관 관련 면책 고지</h4>
          <p className="text-[11.5px] sm:text-[12px] leading-relaxed font-medium">
            D-VIEW에서 제공하는 적정가 및 자체 밸류에이션 점수(Utility Score, PER 등)는 당사가 보유한 분석 알고리즘에 따른 통계적 추정치입니다. 본 정보는 시세 흐름 참고용이며 투자 제안이나 부동산 거래 권유를 목적으로 하지 않습니다. 시장의 갑작스러운 정책 변화, 거래 침체 등 비합리적 가격 변동성이 수반될 수 있으므로, 부동산 계약에 대한 최종 결정과 판단 책임은 전적으로 투자자와 당사자 본인에게 귀속됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}

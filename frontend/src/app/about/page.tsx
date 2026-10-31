import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Landmark, TrendingUp, Sparkles, ShieldCheck, MapPin, Building2, Percent, CheckCircle2, AlertTriangle, Database, Info } from 'lucide-react';
import { safeJsonLd } from '@/lib/utils/structuredData';

const ABOUT_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent('D-VIEW (디뷰 · 동뷰 · 동탄뷰)')}&subtitle=${encodeURIComponent('동탄 184개 아파트 실거래 시세·전세가율 분석 및 56개 지식산업센터 데이터 랩')}`;

export const metadata: Metadata = {
  title: 'D-VIEW (디뷰 · 동뷰 · 동탄뷰) 소개 | 동탄 184개 아파트 실거래 시세·전세가율 분석',
  description:
    '디뷰(D-VIEW · 동뷰 · 동탄뷰)는 국토교통부 공식 실거래가를 매일 동기화하여 동탄 1·2신도시 184개 아파트 실거래 시세·집값 추이 그래프·전세가율(실거주 PER)·초품아 학군지와 동탄테크노밸리 56개 지식산업센터 세제 혜택을 분석하는 데이터 플랫폼입니다.',
  keywords: [
    'D-VIEW',
    '디뷰',
    '동뷰',
    '동탄뷰',
    '동탄 아파트 시세',
    '동탄 실거래가',
    '동탄 전세가율',
    '동탄 집값 그래프',
    '동탄 학군지',
    '동탄테크노밸리 지식산업센터',
  ],
  alternates: {
    canonical: 'https://dongtanview.com/about',
  },
  openGraph: {
    title: 'D-VIEW (디뷰 · 동뷰 · 동탄뷰) 소개 | 동탄 184개 아파트 실거래 시세·전세가율 분석',
    description:
      '국토교통부 공식 데이터 기반 동탄 184개 아파트 실거래 시세·집값 추이 그래프·전세가율 분석 및 동탄테크노밸리 56개 지식산업센터 통합 포털 디뷰(동뷰·동탄뷰)',
    url: 'https://dongtanview.com/about',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: ABOUT_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'D-VIEW (디뷰 · 동뷰 · 동탄뷰) 동탄 184개 아파트 실거래 시세·전세가율 분석',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'D-VIEW (디뷰 · 동뷰 · 동탄뷰) 소개 | 동탄 184개 아파트 실거래 시세·전세가율 분석',
    description:
      '국토교통부 공식 데이터 기반 동탄 184개 아파트 실거래 시세·집값 추이 그래프·전세가율 분석 플랫폼 디뷰(동뷰·동탄뷰)',
    images: [ABOUT_OG_IMAGE_URL],
  },
};

export default async function AboutPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const nonce = undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${baseUrl}/about#webpage`,
        "url": `${baseUrl}/about`,
        "name": "D-VIEW (디뷰 · 동뷰 · 동탄뷰) 소개 | 동탄 184개 아파트 실거래 시세·전세가율 분석",
        "description": "디뷰(D-VIEW · 동뷰 · 동탄뷰)의 국토교통부 실거래 데이터 연동 기준, 동탄 184개 아파트 실거래 시세·전세가율(실거주 PER)·학군 입지 평가 모델 및 동탄테크노밸리 56개 지식산업센터 분석 엔진을 소개합니다.",
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
        "alternateName": ["디뷰", "동뷰", "동탄뷰", "D-VIEW"],
        "description": "동탄 1·2신도시 184개 아파트 실거래 시세·집값 추이 그래프·전세가율 분석 및 동탄테크노밸리 56개 지식산업센터 데이터 플랫폼",
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
    <div className="min-h-screen bg-body font-sans pb-20 selection:bg-emerald-500/20">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      {/* 상단 네비게이션 헤더 */}
      <div className="bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-surface/5 text-secondary transition-colors"
              aria-label="홈으로 이동"
            >
              <ArrowLeft size={20} />
            </Link>
            <span className="font-extrabold text-primary text-[17px] sm:text-lg tracking-tight">D-VIEW (디뷰 · 동뷰 · 동탄뷰) 소개</span>
          </div>
          <Link href="/" className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px] sm:text-sm hover:underline">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      {/* 본문 콘텐츠 */}
      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
        
        {/* 히어로 비전 카드 */}
        <div className="text-center py-12 sm:py-20 bg-gradient-to-br from-emerald-500/[0.04] to-emerald-500/[0.01] dark:from-emerald-950/20 dark:to-slate-900 rounded-3xl border border-emerald-500/10 dark:border-emerald-950/50 mb-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-3xl" />
          
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-[12px] font-extrabold px-3 py-1 rounded-full mb-5 border border-emerald-500/20 dark:border-emerald-800/30">
            <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
            일터와 삶터의 유기적 융합 · 공공 실거래 데이터 랩
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-primary tracking-tight leading-tight px-4 break-keep">
            <span className="text-emerald-600 dark:text-emerald-400">D-VIEW (디뷰 · 동뷰 · 동탄뷰)</span> 소개
            <span className="block mt-2.5 text-base sm:text-2xl font-extrabold text-primary">
              동탄 184개 아파트 실거래 시세·집값 추이 그래프·전세가율 분석 포털
            </span>
          </h1>
          <p className="mt-5 text-[13px] sm:text-[15.5px] text-secondary max-w-[780px] mx-auto px-6 leading-relaxed font-medium break-keep">
            <strong>디뷰(D-VIEW · 동뷰 · 동탄뷰)</strong>는 국토교통부 공식 실거래가를 매일 동기화하여 <strong>동탄 1·2신도시 184개 아파트 실거래 시세·집값 추이 그래프·전세가율(실거주 PER)·학군지</strong>와 <strong>동탄테크노밸리 56개 지식산업센터의 입주 업종·세제 감면 혜택</strong>을 결합해 주는 데이터 팩트체크 허브입니다. 예비 창업자와 법인에게는 최적의 사옥 스펙과 취득세·재산세 절세 방안을, 실거주 가구에게는 통학 환경과 정량화된 주거 가치 지표를 제공합니다.
          </p>
        </div>

        {/* 핵심 분석 지표 */}
        <div className="space-y-8">
          <div className="border-l-4 border-emerald-500 pl-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight leading-none">D-VIEW만의 핵심 정량 분석 엔진</h2>
            <p className="mt-2 text-[12px] sm:text-[13px] text-tertiary font-medium">정량화된 실계측 연산과 다원화된 공공데이터 결합 모델로 신뢰할 수 있는 인사이트를 제공합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: 실거주 PER */}
            <div className="bg-surface p-6 sm:p-7 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/10 group-hover:scale-105 transition-transform">
                  <Landmark size={22} />
                </div>
                <h3 className="text-[15px] sm:text-[16.5px] font-bold text-primary tracking-tight">부동산 실거주 PER (가치 분석)</h3>
                <p className="mt-3 text-[12px] sm:text-[13.5px] text-secondary leading-relaxed font-medium">
                  금융 시장의 주가수익비율(PER) 방법론을 주거에 이식합니다. 아파트의 <strong>실거래 전세가(실주거 편익)</strong>를 연수익으로, <strong>매매가</strong>를 자산 가치로 규정하여 비율을 산출합니다. 전세가율이 높은 저PER 단지는 안정적인 지지 가격이 형성되어 실소유 시 가격 하방 복원력이 뛰어남을 수치로 분석합니다.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-border/60 text-[11.5px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span>실거주 PER = 매매가 ÷ 전세가 (수치가 낮을수록 내재가치 대비 저평가)</span>
              </div>
            </div>

            {/* Card 2: 입지 유틸리티 스코어 */}
            <div className="bg-surface p-6 sm:p-7 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/10 group-hover:scale-105 transition-transform">
                  <MapPin size={22} />
                </div>
                <h3 className="text-[15px] sm:text-[16.5px] font-bold text-primary tracking-tight">입지 유틸리티 스코어 (Utility Score)</h3>
                <p className="mt-3 text-[12px] sm:text-[13.5px] text-secondary leading-relaxed font-medium">
                  지리 데이터와 행정 인프라 데이터를 융합해 입지 환경을 지표화합니다. 단지에서 배정 초등학교까지의 <strong>실측 도보 거리(초품아 가드레일)</strong>, 반경 내 보육 시설 수, 인근 동탄역/예정 트램역과의 <strong>교통 접근성</strong>, 상권 및 학원가 밀도를 분석하여 주거 편의성을 평가합니다.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-border/60 text-[11.5px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span>특징: 소상공인 상권 밀집도 & 최단 도보 통학로 실측 데이터베이스 연동</span>
              </div>
            </div>

            {/* Card 3: 테크노밸리 공실 & 입주사 매핑 */}
            <div className="bg-surface p-6 sm:p-7 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/10 group-hover:scale-105 transition-transform">
                  <Building2 size={22} />
                </div>
                <h3 className="text-[15px] sm:text-[16.5px] font-bold text-primary tracking-tight">테크노밸리 56개 지식산업센터 & 입주사 매핑</h3>
                <p className="mt-3 text-[12px] sm:text-[13.5px] text-secondary leading-relaxed font-medium">
                  동탄테크노밸리 56개 지식산업센터 전수 인허가 명부와 핵심 10대 단지의 입주사·공실 추이를 연계하여 관리합니다. 공장등록 대장 정보(팩토리온)와 구글 시트 마스터 데이터(SSOT)를 융합하여 업종별(IT, 바이오, 제조업 등) 지형도를 도넛 차트로 실시간 시각화하고, 단지별 대표 기업 배치와 가동 근로자 현황을 추적합니다.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-border/60 text-[11.5px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span>특징: 팩토리온 OpenAPI 및 구글 스프레드시트 Headless 동기화 모델</span>
              </div>
            </div>

            {/* Card 4: 법인 이전 & 직주근접 시뮬레이터 */}
            <div className="bg-surface p-6 sm:p-7 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/10 group-hover:scale-105 transition-transform">
                  <Percent size={22} />
                </div>
                <h3 className="text-[15px] sm:text-[16.5px] font-bold text-primary tracking-tight">법인 이전 & 직주근접 시뮬레이터</h3>
                <p className="mt-3 text-[12px] sm:text-[13.5px] text-secondary leading-relaxed font-medium">
                  수도권 과밀억제권역에서 성장관리권역(동탄 테크노밸리)으로 기업을 이전할 경우 제공되는 법인세 감면 등 세제 혜택을 계측합니다. 동시에 타겟 지산 주변 500m 내 임직원들의 거주 아파트 시세와 공실 여건을 비교 시각화하여, 직주근접 입지 선정과 직원 복지 비용 예측을 지원합니다.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-border/60 text-[11.5px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span>활용: 기업 이전 의사 결정, 맞춤형 거주 복지 및 세법상 세액 감면 추정</span>
              </div>
            </div>

            {/* Card 5: 공동임차 매칭 & 실시간 웹푸시 */}
            <div className="bg-surface p-6 sm:p-7 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group md:col-span-2">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/10 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="text-[15px] sm:text-[16.5px] font-bold text-primary tracking-tight">공동임차 매칭 및 실시간 알림 피드</h3>
                <p className="mt-3 text-[12px] sm:text-[13.5px] text-secondary leading-relaxed font-medium">
                  지속가능한 상업용 부동산 활성화를 위해 커뮤니티 라운지를 연계합니다. 예비 창업자 및 1인 스타트업이 중대형 오피스의 분할 공동 임차 파트너(공유오피스 메이트)를 구할 수 있도록 매칭 서비스를 제공하고, 관심 단지의 실거래 신규 신고가 등록 시 KST 07:00에 실시간 웹 푸시 알림으로 소식을 배달하는 지능형 알림 피드를 탑재했습니다.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-border/60 text-[11.5px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                <span>특징: iOS PWA 독립 실행형 대응 및 Web Push API 표준 규격 전면 연동</span>
              </div>
            </div>

          </div>
        </div>

        {/* 데이터 출처 및 투명성 안내 */}
        <div className="mt-16 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.02] rounded-full blur-2xl" />
          <h2 className="text-[16px] sm:text-[18px] font-extrabold text-primary mb-4 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
            <Database size={18} className="text-emerald-600 dark:text-emerald-400" />
            공공데이터 출처 및 투명성 선언
          </h2>
          <p className="text-[12px] sm:text-[13px] text-secondary leading-relaxed font-medium mb-6">
            D-VIEW(디뷰 · 동뷰 · 동탄뷰)는 공익적 편익과 부동산 정보 투명화를 목표로 동작하며, 공신력 있는 대한민국 행정기관 및 공공 단체의 공식 데이터 파이프라인과 API를 통해 정량화된 수치만을 가공하여 정직하게 표출합니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px] text-secondary font-medium">
            <div className="flex items-center gap-2.5 bg-body p-3 rounded-xl border border-border/40 hover:border-emerald-500/20 transition-colors">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>국토교통부 아파트/오피스 실거래 API</span>
            </div>
            <div className="flex items-center gap-2.5 bg-body p-3 rounded-xl border border-border/40 hover:border-emerald-500/20 transition-colors">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>한국산업단지공단 지식산업센터 현황 API</span>
            </div>
            <div className="flex items-center gap-2.5 bg-body p-3 rounded-xl border border-border/40 hover:border-emerald-500/20 transition-colors">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>전국 등록공장현황 OpenAPI (팩토리온)</span>
            </div>
            <div className="flex items-center gap-2.5 bg-body p-3 rounded-xl border border-border/40 hover:border-emerald-500/20 transition-colors">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>소상공인시장진흥공단 상가 마스터데이터</span>
            </div>
            <div className="flex items-center gap-2.5 bg-body p-3 rounded-xl border border-border/40 hover:border-emerald-500/20 transition-colors">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>행정안전부 지방행정인허가 (보육 데이터)</span>
            </div>
            <div className="flex items-center gap-2.5 bg-body p-3 rounded-xl border border-border/40 hover:border-emerald-500/20 transition-colors">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>Google Sheets API (컨설팅 & 마스터 SSOT)</span>
            </div>
          </div>
        </div>

        {/* 면책 고지 */}
        <div className="mt-8 bg-slate-100/60 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-300/60 text-secondary relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-400" />
          <h4 className="text-[13.5px] sm:text-[14px] font-extrabold text-slate-800 dark:text-slate-400 tracking-tight mb-2.5 flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-slate-600 dark:text-slate-500" />
            서비스 이용약관 관련 면책 고지
          </h4>
          <p className="text-[11.5px] sm:text-[12px] leading-relaxed font-medium break-keep">
            D-VIEW에서 분석 및 연산하여 가공 표출하는 아파트별 실거주 PER, 입지 유틸리티 스코어, 공실 지수 및 예상 법인세 세제 혜택 등은 공공데이터 원천 자료와 독자 개발한 분석 알고리즘에 기초한 통계적 추정치입니다. 제공하는 통계 자료는 투자 판단의 참고 자료일 뿐, 특정 자산의 매매 유도나 보증을 의미하지 않습니다. 정책 변화 및 시장 변동성에 따라 실제 거래 조건과 괴리가 발생할 수 있으므로 최종 결정 및 판단 책임은 거래 당사자 본인에게 귀속됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}

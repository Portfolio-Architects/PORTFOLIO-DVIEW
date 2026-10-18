import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { BookOpen, ArrowRight, Clock, Calendar, CheckCircle2, Bookmark, Compass, Building2 } from 'lucide-react';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { AdSlot } from '@/components/ads/AdSlot';

export const metadata: Metadata = {
  title: '동탄 부동산 가이드 & 시장 심층 분석 리포트 | D-VIEW 인사이트',
  description: '동탄 1·2신도시 입지 격차, GTX-A 및 동탄 트램 1·2호선 수혜 단지, 2026년 스트레스 DSR 40% 규제 환경에서의 실거주 PER 가치평가 및 갈아타기 전략 리포트를 제공합니다.',
  alternates: {
    canonical: 'https://dongtanview.com/guide',
  },
  openGraph: {
    title: '동탄 부동산 가이드 & 시장 심층 분석 리포트 | D-VIEW 인사이트',
    description: '동탄 1·2신도시 입지 격차, GTX-A 및 동탄 트램 1·2호선 수혜 단지, 2026년 스트레스 DSR 40% 규제 환경에서의 실거주 PER 가치평가 및 갈아타기 전략 리포트를 제공합니다.',
    url: 'https://dongtanview.com/guide',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function GuideIndexPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const nonce = undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/guide#webpage`,
    url: `${baseUrl}/guide`,
    name: '동탄 부동산 가이드 & 시장 심층 분석 리포트 | D-VIEW 인사이트',
    description: '동탄 1·2신도시 입지 격차, GTX-A 및 동탄 트램 수혜 단지, 스트레스 DSR 40% 규제 환경의 실거주 PER 가치평가 리포트 모음',
    hasPart: GUIDE_ARTICLES.map((article, idx) => ({
      '@type': 'Article',
      position: idx + 1,
      headline: article.title,
      description: article.description,
      url: `${baseUrl}/guide/${article.slug}`,
      datePublished: article.date,
      author: {
        '@type': 'Organization',
        name: article.author,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-body font-sans pb-20">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      {/* Hero Header */}
      <section className="bg-surface border-b border-border/60 py-12 sm:py-16">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1.5 rounded-full mb-4 border border-emerald-500/20">
            <BookOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
            D-VIEW 부동산 데이터 랩스 공식 인사이트
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-primary tracking-tight leading-tight">
            동탄 부동산 가이드 &amp; 시장 심층 분석 리포트
          </h1>
          <p className="mt-4 text-[14px] sm:text-[16px] text-secondary max-w-[850px] leading-relaxed font-medium">
            동탄 1·2신도시의 구조적 입지 격차부터 GTX-A·트램 역세권 재편 지도, 스트레스 DSR 40% 규제 환경에서의 실거주 PER 가치평가법까지 공공데이터와 정량 퀀트 알고리즘에 기초한 실증 분석 아티클을 제공합니다.
          </p>
        </div>
      </section>

      {/* Main Content Articles */}
      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-8 sm:mt-12 space-y-8">
        {/* Top In-Feed Zero-CLS AdSlot */}
        <div
          data-testid="guide-index-adslot-top"
          className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
        >
          <AdSlot
            slotId="1000000001"
            refreshSlotId="1000000001_guide_index_top"
            format="rectangle"
            minHeightClass="min-h-[250px]"
            cpaCampaignId="mortgage-refinance"
            apartmentName="동탄 가이드"
          />
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 gap-8">
          {GUIDE_ARTICLES.map((article) => (
            <article 
              key={article.slug}
              className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[12px] text-tertiary mb-3">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {article.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {article.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    읽는 시간 약 {article.readingTime}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span>{article.author}</span>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  <Link href={`/guide/${article.slug}`}>
                    {article.title}
                  </Link>
                </h2>

                {/* Subtitle */}
                <p className="mt-2 text-primary/80 font-bold text-[14px] sm:text-[15px]">
                  {article.subtitle}
                </p>

                {/* Description */}
                <p className="mt-3 text-secondary text-[13px] sm:text-[14px] leading-relaxed font-medium">
                  {article.description}
                </p>

                {/* Key Takeaways Box */}
                <div className="mt-5 bg-body p-4 sm:p-5 rounded-2xl border border-border/50">
                  <span className="text-[12px] font-extrabold text-primary mb-2 flex items-center gap-1.5">
                    <Bookmark size={13} className="text-emerald-500 shrink-0" />
                    <span>핵심 리포트 요약</span>
                  </span>
                  <ul className="space-y-2 text-[12.5px] text-secondary font-medium">
                    {article.keyTakeaways.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tags */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="text-[11px] font-semibold text-tertiary bg-black/[0.03] dark:bg-surface/10 px-2.5 py-1 rounded-lg"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="mt-6 pt-5 border-t border-border/60 flex items-center justify-between">
                <span className="text-[12px] text-tertiary font-medium">실증 공공데이터 기반 리서치</span>
                <Link 
                  href={`/guide/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-[13px] sm:text-[14px] hover:underline"
                >
                  전문 읽기
                  <ArrowRight size={16} />
                </Link>
              </div>

            </article>
          ))}
        </div>

        {/* Recirculation Hub Links */}
        <section className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-primary tracking-tight">
              단지별 실거래가 및 테크노밸리 세제 혜택 직접 비교
            </h2>
            <p className="text-[13px] text-secondary mt-1 font-medium">
              184개 아파트 단지 4대 금융 수리 테이블과 56개 지식산업센터 세제 혜택 데이터를 즉시 확인하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold transition-colors"
            >
              <Compass size={15} />
              <span>184개 단지 탐색</span>
            </Link>
            <Link
              href="/technovalley"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[13px] font-bold transition-colors"
            >
              <Building2 size={15} />
              <span>지식산업센터 카탈로그</span>
            </Link>
          </div>
        </section>

        {/* Bottom Zero-CLS AdSlot */}
        <div
          data-testid="guide-index-adslot-bottom"
          className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
        >
          <AdSlot
            slotId="1000000002"
            refreshSlotId="1000000002_guide_index_bottom"
            format="rectangle"
            minHeightClass="min-h-[250px]"
            cpaCampaignId="jeonse-sentinel"
            apartmentName="동탄 가이드"
          />
        </div>

      </main>
    </div>
  );
}

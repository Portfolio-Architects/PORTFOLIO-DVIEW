import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { ArrowLeft, Calendar, Clock, CheckCircle2, ChevronRight, Compass, Building2 } from 'lucide-react';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { AdSlot } from '@/components/ads/AdSlot';

export async function generateStaticParams() {
  return GUIDE_ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const article = GUIDE_ARTICLES.find((a) => a.slug === params.slug);
  if (!article) return { title: '가이드를 찾을 수 없습니다 | D-VIEW' };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const url = `${baseUrl}/guide/${article.slug}`;

  return {
    title: `${article.title} | D-VIEW 인사이트`,
    description: article.description,
    keywords: article.tags.join(', '),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${article.title} | D-VIEW 인사이트`,
      description: article.description,
      url,
      siteName: 'D-VIEW',
      locale: 'ko_KR',
      type: 'article',
      publishedTime: article.date,
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
    },
  };
}

export default async function GuideArticlePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const article = GUIDE_ARTICLES.find((a) => a.slug === params.slug);

  if (!article) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const currentUrl = `${baseUrl}/guide/${article.slug}`;
  const nonce = undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${currentUrl}#article`,
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.updatedDate || article.date,
    author: {
      '@type': 'Organization',
      name: article.author,
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'D-VIEW 부동산 데이터 랩스',
      url: baseUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': currentUrl,
    },
    keywords: article.tags.join(','),
  };

  const otherArticles = GUIDE_ARTICLES.filter((a) => a.slug !== article.slug);

  return (
    <div className="min-h-screen bg-body font-sans pb-24">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      {/* Top Nav Sticky Header */}
      <div className="bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/guide"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-surface/5 text-secondary transition-colors"
              aria-label="가이드 목록으로 이동"
            >
              <ArrowLeft size={18} />
            </Link>
            <span className="font-extrabold text-primary text-[15px] sm:text-base tracking-tight truncate max-w-[240px] sm:max-w-[400px]">
              {article.title}
            </span>
          </div>
          <Link
            href="/guide"
            className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px] sm:text-sm hover:underline shrink-0"
          >
            가이드 목록
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
        
        {/* Breadcrumb */}
        <nav aria-label="브레드크럼" className="flex items-center gap-1.5 text-[12px] text-tertiary mb-4">
          <Link href="/" className="hover:text-primary transition-colors">홈</Link>
          <ChevronRight size={12} />
          <Link href="/guide" className="hover:text-primary transition-colors">부동산 가이드</Link>
          <ChevronRight size={12} />
          <span className="text-secondary font-semibold truncate max-w-[200px]">{article.category}</span>
        </nav>

        {/* Article Container */}
        <article className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-12 shadow-sm space-y-8">
          
          {/* Header */}
          <header className="border-b border-border/60 pb-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[12px] text-tertiary">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                {article.category}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {article.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} />
                약 {article.readingTime} 소요
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-semibold text-secondary">{article.author}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary tracking-tight leading-tight">
              {article.title}
            </h1>

            <p className="text-[15px] sm:text-[17px] font-bold text-primary/80 leading-relaxed">
              {article.subtitle}
            </p>

            <p className="text-[13.5px] sm:text-[15px] text-secondary leading-relaxed font-medium">
              {article.description}
            </p>
          </header>

          {/* Key Takeaways Callout */}
          <div className="bg-emerald-500/[0.04] dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-[14px]">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>본 리포트의 핵심 결론 및 요약 (Key Takeaways)</span>
            </div>
            <ul className="space-y-2 text-[13px] sm:text-[14px] text-secondary font-medium pl-6 list-disc">
              {article.keyTakeaways.map((point, idx) => (
                <li key={idx} className="leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Mid-Article Zero-CLS AdSlot */}
          <div
            data-testid="guide-article-adslot-top"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000002"
              refreshSlotId={`1000000002_guide_${article.slug}_top`}
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="mortgage-refinance"
              apartmentName={article.title}
            />
          </div>

          {/* Body Content */}
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-secondary leading-relaxed space-y-6 pt-4 font-medium">
            {article.content.split('\n\n').map((paragraph, pIdx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;

              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={pIdx} className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-10 mb-4 pb-2 border-b border-border/40">
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }
              if (trimmed.startsWith('#### ')) {
                return (
                  <h4 key={pIdx} className="text-base sm:text-lg font-extrabold text-primary tracking-tight mt-6 mb-2">
                    {trimmed.replace('#### ', '')}
                  </h4>
                );
              }
              if (trimmed.startsWith('---')) {
                return <hr key={pIdx} className="my-8 border-border/60" />;
              }
              if (trimmed.startsWith('|')) {
                // Render table rows
                const rows = trimmed.split('\n').filter(r => !r.includes('---'));
                const headers = rows[0]?.split('|').map(c => c.trim()).filter(Boolean) || [];
                const dataRows = rows.slice(1);

                return (
                  <div key={pIdx} className="overflow-x-auto my-6 rounded-2xl border border-border/60">
                    <table className="w-full text-left text-[12.5px] text-secondary">
                      <thead className="bg-body text-primary font-bold border-b border-border/60">
                        <tr>
                          {headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-3.5 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-medium">
                        {dataRows.map((r, rIdx) => {
                          const cells = r.split('|').map(c => c.trim()).filter(Boolean);
                          return (
                            <tr key={rIdx} className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                              {cells.map((cell, cIdx) => (
                                <td key={cIdx} className="p-3.5 whitespace-nowrap">
                                  {cell.replace(/\*\*/g, '')}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (trimmed.startsWith('```')) {
                return null; // Skip raw mermaid code in text view
              }

              return (
                <p key={pIdx} className="text-[14px] sm:text-[15.5px] leading-relaxed break-keep">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Tags */}
          <div className="pt-6 border-t border-border/60 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-[12px] font-semibold text-tertiary bg-body px-3 py-1 rounded-xl border border-border/50"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Footer Article Zero-CLS AdSlot */}
          <div
            data-testid="guide-article-adslot-bottom"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000002"
              refreshSlotId={`1000000002_guide_${article.slug}_bottom`}
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="jeonse-sentinel"
              apartmentName={article.title}
            />
          </div>

          {/* Footer Author & Recirculation Box */}
          <div className="bg-body p-6 rounded-2xl border border-border/60 flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider block">작성 주체</span>
              <strong className="text-[15px] font-black text-primary">{article.author}</strong>
              <p className="text-[12px] text-secondary mt-0.5">국토교통부 실거래가 및 행정 인프라 공공데이터 융합 퀀트 리서치</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-bold transition-colors"
              >
                <Compass size={14} />
                <span>단지별 실거래가 탐색</span>
              </Link>
              <Link
                href="/technovalley"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[12.5px] font-bold transition-colors"
              >
                <Building2 size={14} />
                <span>지식산업센터 세제 분석</span>
              </Link>
            </div>
          </div>

        </article>

        {/* Read Next Other Articles */}
        <section className="mt-12 space-y-4">
          <h3 className="text-lg font-black text-primary tracking-tight">다른 추천 리포트</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherArticles.map((nextArt) => (
              <Link
                key={nextArt.slug}
                href={`/guide/${nextArt.slug}`}
                className="bg-surface border border-border/80 rounded-2xl p-5 shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block mb-1">
                    {nextArt.category}
                  </span>
                  <h4 className="text-[14px] sm:text-[15px] font-bold text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {nextArt.title}
                  </h4>
                  <p className="text-[12px] text-secondary mt-1.5 line-clamp-2 font-medium">
                    {nextArt.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/40 text-[12px] text-tertiary flex items-center justify-between">
                  <span>약 {nextArt.readingTime}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">읽기 →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}

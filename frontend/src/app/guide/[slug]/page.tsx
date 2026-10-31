import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { ChevronRight, Scale, HelpCircle, ArrowUpRight } from 'lucide-react';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { GUIDE_ARTICLES, buildGuideArticleJsonLd } from '@/lib/data/guides';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { AdSlot } from '@/components/ads/AdSlot';
import ReportShareBar from '@/components/common/ReportShareBar';
import { getTxSummaryData, formatPriceEok } from '@/lib/services/apartmentPageService';
import { getZoneById } from '@/lib/zones';

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
  const metaTitle = article.seoTitle || `${article.title} | D-VIEW 인사이트`;
  const metaDescription = article.seoDescription || article.description;
  const ogImageUrl = `${baseUrl}/api/og?title=${encodeURIComponent(article.title)}&subtitle=${encodeURIComponent(`${article.category} · 국토부 실거래 실증 비교`)}`;

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: article.tags.join(', '),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url,
      siteName: 'D-VIEW',
      locale: 'ko_KR',
      type: 'article',
      publishedTime: article.date,
      modifiedTime: article.updatedDate || article.date,
      authors: [article.author],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: metaTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: [ogImageUrl],
    },
  };
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-extrabold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part.replace(/\*\*/g, '');
  });
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = line
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function renderGuideBodyContent(rawContent: string): React.ReactNode[] {
  const withoutCodeFences = rawContent.replace(/```[\s\S]*?```/g, '');
  const lines = withoutCodeFences.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === '---') {
      elements.push(<hr key={`hr-${i}`} className="my-8 border-border/60" />);
      i += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-10 mb-4 pb-2 border-b border-border/40"
        >
          {renderInlineBold(trimmed.slice(4).trim())}
        </h3>
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-base sm:text-lg font-extrabold text-primary tracking-tight mt-6 mb-2"
        >
          {renderInlineBold(trimmed.slice(5).trim())}
        </h4>
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith('|')) {
      const startIdx = i;
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i += 1;
      }

      const contentRows = tableLines.filter((row) => !isMarkdownTableSeparator(row));
      const headers =
        contentRows[0]
          ?.split('|')
          .map((c) => c.trim())
          .filter(Boolean) || [];
      const dataRows = contentRows.slice(1);

      elements.push(
        <div key={`table-${startIdx}`} className="overflow-x-auto my-6 rounded-xl border border-border/60">
          <table className="w-full text-left text-[12.5px] text-secondary">
            <thead className="bg-body text-primary font-bold border-b border-border/60">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="p-3.5 whitespace-nowrap">
                    {renderInlineBold(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {dataRows.map((r, rIdx) => {
                const cells = r
                  .split('|')
                  .map((c) => c.trim())
                  .filter(Boolean);
                return (
                  <tr key={rIdx} className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3.5 whitespace-nowrap tabular-nums">
                        {renderInlineBold(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('- ')) {
      const startIdx = i;
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2).trim());
        i += 1;
      }
      elements.push(
        <ul
          key={`ul-${startIdx}`}
          className="space-y-2 pl-5 list-disc text-[14px] sm:text-[15.5px] leading-relaxed"
        >
          {items.map((item, idx) => (
            <li key={idx} className="break-keep">
              {renderInlineBold(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const startIdx = i;
      const orderedItems: Array<{ mainText: string; subBullets: string[] }> = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const mainText = lines[i].trim().replace(/^\d+\.\s+/, '').trim();
        i += 1;
        const subBullets: string[] = [];
        while (i < lines.length && /^\s{2,}-\s+/.test(lines[i])) {
          subBullets.push(lines[i].trim().replace(/^-\s+/, '').trim());
          i += 1;
        }
        orderedItems.push({ mainText, subBullets });
      }
      elements.push(
        <ol
          key={`ol-${startIdx}`}
          className="space-y-2.5 pl-5 list-decimal text-[14px] sm:text-[15.5px] leading-relaxed"
        >
          {orderedItems.map((item, idx) => (
            <li key={idx} className="break-keep">
              <span>{renderInlineBold(item.mainText)}</span>
              {item.subBullets.length > 0 && (
                <ul className="mt-1.5 space-y-1 pl-4 list-disc text-[13.5px] sm:text-[14.5px] text-secondary">
                  {item.subBullets.map((sub, subIdx) => (
                    <li key={subIdx} className="break-keep">
                      {renderInlineBold(sub)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const startIdx = i;
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur === '---' ||
        cur.startsWith('### ') ||
        cur.startsWith('#### ') ||
        cur.startsWith('|') ||
        cur.startsWith('- ') ||
        /^\d+\.\s+/.test(cur)
      ) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }

    elements.push(
      <p key={`p-${startIdx}`} className="text-[14px] sm:text-[15.5px] leading-relaxed break-keep">
        {renderInlineBold(paraLines.join(' '))}
      </p>
    );
  }

  return elements;
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
  const nonce = undefined;
  const jsonLd = buildGuideArticleJsonLd(article, baseUrl);

  const otherArticles = GUIDE_ARTICLES.filter((a) => a.slug !== article.slug);
  const txSummary = await getTxSummaryData();

  const mapAptMetric = (aptName: string) => {
    const s = txSummary[aptName];
    if (!s) return null;
    const latestPrice = s.latestPrice || 0;
    const latestRent = s.latestRentDeposit || 0;
    const salesBase = s.avg1MPrice || s.avg3MPrice || latestPrice;
    const rentBase = s.avg1MRentDeposit || s.avg3MRentDeposit || latestRent;
    const rawRatio =
      salesBase > 0 && rentBase > 0 ? Math.round((rentBase / salesBase) * 100) : 0;
    const jeonseRatio = rawRatio > 0 && rawRatio <= 100 ? rawRatio : 0;
    return {
      name: aptName,
      dong: s.dong || '동탄',
      latestPriceStr:
        s.latestPriceEok || (latestPrice > 0 ? formatPriceEok(latestPrice) : '정보 없음'),
      latestRentStr:
        s.latestRentDepositEok || (latestRent > 0 ? formatPriceEok(latestRent) : '정보 없음'),
      jeonseRatio,
      txCount: s.txCount || 0,
    };
  };

  const featuredAptRows = (article.featuredApartments || [])
    .map(mapAptMetric)
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const headToHeadRows = (article.headToHeadComparisons || [])
    .map((matchup) => {
      const left = mapAptMetric(matchup.leftApt);
      const right = mapAptMetric(matchup.rightApt);
      if (!left || !right) return null;
      return {
        ...matchup,
        left,
        right,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const featuredZoneItems = (article.featuredZones || [])
    .map((zId) => getZoneById(zId))
    .filter((z): z is NonNullable<typeof z> => z !== undefined);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      <LoungeHeader activeTab="guide" />

      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto min-w-0">
        <PageHeroHeader
          isTitleDiv
          title="D-VIEW 부동산 가이드"
          compactTitle={article.title}
          subtitleStrong={<MarketStatsStrong />}
          subtitleLight={<MarketStatsLight text={`${article.category} · ${article.title}`} />}
        />

        <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-full max-w-full min-w-0 gap-6 box-border">
          {/* Sub-Navigation & Breadcrumb Control Bar */}
          <div className="w-full p-2.5 sm:p-3.5 rounded-2xl bg-surface border border-border/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="브레드크럼" className="flex items-center gap-1.5 text-[12px] text-tertiary">
              <Link href="/" className="hover:text-primary transition-colors">홈</Link>
              <ChevronRight size={12} />
              <Link href="/guide" className="hover:text-primary transition-colors">부동산 가이드</Link>
              <ChevronRight size={12} />
              <span className="text-secondary font-semibold truncate max-w-[220px] sm:max-w-[360px]">{article.category}</span>
            </nav>

            <Link
              href="/guide"
              aria-label="가이드 목록으로 이동"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-body hover:bg-slate-100 dark:hover:bg-slate-800 border border-border/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-colors shrink-0"
            >
              <span>가이드 목록</span>
            </Link>
          </div>

          {/* Article Container */}
          <article className="bg-surface border border-border/80 rounded-2xl p-5 sm:p-8 lg:p-10 shadow-xs space-y-8">
            {/* Header */}
            <header className="border-b border-border/60 pb-6 sm:pb-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[12px] text-tertiary">
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {article.category}
                </span>
                <span className="flex items-center gap-1">
                  {article.date}
                </span>
                <span className="flex items-center gap-1">
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
                <span>본 리포트의 핵심 결론 및 요약 (Key Takeaways)</span>
              </div>
              <ul className="space-y-2 text-[13px] sm:text-[14px] text-secondary font-medium pl-5 list-disc">
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
            <div
              id="guide-article-body"
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-secondary leading-relaxed space-y-5 pt-2 font-medium"
            >
              {renderGuideBodyContent(article.content)}
            </div>

            {/* Live 1:1 Head-to-Head Real-Data Matchups */}
            {headToHeadRows.length > 0 && (
              <section
                id="guide-head-to-head-comparison"
                aria-label="핵심 단지 1:1 국토교통부 실거래 맞대결 비교"
                className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5"
              >
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                    <Scale size={19} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>핵심 대표 단지 1:1 실거래 맞대결 (국토교통부 실데이터)</span>
                  </h3>
                  <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                    실수요자가 가장 많이 함께 비교하는 양대 대표 단지의 최근 매매 실거래가·전세가·전세가율·누적 거래량을 직접 대조합니다.
                  </p>
                </div>

                <div className="space-y-4">
                  {headToHeadRows.map((matchup) => (
                    <div
                      key={`${matchup.left.name}-vs-${matchup.right.name}`}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 space-y-4"
                    >
                      <div>
                        <h4 className="text-[15px] sm:text-base font-extrabold text-slate-900 dark:text-slate-50">
                          {matchup.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                          {matchup.subtitle}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {[
                          { side: 'LEFT', label: matchup.leftLabel, apt: matchup.left, accent: 'emerald' as const },
                          { side: 'RIGHT', label: matchup.rightLabel, apt: matchup.right, accent: 'blue' as const },
                        ].map((card) => (
                          <div
                            key={card.apt.name}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span
                                  className={
                                    card.accent === 'emerald'
                                      ? 'inline-block text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md'
                                      : 'inline-block text-[11px] font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md'
                                  }
                                >
                                  {card.label}
                                </span>
                                <Link
                                  href={`/apartment/${encodeURIComponent(card.apt.name)}`}
                                  prefetch={false}
                                  className="mt-1.5 flex items-center gap-1 text-[15px] font-black text-slate-900 dark:text-slate-50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                >
                                  <span>{card.apt.name}</span>
                                  <ArrowUpRight size={14} className="shrink-0 text-slate-400" />
                                </Link>
                              </div>
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                                {card.apt.dong}
                              </span>
                            </div>

                            <dl className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                              <div>
                                <dt className="text-slate-500 dark:text-slate-400 font-medium">최근 매매 실거래</dt>
                                <dd className="mt-0.5 text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                                  {card.apt.latestPriceStr}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500 dark:text-slate-400 font-medium">최근 전세 실거래</dt>
                                <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                  {card.apt.latestRentStr}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500 dark:text-slate-400 font-medium">전세가율 (하방지지)</dt>
                                <dd className="mt-0.5 font-extrabold tabular-nums text-slate-800 dark:text-slate-200">
                                  {card.apt.jeonseRatio > 0 ? `${card.apt.jeonseRatio}%` : '정보 없음'}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500 dark:text-slate-400 font-medium">누적 실거래량</dt>
                                <dd className="mt-0.5 font-extrabold tabular-nums text-slate-800 dark:text-slate-200">
                                  {card.apt.txCount > 0 ? `${card.apt.txCount.toLocaleString()}건` : '정보 없음'}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 px-3.5 py-2.5 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                        <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold mr-1.5">
                          데이터 판정:
                        </strong>
                        {matchup.verdict}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Live Real-Data Comparison Table & Zone Links */}
            {(featuredAptRows.length > 0 || featuredZoneItems.length > 0) && (
              <section
                id="guide-live-data-comparison"
                aria-label="리포트 연관 주요 아파트 국토교통부 실거래 비교표"
                className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                      <span>리포트 핵심 아파트 국토교통부 최신 실거래가 비교표</span>
                    </h3>
                    <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                      본 칼럼에서 다룬 대표 단지의 실제 실거래가·전세가율 현황입니다. 단지명을 클릭하면 평형별 시세와 DSR 대출 한도 리포트로 이동합니다.
                    </p>
                  </div>
                  {featuredZoneItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {featuredZoneItems.map((zone) => (
                        <Link
                          key={zone.id}
                          href={`/zone/${zone.id}`}
                          prefetch={false}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          <span>{zone.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {featuredAptRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-[12.5px] sm:text-[13px] text-slate-600 dark:text-slate-400">
                      <caption className="sr-only">
                        리포트 연관 주요 아파트 단지별 행정동, 최근 실거래 매매가, 최근 전세가, 전세가율 및 누적 거래량 비교표
                      </caption>
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-50 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th scope="col" className="p-3.5 whitespace-nowrap">단지명 (상세 리포트)</th>
                          <th scope="col" className="p-3.5 whitespace-nowrap">행정동</th>
                          <th scope="col" className="p-3.5 whitespace-nowrap">최근 실거래 매매가</th>
                          <th scope="col" className="p-3.5 whitespace-nowrap">최근 전세가</th>
                          <th scope="col" className="p-3.5 whitespace-nowrap">전세가율</th>
                          <th scope="col" className="p-3.5 whitespace-nowrap">누적 거래량</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
                        {featuredAptRows.map((apt) => (
                          <tr key={apt.name} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                            <th scope="row" className="p-3.5 font-extrabold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                              <Link
                                href={`/apartment/${encodeURIComponent(apt.name)}`}
                                prefetch={false}
                                className="text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{apt.name}</span>
                              </Link>
                            </th>
                            <td className="p-3.5 whitespace-nowrap">{apt.dong}</td>
                            <td className="p-3.5 tabular-nums font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {apt.latestPriceStr}
                            </td>
                            <td className="p-3.5 tabular-nums whitespace-nowrap">{apt.latestRentStr}</td>
                            <td className="p-3.5 tabular-nums whitespace-nowrap">
                              {apt.jeonseRatio > 0 ? `${apt.jeonseRatio}%` : '정보 없음'}
                            </td>
                            <td className="p-3.5 tabular-nums whitespace-nowrap">
                              {apt.txCount > 0 ? `${apt.txCount.toLocaleString()}건` : '정보 없음'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Visible FAQ Section (Synchronized 1:1 with FAQPage Schema.org Rich Snippet) */}
            {article.faqs && article.faqs.length > 0 && (
              <section
                id="guide-faq-section"
                aria-label="리포트 자주 묻는 핵심 질문 FAQ"
                className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
              >
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  <HelpCircle size={19} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>자주 묻는 핵심 질문 (FAQ)</span>
                </h3>
                <dl className="space-y-3">
                  {article.faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-1.5"
                    >
                      <dt className="text-[13.5px] sm:text-[14.5px] font-extrabold text-slate-900 dark:text-slate-100">
                        Q. {faq.question}
                      </dt>
                      <dd className="text-xs sm:text-[13.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {faq.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

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

            {/* One-Click Viral Summary Share Bar */}
            <ReportShareBar
              title={article.title}
              summaryLines={article.keyTakeaways}
              canonicalPath={`/guide/${article.slug}`}
              campaign={`guide_${article.slug}`}
            />

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
            <div className="bg-body p-5 sm:p-6 rounded-2xl border border-border/60 flex items-center justify-between flex-wrap gap-4">
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
                  <span>단지별 실거래가 탐색</span>
                </Link>
                <Link
                  href="/technovalley"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[12.5px] font-bold transition-colors"
                >
                  <span>지식산업센터 세제 분석</span>
                </Link>
              </div>
            </div>
          </article>

          {/* Read Next Other Articles */}
          <section className="space-y-4">
            <h3 className="text-lg font-black text-primary tracking-tight">다른 추천 리포트</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherArticles.map((nextArt) => (
                <Link
                  key={nextArt.slug}
                  href={`/guide/${nextArt.slug}`}
                  className="bg-surface border border-border/80 rounded-2xl p-5 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
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
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>읽기</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <MobileDock activeTab="guide" />
    </div>
  );
}

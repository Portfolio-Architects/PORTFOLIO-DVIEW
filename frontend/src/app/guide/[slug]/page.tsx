import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { DviewIcon } from '@/components/common/DviewIcon';
import {
  GUIDE_ARTICLES,
  TOP_POPULAR_GUIDE_SLUGS,
  TOP_ACQUISITION_ENTRY_ROUTES,
  GUIDE_TOPIC_CLUSTERS,
  GUIDE_DEFAULT_TX_SUMMARY_MAP,
  buildGuideArticleJsonLd,
  buildGuideAptMiniPreview,
  resolveGuideZoneSectionPreviews,
  normalizeGuideAptName,
  getTopicClusterForGuide,
  getRelatedGuidesForGuide,
  isTopLandingGuideSlug,
  resolveGuideRepresentativeAptCtas,
  resolveMidSectionRepresentativeAptCtas,
  type GuideAptMiniPreviewItem,
  type ResolvedGuideZoneSectionPreview,
} from '@/lib/data/guides';
import { safeJsonLd } from '@/lib/utils/structuredData';
import type { GuideSectionAnchorItem } from '@/components/guide/GuideMobileScrollDepthBar';
import { truncateToCopyBudget } from '@/lib/design-system/copyDiet';
import { getTxSummaryData } from '@/lib/services/apartmentPageService';
import { getZoneById } from '@/lib/zones';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import {
  CANONICAL_DONG_APT_LIST,
  CANONICAL_TX_SUMMARY_MAP,
} from '@/lib/utils/canonicalAptCatalog';
import {
  extractGuideSectionHeadingsCore,
  renderInlineBoldCore,
  renderGuideBodyContentCore,
  type ExtractedGuideHeading,
  type InlineAptResolution,
} from '@/components/guide/guideContentRenderer';
import GuideArticleContentClient from '@/components/guide/GuideArticleContentClient';

export type { ExtractedGuideHeading };

export const dynamic = 'force-static';
export const revalidate = false;
export const dynamicParams = false;

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
  if (!article) {
    return {
      title: '가이드를 찾을 수 없습니다 | D-VIEW',
      robots: { index: false, follow: false },
    };
  }

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
      types: {
        'application/rss+xml': `${baseUrl}/feed.xml`,
      },
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

let baseInlineSlugLookupEntriesCache: Array<[string, string]> | null = null;
let baseInlineSlugLookupMapCache: Map<string, string> | null = null;

function getBaseInlineSlugLookupEntries(): Array<[string, string]> {
  if (baseInlineSlugLookupEntriesCache) return baseInlineSlugLookupEntriesCache;
  const map = new Map<string, string>();
  for (const entry of CANONICAL_DONG_APT_LIST) {
    if (!CANONICAL_TX_SUMMARY_MAP[entry.txKey] && !GUIDE_DEFAULT_TX_SUMMARY_MAP[entry.txKey]) {
      continue;
    }
    for (const alias of [entry.txKey, entry.name]) {
      const norm = normalizeGuideAptName(alias);
      if (norm.length >= 2 && !map.has(norm)) {
        map.set(norm, entry.txKey);
      }
    }
  }
  for (const txKey of Object.keys(GUIDE_DEFAULT_TX_SUMMARY_MAP)) {
    const norm = normalizeGuideAptName(txKey);
    if (norm.length >= 2 && !map.has(norm)) {
      map.set(norm, txKey);
    }
  }
  baseInlineSlugLookupEntriesCache = Array.from(map.entries());
  baseInlineSlugLookupMapCache = map;
  return baseInlineSlugLookupEntriesCache;
}

function getBaseInlineSlugLookupMap(): Map<string, string> {
  if (baseInlineSlugLookupMapCache) return baseInlineSlugLookupMapCache;
  getBaseInlineSlugLookupEntries();
  return baseInlineSlugLookupMapCache!;
}

function resolveKnownDong(slug: string): string {
  const knownTx = CANONICAL_TX_SUMMARY_MAP[slug] || GUIDE_DEFAULT_TX_SUMMARY_MAP[slug];
  return knownTx?.dong || '';
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractInlineAptTokensForArticle(
  rawContent: string,
  inlineSlugLookup: Map<string, string>
): Record<string, InlineAptResolution> {
  const withoutCodeFences = rawContent.replace(/```[\s\S]*?```/g, '');
  const tokenMap: Record<string, InlineAptResolution> = {};
  const tokenRegex =
    /(\*\*\[[^\]]+\]\(\/(?:guide|apartment|zone)\/(?:\([^)]*\)|[^)])+\)\*\*|\[[^\]]+\]\(\/(?:guide|apartment|zone)\/(?:\([^)]*\)|[^)])+\)|\*\*[^*]+\*\*)/g;

  const scanText = (segment: string) => {
    for (const m of segment.matchAll(tokenRegex)) {
      const part = m[0];
      const unwrapped =
        part.startsWith('**') && part.endsWith('**') && part.includes('](/')
          ? part.slice(2, -2)
          : part;
      const mdMatch = unwrapped.match(
        /^\[([^\]]+)\]\((\/(?:guide|apartment|zone)\/(?:\([^)]*\)|[^)])+)\)$/
      );
      if (mdMatch) {
        const rawHref = mdMatch[2].trim();
        if (rawHref.startsWith('/apartment/')) {
          const rawApt = safeDecodeURIComponent(rawHref.slice('/apartment/'.length)).trim();
          const normApt = normalizeGuideAptName(rawApt);
          const resolvedSlug =
            (normApt ? inlineSlugLookup.get(normApt) : undefined) ||
            resolveCanonicalAptSlug(rawApt) ||
            rawApt;
          tokenMap[`apt:${rawApt}`] = [resolvedSlug, resolveKnownDong(resolvedSlug)];
        }
        continue;
      }

      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const innerText = part.slice(2, -2);
        if (/\[[^\]]+\]\(\/(?:guide|apartment|zone)\//.test(innerText)) {
          scanText(innerText);
          continue;
        }
        const normKey = normalizeGuideAptName(innerText);
        const strippedParenBase = innerText.replace(/\s*\([^)]*\)\s*$/, '').trim();
        const fallbackNormKey =
          strippedParenBase && strippedParenBase !== innerText
            ? normalizeGuideAptName(strippedParenBase)
            : '';
        const matchedSlug =
          normKey.length >= 2
            ? inlineSlugLookup.get(normKey) ||
              (fallbackNormKey.length >= 2 ? inlineSlugLookup.get(fallbackNormKey) : undefined)
            : undefined;
        if (matchedSlug) {
          tokenMap[`bold:${innerText}`] = [matchedSlug, resolveKnownDong(matchedSlug)];
        }
      }
    }
  };

  scanText(withoutCodeFences);
  return tokenMap;
}

export function renderInlineBold(
  text: string,
  inlineSlugLookup?: Map<string, string>,
  guideSlug = 'guide'
): React.ReactNode {
  return renderInlineBoldCore(text, guideSlug, {
    inlineSlugLookup: inlineSlugLookup ?? getBaseInlineSlugLookupMap(),
    resolveDongBySlug: resolveKnownDong,
    resolveFallbackSlug: (rawApt) => resolveCanonicalAptSlug(rawApt) || rawApt,
    normalizeAptName: normalizeGuideAptName,
  });
}

export function extractGuideSectionHeadings(rawContent: string): ExtractedGuideHeading[] {
  return extractGuideSectionHeadingsCore(rawContent);
}

export function renderGuideBodyContent(
  rawContent: string,
  options?: {
    guideSlug: string;
    zoneSectionPreviews: ResolvedGuideZoneSectionPreview[];
    inlineSlugLookup: Map<string, string>;
    lakeEduTownPreview?: GuideAptMiniPreviewItem | null;
    featuredAptRows?: GuideAptMiniPreviewItem[];
  }
): React.ReactNode[] {
  const guideSlug = options?.guideSlug || 'guide';
  return renderGuideBodyContentCore(rawContent, {
    guideSlug,
    isTopLandingGuide: isTopLandingGuideSlug(guideSlug),
    adsenseApprovalMode: process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true',
    zoneSectionPreviews: options?.zoneSectionPreviews || [],
    inlineSlugLookup: options?.inlineSlugLookup ?? getBaseInlineSlugLookupMap(),
    resolveDongBySlug: resolveKnownDong,
    resolveFallbackSlug: (rawApt) => resolveCanonicalAptSlug(rawApt) || rawApt,
    normalizeAptName: normalizeGuideAptName,
    lakeEduTownPreview:
      options?.lakeEduTownPreview !== undefined
        ? options.lakeEduTownPreview
        : buildGuideAptMiniPreview('동탄더샵레이크에듀타운'),
    featuredAptRows: options?.featuredAptRows,
    resolveMidRepApts: resolveMidSectionRepresentativeAptCtas,
  });
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

  const topicCluster = getTopicClusterForGuide(article);
  const clusterRelatedGuides = getRelatedGuidesForGuide(article, 6);
  const relatedSlugSet = new Set(clusterRelatedGuides.map((g) => g.slug));
  const otherArticles = GUIDE_ARTICLES.filter(
    (a) => a.slug !== article.slug && !relatedSlugSet.has(a.slug)
  );
  const txSummary = await getTxSummaryData();

  const mapAptMetric = (aptName: string): GuideAptMiniPreviewItem | null =>
    buildGuideAptMiniPreview(aptName, txSummary);

  const lakeEduTownPreview = mapAptMetric('동탄더샵레이크에듀타운');

  const isTopLandingGuide = isTopLandingGuideSlug(article.slug);
  const topRepAptCtas = resolveGuideRepresentativeAptCtas(article, txSummary, 3);

  const featuredAptRows = (article.featuredApartments || [])
    .map(mapAptMetric)
    .filter((item): item is GuideAptMiniPreviewItem => item !== null);

  const clusterFlagshipAptRows = (topicCluster?.flagshipApartments || [])
    .map(mapAptMetric)
    .filter((item): item is GuideAptMiniPreviewItem => item !== null);

  const zoneSectionPreviews = resolveGuideZoneSectionPreviews(article, txSummary);

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

  const inlineSlugLookup = new Map<string, string>();
  const registerLookupItem = (item: GuideAptMiniPreviewItem | null | undefined) => {
    if (!item) return;
    for (const alias of [item.name, item.displayName, item.canonicalSlug]) {
      const norm = normalizeGuideAptName(alias);
      if (norm.length >= 2 && !inlineSlugLookup.has(norm)) {
        inlineSlugLookup.set(norm, item.canonicalSlug);
      }
    }
  };
  featuredAptRows.forEach(registerLookupItem);
  zoneSectionPreviews.forEach((sec) => sec.items.forEach(registerLookupItem));
  headToHeadRows.forEach((m) => {
    registerLookupItem(m.left);
    registerLookupItem(m.right);
  });
  for (const [norm, txKey] of getBaseInlineSlugLookupEntries()) {
    if (!inlineSlugLookup.has(norm)) {
      inlineSlugLookup.set(norm, txKey);
    }
  }

  const featuredZoneItems = (article.featuredZones || [])
    .map((zId) => getZoneById(zId))
    .filter((z): z is NonNullable<typeof z> => z !== undefined)
    .map((z) => ({ id: z.id, name: z.name }));

  const primaryPreviewApt =
    featuredAptRows[0] || zoneSectionPreviews[0]?.items[0] || headToHeadRows[0]?.left;

  const showTopMatchupBridge =
    headToHeadRows.length > 0 &&
    (article.slug === 'dongtan-1-vs-2-comparison' ||
      article.topicClusterId === 'vs-region-comparison');

  const extractedHeadings = extractGuideSectionHeadings(article.content);
  const tocSections: GuideSectionAnchorItem[] = [
    ...(showTopMatchupBridge
      ? [
          {
            id: 'guide-top-h2h-matchup-bridge',
            label: '상단 1:1 비교',
            fullTitle: '대표 단지 1:1 실거래 매치업',
          },
        ]
      : []),
    {
      id: 'guide-top-finance-bridge',
      label: 'DSR·세금 계산',
      fullTitle: '스트레스 DSR 40% · 취득세 실시간 계산기',
    },
    ...extractedHeadings.map((h) => ({
      id: h.id,
      label: h.label,
      fullTitle: h.title,
    })),
    ...(headToHeadRows.length > 0
      ? [
          {
            id: 'guide-head-to-head-comparison',
            label: '1:1 맞대결',
            fullTitle: '핵심 대표 단지 1:1 실거래 맞대결',
          },
        ]
      : []),
    ...(featuredAptRows.length > 0 || featuredZoneItems.length > 0
      ? [
          {
            id: 'guide-live-data-comparison',
            label: '실거래 비교표',
            fullTitle: '국토교통부 최신 실거래가 비교표',
          },
        ]
      : []),
    {
      id: 'guide-morning-alert-retention',
      label: '07시 알림',
      fullTitle: '오전 7시 실거래 알림 및 관심단지 저장',
    },
    ...(article.faqs && article.faqs.length > 0
      ? [
          {
            id: 'guide-faq-section',
            label: 'FAQ',
            fullTitle: '자주 묻는 핵심 질문 (FAQ)',
          },
        ]
      : []),
  ];

  const pricedFeaturedRows = featuredAptRows.filter((row) => row.latestPrice > 0);
  const sortedByPrice = [...pricedFeaturedRows].sort((a, b) => a.latestPrice - b.latestPrice);
  const minPriceRow = sortedByPrice[0] || null;
  const maxPriceRow =
    sortedByPrice.length > 0 ? sortedByPrice[sortedByPrice.length - 1] : null;
  const latestVerifiedTxDate =
    featuredAptRows
      .map((row) => row.latestDate)
      .filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d)))
      .sort()
      .pop() ||
    article.updatedDate ||
    article.date;
  const balancedBudgetApt =
    article.slug === 'dongtan-budget-tier-ranking'
      ? featuredAptRows.find(
          (r) => r.canonicalSlug === '힐스테이트동탄' || r.canonicalSlug === '동탄더샵레이크에듀타운'
        )
      : undefined;
  const primaryCalcApt =
    balancedBudgetApt ||
    topRepAptCtas[0] ||
    featuredAptRows[0] ||
    clusterFlagshipAptRows[0] ||
    lakeEduTownPreview;
  const emphasizeCorporateTaxQuickBar =
    article.slug.includes('technovalley') || article.slug.includes('corporate');

  // Build deduplicated apartment catalog keyed by canonicalSlug so each item serializes ONCE in __next_f
  const aptCatalog: Record<string, GuideAptMiniPreviewItem> = {};
  const registerCatalogApt = (item: GuideAptMiniPreviewItem | null | undefined): string | null => {
    if (!item || !item.canonicalSlug) return null;
    if (!aptCatalog[item.canonicalSlug]) {
      aptCatalog[item.canonicalSlug] = item;
    }
    return item.canonicalSlug;
  };

  const lakeEduSlug = registerCatalogApt(lakeEduTownPreview);
  const topRepSlugs = topRepAptCtas
    .map(registerCatalogApt)
    .filter((s): s is string => Boolean(s));
  const featuredSlugs = featuredAptRows
    .map(registerCatalogApt)
    .filter((s): s is string => Boolean(s));
  const clusterFlagshipSlugs = clusterFlagshipAptRows
    .map(registerCatalogApt)
    .filter((s): s is string => Boolean(s));
  const primaryPreviewSlug = registerCatalogApt(primaryPreviewApt);
  const primaryCalcSlug = registerCatalogApt(primaryCalcApt);

  const fallbackMidRepSlugs = resolveMidSectionRepresentativeAptCtas(
    undefined,
    featuredAptRows,
    3
  )
    .map(registerCatalogApt)
    .filter((s): s is string => Boolean(s));

  const zoneSectionConfigs = zoneSectionPreviews.map((sec) => {
    const itemSlugs = sec.items
      .map(registerCatalogApt)
      .filter((s): s is string => Boolean(s));
    const midRepSlugs = resolveMidSectionRepresentativeAptCtas(sec.items, featuredAptRows, 3)
      .map(registerCatalogApt)
      .filter((s): s is string => Boolean(s));
    return {
      sectionHeadingMatch: sec.sectionHeadingMatch,
      sectionTitle: sec.sectionTitle,
      zoneId: sec.zoneId,
      zoneName: sec.zoneName,
      itemSlugs,
      midRepSlugs,
    };
  });

  const headToHeadConfigs = headToHeadRows.map((m) => ({
    title: m.title,
    subtitle: m.subtitle,
    leftLabel: m.leftLabel,
    rightLabel: m.rightLabel,
    verdict: m.verdict,
    leftSlug: registerCatalogApt(m.left) || m.left.canonicalSlug,
    rightSlug: registerCatalogApt(m.right) || m.right.canonicalSlug,
  }));

  const inlineAptTokenMap = extractInlineAptTokensForArticle(article.content, inlineSlugLookup);

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
          title="D-VIEW 분석 리포트"
          compactTitle={truncateToCopyBudget(article.title, 'pageH1')}
          subtitleStrong={<MarketStatsStrong />}
          subtitleLight={<MarketStatsLight />}
        />

        <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-full max-w-full min-w-0 gap-6 box-border">
          {/* Sub-Navigation & Breadcrumb Control Bar */}
          <div className="w-full p-2.5 sm:p-3.5 rounded-2xl bg-surface border border-border/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="브레드크럼" className="flex items-center gap-1.5 text-[12px] text-tertiary">
              <Link href="/" prefetch={false} className="hover:text-primary transition-colors">홈</Link>
              <DviewIcon name="chevron-right" size={12} />
              <Link href="/guide" prefetch={false} className="hover:text-primary transition-colors">분석 리포트</Link>
              <DviewIcon name="chevron-right" size={12} />
              <span className="text-secondary font-semibold truncate max-w-[220px] sm:max-w-[360px]">{article.category}</span>
            </nav>

            <Link
              href="/guide"
              prefetch={false}
              aria-label="리포트 목록으로 이동"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-body hover:bg-slate-100 dark:hover:bg-slate-800 border border-border/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-colors shrink-0"
            >
              <span>리포트 목록</span>
            </Link>
          </div>

          <GuideArticleContentClient
            article={{
              slug: article.slug,
              title: article.title,
              subtitle: article.subtitle,
              description: article.description,
              category: article.category,
              date: article.date,
              updatedDate: article.updatedDate,
              readingTime: article.readingTime,
              author: article.author,
              keyTakeaways: article.keyTakeaways,
              tags: article.tags,
              faqs: article.faqs || [],
              content: article.content,
            }}
            topicCluster={
              topicCluster
                ? {
                    id: topicCluster.id,
                    title: topicCluster.title,
                    shortTitle: topicCluster.shortTitle,
                    description: topicCluster.description,
                  }
                : null
            }
            clusterPillars={GUIDE_TOPIC_CLUSTERS.map((c) => ({
              id: c.id,
              title: c.title,
              pillarSlug: c.pillarSlug,
            }))}
            topAcquisitionRoutes={TOP_ACQUISITION_ENTRY_ROUTES.map((entry) => ({
              id: entry.id,
              href: entry.href,
              badge: entry.badge,
              title: entry.title,
              subtitle: entry.subtitle,
            }))}
            totalGuidesCount={GUIDE_ARTICLES.length}
            isTopLandingGuide={isTopLandingGuide}
            showTopMatchupBridge={showTopMatchupBridge}
            emphasizeCorporateTaxQuickBar={emphasizeCorporateTaxQuickBar}
            adsenseApprovalMode={process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true'}
            tocSections={tocSections}
            aptCatalog={aptCatalog}
            topRepSlugs={topRepSlugs}
            featuredSlugs={featuredSlugs}
            clusterFlagshipSlugs={clusterFlagshipSlugs}
            lakeEduSlug={lakeEduSlug}
            primaryPreviewSlug={primaryPreviewSlug}
            primaryCalcSlug={primaryCalcSlug}
            fallbackMidRepSlugs={fallbackMidRepSlugs}
            zoneSectionConfigs={zoneSectionConfigs}
            headToHeadConfigs={headToHeadConfigs}
            featuredZoneItems={featuredZoneItems}
            minPriceStr={minPriceRow?.latestPriceStr || null}
            maxPriceStr={maxPriceRow?.latestPriceStr || null}
            sameMinMaxPrice={Boolean(
              minPriceRow && maxPriceRow && minPriceRow.canonicalSlug === maxPriceRow.canonicalSlug
            )}
            latestVerifiedTxDate={latestVerifiedTxDate}
            clusterRelatedGuides={clusterRelatedGuides.map((g) => ({
              slug: g.slug,
              category: g.category,
              title: g.title,
              subtitle: g.subtitle,
              isTopPopular: TOP_POPULAR_GUIDE_SLUGS.includes(g.slug),
            }))}
            otherArticles={otherArticles.map((nextArt) => ({
              slug: nextArt.slug,
              category: nextArt.category,
              title: nextArt.title,
              description: nextArt.description,
              readingTime: nextArt.readingTime,
            }))}
            inlineAptTokenMap={inlineAptTokenMap}
          />
        </div>
      </main>

      <MobileDock activeTab="guide" />
    </div>
  );
}

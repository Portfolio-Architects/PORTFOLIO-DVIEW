import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  ChevronRight,
  Scale,
  HelpCircle,
  ArrowUpRight,
  Building2,
  MapPin,
  Layers,
} from 'lucide-react';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import {
  GUIDE_ARTICLES,
  TOP_POPULAR_GUIDE_SLUGS,
  GUIDE_TOPIC_CLUSTERS,
  buildGuideArticleJsonLd,
  buildGuideAptMiniPreview,
  resolveGuideZoneSectionPreviews,
  normalizeGuideAptName,
  getTopicClusterForGuide,
  getRelatedGuidesForGuide,
  type GuideAptMiniPreviewItem,
  type ResolvedGuideZoneSectionPreview,
} from '@/lib/data/guides';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { AdSlot } from '@/components/ads/AdSlot';
import ReportShareBar from '@/components/common/ReportShareBar';
import GuideAptPreviewCard from '@/components/guide/GuideAptPreviewCard';
import { GuideStatsComparisonBridge } from '@/components/guide/GuideStatsComparisonBridge';
import { getTxSummaryData } from '@/lib/services/apartmentPageService';
import { getZoneById } from '@/lib/zones';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import {
  CANONICAL_DONG_APT_LIST,
  CANONICAL_TX_SUMMARY_MAP,
} from '@/lib/utils/canonicalAptCatalog';

export const revalidate = 86400;

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

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function renderInlineBold(
  text: string,
  inlineSlugLookup?: Map<string, string>
): React.ReactNode {
  const parts = text.split(
    /(\*\*\[[^\]]+\]\(\/(?:guide|apartment|zone)\/(?:\([^)]*\)|[^)])+\)\*\*|\[[^\]]+\]\(\/(?:guide|apartment|zone)\/(?:\([^)]*\)|[^)])+\)|\*\*[^*]+\*\*)/g
  );
  return parts.map((part, idx) => {
    const unwrappedLinkCandidate =
      part.startsWith('**') && part.endsWith('**') && part.includes('](/')
        ? part.slice(2, -2)
        : part;
    const mdMatch = unwrappedLinkCandidate.match(
      /^\[([^\]]+)\]\((\/(?:guide|apartment|zone)\/(?:\([^)]*\)|[^)])+)\)$/
    );
    if (mdMatch) {
      const cleanLabel = mdMatch[1].replace(/\*\*/g, '').trim();
      const rawHref = mdMatch[2].trim();
      if (rawHref.startsWith('/guide/')) {
        return (
          <Link
            key={idx}
            href={rawHref}
            prefetch={false}
            data-testid="guide-inline-cross-link"
            className="font-extrabold text-blue-700 dark:text-blue-400 underline decoration-blue-500/40 underline-offset-4 hover:text-blue-600 transition-colors"
          >
            {cleanLabel}
          </Link>
        );
      }
      if (rawHref.startsWith('/apartment/')) {
        const rawApt = safeDecodeURIComponent(rawHref.slice('/apartment/'.length)).trim();
        const normApt = normalizeGuideAptName(rawApt);
        const resolvedSlug =
          (inlineSlugLookup && normApt ? inlineSlugLookup.get(normApt) : undefined) ||
          resolveCanonicalAptSlug(rawApt) ||
          rawApt;
        return (
          <Link
            key={idx}
            href={`/apartment/${encodeURIComponent(resolvedSlug)}`}
            prefetch={false}
            data-testid="guide-inline-apt-link"
            className="font-extrabold text-emerald-700 dark:text-emerald-400 underline decoration-emerald-500/40 underline-offset-4 hover:text-emerald-600 transition-colors"
          >
            {cleanLabel}
          </Link>
        );
      }
      return (
        <Link
          key={idx}
          href={rawHref}
          prefetch={false}
          className="font-extrabold text-blue-700 dark:text-blue-400 underline decoration-blue-500/40 underline-offset-4 hover:text-blue-600 transition-colors"
        >
          {cleanLabel}
        </Link>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const innerText = part.slice(2, -2);
      if (/\[[^\]]+\]\(\/(?:guide|apartment|zone)\//.test(innerText)) {
        return (
          <strong key={idx} className="font-extrabold text-primary">
            {renderInlineBold(innerText, inlineSlugLookup)}
          </strong>
        );
      }
      const normKey = normalizeGuideAptName(innerText);
      const strippedParenBase = innerText.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const fallbackNormKey =
        strippedParenBase && strippedParenBase !== innerText
          ? normalizeGuideAptName(strippedParenBase)
          : '';
      const matchedSlug =
        inlineSlugLookup && normKey.length >= 2
          ? inlineSlugLookup.get(normKey) ||
            (fallbackNormKey.length >= 2 ? inlineSlugLookup.get(fallbackNormKey) : undefined)
          : undefined;
      if (matchedSlug) {
        return (
          <Link
            key={idx}
            href={`/apartment/${encodeURIComponent(matchedSlug)}`}
            prefetch={false}
            data-testid="guide-inline-apt-link"
            className="font-extrabold text-emerald-700 dark:text-emerald-400 underline decoration-emerald-500/40 underline-offset-4 hover:text-emerald-600 transition-colors"
          >
            {innerText}
          </Link>
        );
      }
      return (
        <strong key={idx} className="font-extrabold text-primary">
          {innerText}
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

export function renderGuideBodyContent(
  rawContent: string,
  options?: {
    guideSlug: string;
    zoneSectionPreviews: ResolvedGuideZoneSectionPreview[];
    inlineSlugLookup: Map<string, string>;
  }
): React.ReactNode[] {
  const withoutCodeFences = rawContent.replace(/```[\s\S]*?```/g, '');
  const lines = withoutCodeFences.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  const guideSlug = options?.guideSlug || 'guide';
  const zoneSectionPreviews = options?.zoneSectionPreviews || [];
  const inlineSlugLookup = options?.inlineSlugLookup;

  let activeZonePreview: ResolvedGuideZoneSectionPreview | null = null;
  let activeZonePreviewLevel: 3 | 4 | null = null;
  const emittedHeadings = new Set<string>();

  const flushActiveZonePreview = (keySuffix: string | number) => {
    if (!activeZonePreview || emittedHeadings.has(activeZonePreview.sectionHeadingMatch)) {
      activeZonePreview = null;
      activeZonePreviewLevel = null;
      return;
    }
    const currentPreview = activeZonePreview;
    emittedHeadings.add(currentPreview.sectionHeadingMatch);
    activeZonePreview = null;
    activeZonePreviewLevel = null;

    elements.push(
      <section
        key={`zone-preview-${keySuffix}`}
        data-testid="guide-zone-section-preview"
        data-zone-id={currentPreview.zoneId || 'guide'}
        aria-label={currentPreview.sectionTitle}
        className="not-prose my-6 rounded-2xl border border-emerald-500/25 dark:border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-950/15 p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-emerald-700 dark:text-emerald-300">
              <MapPin size={15} className="shrink-0" />
              <span>{currentPreview.sectionTitle}</span>
            </div>
            <p className="mt-0.5 text-[11.5px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium">
              본 권역 설명에 언급된 대표 단지의 국토교통부 실시간 실거래가 미니 프리뷰입니다. 카드를 클릭하면 단지 상세 시세·전세가율·DSR 리포트로 이동합니다.
            </p>
          </div>

          {currentPreview.zoneId && currentPreview.zoneName && (
            <Link
              href={`/zone/${currentPreview.zoneId}`}
              prefetch={false}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-extrabold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors w-fit shrink-0"
            >
              <span>{currentPreview.zoneName} 전체 시세</span>
              <ArrowUpRight size={12} />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {currentPreview.items.map((item) => (
            <GuideAptPreviewCard
              key={`${currentPreview.sectionHeadingMatch}-${item.canonicalSlug}`}
              item={item}
              guideSlug={guideSlug}
              placement="zone_section"
              sectionTitle={currentPreview.sectionTitle}
            />
          ))}
        </div>
      </section>
    );
  };

  const findHeadingPreview = (headingText: string): ResolvedGuideZoneSectionPreview | undefined =>
    zoneSectionPreviews.find(
      (cfg) =>
        !emittedHeadings.has(cfg.sectionHeadingMatch) &&
        headingText.includes(cfg.sectionHeadingMatch)
    );

  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === '---') {
      flushActiveZonePreview(`before-hr-${i}`);
      elements.push(<hr key={`hr-${i}`} className="my-8 border-border/60" />);
      i += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushActiveZonePreview(`before-h3-${i}`);
      const headingText = trimmed.slice(4).trim();
      const matchedH3 = findHeadingPreview(headingText);
      if (matchedH3) {
        activeZonePreview = matchedH3;
        activeZonePreviewLevel = 3;
      }
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-10 mb-4 pb-2 border-b border-border/40"
        >
          {renderInlineBold(headingText, inlineSlugLookup)}
        </h3>
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      const headingText = trimmed.slice(5).trim();
      const matchedH4 = findHeadingPreview(headingText);
      if (activeZonePreviewLevel === 4 || matchedH4) {
        flushActiveZonePreview(`before-h4-${i}`);
      }
      if (matchedH4) {
        activeZonePreview = matchedH4;
        activeZonePreviewLevel = 4;
      }
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-base sm:text-lg font-extrabold text-primary tracking-tight mt-6 mb-2"
        >
          {renderInlineBold(headingText, inlineSlugLookup)}
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
                    {renderInlineBold(h, inlineSlugLookup)}
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
                        {renderInlineBold(cell, inlineSlugLookup)}
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
              {renderInlineBold(item, inlineSlugLookup)}
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
              <span>{renderInlineBold(item.mainText, inlineSlugLookup)}</span>
              {item.subBullets.length > 0 && (
                <ul className="mt-1.5 space-y-1 pl-4 list-disc text-[13.5px] sm:text-[14.5px] text-secondary">
                  {item.subBullets.map((sub, subIdx) => (
                    <li key={subIdx} className="break-keep">
                      {renderInlineBold(sub, inlineSlugLookup)}
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
        {renderInlineBold(paraLines.join(' '), inlineSlugLookup)}
      </p>
    );
  }

  flushActiveZonePreview('end-of-body');

  return elements;
}

let baseInlineSlugLookupEntriesCache: Array<[string, string]> | null = null;

function getBaseInlineSlugLookupEntries(): Array<[string, string]> {
  if (baseInlineSlugLookupEntriesCache) return baseInlineSlugLookupEntriesCache;
  const map = new Map<string, string>();
  for (const entry of CANONICAL_DONG_APT_LIST) {
    if (!CANONICAL_TX_SUMMARY_MAP[entry.txKey]) continue;
    for (const alias of [entry.txKey, entry.name]) {
      const norm = normalizeGuideAptName(alias);
      if (norm.length >= 2 && !map.has(norm)) {
        map.set(norm, entry.txKey);
      }
    }
  }
  for (const txKey of Object.keys(CANONICAL_TX_SUMMARY_MAP)) {
    const norm = normalizeGuideAptName(txKey);
    if (norm.length >= 2 && !map.has(norm)) {
      map.set(norm, txKey);
    }
  }
  baseInlineSlugLookupEntriesCache = Array.from(map.entries());
  return baseInlineSlugLookupEntriesCache;
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

  const featuredAptRows = (article.featuredApartments || [])
    .map(mapAptMetric)
    .filter((item): item is GuideAptMiniPreviewItem => item !== null);

  const clusterFlagshipAptRows = (topicCluster?.flagshipApartments || [])
    .map(mapAptMetric)
    .filter((item): item is GuideAptMiniPreviewItem => item !== null);

  const topHighlightAptRows = featuredAptRows.slice(0, 4);

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
    .filter((z): z is NonNullable<typeof z> => z !== undefined);

  const primaryPreviewApt =
    featuredAptRows[0] || zoneSectionPreviews[0]?.items[0] || headToHeadRows[0]?.left;

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
                {topicCluster && (
                  <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    {topicCluster.shortTitle}
                  </span>
                )}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-[14px]">
                  <span>본 리포트의 핵심 결론 및 요약 (Key Takeaways)</span>
                </div>
                <Link
                  href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
                  prefetch={false}
                  data-testid="guide-top-stats-comparison-cta"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors shadow-2xs shrink-0"
                >
                  <Scale size={13} />
                  <span>동탄1 vs 동탄2 실시간 집값 통계 비교표 열기</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
              <ul className="space-y-2 text-[13px] sm:text-[14px] text-secondary font-medium pl-5 list-disc">
                {article.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Top-of-Article Flagship Complex Quick-Jump & Rival Matchup CTA */}
            {featuredAptRows.length > 0 && (
              <section
                id="guide-top-apt-quick-jump"
                data-testid="guide-top-apt-quick-jump"
                aria-label="리포트 핵심 대장주 단지 상단 바로가기 및 라이벌 실거래 비교"
                className="rounded-2xl border border-emerald-500/30 dark:border-emerald-500/35 bg-slate-50/90 dark:bg-slate-900/75 p-4 sm:p-6 space-y-4 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                      <Building2 size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>본문 핵심 대표 단지 (시범단지·호수공원·역세권 대장주) 실거래 바로가기</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      국토교통부 실거래가·전세가율·실거주 PER이 검증된 핵심 단지 상세 리포트로 즉시 이동합니다.
                    </p>
                  </div>
                  {headToHeadRows.length > 0 && (
                    <a
                      href="#guide-head-to-head-comparison"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors w-fit shrink-0"
                    >
                      <Scale size={13} />
                      <span>1:1 라이벌 매치업({headToHeadRows.length}건) 바로보기</span>
                    </a>
                  )}
                </div>

                {/* Top 4 Flagship Complex Preview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {topHighlightAptRows.map((item) => (
                    <GuideAptPreviewCard
                      key={`top-preview-${item.canonicalSlug}`}
                      item={item}
                      guideSlug={article.slug}
                      placement="article_top"
                      sectionTitle={`${article.title} 상단 대표 단지 바로가기`}
                    />
                  ))}
                </div>

                {/* All Featured Complexes Direct Canonical Quick-Jump Pills */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>수록 단지 전체 상세 페이지 바로가기</span>
                    <span className="text-slate-400 font-semibold tabular-nums">
                      ({featuredAptRows.length}개 단지)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {featuredAptRows.map((apt) => (
                      <Link
                        key={`top-pill-${apt.canonicalSlug}`}
                        href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                        prefetch={false}
                        data-testid="guide-top-apt-shortcut-pill"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors"
                      >
                        <span>{apt.displayName}</span>
                        <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {apt.latestPriceStr}
                        </span>
                        <ArrowUpRight size={12} className="text-slate-400" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Top 1:1 Rival Matchup Quick-Comparison Bar */}
                {headToHeadRows.length > 0 && (
                  <div
                    data-testid="guide-top-rival-matchup"
                    className="rounded-xl border border-blue-500/25 dark:border-blue-500/30 bg-blue-500/[0.04] dark:bg-blue-950/20 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700 dark:text-blue-300">
                        <Scale size={13} />
                        <span>핵심 라이벌 매치업 1:1 비교 하이라이트 ({headToHeadRows.length}선)</span>
                      </span>
                      <a
                        href="#guide-rival-matchup-section"
                        className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 hover:underline"
                      >
                        상세 스펙 대결표 이동
                      </a>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {headToHeadRows.map((matchup, idx) => (
                        <div
                          key={`top-matchup-${idx}-${matchup.left.canonicalSlug}-${matchup.right.canonicalSlug}`}
                          data-testid="guide-top-rival-matchup-row"
                          className="rounded-lg bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 px-3 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2"
                        >
                          <p className="text-xs sm:text-[12.5px] font-extrabold text-slate-900 dark:text-slate-100">
                            {matchup.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Link
                              href={`/apartment/${encodeURIComponent(matchup.left.canonicalSlug)}`}
                              prefetch={false}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-xs font-extrabold text-slate-900 dark:text-slate-100 transition-colors"
                            >
                              <span>{matchup.left.displayName}</span>
                              <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                                {matchup.left.latestPriceStr}
                              </span>
                            </Link>
                            <span className="text-[11px] font-black text-slate-400">VS</span>
                            <Link
                              href={`/apartment/${encodeURIComponent(matchup.right.canonicalSlug)}`}
                              prefetch={false}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-extrabold text-slate-900 dark:text-slate-100 transition-colors"
                            >
                              <span>{matchup.right.displayName}</span>
                              <span className="text-blue-700 dark:text-blue-400 tabular-nums">
                                {matchup.right.latestPriceStr}
                              </span>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Mid-Article Zero-CLS AdSlot */}
            {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
              <div
                data-testid="guide-article-adslot-top"
                className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
              >
                <AdSlot
                  refreshSlotId={`1000000002_guide_${article.slug}_top`}
                  format="rectangle"
                  minHeightClass="min-h-[250px]"
                  cpaCampaignId="mortgage-refinance"
                  apartmentName={article.title}
                  dong={primaryPreviewApt?.dong}
                />
              </div>
            )}

            {/* Body Content with In-Section Zone Real-Time Mini Preview Cards */}
            <div
              id="guide-article-body"
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-secondary leading-relaxed space-y-5 pt-2 font-medium"
            >
              {renderGuideBodyContent(article.content, {
                guideSlug: article.slug,
                zoneSectionPreviews,
                inlineSlugLookup,
              })}
            </div>

            {/* Bottom-of-Body Representative Apartment Real-Time Transaction Mini Preview Cards + Contextual AdSlot */}
            {featuredAptRows.length > 0 && (
              <section
                id="guide-bottom-apt-preview-cards"
                data-testid="guide-bottom-apt-preview-cards"
                aria-label="가이드 본문 하단 대표 단지 실시간 실거래가 미니 프리뷰"
                className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                      <Building2
                        size={19}
                        className="text-emerald-600 dark:text-emerald-400 shrink-0"
                      />
                      <span>가이드 본문 언급 대표 단지 실시간 실거래가 미니 프리뷰</span>
                    </h3>
                    <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                      본 가이드에서 다룬 핵심 아파트 단지(
                      {featuredAptRows
                        .slice(0, 3)
                        .map((item) => item.displayName)
                        .join(', ')}{' '}
                      등)의 국토교통부 최신 매매·전세 실거래가 요약 카드입니다. 카드를 클릭하면 단지 상세 시세·전세가율·DSR 대출 한도 리포트로 즉시 이동합니다.
                    </p>
                  </div>

                  {featuredZoneItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {featuredZoneItems.map((zone) => (
                        <Link
                          key={zone.id}
                          href={`/zone/${zone.id}`}
                          prefetch={false}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          <span>{zone.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {featuredAptRows.map((item) => (
                    <GuideAptPreviewCard
                      key={`bottom-${item.canonicalSlug}`}
                      item={item}
                      guideSlug={article.slug}
                      placement="article_bottom"
                      sectionTitle="가이드 본문 하단 대표 단지 미니 프리뷰"
                    />
                  ))}
                </div>

                {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
                  <div
                    data-testid="guide-article-adslot-mid"
                    className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
                  >
                    <AdSlot
                      refreshSlotId={`1000000002_guide_${article.slug}_mid_conversion`}
                      format="rectangle"
                      minHeightClass="min-h-[250px]"
                      cpaCampaignId="mortgage-refinance"
                      apartmentName={primaryPreviewApt?.canonicalSlug || article.title}
                      dong={primaryPreviewApt?.dong}
                    />
                  </div>
                )}
              </section>
            )}

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
                                  href={`/apartment/${encodeURIComponent(card.apt.canonicalSlug)}`}
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
                                href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
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

            {/* Bidirectional Bridge to /stats Dongtan 1 vs Dongtan 2 House Price Comparison */}
            <GuideStatsComparisonBridge
              guideSlug={article.slug}
              guideTitle={article.title}
              placement="guide_article_bottom"
            />

            {/* Topic Cluster & Popular Guide Internal Cross-Linking Hub */}
            {clusterRelatedGuides.length > 0 && (
              <section
                id="guide-topic-cluster-links"
                data-testid="guide-topic-cluster-links"
                aria-label="토픽 클러스터 연관 가이드 및 인기 리포트 교차 탐색"
                className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                      <Layers size={19} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        {topicCluster
                          ? `${topicCluster.title} · 필수 연계 리포트`
                          : '함께 읽으면 좋은 핵심 연계 가이드'}
                      </span>
                    </h3>
                    <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                      {topicCluster
                        ? `${topicCluster.description} — 본 리포트와 함께 비교하면 단지 선택 정확도가 높아집니다.`
                        : '본 리포트의 실거래·입지 분석과 직결되는 인기 비교 가이드입니다.'}
                    </p>
                  </div>
                  <Link
                    href="/guide"
                    prefetch={false}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold transition-colors w-fit shrink-0"
                  >
                    <span>전체 20개 가이드 허브</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {clusterRelatedGuides.map((relGuide) => {
                    const isTopPopular = TOP_POPULAR_GUIDE_SLUGS.includes(relGuide.slug);
                    return (
                      <Link
                        key={`cluster-link-${relGuide.slug}`}
                        href={`/guide/${relGuide.slug}`}
                        prefetch={false}
                        data-testid="guide-topic-cluster-card"
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 p-4 flex flex-col justify-between gap-2.5 transition-all group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                              {relGuide.category}
                            </span>
                            {isTopPopular && (
                              <span className="text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                인기 TOP 5
                              </span>
                            )}
                          </div>
                          <h4 className="text-[13.5px] sm:text-[14.5px] font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                            {relGuide.title}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2">
                            {relGuide.subtitle}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11.5px] font-bold text-blue-700 dark:text-blue-400">
                          <span>심층 비교 리포트 이어서 읽기</span>
                          <ArrowUpRight
                            size={14}
                            className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Cluster Flagship Apartment Direct Shortcuts */}
                {clusterFlagshipAptRows.length > 0 && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-300">
                        {topicCluster
                          ? `${topicCluster.title} 대표 대장주 단지 실거래 바로가기`
                          : '클러스터 대표 대장주 단지 바로가기'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        국토부 84㎡ 실거래 기준
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {clusterFlagshipAptRows.map((apt) => (
                        <Link
                          key={`cluster-flagship-apt-${apt.canonicalSlug}`}
                          href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                          prefetch={false}
                          data-testid="guide-cluster-flagship-apt-link"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 text-xs font-extrabold text-slate-800 dark:text-slate-100 transition-colors"
                        >
                          <Building2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{apt.displayName}</span>
                          <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {apt.latestPriceStr}
                          </span>
                          <ArrowUpRight size={12} className="text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5-Cluster Pillar Cross-Navigation Bar */}
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 p-3.5 space-y-2">
                  <span className="block text-[11.5px] font-extrabold text-slate-700 dark:text-slate-300">
                    5대 핵심 토픽 클러스터 대표 가이드 (20개 리포트 전체 연결)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {GUIDE_TOPIC_CLUSTERS.map((cluster) => {
                      const isCurrentCluster = topicCluster?.id === cluster.id;
                      return (
                        <Link
                          key={`cluster-pillar-${cluster.id}`}
                          href={`/guide/${cluster.pillarSlug}`}
                          prefetch={false}
                          data-testid="guide-cluster-pillar-pill"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-colors ${
                            isCurrentCluster
                              ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500/40'
                          }`}
                        >
                          <span>{cluster.title}</span>
                          <ArrowUpRight size={12} className="opacity-70" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
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
            {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
              <div
                data-testid="guide-article-adslot-bottom"
                className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
              >
                <AdSlot
                  refreshSlotId={`1000000002_guide_${article.slug}_bottom`}
                  format="rectangle"
                  minHeightClass="min-h-[250px]"
                  cpaCampaignId="jeonse-sentinel"
                  apartmentName={article.title}
                  dong={primaryPreviewApt?.dong}
                />
              </div>
            )}

            {/* Footer Author & Recirculation Box */}
            <div className="bg-body p-5 sm:p-6 rounded-2xl border border-border/60 flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider block">작성 주체</span>
                <strong className="text-[15px] font-black text-primary">{article.author}</strong>
                <p className="text-[12px] text-secondary mt-0.5">국토교통부 실거래가 및 행정 인프라 공공데이터 융합 퀀트 리서치</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-bold transition-colors"
                >
                  <span>동탄1 vs 동탄2 집값 통계</span>
                </Link>
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

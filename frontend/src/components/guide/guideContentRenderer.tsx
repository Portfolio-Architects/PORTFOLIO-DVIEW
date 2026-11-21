import React from 'react';
import Link from 'next/link';
import type {
  GuideAptMiniPreviewItem,
  ResolvedGuideZoneSectionPreview,
} from '@/lib/data/guides';
import { AdSlot } from '@/components/ads/AdSlot';
import GuideAptPreviewCard, { GuideAptCtaLink } from '@/components/guide/GuideAptPreviewCard';
import InlineMortgageDsrBridge from '@/components/finance/InlineMortgageDsrBridge';
import { DviewIcon } from '@/components/common/DviewIcon';

export interface ExtractedGuideHeading {
  id: string;
  index: number;
  title: string;
  label: string;
}

export type InlineAptResolution = readonly [slug: string, dong: string];

export interface GuideBodyRenderOptions {
  guideSlug: string;
  isTopLandingGuide?: boolean;
  adsenseApprovalMode?: boolean;
  zoneSectionPreviews: ResolvedGuideZoneSectionPreview[];
  inlineSlugLookup?: Map<string, string>;
  inlineAptTokenMap?: Record<string, InlineAptResolution>;
  resolveDongBySlug?: (slug: string) => string;
  resolveFallbackSlug?: (rawApt: string) => string;
  normalizeAptName?: (rawName: string | undefined) => string;
  lakeEduTownPreview?: GuideAptMiniPreviewItem | null;
  featuredAptRows?: GuideAptMiniPreviewItem[];
  midRepAptsBySection?: Record<string, GuideAptMiniPreviewItem[]>;
  fallbackMidRepApts?: GuideAptMiniPreviewItem[];
  resolveMidRepApts?: (
    sectionItems?: GuideAptMiniPreviewItem[] | null,
    fallbackItems?: GuideAptMiniPreviewItem[] | null,
    maxCount?: number
  ) => GuideAptMiniPreviewItem[];
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function defaultNormalizeAptName(rawName: string | undefined): string {
  if (!rawName) return '';
  let norm = rawName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\((?:목동|능동|반송동|청계동|여울동|오산동|영천동|석우동|장지동|송동|산척동|신동)\)$/g, '')
    .replace(/[()]/g, '')
    .replace(/아파트$/g, '')
    .replace(/^e편한세상/, '이편한세상');

  if (norm === '동탄역시범더샵센트럴시티' || norm === '시범포스코더샵') norm = '더샵센트럴시티';
  else if (norm === '동탄역시범반도유보라아이비파크4.0') norm = '시범반도유보라아이비파크4.0';
  else if (norm === '동탄역센트럴자이') norm = '동탄역센트럴자이a-10';
  else if (norm === '능동역이지더원') norm = '능동마을이지더원';
  else if (norm === '시범리슈빌') norm = '동탄역시범리슈빌';
  else if (norm === '시범우남' || norm === '시범우남퍼스트빌') norm = '동탄역시범우남퍼스트빌';
  else if (
    norm === '시범한화' ||
    norm === '시범한화꿈에그린' ||
    norm === '시범한화꿈에그린프레스티지'
  ) {
    norm = '동탄역시범한화꿈에그린프레스티지';
  } else if (norm === '예미지시그너스') norm = '동탄역예미지시그너스';
  else if (norm === '석우롯데캐슬' || norm === '석우동롯데캐슬') norm = '롯데캐슬';
  else if (norm.startsWith('예당마을') && norm.length > 4) norm = norm.slice(4);
  else if (norm.startsWith('동탄푸른마을')) norm = norm.slice(2);

  return norm;
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = line
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

export function extractGuideSectionHeadingsCore(rawContent: string): ExtractedGuideHeading[] {
  if (!rawContent) return [];
  const withoutCodeFences = rawContent.replace(/```[\s\S]*?```/g, '');
  const lines = withoutCodeFences.split(/\r?\n/);
  const headings: ExtractedGuideHeading[] = [];
  let index = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed.startsWith('### ') || trimmed.startsWith('#### ')) continue;
    const cleanTitle = trimmed
      .slice(4)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*/g, '')
      .trim();
    if (!cleanTitle) continue;
    index += 1;
    const compactBase = cleanTitle.replace(/^\d+\.\s*/, '').trim();
    const compactChars = Array.from(compactBase);
    const truncated =
      compactChars.length > 14 ? `${compactChars.slice(0, 14).join('').trim()}…` : compactBase;
    headings.push({
      id: `guide-section-${index}`,
      index,
      title: cleanTitle,
      label: `${index}. ${truncated || cleanTitle}`,
    });
  }

  return headings;
}

export interface InlineBoldResolver {
  inlineSlugLookup?: Map<string, string>;
  inlineAptTokenMap?: Record<string, InlineAptResolution>;
  resolveDongBySlug?: (slug: string) => string;
  resolveFallbackSlug?: (rawApt: string) => string;
  normalizeAptName?: (rawName: string | undefined) => string;
}

export function renderInlineBoldCore(
  text: string,
  guideSlug = 'guide',
  resolver?: InlineBoldResolver
): React.ReactNode {
  const effectiveLookup = resolver?.inlineSlugLookup;
  const tokenMap = resolver?.inlineAptTokenMap;
  const normFn = resolver?.normalizeAptName || defaultNormalizeAptName;
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
            className="font-extrabold text-primary underline decoration-slate-400/60 underline-offset-4 hover:text-brand-blue transition-colors"
          >
            {cleanLabel}
          </Link>
        );
      }
      if (rawHref.startsWith('/apartment/')) {
        const rawApt = safeDecodeURIComponent(rawHref.slice('/apartment/'.length)).trim();
        const tokenHit = tokenMap?.[`apt:${rawApt}`];
        const normApt = normFn(rawApt);
        const resolvedSlug =
          tokenHit?.[0] ||
          (effectiveLookup && normApt ? effectiveLookup.get(normApt) : undefined) ||
          resolver?.resolveFallbackSlug?.(rawApt) ||
          rawApt;
        const resolvedDong =
          tokenHit?.[1] ?? resolver?.resolveDongBySlug?.(resolvedSlug) ?? '';
        return (
          <GuideAptCtaLink
            key={idx}
            aptSlug={resolvedSlug}
            canonicalSlug={resolvedSlug}
            apartmentName={resolvedSlug}
            displayName={cleanLabel}
            dong={resolvedDong}
            href={`/apartment/${encodeURIComponent(resolvedSlug)}`}
            guideSlug={guideSlug}
            placement="zone_section"
            sectionTitle="본문 인라인 단지 링크"
            data-testid="guide-inline-apt-link"
            className="dview-g-ilink"
          >
            {cleanLabel}
          </GuideAptCtaLink>
        );
      }
      return (
        <Link
          key={idx}
          href={rawHref}
          prefetch={false}
          className="font-extrabold text-primary underline decoration-slate-400/60 underline-offset-4 hover:text-brand-blue transition-colors"
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
            {renderInlineBoldCore(innerText, guideSlug, resolver)}
          </strong>
        );
      }
      const tokenHit = tokenMap?.[`bold:${innerText}`];
      const normKey = normFn(innerText);
      const strippedParenBase = innerText.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const fallbackNormKey =
        strippedParenBase && strippedParenBase !== innerText
          ? normFn(strippedParenBase)
          : '';
      const matchedSlug =
        tokenHit?.[0] ||
        (effectiveLookup && normKey.length >= 2
          ? effectiveLookup.get(normKey) ||
            (fallbackNormKey.length >= 2 ? effectiveLookup.get(fallbackNormKey) : undefined)
          : undefined);
      if (matchedSlug) {
        const resolvedDong =
          tokenHit?.[1] ?? resolver?.resolveDongBySlug?.(matchedSlug) ?? '';
        return (
          <GuideAptCtaLink
            key={idx}
            aptSlug={matchedSlug}
            canonicalSlug={matchedSlug}
            apartmentName={matchedSlug}
            displayName={innerText}
            dong={resolvedDong}
            href={`/apartment/${encodeURIComponent(matchedSlug)}`}
            guideSlug={guideSlug}
            placement="zone_section"
            sectionTitle="본문 인라인 단지 링크"
            data-testid="guide-inline-apt-link"
            className="dview-g-ilink"
          >
            {innerText}
          </GuideAptCtaLink>
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

function selectMidRepAptsFallback(
  sectionItems?: GuideAptMiniPreviewItem[] | null,
  fallbackItems?: GuideAptMiniPreviewItem[] | null,
  maxCount = 3
): GuideAptMiniPreviewItem[] {
  const seen = new Set<string>();
  const out: GuideAptMiniPreviewItem[] = [];
  for (const list of [sectionItems || [], fallbackItems || []]) {
    for (const item of list) {
      if (!item || !item.canonicalSlug || out.length >= maxCount) continue;
      if (seen.has(item.canonicalSlug)) continue;
      seen.add(item.canonicalSlug);
      out.push(item);
    }
  }
  return out;
}

export function renderGuideBodyContentCore(
  rawContent: string,
  options?: GuideBodyRenderOptions
): React.ReactNode[] {
  const withoutCodeFences = rawContent.replace(/```[\s\S]*?```/g, '');
  const lines = withoutCodeFences.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  const guideSlug = options?.guideSlug || 'guide';
  const isTopLandingGuide = Boolean(options?.isTopLandingGuide);
  const isApprovalMode = Boolean(
    options?.adsenseApprovalMode || process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true'
  );
  const zoneSectionPreviews = options?.zoneSectionPreviews || [];
  const inlineResolver: InlineBoldResolver = {
    inlineSlugLookup: options?.inlineSlugLookup,
    inlineAptTokenMap: options?.inlineAptTokenMap,
    resolveDongBySlug: options?.resolveDongBySlug,
    resolveFallbackSlug: options?.resolveFallbackSlug,
    normalizeAptName: options?.normalizeAptName,
  };
  const lakeEduTownPreview = options?.lakeEduTownPreview ?? null;
  const lakeEduHref =
    lakeEduTownPreview?.href || `/apartment/${encodeURIComponent('동탄더샵레이크에듀타운')}`;
  const lakeEduPriceLabel = lakeEduTownPreview?.latestPriceStr
    ? ` (${lakeEduTownPreview.latestPriceStr})`
    : '';

  let activeZonePreview: ResolvedGuideZoneSectionPreview | null = null;
  let activeZonePreviewLevel: 3 | 4 | null = null;
  let emittedZonePreviewCount = 0;
  let h3SectionCounter = 0;
  const emittedHeadings = new Set<string>();

  const isMultiTierFinanceGuide =
    guideSlug === 'dongtan-budget-tier-ranking' ||
    guideSlug === 'stress-dsr-valuation-guide' ||
    guideSlug === 'dongtan-first-home-policy-loan-comparison' ||
    guideSlug === 'dongtan-acquisition-property-tax-2026-guide';

  const renderMidConversionActionBar = (
    sectionPreview?: ResolvedGuideZoneSectionPreview,
    includeFinanceBridge: boolean = false,
    sectionIdx: number = 1
  ) => {
    const midRepApts =
      (sectionPreview?.sectionHeadingMatch &&
        options?.midRepAptsBySection?.[sectionPreview.sectionHeadingMatch]) ||
      (!sectionPreview && options?.fallbackMidRepApts) ||
      (options?.resolveMidRepApts || selectMidRepAptsFallback)(
        sectionPreview?.items,
        options?.featuredAptRows,
        3
      );
    const midCalcApt = midRepApts[0] || lakeEduTownPreview;
    const barSectionTitle =
      sectionPreview?.sectionTitle || '리포트 중간 핵심 전환 대표 단지 바로가기';
    const sectionTierManwon: 60000 | 90000 | 120000 =
      sectionPreview?.sectionTitle.includes('Tier 1') || sectionPreview?.sectionTitle.includes('6억')
        ? 60000
        : sectionPreview?.sectionTitle.includes('Tier 3') || sectionPreview?.sectionTitle.includes('12억')
          ? 120000
          : 90000;
    const midBridgeTrigger =
      sectionIdx <= 1
        ? 'guide_mid_conversion_bridge'
        : `guide_mid_tier_${sectionIdx}_bridge`;

    return (
      <div
        data-testid="guide-mid-conversion-slot"
        data-top-landing-guide={isTopLandingGuide ? 'true' : 'false'}
        className="pt-3.5 border-t border-border space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-[12px] font-extrabold text-primary flex flex-wrap items-center gap-1.5">
            <span>대표 단지 실거래 · 비교 통계 바로가기</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <GuideAptCtaLink
              aptSlug="동탄더샵레이크에듀타운"
              canonicalSlug="동탄더샵레이크에듀타운"
              displayName="동탄더샵레이크에듀타운"
              dong={lakeEduTownPreview?.dong || '산척동'}
              href={lakeEduHref}
              guideSlug={guideSlug}
              placement="zone_section"
              sectionTitle={barSectionTitle}
              data-testid="guide-mid-lake-edutown-cta"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-[11px] font-extrabold transition-colors"
            >
              <span className="tabular-nums">{`동탄더샵레이크에듀타운 실거래${lakeEduPriceLabel}`}</span>
              <DviewIcon name="arrow-up-right" size={11} />
            </GuideAptCtaLink>
            <Link
              href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
              prefetch={false}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#eff1f5] hover:bg-slate-200/80 dark:bg-[#1e2532] dark:hover:bg-slate-700/80 border border-border text-primary text-[11px] font-extrabold transition-colors"
            >
              <span>1동탄 vs 2동탄 통계</span>
              <DviewIcon name="arrow-up-right" size={11} />
            </Link>
            <Link
              href="/technovalley"
              prefetch={false}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-slate-300 dark:hover:border-slate-700 text-secondary hover:text-primary text-[11px] font-extrabold transition-colors"
            >
              <span>테크노밸리 직주근접</span>
              <DviewIcon name="arrow-up-right" size={11} />
            </Link>
          </div>
        </div>

        {/* High-Visibility Direct Representative Apartment Quick-Jump CTA Row */}
        {midRepApts.length > 0 && (
          <div
            data-testid="guide-mid-rep-apt-quick-cta-list"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            {midRepApts.map((apt, idx) => (
              <GuideAptCtaLink
                key={`mid-rep-cta-${apt.canonicalSlug}-${idx}`}
                canonicalSlug={apt.canonicalSlug}
                apartmentName={apt.name}
                displayName={apt.displayName}
                dong={apt.dong}
                href={apt.href}
                guideSlug={guideSlug}
                placement="zone_section"
                sectionTitle={barSectionTitle}
                data-testid="guide-mid-rep-apt-cta-btn"
                className="group rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border hover:border-slate-300 dark:hover:border-slate-700 px-3 py-2 flex items-center justify-between gap-2 transition-colors shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[10.5px] font-extrabold text-secondary">
                    <span>{apt.dong}</span>
                    {apt.jeonseRatio > 0 && (
                      <span className="text-tertiary tabular-nums">
                        · 전세가율 {apt.jeonseRatio}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-black text-primary truncate group-hover:text-primary">
                    {apt.displayName}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-black text-primary tabular-nums">
                    {apt.latestPriceStr}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-extrabold">
                    <span>실거래 상세</span>
                    <DviewIcon name="arrow-up-right" size={10} />
                  </span>
                </div>
              </GuideAptCtaLink>
            ))}
          </div>
        )}

        {includeFinanceBridge && (
          <InlineMortgageDsrBridge
            apartmentName={midCalcApt?.displayName}
            canonicalSlug={midCalcApt?.canonicalSlug}
            dong={midCalcApt?.dong}
            benchmarkPriceManwon={midCalcApt?.latestPrice}
            guideSlug={guideSlug}
            surface="guide_mid_conversion"
            trigger={midBridgeTrigger}
            defaultFocus={guideSlug.includes('tax') ? 'tax' : 'mortgage'}
            initialPriceTierManwon={sectionTierManwon}
            compact
          />
        )}
      </div>
    );
  };

  const renderInBodyAdSlot = (apartmentName: string, dong?: string) => {
    if (isApprovalMode) {
      return null;
    }
    return (
      <div
        data-testid="guide-article-adslot-inbody"
        className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
      >
        <AdSlot
          refreshSlotId={`1000000002_guide_${guideSlug}_inbody_zone`}
          format="rectangle"
          minHeightClass="min-h-[250px]"
          cpaCampaignId="mortgage-refinance"
          apartmentName={apartmentName}
          dong={dong}
        />
      </div>
    );
  };

  const flushActiveZonePreview = (keySuffix: string | number) => {
    if (!activeZonePreview || emittedHeadings.has(activeZonePreview.sectionHeadingMatch)) {
      activeZonePreview = null;
      activeZonePreviewLevel = null;
      return;
    }
    const currentPreview = activeZonePreview;
    emittedHeadings.add(currentPreview.sectionHeadingMatch);
    emittedZonePreviewCount += 1;
    const currentSectionIndex = emittedZonePreviewCount;
    const isFirstZonePreview = currentSectionIndex === 1;
    activeZonePreview = null;
    activeZonePreviewLevel = null;

    elements.push(
      <section
        key={`zone-preview-${keySuffix}`}
        data-testid="guide-zone-section-preview"
        data-zone-id={currentPreview.zoneId || 'guide'}
        aria-label={currentPreview.sectionTitle}
        className="not-prose my-6 rounded-2xl border border-border bg-elevated p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-primary">
              <DviewIcon name="map-pin" size={15} />
              <span>{currentPreview.sectionTitle}</span>
            </div>
            <p className="mt-0.5 text-[11.5px] sm:text-xs text-secondary font-medium">
              본 권역 설명에 언급된 대표 단지의 국토교통부 실시간 실거래가 미니 프리뷰입니다. 카드를 클릭하면 단지 상세 시세·전세가율·DSR 리포트로 이동합니다.
            </p>
          </div>

          {currentPreview.zoneId && currentPreview.zoneName && (
            <Link
              href={`/zone/${currentPreview.zoneId}`}
              prefetch={false}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface border border-border text-primary text-[11px] font-extrabold hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] transition-colors w-fit shrink-0"
            >
              <span>{currentPreview.zoneName} 전체 시세</span>
              <DviewIcon name="arrow-up-right" size={12} />
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

        {/* Mid-Article High-Dwell Conversion Action Bar */}
        {renderMidConversionActionBar(
          currentPreview,
          isFirstZonePreview || isMultiTierFinanceGuide,
          currentSectionIndex
        )}

        {/* In-Body Mid-Section Zero-CLS AdSlot for Active-View Fill Rate */}
        {isFirstZonePreview &&
          renderInBodyAdSlot(
            currentPreview.items[0]?.canonicalSlug || currentPreview.sectionTitle,
            currentPreview.items[0]?.dong
          )}
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
      const cleanedHeadingText = headingText
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*/g, '')
        .trim();
      let sectionAnchorId: string | undefined;
      if (cleanedHeadingText) {
        h3SectionCounter += 1;
        sectionAnchorId = `guide-section-${h3SectionCounter}`;
      }
      const matchedH3 = findHeadingPreview(headingText);
      if (matchedH3) {
        activeZonePreview = matchedH3;
        activeZonePreviewLevel = 3;
      }
      elements.push(
        <h3
          key={`h3-${i}`}
          id={sectionAnchorId}
          className="scroll-mt-40 md:scroll-mt-48 text-xl sm:text-2xl font-black text-primary tracking-tight mt-10 mb-4 pb-2 border-b border-border/40"
        >
          {renderInlineBoldCore(headingText, guideSlug, inlineResolver)}
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
          {renderInlineBoldCore(headingText, guideSlug, inlineResolver)}
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
        <div key={`table-${startIdx}`} className="overflow-x-auto overscroll-x-contain my-6 rounded-xl border border-border/60">
          <table className="w-full text-left text-[12.5px] text-secondary">
            <thead className="bg-body text-primary font-bold border-b border-border/60">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} scope="col" className="px-3 py-2.5 sm:p-3.5 whitespace-nowrap">
                    {renderInlineBoldCore(h, guideSlug, inlineResolver)}
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
                    {cells.map((cell, cIdx) => {
                      const plainCellText = cell
                        .replace(/\*\*/g, '')
                        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                        .trim();
                      const isCompactCell = plainCellText.length <= 16;
                      return (
                        <td
                          key={cIdx}
                          className={
                            isCompactCell
                              ? 'px-3 py-2.5 sm:p-3.5 whitespace-nowrap align-top tabular-nums'
                              : cIdx === 0
                                ? 'px-3 py-2.5 sm:p-3.5 whitespace-normal break-keep min-w-[120px] sm:min-w-[140px] align-top tabular-nums'
                                : 'px-3 py-2.5 sm:p-3.5 whitespace-normal break-keep min-w-[148px] sm:min-w-[172px] align-top tabular-nums'
                          }
                        >
                          {renderInlineBoldCore(cell, guideSlug, inlineResolver)}
                        </td>
                      );
                    })}
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
              {renderInlineBoldCore(item, guideSlug, inlineResolver)}
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
              <span>{renderInlineBoldCore(item.mainText, guideSlug, inlineResolver)}</span>
              {item.subBullets.length > 0 && (
                <ul className="mt-1.5 space-y-1 pl-4 list-disc text-[13.5px] sm:text-[14.5px] text-secondary">
                  {item.subBullets.map((sub, subIdx) => (
                    <li key={subIdx} className="break-keep">
                      {renderInlineBoldCore(sub, guideSlug, inlineResolver)}
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
        {renderInlineBoldCore(paraLines.join(' '), guideSlug, inlineResolver)}
      </p>
    );
  }

  flushActiveZonePreview('end-of-body');

  if (emittedZonePreviewCount === 0 && elements.length > 0) {
    const midIndex = Math.max(1, Math.floor(elements.length / 2));
    elements.splice(
      midIndex,
      0,
      <section
        key="zone-preview-fallback-mid"
        data-testid="guide-zone-section-preview"
        data-zone-id="guide"
        aria-label="리포트 중간 핵심 전환 및 실거래 바로가기"
        className="not-prose my-6 rounded-2xl border border-border bg-elevated p-4 sm:p-5 space-y-3.5"
      >
        {renderMidConversionActionBar(undefined, true)}
        {renderInBodyAdSlot(
          lakeEduTownPreview?.canonicalSlug || '동탄더샵레이크에듀타운',
          lakeEduTownPreview?.dong
        )}
      </section>
    );
  }

  return elements;
}

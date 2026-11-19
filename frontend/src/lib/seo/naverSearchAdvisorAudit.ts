import fs from 'fs';
import path from 'path';
import type { MetadataRoute } from 'next';
import robots from '@/app/robots';
import { REQUIRED_ALLOWED_BOTS } from '@/lib/seo/robotsPolicy';
import sitemap from '@/app/sitemap';
import { buildDviewRssXml } from '@/app/feed.xml/route';
import { isAdSenseApprovalMode } from '@/lib/services/apartmentPageService';
import {
  GUIDE_ARTICLES,
  TOP_POPULAR_GUIDE_SLUGS,
  buildGuideArticleJsonLd,
  type GuideArticle,
} from '@/lib/data/guides';

export type NaverAuditCheckId =
  | 'naver_site_verification'
  | 'robots_yeti_and_geo_bots'
  | 'sitemap_completeness'
  | 'rss_feeds_compliance'
  | 'rss_autodiscovery_links'
  | 'guide_serp_and_geo_schema';

export interface NaverAuditCheckResult {
  id: NaverAuditCheckId;
  label: string;
  passed: boolean;
  summary: string;
  issues: string[];
}

export interface NaverSearchAdvisorAuditInput {
  baseUrl?: string;
  now?: Date;
  adsenseApprovalMode?: boolean;
  rootVerificationToken: string | null;
  /** Number of naver-site-verification declarations emitted in root layout (must be 1, never duplicated). */
  verificationTagCount?: number;
  /** Optional list of public/naver*.html verification files present in frontend/public/. */
  publicVerificationFiles?: string[];
  rssAutodiscovery: {
    rootLayout: boolean;
    homePage?: boolean;
    technovalley?: boolean;
    explore?: boolean;
    stats?: boolean;
    about?: boolean;
    contact?: boolean;
    terms?: boolean;
    privacy?: boolean;
    guideIndex: boolean;
    guideDetail: boolean;
  };
  robotsConfig: MetadataRoute.Robots;
  sitemapEntries: MetadataRoute.Sitemap;
  feedXml: string;
  rssXml: string;
  guides: GuideArticle[];
  guideJsonLds: Array<{ slug: string; jsonLd: Record<string, unknown> }>;
}

export interface NaverSearchAdvisorAuditReport {
  generatedAt: string;
  baseUrl: string;
  passed: boolean;
  passedCount: number;
  totalChecks: number;
  scorePct: number;
  checks: NaverAuditCheckResult[];
  submissionManifest: {
    naverVerificationToken: string | null;
    publicVerificationFiles?: string[];
    sitemapUrl: string;
    rssUrl: string;
    feedUrl: string;
    sitemapTotalUrls: number;
    rssItemCount: number;
    priorityPageFetchUrls: string[];
  };
}

const REQUIRED_SEARCH_AND_REVENUE_BOTS = REQUIRED_ALLOWED_BOTS;

const PUBLIC_SEO_PREFIXES = [
  '/guide',
  '/apartment',
  '/technovalley',
  '/zone',
  '/stats',
  '/explore',
  '/feed.xml',
  '/rss.xml',
] as const;

const NOINDEX_DISALLOWED_SITEMAP_PREFIXES = ['/lounge', '/news', '/admin'] as const;

function normalizeRuleArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isPublicPrefixBlockedByDisallow(publicPrefix: string, rawDisallow: string): boolean {
  const trimmed = String(rawDisallow || '').trim();
  if (!trimmed) return false;
  if (trimmed === '/' || trimmed === '/*') return true;

  // Normalize robots.txt wildcard & end-anchor patterns (e.g. '/guide/*', '/guide*', '/guide$')
  const withoutWildcards = trimmed
    .replace(/\$$/, '')
    .replace(/\*+$/, '')
    .replace(/\/+$/, '');
  if (!withoutWildcards) return true;

  return (
    publicPrefix === withoutWildcards ||
    publicPrefix.startsWith(`${withoutWildcards}/`) ||
    withoutWildcards.startsWith(`${publicPrefix}/`)
  );
}

function inspectSingleRssXml(
  xml: string,
  expectedSelfUrl: string,
  label: string,
  now: Date
): { itemCount: number; issues: string[] } {
  const issues: string[] = [];
  if (!xml || !xml.includes('<rss version="2.0"')) {
    issues.push(`${label}: RSS 2.0 루트 선언(<rss version="2.0">)이 누락되었습니다.`);
    return { itemCount: 0, issues };
  }

  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const itemCount = itemMatches.length;

  // Naver Search Advisor RSS registration accepts up to 50 recent items per feed
  if (itemCount === 0) {
    issues.push(`${label}: <item> 항목이 0개입니다.`);
  } else if (itemCount > 50) {
    issues.push(
      `${label}: <item> 개수(${itemCount}개)가 네이버 서치어드바이저 RSS 권장 상한(50개)을 초과합니다.`
    );
  }

  if (!xml.includes(`href="${expectedSelfUrl}"`) || !xml.includes('rel="self"')) {
    issues.push(`${label}: <atom:link href="${expectedSelfUrl}" rel="self" /> 자기 참조가 누락되었습니다.`);
  }

  if (xml.includes('Invalid Date')) {
    issues.push(`${label}: 유효하지 않은 날짜 문자열(Invalid Date)이 포함되어 있습니다.`);
  }

  // Detect raw unescaped ampersands outside valid XML entities
  const unescapedAmpersands = xml.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g);
  if (unescapedAmpersands && unescapedAmpersands.length > 0) {
    issues.push(`${label}: 이스케이프되지 않은 '&' 문자가 ${unescapedAmpersands.length}건 감지되었습니다.`);
  }

  const seenGuids = new Set<string>();
  const maxAllowedMs = now.getTime() + 60_000;

  itemMatches.forEach((itemXml, index) => {
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const guidMatch = itemXml.match(/<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    if (!titleMatch?.[1]?.trim()) {
      issues.push(`${label}: item[${index}] <title>이 비어 있습니다.`);
    }
    if (!linkMatch?.[1]?.trim().startsWith('https://')) {
      issues.push(`${label}: item[${index}] <link>가 정규 HTTPS URL이 아닙니다.`);
    }
    const guidValue = guidMatch?.[1]?.trim() || '';
    if (!guidValue) {
      issues.push(`${label}: item[${index}] <guid isPermaLink="true">가 누락되었습니다.`);
    } else if (seenGuids.has(guidValue)) {
      issues.push(`${label}: item[${index}] 중복 <guid> 감지 (${guidValue}).`);
    } else {
      seenGuids.add(guidValue);
    }

    const pubDateStr = pubDateMatch?.[1]?.trim() || '';
    const pubDateMs = pubDateStr ? new Date(pubDateStr).getTime() : Number.NaN;
    if (!pubDateStr || Number.isNaN(pubDateMs)) {
      issues.push(`${label}: item[${index}] <pubDate>가 RFC-822 유효 날짜가 아닙니다.`);
    } else if (pubDateMs > maxAllowedMs) {
      issues.push(`${label}: item[${index}] 미래 시점 <pubDate> 감지 (${pubDateStr}).`);
    }
  });

  return { itemCount, issues };
}

/**
 * Pure audit engine evaluating Naver Search Advisor (Yeti, Sitemap, RSS) & GEO readiness.
 */
export function runNaverSearchAdvisorAudit(
  input: NaverSearchAdvisorAuditInput
): NaverSearchAdvisorAuditReport {
  const baseUrl = (input.baseUrl || 'https://dongtanview.com').replace(/\/+$/, '');
  const now = input.now || new Date();
  const checks: NaverAuditCheckResult[] = [];

  // 1. Naver Site Verification Token
  {
    const issues: string[] = [];
    const token = input.rootVerificationToken?.trim() || '';
    if (!token) {
      issues.push('루트 메타데이터에 naver-site-verification 토큰이 누락되었습니다.');
    } else if (!/^[a-f0-9]{32,64}$/i.test(token)) {
      issues.push(`naver-site-verification 토큰 형식이 비정상입니다 (${token}).`);
    }
    if (
      typeof input.verificationTagCount === 'number' &&
      input.verificationTagCount > 1
    ) {
      issues.push(
        `layout.tsx에 naver-site-verification 메타 태그가 ${input.verificationTagCount}회 중복 선언되어 있습니다 (단일 metadata.other 선언으로 통합 필요).`
      );
    }
    checks.push({
      id: 'naver_site_verification',
      label: '네이버 서치어드바이저 소유권 메타 태그 검증',
      passed: issues.length === 0,
      summary:
        issues.length === 0
          ? `naver-site-verification 단일 토큰 확인 완료 (${token.slice(0, 8)}...${token.slice(-6)})`
          : issues[0],
      issues,
    });
  }

  // 2. Robots.txt Revenue & Search Crawler Allowlist Rules (Googlebot, Mediapartners-Google, Yeti, Daumoa, Bingbot)
  {
    const issues: string[] = [];
    const rules = normalizeRuleArray(input.robotsConfig.rules);
    const allowedAgents = new Set<string>();
    const requiredBotSet = new Set<string>(REQUIRED_SEARCH_AND_REVENUE_BOTS);

    for (const rule of rules) {
      const agents = normalizeRuleArray(rule.userAgent);
      const allows = normalizeRuleArray(rule.allow).filter(Boolean);
      const disallows = normalizeRuleArray(rule.disallow).filter(Boolean);
      const targetsRequiredBot = agents.some((ua) => requiredBotSet.has(ua));
      const allowsRoot = allows.includes('/');

      if (targetsRequiredBot && allowsRoot) {
        for (const ua of agents) {
          if (requiredBotSet.has(ua)) {
            allowedAgents.add(ua);
          }
        }
      }

      if (targetsRequiredBot) {
        for (const publicPrefix of PUBLIC_SEO_PREFIXES) {
          const blocked = disallows.some((disallowPattern) =>
            isPublicPrefixBlockedByDisallow(publicPrefix, disallowPattern)
          );
          if (blocked) {
            issues.push(
              `robots.ts에서 공개 색인 경로(${publicPrefix})가 차단되었습니다 (userAgent=${JSON.stringify(rule.userAgent)}).`
            );
          }
        }
      }
    }

    for (const bot of REQUIRED_SEARCH_AND_REVENUE_BOTS) {
      if (!allowedAgents.has(bot)) {
        issues.push(`robots.ts에 필수 검색·수익 크롤러(${bot}) 명시 허용 규칙이 누락되었습니다.`);
      }
    }

    const sitemapField = normalizeRuleArray(input.robotsConfig.sitemap);
    const expectedSitemapUrl = `${baseUrl}/sitemap.xml`;
    if (!sitemapField.includes(expectedSitemapUrl)) {
      issues.push(`robots.ts sitemap 선언에 ${expectedSitemapUrl}이 포함되지 않았습니다.`);
    }
    if (sitemapField.some((entry) => entry.includes('feed.xml') || entry.includes('rss.xml'))) {
      issues.push('robots.ts sitemap 필드에 RSS URL이 혼입되어 있습니다 (표준 Sitemap XML만 등록해야 함).');
    }

    checks.push({
      id: 'robots_yeti_and_geo_bots',
      label: 'Googlebot·Mediapartners-Google·Yeti·Daumoa·Bingbot 허용 및 비수익 봇 차단 검증',
      passed: issues.length === 0,
      summary:
        issues.length === 0
          ? `필수 봇 ${REQUIRED_SEARCH_AND_REVENUE_BOTS.length}종 허용 및 Sitemap 단일 정규 선언 확인`
          : issues[0],
      issues,
    });
  }

  // 3. Sitemap Completeness & Hygiene
  {
    const issues: string[] = [];
    const entries = input.sitemapEntries || [];
    const seenUrls = new Set<string>();
    const minSitemapUrls = (input.adsenseApprovalMode ?? isAdSenseApprovalMode()) ? 70 : 175;

    if (entries.length < minSitemapUrls) {
      issues.push(`사이트맵 URL 수(${entries.length}개)가 최소 기준(${minSitemapUrls}개)보다 적습니다.`);
    }

    entries.forEach((entry, idx) => {
      const url = entry.url || '';
      if (!url.startsWith(`${baseUrl}`)) {
        issues.push(`sitemap[${idx}] 도메인 불일치: ${url}`);
      }
      if (url.includes('?')) {
        issues.push(`sitemap[${idx}] 쿼리스트링 URL 포함 금지 위반: ${url}`);
      }
      if (seenUrls.has(url)) {
        issues.push(`사이트맵 중복 URL 감지: ${url}`);
      }
      seenUrls.add(url);

      const pathname = url.slice(baseUrl.length) || '/';
      if (
        NOINDEX_DISALLOWED_SITEMAP_PREFIXES.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
        )
      ) {
        issues.push(`noindex/내부 경로가 사이트맵에 포함되었습니다: ${pathname}`);
      }

      if (entry.lastModified) {
        const parsed = new Date(entry.lastModified);
        if (Number.isNaN(parsed.getTime())) {
          issues.push(`sitemap[${idx}] 유효하지 않은 lastModified: ${String(entry.lastModified)}`);
        } else if (parsed.getTime() > now.getTime() + 60_000) {
          issues.push(`sitemap[${idx}] 미래 시점 lastModified 감지: ${parsed.toISOString()}`);
        }
      }
    });

    checks.push({
      id: 'sitemap_completeness',
      label: '프로그래매틱 사이트맵(/sitemap.xml) 무결성 및 정규 URL 검증',
      passed: issues.length === 0,
      summary:
        issues.length === 0
          ? `총 ${entries.length}개 정규 HTTPS URL 무결성 통과 (중복·쿼리·미래 날짜 0건)`
          : issues[0],
      issues,
    });
  }

  // 4. RSS 2.0 Feeds (/feed.xml & /rss.xml) Parity & Naver Compliance
  let verifiedRssCount = 0;
  {
    const feedAudit = inspectSingleRssXml(input.feedXml, `${baseUrl}/feed.xml`, '/feed.xml', now);
    const rssAudit = inspectSingleRssXml(input.rssXml, `${baseUrl}/rss.xml`, '/rss.xml', now);
    const issues = [...feedAudit.issues, ...rssAudit.issues];

    if (feedAudit.itemCount !== rssAudit.itemCount) {
      issues.push(
        `/feed.xml(${feedAudit.itemCount}개)과 /rss.xml(${rssAudit.itemCount}개)의 항목 수가 일치하지 않습니다.`
      );
    }
    verifiedRssCount = rssAudit.itemCount;

    checks.push({
      id: 'rss_feeds_compliance',
      label: '네이버 서치어드바이저 RSS 2.0 피드(/rss.xml · /feed.xml) 규격 검증',
      passed: issues.length === 0,
      summary:
        issues.length === 0
          ? `/rss.xml 및 /feed.xml 각 ${verifiedRssCount}개 항목(상한 50개 이내) RFC-822·Permalink 무결성 통과`
          : issues[0],
      issues,
    });
  }

  // 5. HTML <link rel="alternate" type="application/rss+xml"> Autodiscovery
  {
    const issues: string[] = [];
    if (!input.rssAutodiscovery.rootLayout) {
      issues.push('루트 layout.tsx에 application/rss+xml 자동 발견 메타데이터가 누락되었습니다.');
    }
    if (input.rssAutodiscovery.homePage === false) {
      issues.push('홈페이지 src/app/page.tsx의 alternates에 application/rss+xml이 누락되어 layout.tsx RSS 링크가 덮어쓰여졌습니다.');
    }
    if (input.rssAutodiscovery.technovalley === false) {
      issues.push('/technovalley 메타데이터(buildTechnoValleySeoMetadata)에 application/rss+xml 자동 발견 링크가 누락되었습니다.');
    }
    if (input.rssAutodiscovery.explore === false) {
      issues.push('/explore/page.tsx에 application/rss+xml 자동 발견 링크가 누락되었습니다.');
    }
    if (input.rssAutodiscovery.stats === false) {
      issues.push('/stats/page.tsx에 application/rss+xml 자동 발견 링크가 누락되었습니다.');
    }
    if (input.rssAutodiscovery.about === false) {
      issues.push('/about/page.tsx에 application/rss+xml 자동 발견 링크가 누락되었습니다.');
    }
    if (input.rssAutodiscovery.contact === false) {
      issues.push('/contact/page.tsx에 application/rss+xml 자동 발견 링크가 누락되었습니다.');
    }
    if (input.rssAutodiscovery.terms === false) {
      issues.push('/terms/page.tsx에 application/rss+xml 자동 발견 링크가 누락되었습니다.');
    }
    if (input.rssAutodiscovery.privacy === false) {
      issues.push('/privacy/page.tsx에 application/rss+xml 자동 발견 링크가 누락되었습니다.');
    }
    if (!input.rssAutodiscovery.guideIndex) {
      issues.push('/guide/page.tsx에 application/rss+xml 자동 발견 메타데이터가 누락되었습니다.');
    }
    if (!input.rssAutodiscovery.guideDetail) {
      issues.push('/guide/[slug]/page.tsx에 application/rss+xml 자동 발견 메타데이터가 누락되었습니다.');
    }

    checks.push({
      id: 'rss_autodiscovery_links',
      label: 'HTML 헤드 RSS 자동 발견(Autodiscovery) 링크 연결 검증',
      passed: issues.length === 0,
      summary:
        issues.length === 0
          ? '루트·홈(/)·테크노밸리·탐색·통계·가이드·안내(about/contact/terms/privacy) 전 계층 RSS 자동 발견 연결 완료'
          : issues[0],
      issues,
    });
  }

  // 6. Guide SERP Titles/Descriptions & GEO Speakable + Dataset Schema
  {
    const issues: string[] = [];
    const seenTitles = new Set<string>();
    const jsonLdBySlug = new Map(input.guideJsonLds.map((item) => [item.slug, item.jsonLd]));

    if (input.guides.length === 0) {
      issues.push('검증할 가이드 아티클이 없습니다.');
    }

    for (const guide of input.guides) {
      const effectiveTitle = (guide.seoTitle || guide.title || '').trim();
      const effectiveDesc = (guide.seoDescription || guide.description || '').trim();

      if (!effectiveTitle) {
        issues.push(`[${guide.slug}] seoTitle/title이 비어 있습니다.`);
      } else if (seenTitles.has(effectiveTitle)) {
        issues.push(`[${guide.slug}] 중복 SERP 타이틀 감지: "${effectiveTitle}"`);
      }
      seenTitles.add(effectiveTitle);

      if (effectiveDesc.length < 40) {
        issues.push(
          `[${guide.slug}] 메타 설명 길이(${effectiveDesc.length}자)가 네이버·구글 스니펫 최소 권장(40자) 미만입니다.`
        );
      }

      if (!Array.isArray(guide.faqs) || guide.faqs.length < 2) {
        issues.push(`[${guide.slug}] FAQ 항목이 2개 미만입니다.`);
      }

      const jsonLd = jsonLdBySlug.get(guide.slug);
      const graph = Array.isArray(jsonLd?.['@graph'])
        ? (jsonLd?.['@graph'] as Array<Record<string, unknown>>)
        : [];
      const articleNode = graph.find((node) => node['@type'] === 'Article');
      const faqNode = graph.find((node) => node['@type'] === 'FAQPage');

      if (!articleNode) {
        issues.push(`[${guide.slug}] JSON-LD Article 노드가 누락되었습니다.`);
      } else {
        const speakable = articleNode.speakable as Record<string, unknown> | undefined;
        const selectors = Array.isArray(speakable?.cssSelector)
          ? (speakable?.cssSelector as string[])
          : [];
        const hasFaqs = Array.isArray(guide.faqs) && guide.faqs.length > 0;
        if (
          speakable?.['@type'] !== 'SpeakableSpecification' ||
          !selectors.includes('#guide-geo-fact-sheet') ||
          !selectors.includes('#guide-key-takeaways')
        ) {
          issues.push(`[${guide.slug}] GEO 인용용 SpeakableSpecification(#guide-geo-fact-sheet)이 누락되었습니다.`);
        }
        if (hasFaqs && !selectors.includes('#guide-faq-section')) {
          issues.push(`[${guide.slug}] FAQ 보유 가이드에 Speakable #guide-faq-section 셀렉터가 누락되었습니다.`);
        } else if (!hasFaqs && selectors.includes('#guide-faq-section')) {
          issues.push(`[${guide.slug}] FAQ 미보유 가이드에 존재하지 않는 #guide-faq-section Speakable 셀렉터가 포함되었습니다.`);
        }
        if (!articleNode.isBasedOn) {
          issues.push(`[${guide.slug}] 국토교통부 공공 데이터셋 출처(isBasedOn) 스키마가 누락되었습니다.`);
        }
      }

      if (!faqNode) {
        issues.push(`[${guide.slug}] JSON-LD FAQPage 노드가 누락되었습니다.`);
      }
    }

    checks.push({
      id: 'guide_serp_and_geo_schema',
      label: '가이드 SERP 메타데이터 고유성 및 AI 검색(GEO) Speakable·FAQ 스키마 검증',
      passed: issues.length === 0,
      summary:
        issues.length === 0
          ? `가이드 ${input.guides.length}편 고유 타이틀·설명 및 SpeakableSpecification + Dataset + FAQPage 검증 완료`
          : issues[0],
      issues,
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const totalChecks = checks.length;
  const scorePct = totalChecks > 0 ? Math.round((passedCount / totalChecks) * 100) : 0;

  const priorityPageFetchUrls = [
    `${baseUrl}/`,
    `${baseUrl}/guide`,
    `${baseUrl}/technovalley`,
    `${baseUrl}/explore`,
    `${baseUrl}/stats`,
    ...TOP_POPULAR_GUIDE_SLUGS.map((slug) => `${baseUrl}/guide/${slug}`),
  ];

  return {
    generatedAt: now.toISOString(),
    baseUrl,
    passed: passedCount === totalChecks,
    passedCount,
    totalChecks,
    scorePct,
    checks,
    submissionManifest: {
      naverVerificationToken: input.rootVerificationToken,
      ...(input.publicVerificationFiles && input.publicVerificationFiles.length > 0
        ? { publicVerificationFiles: input.publicVerificationFiles }
        : {}),
      sitemapUrl: `${baseUrl}/sitemap.xml`,
      rssUrl: `${baseUrl}/rss.xml`,
      feedUrl: `${baseUrl}/feed.xml`,
      sitemapTotalUrls: input.sitemapEntries.length,
      rssItemCount: verifiedRssCount,
      priorityPageFetchUrls,
    },
  };
}

function readSourceSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Collects live metadata, robots, sitemap, RSS feeds, and GEO schemas from the workspace
 * and executes the full Naver Search Advisor & GEO readiness audit.
 */
export async function collectAndAuditNaverSeoReadiness(
  frontendRoot: string = process.cwd()
): Promise<NaverSearchAdvisorAuditReport> {
  const resolvedFrontendRoot = fs.existsSync(path.resolve(frontendRoot, 'src/app/layout.tsx'))
    ? frontendRoot
    : fs.existsSync(path.resolve(frontendRoot, 'frontend/src/app/layout.tsx'))
      ? path.resolve(frontendRoot, 'frontend')
      : frontendRoot;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com').replace(/\/+$/, '');
  const layoutSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/layout.tsx'));
  const homePageSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/page.tsx'));
  const explorePageSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/explore/page.tsx'));
  const statsPageSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/stats/page.tsx'));
  const aboutPageSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/about/page.tsx'));
  const contactPageSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/contact/page.tsx'));
  const termsPageSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/terms/page.tsx'));
  const privacyPageSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/privacy/page.tsx'));
  const guideIndexSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/guide/page.tsx'));
  const guideDetailSource = readSourceSafe(path.resolve(resolvedFrontendRoot, 'src/app/guide/[slug]/page.tsx'));
  const aptPageServiceSource = readSourceSafe(
    path.resolve(resolvedFrontendRoot, 'src/lib/services/apartmentPageService.ts')
  );

  let publicVerificationFiles: string[] = [];
  try {
    const publicDir = path.resolve(resolvedFrontendRoot, 'public');
    if (fs.existsSync(publicDir)) {
      publicVerificationFiles = fs
        .readdirSync(publicDir)
        .filter((f) => /^naver[a-f0-9]+\.html$/i.test(f))
        .sort();
    }
  } catch {
    publicVerificationFiles = [];
  }

  const tokenMatch = layoutSource.match(/['"]naver-site-verification['"]\s*:\s*['"]([^'"]+)['"]/);
  const rootVerificationToken = tokenMatch?.[1] || null;
  const verificationTagCount = (
    layoutSource.match(/naver-site-verification/g) || []
  ).length;

  const hasRssAutodiscovery = (src: string) =>
    src.includes("'application/rss+xml'") || src.includes('"application/rss+xml"');

  const technoValleyMetaStart = aptPageServiceSource.indexOf('export function buildTechnoValleySeoMetadata');
  const technoValleyMetaChunk =
    technoValleyMetaStart >= 0 ? aptPageServiceSource.slice(technoValleyMetaStart) : '';

  const robotsConfig = robots();
  const sitemapEntries = await sitemap({ id: 0 });
  const now = new Date();
  const nowUtc = now.toUTCString();
  const feedXml = buildDviewRssXml({ baseUrl, selfPath: '/feed.xml', nowUtc });
  const rssXml = buildDviewRssXml({ baseUrl, selfPath: '/rss.xml', nowUtc });

  const guideJsonLds = GUIDE_ARTICLES.map((article) => ({
    slug: article.slug,
    jsonLd: buildGuideArticleJsonLd(article, baseUrl) as Record<string, unknown>,
  }));

  return runNaverSearchAdvisorAudit({
    baseUrl,
    now,
    rootVerificationToken,
    verificationTagCount,
    publicVerificationFiles,
    rssAutodiscovery: {
      rootLayout: hasRssAutodiscovery(layoutSource),
      homePage: hasRssAutodiscovery(homePageSource),
      technovalley: hasRssAutodiscovery(technoValleyMetaChunk),
      explore: hasRssAutodiscovery(explorePageSource),
      stats: hasRssAutodiscovery(statsPageSource),
      about: hasRssAutodiscovery(aboutPageSource),
      contact: hasRssAutodiscovery(contactPageSource),
      terms: hasRssAutodiscovery(termsPageSource),
      privacy: hasRssAutodiscovery(privacyPageSource),
      guideIndex: hasRssAutodiscovery(guideIndexSource),
      guideDetail: hasRssAutodiscovery(guideDetailSource),
    },
    robotsConfig,
    sitemapEntries,
    feedXml,
    rssXml,
    guides: GUIDE_ARTICLES,
    guideJsonLds,
  });
}

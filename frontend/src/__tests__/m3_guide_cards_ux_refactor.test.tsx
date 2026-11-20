/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import GuideIndexPage from '@/app/guide/page';
import { GUIDE_ARTICLES, isTopLandingGuideSlug } from '@/lib/data/guides';
import {
  auditSeoSemanticContainer,
  hasVerboseProseEnding,
  measureCopyLength,
} from '@/lib/design-system/copyDiet';
import {
  GUIDE_CARD_SUMMARY_MAP,
  GUIDE_CARD_TITLE_MAP,
  getGuideCardSummary,
  getGuideCardTitle,
} from '@/lib/guide/guideCardDisplay';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/guide',
}));

jest.mock('@/components/LoungeHeader', () => {
  return function MockLoungeHeader({ activeTab }: { activeTab?: string }) {
    return <header data-testid="mock-lounge-header" data-active-tab={activeTab} />;
  };
});

jest.mock('@/components/pwa/MobileDock', () => {
  return function MockMobileDock({ activeTab }: { activeTab?: string }) {
    return <nav data-testid="mock-mobile-dock" data-active-tab={activeTab} />;
  };
});

jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: function MockAdSlot({
    refreshSlotId,
    minHeightClass,
  }: {
    refreshSlotId: string;
    minHeightClass?: string;
  }) {
    return (
      <div
        data-testid={`mock-adslot-${refreshSlotId}`}
        data-min-height={minHeightClass}
      />
    );
  },
}));

describe('M3: /guide 2-Column Report Cards UX Refactor (R4 / F8)', () => {
  it('enforces Ad Money v5.1 Soft-Surface, Copy Diet, and DOM contracts across all 25 guide cards', () => {
    const { container, unmount } = render(<GuideIndexPage />);
    const articles = Array.from(container.querySelectorAll('article'));

    // R-M3-07: Exact 25 cards + structural hubs + JSON-LD + semantic SEO audit
    expect(articles).toHaveLength(25);
    expect(container.querySelector('[data-testid="guide-index-top-conversion-hub"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="guide-index-lake-edutown-spotlight"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="guide-index-adslot-top"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="guide-index-adslot-bottom"]')).not.toBeNull();
    expect(container.querySelector('#guide-hub-morning-alert-retention')).not.toBeNull();
    expect(container.querySelectorAll('.font-mono')).toHaveLength(0);

    const seoAudit = auditSeoSemanticContainer(container);
    expect(seoAudit.valid).toBe(true);
    expect(seoAudit.h1Count).toBe(1);
    expect(seoAudit.adSlotsInsideAccordionCount).toBe(0);

    const jsonLdScript = container.querySelector('script[type="application/ld+json"]');
    expect(jsonLdScript).not.toBeNull();
    const jsonLd = JSON.parse(jsonLdScript!.textContent || '{}');
    expect(jsonLd['@type']).toBe('CollectionPage');
    expect(jsonLd.hasPart).toHaveLength(25);
    expect(jsonLd.hasPart[0].headline).toBe(GUIDE_ARTICLES[0].title);

    // R-M3-05: Preserve DOM price contracts from featuredApartments.slice(0, 3)
    expect(container.textContent).toContain('· 26억2,000');
    expect(container.textContent).toContain('· 16억8,000');

    let top3Count = 0;

    articles.forEach((articleEl, index) => {
      const sourceArticle = GUIDE_ARTICLES[index];
      const classTokens = articleEl.className.split(/\s+/);

      // R-M3-01: Soft-Surface borderless, shadowless card container & min-w-0 grid containment
      expect(classTokens).toContain('bg-[#f9fafb]');
      expect(classTokens).toContain('hover:bg-[#f2f4f6]');
      expect(classTokens).toContain('dark:bg-[#17171c]');
      expect(classTokens).toContain('dark:hover:bg-[#202027]');
      expect(classTokens).toContain('rounded-2xl');
      expect(classTokens).toContain('min-w-0');
      expect(classTokens.some((token) => token.startsWith('border'))).toBe(false);
      expect(classTokens.some((token) => token.includes('shadow'))).toBe(false);
      expect(articleEl.textContent).not.toContain('핵심 리포트 요약');

      const innerContentDiv = articleEl.firstElementChild;
      expect(innerContentDiv).not.toBeNull();
      expect(innerContentDiv!.className.split(/\s+/)).toContain('min-w-0');

      // R-M3-02: Max 2 borderless pills + compact tabular-nums meta + no repeated author
      const categoryPill = articleEl.querySelector('span.bg-brand-green-light');
      expect(categoryPill).not.toBeNull();
      expect(categoryPill!.className).not.toContain('border');
      expect(measureCopyLength(categoryPill!.textContent || '')).toBeLessThanOrEqual(10);

      const top3Badge = articleEl.querySelector('[data-testid="guide-index-card-top3-badge"]');
      if (isTopLandingGuideSlug(sourceArticle.slug)) {
        top3Count += 1;
        expect(top3Badge).not.toBeNull();
        expect(top3Badge!.className).not.toContain('border');
        expect(top3Badge!.textContent?.trim()).toBe('신규 유입 TOP 3');
      } else {
        expect(top3Badge).toBeNull();
      }

      expect(articleEl.textContent).not.toContain(sourceArticle.author);
      expect(articleEl.textContent).toContain(`${sourceArticle.date} · ${sourceArticle.readingTime}`);
      const metaSpan = Array.from(articleEl.querySelectorAll('span')).find((el) =>
        el.textContent?.includes(`${sourceArticle.date} · ${sourceArticle.readingTime}`)
      );
      expect(metaSpan?.className).toContain('tabular-nums');

      // R-M3-03: Concise 2-line <h2> across all 23 cards (<= 36 graphemes) without duplicated city variants
      const h2El = articleEl.querySelector('h2');
      expect(h2El).not.toBeNull();
      expect(h2El!.className).toContain('line-clamp-2');
      const h2Text = (h2El!.textContent || '').trim();
      expect(measureCopyLength(h2Text)).toBeGreaterThan(0);
      expect(measureCopyLength(h2Text)).toBeLessThanOrEqual(36);
      if (index === 0) {
        expect(h2Text).toContain('1동탄 vs 2동탄');
        expect(h2Text).not.toContain('동탄1신도시·동탄2신도시');
      }

      // R-M3-04: Exactly 1 crisp summary <p>, <= 50 chars, zero verbose predicates
      const summaryParagraphs = Array.from(articleEl.querySelectorAll('p'));
      expect(summaryParagraphs).toHaveLength(1);
      const summaryEl = summaryParagraphs[0];
      const summaryText = (summaryEl.textContent || '').trim();
      expect(summaryEl.className).toContain('line-clamp-2');
      expect(measureCopyLength(summaryText)).toBeGreaterThan(0);
      expect(measureCopyLength(summaryText)).toBeLessThanOrEqual(50);
      expect(hasVerboseProseEnding(summaryText)).toBe(false);
      expect(summaryText).not.toMatch(/[가-힣](?:합니다|드립니다|입니다|됩니다|했습니다)[.!]?$/u);
      expect(articleEl.textContent).not.toContain(sourceArticle.description);

      // R-M3-05: <= 3 clean inline representative apartment links with wrapping safety (no bulky blue boxes)
      const aptLinks = Array.from(
        articleEl.querySelectorAll('[data-testid="guide-index-card-apt-cta-pill"]')
      );
      expect(aptLinks.length).toBeGreaterThan(0);
      expect(aptLinks.length).toBeLessThanOrEqual(3);
      aptLinks.forEach((linkEl) => {
        const linkTokens = linkEl.className.split(/\s+/);
        expect(linkTokens).toContain('tabular-nums');
        expect(linkTokens).toContain('flex-wrap');
        expect(linkTokens).toContain('items-baseline');
        expect(linkTokens).toContain('max-w-full');
        expect(linkTokens).toContain('min-w-0');
        expect(linkEl.className).not.toContain('bg-blue-50');
        expect(linkEl.className).not.toContain('border-blue-200');
      });

      // R-M3-06: No hashtag cloud and no repeated boilerplate
      const hasHashtagPill = Array.from(articleEl.querySelectorAll('span')).some((el) =>
        (el.textContent || '').trim().startsWith('#')
      );
      expect(hasHashtagPill).toBe(false);
      expect(articleEl.textContent).not.toContain('실증 공공데이터 기반 리서치');
      expect(articleEl.textContent).not.toContain('대표 단지 실거래 바로가기:');
      expect(articleEl.textContent).toContain('전문 읽기');
    });

    expect(top3Count).toBe(3);

    unmount();
  });

  it('maps all 25 slugs in GUIDE_CARD_TITLE_MAP (<= 34 graphemes) and GUIDE_CARD_SUMMARY_MAP', () => {
    for (const article of GUIDE_ARTICLES) {
      expect(GUIDE_CARD_TITLE_MAP[article.slug]).toBeDefined();
      expect(GUIDE_CARD_SUMMARY_MAP[article.slug]).toBeDefined();
      const mappedTitle = getGuideCardTitle(article.slug, article.title);
      expect(measureCopyLength(mappedTitle)).toBeLessThanOrEqual(34);
    }
  });

  it('strips verbose Korean predicates and dangling particles cleanly in getGuideCardSummary unmapped fallback', () => {
    const cases: Array<{
      subtitle: string;
      description?: string;
      fallbackLabel?: string;
      expected: string;
      forbiddenSuffixes: RegExp[];
    }> = [
      {
        subtitle: '스트레스 DSR 한도를 확인할 수 있습니다.',
        expected: '스트레스 DSR 한도',
        forbiddenSuffixes: [/있습니다[.!]?$/u, /를$/u],
      },
      {
        subtitle: '1동탄과 2동탄의 실거래가 격차를 분석합니다.',
        expected: '1동탄과 2동탄의 실거래가 격차',
        forbiddenSuffixes: [/합니다[.!]?$/u, /를$/u],
      },
      {
        subtitle: '실거래가와 전세가율을 비교해 드립니다.',
        expected: '실거래가와 전세가율',
        forbiddenSuffixes: [/드립니다[.!]?$/u, /해$/u, /을$/u],
      },
      {
        subtitle: '분석합니다.',
        expected: '실거래·입지 핵심 요약',
        forbiddenSuffixes: [/합니다[.!]?$/u],
      },
      {
        subtitle: '솔빛마을 시세를 분석합니다.',
        expected: '솔빛마을 시세',
        forbiddenSuffixes: [/합니다[.!]?$/u, /를$/u],
      },
      {
        subtitle: '솔빛마을을 분석합니다.',
        expected: '솔빛마을',
        forbiddenSuffixes: [/합니다[.!]?$/u, /마을을$/u],
      },
      {
        subtitle: '동탄역 시세에 대해 분석합니다.',
        expected: '동탄역 시세',
        forbiddenSuffixes: [/합니다[.!]?$/u, /에\s*대해$/u],
      },
      {
        subtitle: '동탄역 시세에 대해서 분석합니다.',
        expected: '동탄역 시세',
        forbiddenSuffixes: [/합니다[.!]?$/u, /에\s*대해서$/u],
      },
      {
        subtitle: '동탄역 시세에 관해 분석합니다.',
        expected: '동탄역 시세',
        forbiddenSuffixes: [/합니다[.!]?$/u, /에\s*관해$/u],
      },
      {
        subtitle: '동탄역 시세에 따라 달라집니다.',
        expected: '동탄역 시세',
        forbiddenSuffixes: [/집니다[.!]?$/u, /에\s*따라$/u],
      },
      {
        subtitle: '실거래 데이터 분석을 통해 확인합니다.',
        expected: '실거래 데이터 분석',
        forbiddenSuffixes: [/합니다[.!]?$/u, /을\s*통해$/u],
      },
      {
        subtitle: 'GTX-A를 분석합니다.',
        expected: 'GTX-A',
        forbiddenSuffixes: [/합니다[.!]?$/u, /를$/u],
      },
      {
        subtitle: 'DSR 40%를 분석합니다.',
        expected: 'DSR 40%',
        forbiddenSuffixes: [/합니다[.!]?$/u, /를$/u],
      },
      {
        subtitle: '전용 84㎡를 분석합니다.',
        expected: '전용 84㎡',
        forbiddenSuffixes: [/합니다[.!]?$/u, /를$/u],
      },
      {
        subtitle: '시범단지(4대장)를 분석합니다.',
        expected: '시범단지(4대장)',
        forbiddenSuffixes: [/합니다[.!]?$/u, /를$/u],
      },
      {
        subtitle: '스트레스 DSR을 분석합니다.',
        expected: '스트레스 DSR',
        forbiddenSuffixes: [/합니다[.!]?$/u, /을$/u],
      },
      {
        subtitle: '   ',
        description: '동탄역 GTX-A 핵심 요약',
        expected: '동탄역 GTX-A 핵심 요약',
        forbiddenSuffixes: [/핵심\s*요약입니다[.!]?$/u],
      },
      {
        subtitle: '분석합니다.',
        description: '',
        fallbackLabel: '핵심 요약입니다.',
        expected: '실거래·입지 핵심 요약',
        forbiddenSuffixes: [/입니다[.!]?$/u],
      },
      {
        subtitle: '솔빛마을 통해 이동합니다.',
        expected: '솔빛마을',
        forbiddenSuffixes: [/통해/u, /이동합니다/u, /^솔빛마$/u],
      },
      {
        subtitle: '동탄 시범마을입니다.',
        expected: '동탄 시범마을',
        forbiddenSuffixes: [/입니다[.!]?$/u],
      },
      {
        subtitle: '실거래 요약입니다.',
        expected: '실거래 요약',
        forbiddenSuffixes: [/입니다[.!]?$/u],
      },
      {
        subtitle: '동탄역 시세를 비교해 보세요.',
        expected: '동탄역 시세',
        forbiddenSuffixes: [/보세요[.!]?$/u, /비교해/u, /를$/u],
      },
      {
        subtitle: '동탄역 시세를 분석해 드리고 있습니다.',
        expected: '동탄역 시세',
        forbiddenSuffixes: [/있습니다[.!]?$/u, /드리고/u, /분석해/u, /를$/u],
      },
      {
        subtitle: '84㎡(국민평형)을 통해 확인합니다.',
        expected: '84㎡(국민평형)',
        forbiddenSuffixes: [/확인합니다[.!]?$/u, /통해/u, /을$/u],
      },
      {
        subtitle: '1동탄·2동탄 학군을 위해 정리합니다.',
        expected: '1동탄·2동탄 학군',
        forbiddenSuffixes: [/정리합니다[.!]?$/u, /위해/u, /을$/u],
      },
      {
        subtitle: '   ...   ',
        description: '',
        expected: '실거래·입지 핵심 요약',
        forbiddenSuffixes: [/^\.+$/u],
      },
      {
        subtitle: '  · , -  ',
        description: '',
        expected: '실거래·입지 핵심 요약',
        forbiddenSuffixes: [/^[\s·,-]+$/u],
      },
      {
        subtitle: '   ...   ',
        description: '동탄역 GTX-A 핵심 요약',
        expected: '동탄역 GTX-A 핵심 요약',
        forbiddenSuffixes: [/^\.+$/u],
      },
      {
        subtitle: '분석합니다.',
        description: '',
        fallbackLabel: '   ...   ',
        expected: '실거래·입지 핵심 요약',
        forbiddenSuffixes: [/^\.+$/u, /입니다[.!]?$/u],
      },
    ];

    for (const testCase of cases) {
      const out = getGuideCardSummary(
        '__unmapped_slug__',
        testCase.subtitle,
        testCase.description ?? '',
        testCase.fallbackLabel
      );
      expect(out).toBe(testCase.expected);
      expect(measureCopyLength(out)).toBeGreaterThan(0);
      expect(measureCopyLength(out)).toBeLessThanOrEqual(50);
      expect(hasVerboseProseEnding(out)).toBe(false);
      expect(out).not.toMatch(/[가-힣](?:습니다|합니다|드립니다|입니다|됩니다|했습니다|있습니다|없습니다)[.!]?$/u);
      for (const pattern of testCase.forbiddenSuffixes) {
        expect(out).not.toMatch(pattern);
      }
    }
  });

  it('guards getGuideCardSummary against quadratic ReDoS on 50k-character adversarial inputs', () => {
    const hangulInput = `${'가'.repeat(50000)}!`;
    const hangulStart = performance.now();
    const hangulOut = getGuideCardSummary('__unmapped_slug__', hangulInput, '');
    const hangulElapsedMs = performance.now() - hangulStart;
    expect(hangulOut).toHaveLength(50);
    expect(hangulOut.endsWith('…')).toBe(true);
    expect(hangulElapsedMs).toBeLessThan(100);

    const commaInput = `${','.repeat(50000)}a`;
    const commaStart = performance.now();
    const commaOut = getGuideCardSummary('__unmapped_slug__', commaInput, '');
    const commaElapsedMs = performance.now() - commaStart;
    expect(commaOut).toBe('a');
    expect(commaElapsedMs).toBeLessThan(50);

    const commaPredicateInput = `${','.repeat(50000)}a분석합니다.`;
    const commaPredStart = performance.now();
    const commaPredOut = getGuideCardSummary('__unmapped_slug__', commaPredicateInput, '');
    const commaPredElapsedMs = performance.now() - commaPredStart;
    expect(commaPredOut).toBe('a');
    expect(commaPredElapsedMs).toBeLessThan(50);

    // Additional adversarial inputs that trigger the `니다` tail check on 50k single-token Hangul runs
    const hangulNidaInput = `${'가'.repeat(50000)}가니다.`;
    const hangulNidaStart = performance.now();
    const hangulNidaOut = getGuideCardSummary('__unmapped_slug__', hangulNidaInput, '');
    const hangulNidaElapsedMs = performance.now() - hangulNidaStart;
    expect(hangulNidaOut).toHaveLength(50);
    expect(hangulNidaOut.endsWith('…')).toBe(true);
    expect(hangulNidaElapsedMs).toBeLessThan(50);

    const hangulVerbInput = `a${'가'.repeat(50000)}합니다.`;
    const hangulVerbStart = performance.now();
    const hangulVerbOut = getGuideCardSummary('__unmapped_slug__', hangulVerbInput, '');
    const hangulVerbElapsedMs = performance.now() - hangulVerbStart;
    expect(hangulVerbOut).toBe('a');
    expect(hangulVerbElapsedMs).toBeLessThan(50);

    const hangulMultiWordInput = `${'가'.repeat(50000)}해 드리고 있습니다.`;
    const hangulMultiWordStart = performance.now();
    const hangulMultiWordOut = getGuideCardSummary('__unmapped_slug__', hangulMultiWordInput, '');
    const hangulMultiWordElapsedMs = performance.now() - hangulMultiWordStart;
    expect(hangulMultiWordOut).toBe('실거래·입지 핵심 요약');
    expect(hangulMultiWordElapsedMs).toBeLessThan(50);
  });
});

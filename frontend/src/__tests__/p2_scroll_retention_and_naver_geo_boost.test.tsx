/**
 * @jest-environment jsdom
 */
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { metadata as rootMetadata } from '@/app/layout';
import GuideIndexPage, { metadata as guideIndexMetadata } from '@/app/guide/page';
import GuideDetailPage, {
  extractGuideSectionHeadings,
  generateMetadata as generateGuideMetadata,
  renderGuideBodyContent,
} from '@/app/guide/[slug]/page';
import { GET as getFeedXml, buildDviewRssXml, parseRssPubDate } from '@/app/feed.xml/route';
import { GET as getRssXml } from '@/app/rss.xml/route';
import PageHeroHeader from '@/components/PageHeroHeader';
import GuideMobileScrollDepthBar, {
  computeScrollProgressPct,
  detectMobileScrollPlatform,
} from '@/components/guide/GuideMobileScrollDepthBar';
import GuideMorningAlertRetentionCard, {
  type GuideRetentionAptItem,
} from '@/components/guide/GuideMorningAlertRetentionCard';
import CustomA2HSModal from '@/components/pwa/CustomA2HSModal';
import PushSubscriptionModal from '@/components/pwa/PushSubscriptionModal';
import {
  checkCopyBudget,
  hasVerboseProseEnding,
} from '@/lib/design-system/copyDiet';
import {
  GUIDE_ARTICLES,
  GUIDE_TOPIC_CLUSTERS,
  HIGH_CONVERSION_FLAGSHIP_APARTMENTS,
  buildGuideAptMiniPreview,
  buildGuideArticleJsonLd,
  getRelatedGuidesForGuide,
  getTopicClusterForGuide,
  resolveGuideZoneSectionPreviews,
} from '@/lib/data/guides';
import { resolvePushSubscriptionAptAliases } from '@/lib/utils/apartmentMapping';
import { AuthContext, STATIC_AUTH_STATE } from '@/contexts/AuthContext';
import * as useFavoritesModule from '@/hooks/useFavorites';
import {
  DVIEW_GA4_CUSTOM_DIMENSIONS,
  DVIEW_GA4_INTERACTION_DIMENSIONS,
} from '@/lib/services/ga4CustomDimensions';
import { ZONES } from '@/lib/zones';
import {
  collectAndAuditNaverSeoReadiness,
  runNaverSearchAdvisorAudit,
} from '@/lib/seo/naverSearchAdvisorAudit';
import * as analyticsUtils from '@/lib/utils/analytics';
import {
  getActiveBodyScrollLockCount,
  resetBodyScrollLockForTests,
} from '@/lib/utils/bodyScrollLock';

let mockPwaState = {
  isStandalone: false,
  isIOS: false,
  isPushSupported: true,
  isSubscribed: false,
  canInstall: false,
  showCustomA2HSModal: false,
  setShowCustomA2HSModal: jest.fn(),
  installApp: jest.fn(),
  subscribeToPush: jest.fn().mockResolvedValue(true),
  unsubscribeFromPush: jest.fn().mockResolvedValue(true),
  showToast: jest.fn(),
  triggerCustomA2HSModal: jest.fn(),
};

const MockPwaContext = React.createContext<typeof mockPwaState | null>(null);

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => React.useContext(MockPwaContext) ?? mockPwaState,
  PWAProvider: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value?: typeof mockPwaState;
  }) => (
    <MockPwaContext.Provider value={value ?? mockPwaState}>
      {children}
    </MockPwaContext.Provider>
  ),
}));

jest.mock('@/app/globals.css', () => ({}));

jest.mock('next/font/local', () => () => ({
  variable: '--font-pretendard',
  className: 'mock-pretendard',
}));

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
  AdSlot: function MockAdSlot({ refreshSlotId }: { refreshSlotId: string }) {
    return <div data-testid="mock-adslot" data-slot-id={refreshSlotId} />;
  },
}));

describe('P2 Boost: Mobile Scroll Depth, Morning 7AM Revisit Retention & Naver/GEO Readiness', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    resetBodyScrollLockForTests();
    trackEventSpy = jest.spyOn(analyticsUtils, 'trackEvent').mockImplementation(() => {});
    window.localStorage.clear();
    mockPwaState = {
      isStandalone: false,
      isIOS: false,
      isPushSupported: true,
      isSubscribed: false,
      canInstall: false,
      showCustomA2HSModal: false,
      setShowCustomA2HSModal: jest.fn(),
      installApp: jest.fn(),
      subscribeToPush: jest.fn().mockResolvedValue(true),
      unsubscribeFromPush: jest.fn().mockResolvedValue(true),
      showToast: jest.fn(),
      triggerCustomA2HSModal: jest.fn(),
    };
  });

  afterEach(() => {
    resetBodyScrollLockForTests();
    jest.restoreAllMocks();
  });

  describe('Track 1: Mobile Scroll Depth Bar, Rubber-Band Math & Section TOC Quick-Jump', () => {
    it('computes clamped integer scroll progress across normal, iOS rubber-band, overscroll, and degenerate inputs', () => {
      expect(computeScrollProgressPct(0, 2000, 1000)).toBe(0);
      expect(computeScrollProgressPct(250, 2000, 1000)).toBe(25);
      expect(computeScrollProgressPct(500, 2000, 1000)).toBe(50);
      expect(computeScrollProgressPct(750, 2000, 1000)).toBe(75);
      expect(computeScrollProgressPct(1000, 2000, 1000)).toBe(100);

      // Edge cases: iOS Safari negative rubber-band, overscroll, short document, non-finite values
      expect(computeScrollProgressPct(-140, 2000, 1000)).toBe(0);
      expect(computeScrollProgressPct(1350, 2000, 1000)).toBe(100);
      expect(computeScrollProgressPct(200, 800, 800)).toBe(0);
      expect(computeScrollProgressPct(200, 600, 900)).toBe(0);
      expect(computeScrollProgressPct(Number.NaN, 2000, 1000)).toBe(0);
      expect(computeScrollProgressPct(300, Number.POSITIVE_INFINITY, 1000)).toBe(0);
      expect(computeScrollProgressPct(300, 2000, Number.NEGATIVE_INFINITY)).toBe(0);
    });

    it('classifies mobile and desktop user-agents accurately for iOS Safari vs In-App cohort diagnostics', () => {
      expect(
        detectMobileScrollPlatform(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
        )
      ).toBe('ios_safari');
      expect(
        detectMobileScrollPlatform(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KAKAOTALK 10.8.0'
        )
      ).toBe('ios_inapp');
      expect(
        detectMobileScrollPlatform(
          'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 NAVER(inapp; search; 1000; 12.6.2)'
        )
      ).toBe('ios_inapp');
      expect(
        detectMobileScrollPlatform(
          'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36'
        )
      ).toBe('android_web');
      expect(
        detectMobileScrollPlatform(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36'
        )
      ).toBe('desktop');
      expect(detectMobileScrollPlatform('')).toBe('desktop');
      expect(detectMobileScrollPlatform(null)).toBe('desktop');
      expect(detectMobileScrollPlatform(undefined)).toBe('desktop');
    });

    it('maintains 100% anchor ID parity between extractGuideSectionHeadings and renderGuideBodyContent across all 20 guides and adversarial markdown', () => {
      for (const article of GUIDE_ARTICLES) {
        const extracted = extractGuideSectionHeadings(article.content);
        expect(extracted.length).toBeGreaterThan(0);

        const { container, unmount } = render(
          <div>
            {renderGuideBodyContent(article.content, {
              guideSlug: article.slug,
              zoneSectionPreviews: [],
              inlineSlugLookup: new Map(),
            })}
          </div>
        );

        const renderedH3WithId = Array.from(container.querySelectorAll('h3[id]')).map((el) => el.id);
        expect(renderedH3WithId).toEqual(extracted.map((h) => h.id));
        unmount();
      }

      // Adversarial markdown: code fence with ###, empty bold ### ****, #### subheadings, inline links
      const adversarialMd = [
        '```md',
        '### 코드블록 내부 가짜 헤딩',
        '```',
        '### ****',
        '### 1. **[동탄역 롯데캐슬](/apartment/동탄역롯데캐슬)** 핵심 실거래가 비교와 향후 전망 분석',
        '#### 1-1. 세부 하위 헤딩',
        '| 단지명 | 실거래가 |',
        '| --- | --- |',
        '| 동탄역롯데캐슬 | 15억 |',
      ].join('\n');

      const adversarialHeadings = extractGuideSectionHeadings(adversarialMd);
      expect(adversarialHeadings).toHaveLength(1);
      expect(adversarialHeadings[0].id).toBe('guide-section-1');
      expect(adversarialHeadings[0].title).toContain('동탄역 롯데캐슬');

      const { container } = render(
        <div>
          {renderGuideBodyContent(adversarialMd, {
            guideSlug: 'dongtan-1-vs-2-comparison',
            zoneSectionPreviews: [],
            inlineSlugLookup: new Map(),
          })}
        </div>
      );
      const h3Ids = Array.from(container.querySelectorAll('h3[id]')).map((el) => el.id);
      expect(h3Ids).toEqual(['guide-section-1']);
      const tableWrapper = container.querySelector('table')?.parentElement;
      expect(tableWrapper?.className).toContain('overscroll-x-contain');
    });

    it('handles empty sections gracefully, jumps smoothly on TOC chip click, and deduplicates 25/50/75/90% scroll milestones', () => {
      const { container: emptyContainer } = render(
        <GuideMobileScrollDepthBar guideSlug="test-guide" sections={[]} />
      );
      expect(emptyContainer.firstChild).toBeNull();

      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }) as typeof window.requestAnimationFrame;

      const userAgentSpy = jest
        .spyOn(window.navigator, 'userAgent', 'get')
        .mockReturnValue(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Version/17.5 Mobile/15E148 Safari/604.1'
        );

      const sections = [
        { id: 'guide-section-1', label: '1. 입지 비교', fullTitle: '1. 입지 비교' },
        { id: 'guide-section-2', label: '2. 실거래가', fullTitle: '2. 실거래가' },
        { id: 'guide-faq-section', label: 'FAQ', fullTitle: '자주 묻는 질문' },
      ];

      const scrollIntoViewMock = jest.fn();
      const targetEl = document.createElement('h3');
      targetEl.id = 'guide-section-2';
      targetEl.scrollIntoView = scrollIntoViewMock;
      document.body.appendChild(targetEl);

      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 2000,
      });
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: 1000,
      });
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        writable: true,
        value: 0,
      });

      const { rerender } = render(
        <GuideMobileScrollDepthBar guideSlug="dongtan-1-vs-2-comparison" sections={sections} />
      );

      const nav = screen.getByTestId('guide-mobile-scroll-depth-bar');
      expect(nav.className).toContain('min-h-[56px]');
      expect(screen.getByTestId('guide-scroll-progress-label')).toHaveTextContent('읽기 0%');

      // Click TOC chip 2
      const chip2 = screen.getByTestId('guide-toc-chip-guide-section-2');
      fireEvent.click(chip2);
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_toc_jump',
        expect.objectContaining({
          guide_slug: 'dongtan-1-vs-2-comparison',
          target_section: 'guide-section-2',
          chapter_id: 'guide-section-2',
          surface: 'guide_toc_bar',
          trigger: 'chip_click',
        })
      );

      // Scroll to 55% -> fires 25% and 50% exactly once
      act(() => {
        (window as unknown as { scrollY: number }).scrollY = 550;
        window.dispatchEvent(new Event('scroll'));
      });
      expect(screen.getByTestId('guide-scroll-progressbar')).toHaveAttribute('aria-valuenow', '55');
      expect(screen.getByTestId('guide-scroll-progress-label')).toHaveTextContent('읽기 55%');

      const depthCallsAfter55 = trackEventSpy.mock.calls.filter(
        ([eventName]) => eventName === 'guide_scroll_depth'
      );
      expect(depthCallsAfter55).toHaveLength(2);
      expect(depthCallsAfter55[0][1]).toMatchObject({
        guide_slug: 'dongtan-1-vs-2-comparison',
        milestone_pct: 25,
        chapter_id: 'depth_25',
        surface: 'guide_article',
        trigger: 'ios_safari_scroll',
      });
      expect(depthCallsAfter55[1][1]).toMatchObject({
        milestone_pct: 50,
        chapter_id: 'depth_50',
      });

      // Repeat scroll at 60% -> MUST NOT re-fire 25% or 50%
      act(() => {
        (window as unknown as { scrollY: number }).scrollY = 600;
        window.dispatchEvent(new Event('scroll'));
      });
      expect(
        trackEventSpy.mock.calls.filter(([eventName]) => eventName === 'guide_scroll_depth')
      ).toHaveLength(2);

      // Scroll to 95% -> fires 75% and 90%
      act(() => {
        (window as unknown as { scrollY: number }).scrollY = 950;
        window.dispatchEvent(new Event('scroll'));
      });
      const allDepthCalls = trackEventSpy.mock.calls.filter(
        ([eventName]) => eventName === 'guide_scroll_depth'
      );
      expect(allDepthCalls.map((c) => c[1].milestone_pct)).toEqual([25, 50, 75, 90]);

      // Navigating to another guide resets progress & milestone set
      rerender(<GuideMobileScrollDepthBar guideSlug="dongtan-station-vs-lake" sections={sections} />);
      expect(screen.getByTestId('guide-scroll-progress-label')).toHaveTextContent('읽기 0%');

      document.body.removeChild(targetEl);
      userAgentSpy.mockRestore();
      window.requestAnimationFrame = originalRaf;
    });
  });

  describe('Track 2: Revisit Retention (7 AM Real-Transaction Push, Watchlist & iOS Safari A2HS Bridge)', () => {
    function getRealRetentionApartments(): GuideRetentionAptItem[] {
      return HIGH_CONVERSION_FLAGSHIP_APARTMENTS.map((name) => buildGuideAptMiniPreview(name))
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .map((item) => ({
          name: item.name,
          displayName: item.displayName,
          canonicalSlug: item.canonicalSlug,
          dong: item.dong,
          latestPrice: item.latestPrice,
          latestPriceStr: item.latestPriceStr,
        }));
    }

    it('renders safely in SSR and gracefully handles empty apartment lists without fake prices', () => {
      const ssrHtml = renderToString(
        <GuideMorningAlertRetentionCard guideSlug="guide-empty" apartments={[]} />
      );
      expect(ssrHtml).toContain('실거래 신고 즉시 오전 7시 알림 받기');
      expect(ssrHtml).toContain('동탄 전역');
      expect(ssrHtml).not.toContain('최근 실거래');

      render(<GuideMorningAlertRetentionCard guideSlug="guide-empty" apartments={[]} />);
      expect(screen.queryByTestId('guide-retention-watchlist-btn')).toBeNull();
      expect(screen.getByTestId('guide-morning-7am-push-btn')).toBeInTheDocument();
    });

    it('switches real MOLIT apartment tabs, saves canonical watchlist to localStorage without reserved source key, and opens PushSubscriptionModal', () => {
      const realApts = getRealRetentionApartments();
      expect(realApts.length).toBeGreaterThanOrEqual(2);

      render(
        <GuideMorningAlertRetentionCard
          guideSlug="dongtan-1-vs-2-comparison"
          apartments={realApts}
          surface="guide_article_footer_retention"
        />
      );

      // Switch to 2nd apartment tab
      const secondTab = screen.getByTestId('guide-retention-apt-tab-1');
      fireEvent.click(secondTab);
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_retention_apt_select',
        expect.objectContaining({
          guide_slug: 'dongtan-1-vs-2-comparison',
          apartment_name: realApts[1].canonicalSlug,
          surface: 'guide_article_footer_retention',
        })
      );

      // Save to watchlist
      const watchlistBtn = screen.getByTestId('guide-retention-watchlist-btn');
      expect(watchlistBtn).toHaveTextContent('+ 관심단지 담기');
      fireEvent.click(watchlistBtn);

      const storedFavorites = JSON.parse(
        window.localStorage.getItem('dview_guest_favorites') || '[]'
      );
      expect(storedFavorites).toContain(realApts[1].canonicalSlug);
      expect(watchlistBtn).toHaveTextContent('관심 저장됨');

      const watchlistCalls = trackEventSpy.mock.calls.filter(
        ([eventName]) => eventName === 'watchlist_toggle_favorite'
      );
      expect(watchlistCalls).toHaveLength(1);
      expect(watchlistCalls[0][1]).toMatchObject({
        apartment_name: realApts[1].canonicalSlug,
        canonical_slug: realApts[1].canonicalSlug,
        is_favorite: true,
        surface: 'guide_article_footer_retention',
        trigger: 'guide_watchlist_btn',
      });
      // Critical GA4 invariant: reserved `source` key must NEVER be passed
      expect(watchlistCalls[0][1]).not.toHaveProperty('source');

      // Open 7 AM Push Modal
      fireEvent.click(screen.getByTestId('guide-morning-7am-push-btn'));
      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_modal_open',
        expect.objectContaining({
          surface: 'guide_article_footer_retention',
          trigger: 'morning_7am_cta',
          apt_name: realApts[1].displayName,
          guide_slug: 'dongtan-1-vs-2-comparison',
        })
      );
      expect(screen.getByRole('dialog')).toHaveTextContent(`${realApts[1].displayName} 알림 신청`);
    });

    it('bridges iOS Safari non-standalone visitors to CustomA2HSModal while keeping disabled fallback on unsupported desktop browsers', () => {
      mockPwaState = {
        ...mockPwaState,
        isIOS: true,
        isPushSupported: false,
      };
      const realApts = getRealRetentionApartments();

      const { unmount } = render(
        <GuideMorningAlertRetentionCard
          guideSlug="dongtan-station-vs-lake"
          apartments={realApts}
        />
      );

      // Inline iOS shortcut button is visible on iOS non-standalone
      const iosShortcutBtn = screen.getByTestId('guide-ios-a2hs-shortcut-btn');
      fireEvent.click(iosShortcutBtn);
      expect(mockPwaState.triggerCustomA2HSModal).toHaveBeenCalledTimes(1);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'a2hs_modal_open',
        expect.objectContaining({
          trigger: 'guide_ios_retention_bridge',
        })
      );

      // Opening PushSubscriptionModal on iOS Safari shows the active A2HS bridge CTA
      fireEvent.click(screen.getByTestId('guide-morning-7am-push-btn'));
      expect(screen.getByTestId('push-ios-a2hs-bridge')).toBeInTheDocument();
      const modalIosBtn = screen.getByTestId('push-ios-a2hs-btn');
      expect(modalIosBtn).not.toBeDisabled();
      fireEvent.click(modalIosBtn);
      expect(mockPwaState.triggerCustomA2HSModal).toHaveBeenCalledTimes(2);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'a2hs_modal_open',
        expect.objectContaining({
          surface: 'push_subscription_modal',
          trigger: 'ios_safari_push_bridge',
        })
      );
      unmount();

      // Non-iOS unsupported browser keeps disabled button
      mockPwaState = {
        ...mockPwaState,
        isIOS: false,
        isPushSupported: false,
      };
      const onClose = jest.fn();
      render(<PushSubscriptionModal isOpen={true} onClose={onClose} aptName="동탄역롯데캐슬" />);
      expect(screen.queryByTestId('push-ios-a2hs-bridge')).toBeNull();
      const submitBtn = screen.getByRole('button', { name: '실거래가 알림 신청하기' });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('Track 3: Naver Search Advisor (/rss.xml + /feed.xml Parity, Autodiscovery) & GEO Fact Sheet', () => {
    it('serves HTTP 200 RSS 2.0 XML on both /rss.xml and /feed.xml with 30 items, self atom:link parity, and real MOLIT dates', async () => {
      const [feedRes, rssRes] = await Promise.all([getFeedXml(), getRssXml()]);
      expect(feedRes.status).toBe(200);
      expect(rssRes.status).toBe(200);
      expect(rssRes.headers.get('Content-Type')).toContain('application/xml');

      const [feedXml, rssXml] = await Promise.all([feedRes.text(), rssRes.text()]);
      const feedItems = feedXml.match(/<item>/g) || [];
      const rssItems = rssXml.match(/<item>/g) || [];
      expect(feedItems).toHaveLength(GUIDE_ARTICLES.length + ZONES.length);
      expect(rssItems).toHaveLength(GUIDE_ARTICLES.length + ZONES.length);

      expect(feedXml).toContain('href="https://dongtanview.com/feed.xml" rel="self"');
      expect(rssXml).toContain('href="https://dongtanview.com/rss.xml" rel="self"');
      expect(rssXml).not.toContain('Invalid Date');

      const customXml = buildDviewRssXml({
        baseUrl: 'https://dongtanview.com/',
        selfPath: 'rss.xml',
        nowUtc: 'Sun, 15 Nov 2026 03:00:00 GMT',
      });
      expect(customXml).toContain('href="https://dongtanview.com/rss.xml" rel="self"');
    });

    it('exposes RSS autodiscovery across RootLayout, /guide, and /guide/[slug], and renders GEO Speakable + real MOLIT fact sheet', async () => {
      expect(rootMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(guideIndexMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );

      const sampleSlug = 'dongtan-1-vs-2-comparison';
      const detailMeta = await generateGuideMetadata({
        params: Promise.resolve({ slug: sampleSlug }),
      });
      expect(detailMeta.alternates?.canonical).toBe(`https://dongtanview.com/guide/${sampleSlug}`);
      expect(detailMeta.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );

      // JSON-LD SpeakableSpecification + MOLIT Dataset
      const sampleArticle = GUIDE_ARTICLES.find((g) => g.slug === sampleSlug)!;
      const jsonLd = buildGuideArticleJsonLd(sampleArticle);
      const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
      const articleNode = graph.find((n) => n['@type'] === 'Article')!;
      expect(articleNode.inLanguage).toBe('ko-KR');
      expect(articleNode.isAccessibleForFree).toBe(true);
      expect(articleNode.speakable).toEqual({
        '@type': 'SpeakableSpecification',
        cssSelector: ['#guide-key-takeaways', '#guide-geo-fact-sheet', '#guide-faq-section'],
      });
      expect(articleNode.isBasedOn).toMatchObject({
        '@type': 'Dataset',
        url: 'https://rt.molit.go.kr',
      });

      // Render /guide/[slug] and verify #guide-geo-fact-sheet, TOC bar, and Morning Alert card
      const detailUi = await GuideDetailPage({ params: Promise.resolve({ slug: sampleSlug }) });
      const { container: detailContainer, unmount: unmountDetail } = render(detailUi);
      expect(detailContainer.querySelector('#guide-geo-fact-sheet')).not.toBeNull();
      expect(detailContainer.querySelector('#guide-morning-alert-retention')).not.toBeNull();
      expect(
        detailContainer.querySelector('[data-testid="guide-top-morning-alert-jump"]')
      ).not.toBeNull();
      expect(
        detailContainer.querySelector('[data-testid="guide-mobile-scroll-depth-bar"]')
      ).not.toBeNull();
      unmountDetail();

      // Render /guide hub and verify retention card + exact 23 <article> cards invariant
      const { container: indexContainer } = render(<GuideIndexPage />);
      expect(indexContainer.querySelectorAll('article')).toHaveLength(23);
      expect(indexContainer.querySelector('#guide-hub-morning-alert-retention')).not.toBeNull();
    });

    it('passes 100% of Naver Search Advisor & GEO readiness checks on live repo and detects synthetic misconfigurations', async () => {
      const liveReport = await collectAndAuditNaverSeoReadiness(process.cwd());
      expect(liveReport.passed).toBe(true);
      expect(liveReport.scorePct).toBe(100);
      expect(liveReport.passedCount).toBe(6);
      expect(
        process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true' ? 79 : 181
      ).toBe(liveReport.submissionManifest.sitemapTotalUrls);
      expect(liveReport.submissionManifest.rssItemCount).toBe(30);

      // Synthetic negative cases: missing verification token, blocked /guide, >50 RSS items, unescaped '&', duplicate guide title, missing speakable
      const bloatedRssItems = Array.from({ length: 51 }, (_, idx) =>
        [
          '<item>',
          `<title>Item ${idx} & raw amp</title>`,
          `<link>https://dongtanview.com/guide/item-${idx}</link>`,
          `<guid isPermaLink="true">https://dongtanview.com/guide/item-${idx}</guid>`,
          '<pubDate>Invalid Date</pubDate>',
          '</item>',
        ].join('')
      ).join('');
      const brokenRss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>${bloatedRssItems}</channel></rss>`;

      const duplicateGuides = [
        { ...GUIDE_ARTICLES[0], seoTitle: '중복 타이틀', seoDescription: '짧은 설명', faqs: [] },
        { ...GUIDE_ARTICLES[1], seoTitle: '중복 타이틀' },
      ];

      const brokenReport = runNaverSearchAdvisorAudit({
        baseUrl: 'https://dongtanview.com',
        rootVerificationToken: '',
        rssAutodiscovery: { rootLayout: false, guideIndex: true, guideDetail: false },
        robotsConfig: {
          rules: [{ userAgent: 'Yeti', allow: '/', disallow: ['/guide'] }],
          sitemap: ['https://dongtanview.com/sitemap.xml', 'https://dongtanview.com/feed.xml'],
        },
        sitemapEntries: [
          { url: 'https://dongtanview.com/lounge?tab=hot', lastModified: new Date('2099-01-01') },
          { url: 'https://dongtanview.com/lounge?tab=hot', lastModified: new Date('2026-06-01') },
        ],
        feedXml: brokenRss,
        rssXml: brokenRss,
        guides: duplicateGuides,
        guideJsonLds: duplicateGuides.map((g) => ({
          slug: g.slug,
          jsonLd: { '@graph': [{ '@type': 'Article' }] },
        })),
      });

      expect(brokenReport.passed).toBe(false);
      expect(brokenReport.passedCount).toBe(0);
      for (const check of brokenReport.checks) {
        expect(check.passed).toBe(false);
        expect(check.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Adversarial Regression Guardrails (Reviewer Step 2 Fixes)', () => {
    it('prevents sticky header overlap on mobile/desktop, keeps PageHeroHeader compact bar single-line h-12, and highlights desktop scroll-mt-48 targets', async () => {
      const { container: heroContainer, unmount: unmountHero } = render(
        <PageHeroHeader
          isTitleDiv
          title="D-VIEW 분석 리포트"
          compactTitle={GUIDE_ARTICLES[0].title}
          subtitleStrong="국토부 검증"
        />
      );
      const compactStickyBar = heroContainer.firstElementChild as HTMLElement;
      expect(compactStickyBar.className).toContain('h-12');
      expect(compactStickyBar.firstElementChild?.className).toContain('truncate');
      unmountHero();

      const detailUi = await GuideDetailPage({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      const { container: detailContainer, unmount: unmountDetail } = render(detailUi);

      const tocNav = detailContainer.querySelector(
        '[data-testid="guide-mobile-scroll-depth-bar"]'
      ) as HTMLElement;
      expect(tocNav.className).toContain('top-[48px]');
      expect(tocNav.className).toContain('md:top-[84px]');
      expect(tocNav.className).not.toContain('top-[52px]');
      expect(tocNav.className).not.toContain('sm:top-[60px]');

      for (const selector of [
        '#guide-section-1',
        '#guide-geo-fact-sheet',
        '#guide-key-takeaways',
        '#guide-morning-alert-retention',
        '#guide-head-to-head-comparison',
        '#guide-live-data-comparison',
        '#guide-faq-section',
      ]) {
        const el = detailContainer.querySelector(selector) as HTMLElement;
        expect(el).not.toBeNull();
        expect(el.className).toContain('scroll-mt-40');
        expect(el.className).toContain('md:scroll-mt-48');
      }
      unmountDetail();

      // Desktop (1280px) active section threshold must include rect.top === 192 (md:scroll-mt-48)
      const originalInnerWidth = window.innerWidth;
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }) as typeof window.requestAnimationFrame;
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });

      const sec1 = document.createElement('h3');
      sec1.id = 'adv-sec-1';
      sec1.getBoundingClientRect = () => ({ top: -420 } as DOMRect);
      const sec2 = document.createElement('h3');
      sec2.id = 'adv-sec-2';
      sec2.getBoundingClientRect = () => ({ top: 192 } as DOMRect);
      document.body.appendChild(sec1);
      document.body.appendChild(sec2);

      const { unmount: unmountToc } = render(
        <GuideMobileScrollDepthBar
          guideSlug="dongtan-1-vs-2-comparison"
          sections={[
            { id: 'adv-sec-1', label: '1. 개요' },
            { id: 'adv-sec-2', label: '2. 실거래' },
          ]}
        />
      );
      act(() => {
        (window as unknown as { scrollY: number }).scrollY = 400;
        window.dispatchEvent(new Event('scroll'));
      });
      expect(screen.getByTestId('guide-toc-chip-adv-sec-2')).toHaveAttribute(
        'aria-current',
        'location'
      );

      unmountToc();
      document.body.removeChild(sec1);
      document.body.removeChild(sec2);
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
      window.requestAnimationFrame = originalRaf;
    });

    it('does not reset progress or double-fire GA4 milestones on inline sections array re-render, and syncs initial scroll without premature GA4 firing', () => {
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }) as typeof window.requestAnimationFrame;

      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 2000,
      });
      Object.defineProperty(document.documentElement, 'clientHeight', {
        configurable: true,
        value: 1000,
      });
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        writable: true,
        value: 500,
      });

      // 1. Mount when window.scrollY === 500 (50%) -> syncs UI to 50% immediately with 0 GA4 depth events
      const { rerender, unmount } = render(
        <GuideMobileScrollDepthBar
          guideSlug="dongtan-1-vs-2-comparison"
          sections={[
            { id: 'guide-section-1', label: '1. 입지' },
            { id: 'guide-section-2', label: '2. 시세' },
          ]}
        />
      );
      expect(screen.getByTestId('guide-scroll-progress-label')).toHaveTextContent('읽기 50%');
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'guide_scroll_depth')
      ).toHaveLength(0);

      // 2. Real user scroll to 55% fires 25% & 50% once
      act(() => {
        (window as unknown as { scrollY: number }).scrollY = 550;
        window.dispatchEvent(new Event('scroll'));
      });
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'guide_scroll_depth')
      ).toHaveLength(2);

      // 3. Parent re-renders with a brand-new inline sections array reference -> must NOT reset to 0% or re-fire!
      rerender(
        <GuideMobileScrollDepthBar
          guideSlug="dongtan-1-vs-2-comparison"
          sections={[
            { id: 'guide-section-1', label: '1. 입지' },
            { id: 'guide-section-2', label: '2. 시세' },
          ]}
        />
      );
      expect(screen.getByTestId('guide-scroll-progress-label')).toHaveTextContent('읽기 55%');
      act(() => {
        (window as unknown as { scrollY: number }).scrollY = 600;
        window.dispatchEvent(new Event('scroll'));
      });
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'guide_scroll_depth')
      ).toHaveLength(2);

      unmount();
      Object.defineProperty(document.documentElement, 'clientHeight', {
        configurable: true,
        value: 0,
      });
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        writable: true,
        value: 0,
      });
      window.requestAnimationFrame = originalRaf;
    });

    it('enforces Copy Diet kpiLabel <= 10 & non-verbose copy, non-clipping min-h-[38px] buttons, and shared-row Zero-CLS on iOS hydration', async () => {
      const detailUi = await GuideDetailPage({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      const { container, unmount } = render(detailUi);

      const factSheet = container.querySelector('#guide-geo-fact-sheet')!;
      const kpiLabels = Array.from(factSheet.querySelectorAll('div > span')).map((el) =>
        (el.textContent || '').trim()
      );
      expect(kpiLabels.length).toBe(4);
      for (const label of kpiLabels) {
        const budget = checkCopyBudget(label, 'kpiLabel');
        expect(budget.withinBudget).toBe(true);
      }
      unmount();

      mockPwaState = {
        ...mockPwaState,
        isIOS: true,
        isPushSupported: false,
        isStandalone: false,
      };
      const apt = buildGuideAptMiniPreview('동탄역롯데캐슬')!;
      render(
        <GuideMorningAlertRetentionCard
          guideSlug="dongtan-1-vs-2-comparison"
          apartments={[apt]}
        />
      );

      const summaryCopy = screen.getByTestId('guide-retention-summary-copy').textContent || '';
      expect(hasVerboseProseEnding(summaryCopy)).toBe(false);

      const watchlistBtn = screen.getByTestId('guide-retention-watchlist-btn');
      const iosShortcutBtn = screen.getByTestId('guide-ios-a2hs-shortcut-btn');
      const pushBtn = screen.getByTestId('guide-morning-7am-push-btn');

      expect(watchlistBtn.className).toContain('min-h-[38px]');
      expect(pushBtn.className).toContain('min-h-[38px]');
      expect(pushBtn.className).not.toContain('h-9');
      expect(watchlistBtn.parentElement).toBe(iosShortcutBtn.parentElement);
    });

    it('detects iPadOS 13+ Safari, suppresses dead-click A2HS buttons in standalone mode, preserves stacked modal scroll lock, and surfaces subscribeToPush=false errors', async () => {
      // 1. iPadOS 13+ desktop-class Macintosh UA + multi-touch
      const ipadOsUa =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
      expect(detectMobileScrollPlatform(ipadOsUa, 5)).toBe('ios_safari');
      expect(detectMobileScrollPlatform(ipadOsUa, 0)).toBe('desktop');

      // 2. Standalone iOS WebApp must NOT show dead-click "홈 화면 추가" buttons
      mockPwaState = {
        ...mockPwaState,
        isIOS: true,
        isPushSupported: false,
        isStandalone: true,
      };
      const apt = buildGuideAptMiniPreview('동탄역롯데캐슬')!;
      const { unmount: unmountStandalone } = render(
        <>
          <GuideMorningAlertRetentionCard guideSlug="dongtan-1-vs-2-comparison" apartments={[apt]} />
          <PushSubscriptionModal isOpen={true} onClose={jest.fn()} aptName="동탄역롯데캐슬" />
        </>
      );
      expect(screen.queryByTestId('guide-ios-a2hs-shortcut-btn')).toBeNull();
      expect(screen.queryByTestId('push-ios-a2hs-btn')).toBeNull();
      unmountStandalone();
      resetBodyScrollLockForTests();

      // 3. Stacked / transitioning modals preserve document.body.style.overflow === 'hidden'
      const openA2hsState = {
        ...mockPwaState,
        isIOS: true,
        isPushSupported: false,
        isStandalone: false,
        showCustomA2HSModal: true,
      };
      const closedA2hsState = {
        ...openA2hsState,
        showCustomA2HSModal: false,
      };
      const { rerender: rerenderModals, unmount: unmountModals } = render(
        <MockPwaContext.Provider value={openA2hsState}>
          <PushSubscriptionModal isOpen={true} onClose={jest.fn()} aptName="동탄역롯데캐슬" />
          <CustomA2HSModal />
        </MockPwaContext.Provider>
      );
      expect(document.body.style.overflow).toBe('hidden');
      expect(getActiveBodyScrollLockCount()).toBe(2);

      // Closing PushSubscriptionModal while CustomA2HSModal stays open must keep body scroll locked!
      rerenderModals(
        <MockPwaContext.Provider value={openA2hsState}>
          <PushSubscriptionModal isOpen={false} onClose={jest.fn()} aptName="동탄역롯데캐슬" />
          <CustomA2HSModal />
        </MockPwaContext.Provider>
      );
      expect(document.body.style.overflow).toBe('hidden');
      expect(getActiveBodyScrollLockCount()).toBe(1);

      // Closing CustomA2HSModal restores inline overflow to '' (never 'visible')
      rerenderModals(
        <MockPwaContext.Provider value={closedA2hsState}>
          <PushSubscriptionModal isOpen={false} onClose={jest.fn()} aptName="동탄역롯데캐슬" />
          <CustomA2HSModal />
        </MockPwaContext.Provider>
      );
      expect(document.body.style.overflow).toBe('');
      expect(getActiveBodyScrollLockCount()).toBe(0);
      unmountModals();

      // 4. subscribeToPush resolving to false surfaces failure alert instead of silent no-op; true emits push_subscribe_success
      const onClose = jest.fn();
      mockPwaState = {
        ...mockPwaState,
        isIOS: false,
        isPushSupported: true,
        isStandalone: false,
        subscribeToPush: jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),
      };
      render(<PushSubscriptionModal isOpen={true} onClose={onClose} aptName="동탄역롯데캐슬" />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '실거래가 알림 신청하기' }));
      });
      expect(screen.getByText('알림 등록 중 오류가 발생했습니다')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '실거래가 알림 신청하기' }));
      });
      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_subscribe_success',
        expect.objectContaining({
          surface: 'push_subscription_modal',
          apt_name: '동탄역롯데캐슬',
        })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('guards empty-FAQ Speakable selectors, clamps future RSS pubDates, catches wildcard robots/duplicate RSS guids, and runs audit from monorepo root', async () => {
      // 1. Empty FAQs must omit #guide-faq-section from SpeakableSpecification
      const faqlessJsonLd = buildGuideArticleJsonLd({ ...GUIDE_ARTICLES[0], faqs: [] });
      const faqlessGraph = faqlessJsonLd['@graph'] as Array<Record<string, unknown>>;
      const faqlessArticle = faqlessGraph.find((n) => n['@type'] === 'Article')!;
      expect(faqlessArticle.speakable).toEqual({
        '@type': 'SpeakableSpecification',
        cssSelector: ['#guide-key-takeaways', '#guide-geo-fact-sheet'],
      });

      // 2. parseRssPubDate clamps future dates to fallbackUtc
      const fallbackUtc = 'Sun, 15 Nov 2026 03:00:00 GMT';
      expect(parseRssPubDate('2099-12-31', fallbackUtc)).toBe(fallbackUtc);
      expect(parseRssPubDate('2099-12-31T12:00:00Z', fallbackUtc)).toBe(fallbackUtc);

      // 3. Audit catches wildcard Disallow: /guide/*, duplicate RSS <guid>, and future <pubDate>
      const dupGuidFutureRss = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>',
        '<atom:link href="https://dongtanview.com/feed.xml" rel="self" type="application/rss+xml" />',
        '<item><title>A</title><link>https://dongtanview.com/guide/a</link><guid isPermaLink="true">https://dongtanview.com/guide/a</guid><pubDate>Wed, 30 Dec 2099 00:00:00 GMT</pubDate></item>',
        '<item><title>B</title><link>https://dongtanview.com/guide/a</link><guid isPermaLink="true">https://dongtanview.com/guide/a</guid><pubDate>Sat, 31 Oct 2026 00:00:00 GMT</pubDate></item>',
        '</channel></rss>',
      ].join('');

      const auditReport = runNaverSearchAdvisorAudit({
        baseUrl: 'https://dongtanview.com',
        now: new Date('2026-11-15T03:00:00Z'),
        rootVerificationToken: '0123456789abcdef0123456789abcdef01234567',
        rssAutodiscovery: { rootLayout: true, guideIndex: true, guideDetail: true },
        robotsConfig: {
          rules: [{ userAgent: 'Yeti', allow: '/', disallow: ['/guide/*'] }],
          sitemap: 'https://dongtanview.com/sitemap.xml',
        },
        sitemapEntries: [],
        feedXml: dupGuidFutureRss,
        rssXml: dupGuidFutureRss.replace('/feed.xml', '/rss.xml'),
        guides: [{ ...GUIDE_ARTICLES[0], faqs: [] }],
        guideJsonLds: [
          {
            slug: GUIDE_ARTICLES[0].slug,
            jsonLd: {
              '@graph': [
                {
                  '@type': 'Article',
                  speakable: {
                    '@type': 'SpeakableSpecification',
                    cssSelector: ['#guide-key-takeaways', '#guide-geo-fact-sheet', '#guide-faq-section'],
                  },
                  isBasedOn: { '@type': 'Dataset' },
                },
                { '@type': 'FAQPage' },
              ],
            },
          },
        ],
      });

      const robotsCheck = auditReport.checks.find((c) => c.id === 'robots_yeti_and_geo_bots')!;
      expect(robotsCheck.passed).toBe(false);
      expect(robotsCheck.issues.some((i) => i.includes('/guide'))).toBe(true);

      const rssCheck = auditReport.checks.find((c) => c.id === 'rss_feeds_compliance')!;
      expect(rssCheck.passed).toBe(false);
      expect(rssCheck.issues.some((i) => i.includes('중복 <guid>'))).toBe(true);
      expect(rssCheck.issues.some((i) => i.includes('미래 시점 <pubDate>'))).toBe(true);

      const geoCheck = auditReport.checks.find((c) => c.id === 'guide_serp_and_geo_schema')!;
      expect(geoCheck.passed).toBe(false);
      expect(geoCheck.issues.some((i) => i.includes('#guide-faq-section'))).toBe(true);

      // 4. collectAndAuditNaverSeoReadiness succeeds when invoked from monorepo root
      const monorepoRoot = path.resolve(process.cwd(), '..');
      const rootInvokedReport = await collectAndAuditNaverSeoReadiness(monorepoRoot);
      expect(rootInvokedReport.passed).toBe(true);
      expect(rootInvokedReport.passedCount).toBe(6);
    });

    it('validates the 3 new P2 GEO in-depth guides (rail transfer, relocation zone comparison, 12-year school belt) across real data, clusters, JSON-LD, SSR, and RSS', async () => {
      const newP2Guides = [
        {
          slug: 'dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis',
          expectedCluster: 'rail-urban-infra-cluster',
          expectedBacklinkFrom: 'gtx-a-tram-rail-network',
        },
        {
          slug: 'seoul-bundang-suwon-relocation-to-dongtan-zone-comparison',
          expectedCluster: 'vs-region-comparison',
          expectedBacklinkFrom: 'dongtan-1-vs-2-comparison',
        },
        {
          slug: 'dongtan-middle-high-school-progression-12year-edu-belt-guide',
          expectedCluster: 'school-chopuma-cluster',
          expectedBacklinkFrom: 'dongtan-school-zone-top-apartments',
        },
      ] as const;

      const [feedRes, rssRes] = await Promise.all([getFeedXml(), getRssXml()]);
      const [feedXml, rssXml] = await Promise.all([feedRes.text(), rssRes.text()]);

      for (const spec of newP2Guides) {
        const article = GUIDE_ARTICLES.find((g) => g.slug === spec.slug);
        expect(article).toBeDefined();
        expect(article!.topicClusterId).toBe(spec.expectedCluster);

        const cluster = getTopicClusterForGuide(article!);
        expect(cluster?.id).toBe(spec.expectedCluster);
        expect(GUIDE_TOPIC_CLUSTERS.find((c) => c.id === spec.expectedCluster)?.guideSlugs).toContain(
          spec.slug
        );

        // Bidirectional internal link mesh
        expect(article!.relatedGuideSlugs).toContain(spec.expectedBacklinkFrom);
        const pillarArticle = GUIDE_ARTICLES.find((g) => g.slug === spec.expectedBacklinkFrom);
        expect(pillarArticle?.relatedGuideSlugs).toContain(spec.slug);

        // 100% real canonical apartments (including empty-txMap snapshot fallback)
        for (const aptKey of article!.featuredApartments || []) {
          const previewDefault = buildGuideAptMiniPreview(aptKey);
          const previewEmptyFallback = buildGuideAptMiniPreview(aptKey, {});
          expect(previewDefault).not.toBeNull();
          expect(previewDefault!.latestPrice).toBeGreaterThan(0);
          expect(previewEmptyFallback).not.toBeNull();
          expect(previewEmptyFallback!.latestPrice).toBeGreaterThan(0);
        }

        const resolvedSections = resolveGuideZoneSectionPreviews(article!);
        expect(resolvedSections.length).toBeGreaterThanOrEqual(2);
        for (const sec of resolvedSections) {
          expect(article!.content).toContain(sec.sectionHeadingMatch);
          expect(sec.items.length).toBeGreaterThanOrEqual(3);
        }

        // JSON-LD SpeakableSpecification + MOLIT Dataset + FAQPage
        const jsonLd = buildGuideArticleJsonLd(article!);
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        const articleNode = graph.find((n) => n['@type'] === 'Article')!;
        const faqNode = graph.find((n) => n['@type'] === 'FAQPage')!;
        expect(articleNode.speakable).toEqual({
          '@type': 'SpeakableSpecification',
          cssSelector: ['#guide-key-takeaways', '#guide-geo-fact-sheet', '#guide-faq-section'],
        });
        expect(articleNode.isBasedOn).toMatchObject({
          '@type': 'Dataset',
          url: 'https://rt.molit.go.kr',
        });
        expect((faqNode.mainEntity as unknown[]).length).toBeGreaterThanOrEqual(3);

        // RSS inclusion on both /feed.xml and /rss.xml
        expect(feedXml).toContain(`/guide/${spec.slug}</link>`);
        expect(rssXml).toContain(`/guide/${spec.slug}</link>`);

        // Full SSR render check (zero leaked **, zero font-mono, morning 7 AM alert card present)
        const ui = await GuideDetailPage({ params: Promise.resolve({ slug: spec.slug }) });
        const { container, unmount } = render(ui);
        expect(container.querySelector('#guide-geo-fact-sheet')).not.toBeNull();
        expect(container.querySelector('#guide-morning-alert-retention')).not.toBeNull();
        expect(container.querySelectorAll('.font-mono')).toHaveLength(0);
        expect(container.querySelector('article')?.textContent || '').not.toContain('**');
        unmount();
      }
    });

    it('forwards authenticated useAuth() user into useFavorites & PushSubscriptionModal, preserves empty-apartments iOS hydration Zero-CLS, and aligns P2 events with GA4 custom dimensions', async () => {
      // 1. Authenticated user wiring via AuthContext / useAuth()
      const useFavoritesSpy = jest.spyOn(useFavoritesModule, 'useFavorites');
      const mockLoggedInUser = { uid: 'uid_logged_in_p2_user' } as import('firebase/auth').User;
      window.localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역롯데캐슬']));

      const apt = buildGuideAptMiniPreview('동탄역롯데캐슬')!;
      const { unmount: unmountAuth } = render(
        <AuthContext.Provider value={{ ...STATIC_AUTH_STATE, user: mockLoggedInUser }}>
          <GuideMorningAlertRetentionCard
            guideSlug="dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis"
            apartments={[apt]}
          />
        </AuthContext.Provider>
      );

      expect(useFavoritesSpy).toHaveBeenCalledWith(
        mockLoggedInUser,
        {},
        expect.objectContaining({ fetchGlobalCounts: false, skipRemoteInTest: true })
      );
      const watchlistBtn = screen.getByTestId('guide-retention-watchlist-btn');
      expect(watchlistBtn).toHaveAttribute('aria-pressed', 'true');
      expect(watchlistBtn).toHaveTextContent('관심 저장됨');

      // Open PushSubscriptionModal and verify authenticated user.uid + canonicalSlug are forwarded to subscribeToPush
      fireEvent.click(screen.getByTestId('guide-morning-7am-push-btn'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '실거래가 알림 신청하기' }));
      });
      expect(mockPwaState.subscribeToPush).toHaveBeenCalledWith(
        'uid_logged_in_p2_user',
        apt.canonicalSlug
      );
      unmountAuth();
      useFavoritesSpy.mockRestore();

      // 2. Empty-apartments (apartments={[]}) SSR -> iOS Safari hydration Zero-CLS invariant
      mockPwaState = {
        ...mockPwaState,
        isIOS: false,
        isPushSupported: true,
        isStandalone: false,
      };
      const { rerender: rerenderEmpty, unmount: unmountEmpty } = render(
        <GuideMorningAlertRetentionCard guideSlug="guide-empty-cls" apartments={[]} />
      );
      const emptyRowBefore = screen.getByTestId('guide-retention-empty-apt-action-row');
      const pushBtnBefore = screen.getByTestId('guide-morning-7am-push-btn');
      expect(screen.queryByTestId('guide-ios-a2hs-shortcut-btn')).toBeNull();
      expect(emptyRowBefore.parentElement?.className).toContain('sm:flex-nowrap');
      expect(emptyRowBefore.parentElement?.className).not.toContain('sm:flex-wrap');
      expect(pushBtnBefore.parentElement).toBe(emptyRowBefore);
      expect(pushBtnBefore.className).toContain('min-h-[38px]');
      expect(pushBtnBefore.className).toContain('whitespace-nowrap');

      // Simulate iOS Safari client hydration (showIosA2hsShortcut: false -> true)
      mockPwaState = {
        ...mockPwaState,
        isIOS: true,
        isPushSupported: false,
        isStandalone: false,
      };
      rerenderEmpty(<GuideMorningAlertRetentionCard guideSlug="guide-empty-cls" apartments={[]} />);
      const emptyRowAfter = screen.getByTestId('guide-retention-empty-apt-action-row');
      const iosBtnAfter = screen.getByTestId('guide-ios-a2hs-shortcut-btn');
      const pushBtnAfter = screen.getByTestId('guide-morning-7am-push-btn');
      // Both buttons share the exact same single horizontal flex row (zero added vertical row / ΔH = 0px)
      expect(emptyRowAfter).toBe(emptyRowBefore);
      expect(iosBtnAfter.parentElement).toBe(pushBtnAfter.parentElement);
      expect(iosBtnAfter.className).toContain('min-h-[38px]');
      expect(iosBtnAfter.className).toContain('whitespace-nowrap');
      unmountEmpty();

      // 3. GA4 Custom Dimension SSOT Registry alignment for P2 event parameters (canonical apartment_name + dong + guide_slug)
      const registeredParamSet = new Set(
        [...DVIEW_GA4_CUSTOM_DIMENSIONS, ...DVIEW_GA4_INTERACTION_DIMENSIONS].map(
          (d) => d.parameterName
        )
      );
      for (const requiredParam of [
        'surface',
        'trigger',
        'chapter_id',
        'apartment_name',
        'dong',
      ]) {
        expect(registeredParamSet.has(requiredParam)).toBe(true);
      }
      expect(
        trackEventSpy.mock.calls.some(
          ([eventName, params]) =>
            eventName === 'push_subscribe_success' &&
            params?.surface === 'push_subscription_modal' &&
            params?.trigger === 'modal_submit_cta' &&
            params?.apt_name === apt.displayName &&
            params?.apartment_name === apt.canonicalSlug &&
            params?.dong === apt.dong &&
            params?.guide_slug ===
              'dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis'
        )
      ).toBe(true);
    });

    it('enforces 100% bidirectional relatedGuideSlugs & cluster sibling Top-6 visibility, 7 AM push alias parity, 1024px iPad Zero-CLS classes, and dynamic 23-guide UI labels', async () => {
      const newP2Slugs = [
        'dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis',
        'seoul-bundang-suwon-relocation-to-dongtan-zone-comparison',
        'dongtan-middle-high-school-progression-12year-edu-belt-guide',
      ] as const;

      for (const slug of newP2Slugs) {
        const article = GUIDE_ARTICLES.find((g) => g.slug === slug)!;

        // Every outgoing relatedGuideSlugs entry must reciprocally link back
        for (const targetSlug of article.relatedGuideSlugs || []) {
          const targetArticle = GUIDE_ARTICLES.find((g) => g.slug === targetSlug);
          expect(targetArticle).toBeDefined();
          expect(targetArticle!.relatedGuideSlugs).toContain(slug);
          const targetRankedRelated = getRelatedGuidesForGuide(
            targetArticle!,
            Math.max(6, targetArticle!.relatedGuideSlugs?.length || 6)
          ).map((g) => g.slug);
          expect(targetRankedRelated).toContain(slug);
        }

        // Every sibling in the same topic cluster must surface the new guide in Top-6 related cards
        const cluster = GUIDE_TOPIC_CLUSTERS.find((c) => c.id === article.topicClusterId)!;
        for (const siblingSlug of cluster.guideSlugs) {
          if (siblingSlug === slug) continue;
          const sibling = GUIDE_ARTICLES.find((g) => g.slug === siblingSlug)!;
          const siblingTopRelated = getRelatedGuidesForGuide(sibling, 6).map((g) => g.slug);
          expect(siblingTopRelated).toContain(slug);
        }

        // Every featured apartment's canonicalSlug and spaced displayName must be matched by 07:00 KST push dispatch aliases
        for (const aptKey of article.featuredApartments || []) {
          const preview = buildGuideAptMiniPreview(aptKey)!;
          const aliases = resolvePushSubscriptionAptAliases(preview.canonicalSlug, {
            dong: preview.dong,
          });
          expect(aliases).toContain(preview.canonicalSlug);
          expect(aliases).toContain(preview.displayName);
          expect(aliases.length).toBeLessThanOrEqual(10);
        }
      }

      // 1024px iPad Safari hydration Zero-CLS structural invariant: xl:flex-row (not lg:flex-row) + sm:truncate on summary copy
      const longApt = buildGuideAptMiniPreview('동탄역시범한화꿈에그린프레스티지')!;
      mockPwaState = { ...mockPwaState, isIOS: true, isPushSupported: false, isStandalone: false };
      const { unmount: unmountCard } = render(
        <GuideMorningAlertRetentionCard
          guideSlug="dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis"
          apartments={[longApt]}
        />
      );
      const summaryCopy = screen.getByTestId('guide-retention-summary-copy');
      expect(summaryCopy.className).toContain('sm:truncate');
      const layoutWrapper = summaryCopy.parentElement?.parentElement;
      expect(layoutWrapper?.className).toContain('xl:flex-row');
      expect(layoutWrapper?.className).not.toContain('lg:flex-row');
      unmountCard();

      // GuideDetailPage dynamic 23-guide count parity (zero stale "20개" / "20편" copy)
      const detailUi = await GuideDetailPage({
        params: Promise.resolve({
          slug: 'dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis',
        }),
      });
      const { container: detailContainer, unmount: unmountDetail } = render(detailUi);
      const detailText = detailContainer.textContent || '';
      expect(detailText).toContain(`전체 ${GUIDE_ARTICLES.length}개 가이드 허브`);
      expect(detailText).toContain(
        `5대 핵심 토픽 클러스터 대표 가이드 (${GUIDE_ARTICLES.length}개 리포트 전체 연결)`
      );
      expect(detailText).not.toContain('전체 20개 가이드');
      expect(detailText).not.toContain('20개 리포트 전체 연결');
      unmountDetail();
    });
  });
});

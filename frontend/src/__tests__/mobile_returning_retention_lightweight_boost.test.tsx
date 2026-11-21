/**
 * @jest-environment jsdom
 */
import vm from 'node:vm';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { render, screen, fireEvent, act, renderHook, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useFavorites,
  ensureGuestFavoriteSaved,
  readSanitizedGuestFavorites,
  buildGuestFavoritesHandoffUrl,
  consumeInboundGuestFavoritesFromUrl,
  resolveVerifiedGuestFavoriteSlug,
  INAPP_FAVORITES_HANDOFF_PARAM,
} from '@/hooks/useFavorites';
import { syncShallowApartmentOpen } from '@/lib/ads/recirculationEngine';
import { buildPreHydrationAdminGuardScript } from '@/lib/utils/adminExclusion';
import { CANONICAL_TX_SUMMARY_MAP } from '@/lib/utils/canonicalAptCatalog';
import { QuickNonLoginRetentionAction } from '@/components/common/QuickNonLoginRetentionAction';
import { ApartmentQuickRetentionBar } from '@/components/apartment/ApartmentQuickRetentionBar';
import { ApartmentChapterNavBar } from '@/components/apartment/ApartmentChapterNavBar';
import GuideMobileScrollDepthBar, {
  resolveActiveGuideSectionApartment,
} from '@/components/guide/GuideMobileScrollDepthBar';
import GuideAptPreviewCard from '@/components/guide/GuideAptPreviewCard';
import { GuideTopMatchupBridge, type ResolvedGuideHeadToHeadRow } from '@/components/guide/GuideTopMatchupBridge';
import GuideMorningAlertRetentionCard from '@/components/guide/GuideMorningAlertRetentionCard';
import PushSubscriptionModal, {
  detectPushInAppEnvironment,
  buildInAppExternalBrowserUrl,
} from '@/components/pwa/PushSubscriptionModal';
import InAppBrowserBypass from '@/components/pwa/InAppBrowserBypass';
import ApartmentPage from '@/app/apartment/[aptName]/page';
import GuideArticlePage from '@/app/guide/[slug]/page';
import { buildGuideAptMiniPreview } from '@/lib/data/guides';
import {
  auditSeoSemanticContainer,
  checkCopyBudget,
  hasVerboseProseEnding,
} from '@/lib/design-system/copyDiet';
import * as analytics from '@/lib/utils/analytics';

let mockPwaContext = {
  isInstallable: false,
  deferredPrompt: null,
  triggerA2HSPrompt: jest.fn().mockResolvedValue(false),
  showCustomA2HSModal: false,
  setShowCustomA2HSModal: jest.fn(),
  triggerCustomA2HSModal: jest.fn(),
  isPushSupported: true,
  pushSubscription: null,
  subscribeToPush: jest.fn().mockResolvedValue(true),
  unsubscribeFromPush: jest.fn().mockResolvedValue(true),
  showToast: jest.fn(),
  isIOS: false,
  isStandalone: false,
};

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => mockPwaContext,
  PWAProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/DashboardClient', () => {
  return function MockDashboardClient({
    preselectedAptName,
    hideHeader,
  }: {
    preselectedAptName?: string;
    hideHeader?: boolean;
  }) {
    return (
      <div data-testid="mock-dashboard-client" data-apt={preselectedAptName || ''}>
        {!hideHeader && <h1>D-VIEW 동탄 아파트 랩</h1>}
      </div>
    );
  };
});

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
  AdSlot: ({
    slotId,
    refreshSlotId,
    format,
  }: {
    slotId?: string;
    refreshSlotId?: string;
    format?: string;
  }) => (
    <div
      data-testid="ad-slot"
      data-slot-id={slotId ?? refreshSlotId}
      data-format={format}
    />
  ),
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const PROHIBITED_PALETTE_CLASS_REGEX =
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan|sky|green)(?:-[a-z0-9/\[\]]+)?\b/i;

describe('Mobile New -> Returning Visitor Lightweight Retention Boost (1-Click Non-Login Favorite & Weekday 07:00 Alert)', () => {
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;

  beforeAll(() => {
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: class MockIntersectionObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterAll(() => {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  beforeEach(() => {
    window.localStorage.clear();
    analytics.resetVirtualPageViewLedger();
    mockPwaContext = {
      isInstallable: false,
      deferredPrompt: null,
      triggerA2HSPrompt: jest.fn().mockResolvedValue(false),
      showCustomA2HSModal: false,
      setShowCustomA2HSModal: jest.fn(),
      triggerCustomA2HSModal: jest.fn(),
      isPushSupported: true,
      pushSubscription: null,
      subscribeToPush: jest.fn().mockResolvedValue(true),
      unsubscribeFromPush: jest.fn().mockResolvedValue(true),
      showToast: jest.fn(),
      isIOS: false,
      isStandalone: false,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Non-Login Local Persistence & Concurrency Edge Cases (ensureGuestFavoriteSaved + useFavorites)', () => {
    it('rejects empty/global placeholders, deduplicates whitespace aliases, recovers from malformed localStorage JSON, and handles rapid synchronous double-toggles without stale closure loss', async () => {
      expect(ensureGuestFavoriteSaved('')).toBe(false);
      expect(ensureGuestFavoriteSaved('   ')).toBe(false);
      expect(ensureGuestFavoriteSaved('동탄 전체')).toBe(false);
      expect(ensureGuestFavoriteSaved('동탄 전역')).toBe(false);
      expect(ensureGuestFavoriteSaved('아파트')).toBe(false);
      expect(window.localStorage.getItem('dview_guest_favorites')).toBeNull();

      // Malformed JSON recovery
      window.localStorage.setItem('dview_guest_favorites', '{corrupted-json');
      expect(ensureGuestFavoriteSaved('동탄역롯데캐슬')).toBe(true);
      expect(JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]')).toEqual([
        '동탄역롯데캐슬',
      ]);

      // Whitespace alias idempotency (must not add duplicate)
      expect(ensureGuestFavoriteSaved('동탄역 롯데캐슬')).toBe(false);
      expect(JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]')).toEqual([
        '동탄역롯데캐슬',
      ]);

      // Mixed-type / polluted array recovery preserves valid entries while appending new complex
      window.localStorage.setItem(
        'dview_guest_favorites',
        JSON.stringify(['동탄역롯데캐슬', 42, null, '   '])
      );
      expect(ensureGuestFavoriteSaved('더샵센트럴시티')).toBe(true);
      expect(JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]')).toEqual([
        '동탄역롯데캐슬',
        '더샵센트럴시티',
      ]);

      // Rapid synchronous back-to-back toggles in the same act() tick
      window.localStorage.clear();
      const { result } = renderHook(() =>
        useFavorites(undefined, {}, { fetchGlobalCounts: false, skipRemoteInTest: true })
      );

      await act(async () => {
        void result.current.handleToggleFavorite('동탄역롯데캐슬');
        void result.current.handleToggleFavorite('더샵센트럴시티');
      });

      expect(result.current.favoritesCount).toBe(2);
      expect(result.current.isFavorited('동탄역롯데캐슬')).toBe(true);
      expect(result.current.isFavorited('더샵센트럴시티')).toBe(true);

      // Synchronous double-toggle on the same complex cancels cleanly back to 1
      await act(async () => {
        void result.current.handleToggleFavorite('동탄역롯데캐슬');
        void result.current.handleToggleFavorite('동탄역롯데캐슬');
      });
      expect(result.current.isFavorited('동탄역롯데캐슬')).toBe(true);

      // Mixed/polluted localStorage array does NOT wipe valid favorites on useFavorites() mount + subsequent toggle
      window.localStorage.setItem(
        'dview_guest_favorites',
        JSON.stringify(['동탄역롯데캐슬', null, 42, '   ', '동탄 전체', '동탄 전역'])
      );
      expect(readSanitizedGuestFavorites()).toEqual(['동탄역롯데캐슬']);

      const { result: pollutedHook } = renderHook(() =>
        useFavorites(undefined, {}, { fetchGlobalCounts: false, skipRemoteInTest: true })
      );
      expect(pollutedHook.current.favoritesCount).toBe(1);
      expect(pollutedHook.current.isFavorited('동탄역롯데캐슬')).toBe(true);

      await act(async () => {
        await pollutedHook.current.handleToggleFavorite('힐스테이트동탄');
      });
      expect(pollutedHook.current.isFavorited('동탄역롯데캐슬')).toBe(true);
      expect(pollutedHook.current.isFavorited('힐스테이트동탄')).toBe(true);
      expect(JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]')).toEqual([
        '동탄역롯데캐슬',
        '힐스테이트동탄',
      ]);
    });
  });

  describe('2. QuickNonLoginRetentionAction & PushSubscriptionModal Auto-Watchlist Continuity', () => {
    it('syncs 1-Click favorite state across multiple mounted instances, lazy-mounts PushSubscriptionModal, and auto-saves watchlist upon push subscription', async () => {
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');

      // Empty aptName boundary renders nothing safely
      const { container: emptyContainer, unmount: unmountEmpty } = render(
        <QuickNonLoginRetentionAction aptName="   " surface="test_surface" />
      );
      expect(emptyContainer.firstChild).toBeNull();
      unmountEmpty();

      render(
        <div>
          <QuickNonLoginRetentionAction
            aptName="동탄 더샵 레이크에듀타운"
            canonicalSlug="동탄더샵레이크에듀타운"
            dong="산척동"
            guideSlug="dongtan-1-vs-2-comparison"
            surface="guide_sticky_depth_bar"
            triggerPrefix="sticky_depth"
            size="xs"
            testIdPrefix="inst-a"
          />
          <QuickNonLoginRetentionAction
            aptName="동탄 더샵 레이크에듀타운"
            canonicalSlug="동탄더샵레이크에듀타운"
            dong="산척동"
            guideSlug="dongtan-1-vs-2-comparison"
            surface="guide_preview_card"
            triggerPrefix="preview_top"
            size="sm"
            testIdPrefix="inst-b"
          />
        </div>
      );

      // Zero PushSubscriptionModal mounted before user interaction (O(1) DOM cost)
      expect(screen.queryByRole('dialog')).toBeNull();

      const favBtnA = screen.getByTestId('inst-a-fav-btn');
      const favBtnB = screen.getByTestId('inst-b-fav-btn');
      const alertBtnA = screen.getByTestId('inst-a-7am-btn');

      expect(favBtnA).toHaveTextContent('비로그인 찜');
      expect(favBtnB).toHaveTextContent('비로그인 1초 찜');
      expect(alertBtnA).toHaveAttribute('data-post-favorite-nudge', 'false');

      // 1-Click non-login favorite on Instance A -> syncs both Instance A and Instance B immediately
      fireEvent.click(favBtnA);

      expect(favBtnA).toHaveTextContent('찜됨');
      expect(favBtnB).toHaveTextContent('관심 찜됨');
      expect(alertBtnA).toHaveAttribute('data-post-favorite-nudge', 'true');
      expect(mockPwaContext.showToast).toHaveBeenCalledWith(
        expect.stringContaining('로그인 없이 관심단지에 찜했습니다')
      );

      const favEvents = trackEventSpy.mock.calls.filter(
        ([name]) => name === 'watchlist_toggle_favorite'
      );
      expect(favEvents).toHaveLength(1);
      expect(favEvents[0][1]).toEqual({
        apt_name: '동탄 더샵 레이크에듀타운',
        apartment_name: '동탄더샵레이크에듀타운',
        canonical_slug: '동탄더샵레이크에듀타운',
        dong: '산척동',
        guide_slug: 'dongtan-1-vs-2-comparison',
        is_favorite: true,
        surface: 'guide_sticky_depth_bar',
        trigger: 'sticky_depth_fav',
      });
      expect(favEvents[0][1]).not.toHaveProperty('source');

      // Click Weekday 07:00 Alert on Instance A -> opens lazy PushSubscriptionModal with post_fav_7am trigger
      fireEvent.click(alertBtnA);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_modal_open',
        expect.objectContaining({
          surface: 'guide_sticky_depth_bar',
          trigger: 'sticky_depth_post_fav_7am',
          apartment_name: '동탄더샵레이크에듀타운',
          guide_slug: 'dongtan-1-vs-2-comparison',
        })
      );
      expect(screen.getByRole('dialog')).toHaveTextContent('동탄 실거래가 알림 설정');
      expect(screen.getByRole('dialog')).toHaveTextContent('동탄 전체 + 동탄 더샵 레이크에듀타운');
      expect(screen.getByRole('dialog')).toHaveTextContent('로그인 없이 신청 · 매일 오전 7시대 국토부 매매 요약');

      // Verify direct PushSubscriptionModal subscription on a brand-new complex auto-saves it to dview_guest_favorites
      window.localStorage.clear();
      const onClose = jest.fn();
      render(
        <PushSubscriptionModal
          isOpen={true}
          onClose={onClose}
          aptName="힐스테이트 동탄"
          canonicalSlug="힐스테이트동탄"
          dong="목동"
        />
      );

      const submitBtns = screen.getAllByRole('button', { name: '실거래가 알림 신청하기' });
      fireEvent.click(submitBtns[submitBtns.length - 1]);

      await waitFor(() => {
        expect(mockPwaContext.subscribeToPush).toHaveBeenCalledWith(null, '힐스테이트동탄', {
          extraAptNames: ['동탄 전체'],
        });
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      const savedFavs = JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]');
      expect(savedFavs).toContain('힐스테이트동탄');
    });
  });

  describe('3. Apartment Detail In-Reading Surfaces (ApartmentPage SSR + Sticky ApartmentChapterNavBar)', () => {
    it('renders ApartmentQuickRetentionBar on /apartment/[aptName] with Copy Diet + SEO compliance, supports iOS A2HS fallback, and keeps sticky chapter retention active', async () => {
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');

      const pageJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
      });
      const { container, unmount } = render(pageJsx);

      const seoAudit = auditSeoSemanticContainer(container, { requireSingleH1: true });
      expect(seoAudit.valid).toBe(true);
      expect(seoAudit.violations).toEqual([]);

      // Zero nested interactive HTML tags across the entire ApartmentPage
      expect(container.querySelectorAll('a button, button a, button button, a a')).toHaveLength(0);
      expect(EMOJI_REGEX.test(container.textContent || '')).toBe(false);
      expect(container.querySelectorAll('.font-mono')).toHaveLength(0);

      const retentionBar = screen.getByTestId('apt-ssr-quick-retention-bar');
      expect(retentionBar.className).toContain('min-h-[60px]');
      const copyText = screen.getByTestId('apt-ssr-quick-retention-copy').textContent || '';
      expect(hasVerboseProseEnding(copyText)).toBe(false);

      // Retention bar avoids redundant duplicate signal pills alongside the single-line copy
      const pills = Array.from(
        retentionBar.querySelectorAll(
          'span.inline-flex.font-extrabold.tabular-nums.whitespace-nowrap.shrink-0.select-none'
        )
      );
      expect(pills.length).toBe(0);

      fireEvent.click(screen.getByTestId('apt-ssr-retention-fav-btn'));
      expect(JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]')).toContain(
        '동탄역롯데캐슬'
      );
      unmount();

      // iOS Safari non-standalone vs standalone boundary on ApartmentQuickRetentionBar
      mockPwaContext = {
        ...mockPwaContext,
        isIOS: true,
        isPushSupported: false,
        isStandalone: false,
      };
      const { rerender: rerenderAptBar, unmount: unmountAptBar } = render(
        <ApartmentQuickRetentionBar
          apartmentName="동탄역롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
          dong="여울동"
          latestPriceStr="정보 없음"
        />
      );
      expect(screen.getByTestId('apt-ssr-quick-retention-copy').textContent).not.toContain(
        '정보 없음'
      );
      const iosBtn = screen.getByTestId('apt-ssr-ios-a2hs-btn');
      fireEvent.click(iosBtn);
      expect(mockPwaContext.triggerCustomA2HSModal).toHaveBeenCalledTimes(1);

      // Standalone PWA suppresses iOS A2HS shortcut
      mockPwaContext = { ...mockPwaContext, isStandalone: true };
      rerenderAptBar(
        <ApartmentQuickRetentionBar
          apartmentName="동탄역롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
          dong="여울동"
        />
      );
      expect(screen.queryByTestId('apt-ssr-ios-a2hs-btn')).toBeNull();
      unmountAptBar();

      // Sticky ApartmentChapterNavBar right-pinned 1-Click retention delegates push modal to parent
      window.localStorage.clear();
      const onOpenPushModal = jest.fn();
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-03-gap"
          onSelectChapter={jest.fn()}
          compact={true}
          apartmentName="동탄역 롯데캐슬"
          displayAptName="동탄역 롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
          dong="여울동"
          inline={false}
          onOpenPushModal={onOpenPushModal}
        />
      );

      expect(screen.getByTestId('chapter-nav-sticky-retention')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('chapter-nav-retention-fav-btn'));
      expect(JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]')).toContain(
        '동탄역롯데캐슬'
      );

      fireEvent.click(screen.getByTestId('chapter-nav-retention-7am-btn'));
      expect(onOpenPushModal).toHaveBeenCalledTimes(1);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_modal_open',
        expect.objectContaining({
          surface: 'apartment_modal_chapter_nav',
          trigger: 'sticky_chapter_post_fav_7am',
          apartment_name: '동탄역롯데캐슬',
        })
      );
    });
  });

  describe('4. Guide In-Reading Surfaces (/guide/[slug] Sticky Bar + Matchup Bridge + Preview Cards + Footer Card)', () => {
    it('wires 1-Click non-login favorite & weekday 07:00 alert across sticky bar, top matchup cards, mid/bottom preview cards, and footer card with zero nested interactive tags', async () => {
      const vsGuideJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      const { container, unmount } = render(vsGuideJsx);

      // 1. SEO & HTML5 Nesting Integrity
      const seoAudit = auditSeoSemanticContainer(container, { requireSingleH1: true });
      expect(seoAudit.valid).toBe(true);
      expect(container.querySelectorAll('a button, button a, button button, a a')).toHaveLength(0);
      expect(EMOJI_REGEX.test(container.textContent || '')).toBe(false);
      expect(container.querySelectorAll('.font-mono')).toHaveLength(0);
      for (const el of Array.from(container.querySelectorAll('*'))) {
        if (typeof el.className === 'string') {
          expect(PROHIBITED_PALETTE_CLASS_REGEX.test(el.className)).toBe(false);
        }
      }

      // 2. Sticky Reading Bar (`GuideMobileScrollDepthBar`) exposes 1-Click non-login favorite & 07:00 alert
      const stickyFavBtn = screen.getByTestId('guide-sticky-retention-fav-btn');
      const sticky7amBtn = screen.getByTestId('guide-sticky-retention-7am-btn');
      expect(stickyFavBtn).toHaveTextContent('비로그인 찜');
      fireEvent.click(stickyFavBtn);
      expect(stickyFavBtn).toHaveTextContent('찜됨');
      expect(sticky7amBtn).toHaveAttribute('data-post-favorite-nudge', 'true');

      // 3. Top 1:1 Matchup Bridge (`GuideTopMatchupBridge`) exposes per-complex retention controls
      const leftH2hFav = screen.getByTestId('guide-h2h-left-retention-fav-btn');
      const rightH2hFav = screen.getByTestId('guide-h2h-right-retention-fav-btn');
      expect(leftH2hFav).toBeInTheDocument();
      expect(rightH2hFav).toBeInTheDocument();

      // 4. Mid-article & top/bottom `GuideAptPreviewCard` sibling retention bars exist
      expect(
        container.querySelectorAll('[data-testid="guide-apt-preview-retention-article_top"]').length
      ).toBeGreaterThan(0);
      expect(
        container.querySelectorAll('[data-testid="guide-apt-preview-retention-zone_section"]').length
      ).toBeGreaterThan(0);
      expect(
        container.querySelectorAll('[data-testid="guide-apt-preview-retention-article_bottom"]')
          .length
      ).toBeGreaterThan(0);

      // 5. Footer `GuideMorningAlertRetentionCard` reflects synchronized favorite state or transitions on click
      const footerCard = screen.getByTestId('guide-morning-alert-retention-card');
      expect(footerCard).toHaveTextContent('매일 오전 7시대');
      expect(footerCard).toHaveTextContent('비로그인 1초 찜');

      unmount();

      // Direct unit check on isolated GuideMobileScrollDepthBar, GuideAptPreviewCard, GuideTopMatchupBridge, and GuideMorningAlertRetentionCard
      window.localStorage.clear();
      const sampleApt = buildGuideAptMiniPreview('동탄더샵레이크에듀타운')!;
      const rivalApt = buildGuideAptMiniPreview('동탄역롯데캐슬')!;
      const matchupRow: ResolvedGuideHeadToHeadRow = {
        title: '호수 vs 역세권',
        subtitle: '실거래 대조',
        leftLabel: '호수 대장',
        rightLabel: '역세권 대장',
        verdict: '실거주 성향별 선택',
        left: sampleApt,
        right: rivalApt,
      };

      render(
        <div>
          <GuideMobileScrollDepthBar
            guideSlug="dongtan-lake-vs-station-comparison"
            sections={[{ id: 'sec-1', label: '섹션 1' }]}
            apartments={[sampleApt]}
          />
          <GuideTopMatchupBridge
            guideSlug="dongtan-lake-vs-station-comparison"
            guideTitle="호수 vs 역세권"
            matchups={[matchupRow]}
          />
          <GuideAptPreviewCard
            item={sampleApt}
            guideSlug="dongtan-lake-vs-station-comparison"
            placement="zone_section"
          />
          <GuideMorningAlertRetentionCard
            guideSlug="dongtan-lake-vs-station-comparison"
            apartments={[sampleApt, rivalApt]}
          />
        </div>
      );

      // Favoriting via mid-article preview card synchronizes sticky bar, top matchup card, AND footer card simultaneously!
      fireEvent.click(screen.getByTestId('guide-preview-zone_section-fav-btn'));

      expect(screen.getByTestId('guide-sticky-retention-fav-btn')).toHaveTextContent('찜됨');
      expect(screen.getByTestId('guide-h2h-left-retention-fav-btn')).toHaveTextContent('찜됨');
      expect(screen.getByTestId('guide-retention-watchlist-btn')).toHaveTextContent('관심 저장됨');
      expect(screen.getByTestId('guide-morning-7am-push-btn')).toHaveTextContent(
        '관심 저장됨 · 매일 오전 7시대 실거래 알림 켜기'
      );
    });

    it('dynamically updates GuideMobileScrollDepthBar active apartment across guide sections and handles KakaoTalk/Naver/Instagram In-App Browser push recovery + iOS A2HS auto-save', async () => {
      const apt1 = buildGuideAptMiniPreview('동탄더샵레이크에듀타운')!;
      const apt2 = buildGuideAptMiniPreview('솔빛마을서해그랑블')!;
      const apt3 = buildGuideAptMiniPreview('동탄역롯데캐슬')!;

      // 1. Pure section-to-apartment resolver checks (DOM slug hit -> heading complex -> dong -> fallback[0])
      const sections = [
        { id: 'guide-section-1', label: '1. 종합 개요', fullTitle: '1동탄 vs 2동탄 종합 개요' },
        { id: 'guide-section-2', label: '2. 반송동 학군', fullTitle: '반송동 솔빛마을 핵심 입지' },
        { id: 'guide-section-3', label: '3. 동탄역 초역세권', fullTitle: '동탄역 롯데캐슬 GTX-A 비교' },
      ];
      expect(
        resolveActiveGuideSectionApartment('guide-section-1', sections, [apt1, apt2, apt3])
          ?.canonicalSlug
      ).toBe(apt1.canonicalSlug);
      expect(
        resolveActiveGuideSectionApartment('guide-section-2', sections, [apt1, apt2, apt3])
          ?.canonicalSlug
      ).toBe(apt2.canonicalSlug);
      expect(
        resolveActiveGuideSectionApartment('guide-section-3', sections, [apt1, apt2, apt3])
          ?.canonicalSlug
      ).toBe(apt3.canonicalSlug);
      expect(
        resolveActiveGuideSectionApartment(
          'guide-section-1',
          sections,
          [apt1, apt2, apt3],
          apt3.canonicalSlug
        )?.canonicalSlug
      ).toBe(apt3.canonicalSlug);

      // Mount DOM headings with [data-apt-slug] and click TOC chip to verify live sticky bar transition
      const domWrap = render(
        <div>
          <GuideMobileScrollDepthBar
            guideSlug="dongtan-1-vs-2-comparison"
            sections={sections}
            apartments={[apt1, apt2, apt3]}
          />
          <h3 id="guide-section-1">1. 종합 개요</h3>
          <p>도입부 설명</p>
          <h3 id="guide-section-2">2. 반송동 학군</h3>
          <div>
            <Link
              href="/apartment/솔빛마을서해그랑블"
              prefetch={false}
              data-apt-slug={apt2.canonicalSlug}
            >
              {apt2.displayName}
            </Link>
          </div>
          <h3 id="guide-section-3">3. 동탄역 초역세권</h3>
          <div>
            <Link
              href="/apartment/동탄역롯데캐슬"
              prefetch={false}
              data-apt-slug={apt3.canonicalSlug}
            >
              {apt3.displayName}
            </Link>
          </div>
        </div>
      );

        expect(screen.getByTestId('guide-sticky-active-apt')).toHaveTextContent(apt1.displayName);
      window.history.replaceState({ __NA: true, tocKeep: 'state-ok' }, '', '/guide/dongtan-1-vs-2-comparison?utm_source=naver');
      fireEvent.click(screen.getByTestId('guide-toc-chip-guide-section-2'));
      expect(screen.getByTestId('guide-sticky-active-apt')).toHaveTextContent(apt2.displayName);
      expect(window.history.state).toEqual({ __NA: true, tocKeep: 'state-ok' });
      expect(window.location.search).toBe('?utm_source=naver');
      fireEvent.click(screen.getByTestId('guide-toc-chip-guide-section-3'));
      expect(screen.getByTestId('guide-sticky-active-apt')).toHaveTextContent(apt3.displayName);
      domWrap.unmount();

      // 2. In-App Browser detection & external deep-link builders (KakaoTalk iOS, Naver Android, Instagram iOS)
      const kakaoIosEnv = detectPushInAppEnvironment(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KAKAOTALK 10.5.0',
        5
      );
      expect(kakaoIosEnv.isInApp).toBe(true);
      expect(kakaoIosEnv.isIOS).toBe(true);
      expect(kakaoIosEnv.canOpenExternalDirectly).toBe(true);
      expect(
        buildInAppExternalBrowserUrl('https://dongtanview.com/guide/dongtan-1-vs-2-comparison', kakaoIosEnv)
      ).toContain('kakaotalk://web/openExternal?url=');

      const naverAndroidEnv = detectPushInAppEnvironment(
        'Mozilla/5.0 (Linux; Android 14; SM-S928N) Chrome/124.0.0.0 Mobile Safari/537.36 NAVER(inapp; search; 1000)',
        5
      );
      expect(naverAndroidEnv.isInApp).toBe(true);
      expect(naverAndroidEnv.isAndroid).toBe(true);
      expect(
        buildInAppExternalBrowserUrl('https://dongtanview.com/apartment/동탄역롯데캐슬', naverAndroidEnv)
      ).toContain('intent://dongtanview.com/');

      const instaIosEnv = detectPushInAppEnvironment(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148 Instagram 320.0',
        5
      );
      expect(instaIosEnv.isInApp).toBe(true);
      expect(instaIosEnv.canOpenExternalDirectly).toBe(false);
      expect(buildInAppExternalBrowserUrl('https://dongtanview.com/', instaIosEnv)).toBeNull();

      // 3. Render PushSubscriptionModal inside KakaoTalk iOS In-App UA -> shows Safari bridge & auto-saves favorite
      const origUa = window.navigator.userAgent;
      Object.defineProperty(window.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KAKAOTALK 10.5.0 jsdom',
        configurable: true,
      });
      window.localStorage.clear();
      mockPwaContext = {
        ...mockPwaContext,
        isIOS: true,
        isPushSupported: false,
        isStandalone: false,
      };

      const { unmount: unmountInApp } = render(
        <PushSubscriptionModal
          isOpen={true}
          onClose={jest.fn()}
          aptName="동탄역 롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
          dong="여울동"
        />
      );

      expect(screen.getByTestId('push-inapp-browser-bridge')).toBeInTheDocument();
      const openExtBtn = screen.getByTestId('push-inapp-open-external-btn');
      expect(openExtBtn).toHaveTextContent('Safari에서 열기');
      fireEvent.click(openExtBtn);
      expect(JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]')).toContain(
        '동탄역롯데캐슬'
      );
      unmountInApp();

      // 4. Regular iOS Safari (non-InApp) A2HS button also auto-saves complex to dview_guest_favorites
      Object.defineProperty(window.navigator, 'userAgent', {
        value: origUa,
        configurable: true,
      });
      window.localStorage.clear();
      const { unmount: unmountIosSafari } = render(
        <PushSubscriptionModal
          isOpen={true}
          onClose={jest.fn()}
          aptName="더샵 센트럴시티"
          canonicalSlug="더샵센트럴시티"
          dong="청계동"
        />
      );
      fireEvent.click(screen.getByTestId('push-ios-a2hs-btn'));
      expect(mockPwaContext.triggerCustomA2HSModal).toHaveBeenCalled();
      expect(JSON.parse(window.localStorage.getItem('dview_guest_favorites') || '[]')).toContain(
        '더샵센트럴시티'
      );
      unmountIosSafari();

      // 5. Real PWAProvider.subscribeToPush syncs multi-favorited dview_guest_favorites into apartmentNames and rejects HTTP 400
      const actualPwaModule = jest.requireActual('@/components/pwa/PWAProvider') as {
        PWAProvider: React.ComponentType<{ children: React.ReactNode }>;
        usePWA: () => {
          isPushSupported: boolean;
          subscribeToPush: (uid?: string | null, aptName?: string) => Promise<boolean>;
        };
      };

      const prevSw = Object.getOwnPropertyDescriptor(window.navigator, 'serviceWorker');
      const prevPushManager = Object.getOwnPropertyDescriptor(window, 'PushManager');
      const prevNotification = Object.getOwnPropertyDescriptor(window, 'Notification');
      const prevOnLine = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
      const prevFetch = global.fetch;
      const prevVapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      try {
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
          'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        const fakeSub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test-ep-123' };
        Object.defineProperty(window.navigator, 'serviceWorker', {
          configurable: true,
          value: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            getRegistration: jest.fn().mockResolvedValue(null),
            ready: Promise.resolve({
              pushManager: {
                getSubscription: jest.fn().mockResolvedValue(null),
                subscribe: jest.fn().mockResolvedValue(fakeSub),
              },
            }),
          },
        });
        Object.defineProperty(window, 'PushManager', {
          configurable: true,
          value: function MockPushManager() {},
        });
        Object.defineProperty(window, 'Notification', {
          configurable: true,
          value: {
            permission: 'granted',
            requestPermission: jest.fn().mockResolvedValue('granted'),
          },
        });
        Object.defineProperty(window.navigator, 'onLine', {
          configurable: true,
          value: true,
        });

        window.localStorage.setItem(
          'dview_guest_favorites',
          JSON.stringify(['시범한빛마을금호어울림', '동탄더샵레이크에듀타운'])
        );

        const fetchMock = jest
          .fn()
          .mockResolvedValueOnce({ ok: true, status: 200 })
          .mockResolvedValueOnce({ ok: false, status: 400 });
        global.fetch = fetchMock as unknown as typeof fetch;

        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <actualPwaModule.PWAProvider>{children}</actualPwaModule.PWAProvider>
        );
        const { result: realPwaHook } = renderHook(() => actualPwaModule.usePWA(), { wrapper });

        await waitFor(() => {
          expect(realPwaHook.current.isPushSupported).toBe(true);
        });

        let firstOk = false;
        await act(async () => {
          firstOk = await realPwaHook.current.subscribeToPush(null, '동탄역롯데캐슬');
        });
        expect(firstOk).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const postedBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
        expect(postedBody.apartmentName).toBe('동탄역롯데캐슬');
        expect(postedBody.apartmentNames).toEqual([
          '시범한빛마을금호어울림',
          '동탄더샵레이크에듀타운',
        ]);

        // HTTP 400 client rejection returns false instead of reporting fake success
        let secondOk = true;
        await act(async () => {
          secondOk = await realPwaHook.current.subscribeToPush(null, '동탄역롯데캐슬');
        });
        expect(secondOk).toBe(false);

        // >50 guest favorites + spaced/alias duplicates are canonicalized, deduplicated, and capped to <=50 (never tripping API .max(50) HTTP 400)
        const manyCatalogSlugs = Object.keys(CANONICAL_TX_SUMMARY_MAP).slice(0, 56);
        window.localStorage.setItem(
          'dview_guest_favorites',
          JSON.stringify(['동탄역 롯데캐슬', ...manyCatalogSlugs])
        );
        fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
        let cappedOk = false;
        await act(async () => {
          cappedOk = await realPwaHook.current.subscribeToPush(null, '동탄역롯데캐슬');
        });
        expect(cappedOk).toBe(true);
        const cappedBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
        expect(cappedBody.apartmentNames.length).toBeLessThanOrEqual(50);
        expect(cappedBody.apartmentNames).not.toContain('동탄역롯데캐슬');
        expect(cappedBody.apartmentNames).not.toContain('동탄역 롯데캐슬');
      } finally {
        global.fetch = prevFetch;
        if (prevVapidPublicKey === undefined) {
          delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        } else {
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = prevVapidPublicKey;
        }
        if (prevSw) Object.defineProperty(window.navigator, 'serviceWorker', prevSw);
        if (prevPushManager) Object.defineProperty(window, 'PushManager', prevPushManager);
        if (prevNotification) Object.defineProperty(window, 'Notification', prevNotification);
        if (prevOnLine) Object.defineProperty(window.navigator, 'onLine', prevOnLine);
      }
    });
  });

  describe('5. In-App Browser -> External Browser Watchlist Handoff & URL Noise Cleanup', () => {
    it('bridges favorited complexes across KakaoTalk/Naver/Instagram WebView sandboxes into Safari/Chrome, merges without overwriting, and strips ?dview_fav URL noise while preserving utm/hash/history.state', async () => {
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      const origUa = window.navigator.userAgent;
      const origClipboard = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');

      try {
        // 1. Strict catalog validation rejects XSS, unknown complexes, and global placeholders while normalizing NFD Hangul
        expect(resolveVerifiedGuestFavoriteSlug('<script>alert(1)</script>')).toBeNull();
        expect(resolveVerifiedGuestFavoriteSlug('없는가짜단지999')).toBeNull();
        expect(resolveVerifiedGuestFavoriteSlug('동탄 전체')).toBeNull();
        expect(resolveVerifiedGuestFavoriteSlug('동탄 전역')).toBeNull();
        expect(resolveVerifiedGuestFavoriteSlug('   ')).toBeNull();
        expect(
          resolveVerifiedGuestFavoriteSlug('동탄역 롯데캐슬'.normalize('NFD'))
        ).toBe('동탄역롯데캐슬');

        // 2. Android Naver In-App with #guide-section-2 hash keeps a single #Intent; delimiter without hash collision
        window.localStorage.setItem(
          'dview_guest_favorites',
          JSON.stringify(['동탄더샵레이크에듀타운'])
        );
        const naverAndroidEnv = detectPushInAppEnvironment(
          'Mozilla/5.0 (Linux; Android 14; SM-S928N) Chrome/124.0.0.0 Mobile Safari/537.36 NAVER(inapp; search; 1000)',
          5
        );
        const androidIntent = buildInAppExternalBrowserUrl(
          'https://dongtanview.com/guide/dongtan-1-vs-2-comparison?utm_source=naver#guide-section-2',
          naverAndroidEnv,
          ['동탄역롯데캐슬']
        )!;
        expect(androidIntent.startsWith('intent://dongtanview.com/guide/dongtan-1-vs-2-comparison?')).toBe(
          true
        );
        expect(androidIntent.match(/#/g)).toHaveLength(1);
        expect(androidIntent).toContain('#Intent;scheme=https;package=com.android.chrome;');
        const fallbackMatch = androidIntent.match(/S\.browser_fallback_url=([^;]+);end$/);
        expect(fallbackMatch).not.toBeNull();
        const decodedAndroidFallback = new URL(decodeURIComponent(fallbackMatch![1]));
        expect(decodedAndroidFallback.searchParams.get('utm_source')).toBe('naver');
        expect(decodedAndroidFallback.searchParams.get(INAPP_FAVORITES_HANDOFF_PARAM)).toBe(
          '동탄더샵레이크에듀타운,동탄역롯데캐슬'
        );
        expect(decodedAndroidFallback.hash).toBe('#guide-section-2');

        // 3. KakaoTalk iOS In-App -> Safari end-to-end sandbox transition
        window.localStorage.setItem(
          'dview_guest_favorites',
          JSON.stringify(['동탄더샵레이크에듀타운'])
        );
        window.history.replaceState(
          null,
          '',
          '/guide/dongtan-1-vs-2-comparison?utm_source=kakao&hl=ko-KR#guide-section-3'
        );
        Object.defineProperty(window.navigator, 'userAgent', {
          value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KAKAOTALK 10.5.0 jsdom',
          configurable: true,
        });
        mockPwaContext = {
          ...mockPwaContext,
          isIOS: true,
          isPushSupported: false,
          isStandalone: false,
        };

        const { unmount: unmountKakaoModal } = render(
          <PushSubscriptionModal
            isOpen={true}
            onClose={jest.fn()}
            aptName="동탄역 롯데캐슬"
            canonicalSlug="동탄역롯데캐슬"
            dong="여울동"
            guideSlug="dongtan-1-vs-2-comparison"
          />
        );

        const openSafariBtn = screen.getByTestId('push-inapp-open-external-btn');
        const kakaoSchemeHref = openSafariBtn.getAttribute('data-external-href') || '';
        expect(kakaoSchemeHref.startsWith('kakaotalk://web/openExternal?url=')).toBe(true);
        fireEvent.click(openSafariBtn);
        unmountKakaoModal();

        const encodedTarget = kakaoSchemeHref.replace('kakaotalk://web/openExternal?url=', '');
        const decodedSafariArrivalUrl = new URL(decodeURIComponent(encodedTarget));
        expect(decodedSafariArrivalUrl.searchParams.get(INAPP_FAVORITES_HANDOFF_PARAM)).toBe(
          '동탄더샵레이크에듀타운,동탄역롯데캐슬'
        );
        expect(decodedSafariArrivalUrl.searchParams.get('utm_source')).toBe('kakao');
        expect(decodedSafariArrivalUrl.searchParams.has('hl')).toBe(false);
        expect(decodedSafariArrivalUrl.hash).toBe('#guide-section-3');

        // Simulate isolated Safari sandbox: In-App localStorage is NOT shared, Safari had 1 older favorite ('힐스테이트동탄')
        window.localStorage.clear();
        window.localStorage.setItem('dview_guest_favorites', JSON.stringify(['힐스테이트동탄']));
        Object.defineProperty(window.navigator, 'userAgent', {
          value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
          configurable: true,
        });
        const preservedHistoryState = { __NA: true, scrollKey: 'safari-arrival-state' };
        window.history.replaceState(
          preservedHistoryState,
          '',
          `${decodedSafariArrivalUrl.pathname}${decodedSafariArrivalUrl.search}${decodedSafariArrivalUrl.hash}`
        );

        const actualPwaModule = jest.requireActual('@/components/pwa/PWAProvider') as {
          PWAProvider: React.ComponentType<{ children: React.ReactNode }>;
        };

        const { unmount: unmountSafariArrival } = render(
          <actualPwaModule.PWAProvider>
            <ApartmentQuickRetentionBar
              apartmentName="동탄역 롯데캐슬"
              canonicalSlug="동탄역롯데캐슬"
              dong="여울동"
            />
          </actualPwaModule.PWAProvider>
        );

        // Pre-existing Safari favorite + both In-App favorited complexes are merged in localStorage
        expect(readSanitizedGuestFavorites()).toEqual([
          '힐스테이트동탄',
          '동탄더샵레이크에듀타운',
          '동탄역롯데캐슬',
        ]);

        // UI reflects favorited state immediately with post-favorite 07:00 nudge active
        expect(screen.getByTestId('apt-ssr-retention-fav-btn')).toHaveTextContent('관심 찜됨');
        expect(screen.getByTestId('apt-ssr-retention-7am-btn')).toHaveAttribute(
          'data-post-favorite-nudge',
          'true'
        );

        // URL noise (?dview_fav=...) is stripped while preserving ?utm_source=kakao, #guide-section-3, and history.state
        expect(window.location.pathname).toBe('/guide/dongtan-1-vs-2-comparison');
        expect(window.location.search).toBe('?utm_source=kakao');
        expect(window.location.hash).toBe('#guide-section-3');
        expect(window.history.state).toEqual(preservedHistoryState);

        // PWAProvider surfaces arrival confirmation toast and GA4 telemetry
        expect(
          screen.getByText(/외 1곳 관심단지가 이어졌습니다 · 매일 오전 7시대 알림을 켜보세요/)
        ).toBeInTheDocument();
        expect(trackEventSpy).toHaveBeenCalledWith(
          'inapp_watchlist_handoff_restored',
          expect.objectContaining({
            surface: 'pwa_provider',
            trigger: 'external_browser_arrival',
            apartment_name: '동탄더샵레이크에듀타운',
            restored_count: 2,
            newly_added_count: 2,
          })
        );
        unmountSafariArrival();

        // 4. Instagram iOS In-App (no direct scheme) & top 48px InAppBrowserBypass copy URLs include ?dview_fav=... cleanly
        const writeTextMock = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(window.navigator, 'clipboard', {
          configurable: true,
          value: { writeText: writeTextMock },
        });
        Object.defineProperty(window.navigator, 'userAgent', {
          value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148 Instagram 320.0',
          configurable: true,
        });
        window.localStorage.clear();
        window.history.replaceState(null, '', '/apartment/%EB%8D%94%EC%83%B5%EC%84%BC%ED%8A%B8%EB%9F%B4%EC%8B%9C%ED%8B%B0');

        // When no favorites exist yet, InAppBrowserBypass copies clean URL without ?dview_fav
        const { unmount: unmountBypassClean } = render(<InAppBrowserBypass />);
        await act(async () => {
          fireEvent.click(screen.getByTestId('inapp-copy-link-btn'));
        });
        expect(writeTextMock).toHaveBeenLastCalledWith(
          expect.not.stringContaining('dview_fav')
        );
        unmountBypassClean();

        // After 1-Click favoriting, both InAppBrowserBypass and Instagram PushSubscriptionModal copy ?dview_fav=...
        ensureGuestFavoriteSaved('더샵센트럴시티');
        const { unmount: unmountBypassWithFav } = render(<InAppBrowserBypass />);
        await act(async () => {
          fireEvent.click(screen.getByTestId('inapp-copy-link-btn'));
        });
        const bypassCopiedUrl = new URL(writeTextMock.mock.calls[writeTextMock.mock.calls.length - 1][0]);
        expect(bypassCopiedUrl.searchParams.get(INAPP_FAVORITES_HANDOFF_PARAM)).toBe('더샵센트럴시티');
        unmountBypassWithFav();

        const { unmount: unmountInstaModal } = render(
          <PushSubscriptionModal
            isOpen={true}
            onClose={jest.fn()}
            aptName="솔빛마을 서해그랑블"
            canonicalSlug="솔빛마을서해그랑블"
            dong="반송동"
          />
        );
        await act(async () => {
          fireEvent.click(screen.getByTestId('push-inapp-primary-copy-btn'));
        });
        const instaCopiedUrl = new URL(writeTextMock.mock.calls[writeTextMock.mock.calls.length - 1][0]);
        expect(instaCopiedUrl.searchParams.get(INAPP_FAVORITES_HANDOFF_PARAM)).toBe(
          '더샵센트럴시티,솔빛마을서해그랑블'
        );
        unmountInstaModal();

        // 5. Malicious / bogus ?dview_fav=... payload is rejected 100% while still cleaning URL noise
        window.localStorage.clear();
        window.history.replaceState(
          null,
          '',
          '/explore?dview_fav=%3Cscript%3Ealert(1)%3C%2Fscript%3E,%EC%97%86%EB%8A%94%EA%B0%80%EC%A7%9C%EB%8B%A8%EC%A7%80,%EB%8F%99%ED%83%84%20%EC%A0%84%EC%B2%B4&utm_medium=share'
        );
        const maliciousReceipt = consumeInboundGuestFavoritesFromUrl();
        expect(maliciousReceipt.hadHandoffParam).toBe(true);
        expect(maliciousReceipt.restoredSlugs).toEqual([]);
        expect(window.localStorage.getItem('dview_guest_favorites')).toBeNull();
        expect(window.location.search).toBe('?utm_medium=share');
        expect(buildGuestFavoritesHandoffUrl('https://dongtanview.com/explore?dview_fav=junk')).toBe(
          'https://dongtanview.com/explore'
        );
      } finally {
        Object.defineProperty(window.navigator, 'userAgent', {
          value: origUa,
          configurable: true,
        });
        if (origClipboard) {
          Object.defineProperty(window.navigator, 'clipboard', origClipboard);
        } else {
          Reflect.deleteProperty(window.navigator, 'clipboard');
        }
        window.history.replaceState(null, '', '/');
      }
    });

    it('prevents outbound 404 on 0-tx/shallow routes, survives child syncShallowApartmentOpen & pre-hydration <head> strip, supports LINE/iPadOS bridges, and retains session favorites when localStorage throws', async () => {
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      const origUa = window.navigator.userAgent;
      const origMaxTouch = Object.getOwnPropertyDescriptor(window.navigator, 'maxTouchPoints');

      try {
        // 1. Outbound 404 prevention for 0-tx complexes (in CANONICAL_DONG_APT_LIST, absent from CANONICAL_TX_SUMMARY_MAP), non-canonical /apartment/ aliases, /compare, and /calculator/*
        expect(Object.prototype.hasOwnProperty.call(CANONICAL_TX_SUMMARY_MAP, '동탄파라곤3차')).toBe(false);
        const zeroTxHandoff = buildGuestFavoritesHandoffUrl(
          'https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%ED%8C%8C%EB%9D%BC%EA%B3%A43%EC%B0%A8',
          ['동탄 파라곤 3차']
        );
        const zeroTxUrl = new URL(zeroTxHandoff);
        expect(zeroTxUrl.pathname).toBe('/explore');
        expect(zeroTxUrl.searchParams.get('apt')).toBe('동탄파라곤3차');
        expect(zeroTxUrl.searchParams.get(INAPP_FAVORITES_HANDOFF_PARAM)).toBe('동탄파라곤3차');
        expect(zeroTxUrl.hash).toBe(`#apt=${encodeURIComponent('동탄파라곤3차')}`);

        // Spaced/alias /apartment/ path normalizes to canonical SSG slug even with 0 favorites
        expect(
          buildGuestFavoritesHandoffUrl('https://dongtanview.com/apartment/동탄역%20롯데캐슬')
        ).toBe(`https://dongtanview.com/apartment/${encodeURIComponent('동탄역롯데캐슬')}`);

        // Shallow /compare & /calculator/* routes normalize to HTTP 200 /explore?calc=...
        const compareHandoff = new URL(
          buildGuestFavoritesHandoffUrl(
            'https://dongtanview.com/compare?apt1=동탄역롯데캐슬&apt2=더샵센트럴시티'
          )
        );
        expect(compareHandoff.pathname).toBe('/explore');
        expect(compareHandoff.searchParams.get('calc')).toBe('compare');
        expect(compareHandoff.searchParams.get('apt1')).toBe('동탄역롯데캐슬');
        expect(compareHandoff.searchParams.get('apt2')).toBe('더샵센트럴시티');

        const calcHandoff = new URL(
          buildGuestFavoritesHandoffUrl(
            'https://dongtanview.com/calculator/mortgage?apt=동탄역롯데캐슬'
          )
        );
        expect(calcHandoff.pathname).toBe('/explore');
        expect(calcHandoff.searchParams.get('calc')).toBe('mortgage');
        expect(calcHandoff.searchParams.get('apt1')).toBe('동탄역롯데캐슬');
        expect(calcHandoff.searchParams.has('apt')).toBe(false);

        // 2. Child useEffect calling syncShallowApartmentOpen BEFORE parent PWAProvider useEffect does NOT wipe ?dview_fav
        window.localStorage.clear();
        Object.defineProperty(window.navigator, 'userAgent', {
          value:
            'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          configurable: true,
        });
        window.history.replaceState(
          null,
          '',
          '/explore?apt=%EB%8F%99%ED%83%84%ED%8C%8C%EB%9D%BC%EA%B3%A43%EC%B0%A8&dview_fav=%EB%8F%99%ED%83%84%ED%8C%8C%EB%9D%BC%EA%B3%A43%EC%B0%A8'
        );

        const actualPwaModule = jest.requireActual('@/components/pwa/PWAProvider') as {
          PWAProvider: React.ComponentType<{ children: React.ReactNode }>;
        };

        function ChildShallowModalOpener() {
          useEffect(() => {
            syncShallowApartmentOpen('동탄파라곤3차', {
              dong: '신동',
              canonicalSlug: '동탄파라곤3차',
              force: true,
            });
          }, []);
          return <div data-testid="child-shallow-opener" />;
        }

        const { unmount: unmountChildRace } = render(
          <actualPwaModule.PWAProvider>
            <ChildShallowModalOpener />
          </actualPwaModule.PWAProvider>
        );

        expect(readSanitizedGuestFavorites()).toEqual(['동탄파라곤3차']);
        expect(window.location.pathname).toBe(
          `/apartment/${encodeURIComponent('동탄파라곤3차')}`
        );
        expect(window.location.search).toBe('');
        expect(
          screen.getByText(/동탄파라곤3차 관심단지가 이어졌습니다 · 매일 오전 7시대 알림을 켜보세요/)
        ).toBeInTheDocument();
        expect(trackEventSpy).toHaveBeenCalledWith(
          'inapp_watchlist_handoff_restored',
          expect.objectContaining({
            apartment_name: '동탄파라곤3차',
            restored_count: 1,
            newly_added_count: 1,
          })
        );
        unmountChildRace();

        // 3. Pre-hydration <head> guard script strips ?dview_fav & ?openExternalBrowser=1 synchronously BEFORE GA4 runs, while PWAProvider still restores favorites
        window.localStorage.clear();
        window.history.replaceState(
          { __NA: true, preHydration: 1 },
          '',
          '/guide/dongtan-1-vs-2-comparison?utm_source=line&dview_fav=%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC,%EB%8D%94%EC%83%B5%EC%84%BC%ED%8A%B8%EB%9F%B4%EC%8B%9C%ED%8B%B0&openExternalBrowser=1#guide-section-2'
        );
        const preHydrationCode = buildPreHydrationAdminGuardScript('G-TEST12345');
        vm.runInNewContext(preHydrationCode, {
          window,
          document,
          URL,
          URLSearchParams,
        });

        // Synchronously clean before React mounts or GA4 reads window.location.search!
        expect(window.location.search).toBe('?utm_source=line');
        expect(window.location.hash).toBe('#guide-section-2');
        expect(window.history.state).toEqual({ __NA: true, preHydration: 1 });

        const { unmount: unmountPreHydrated } = render(
          <actualPwaModule.PWAProvider>
            <div />
          </actualPwaModule.PWAProvider>
        );
        expect(readSanitizedGuestFavorites()).toEqual(['동탄역롯데캐슬', '더샵센트럴시티']);
        expect(
          screen.getByText(/외 1곳 관심단지가 이어졌습니다 · 매일 오전 7시대 알림을 켜보세요/)
        ).toBeInTheDocument();
        unmountPreHydrated();

        // 4. LINE iOS openExternalBrowser=1, non-LINE "CommandLine" false-positive guard, and iPadOS 13+ KakaoTalk detection
        window.localStorage.clear();
        const lineIosEnv = detectPushInAppEnvironment(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148 Safari/604.1 Line/14.5.0',
          5
        );
        expect(lineIosEnv.isInApp).toBe(true);
        expect(lineIosEnv.canOpenExternalDirectly).toBe(true);
        const lineTarget = new URL(
          buildInAppExternalBrowserUrl(
            'https://dongtanview.com/guide/dongtan-1-vs-2-comparison',
            lineIosEnv,
            ['동탄역롯데캐슬']
          )!
        );
        expect(lineTarget.searchParams.get('openExternalBrowser')).toBe('1');
        expect(lineTarget.searchParams.get(INAPP_FAVORITES_HANDOFF_PARAM)).toBe('동탄역롯데캐슬');

        // UA containing "CommandLine" without "Line/" must NOT falsely trigger InAppBrowserBypass
        Object.defineProperty(window.navigator, 'userAgent', {
          value: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/124.0 CommandLineMode',
          configurable: true,
        });
        const { unmount: unmountFalseLine } = render(<InAppBrowserBypass />);
        expect(screen.queryByTestId('inapp-slim-banner')).toBeNull();
        unmountFalseLine();

        // iPadOS 13+ desktop-class UA inside KakaoTalk renders InAppBrowserBypass with Safari 열기 button
        Object.defineProperty(window.navigator, 'userAgent', {
          value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) KAKAOTALK 10.6.0',
          configurable: true,
        });
        Object.defineProperty(window.navigator, 'maxTouchPoints', {
          value: 5,
          configurable: true,
        });
        const { unmount: unmountIpadKakao } = render(<InAppBrowserBypass />);
        expect(screen.getByTestId('inapp-open-external-btn')).toHaveTextContent('Safari 열기');
        unmountIpadKakao();

        // 5. Safari Private Mode / restricted WebView (localStorage.setItem throws) retains volatile session favorites
        window.localStorage.clear();
        const setItemSpy = jest
          .spyOn(Storage.prototype, 'setItem')
          .mockImplementation(() => {
            throw new DOMException('QuotaExceededError', 'QuotaExceededError');
          });
        try {
          window.history.replaceState(
            null,
            '',
            '/guide/dongtan-1-vs-2-comparison?dview_fav=%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC'
          );
          const privateReceipt = consumeInboundGuestFavoritesFromUrl();
          expect(privateReceipt.restoredSlugs).toEqual(['동탄역롯데캐슬']);
          expect(readSanitizedGuestFavorites()).toEqual(['동탄역롯데캐슬']);
          expect(ensureGuestFavoriteSaved('더샵센트럴시티')).toBe(true);
          expect(readSanitizedGuestFavorites()).toEqual(['동탄역롯데캐슬', '더샵센트럴시티']);
        } finally {
          setItemSpy.mockRestore();
        }
        // Once localStorage is writable & empty again, volatile fallback clears cleanly with zero leakage
        expect(readSanitizedGuestFavorites()).toEqual([]);
      } finally {
        Object.defineProperty(window.navigator, 'userAgent', {
          value: origUa,
          configurable: true,
        });
        if (origMaxTouch) {
          Object.defineProperty(window.navigator, 'maxTouchPoints', origMaxTouch);
        }
        window.history.replaceState(null, '', '/');
      }
    });
  });
});

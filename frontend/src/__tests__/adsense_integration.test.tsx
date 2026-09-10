/**
 * @file adsense_integration.test.tsx
 * @description Comprehensive Integration Test Suite for Google AdSense & Responsive Ad Slots (Milestone 3):
 * 1. Root Layout & Environment Contract Verification (preconnect, dns-prefetch, conditional Script, .env.example)
 * 2. MBTI Result View AdSense Banner Placement (#mbti-result-ad-container, Zero-CLS min-h-[250px], minimal fallback)
 * 3. Apartment Detail Modal AdSense Placement (Zero-CLS min-h-[250px] banner above Kakao Share CTA)
 * 4. LoungeFeedClient In-Feed Stream Placement (embedded between feed items, Zero-CLS min-h-[140px] sm:min-h-[160px])
 * 5. Error & Double-Push Resilience (graceful catch on adsbygoogle.push exceptions, SPA lifecycle protection)
 */

import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { MBTIResultView } from '@/components/mbti/MBTIResultView';
import { MBTI_PROFILES } from '@/lib/data/mbtiData';
import LoungeFeedClient from '@/components/LoungeFeedClient';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import { AdSlot } from '@/components/ads/AdSlot';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';
import { logger } from '@/lib/services/logger';
import type { FieldReportData } from '@/lib/DashboardFacade';

// --- Mocks Setup ---

// Mock logger
jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Recharts ResponsiveContainer to prevent width/height 0 in jsdom
jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-responsive-container" style={{ width: 400, height: 300 }}>
        {children}
      </div>
    ),
  };
});

// Mock settings context
jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
  }),
}));

// Mock Auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    requestLogin: jest.fn(),
  }),
}));

// Mock PWA provider
jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock hooks for ApartmentModal
jest.mock('@/hooks/useApartmentDetails', () => ({
  useApartmentDetails: () => ({
    transactions: [],
    loading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useComments', () => ({
  useComments: () => ({
    commentsData: { 'rep-test-1': [] },
    commentInput: { 'rep-test-1': '' },
    setCommentInput: jest.fn(),
    handleSubmitComment: jest.fn(),
    handleDeleteComment: jest.fn(),
  }),
}));

jest.mock('@/hooks/useSwipeNavigation', () => ({
  useSwipeNavigation: () => ({}),
}));

jest.mock('@/hooks/usePreventElasticBounce', () => ({
  usePreventElasticBounce: jest.fn(),
}));

const mockFeedPosts = Array.from({ length: 7 }, (_, i) => ({
  id: `post-integration-${i + 1}`,
  title: `동탄 소통 및 임장 분석 글 ${i + 1}`,
  author: `동탄주민${i + 1}`,
  category: '임장기',
  views: 20 + i,
  likes: 10 + i,
  commentCount: 3,
  createdAt: '2026-05-10T12:00:00Z',
}));

// Mock swr/infinite for LoungeFeedClient
jest.mock('swr/infinite', () => {
  return jest.fn().mockImplementation(() => ({
    data: [mockFeedPosts],
    error: null,
    size: 1,
    setSize: jest.fn(),
    isValidating: false,
  }));
});

// Mock LoungeDetailClient
jest.mock('@/components/LoungeDetailClient', () => {
  const LoungeDetailClientMock = () => <div>Lounge Detail Mock</div>;
  LoungeDetailClientMock.displayName = 'LoungeDetailClientMock';
  return LoungeDetailClientMock;
});

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

describe('Google AdSense Integration Suite', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Setup modal-root element for React Portals in ApartmentModal
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div');
      modalRoot.setAttribute('id', 'modal-root');
      document.body.appendChild(modalRoot);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
      isAdBlockActive: false,
      isLoading: false,
    });
    delete (window as any).adsbygoogle;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. Root Layout & Environment Contract
  // =========================================================================
  describe('1. Root Layout & Environment Configuration Contract', () => {
    it('verifies src/app/layout.tsx contains preconnect and dns-prefetch resource hints', () => {
      const layoutPath = path.resolve(__dirname, '../app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

      expect(layoutContent).toContain('rel="preconnect" href="https://pagead2.googlesyndication.com"');
      expect(layoutContent).toContain('rel="dns-prefetch" href="https://pagead2.googlesyndication.com"');
    });

    it('verifies src/app/layout.tsx conditionally loads AdSense Script with strategy="afterInteractive"', () => {
      const layoutPath = path.resolve(__dirname, '../app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

      expect(layoutContent).toContain('process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID');
      expect(layoutContent).toContain('id="google-adsense"');
      expect(layoutContent).toContain('strategy="afterInteractive"');
      expect(layoutContent).toContain('crossOrigin="anonymous"');
    });

    it('verifies frontend/.env.example documents NEXT_PUBLIC_ADSENSE_CLIENT_ID with comments', () => {
      const envPath = path.resolve(__dirname, '../../.env.example');
      const envContent = fs.readFileSync(envPath, 'utf-8');

      expect(envContent).toContain('NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX');
      expect(envContent).toContain('Google AdSense');
    });
  });

  // =========================================================================
  // 2. MBTI Result View AdSense Placement
  // =========================================================================
  describe('2. MBTI Result View AdSense Placement (#mbti-result-ad-container)', () => {
    it('mounts banner AdSlot into #mbti-result-ad-container with Zero-CLS min-height', () => {
      render(<MBTIResultView profile={MBTI_PROFILES.ENTJ} />);

      const adContainer = document.getElementById('mbti-result-ad-container');
      expect(adContainer).toBeInTheDocument();

      const adSlot = within(adContainer!).getByTestId('ad-slot-container');
      expect(adSlot).toBeInTheDocument();
      expect(adSlot).toHaveAttribute('data-slot-format', 'banner');
      expect(adSlot.className).toContain('min-h-[250px]');
    });

    it('displays minimal fallback sponsorship text inside MBTI result when ad-blocker is active', () => {
      jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
        isAdBlockActive: true,
        isLoading: false,
      });

      render(<MBTIResultView profile={MBTI_PROFILES.ENTJ} />);

      const adContainer = document.getElementById('mbti-result-ad-container');
      expect(adContainer).toBeInTheDocument();

      const fallback = within(adContainer!).getByTestId('ad-slot-adblock-fallback');
      expect(fallback).toBeInTheDocument();
      expect(within(fallback).getByText(/D-VIEW 스폰서십/)).toBeInTheDocument();
      // Should not contain external link because fallbackType is minimal
      expect(within(fallback).queryByRole('link')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Apartment Detail Modal AdSense Placement
  // =========================================================================
  describe('3. Apartment Detail Modal AdSense Placement', () => {
    const mockReport: FieldReportData = {
      id: 'rep-test-1',
      aptName: '동탄역 롯데캐슬',
      apartmentName: '동탄역 롯데캐슬',
      dong: '오산동',
      summary: '동탄역 초역세권 대장 아파트',
      author: 'D-VIEW',
      date: '2026-05-01',
      locationScore: 98,
      tags: ['역세권', '대단지', 'GTX-A'],
    };

    it('renders banner AdSlot in ApartmentModal above Kakao Share CTA', async () => {
      jest.useFakeTimers();
      await act(async () => {
        render(<ApartmentModal report={mockReport} onClose={jest.fn()} />);
      });

      // Advance timer for modal opening animation (300ms)
      act(() => {
        jest.advanceTimersByTime(400);
      });

      const modalAdSlotWrapper = screen.getByTestId('apartment-modal-ad-slot');
      expect(modalAdSlotWrapper).toBeInTheDocument();

      const adSlotContainer = within(modalAdSlotWrapper).getByTestId('ad-slot-container');
      expect(adSlotContainer).toHaveAttribute('data-slot-format', 'banner');
      expect(adSlotContainer.className).toContain('min-h-[250px]');

      jest.useRealTimers();
    });
  });

  // =========================================================================
  // 4. LoungeFeedClient In-Feed Stream Placement
  // =========================================================================
  describe('4. LoungeFeedClient In-Feed Stream Placement', () => {
    it('inserts in-feed AdSlot every 5 items in LoungeFeedClient', () => {
      render(<LoungeFeedClient initialPosts={mockFeedPosts} currentTab="우리동네 이야기" />);

      const inFeedAdSlots = screen.getAllByTestId('lounge-feed-ad-slot');
      expect(inFeedAdSlots.length).toBeGreaterThanOrEqual(1);

      const firstAdSlot = within(inFeedAdSlots[0]).getByTestId('ad-slot-container');
      expect(firstAdSlot).toHaveAttribute('data-slot-format', 'in-feed');
      expect(firstAdSlot.className).toContain('min-h-[140px]');
      expect(firstAdSlot.className).toContain('sm:min-h-[160px]');
    });
  });

  // =========================================================================
  // 5. Error Resilience & Logging Protection
  // =========================================================================
  describe('5. Error Resilience & Logging Protection', () => {
    it('catches and logs warning if window.adsbygoogle.push throws an exception', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1234567890123456';
      (window as any).adsbygoogle = {
        push: () => {
          throw new Error('AdSense TagError: duplicate push');
        },
      };

      // Should not throw unhandled exception
      expect(() => {
        render(<AdSlot format="banner" testMode={false} />);
      }).not.toThrow();

      // Should have invoked logger.warn
      expect(logger.warn).toHaveBeenCalledWith(
        'AdSlot',
        'AdSense push warning',
        undefined,
        expect.any(Error)
      );
    });
  });
});

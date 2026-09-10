/**
 * @file m3_adslot_zero_cls_stress.challenger.test.tsx
 * @description Adversarial Challenger Stress Harness for AdSlot Component & Zero-CLS Architecture (Milestone 3):
 * 1. Layout Stability & Zero-CLS Matrix: Verify exact bounding box classes across all formats ('in-feed', 'banner', 'horizontal-strip', 'rectangle', 'auto')
 *    and across all component states (Loading Skeleton, Dev Placeholder, AdBlock Fallback, Populated).
 * 2. Double-Push Protection: Stress test simulated route transitions, rapid re-renders (20x), pre-existing data-adsbygoogle-status, and error resilience.
 * 3. AdBlocker Fallback Integrity: Verify promo card variants ('mbti-promo', 'dashboard-promo', 'minimal') and runtime transition without layout collapse.
 * 4. MutationObserver & Lifecycle Safety: Verify skeleton dismissal upon attribute change and clean unmount observer teardown.
 */

import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { AdSlot, getAdSlotMinHeightClass, AdSlotProps } from '@/components/ads/AdSlot';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';
import { logger } from '@/lib/services/logger';

// Mock logger
jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Milestone 3 Empirical Challenger: AdSlot Stress & Zero-CLS Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Default: ad-blocker inactive, test environment
    jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
      isAdBlockActive: false,
      isLoading: false,
    });
    delete (window as any).adsbygoogle;
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. Zero-CLS Bounding Box Matrix Across All Formats & States
  // =========================================================================
  describe('1. Zero-CLS Bounding Box Invariants Matrix', () => {
    const formats: Array<{
      format: AdSlotProps['format'];
      expectedClasses: string[];
      description: string;
    }> = [
      {
        format: 'in-feed',
        expectedClasses: ['min-h-[140px]', 'sm:min-h-[160px]'],
        description: 'In-Feed Feed stream format',
      },
      {
        format: 'banner',
        expectedClasses: ['min-h-[250px]'],
        description: 'Banner format (MBTI & Modal)',
      },
      {
        format: 'horizontal-strip',
        expectedClasses: ['min-h-[90px]', 'sm:min-h-[100px]'],
        description: 'Horizontal-strip format (Header/Footer bars)',
      },
      {
        format: 'rectangle',
        expectedClasses: ['min-h-[250px]'],
        description: 'Medium rectangle format',
      },
      {
        format: 'auto',
        expectedClasses: ['min-h-[250px]'],
        description: 'Auto responsive format',
      },
      {
        format: undefined,
        expectedClasses: ['min-h-[250px]'],
        description: 'Default unspecified format',
      },
    ];

    describe('1.1. State: Dev Placeholder (testMode=true)', () => {
      formats.forEach(({ format, expectedClasses, description }) => {
        it(`[${description}] preserves constant min-height in dev placeholder state`, () => {
          render(<AdSlot format={format} testMode={true} />);
          const container = screen.getByTestId('ad-slot-container');
          expect(container).toBeInTheDocument();
          expectedClasses.forEach((cls) => {
            expect(container.className).toContain(cls);
          });

          const placeholder = screen.getByTestId('ad-slot-dev-placeholder');
          expect(placeholder).toBeInTheDocument();
          expectedClasses.forEach((cls) => {
            expect(placeholder.className).toContain(cls);
          });
        });
      });
    });

    describe('1.2. State: AdBlock Fallback (mbti-promo, dashboard-promo, minimal)', () => {
      formats.forEach(({ format, expectedClasses, description }) => {
        it(`[${description}] preserves constant min-height in AdBlock fallback state`, () => {
          jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
            isAdBlockActive: true,
            isLoading: false,
          });

          render(<AdSlot format={format} fallbackType="mbti-promo" />);
          const container = screen.getByTestId('ad-slot-container');
          expect(container).toBeInTheDocument();
          expectedClasses.forEach((cls) => {
            expect(container.className).toContain(cls);
          });

          const fallback = screen.getByTestId('ad-slot-adblock-fallback');
          expect(fallback).toBeInTheDocument();
          expectedClasses.forEach((cls) => {
            expect(fallback.className).toContain(cls);
          });
        });
      });
    });

    describe('1.3. State: Live Loading (Skeleton Shimmer)', () => {
      formats.forEach(({ format, expectedClasses, description }) => {
        it(`[${description}] preserves constant min-height during live loading skeleton state`, () => {
          process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1111222233334444';
          (window as any).adsbygoogle = [];

          render(<AdSlot format={format} testMode={false} />);
          const container = screen.getByTestId('ad-slot-container');
          expect(container).toBeInTheDocument();
          expectedClasses.forEach((cls) => {
            expect(container.className).toContain(cls);
          });

          const skeleton = screen.getByTestId('ad-slot-skeleton');
          expect(skeleton).toBeInTheDocument();
        });
      });
    });

    describe('1.4. State: Populated (Live Ad Injected & Skeleton Dismissed)', () => {
      formats.forEach(({ format, expectedClasses, description }) => {
        it(`[${description}] preserves constant min-height when ad is populated`, () => {
          process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1111222233334444';
          (window as any).adsbygoogle = [];

          render(<AdSlot format={format} testMode={false} />);
          const container = screen.getByTestId('ad-slot-container');
          const insElement = document.querySelector('ins.adsbygoogle');
          expect(insElement).toBeInTheDocument();

          // Simulate Google AdSense completing the insertion
          act(() => {
            insElement?.setAttribute('data-adsbygoogle-status', 'done');
          });

          // Verify container STILL has the exact same min-height classes
          expectedClasses.forEach((cls) => {
            expect(container.className).toContain(cls);
          });
        });
      });
    });
  });

  // =========================================================================
  // 2. Stress-Testing Double-Push Protection & SPA Router Resilience
  // =========================================================================
  describe('2. Double-Push Protection & SPA Router Resilience', () => {
    it('survives 20 rapid re-renders of the same AdSlot instance with exactly ONE adsbygoogle.push', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-5555666677778888';
      const pushMock = jest.fn();
      (window as any).adsbygoogle = { push: pushMock };

      const { rerender } = render(<AdSlot format="banner" slotId="rapid-slot-1" testMode={false} />);
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Perform 20 rapid re-renders with varying or identical props
      for (let i = 0; i < 20; i++) {
        rerender(
          <AdSlot
            format="banner"
            slotId="rapid-slot-1"
            className={`rerender-pass-${i}`}
            testMode={false}
          />
        );
      }

      // Must remain exactly 1 call
      expect(pushMock).toHaveBeenCalledTimes(1);
    });

    it('does NOT call adsbygoogle.push if <ins> already has data-adsbygoogle-status attribute', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-5555666677778888';
      const pushMock = jest.fn();
      (window as any).adsbygoogle = { push: pushMock };

      // Mock ins element creation to test pre-existing attribute
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: any) => {
        const el = originalCreateElement(tagName, options);
        if (tagName.toLowerCase() === 'ins') {
          el.setAttribute('data-adsbygoogle-status', 'done');
        }
        return el;
      });

      render(<AdSlot format="in-feed" slotId="pre-existing-attr-slot" testMode={false} />);

      expect(pushMock).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('handles window.adsbygoogle queue when window.adsbygoogle is originally undefined', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1234432112344321';
      delete (window as any).adsbygoogle;

      render(<AdSlot format="banner" slotId="undef-win-slot" testMode={false} />);

      expect(Array.isArray((window as any).adsbygoogle)).toBe(true);
      expect((window as any).adsbygoogle).toHaveLength(1);
      expect((window as any).adsbygoogle[0]).toEqual({});
    });

    it('recovers gracefully when window.adsbygoogle is a weird non-array non-function object', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1234432112344321';
      (window as any).adsbygoogle = { corrupted: true };

      expect(() => {
        render(<AdSlot format="banner" slotId="corrupted-obj-slot" testMode={false} />);
      }).not.toThrow();

      expect(Array.isArray((window as any).adsbygoogle)).toBe(true);
      expect((window as any).adsbygoogle[0]).toEqual({});
    });

    it('catches and logs TagError without crashing the React component tree when push throws', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1234432112344321';
      (window as any).adsbygoogle = {
        push: () => {
          throw new Error("TagError: adsbygoogle.push() error: All 'ins' elements in the DOM already have ads");
        },
      };

      expect(() => {
        render(<AdSlot format="banner" slotId="tag-error-slot" testMode={false} />);
      }).not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        'AdSlot',
        'AdSense push warning',
        undefined,
        expect.any(Error)
      );
      // Outer container should still render intact
      expect(screen.getByTestId('ad-slot-container')).toBeInTheDocument();
    });

    it('simulates SPA page transition: unmounting page A and mounting page B creates independent push calls', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-9999888877776666';
      const pushMock = jest.fn();
      (window as any).adsbygoogle = { push: pushMock };

      // Mount on Page A (Feed)
      const { unmount: unmountA } = render(<AdSlot format="in-feed" slotId="feed-ad-1" testMode={false} />);
      expect(pushMock).toHaveBeenCalledTimes(1);

      // User navigates away -> Page A unmounts
      unmountA();

      // User navigates to Page B (MBTI Result) -> New AdSlot mounts
      const { unmount: unmountB } = render(<AdSlot format="banner" slotId="mbti-ad-1" testMode={false} />);
      expect(pushMock).toHaveBeenCalledTimes(2);

      unmountB();
    });
  });

  // =========================================================================
  // 3. AdBlocker Fallback Variant & Dynamic Toggle Stress
  // =========================================================================
  describe('3. AdBlocker Fallback Variants & Transition Stress', () => {
    it('renders mbti-promo with correct link, headline, and badges', () => {
      jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
        isAdBlockActive: true,
        isLoading: false,
      });

      render(<AdSlot format="banner" fallbackType="mbti-promo" />);
      const fallback = screen.getByTestId('ad-slot-adblock-fallback');
      expect(fallback).toBeInTheDocument();

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/mbti');
      expect(screen.getByText(/주거 MBTI 테스트 하러가기/)).toBeInTheDocument();
      expect(screen.getByText(/7가지 라이프스타일 질문으로 알아보는 16가지 동탄 아파트 매칭/)).toBeInTheDocument();
    });

    it('renders dashboard-promo with correct link, headline, and badges', () => {
      jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
        isAdBlockActive: true,
        isLoading: false,
      });

      render(<AdSlot format="in-feed" fallbackType="dashboard-promo" />);
      const fallback = screen.getByTestId('ad-slot-adblock-fallback');
      expect(fallback).toBeInTheDocument();

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/overview');
      expect(screen.getByText(/동탄 호수공원 & 대장 단지 실거래가 트렌드 확인하기/)).toBeInTheDocument();
      expect(screen.getByText(/179개 전 단지의 실거래가와 전세가율 데이터를 확인해보세요/)).toBeInTheDocument();
    });

    it('renders minimal fallback without any interactive links', () => {
      jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
        isAdBlockActive: true,
        isLoading: false,
      });

      render(<AdSlot format="horizontal-strip" fallbackType="minimal" />);
      const fallback = screen.getByTestId('ad-slot-adblock-fallback');
      expect(fallback).toBeInTheDocument();

      expect(screen.getByText(/D-VIEW 스폰서십 \| 쾌적한 주거 데이터 분석 경험을 제공합니다/)).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('handles dynamic adblock status transition seamlessly without layout shifts', () => {
      let adBlockActive = false;
      jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockImplementation(() => ({
        isAdBlockActive: adBlockActive,
        isLoading: false,
      }));
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-3333444455556666';
      (window as any).adsbygoogle = [];

      const { rerender } = render(<AdSlot format="banner" fallbackType="mbti-promo" testMode={false} />);
      const container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[250px]');
      expect(screen.getByTestId('ad-slot-skeleton')).toBeInTheDocument();

      // Dynamic switch: AdBlocker engages
      adBlockActive = true;
      rerender(<AdSlot format="banner" fallbackType="mbti-promo" testMode={false} />);

      expect(screen.getByTestId('ad-slot-adblock-fallback')).toBeInTheDocument();
      expect(container.className).toContain('min-h-[250px]');
      expect(screen.queryByTestId('ad-slot-skeleton')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. MutationObserver & Ad Status Lifecycle
  // =========================================================================
  describe('4. MutationObserver & Skeleton Lifecycle', () => {
    it('dismisses skeleton shimmer when data-adsbygoogle-status is mutated to "done"', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-7777888899990000';
      (window as any).adsbygoogle = [];

      render(<AdSlot format="banner" testMode={false} />);
      expect(screen.getByTestId('ad-slot-skeleton')).toBeInTheDocument();

      const ins = document.querySelector('ins.adsbygoogle');
      expect(ins).toBeInTheDocument();

      await act(async () => {
        ins?.setAttribute('data-adsbygoogle-status', 'done');
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.queryByTestId('ad-slot-skeleton')).not.toBeInTheDocument();
    });

    it('dismisses skeleton shimmer when data-ad-status is mutated to "filled"', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-7777888899990000';
      (window as any).adsbygoogle = [];

      render(<AdSlot format="banner" testMode={false} />);
      expect(screen.getByTestId('ad-slot-skeleton')).toBeInTheDocument();

      const ins = document.querySelector('ins.adsbygoogle');
      expect(ins).toBeInTheDocument();

      await act(async () => {
        ins?.setAttribute('data-ad-status', 'filled');
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.queryByTestId('ad-slot-skeleton')).not.toBeInTheDocument();
    });

    it('dismisses skeleton shimmer when data-ad-status is mutated to "unfilled"', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-7777888899990000';
      (window as any).adsbygoogle = [];

      render(<AdSlot format="banner" testMode={false} />);
      expect(screen.getByTestId('ad-slot-skeleton')).toBeInTheDocument();

      const ins = document.querySelector('ins.adsbygoogle');
      expect(ins).toBeInTheDocument();

      await act(async () => {
        ins?.setAttribute('data-ad-status', 'unfilled');
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(screen.queryByTestId('ad-slot-skeleton')).not.toBeInTheDocument();
    });

    it('cleans up MutationObserver on unmount without throwing errors', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-7777888899990000';
      (window as any).adsbygoogle = [];

      const { unmount } = render(<AdSlot format="banner" testMode={false} />);
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});

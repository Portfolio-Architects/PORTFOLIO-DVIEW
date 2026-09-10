import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdSlot, getAdSlotMinHeightClass } from './AdSlot';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';

// Mock logger to suppress warnings during testing
jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AdSlot Component', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Default: adblock is inactive
    jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
      isAdBlockActive: false,
      isLoading: false,
    });
    // Reset window.adsbygoogle
    delete (window as any).adsbygoogle;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Fixed Min-Height Boundaries (Zero-CLS Guarantee)', () => {
    it('returns correct min-height classes via getAdSlotMinHeightClass helper', () => {
      expect(getAdSlotMinHeightClass('in-feed')).toBe('min-h-[140px] sm:min-h-[160px]');
      expect(getAdSlotMinHeightClass('banner')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('rectangle')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('horizontal-strip')).toBe('min-h-[90px] sm:min-h-[100px]');
      expect(getAdSlotMinHeightClass('auto')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass(undefined)).toBe('min-h-[250px]');
    });

    it('applies in-feed min-height classes to container', () => {
      render(<AdSlot format="in-feed" testMode={true} />);
      const container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[140px]');
      expect(container.className).toContain('sm:min-h-[160px]');
    });

    it('applies banner min-height classes to container', () => {
      render(<AdSlot format="banner" testMode={true} />);
      const container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[250px]');
    });

    it('applies horizontal-strip min-height classes to container', () => {
      render(<AdSlot format="horizontal-strip" testMode={true} />);
      const container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[90px]');
      expect(container.className).toContain('sm:min-h-[100px]');
    });
  });

  describe('2. Fallback when Client ID is Missing', () => {
    it('renders clean dev placeholder when NEXT_PUBLIC_ADSENSE_CLIENT_ID is not set', () => {
      delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

      render(<AdSlot format="banner" slotId="test-slot-123" />);

      expect(screen.getByTestId('ad-slot-dev-placeholder')).toBeInTheDocument();
      expect(screen.getByText(/광고 슬롯 미리보기/)).toBeInTheDocument();
      expect(
        screen.getByText(/NEXT_PUBLIC_ADSENSE_CLIENT_ID 환경변수가 설정되면 실광고가 송출됩니다/)
      ).toBeInTheDocument();
      expect(screen.getByText(/test-slot-123/)).toBeInTheDocument();
      expect(screen.getByText('banner')).toBeInTheDocument();
    });
  });

  describe('3. testMode Rendering', () => {
    it('renders placeholder card when testMode is true even with valid client ID', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1234567890123456';

      render(<AdSlot format="in-feed" testMode={true} slotId="custom-slot-456" />);

      expect(screen.getByTestId('ad-slot-dev-placeholder')).toBeInTheDocument();
      expect(screen.getByText('in-feed')).toBeInTheDocument();
      expect(screen.getByText(/custom-slot-456/)).toBeInTheDocument();
      // Ensure adsbygoogle push was not called
      expect((window as any).adsbygoogle).toBeUndefined();
    });
  });

  describe('4. Ad-Blocker Detection Fallback Integration', () => {
    beforeEach(() => {
      jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
        isAdBlockActive: true,
        isLoading: false,
      });
    });

    it('renders MBTI quiz promotion by default when ad-blocker is active', () => {
      render(<AdSlot format="banner" fallbackType="mbti-promo" />);

      expect(screen.getByTestId('ad-slot-adblock-fallback')).toBeInTheDocument();
      expect(screen.getByText(/주거 MBTI 테스트 하러가기/)).toBeInTheDocument();
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/mbti');
    });

    it('renders dashboard trend promotion when fallbackType="dashboard-promo"', () => {
      render(<AdSlot format="banner" fallbackType="dashboard-promo" />);

      expect(screen.getByTestId('ad-slot-adblock-fallback')).toBeInTheDocument();
      expect(screen.getByText(/동탄 호수공원 & 대장 단지 실거래가 트렌드 확인하기/)).toBeInTheDocument();
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/overview');
    });

    it('renders minimal non-intrusive sponsorship text when fallbackType="minimal"', () => {
      render(<AdSlot format="banner" fallbackType="minimal" />);

      expect(screen.getByTestId('ad-slot-adblock-fallback')).toBeInTheDocument();
      expect(screen.getByText(/D-VIEW 스폰서십 \| 쾌적한 주거 데이터 분석 경험을 제공합니다/)).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('5. Live AdSense Slot & Next.js SPA Double-Push Safety', () => {
    it('renders <ins className="adsbygoogle"> and triggers push once when client ID is provided', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-9999999999999999';
      const pushMock = jest.fn();
      (window as any).adsbygoogle = { push: pushMock };

      const { rerender } = render(<AdSlot format="banner" slotId="live-slot-789" testMode={false} />);

      const insElement = document.querySelector('ins.adsbygoogle');
      expect(insElement).toBeInTheDocument();
      expect(insElement).toHaveAttribute('data-ad-client', 'ca-pub-9999999999999999');
      expect(insElement).toHaveAttribute('data-ad-slot', 'live-slot-789');

      // Check adsbygoogle.push was called once
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Skeleton shimmer should be present initially
      expect(screen.getByTestId('ad-slot-skeleton')).toBeInTheDocument();

      // Rerender should NOT call push again (SPA double-push protection)
      rerender(<AdSlot format="banner" slotId="live-slot-789" testMode={false} />);
      expect(pushMock).toHaveBeenCalledTimes(1);
    });

    it('handles window.adsbygoogle as an array correctly', () => {
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-8888888888888888';
      (window as any).adsbygoogle = [];

      render(<AdSlot format="in-feed" slotId="array-slot-101" testMode={false} />);

      expect((window as any).adsbygoogle.length).toBe(1);
      expect((window as any).adsbygoogle[0]).toEqual({});
    });
  });
});

/**
 * @file m3_cpa_unified_fallback_and_route_inventory.test.tsx
 * @description Milestone M3 Verification Suite:
 * 1. AdBlock & Unfilled Unified High-CPC CPA Fallback Card & Telemetry Beacons
 * 2. Route Inventory Expansion (/explore and /news Zero-CLS AdSlot placement)
 * 3. SSR aria-hidden="true" Cloaking Elimination & Semantic Tag Restoration
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdSlot } from '@/components/ads/AdSlot';
import { AdSlotAdBlockView } from '@/components/ads/views/AdSlotAdBlockView';
import { CPA_CAMPAIGN_CATALOG, resolveNativeCpaFallbackPayload } from '@/lib/ads/cascadeFallback';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';
import * as telemetryModule from '@/lib/ads/cascadeFallback';

// Mock logger
jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Milestone M3: Unified High-CPC CPA Fallback & Route Inventory Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. AdBlock / Unfilled Unified High-CPC CPA Card Structure', () => {
    beforeEach(() => {
      jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
        isAdBlockActive: true,
        isLoading: false,
      });
    });

    it('renders High-CPC CPA card with data-testid="ad-slot-adblock-fallback", cpa attributes, and anchor CTA', () => {
      render(
        <AdSlot
          slotId="1000000001"
          format="in-feed"
          cpaCampaignId="mortgage-refinance"
          apartmentName="동탄역롯데캐슬"
          dong="오산동"
        />
      );

      const fallback = screen.getByTestId('ad-slot-adblock-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveAttribute('data-cpa-campaign-id', 'mortgage-refinance');
      expect(fallback).toHaveAttribute('data-source-trigger', 'ADBLOCK_ACTIVE');
      expect(fallback).toHaveAttribute('data-estimated-cpa-won', '35000');

      const ctaLink = screen.getByTestId('ad-slot-adblock-cta');
      expect(ctaLink).toBeInTheDocument();
      expect(ctaLink).toHaveAttribute('href');
      expect(ctaLink.getAttribute('href')).toContain('dongtanview.com');
      expect(screen.getByText(/주담대 갈아타기 최저금리/)).toBeInTheDocument();
      expect(screen.getByText(/D-VIEW 금융 브리핑/)).toBeInTheDocument();
      expect(screen.getByText(/최저금리 한도 조회/)).toBeInTheDocument();
    });

    it('preserves minimal fallback when fallbackType="minimal" is explicitly requested', () => {
      render(
        <AdSlot
          slotId="1000000001"
          format="horizontal-strip"
          fallbackType="minimal"
        />
      );

      const fallback = screen.getByTestId('ad-slot-adblock-fallback');
      expect(fallback).toBeInTheDocument();
      expect(screen.getByText(/D-VIEW 스폰서십 \| 쾌적한 주거 데이터 분석 경험을 제공합니다/)).toBeInTheDocument();
      expect(screen.queryByTestId('ad-slot-adblock-cta')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('transmits FALLBACK_CLICK telemetry when adblock CTA anchor is clicked', () => {
      const sendTelemetrySpy = jest.spyOn(telemetryModule, 'sendTelemetry');

      render(
        <AdSlot
          slotId="1000000001"
          format="in-feed"
          cpaCampaignId="jeonse-sentinel"
          apartmentName="동탄린스트라우스더레이크"
          dong="송동"
        />
      );

      const ctaLink = screen.getByTestId('ad-slot-adblock-cta');
      act(() => {
        fireEvent.click(ctaLink);
      });

      expect(sendTelemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          slotId: '1000000001',
          eventType: 'FALLBACK_CLICK',
          campaignId: 'jeonse-sentinel',
          apartmentName: '동탄린스트라우스더레이크',
          dong: '송동',
        })
      );
    });
  });

  describe('2. Direct AdSlotAdBlockView Component Isolated Contract', () => {
    it('renders pure view with proper styling and tone classes for corporate-relocation (blue)', () => {
      const payload = resolveNativeCpaFallbackPayload({
        slotId: '1000000001',
        sourceTrigger: 'ADBLOCK_ACTIVE',
        cpaCampaignId: 'corporate-relocation',
      });
      const template = CPA_CAMPAIGN_CATALOG['corporate-relocation'];
      const clickMock = jest.fn();

      const { container } = render(
        <AdSlotAdBlockView
          fallbackType="cpa"
          cpaPayload={payload}
          cpaTemplate={template}
          minHeightClass="min-h-[140px] sm:min-h-[160px]"
          onAdBlockFallbackClick={clickMock}
        />
      );

      expect(screen.getByTestId('ad-slot-adblock-fallback')).toBeInTheDocument();
      const ctaLink = screen.getByTestId('ad-slot-adblock-cta');
      expect(ctaLink).toBeInTheDocument();
      expect(ctaLink).toHaveAttribute('href', payload.targetUrl);

      act(() => {
        fireEvent.click(ctaLink);
      });
      expect(clickMock).toHaveBeenCalledTimes(1);

      // Verify zero unicode emojis inside container
      const textContent = container.textContent || '';
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(textContent)).toBe(false);
    });
  });

  describe('3. Route Inventory Expansion Contract (/explore and /news)', () => {
    it('verifies /explore route source includes Zero-CLS in-feed AdSlot with slotId 1000000001 and jeonse-sentinel campaign', () => {
      const exploreContent = fs.readFileSync(
        path.resolve(__dirname, '../app/explore/ExploreClient.tsx'),
        'utf8'
      );

      expect(exploreContent).toContain('slotId="1000000001"');
      expect(exploreContent).toContain('format="in-feed"');
      expect(exploreContent).toContain('cpaCampaignId="jeonse-sentinel"');
      expect(exploreContent).toContain('min-h-[140px] sm:min-h-[160px]');
    });

    it('verifies /news route source includes Zero-CLS in-feed AdSlot with slotId 1000000001 in feed', () => {
      const newsContent = fs.readFileSync(
        path.resolve(__dirname, '../app/news/NewsClient.tsx'),
        'utf8'
      );

      expect(newsContent).toContain('slotId="1000000001"');
      expect(newsContent).toContain('format="in-feed"');
      expect(newsContent).toContain('min-h-[140px] sm:min-h-[160px]');
    });
  });

  describe('4. SSR Semantic Restoration Contract (aria-hidden cloaking removal)', () => {
    it('verifies explore/page.tsx has no aria-hidden cloaking on semantic catalog section', () => {
      const pageContent = fs.readFileSync(
        path.resolve(__dirname, '../app/explore/page.tsx'),
        'utf8'
      );

      expect(pageContent).toContain('id="explore-ssr-semantic-catalog"');
      expect(pageContent).toContain('aria-label="동탄 전역 아파트 실거래가 및 입지 가치 비교 카탈로그"');
      expect(pageContent).not.toMatch(/id="explore-ssr-semantic-catalog"[^>]*aria-hidden/);
      expect(pageContent).not.toMatch(/aria-hidden="true"[^>]*id="explore-ssr-semantic-catalog"/);
    });

    it('verifies overview/page.tsx has no aria-hidden cloaking on semantic catalog section', () => {
      const pageContent = fs.readFileSync(
        path.resolve(__dirname, '../app/overview/page.tsx'),
        'utf8'
      );

      expect(pageContent).toContain('id="overview-ssr-semantic-catalog"');
      expect(pageContent).toContain('aria-label="동탄 대장 아파트 랭킹 및 최신 실거래 내역"');
      expect(pageContent).not.toMatch(/id="overview-ssr-semantic-catalog"[^>]*aria-hidden/);
      expect(pageContent).not.toMatch(/aria-hidden="true"[^>]*id="overview-ssr-semantic-catalog"/);
    });
  });
});

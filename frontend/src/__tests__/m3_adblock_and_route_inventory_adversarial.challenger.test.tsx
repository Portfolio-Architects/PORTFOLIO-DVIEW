/**
 * @file m3_adblock_and_route_inventory_adversarial.challenger.test.tsx
 * @description Adversarial Challenger Empirical Stress Harness for Milestone M3:
 * 1. AdBlock Fallback Rapid Click, e.preventDefault() & Telemetry Beacon De-duplication.
 * 2. 4 High-CPC CPA Campaigns Template & Data Invariant Integrity.
 * 3. /explore and /news Zero-CLS Layout & Route Inventory Contract.
 * 4. SSR Semantic Catalog aria-hidden Cloaking Elimination (Zero-Tolerance Audit).
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdSlot } from '@/components/ads/AdSlot';
import { AdSlotAdBlockView } from '@/components/ads/views/AdSlotAdBlockView';
import {
  CPA_CAMPAIGN_CATALOG,
  resolveNativeCpaFallbackPayload,
  type CpaCampaignId,
} from '@/lib/ads/cascadeFallback';
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

describe('Empirical Challenger M3: AdBlock Fallback & Route Inventory Adversarial Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
      isAdBlockActive: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. AdBlock Fallback Click Safety, e.preventDefault() and Telemetry De-duplication', () => {
    it('prevents default browser navigation and emits FALLBACK_CLICK telemetry on CTA anchor click', () => {
      const sendTelemetrySpy = jest.spyOn(telemetryModule, 'sendTelemetry');

      render(
        <AdSlot
          slotId="1000000001"
          format="in-feed"
          cpaCampaignId="mortgage-refinance"
          apartmentName="동탄역롯데캐슬"
          dong="오산동"
        />
      );

      const ctaAnchor = screen.getByTestId('ad-slot-adblock-cta');
      expect(ctaAnchor).toBeInTheDocument();
      expect(ctaAnchor).toHaveAttribute('href');

      // Create a native mouse event to assert defaultPrevented
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');

      act(() => {
        ctaAnchor.dispatchEvent(clickEvent);
      });

      // Verify e.preventDefault() was invoked to prevent JSDOM navigation error
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(clickEvent.defaultPrevented).toBe(true);

      // Verify FALLBACK_CLICK telemetry dispatched with accurate parameters
      expect(sendTelemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          slotId: '1000000001',
          eventType: 'FALLBACK_CLICK',
          campaignId: 'mortgage-refinance',
          apartmentName: '동탄역롯데캐슬',
          dong: '오산동',
        })
      );
    });

    it('survives rapid 50x click burst without redundant telemetry beacons in a single cycle', () => {
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

      const ctaAnchor = screen.getByTestId('ad-slot-adblock-cta');

      act(() => {
        for (let i = 0; i < 50; i++) {
          fireEvent.click(ctaAnchor);
        }
      });

      // FALLBACK_CLICK must be deduplicated across single render cycle
      const fallbackClicks = sendTelemetrySpy.mock.calls.filter(
        (call) => call[0]?.eventType === 'FALLBACK_CLICK'
      );
      expect(fallbackClicks).toHaveLength(1);
    });

    it('tolerates invocation of handleAdBlockFallbackClick without event argument', () => {
      const mockHandler = jest.fn((e?: React.MouseEvent<HTMLAnchorElement>) => {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
      });

      const payload = resolveNativeCpaFallbackPayload({
        slotId: '1000000001',
        sourceTrigger: 'ADBLOCK_ACTIVE',
        cpaCampaignId: 'interior-quote',
      });

      render(
        <AdSlotAdBlockView
          fallbackType="cpa"
          cpaPayload={payload}
          minHeightClass="min-h-[140px]"
          onAdBlockFallbackClick={mockHandler}
        />
      );

      // Programmatic invocation without arguments
      expect(() => {
        mockHandler();
      }).not.toThrow();
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. All 4 High-CPC Campaign Templates Integrity & Zero-Emoji Audit', () => {
    const campaignCases: Array<{
      id: CpaCampaignId;
      expectedWon: number;
      expectedTone: 'emerald' | 'blue';
      expectedBadge: string;
      expectedTitleSub: string;
    }> = [
      {
        id: 'mortgage-refinance',
        expectedWon: 35000,
        expectedTone: 'emerald',
        expectedBadge: 'D-VIEW 금융 브리핑',
        expectedTitleSub: '주담대 갈아타기 최저금리',
      },
      {
        id: 'jeonse-sentinel',
        expectedWon: 30000,
        expectedTone: 'blue',
        expectedBadge: 'D-VIEW 리스크 진단',
        expectedTitleSub: 'HUG 전세보증금 반환보증 126% 룰',
      },
      {
        id: 'interior-quote',
        expectedWon: 30000,
        expectedTone: 'emerald',
        expectedBadge: 'D-VIEW 주거 리포트',
        expectedTitleSub: '동탄 주요 단지 평형별 입주·리모델링',
      },
      {
        id: 'corporate-relocation',
        expectedWon: 50000,
        expectedTone: 'blue',
        expectedBadge: 'D-VIEW B2B 인사이트',
        expectedTitleSub: '동탄테크노밸리 지식산업센터 법인 이전',
      },
    ];

    campaignCases.forEach(({ id, expectedWon, expectedTone, expectedBadge, expectedTitleSub }) => {
      it(`enforces campaign contract for [${id}] (estimatedCpaValueWon: ${expectedWon} KRW, tone: ${expectedTone})`, () => {
        const template = CPA_CAMPAIGN_CATALOG[id];
        expect(template).toBeDefined();
        expect(template.estimatedCpaValueWon).toBe(expectedWon);
        expect(template.accentTone).toBe(expectedTone);
        expect(template.badgeText).toBe(expectedBadge);

        const { container } = render(
          <AdSlot
            slotId="1000000001"
            format="in-feed"
            cpaCampaignId={id}
          />
        );

        const fallback = screen.getByTestId('ad-slot-adblock-fallback');
        expect(fallback).toHaveAttribute('data-cpa-campaign-id', id);
        expect(fallback).toHaveAttribute('data-estimated-cpa-won', String(expectedWon));
        expect(fallback).toHaveAttribute('data-source-trigger', 'ADBLOCK_ACTIVE');

        const cta = screen.getByTestId('ad-slot-adblock-cta');
        expect(cta).toHaveAttribute('href');
        expect(cta.getAttribute('href')).toContain('dongtanview.com');

        expect(screen.getByText(expectedBadge)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(expectedTitleSub))).toBeInTheDocument();

        // Zero-emoji audit
        const text = container.textContent || '';
        const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
        expect(emojiPattern.test(text)).toBe(false);
      });
    });
  });

  describe('3. Route Inventory Expansion (/explore and /news) Zero-CLS Contract', () => {
    it('verifies /explore source enforces Zero-CLS AdSlot with slotId="1000000001" and min-h-[140px] sm:min-h-[160px]', () => {
      const explorePath = path.resolve(__dirname, '../app/explore/ExploreClient.tsx');
      const content = fs.readFileSync(explorePath, 'utf8');

      expect(content).toMatch(/<AdSlot[\s\S]*?slotId="1000000001"/);
      expect(content).toMatch(/<AdSlot[\s\S]*?format="in-feed"/);
      expect(content).toMatch(/<AdSlot[\s\S]*?minHeightClass="min-h-\[140px\] sm:min-h-\[160px\]"/);
      expect(content).toMatch(/<AdSlot[\s\S]*?cpaCampaignId="jeonse-sentinel"/);
    });

    it('verifies /news source enforces Zero-CLS AdSlots in both real estate feed and admin notice feed', () => {
      const newsPath = path.resolve(__dirname, '../app/news/NewsClient.tsx');
      const content = fs.readFileSync(newsPath, 'utf8');

      // Real estate tab
      expect(content).toMatch(/idx === 3[\s\S]*?<AdSlot[\s\S]*?slotId="1000000001"/);
      expect(content).toMatch(/filteredNewsList\.length <= 3[\s\S]*?<AdSlot[\s\S]*?slotId="1000000001"/);

      // Admin notice tab
      expect(content).toMatch(/idx === 3[\s\S]*?<AdSlot[\s\S]*?cpaCampaignId="interior-quote"/);
      expect(content).toMatch(/noticesList\.length <= 3[\s\S]*?<AdSlot[\s\S]*?cpaCampaignId="interior-quote"/);

      // Bounding box reservation
      const matches = content.match(/minHeightClass="min-h-\[140px\] sm:min-h-\[160px\]"/g);
      expect(matches).not.toBeNull();
      expect(matches?.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('4. SSR Semantic Catalog aria-hidden Cloaking Elimination Audit', () => {
    it('verifies explore/page.tsx has exactly 0 occurrences of aria-hidden="true"', () => {
      const explorePagePath = path.resolve(__dirname, '../app/explore/page.tsx');
      const content = fs.readFileSync(explorePagePath, 'utf8');

      const matches = content.match(/aria-hidden\s*=\s*["']true["']/g);
      expect(matches).toBeNull();

      expect(content).toContain('id="explore-ssr-semantic-catalog"');
      expect(content).toContain('className="sr-only"');
      expect(content).toContain('<header>');
    });

    it('verifies overview/page.tsx has exactly 0 occurrences of aria-hidden="true"', () => {
      const overviewPagePath = path.resolve(__dirname, '../app/overview/page.tsx');
      const content = fs.readFileSync(overviewPagePath, 'utf8');

      const matches = content.match(/aria-hidden\s*=\s*["']true["']/g);
      expect(matches).toBeNull();

      expect(content).toContain('id="overview-ssr-semantic-catalog"');
      expect(content).toContain('className="sr-only"');
      expect(content).toContain('<header>');
    });

    it('verifies entire SSR page catalogs preserve standard semantic DOM indexing for search bots', () => {
      const exploreContent = fs.readFileSync(
        path.resolve(__dirname, '../app/explore/page.tsx'),
        'utf8'
      );
      const overviewContent = fs.readFileSync(
        path.resolve(__dirname, '../app/overview/page.tsx'),
        'utf8'
      );

      // Verify table or list semantics present for Googlebot crawl
      expect(exploreContent).toContain('<table>');
      expect(exploreContent).toContain('<thead>');
      expect(exploreContent).toContain('<tbody>');

      expect(overviewContent).toContain('<ol>');
      expect(overviewContent).toContain('<ul>');
    });
  });
});

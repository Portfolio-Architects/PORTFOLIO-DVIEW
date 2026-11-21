/**
 * @jest-environment jsdom
 *
 * Comprehensive verification suite for D-VIEW AdSense Editorial Fortress & Site-Wide Engagement Upgrade:
 * 1. BudgetTierEngine real-data Stress DSR / LTV calculation, tier classification, and next-unlock delta
 * 2. BalanceMatchupWidget honest 0-vote guard (Strict Real Data Only), voting transition, and share text
 * 3. GuideRealDataChart pure SVG real-data visual comparison & EditorialAuthorBox transparency links
 * 4. HomeEditorialFeatureSection Ad Money v5.1 compliance (zero forbidden fonts/colors/emojis)
 * 5. All 25 guides unified editor identity, storytelling titles, and >= 2,000ch editorial depth
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  evaluateDongtanBudgetTier,
  extractVerifiedComplexCatalog,
  type BudgetTierComplexItem,
} from '@/lib/finance/budgetTierEngine';
import { getSyncTxSummaryMap } from '@/lib/server/syncTxSummary';
import { resolveBalanceMatchups } from '@/lib/data/balanceMatchups';
import { GUIDE_ARTICLES, buildGuideArticleJsonLd } from '@/lib/data/guides';
import BalanceMatchupWidget from '@/components/engagement/BalanceMatchupWidget';
import BudgetTierChallengeWidget from '@/components/engagement/BudgetTierChallengeWidget';
import GuideRealDataChart from '@/components/guide/GuideRealDataChart';
import EditorialAuthorBox from '@/components/guide/EditorialAuthorBox';
import HomeEditorialFeatureSection from '@/components/home/HomeEditorialFeatureSection';

jest.mock('@/lib/utils/analytics', () => ({
  trackEvent: jest.fn(),
  trackVirtualPageView: jest.fn(),
}));

const SAMPLE_CATALOG: BudgetTierComplexItem[] = [
  {
    canonicalSlug: '푸르지오',
    displayName: '석우동 예당 푸르지오',
    dong: '석우동',
    latestPriceManwon: 76000,
    latestPriceStr: '7억 6,000만',
    latestRentManwon: 42000,
    jeonseRatio: 55.3,
    txCount: 1384,
  },
  {
    canonicalSlug: '솔빛마을서해그랑블',
    displayName: '솔빛마을 서해그랑블',
    dong: '반송동',
    latestPriceManwon: 107000,
    latestPriceStr: '10억 7,000만',
    latestRentManwon: 60000,
    jeonseRatio: 56.1,
    txCount: 721,
  },
  {
    canonicalSlug: '동탄역시범우남퍼스트빌아파트',
    displayName: '시범 우남퍼스트빌',
    dong: '청계동',
    latestPriceManwon: 158500,
    latestPriceStr: '15억 8,500만',
    latestRentManwon: 64909,
    jeonseRatio: 41.0,
    txCount: 1051,
  },
  {
    canonicalSlug: '동탄역롯데캐슬',
    displayName: '동탄역 롯데캐슬',
    dong: '여울동',
    latestPriceManwon: 262000,
    latestPriceStr: '26억 2,000만',
    latestRentManwon: 80000,
    jeonseRatio: 30.5,
    txCount: 179,
  },
];

describe('AdSense Editorial Fortress & Site-Wide Engagement Suite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ leftVotes: 0, rightVotes: 0 }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. BudgetTierEngine Real-Data Tier Classification & Next Unlock Math', () => {
    it('extracts verified positive-price MOLIT complexes from live catalog with zero 0-won rentals', () => {
      const catalog = extractVerifiedComplexCatalog(getSyncTxSummaryMap());
      expect(catalog.length).toBeGreaterThanOrEqual(130);
      expect(catalog.every((c) => c.latestPriceManwon > 0)).toBe(true);
    });

    it('computes accurate Stress DSR / LTV limits, affordable count, and next unlock target', () => {
      const diag = evaluateDongtanBudgetTier(
        { cashManwon: 30000, annualIncomeManwon: 10000, isFirstHome: true },
        SAMPLE_CATALOG
      );
      expect(diag.maxBudgetManwon).toBeGreaterThan(80000);
      expect(diag.maxBudgetManwon).toBeLessThan(110000);
      expect(diag.affordableCount).toBe(1);
      expect(diag.topAffordableComplexes[0]?.canonicalSlug).toBe('푸르지오');
      expect(diag.nextUnlockTarget).not.toBeNull();
      expect(diag.nextUnlockTarget?.complex.canonicalSlug).toBe('솔빛마을서해그랑블');
      expect(diag.nextUnlockTarget?.gapManwon).toBe(107000 - diag.maxBudgetManwon);
    });

    it('interactively updates rendered tier diagnosis when sliders change', () => {
      const { getByTestId } = render(
        <BudgetTierChallengeWidget catalog={SAMPLE_CATALOG} surface="test_surface" />
      );
      const cashSlider = getByTestId('budget-tier-cash-slider') as HTMLInputElement;
      const incomeSlider = getByTestId('budget-tier-income-slider') as HTMLInputElement;

      fireEvent.change(cashSlider, { target: { value: '90000' } });
      fireEvent.change(incomeSlider, { target: { value: '22000' } });

      expect(getByTestId('budget-tier-result').textContent).toContain('S티어');
    });
  });

  describe('2. BalanceMatchupWidget Strict Real Data Only (Honest 0-Vote & Live Vote Transition)', () => {
    it('displays honest zero-vote prompt instead of fake seed votes and records 1-click user choice', async () => {
      const matchups = resolveBalanceMatchups('home');
      expect(matchups.length).toBeGreaterThanOrEqual(3);
      expect(matchups[0].left.latestPriceManwon).toBeGreaterThan(0);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ leftVotes: 0, rightVotes: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ leftVotes: 1, rightVotes: 0 }),
        });

      const { getByTestId, queryByTestId } = render(
        <BalanceMatchupWidget matchups={matchups} surface="test_home" />
      );

      expect(getByTestId('balance-zero-votes-honest').textContent).toContain('아직 첫 투표 전이에요');

      fireEvent.click(getByTestId('balance-choice-left'));

      await waitFor(() => {
        expect(queryByTestId('balance-vote-tally')).not.toBeNull();
        expect(getByTestId('balance-vote-tally').textContent).toContain('실제 참여 1표');
      });
    });
  });

  describe('3. GuideRealDataChart, EditorialAuthorBox & HomeEditorialFeatureSection', () => {
    it('renders accessible SVG real-data bar chart when >= 2 verified complexes are present', () => {
      const { getByTestId, container } = render(
        <GuideRealDataChart
          articleTitle="1동탄 vs 2동탄 비교"
          items={[
            {
              name: '동탄역롯데캐슬',
              displayName: '동탄역 롯데캐슬',
              canonicalSlug: '동탄역롯데캐슬',
              href: '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
              dong: '여울동',
              zoneId: 'gbcx',
              zoneName: '광비콤',
              latestPrice: 262000,
              latestPriceStr: '26.2억',
              latestRent: 80000,
              latestRentStr: '8.0억',
              jeonseRatio: 30.5,
              perValue: '3.28',
              latestDate: '2026-11-10',
              latestArea: 102,
              latestFloor: 35,
              txCount: 179,
            },
            {
              name: '솔빛마을서해그랑블',
              displayName: '솔빛마을 서해그랑블',
              canonicalSlug: '솔빛마을서해그랑블',
              href: '/apartment/%EC%86%94%EB%B9%9B%EB%A7%88%EC%9D%84%EC%84%9C%ED%95%B4%EA%B7%B8%EB%9E%91%EB%B8%94',
              dong: '반송동',
              zoneId: 'metropolis',
              zoneName: '동탄1',
              latestPrice: 107000,
              latestPriceStr: '10.7억',
              latestRent: 60000,
              latestRentStr: '6.0억',
              jeonseRatio: 56.1,
              perValue: '1.78',
              latestDate: '2026-11-12',
              latestArea: 84,
              latestFloor: 14,
              txCount: 721,
            },
          ]}
        />
      );
      expect(getByTestId('guide-real-data-chart')).toBeInTheDocument();
      expect(container.querySelector('svg[role="img"]')).not.toBeNull();
      expect(container.textContent).toContain('26.2억');
      expect(container.textContent).toContain('10.7억');
    });

    it('renders EditorialAuthorBox with inline /about and /contact trust links', () => {
      const { getByTestId } = render(
        <EditorialAuthorBox
          authorName="D-VIEW 운영자 · 동탄 실거래 리서치"
          publishedDate="2026-10-10"
          updatedDate="2026-11-20"
        />
      );
      const box = getByTestId('editorial-author-box');
      expect(box.textContent).toContain('D-VIEW 운영자 · 동탄 실거래 리서치');
      expect(box.querySelector('a[href^="/about"]')).not.toBeNull();
      expect(box.querySelector('a[href="/contact"]')).not.toBeNull();
    });

    it('renders HomeEditorialFeatureSection cleanly with /guide CTA, zero H1 tags, and zero duplicate footer policy nav buttons', () => {
      const { container } = render(
        <HomeEditorialFeatureSection
          featuredGuides={GUIDE_ARTICLES.slice(0, 6)}
          matchups={resolveBalanceMatchups('home')}
          budgetCatalog={SAMPLE_CATALOG}
          totalGuidesCount={GUIDE_ARTICLES.length}
          verifiedComplexCount={142}
        />
      );
      expect(container.querySelectorAll('h1').length).toBe(0);
      expect(container.querySelector('a[href="/guide"]')).not.toBeNull();
      // Both engagement widgets render as standalone full-width vertical sections (no cramped lg:grid-cols-2 side-by-side)
      expect(container.querySelector('[data-testid="home-standalone-matchup-section"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="home-standalone-budget-section"]')).not.toBeNull();
      // Duplicate 6-card report block removed (unified into Zone 4B 2x2 Top-4 guide grid)
      expect(container.textContent).not.toContain('동탄 실거래 심층 리포트 추천 6선');
      // Global <Footer /> is the single SSOT for /privacy and /terms — no duplicate in-page policy nav strip
      expect(container.querySelector('a[href="/privacy"]')).toBeNull();
      expect(container.querySelector('a[href="/terms"]')).toBeNull();
    });

    it('enforces site-wide single-SSOT policy navigation: zero duplicate /privacy or /terms links in page bodies outside Footer & MobileDock', () => {
      const pageFilesToCheck = [
        'src/app/page.tsx',
        'src/app/about/page.tsx',
        'src/app/contact/page.tsx',
        'src/app/guide/page.tsx',
        'src/components/home/HomeEditorialFeatureSection.tsx',
        'src/components/guide/GuideArticleContentClient.tsx',
      ];
      for (const relPath of pageFilesToCheck) {
        const src = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
        expect(src).not.toMatch(/href="\/(privacy|terms)"/);
      }
    });
  });

  describe('4. All 25 Guides Unified E-E-A-T, Depth (>= 2,000ch), & Design System Guardrails', () => {
    it('verifies all 25 guides use a single transparent editor, Person JSON-LD author, and >= 2,000 chars body', () => {
      expect(GUIDE_ARTICLES.length).toBe(25);
      const uniqueAuthors = new Set(GUIDE_ARTICLES.map((g) => g.author));
      expect(uniqueAuthors.size).toBe(1);
      expect(Array.from(uniqueAuthors)[0]).toBe('D-VIEW 운영자 · 동탄 실거래 리서치');

      for (const guide of GUIDE_ARTICLES) {
        expect(guide.content.trim().length).toBeGreaterThanOrEqual(2000);
        const ld = buildGuideArticleJsonLd(guide);
        const articleNode = (ld['@graph'] as Array<Record<string, unknown>>).find(
          (n) => n['@type'] === 'Article'
        );
        expect((articleNode?.author as Record<string, unknown>)?.['@type']).toBe('Person');
      }
    });

    it('enforces zero legacy monospace fonts, zero prohibited palette classes, and zero emojis across all new components', () => {
      const filesToScan = [
        'src/components/home/HomeEditorialFeatureSection.tsx',
        'src/components/engagement/BalanceMatchupWidget.tsx',
        'src/components/engagement/BudgetTierChallengeWidget.tsx',
        'src/components/guide/GuideRealDataChart.tsx',
        'src/components/guide/EditorialAuthorBox.tsx',
      ];
      const forbiddenPattern =
        /font-mono|ui-monospace|Gulim|Dotum|Batang|Consolas|Courier|#(?:ff8f00|7c3aed|f9ce3f|e1306c|833ab4)\b|(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|teal|cyan|sky|green|zinc|neutral|stone|gray)-/;
      const emojiRegex = /\p{Extended_Pictographic}/u;

      for (const relPath of filesToScan) {
        const src = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
        expect(src).not.toMatch(forbiddenPattern);
        expect(src).not.toMatch(emojiRegex);
      }
    });
  });
});

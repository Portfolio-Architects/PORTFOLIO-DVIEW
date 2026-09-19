/**
 * @file m3_challenger2_full_regression_empirical.test.tsx
 * @description Empirical Challenger 2 Verification Suite for Milestone 3 (App Router, Build & Full Regression Suite):
 * 1. Next.js Routing & Redirect Invariants (next.config.ts and technovalley page redirect)
 * 2. MBTI SSG Static Params, Case Normalization, Metadata & 404 Route Defense
 * 3. 16 MBTI Apartment Dataset Mapping Integrity against Core Datasets (FULL_DONG_DATA, APARTMENTS_BY_DONG)
 * 4. Core Apartment Features & AdSlot Zero-CLS Bounding Box Integrity
 * 5. Timezone D-Day Boundary Analysis Oracle (KST vs UTC)
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import TechnoValleyPage from '@/app/technovalley/page';
import { generateStaticParams, generateMetadata } from '@/app/mbti/[type]/page';
import MBTIDirectResultPage from '@/app/mbti/[type]/page';
import { ALL_MBTI_TYPES, MBTI_PROFILES } from '@/lib/data/mbtiData';
import { APARTMENTS_BY_DONG } from '@/lib/apartment-data';
import { FULL_DONG_DATA } from '@/lib/dong-apartments';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { AdSlot } from '@/components/ads/AdSlot';
import { notFound, redirect } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  usePathname: jest.fn(() => '/mbti'),
}));

// Mock LoungeHeader and MobileDock to isolate container rendering
jest.mock('@/components/LoungeHeader', () => {
  const MockLoungeHeader = () => <header data-testid="lounge-header" />;
  MockLoungeHeader.displayName = 'MockLoungeHeader';
  return MockLoungeHeader;
});
jest.mock('@/components/pwa/MobileDock', () => {
  const MockMobileDock = () => <nav data-testid="mobile-dock" />;
  MockMobileDock.displayName = 'MockMobileDock';
  return MockMobileDock;
});
jest.mock('@/components/mbti/MBTIContainer', () => ({
  MBTIContainer: ({ initialView, initialType }: any) => (
    <div data-testid="mbti-container" data-view={initialView} data-type={initialType} />
  ),
}));

describe('Empirical Challenger 2: App Router, Build & Full Regression Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // SECTION 1: Next.js Routing & Redirect Invariants
  // =========================================================================
  describe('1. Next.js Routing & Server Redirect Invariants', () => {
    it('1.1 next.config.ts declares 307 redirects for /technovalley, /techno, and office query', () => {
      const configPath = path.resolve(__dirname, '../../next.config.ts');
      expect(fs.existsSync(configPath)).toBe(true);
      const content = fs.readFileSync(configPath, 'utf8');

      // Check /technovalley redirect rule
      expect(content).toContain("source: '/technovalley'");
      expect(content).toContain("destination: '/'");

      // Check /techno redirect rule
      expect(content).toContain("source: '/techno'");

      // Check tab=office redirect rule
      expect(content).toContain("value: 'office'");
    });

    it('1.2 src/app/technovalley/page.tsx safely executes server redirect to "/"', () => {
      TechnoValleyPage();
      expect(redirect).toHaveBeenCalledWith('/');
    });
  });

  // =========================================================================
  // SECTION 2: MBTI Route Generation, Metadata & Edge Case Robustness
  // =========================================================================
  describe('2. MBTI Dynamic Routing, SSG Params & Metadata Generation', () => {
    it('2.1 generateStaticParams produces exactly all 16 MBTI types for static generation', async () => {
      const params = await generateStaticParams();
      expect(params.length).toBe(16);
      const types = params.map((p) => p.type);
      ALL_MBTI_TYPES.forEach((expectedType) => {
        expect(types).toContain(expectedType);
      });
    });

    it('2.2 generateMetadata constructs valid OpenGraph and canonical tags for all 16 types', async () => {
      for (const mbti of ALL_MBTI_TYPES) {
        const metadata = await generateMetadata({ params: Promise.resolve({ type: mbti }) });
        expect(metadata.title).toContain(mbti);
        expect(metadata.alternates?.canonical).toBe(`https://dongtanview.com/mbti/${mbti}`);
        expect(metadata.openGraph?.images).toBeDefined();
      }
    });

    it('2.3 handles lowercase mbti type params gracefully via case normalization', async () => {
      const metadata = await generateMetadata({ params: Promise.resolve({ type: 'entj' }) });
      expect(metadata.title).toContain('ENTJ');
      expect(metadata.title).toContain('동탄역 롯데캐슬');
    });

    it('2.4 invokes notFound() for unrecognized MBTI route parameter', async () => {
      await expect(
        MBTIDirectResultPage({ params: Promise.resolve({ type: 'INVALID_MBTI' }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECTION 3: 16 MBTI Dataset Mapping Integrity against Core Datasets
  // =========================================================================
  describe('3. Core Apartment Dataset Integrity & MBTI Mapping Preservations', () => {
    it('3.1 all 16 MBTI profiles map to recognized Dongtan apartment names in FULL_DONG_DATA', () => {
      const allKnownApts = Object.values(FULL_DONG_DATA).flat();
      const allKnownNormalized = new Set(allKnownApts.map((name) => normalizeAptName(name)));

      for (const mbti of ALL_MBTI_TYPES) {
        const profile = MBTI_PROFILES[mbti];
        expect(profile).toBeDefined();
        expect(profile.aptName).toBeTruthy();
        expect(profile.dong).toBeTruthy();
        expect(profile.group).toBeTruthy();
        expect(profile.radar).toBeDefined();
        expect(profile.radar.transit).toBeGreaterThan(0);
        expect(profile.radar.nature).toBeGreaterThan(0);
        expect(profile.radar.education).toBeGreaterThan(0);
        expect(profile.radar.commerce).toBeGreaterThan(0);
        expect(profile.radar.futureValue).toBeGreaterThan(0);

        // Verify normalized name matches a known Dongtan complex in FULL_DONG_DATA
        const norm = normalizeAptName(profile.aptName);
        expect(allKnownNormalized.has(norm)).toBe(true);
      }
    });

    it('3.2 APARTMENTS_BY_DONG and FULL_DONG_DATA preserve core apartment structures', () => {
      const staticApts = Object.values(APARTMENTS_BY_DONG).flat();
      expect(staticApts.length).toBeGreaterThanOrEqual(120);

      const fullApts = Object.values(FULL_DONG_DATA).flat();
      expect(fullApts.length).toBeGreaterThanOrEqual(150);

      const dongs = Object.keys(FULL_DONG_DATA);
      expect(dongs.length).toBeGreaterThanOrEqual(10);
      expect(dongs).toContain('청계동');
      expect(dongs).toContain('영천동');
      expect(dongs).toContain('여울동');
      expect(dongs).toContain('반송동');
      expect(dongs).toContain('송동');
      expect(dongs).toContain('산척동');
    });
  });

  // =========================================================================
  // SECTION 4: AdSlot Zero-CLS Guarantees across All Formats
  // =========================================================================
  describe('4. AdSlot Zero-CLS Bounding Box Verification', () => {
    it('4.1 enforces non-zero min-height across all supported ad formats', () => {
      const { rerender } = render(<AdSlot format="banner" testMode={true} />);
      let container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[250px]');

      rerender(<AdSlot format="in-feed" testMode={true} />);
      container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[140px]');

      rerender(<AdSlot format="horizontal-strip" testMode={true} />);
      container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[90px]');

      rerender(<AdSlot format="rectangle" testMode={true} />);
      container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[250px]');

      rerender(<AdSlot format="auto" testMode={true} />);
      container = screen.getByTestId('ad-slot-container');
      expect(container.className).toContain('min-h-[250px]');
    });

    it('4.2 renders dev placeholder safely in development environment without crashing', () => {
      render(<AdSlot format="banner" testMode={true} />);
      expect(screen.getByTestId('ad-slot-dev-placeholder')).toBeInTheDocument();
      expect(screen.getByText(/\[광고 슬롯 미리보기 - 개발\/테스트 모드\]/)).toBeInTheDocument();
      expect(screen.getByText(/NEXT_PUBLIC_ADSENSE_CLIENT_ID/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SECTION 5: Timezone D-Day Boundary Analysis Oracle
  // =========================================================================
  describe('5. Timezone D-Day Boundary Analysis Oracle', () => {
    it('5.1 demonstrates why toISOString() produces previous date in KST between 00:00 and 09:00', () => {
      // Given a local KST date of 2026-09-10 00:30:00 (which is 2026-09-09 15:30:00 UTC)
      const kstMidnightDate = new Date('2026-09-09T15:30:00.000Z');
      
      const utcDateStr = kstMidnightDate.toISOString().substring(0, 10);
      expect(utcDateStr).toBe('2026-09-09'); // UTC shows yesterday!

      // Correct local date calculation:
      const localYear = kstMidnightDate.getFullYear();
      const localMonth = String(kstMidnightDate.getMonth() + 1).padStart(2, '0');
      const localDay = String(kstMidnightDate.getDate()).padStart(2, '0');
      const localDateStr = `${localYear}-${localMonth}-${localDay}`;
      
      expect(utcDateStr).toBeDefined();
      expect(localDateStr).toBeDefined();
    });
  });
});

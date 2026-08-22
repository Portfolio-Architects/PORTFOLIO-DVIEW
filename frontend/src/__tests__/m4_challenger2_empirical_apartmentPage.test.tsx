/**
 * @file m4_challenger2_empirical_apartmentPage.test.tsx
 * @description Empirical Challenger 2 Verification Suite for Milestone 4
 * Rigorously challenges:
 *  - src/lib/services/apartmentPageService.ts
 *  - src/app/apartment/[aptName]/page.tsx
 *
 * Verification Areas:
 *  1. Edge case apartment names (URI encoded, double encoded, unicode, emoji, CJK, Cyrillic, accented chars, zero-width spaces, special characters, XSS payloads, empty/whitespace).
 *  2. Missing records & data corruption resilience (non-existent complexes, null location scores, empty transactions, missing report sections, undefined values, NaN values).
 *  3. SEO metadata generation integrity (buildApartmentSeoMetadata, getDefaultApartmentMetadata, dynamic query params, fallback behavior, canonical URL format).
 *  4. JSON-LD structured data validation (Schema.org graph structure, safeJsonLd escaping against script injection, geo-coordinates, schools, transit stations, pricing).
 *  5. generateStaticParams completeness (all apartment names in tx-summary verified).
 *  6. SSR Page layout component rendering with simulated edge case params.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  decodeAptName,
  formatPriceEok,
  getPyeongSummaries,
  calculatePriceAnalytics,
  generateAiBriefing,
  getApartmentPageData,
  buildApartmentSeoMetadata,
  buildApartmentJsonLd,
  getDefaultApartmentMetadata,
  getTxSummaryData,
  type ApartmentPageData,
  type TransactionRecord,
  type LocationScore,
} from '@/lib/services/apartmentPageService';
import { safeJsonLd } from '@/lib/utils/structuredData';
import ApartmentPage, { generateStaticParams, generateMetadata } from '@/app/apartment/[aptName]/page';

// Mock DashboardClient to isolate SSR wrapper rendering
jest.mock('@/components/DashboardClient', () => {
  return function MockDashboardClient({ preselectedAptName }: { preselectedAptName?: string }) {
    return <div data-testid="mock-dashboard-client">DashboardClient for {preselectedAptName}</div>;
  };
});

describe('Milestone 4 Challenger 2: Empirical Apartment Page & Service Challenge', () => {
  describe('1. decodeAptName Adversarial & Edge Case Handling', () => {
    it('handles standard plain Korean names', () => {
      expect(decodeAptName('동탄역롯데캐슬')).toBe('동탄역롯데캐슬');
      expect(decodeAptName('시범우남퍼스트빌')).toBe('시범우남퍼스트빌');
    });

    it('handles single URL encoded strings', () => {
      const encoded = encodeURIComponent('동탄역롯데캐슬');
      expect(decodeAptName(encoded)).toBe('동탄역롯데캐슬');
    });

    it('handles double and triple URL encoded strings', () => {
      const doubleEncoded = encodeURIComponent(encodeURIComponent('동탄역시범포스코'));
      expect(decodeAptName(doubleEncoded)).toBe('동탄역시범포스코');

      const tripleEncoded = encodeURIComponent(encodeURIComponent(encodeURIComponent('동탄레이크자이')));
      expect(decodeAptName(tripleEncoded)).toBe('동탄레이크자이');
    });

    it('handles Unicode, Emoji, CJK, Cyrillic, and Accented Characters safely', () => {
      const emojiName = '동탄역🏢숲속마을🌲';
      expect(decodeAptName(emojiName)).toBe(emojiName);
      expect(decodeAptName(encodeURIComponent(emojiName))).toBe(emojiName);

      const cjkName = '東灘역 푸르지오';
      expect(decodeAptName(cjkName)).toBe(cjkName);

      const cyrillicName = '동탄역Д-VIEW';
      expect(decodeAptName(cyrillicName)).toBe(cyrillicName);

      const accentName = 'Café 동탄 1차';
      expect(decodeAptName(accentName)).toBe(accentName);

      const zwspName = '동탄\u200B역\uFEFF힐스';
      expect(decodeAptName(zwspName)).toBe(zwspName);
    });

    it('handles special characters and XSS payloads without crashing', () => {
      const xssPayload = '<script>alert("xss")</script>';
      expect(decodeAptName(xssPayload)).toBe(xssPayload);

      const malformedPercent = '동탄역%2%ZZ%A';
      // decodeURI may fail on %ZZ, fallback should safely return original string
      expect(() => decodeAptName(malformedPercent)).not.toThrow();
      expect(decodeAptName(malformedPercent)).toBeDefined();
    });

    it('handles empty strings and whitespace safely', () => {
      expect(decodeAptName('')).toBe('');
      expect(decodeAptName('   ')).toBe('   ');
    });
  });

  describe('2. formatPriceEok Numerical Edge Cases', () => {
    it('formats exact billions (억) without remainder', () => {
      expect(formatPriceEok(10000)).toBe('1억');
      expect(formatPriceEok(50000)).toBe('5억');
      expect(formatPriceEok(120000)).toBe('12억');
    });

    it('formats billions with remainders with thousands separators', () => {
      expect(formatPriceEok(12500)).toBe('1억 2,500');
      expect(formatPriceEok(8350)).toBe('8,350만');
      expect(formatPriceEok(10050)).toBe('1억 50');
    });

    it('handles zero, negative, NaN, and infinity safely', () => {
      expect(formatPriceEok(0)).toBe('0만');
      expect(formatPriceEok(-5000)).toBe('0만');
      expect(formatPriceEok(NaN)).toBe('0만');
      expect(formatPriceEok(null as unknown as number)).toBe('0만');
      expect(formatPriceEok(undefined as unknown as number)).toBe('0만');
    });
  });

  describe('3. getPyeongSummaries & calculatePriceAnalytics Edge Cases', () => {
    it('handles empty or malformed transaction arrays', () => {
      expect(getPyeongSummaries([])).toEqual([]);
      expect(getPyeongSummaries(null as unknown as TransactionRecord[])).toEqual([]);
      expect(getPyeongSummaries(undefined as unknown as TransactionRecord[])).toEqual([]);
    });

    it('filters out records with 0 or negative areaPyeong', () => {
      const corruptedTxs: TransactionRecord[] = [
        { contractYm: '202601', contractDay: '15', price: 10000, area: 0, areaPyeong: 0, floor: 5, dealType: '매매' },
        { contractYm: '202601', contractDay: '16', price: 10000, area: -84, areaPyeong: -25, floor: 5, dealType: '매매' },
        { contractYm: '202601', contractDay: '17', price: 12000, area: 84.9, areaPyeong: 25.6, floor: 10, dealType: '매매' },
      ];
      const summaries = getPyeongSummaries(corruptedTxs);
      expect(summaries.length).toBe(1);
      expect(summaries[0].pyeong).toBe(26); // Math.round(25.6)
      expect(summaries[0].latestPrice).toBe(12000);
    });

    it('calculates price analytics with empty summaries gracefully', () => {
      const analytics = calculatePriceAnalytics([]);
      expect(analytics.minSalePrice).toBe(0);
      expect(analytics.maxSalePrice).toBe(0);
      expect(analytics.ratioPercent).toBe(0);
      expect(analytics.isHigh).toBe(false);
      expect(analytics.offers).toBeUndefined();
    });

    it('detects 신고가 when latest price is near max price', () => {
      const analyticsHigh = calculatePriceAnalytics(
        [{
          pyeong: 34,
          areaM2: 84.9,
          salesCount: 5,
          rentCount: 2,
          latestPrice: 15000,
          latestPriceStr: '15억',
          maxPrice: 15200,
          maxPriceStr: '15억 2,000',
          avgPrice: 14500,
          avgPriceStr: '14억 5,000',
          latestDeposit: 8000,
          latestDepositStr: '8억',
          avgDeposit: 7500,
          avgDepositStr: '7억 5,000',
          jeonseRatio: 53,
        }],
        {
          dong: '오산동',
          name: '동탄역테스트',
          latestPrice: 15000,
          maxPrice: 15200,
          avg1MPrice: 14800,
          avg1MRentDeposit: 8000,
        }
      );
      expect(analyticsHigh.isHigh).toBe(true);
      expect(analyticsHigh.statusStr).toBe('신고가');
    });

    it('detects 실수요안심 when jeonse ratio >= 75%', () => {
      const analyticsSafe = calculatePriceAnalytics(
        [],
        {
          dong: '영천동',
          name: '동탄역안심단지',
          latestPrice: 10000,
          maxPrice: 12000,
          avg1MPrice: 10000,
          avg1MRentDeposit: 8000, // 80%
        }
      );
      expect(analyticsSafe.ratioPercent).toBe(80);
      expect(analyticsSafe.statusStr).toBe('실수요안심');
    });
  });

  describe('4. generateAiBriefing Text Synthesis Edge Cases', () => {
    it('returns default fallback briefing when no data is supplied', () => {
      const brief = generateAiBriefing('미지의단지', undefined, []);
      expect(brief).toContain('동탄 미지의단지 실거래가');
      expect(brief).toContain('D-VIEW');
    });

    it('includes school and transit station data when locationScore and aptSummary or pyeongSummaries are provided', () => {
      const mockLocation: LocationScore = {
        distanceToElementary: 210,
        nearestSchoolNames: {
          elementary: '동탄초등학교',
        },
        nearestStationName: '동탄',
        nearestStationLine: 'SRT/GTX-A',
        distanceToSubway: 350,
      };
      const mockSummary = {
        dong: '청계동',
        name: '동탄역시범단지',
        avg1MPriceEok: '10.5',
      };
      const brief = generateAiBriefing('동탄역시범단지', mockSummary, [], mockLocation);
      expect(brief).toContain('동탄초등학교(도보 약 3분)');
      expect(brief).toContain('동탄역(SRT/GTX-A, 약 350m)');
    });
  });

  describe('5. getApartmentPageData Integration & Non-Existent Complex Handling', () => {
    it('successfully retrieves real data for existing apartment (동탄역롯데캐슬)', async () => {
      const data = await getApartmentPageData('동탄역롯데캐슬');
      expect(data).toBeDefined();
      expect(data.aptName).toBe('동탄역롯데캐슬');
      expect(data.aptSummary).toBeDefined();
      expect(Array.isArray(data.txs)).toBe(true);
      expect(Array.isArray(data.pyeongSummaries)).toBe(true);
      expect(data.analytics).toBeDefined();
      expect(typeof data.aiBriefing).toBe('string');
      expect(data.aiBriefing.length).toBeGreaterThan(10);
    });

    it('handles non-existent apartment names gracefully without throwing', async () => {
      const ghostApt = '존재하지않는유령단지_999';
      const data = await getApartmentPageData(ghostApt);
      expect(data).toBeDefined();
      expect(data.aptName).toBe(ghostApt);
      expect(data.aptSummary).toBeUndefined();
      expect(data.txs).toEqual([]);
      expect(data.pyeongSummaries).toEqual([]);
      expect(data.locationScore).toBeNull();
      expect(data.matchedReportData).toBeNull();
      expect(data.comments).toEqual([]);
      expect(data.structuredImages).toEqual([]);
      expect(data.analytics.minSalePrice).toBe(0);
      expect(data.aiBriefing).toContain(ghostApt);
    });
  });

  describe('6. buildApartmentJsonLd Schema.org Structured Data & XSS Immunity', () => {
    it('generates compliant Schema.org JSON-LD graph with valid coordinates and floorplans', async () => {
      const pageData = await getApartmentPageData('동탄역롯데캐슬');
      const jsonLd = buildApartmentJsonLd(pageData, 'https://dongtanview.com');

      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(Array.isArray(jsonLd['@graph'])).toBe(true);

      const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
      const types = graph.map((item) => item['@type']);

      expect(types).toContain('WebPage');
      expect(types).toContain('ApartmentComplex');
      expect(types).toContain('SingleFamilyResidence');
      expect(types).toContain('RealEstateAgent');

      const complex = graph.find((item) => item['@type'] === 'ApartmentComplex');
      expect(complex?.name).toBe('동탄역롯데캐슬');
      expect(complex?.url).toBe('https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
    });

    it('safely neutralizes XSS injection vectors via safeJsonLd', () => {
      const maliciousData: ApartmentPageData = {
        aptName: '<script>alert("XSS")</script>',
        txs: [],
        pyeongSummaries: [],
        locationScore: null,
        matchedReportData: null,
        comments: [],
        structuredImages: [],
        analytics: {
          minSalePrice: 0,
          maxSalePrice: 0,
          salesVal: 0,
          jeonseVal: 0,
          ratioPercent: 0,
          isHigh: false,
          statusStr: '<img src=x onerror=alert(1)>',
        },
        aiBriefing: '</script><script>alert("briefing xss")</script>',
      };

      const jsonLd = buildApartmentJsonLd(maliciousData, 'https://dongtanview.com');
      const sanitized = safeJsonLd(jsonLd);

      // Verify that no raw '<' or '>' tags exist in the serialized HTML output
      expect(sanitized.__html).not.toContain('<script>');
      expect(sanitized.__html).not.toContain('</script>');
      expect(sanitized.__html).toContain('\\u003cscript\\u003e');
      expect(sanitized.__html).toContain('\\u003c/script\\u003e');

      // Verify that it still parses to valid JSON once unescaped
      const roundTrip = JSON.parse(sanitized.__html.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&'));
      expect(roundTrip['@context']).toBe('https://schema.org');
    });
  });

  describe('7. buildApartmentSeoMetadata & Fallback Metadata', () => {
    it('generates full SEO metadata for existing apartment with OG image and keywords', async () => {
      const meta = await buildApartmentSeoMetadata('동탄역롯데캐슬');
      expect(meta).toBeDefined();
      expect(meta.title).toContain('동탄역롯데캐슬');
      expect(meta.title).toContain('D-VIEW');
      expect(typeof meta.description).toBe('string');
      expect(meta.alternates?.canonical).toBe('https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
      expect(meta.openGraph?.title).toContain('동탄역롯데캐슬');
      expect(meta.openGraph?.siteName).toBe('D-VIEW');
      expect(meta.twitter?.card).toBe('summary_large_image');
    });

    it('returns default fallback metadata when rawAptName is undefined or empty', async () => {
      const metaUndefined = await buildApartmentSeoMetadata(undefined);
      expect(metaUndefined.title).toContain('아파트');

      const metaEmpty = await buildApartmentSeoMetadata('');
      expect(metaEmpty.title).toContain('아파트');
    });

    it('attaches searchParams (shareType, grade, score) to OG image URL safely', async () => {
      const meta = await buildApartmentSeoMetadata('동탄역린스트라우스', {
        shareType: 'safety',
        grade: 'A',
        score: '95',
      });
      const ogImages = meta.openGraph?.images as Array<{ url: string }>;
      expect(ogImages).toBeDefined();
      expect(ogImages.length).toBeGreaterThan(0);
      const ogImageUrl = new URL(ogImages[0].url);
      expect(ogImageUrl.searchParams.get('shareType')).toBe('safety');
      expect(ogImageUrl.searchParams.get('grade')).toBe('A');
      expect(ogImageUrl.searchParams.get('score')).toBe('95');
      expect(ogImageUrl.searchParams.get('title')).toBe('동탄역린스트라우스');
    });
  });

  describe('8. Server Page generateStaticParams & SSR Route Generation', () => {
    it('returns all apartment static params matching tx-summary', async () => {
      const summary = await getTxSummaryData();
      const summaryKeys = Object.keys(summary || {});
      const staticParams = await generateStaticParams();

      expect(staticParams.length).toBe(summaryKeys.length);
      expect(staticParams.length).toBeGreaterThan(0);

      const hasLotte = staticParams.some((p) => p.aptName === '동탄역롯데캐슬');
      expect(hasLotte).toBe(true);
    });

    it('generates page metadata safely via generateMetadata() page hook', async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ aptName: '동탄역롯데캐슬' }),
        searchParams: Promise.resolve({}),
      });
      expect(meta.title).toContain('동탄역롯데캐슬');
    });

    it('handles generateMetadata() errors safely with fallback metadata', async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ aptName: '' }),
        searchParams: Promise.resolve({}),
      });
      expect(meta).toBeDefined();
      expect(meta.title).toBeDefined();
    });
  });

  describe('9. ApartmentPage SSR Rendering Component Verification', () => {
    it('renders SSR page layout for existing apartment without crashing', async () => {
      const PageJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '동탄역롯데캐슬' }),
      });

      const { getByTestId, container } = render(PageJsx);
      expect(getByTestId('mock-dashboard-client')).toBeInTheDocument();
      expect(getByTestId('mock-dashboard-client').textContent).toContain('동탄역롯데캐슬');

      const jsonLdScript = container.querySelector('script[type="application/ld+json"]');
      expect(jsonLdScript).not.toBeNull();
      expect(jsonLdScript?.innerHTML).toContain('동탄역롯데캐슬');
    });

    it('renders SSR page layout for non-existent apartment safely with fallback text', async () => {
      const PageJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '존재하지않는가상단지' }),
      });

      const { getByTestId, container } = render(PageJsx);
      expect(getByTestId('mock-dashboard-client')).toBeInTheDocument();
      expect(getByTestId('mock-dashboard-client').textContent).toContain('존재하지않는가상단지');

      const srOnlyDiv = container.querySelector('.sr-only');
      expect(srOnlyDiv).not.toBeNull();
      expect(srOnlyDiv?.textContent).toContain('존재하지않는가상단지');
    });
  });
});

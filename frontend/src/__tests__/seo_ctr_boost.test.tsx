/**
 * @file seo_ctr_boost.test.tsx
 * @description Empirical Unit & Integration Verification Suite for Search Console CTR Diagnostics,
 * Real-Data SERP Title/Description Upgrades, and Comparison Guide Rich Snippets (1:1 Matchups + FAQPage).
 */

import React from 'react';
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { render, fireEvent } from '@testing-library/react';
import {
  expectedCtrForPosition,
  parseGscQueriesInput,
  recommendDviewSeoAction,
  classifyCtrOpportunities,
  analyzeLiveSearchConsoleCtr,
} from '@/lib/services/searchConsoleCtr';
import {
  fetchSearchConsoleQueryRows,
  fetchSearchConsoleStatusFromGoogle,
  getSearchConsoleStatus,
} from '@/lib/repositories/searchConsole.repository';
import {
  getTxSummaryData,
  getApartmentsByDongData,
  getLocationScoresData,
  getApartmentPageData,
  buildApartmentJsonLd,
  buildApartmentSeoMetadata,
  resolveCanonicalAptSlug,
  selectApartmentComparisonPeers,
  getTechnoValleyJisanList,
  resolveTechnoValleyJisan,
  buildTechnoValleySeoMetadata,
  formatTechnoValleyJisanSlug,
  matchJisanOfficeTransactions,
  buildJisanTaxBenefitSummary,
  type JisanOfficeTransactionItem,
} from '@/lib/services/apartmentPageService';
import {
  GUIDE_ARTICLES,
  buildGuideArticleJsonLd,
  getGuideAptDisplayName,
  formatGuideTxDate,
  buildGuideAptMiniPreview,
  resolveGuideZoneSectionPreviews,
  normalizeGuideAptName,
} from '@/lib/data/guides';
import GuideAptPreviewCard from '@/components/guide/GuideAptPreviewCard';
import {
  getVirtualPageViewLedger,
  resetVirtualPageViewLedger,
} from '@/lib/utils/analytics';
import { ZONES, getZoneById } from '@/lib/zones';
import { TerminalRecirculationHub } from '@/components/apartment/TerminalRecirculationHub';
import { selectRecirculationTargets } from '@/lib/ads/recirculationEngine';
import GuideArticlePage, {
  generateMetadata as generateGuideMetadata,
  renderInlineBold,
  renderGuideBodyContent,
} from '@/app/guide/[slug]/page';
import GuideIndexPage, { metadata as guideHubMetadata } from '@/app/guide/page';
import ZoneDetailPage, { generateMetadata as generateZoneMetadata } from '@/app/zone/[id]/page';
import ApartmentPage from '@/app/apartment/[aptName]/page';
import AboutPage, { metadata as aboutMetadata } from '@/app/about/page';
import TechnoValleyPage, {
  generateMetadata as generateTechnoValleyMetadata,
} from '@/app/technovalley/page';
import HomePage, { metadata as homeMetadata } from '@/app/page';
import { metadata as overviewMetadata } from '@/app/overview/page';
import { metadata as exploreMetadata } from '@/app/explore/page';
import { metadata as rootLayoutMetadata } from '@/app/layout';
import { getMainPageSchema } from '@/lib/utils/structuredData';
import { redis } from '@/lib/redis';

jest.mock('@/app/globals.css', () => ({}));

jest.mock('next/font/local', () => () => ({
  variable: '--font-pretendard',
  className: 'mock-pretendard',
}));

jest.mock('@/components/DashboardClient', () => {
  return function MockDashboardClient() {
    return <div data-testid="mock-dashboard-client" />;
  };
});

jest.mock('@/app/zone/[id]/ZoneDetailClient', () => {
  return function MockZoneDetailClient() {
    return <div data-testid="mock-zone-detail-client" />;
  };
});

jest.mock('@/app/technovalley/TechnoValleyClient', () => {
  return function MockTechnoValleyClient({
    selectedJisan,
  }: {
    selectedJisan?: { name?: string } | null;
  }) {
    return (
      <div
        data-testid="mock-technovalley-client"
        data-selected-jisan={selectedJisan?.name || ''}
      />
    );
  };
});

jest.mock('@/components/LoungeHeader', () => {
  return function MockLoungeHeader() {
    return <header data-testid="mock-lounge-header" />;
  };
});

jest.mock('@/components/pwa/MobileDock', () => {
  return function MockMobileDock() {
    return <nav data-testid="mock-mobile-dock" />;
  };
});

describe('SEO CTR Boost Pipeline & Real-Data SERP Optimization Suite', () => {
  describe('1. Google Search Console CSV / TSV / Semicolon Query Parser & Edge Cases', () => {
    it('parses Korean GSC CSV export with UTF-8 BOM, quoted thousands, and percentage CTR', () => {
      const koreanCsv = [
        '\uFEFF인기 검색어,페이지,클릭수,노출수,CTR,게재순위',
        '"동탄역 시범 리슈빌 실거래가","https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EC%8B%9C%EB%B2%94%EB%A6%AC%EC%8A%88%EB%B9%8C%EC%95%84%ED%8C%8C%ED%8A%B8",0,"1,240",0%,4.2',
        '"동탄1 vs 동탄2","https://dongtanview.com/guide/dongtan-1-vs-2-comparison",5,85,5.88%,3.1',
      ].join('\r\n');

      const rows = parseGscQueriesInput(koreanCsv);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        query: '동탄역 시범 리슈빌 실거래가',
        page: 'https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EC%8B%9C%EB%B2%94%EB%A6%AC%EC%8A%88%EB%B9%8C%EC%95%84%ED%8C%8C%ED%8A%B8',
        clicks: 0,
        impressions: 1240,
        ctr: 0,
        position: 4.2,
      });
      expect(rows[1].clicks).toBe(5);
      expect(rows[1].ctr).toBe(5.88);
    });

    it('parses English GSC CSV headers and UI-copied TSV rows', () => {
      const englishCsv = [
        'Top queries,Clicks,Impressions,CTR,Position',
        '동탄역 롯데캐슬 전세,1,64,1.56%,6.8',
      ].join('\n');

      const csvRows = parseGscQueriesInput(englishCsv);
      expect(csvRows).toHaveLength(1);
      expect(csvRows[0]).toMatchObject({
        query: '동탄역 롯데캐슬 전세',
        clicks: 1,
        impressions: 64,
        ctr: 1.56,
        position: 6.8,
      });

      const tsvInput = [
        '검색어\t클릭수\t노출수\tCTR\t평균 게재순위',
        '동탄 호수공원 아파트\t0\t52\t0%\t12.4',
      ].join('\n');

      const tsvRows = parseGscQueriesInput(tsvInput);
      expect(tsvRows).toHaveLength(1);
      expect(tsvRows[0]).toMatchObject({
        query: '동탄 호수공원 아파트',
        clicks: 0,
        impressions: 52,
        ctr: 0,
        position: 12.4,
      });
    });

    it('parses semicolon-delimited CSV with European decimal commas, quoted commas, escaped quotes, raw decimal CTR, and non-query header tables safely', () => {
      const semicolonCsv = [
        'Top queries;Clicks;Impressions;CTR;Position',
        '"동탄 6억, 7억 ""실속"" 아파트";5;85;5,88%;4,2',
        '동탄역 시범 리슈빌;0;40;0.0;6,5',
      ].join('\n');

      const semiRows = parseGscQueriesInput(semicolonCsv);
      expect(semiRows).toHaveLength(2);
      expect(semiRows[0]).toMatchObject({
        query: '동탄 6억, 7억 "실속" 아파트',
        clicks: 5,
        impressions: 85,
        ctr: 5.88,
        position: 4.2,
      });
      expect(semiRows[1]).toMatchObject({
        query: '동탄역 시범 리슈빌',
        clicks: 0,
        impressions: 40,
        ctr: 0,
        position: 6.5,
      });

      // Raw decimal ratio CTR (0.0588 without '%') normalizes to 5.88%
      const decimalCtrCsv = [
        'Query,Clicks,Impressions,CTR,Position',
        '"동탄 8억, 9억 갈아타기",5,85,0.0588,3.4',
      ].join('\n');
      const decRows = parseGscQueriesInput(decimalCtrCsv);
      expect(decRows).toHaveLength(1);
      expect(decRows[0].query).toBe('동탄 8억, 9억 갈아타기');
      expect(decRows[0].ctr).toBe(5.88);

      // Pages.csv export (page column present, query column absent) falls back cleanly to page URL
      const pagesCsv = [
        '인기 페이지,클릭수,노출수,CTR,게재순위',
        'https://dongtanview.com/guide/dongtan-1-vs-2-comparison,3,60,5%,4.1',
      ].join('\n');
      const pageRows = parseGscQueriesInput(pagesCsv);
      expect(pageRows).toHaveLength(1);
      expect(pageRows[0].query).toBe('https://dongtanview.com/guide/dongtan-1-vs-2-comparison');
      expect(pageRows[0].page).toBe('https://dongtanview.com/guide/dongtan-1-vs-2-comparison');

      // Dates.csv or Devices.csv without query or page header must return [] rather than parsing index-0 metrics as queries
      const nonQueryCsv = [
        '클릭수,노출수,CTR,게재순위,노출비중',
        '5,120,4.17%,5.2,100%',
      ].join('\n');
      expect(parseGscQueriesInput(nonQueryCsv)).toEqual([]);
    });

    it('handles empty, malformed, negative, and out-of-range CTR inputs safely', () => {
      expect(parseGscQueriesInput('')).toEqual([]);
      expect(parseGscQueriesInput('   \n  ')).toEqual([]);

      const malformed = [
        '검색어,클릭수,노출수,CTR,게재순위',
        '컬럼부족,1',
        ',5,10,50%,2.0',
        '이상치검증,-3,2,180%,5.44',
      ].join('\n');

      const rows = parseGscQueriesInput(malformed);
      expect(rows).toHaveLength(1);
      expect(rows[0].query).toBe('이상치검증');
      expect(rows[0].clicks).toBe(0);
      expect(rows[0].ctr).toBe(100);
      expect(rows[0].position).toBe(5.4);

      expect(expectedCtrForPosition(-1)).toBe(2.0);
      expect(expectedCtrForPosition(1)).toBe(25.0);
      expect(expectedCtrForPosition(15)).toBe(1.0);
      expect(expectedCtrForPosition(35)).toBe(0.5);
    });
  });

  describe('2. CTR Opportunity Classifier & D-VIEW Route Recommender', () => {
    it('aggregates duplicate queries and classifies 0-click, Page-1 low-CTR, and Page-2 striking-distance queries', async () => {
      const txSummary = await getTxSummaryData();
      const aptKeys = Object.keys(txSummary);

      const sampleRows = [
        // 0-click high-impression apartment query split across two URLs
        { query: '동탄역 시범 리슈빌 실거래가', page: 'https://dongtanview.com/explore', clicks: 0, impressions: 10, ctr: 0, position: 6.0 },
        { query: '동탄역 시범 리슈빌 실거래가', page: 'https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EC%8B%9C%EB%B2%94%EB%A6%AC%EC%8A%88%EB%B9%8C%EC%95%84%ED%8C%8C%ED%8A%B8', clicks: 0, impressions: 30, ctr: 0, position: 4.0 },
        // Low-CTR Page 1 query (position 2.2 expects 14%, actual 2.0%)
        { query: '동탄1 vs 동탄2 학군', clicks: 1, impressions: 50, ctr: 2.0, position: 2.2 },
        // Striking distance Page 2 query (position 13.5, 1 click out of 40)
        { query: '동탄 호수공원 아파트 비교', clicks: 1, impressions: 40, ctr: 2.5, position: 13.5 },
        // Healthy performer
        { query: '동탄뷰', clicks: 4, impressions: 10, ctr: 40.0, position: 1.1 },
      ];

      const report = classifyCtrOpportunities(sampleRows, {
        minImpressions: 5,
        knownApartmentKeys: aptKeys,
      });

      expect(report.totalQueries).toBe(4);
      expect(report.totalClicks).toBe(6);
      expect(report.totalImpressions).toBe(140);

      expect(report.zeroClickOpportunities).toHaveLength(1);
      expect(report.zeroClickOpportunities[0].query).toBe('동탄역 시범 리슈빌 실거래가');
      expect(report.zeroClickOpportunities[0].impressions).toBe(40);
      expect(report.zeroClickOpportunities[0].position).toBe(4.5);
      expect(report.zeroClickOpportunities[0].targetRoute).toBe('/apartment/동탄역시범리슈빌아파트');

      expect(report.lowCtrPage1Opportunities).toHaveLength(1);
      expect(report.lowCtrPage1Opportunities[0].query).toBe('동탄1 vs 동탄2 학군');
      expect(report.lowCtrPage1Opportunities[0].targetRoute).toBe('/guide/dongtan-1-vs-2-comparison');

      expect(report.strikingDistanceOpportunities).toHaveLength(1);
      expect(report.strikingDistanceOpportunities[0].targetRoute).toBe('/guide/dongtan-lake-vs-station-comparison');
    });

    it('maps diverse real-estate search intents to exact D-VIEW routes and prevents fuzzy apartment hijacking on regional/brand queries', async () => {
      const txSummary = await getTxSummaryData();
      const aptKeys = Object.keys(txSummary);

      expect(
        recommendDviewSeoAction(
          { query: '동탄역 롯데캐슬 전세가율', clicks: 0, impressions: 20, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/apartment/동탄역롯데캐슬');

      // Exact brand complex names must match exact txSummary keys rather than longest substring complex
      expect(
        recommendDviewSeoAction(
          { query: '롯데캐슬', clicks: 0, impressions: 20, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/apartment/롯데캐슬');

      expect(
        recommendDviewSeoAction(
          { query: '푸르지오 실거래가', clicks: 0, impressions: 20, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/apartment/푸르지오');

      // Broad regional queries must route to comparison guides or zones, never hijacked by longest-named apartment
      expect(
        recommendDviewSeoAction(
          { query: '동탄 호수공원 아파트', clicks: 0, impressions: 35, ctr: 0, position: 8 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-lake-vs-station-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '동탄2신도시 아파트', clicks: 0, impressions: 30, ctr: 0, position: 9 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-1-vs-2-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '동탄역 아파트', clicks: 0, impressions: 28, ctr: 0, position: 7 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/gbcx');

      // Apartment + comparison topic ('vs' 호수공원) must route to the matching topic guide
      expect(
        recommendDviewSeoAction(
          { query: '동탄역 롯데캐슬 vs 호수공원', clicks: 0, impressions: 24, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-lake-vs-station-comparison');

      // Double-encoded row.page and /zone/* row.page decode cleanly
      const doubleEncodedLotte = encodeURIComponent(encodeURIComponent('동탄역롯데캐슬'));
      expect(
        recommendDviewSeoAction(
          {
            query: '동탄 대장',
            page: `https://dongtanview.com/apartment/${doubleEncodedLotte}`,
            clicks: 0,
            impressions: 12,
            ctr: 0,
            position: 4,
          },
          aptKeys
        ).targetRoute
      ).toBe('/apartment/동탄역롯데캐슬');

      expect(
        recommendDviewSeoAction(
          {
            query: '여울동 시세',
            page: 'https://dongtanview.com/zone/gbcx',
            clicks: 0,
            impressions: 14,
            ctr: 0,
            position: 5,
          },
          aptKeys
        ).targetRoute
      ).toBe('/zone/gbcx');

      expect(
        recommendDviewSeoAction(
          { query: '동탄테크노밸리 지식산업센터 취득세', clicks: 0, impressions: 15, ctr: 0, position: 7 },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley');

      expect(
        recommendDviewSeoAction(
          { query: '동탄 9억대 아파트 갈아타기 순위', clicks: 0, impressions: 18, ctr: 0, position: 8 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-budget-tier-ranking');

      expect(
        recommendDviewSeoAction(
          { query: '동탄 트램 노선도 정거장', clicks: 0, impressions: 25, ctr: 0, position: 9 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/gtx-a-tram-rail-network');

      expect(
        recommendDviewSeoAction(
          { query: '스트레스 DSR 40% 주담대 한도', clicks: 0, impressions: 22, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/stress-dsr-valuation-guide');

      expect(
        recommendDviewSeoAction(
          { query: '동탄 초품아 학군 추천', clicks: 0, impressions: 19, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-school-zone-top-apartments');

      // New comparison guide #7: GBCX mixed-use vs Cheonggye Sibeom Big-4
      expect(
        recommendDviewSeoAction(
          { query: '동탄역 광비콤 vs 시범단지', clicks: 0, impressions: 32, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-station-gbcx-vs-sibeom-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '여울동 vs 청계동 아파트', clicks: 0, impressions: 26, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-station-gbcx-vs-sibeom-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '동탄역 주상복합 vs 아파트', clicks: 0, impressions: 24, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-station-gbcx-vs-sibeom-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '동탄역 시범단지 4대장 비교', clicks: 0, impressions: 29, ctr: 0, position: 4 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-station-gbcx-vs-sibeom-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '동탄역 롯데캐슬 vs 더샵센트럴시티', clicks: 0, impressions: 21, ctr: 0, position: 4 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-station-gbcx-vs-sibeom-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '동탄역 시범 리슈빌 vs 우남퍼스트빌', clicks: 0, impressions: 18, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-station-gbcx-vs-sibeom-comparison');

      // New comparison guide #8: 3 Commuter Belts (North Yeongcheon vs Mid Mok vs Samsung/Indeokwon Seokwoo/Neung)
      expect(
        recommendDviewSeoAction(
          { query: '북동탄 vs 중동탄 아파트', clicks: 0, impressions: 27, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '영천동 vs 목동 실거래가', clicks: 0, impressions: 23, ctr: 0, position: 7 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '동탄 삼성전자 직주근접 아파트', clicks: 0, impressions: 34, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');

      expect(
        recommendDviewSeoAction(
          { query: '동탄역 푸르지오 vs 힐스테이트동탄', clicks: 0, impressions: 17, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');

      // Specific complex query in Seokwoo-dong must still route to exact complex, whereas broad dong query routes to guide
      expect(
        recommendDviewSeoAction(
          { query: '석우동 롯데캐슬 실거래가', clicks: 0, impressions: 16, ctr: 0, position: 4 },
          aptKeys
        ).targetRoute
      ).toBe('/apartment/롯데캐슬');

      expect(
        recommendDviewSeoAction(
          { query: '석우동 아파트', clicks: 0, impressions: 15, ctr: 0, position: 7 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');

      // Substring isolation & complete 7-zone regional fallbacks ('반송동' must NOT match '송동'; '신동탄' must NOT match '신동')
      expect(
        recommendDviewSeoAction(
          { query: '반송동 아파트 실거래가', clicks: 0, impressions: 22, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/metropolis');
      expect(
        recommendDviewSeoAction(
          { query: '능동 아파트 실거래가', clicks: 0, impressions: 18, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/metropolis');
      expect(
        recommendDviewSeoAction(
          { query: '목동 아파트 실거래가', clicks: 0, impressions: 19, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/metropolis');
      expect(
        recommendDviewSeoAction(
          { query: '영천동 아파트 실거래가', clicks: 0, impressions: 20, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/techno');
      expect(
        recommendDviewSeoAction(
          { query: '동탄테크노밸리 아파트 실거래가', clicks: 0, impressions: 21, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/techno');
      expect(
        recommendDviewSeoAction(
          { query: '장지동 아파트 실거래가', clicks: 0, impressions: 16, ctr: 0, position: 7 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/culture');
      expect(
        recommendDviewSeoAction(
          { query: '신동 아파트 실거래가', clicks: 0, impressions: 24, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/newtown');
      expect(
        recommendDviewSeoAction(
          { query: '신주거문화타운 아파트', clicks: 0, impressions: 19, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/zone/newtown');
      expect(
        recommendDviewSeoAction(
          { query: '신동탄 아파트', clicks: 0, impressions: 12, ctr: 0, position: 8 },
          aptKeys
        ).targetRoute
      ).toBe('/explore');

      // Commuter & residential '테크노밸리' / campus queries must NOT be hijacked by B2B /technovalley
      expect(
        recommendDviewSeoAction(
          { query: '동탄테크노밸리 직주근접 아파트', clicks: 0, impressions: 25, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');
      expect(
        recommendDviewSeoAction(
          { query: '북동탄 테크노밸리 vs 중동탄 아파트', clicks: 0, impressions: 18, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');
      expect(
        recommendDviewSeoAction(
          { query: '기흥캠퍼스 출퇴근 동탄 아파트', clicks: 0, impressions: 16, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');

      // Multi-apartment head-to-head queries (without 'vs', with '차이', and across all SSOT headToHeadComparisons pairs)
      expect(
        recommendDviewSeoAction(
          { query: '동탄역롯데캐슬 더샵센트럴시티', clicks: 0, impressions: 15, ctr: 0, position: 4 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-station-gbcx-vs-sibeom-comparison');
      expect(
        recommendDviewSeoAction(
          { query: '동탄역 푸르지오 힐스테이트 동탄 차이', clicks: 0, impressions: 14, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');
      expect(
        recommendDviewSeoAction(
          { query: '한신더휴 vs 롯데캐슬', clicks: 0, impressions: 13, ctr: 0, position: 5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-job-proximity-commuter-comparison');
      expect(
        recommendDviewSeoAction(
          { query: '능동마을이지더원 vs 호반베르디움센트럴포레', clicks: 0, impressions: 11, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-budget-tier-ranking');
      expect(
        recommendDviewSeoAction(
          { query: '나루마을신도브래뉴 vs 시범반도유보라', clicks: 0, impressions: 12, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/stress-dsr-valuation-guide');

      const emptyReport = classifyCtrOpportunities([]);
      expect(emptyReport.totalQueries).toBe(0);
      expect(emptyReport.zeroClickOpportunities).toEqual([]);
    });
  });

  describe('3. SearchConsoleRepository Multi-Property Fallback, Zero-Click Integrity & Honest Diagnostics', () => {
    const originalEnv = { ...process.env };
    const originalFetch = global.fetch;

    afterEach(() => {
      process.env = { ...originalEnv };
      global.fetch = originalFetch;
      jest.restoreAllMocks();
    });

    it('returns honest zeroed diagnostics (never fabricated 1420/28400) when credentials are absent and evicts poisoned mock cache', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      delete process.env.GOOGLE_PRIVATE_KEY;
      delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;

      const status = await fetchSearchConsoleStatusFromGoogle();
      expect(status.isMock).toBe(true);
      expect(status.searchMetrics.clicks).toBe(0);
      expect(status.searchMetrics.impressions).toBe(0);

      const queryRes = await fetchSearchConsoleQueryRows();
      expect(queryRes.ok).toBe(false);
      expect(queryRes.errorCode).toBe('MISSING_CREDENTIALS');
      expect(queryRes.rows).toEqual([]);

      // Poisoned legacy mock payload in Redis (isMock: true with fabricated clicks > 0) must be ignored & refreshed
      if (redis) {
        await redis.set('dtdls:searchconsole:status:lkg', {
          data: {
            success: true,
            isMock: true,
            siteUrl: 'https://dongtanview.com',
            indexStatus: {
              totalIndexed: 179,
              notIndexed: 0,
              crawledNotIndexed: 0,
              discoveredNotIndexed: 0,
              errors: 0,
            },
            searchMetrics: {
              clicks: 1420,
              impressions: 28400,
              ctr: 5.0,
              averagePosition: 12.4,
            },
          },
          timestamp: Date.now(),
        });
      }

      const cachedStatus = await getSearchConsoleStatus();
      expect(cachedStatus.isMock).toBe(true);
      expect(cachedStatus.searchMetrics.clicks).toBe(0);
      expect(cachedStatus.searchMetrics.impressions).toBe(0);
    });

    it('skips siteUnverifiedUser and empty 200-OK properties to find the active property, and avoids sitelink impression double-counting in analyzeLiveSearchConsoleCtr', async () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test-seo@dongtanview.iam.gserviceaccount.com';
      process.env.GOOGLE_PRIVATE_KEY = pem;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

      const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'mock-oauth-token' }),
            text: async () => JSON.stringify({ access_token: 'mock-oauth-token' }),
          } as Response;
        }
        if (url === 'https://www.googleapis.com/webmasters/v3/sites') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              siteEntry: [
                { siteUrl: 'https://unverified.dongtanview.com/', permissionLevel: 'siteUnverifiedUser' },
                { siteUrl: 'https://www.dongtanview.com/', permissionLevel: 'siteFullUser' },
                { siteUrl: 'sc-domain:dongtanview.com', permissionLevel: 'siteFullUser' },
                { siteUrl: 'https://dongtanview.com/', permissionLevel: 'siteOwner' },
              ],
            }),
          } as Response;
        }
        // Unverified property must NEVER be queried
        if (url.includes(encodeURIComponent('https://unverified.dongtanview.com/'))) {
          throw new Error('siteUnverifiedUser should have been filtered out');
        }
        // Empty 200 OK property (e.g. www subdomain with 0 rows) must NOT short-circuit active apex property
        if (url.includes(encodeURIComponent('https://www.dongtanview.com/'))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ rows: [] }),
          } as Response;
        }
        if (url.includes(encodeURIComponent('sc-domain:dongtanview.com'))) {
          return {
            ok: false,
            status: 403,
            text: async () => JSON.stringify({ error: { message: 'User does not have sufficient permission' } }),
          } as Response;
        }
        if (url.includes(encodeURIComponent('https://dongtanview.com/'))) {
          const parsedBody = init?.body ? JSON.parse(String(init.body)) : {};
          const dims: string[] = parsedBody.dimensions || [];
          if (dims.length === 0) {
            // Site-wide aggregate summary (no dimensions) returns 1 summary row
            return {
              ok: true,
              status: 200,
              json: async () => ({
                rows: [
                  {
                    clicks: 5,
                    impressions: 168,
                    ctr: 5 / 168,
                    position: 4.5,
                  },
                ],
              }),
            } as Response;
          }
          if (dims.includes('page')) {
            // Sitelinks return 2 page rows for the same query (each carrying 120 impressions)
            return {
              ok: true,
              status: 200,
              json: async () => ({
                rows: [
                  {
                    keys: ['동탄1 vs 동탄2', 'https://dongtanview.com/guide/dongtan-1-vs-2-comparison'],
                    clicks: 4,
                    impressions: 120,
                    ctr: 4 / 120,
                    position: 4.3,
                  },
                  {
                    keys: ['동탄1 vs 동탄2', 'https://dongtanview.com/explore'],
                    clicks: 1,
                    impressions: 120,
                    ctr: 1 / 120,
                    position: 4.3,
                  },
                  {
                    keys: ['동탄역 시범 리슈빌', 'https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EC%8B%9C%EB%B2%94%EB%A6%AC%EC%8A%88%EB%B9%8C%EC%95%84%ED%8C%8C%ED%8A%B8'],
                    clicks: 0,
                    impressions: 48,
                    ctr: 0,
                    position: 5.1,
                  },
                ],
              }),
            } as Response;
          }

          // Query-only dimension returns true deduplicated SERP impression totals (120 + 48 = 168, not 288)
          return {
            ok: true,
            status: 200,
            json: async () => ({
              rows: [
                {
                  keys: ['동탄1 vs 동탄2'],
                  clicks: 5,
                  impressions: 120,
                  ctr: 5 / 120,
                  position: 4.3,
                },
                {
                  keys: ['동탄역 시범 리슈빌'],
                  clicks: 0,
                  impressions: 48,
                  ctr: 0,
                  position: 5.1,
                },
              ],
            }),
          } as Response;
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      });

      global.fetch = fetchMock as unknown as typeof fetch;

      const status = await fetchSearchConsoleStatusFromGoogle();
      expect(status.isMock).toBe(false);
      expect(status.searchMetrics.clicks).toBe(5);
      expect(status.searchMetrics.impressions).toBe(168);

      const liveResult = await analyzeLiveSearchConsoleCtr({ days: 28, minImpressions: 1 });
      expect(liveResult.fetchStatus.ok).toBe(true);
      expect(liveResult.fetchStatus.siteProperty).toBe('https://dongtanview.com/');
      expect(liveResult.report.totalClicks).toBe(5);
      expect(liveResult.report.totalImpressions).toBe(168);
      expect(liveResult.report.zeroClickOpportunities[0].page).toContain('/apartment/');
    });

    it('preserves primary GOOGLE_SERVICE_ACCOUNT_EMAIL SERVICE_DISABLED diagnostic when secondary Firebase account also fails', async () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'primary-seo@project-388.iam.gserviceaccount.com';
      process.env.GOOGLE_PRIVATE_KEY = pem;
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'firebase-admin@project-294.iam.gserviceaccount.com';
      process.env.FIREBASE_ADMIN_PRIVATE_KEY = pem;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      let tokenCount = 0;
      global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          tokenCount += 1;
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: `token-${tokenCount}` }),
          } as Response;
        }
        if (tokenCount === 1) {
          return {
            ok: false,
            status: 403,
            text: async () =>
              JSON.stringify({
                error: {
                  code: 403,
                  message: 'Google Search Console API has not been used in project 388 before or it is disabled.',
                  details: [
                    {
                      reason: 'SERVICE_DISABLED',
                      metadata: {
                        activationUrl:
                          'https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=388',
                      },
                    },
                  ],
                },
              }),
          } as Response;
        }
        return {
          ok: false,
          status: 403,
          text: async () =>
            JSON.stringify({
              error: {
                code: 403,
                message: 'User does not have sufficient permission for site.',
              },
            }),
        } as Response;
      }) as unknown as typeof fetch;

      const res = await fetchSearchConsoleQueryRows();
      expect(res.ok).toBe(false);
      expect(res.serviceAccountEmail).toBe('primary-seo@project-388.iam.gserviceaccount.com');
      expect(res.errorCode).toBe('SERVICE_DISABLED');
      expect(res.activationUrl).toContain('project=388');
      expect(res.attemptedAccounts).toHaveLength(2);
    });
  });

  describe('4. Data-Driven SERP Title & Description Upgrades (/apartment, /zone, /, /explore, /guide)', () => {
    it('upgrades /apartment/[aptName] metadata with real MOLIT price, capped pyeongs, symmetric spaced/unspaced aliases, and <=100% ratio guard', async () => {
      const richeMeta = await buildApartmentSeoMetadata(
        '동탄역시범리슈빌아파트',
        undefined,
        'https://dongtanview.com'
      );
      const richeTitle = String(richeMeta.title);
      const richeDesc = String(richeMeta.description);

      expect(richeTitle).toContain('동탄역시범리슈빌아파트');
      expect(richeTitle).toContain('최근');
      expect(richeTitle).toContain('억');
      expect(richeTitle).toMatch(/전세가율 4[0-9]%/);
      expect(richeDesc).not.toContain('아파트 아파트');
      expect(richeDesc).toContain('동탄역 시범 리슈빌');

      // Symmetric alias check: spaced Google-indexed URL (/apartment/동탄역 시범 리슈빌) injects unspaced MOLIT key
      const spacedRicheMeta = await buildApartmentSeoMetadata(
        '동탄역 시범 리슈빌',
        undefined,
        'https://dongtanview.com'
      );
      expect(String(spacedRicheMeta.description)).toContain('동탄역시범리슈빌아파트');
      expect(String(spacedRicheMeta.keywords)).toContain('동탄역시범리슈빌아파트');
      expect(spacedRicheMeta.alternates?.canonical).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );
      expect(spacedRicheMeta.openGraph?.url).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );

      // Cross-pyeong anomaly guard: mixed unit sizes (센트럴S타운 268%, 엔터프라임빌딩 115%) must NEVER emit >100% ratios
      const centralSTownMeta = await buildApartmentSeoMetadata(
        '센트럴S타운',
        undefined,
        'https://dongtanview.com'
      );
      expect(String(centralSTownMeta.title)).not.toMatch(/전세가율\s+\d{3,}%/);
      expect(String(centralSTownMeta.description)).not.toMatch(/전세가율\s+268%/);

      const enterPrimeMeta = await buildApartmentSeoMetadata(
        '엔터프라임빌딩',
        undefined,
        'https://dongtanview.com'
      );
      expect(String(enterPrimeMeta.title)).not.toMatch(/전세가율\s+115%/);

      // Complex with <=3 pyeong types omits " 외", while >3 pyeong types appends " 외"
      const lotteData = await getApartmentPageData('동탄역롯데캐슬');
      const lotteMeta = await buildApartmentSeoMetadata(
        '동탄역롯데캐슬',
        undefined,
        'https://dongtanview.com'
      );
      expect(lotteData.aptSummary?.latestPriceEok).toBeTruthy();
      expect(String(lotteMeta.title).replace(/\s+/g, '')).toContain(
        lotteData.aptSummary!.latestPriceEok
      );
      expect(lotteData.pyeongSummaries.length).toBe(3);
      expect(String(lotteMeta.title)).not.toContain('평 외');

      const metapolisData = await getApartmentPageData('METAPOLIS');
      const metapolisMeta = await buildApartmentSeoMetadata(
        'METAPOLIS',
        undefined,
        'https://dongtanview.com'
      );
      expect(metapolisData.pyeongSummaries.length).toBeGreaterThan(3);
      expect(String(metapolisMeta.title)).toContain('평 외');

      // Edge case: rent-only complex & ghost complex never emit fabricated "0만"
      const rentOnlyMeta = await buildApartmentSeoMetadata(
        '서해더블루93-8',
        undefined,
        'https://dongtanview.com'
      );
      expect(String(rentOnlyMeta.title)).not.toContain('0만');
      expect(String(rentOnlyMeta.description)).not.toContain('0만');

      const ghostMeta = await buildApartmentSeoMetadata(
        '존재하지않는유령단지_999',
        undefined,
        'https://dongtanview.com'
      );
      expect(String(ghostMeta.title)).not.toContain('0만');
    });

    it('upgrades /zone/[id], /, /explore, /guide, and root layout metadata with accurate 184-complex counts, explicit OpenGraph URLs, and percent-encoded OG image URLs', async () => {
      const gbcxMeta = await generateZoneMetadata({
        params: Promise.resolve({ id: 'gbcx' }),
      });
      expect(String(gbcxMeta.title)).toContain('여울동');
      expect(String(gbcxMeta.title)).toContain('오산동');
      expect(String(gbcxMeta.description)).toContain('동탄역롯데캐슬');
      expect(String(gbcxMeta.description)).toContain('억');

      const communityMeta = await generateZoneMetadata({
        params: Promise.resolve({ id: 'community' }),
      });
      expect(String(communityMeta.title)).toContain('청계동');

      expect(String(homeMetadata.title)).toContain('184개');
      expect(String(homeMetadata.description)).toContain('184개');
      expect(homeMetadata.openGraph?.url).toBe('https://dongtanview.com');

      expect(String(exploreMetadata.title)).toContain('184개');
      expect(exploreMetadata.openGraph?.url).toBe('https://dongtanview.com/explore');

      // Verify zero raw spaces in root, home, and explore OG image URLs
      const rootOgImages = rootLayoutMetadata.openGraph?.images as Array<{ url: string }>;
      const homeOgImages = homeMetadata.openGraph?.images as Array<{ url: string }>;
      const exploreOgImages = exploreMetadata.openGraph?.images as Array<{ url: string }>;
      expect(rootOgImages[0].url).not.toContain(' ');
      expect(homeOgImages[0].url).not.toContain(' ');
      expect(exploreOgImages[0].url).not.toContain(' ');

      expect(String(guideHubMetadata.title)).toContain('동탄1 vs 2');
      expect(String(guideHubMetadata.title)).toContain('동탄역 vs 호수공원');
    });
  });

  describe('5. Comparison Guide Rich Snippets: Full 20-Guide SSR Rendering, 1:1 Real-Data Matchups, Internal Link Mesh, FAQPage JSON-LD & CLI Quiet Guardrails', () => {
    const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    it('verifies all 20 guides resolve 100% of headToHeadComparisons, featuredApartments & featuredZones against real data with zero unicode emojis', async () => {
      expect(GUIDE_ARTICLES).toHaveLength(20);
      const txSummary = await getTxSummaryData();

      for (const article of GUIDE_ARTICLES) {
        expect(article.seoTitle && article.seoTitle.length > 20).toBe(true);
        expect(article.seoDescription && article.seoDescription.length > 40).toBe(true);
        expect(article.headToHeadComparisons && article.headToHeadComparisons.length >= 2).toBe(true);
        expect(article.faqs && article.faqs.length >= 3).toBe(true);

        // Zero unicode emojis across guide metadata, content, matchups, and FAQs
        const serializedArticle = JSON.stringify(article);
        expect(EMOJI_REGEX.test(serializedArticle)).toBe(false);

        for (const matchup of article.headToHeadComparisons || []) {
          expect(txSummary[matchup.leftApt]).toBeDefined();
          expect(txSummary[matchup.rightApt]).toBeDefined();
        }
        for (const aptName of article.featuredApartments || []) {
          expect(txSummary[aptName]).toBeDefined();
        }
        for (const zoneId of article.featuredZones || []) {
          expect(getZoneById(zoneId)).toBeDefined();
        }

        const meta = await generateGuideMetadata({
          params: Promise.resolve({ slug: article.slug }),
        });
        expect(meta.title).toBe(article.seoTitle);
        expect(meta.description).toBe(article.seoDescription);
      }
    });

    it('renders all 20 guides cleanly with zero leaked Mermaid code, zero literal ** markdown markers, proper HTML tables, aligned jeonseRatio, and zero font-mono', async () => {
      for (const article of GUIDE_ARTICLES) {
        const jsonLd = buildGuideArticleJsonLd(article, 'https://dongtanview.com');
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;

        expect(graph.some((node) => node['@type'] === 'Article')).toBe(true);
        expect(graph.some((node) => node['@type'] === 'BreadcrumbList')).toBe(true);
        const faqNode = graph.find((node) => node['@type'] === 'FAQPage');
        expect(faqNode).toBeDefined();
        expect((faqNode?.mainEntity as unknown[]).length).toBe(article.faqs?.length);

        const PageJsx = await GuideArticlePage({
          params: Promise.resolve({ slug: article.slug }),
        });
        const { container, unmount } = render(PageJsx);
        const articleEl = container.querySelector('article');
        expect(articleEl).not.toBeNull();
        const fullText = articleEl?.textContent || '';

        // Zero leaked fenced Mermaid syntax or literal markdown bold/separator tokens
        expect(fullText).not.toContain('```');
        expect(fullText).not.toContain('flowchart TD');
        expect(fullText).not.toContain('subgraph 트램');
        expect(fullText).not.toContain('**');
        expect(fullText).not.toContain(':---');

        // Sections & Typography guardrails
        const bodySection = container.querySelector('#guide-article-body');
        const h2hSection = container.querySelector('#guide-head-to-head-comparison');
        const liveSection = container.querySelector('#guide-live-data-comparison');
        const faqSection = container.querySelector('#guide-faq-section');
        expect(bodySection).not.toBeNull();
        expect(h2hSection).not.toBeNull();
        expect(liveSection).not.toBeNull();
        expect(faqSection).not.toBeNull();
        expect(bodySection?.querySelectorAll('.font-mono').length).toBe(0);
        expect(h2hSection?.querySelectorAll('.font-mono').length).toBe(0);
        expect(liveSection?.querySelectorAll('.font-mono').length).toBe(0);
        expect(faqSection?.querySelectorAll('.font-mono').length).toBe(0);

        if (article.slug === 'stress-dsr-valuation-guide') {
          const tables = articleEl?.querySelectorAll('table') || [];
          expect(tables.length).toBeGreaterThanOrEqual(2);
          expect(tables[0].textContent).toContain('차주 연소득');
          expect(tables[0].textContent).toContain('8,000만 원');
        }

        if (article.slug === 'dongtan-1-vs-2-comparison') {
          expect(h2hSection?.textContent).toMatch(/전세가율 \(하방지지\)4[0-9]%/);
          expect(h2hSection?.textContent).not.toContain('24%');
        }

        if (article.slug === 'dongtan-station-gbcx-vs-sibeom-comparison') {
          const tables = articleEl?.querySelectorAll('table') || [];
          expect(tables.length).toBeGreaterThanOrEqual(3); // 2 markdown comparison tables + 1 live featured apartments table
          expect(tables[0].textContent).toContain('용적률');
          expect(tables[1].textContent).toContain('141%');
          expect(tables[1].textContent).toContain('더샵센트럴시티');
        }

        if (article.slug === 'dongtan-job-proximity-commuter-comparison') {
          const tables = articleEl?.querySelectorAll('table') || [];
          expect(tables.length).toBeGreaterThanOrEqual(2); // 1 markdown 3-zone table + 1 live featured apartments table
          expect(tables[0].textContent).toContain('북동탄 테크노밸리 축');
          expect(tables[0].textContent).toContain('힐스테이트동탄');
        }

        for (const faq of article.faqs || []) {
          expect(faqSection?.textContent).toContain(faq.question);
          expect(faqSection?.textContent).toContain(faq.answer);
        }

        unmount();
      }
    });

    it('renders bidirectional SSR & visible internal link mesh on ApartmentPage, TerminalRecirculationHub, and all 7 valid ZoneDetailPages', async () => {
      // 1. ApartmentPage for canonical GBCX flagship ('동탄역롯데캐슬'), spaced organic landing alias ('동탄역 시범 리슈빌'), and 신동 complex ('e편한세상동탄파크아너스')
      for (const [aptParam, expectedGuideHref] of [
        ['동탄역롯데캐슬', '/guide/dongtan-station-gbcx-vs-sibeom-comparison'],
        ['동탄역 시범 리슈빌', '/guide/dongtan-station-gbcx-vs-sibeom-comparison'],
        ['e편한세상동탄파크아너스', '/guide/dongtan-budget-tier-ranking'],
      ] as const) {
        const AptJsx = await ApartmentPage({
          params: Promise.resolve({ aptName: aptParam }),
        });
        const { container, unmount } = render(AptJsx);
        // Zero legacy font-mono across the ENTIRE ApartmentPage DOM (not just #apt-related-guides-ssr)
        expect(container.querySelectorAll('.font-mono').length).toBe(0);

        const guideSection = container.querySelector('#apt-related-guides-ssr');
        expect(guideSection).not.toBeNull();
        expect(guideSection?.textContent).toContain(`${aptParam} 포함 1:1 실거래 맞대결 비교 가이드`);

        const hrefs = Array.from(guideSection?.querySelectorAll('a') || []).map((a) =>
          a.getAttribute('href')
        );
        expect(hrefs).toContain(expectedGuideHref);
        unmount();
      }

      // 2. Sighted-user visible guide recirculation links inside TerminalRecirculationHub (Chapter 08)
      const targets = selectRecirculationTargets({
        currentAptName: '동탄역 시범 리슈빌',
        currentDong: '청계동',
        currentPriceWon: 1_235_000_000,
      });
      const hubRender = render(
        <TerminalRecirculationHub
          currentAptName="동탄역 시범 리슈빌"
          currentDong="청계동"
          currentPriceWon={1_235_000_000}
          targets={targets}
          onSelectApartment={jest.fn()}
          onOpenCompare={jest.fn()}
          onOpenMortgage={jest.fn()}
        />
      );
      const visibleGuideBox = hubRender.container.querySelector('[data-testid="recirc-related-guides"]');
      expect(visibleGuideBox).not.toBeNull();
      expect(visibleGuideBox?.querySelectorAll('.font-mono').length).toBe(0);
      const visibleHrefs = Array.from(visibleGuideBox?.querySelectorAll('a') || []).map((a) =>
        a.getAttribute('href')
      );
      expect(visibleHrefs).toContain('/guide/dongtan-station-gbcx-vs-sibeom-comparison');
      hubRender.unmount();

      // 3. Every single valid zone in ZONES (all 7 zones, including 'newtown') renders #zone-related-guides-ssr
      expect(ZONES).toHaveLength(7);
      for (const zone of ZONES) {
        const ZoneJsx = await ZoneDetailPage({
          params: Promise.resolve({ id: zone.id }),
        });
        const zoneRender = render(ZoneJsx);
        const zoneGuideSection = zoneRender.container.querySelector('#zone-related-guides-ssr');
        expect(zoneGuideSection).not.toBeNull();
        expect(zoneGuideSection?.querySelectorAll('.font-mono').length).toBe(0);
        const zoneHrefs = Array.from(zoneGuideSection?.querySelectorAll('a') || []).map((a) =>
          a.getAttribute('href')
        );
        expect(zoneHrefs.some((h) => h?.startsWith('/guide/'))).toBe(true);
        if (zone.id === 'gbcx') {
          expect(zoneHrefs).toContain('/guide/dongtan-station-gbcx-vs-sibeom-comparison');
        }
        if (zone.id === 'techno') {
          expect(zoneHrefs).toContain('/guide/dongtan-job-proximity-commuter-comparison');
        }
        if (zone.id === 'newtown') {
          expect(zoneHrefs).toContain('/guide/dongtan-budget-tier-ranking');
        }
        zoneRender.unmount();
      }
    });

    it('renders GuideIndexPage (/guide) with all 20 comparison guides, CollectionPage JSON-LD hasPart=20, and zero font-mono in guide cards', () => {
      const { container, unmount } = render(<GuideIndexPage />);
      const cards = container.querySelectorAll('article');
      expect(cards).toHaveLength(20);
      cards.forEach((card) => {
        expect(card.querySelectorAll('.font-mono').length).toBe(0);
      });

      const ldScript = container.querySelector('script[type="application/ld+json"]');
      expect(ldScript).not.toBeNull();
      const parsedLd = JSON.parse(ldScript?.innerHTML || '{}');
      expect(parsedLd['@type']).toBe('CollectionPage');
      expect(parsedLd.hasPart).toHaveLength(20);
      expect(
        parsedLd.hasPart.some(
          (item: { url: string }) =>
            item.url === 'https://dongtanview.com/guide/dongtan-station-gbcx-vs-sibeom-comparison'
        )
      ).toBe(true);
      expect(
        parsedLd.hasPart.some(
          (item: { url: string }) =>
            item.url === 'https://dongtanview.com/guide/dongtan-job-proximity-commuter-comparison'
        )
      ).toBe(true);
      unmount();
    });

    it('handles boundary & fallback edge cases on ApartmentPage (accurate zone heading + ghost complex zero-leak) and ZoneDetailPage (genuine valid-zone 0-guide branch + invalid zone)', async () => {
      // 1. Non-featured apartment in 영천동 ('동탄파크자이') falls back cleanly to zone guides with accurate zone heading (NOT '동탄파크자이 포함...')
      const YeongcheonAptJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '동탄파크자이' }),
      });
      const ycRender = render(YeongcheonAptJsx);
      const ycGuideSection = ycRender.container.querySelector('#apt-related-guides-ssr');
      expect(ycGuideSection).not.toBeNull();
      expect(ycGuideSection?.textContent).not.toContain('동탄파크자이 포함');
      expect(ycGuideSection?.textContent).toContain('동탄테크노밸리 권역 1:1 실거래 비교 가이드');
      const ycHrefs = Array.from(ycGuideSection?.querySelectorAll('a') || []).map((a) =>
        a.getAttribute('href')
      );
      expect(ycHrefs).toContain('/guide/dongtan-job-proximity-commuter-comparison');
      ycRender.unmount();

      // 2. Non-featured 신동 apartment ('동탄2디에트르포레') resolves 'newtown' zone guide cleanly
      const SindongAptJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '동탄2디에트르포레' }),
      });
      const sdRender = render(SindongAptJsx);
      const sdGuideSection = sdRender.container.querySelector('#apt-related-guides-ssr');
      expect(sdGuideSection).not.toBeNull();
      expect(sdGuideSection?.textContent).toContain('신주거문화타운 권역 1:1 실거래 비교 가이드');
      const sdHrefs = Array.from(sdGuideSection?.querySelectorAll('a') || []).map((a) =>
        a.getAttribute('href')
      );
      expect(sdHrefs).toContain('/guide/dongtan-budget-tier-ranking');
      sdRender.unmount();

      // 3. Ghost / non-existent apartment degrades gracefully AND does NOT leak false 'gbcx' guide links
      const GhostAptJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '존재하지않는유령단지_999' }),
      });
      const ghostRender = render(GhostAptJsx);
      expect(ghostRender.container.querySelector('[data-testid="mock-dashboard-client"]')).not.toBeNull();
      expect(ghostRender.container.querySelector('#apt-related-guides-ssr')).toBeNull();
      ghostRender.unmount();

      // 4. Genuine 0-guide branch on a VALID zone ('newtown'): renders #zone-ssr-data-table while cleanly omitting #zone-related-guides-ssr
      const savedFeaturedZones = GUIDE_ARTICLES.map((a) =>
        a.featuredZones ? [...a.featuredZones] : undefined
      );
      try {
        GUIDE_ARTICLES.forEach((a) => {
          if (a.featuredZones) {
            a.featuredZones = a.featuredZones.filter((z) => z !== 'newtown');
          }
        });
        const ZeroGuideValidZoneJsx = await ZoneDetailPage({
          params: Promise.resolve({ id: 'newtown' }),
        });
        const zeroGuideRender = render(ZeroGuideValidZoneJsx);
        expect(zeroGuideRender.container.querySelector('#zone-ssr-data-table')).not.toBeNull();
        expect(zeroGuideRender.container.querySelector('#zone-related-guides-ssr')).toBeNull();
        zeroGuideRender.unmount();
      } finally {
        GUIDE_ARTICLES.forEach((a, idx) => {
          a.featuredZones = savedFeaturedZones[idx];
        });
      }

      // 5. Invalid zone ID renders fallback client cleanly without throwing
      const InvalidZoneJsx = await ZoneDetailPage({
        params: Promise.resolve({ id: 'non-existent-zone' }),
      });
      const invalidRender = render(InvalidZoneJsx);
      expect(invalidRender.container.querySelector('[data-testid="mock-zone-detail-client"]')).not.toBeNull();
      invalidRender.unmount();
    });

    it('executes scripts/analyze-gsc-ctr.ts via child process with zero [dotenv] banner output on valid CSV, empty CSV, and missing file error paths', () => {
      const cliScriptPath = path.resolve(process.cwd(), 'scripts', 'analyze-gsc-ctr.ts');
      const scriptSource = fs.readFileSync(cliScriptPath, 'utf-8');
      expect(scriptSource).toMatch(/dotenv\.config\(\{\s*path:[^}]+,\s*quiet:\s*true\s*\}\)/);
      expect(EMOJI_REGEX.test(scriptSource)).toBe(false);

      const tsNodeBin = path.resolve(process.cwd(), 'node_modules', 'ts-node', 'dist', 'bin.js');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dview-gsc-ctr-'));
      const validCsvPath = path.join(tmpDir, 'Queries.csv');
      const emptyCsvPath = path.join(tmpDir, 'Empty.csv');
      const missingCsvPath = path.join(tmpDir, 'DoesNotExist.csv');

      try {
        fs.writeFileSync(
          validCsvPath,
          [
            '인기 검색어,클릭수,노출수,CTR,게재순위',
            '"동탄역 광비콤 주상복합 vs 시범단지",0,48,0%,3.4',
            '"북동탄 vs 중동탄 삼성전자 출퇴근",0,31,0%,4.8',
          ].join('\n'),
          'utf-8'
        );
        fs.writeFileSync(emptyCsvPath, '', 'utf-8');

        // 1. Valid CSV execution
        const validRun = spawnSync(
          process.execPath,
          [
            tsNodeBin,
            '-T',
            '-r',
            'tsconfig-paths/register',
            '--project',
            'scratch/tsconfig.test.json',
            cliScriptPath,
            validCsvPath,
          ],
          { cwd: process.cwd(), encoding: 'utf-8' }
        );
        expect(validRun.status).toBe(0);
        expect(validRun.stdout).not.toContain('[dotenv@');
        expect(validRun.stderr).not.toContain('[dotenv@');
        expect(validRun.stdout).toContain('/guide/dongtan-station-gbcx-vs-sibeom-comparison');
        expect(validRun.stdout).toContain('/guide/dongtan-job-proximity-commuter-comparison');

        // 2. Empty CSV boundary execution
        const emptyRun = spawnSync(
          process.execPath,
          [
            tsNodeBin,
            '-T',
            '-r',
            'tsconfig-paths/register',
            '--project',
            'scratch/tsconfig.test.json',
            cliScriptPath,
            emptyCsvPath,
          ],
          { cwd: process.cwd(), encoding: 'utf-8' }
        );
        expect(emptyRun.status).toBe(0);
        expect(emptyRun.stdout).not.toContain('[dotenv@');
        expect(emptyRun.stderr).not.toContain('[dotenv@');
        expect(emptyRun.stdout).toContain('총 분석 검색어: 0개');

        // 3. Missing CSV error path
        const missingRun = spawnSync(
          process.execPath,
          [
            tsNodeBin,
            '-T',
            '-r',
            'tsconfig-paths/register',
            '--project',
            'scratch/tsconfig.test.json',
            cliScriptPath,
            missingCsvPath,
          ],
          { cwd: process.cwd(), encoding: 'utf-8' }
        );
        expect(missingRun.status).toBe(1);
        expect(missingRun.stdout).not.toContain('[dotenv@');
        expect(missingRun.stderr).not.toContain('[dotenv@');
        expect(missingRun.stderr).toContain('파일을 찾을 수 없습니다');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }, 30000);
  });

  describe('6. Live GSC Query CTR Tuning: Main (/), 1동탄 vs 2동탄 & 학군지 Guides, /about Brand Value, and /technovalley?jisan=... Dynamic Metadata', () => {
    const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    it('1) incorporates 아파트 시세 and 집값 추이 그래프 into /, /overview, root layout metadata, visible #home-ssr-market-editorial, and enforces Pretendard-only font discipline', async () => {
      expect(String(homeMetadata.title)).toContain('동탄 아파트 시세');
      expect(String(homeMetadata.title)).toContain('집값 추이 그래프');
      expect(String(homeMetadata.title)).toContain('184개');
      expect(String(homeMetadata.description)).toContain('아파트 시세');
      expect(String(homeMetadata.description)).toContain('집값 추이 그래프');

      expect(String(overviewMetadata.title)).toContain('동탄 아파트 시세');
      expect(String(overviewMetadata.title)).toContain('집값 추이 그래프');
      expect(overviewMetadata.alternates?.canonical).toBe('https://dongtanview.com/overview');

      expect(String(rootLayoutMetadata.title)).toContain('동탄 아파트 시세');
      expect(String(rootLayoutMetadata.title)).toContain('집값 추이 그래프');
      expect(String(rootLayoutMetadata.description)).toContain('집값 추이 그래프');

      const layoutSrc = fs.readFileSync(
        path.resolve(__dirname, '../app/layout.tsx'),
        'utf-8'
      );
      expect(layoutSrc).not.toContain('next/font/google');
      expect(layoutSrc).not.toContain('monospace');

      const HomeJsx = await HomePage();
      const homeRender = render(HomeJsx);
      const editorial = homeRender.container.querySelector('#home-ssr-market-editorial');
      expect(editorial).not.toBeNull();
      expect(editorial?.querySelector('h2')?.textContent).toContain('동탄 아파트 시세');
      expect(editorial?.querySelector('h2')?.textContent).toContain('집값 추이 그래프');
      expect(editorial?.textContent).toContain('184개 아파트 시세');
      homeRender.unmount();

      const mainSchema = getMainPageSchema('https://dongtanview.com');
      const websiteNode = mainSchema['@graph'].find((n) => n['@type'] === 'WebSite') as Record<
        string,
        unknown
      >;
      expect(String(websiteNode.name)).toContain('아파트 시세');
      expect(String(websiteNode.name)).toContain('집값 추이 그래프');
      expect(websiteNode.alternateName).toEqual(
        expect.arrayContaining(['디뷰', '동뷰', '동탄뷰'])
      );
    });

    it('2) front-loads 1동탄 vs 2동탄 차이 and 동탄 학군지 in guide seoTitle, seoDescription, visible h1, and JSON-LD Article.headline', async () => {
      const compMeta = await generateGuideMetadata({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      expect(String(compMeta.title).startsWith('1동탄 vs 2동탄 차이')).toBe(true);
      expect(String(compMeta.title)).toContain('동탄1신도시');
      expect(String(compMeta.title)).toContain('동탄2신도시');
      expect(String(compMeta.description).startsWith('1동탄 2동탄 차이')).toBe(true);

      const CompPageJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      const compRender = render(CompPageJsx);
      expect(compRender.container.querySelectorAll('h1').length).toBe(1);
      expect(compRender.container.querySelector('h1')?.textContent?.startsWith('1동탄 vs 2동탄 차이')).toBe(true);
      expect(compRender.container.textContent).toContain('1동탄');
      expect(compRender.container.textContent).toContain('2동탄');
      const compLd = JSON.parse(
        compRender.container.querySelector('script[type="application/ld+json"]')?.innerHTML || '{}'
      );
      const compArticleNode = compLd['@graph'].find((n: { '@type': string }) => n['@type'] === 'Article');
      expect(String(compArticleNode.headline).startsWith('1동탄 vs 2동탄 차이')).toBe(true);
      compRender.unmount();

      const schoolMeta = await generateGuideMetadata({
        params: Promise.resolve({ slug: 'dongtan-school-zone-top-apartments' }),
      });
      expect(String(schoolMeta.title).startsWith('동탄 학군지')).toBe(true);
      expect(String(schoolMeta.title)).toContain('초품아');
      expect(String(schoolMeta.description).startsWith('동탄 학군지')).toBe(true);

      const SchoolPageJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-school-zone-top-apartments' }),
      });
      const schoolRender = render(SchoolPageJsx);
      expect(schoolRender.container.querySelectorAll('h1').length).toBe(1);
      expect(schoolRender.container.querySelector('h1')?.textContent?.startsWith('동탄 학군지')).toBe(true);
      const schoolLd = JSON.parse(
        schoolRender.container.querySelector('script[type="application/ld+json"]')?.innerHTML || '{}'
      );
      const schoolArticleNode = schoolLd['@graph'].find((n: { '@type': string }) => n['@type'] === 'Article');
      expect(String(schoolArticleNode.headline).startsWith('동탄 학군지')).toBe(true);
      schoolRender.unmount();
    });

    it('3) upgrades /about metadata, visible accessible h1 (zero aria-hidden cloaking), and SSR JSON-LD with Korean brand aliases (디뷰 · 동뷰 · 동탄뷰) and 184-complex / 56-center real-data value', async () => {
      expect(String(aboutMetadata.title)).toContain('디뷰 · 동뷰 · 동탄뷰');
      expect(String(aboutMetadata.title)).toContain('동탄 184개 아파트 실거래 시세·전세가율 분석');
      expect(String(aboutMetadata.description)).toContain('184개 아파트');
      expect(String(aboutMetadata.description)).toContain('집값 추이 그래프');
      expect(aboutMetadata.alternates?.canonical).toBe('https://dongtanview.com/about');
      expect(aboutMetadata.openGraph?.url).toBe('https://dongtanview.com/about');

      const aboutOgImages = aboutMetadata.openGraph?.images as Array<{ url: string }>;
      expect(aboutOgImages[0].url).not.toContain(' ');
      expect(EMOJI_REGEX.test(JSON.stringify(aboutMetadata))).toBe(false);

      const AboutJsx = await AboutPage();
      const { container, unmount } = render(AboutJsx);
      expect(container.querySelectorAll('.font-mono').length).toBe(0);
      expect(container.querySelectorAll('[aria-hidden="true"] h1').length).toBe(0);

      const h1List = container.querySelectorAll('h1');
      expect(h1List.length).toBe(1);
      const h1 = h1List[0];
      expect(h1.closest('[aria-hidden="true"]')).toBeNull();
      expect(h1.closest('.sr-only')).toBeNull();
      expect(h1.textContent).toContain('디뷰 · 동뷰 · 동탄뷰');
      expect(h1.textContent).toContain('184개 아파트');
      expect(container.textContent).toContain('56개 지식산업센터');
      expect(container.textContent).not.toContain('and 정보 민주화');

      const ldScript = container.querySelector('script[type="application/ld+json"]');
      expect(ldScript).not.toBeNull();
      const parsedLd = JSON.parse(ldScript?.innerHTML || '{}');
      const agentNode = parsedLd['@graph'].find(
        (n: { '@type': string }) => n['@type'] === 'RealEstateAgent'
      );
      expect(agentNode.alternateName).toEqual(
        expect.arrayContaining(['디뷰', '동뷰', '동탄뷰'])
      );
      unmount();
    });

    it('4) generates per-building dynamic metadata, above-the-fold client hero banner, and SSR spotlight for all 56 /technovalley?jisan=... centers while guarding boundary & untrusted inputs', async () => {
      const jisanList = await getTechnoValleyJisanList();
      expect(jisanList).toHaveLength(56);

      // Verify every single one of the 56 verified centers produces clean, non-duplicated, zero-emoji SERP metadata unified on static /technovalley/[slug]
      for (const item of jisanList) {
        const meta = buildTechnoValleySeoMetadata(jisanList, item.name, 'https://dongtanview.com');
        const title = String(meta.title);
        const desc = String(meta.description);
        const expectedSlug = formatTechnoValleyJisanSlug(item.name);
        expect(title).toContain(item.name);
        expect(title).toContain('연면적');
        expect(title).toContain('입주 업종');
        expect(title).toContain('취득세 35% 감면');
        expect(title).not.toContain('지식산업센터 지식산업센터');
        expect(title).not.toMatch(/(?:^|[^\d.,])0실/);
        expect(title).not.toContain('미정');
        expect(title).not.toMatch(/(?:^|[^\d.,])0㎡/);
        expect(EMOJI_REGEX.test(title + desc)).toBe(false);
        expect(meta.alternates?.canonical).toBe(
          `https://dongtanview.com/technovalley/${encodeURIComponent(expectedSlug)}`
        );
        expect(meta.openGraph?.url).toBe(
          `https://dongtanview.com/technovalley/${encodeURIComponent(expectedSlug)}`
        );
        const ogImages = meta.openGraph?.images as Array<{ url: string }>;
        expect(ogImages[0].url).not.toContain(' ');
      }

      // Live GSC examples: ?jisan=SH SQUAREⅡ and ?jisan=동탄 GTOWER via async generateMetadata
      const shSquareMeta = await generateTechnoValleyMetadata({
        searchParams: Promise.resolve({ jisan: 'SH SQUAREⅡ' }),
      });
      expect(String(shSquareMeta.title)).toBe(
        'SH SQUAREⅡ 지식산업센터 (연면적 35,576.2㎡·453실) — 제조·IT 입주 업종·취득세 35% 감면 | D-VIEW'
      );
      expect(String(shSquareMeta.description)).toContain('경기도 화성시 동탄대로 683');
      expect(String(shSquareMeta.description)).toContain('산업시설 14,323.7㎡');
      expect(String(shSquareMeta.description)).toContain('취득세 35%');
      expect(shSquareMeta.alternates?.canonical).toBe(
        `https://dongtanview.com/technovalley/${encodeURIComponent('SH-SQUAREⅡ')}`
      );

      const gTowerMeta = await generateTechnoValleyMetadata({
        searchParams: Promise.resolve({ jisan: '동탄 GTOWER' }),
      });
      expect(String(gTowerMeta.title)).toBe(
        '동탄 GTOWER 지식산업센터 (연면적 32,066.3㎡·284실) — 제조·IT 입주 업종·취득세 35% 감면 | D-VIEW'
      );

      // Normalization aliases: Unicode Roman Ⅰ/Ⅱ, ASCII Roman numeral, Arabic numeral, Korean phonetic loanwords, corporate symbol ㈜, percent-encoded, and array searchParams
      expect(resolveTechnoValleyJisan(jisanList, 'sh square ii')?.name).toBe('SH SQUAREⅡ');
      expect(resolveTechnoValleyJisan(jisanList, 'SH SQUARE 2')?.name).toBe('SH SQUAREⅡ');
      expect(resolveTechnoValleyJisan(jisanList, 'sh 스퀘어 2')?.name).toBe('SH SQUAREⅡ');
      expect(resolveTechnoValleyJisan(jisanList, 'SH TIME SQUARE Ⅰ')?.name).toBe('SH TIME SQUARE 1');
      expect(resolveTechnoValleyJisan(jisanList, '동탄 g타워')?.name).toBe('동탄 GTOWER');
      expect(resolveTechnoValleyJisan(jisanList, '㈜유앤미개발')?.name).toBe('(주)유앤미개발');
      expect(
        resolveTechnoValleyJisan(jisanList, encodeURIComponent('동탄 GTOWER'))?.name
      ).toBe('동탄 GTOWER');
      expect(
        resolveTechnoValleyJisan(jisanList, ['', '  동탄 GTOWER  ', 'SH SQUAREⅡ'])?.name
      ).toBe('동탄 GTOWER');

      // Verify all 5 GSC high-bounce target buildings and their user search variations resolve deterministically
      for (const [alias, expectedCanonicalName] of [
        ['동탄 SK V1 center', '동탄 SK V1 center'],
        ['동탄 SK V1', '동탄 SK V1 center'],
        ['동탄-SK-V1-center', '동탄 SK V1 center'],
        ['동탄금강펜테리움 IX타워', '동탄금강펜테리움 IX타워'],
        ['금강펜테리움 IX타워', '동탄금강펜테리움 IX타워'],
        ['동탄 금강펜테리움 ix타워', '동탄금강펜테리움 IX타워'],
        ['동탄비즈타워', '동탄비즈타워'],
        ['동탄 비즈타워', '동탄비즈타워'],
        ['동탄IT타워', '동탄IT타워'],
        ['동탄 IT타워', '동탄IT타워'],
        ['듀캐슬타워동탄', '듀캐슬타워동탄'],
        ['듀캐슬타워 동탄', '듀캐슬타워동탄'],
        ['동탄 듀캐슬타워', '듀캐슬타워동탄'],
        ['동탄 더퍼스트타워', '더퍼스트타워'],
        ['동탄 에이팩시티', '에이팩시티'],
      ] as const) {
        expect(resolveTechnoValleyJisan(jisanList, alias)?.name).toBe(expectedCanonicalName);
      }

      const aliasCanonicalMeta = await generateTechnoValleyMetadata({
        searchParams: Promise.resolve({ jisan: 'sh square ii' }),
      });
      expect(aliasCanonicalMeta.alternates?.canonical).toBe(
        `https://dongtanview.com/technovalley/${encodeURIComponent('SH-SQUAREⅡ')}`
      );

      // Boundary item with unitCount: 0 and name already containing '지식산업센터'
      const zeroUnitMeta = await generateTechnoValleyMetadata({
        searchParams: Promise.resolve({ jisan: '(주)홈에이스산업 지식산업센터' }),
      });
      expect(String(zeroUnitMeta.title)).toBe(
        '(주)홈에이스산업 지식산업센터 (연면적 34,931.5㎡) — 제조·IT 입주 업종·취득세 35% 감면 | D-VIEW'
      );

      // Synthetic boundary item with 0 area, 0 units, and explicit representativeBusiness
      const customBoundaryMeta = buildTechnoValleySeoMetadata(
        [
          {
            seq: '99',
            name: '테스트R&D센터',
            totalFloorArea: 0,
            unitCount: 0,
            representativeBusiness: '반도체·AI R&D',
          },
        ],
        '테스트R&D센터',
        'https://dongtanview.com'
      );
      expect(String(customBoundaryMeta.title)).toBe(
        '테스트R&D센터 지식산업센터 — 반도체·AI R&D 입주 업종·취득세 35% 감면 | D-VIEW'
      );

      // Fallback & untrusted input guardrails: 0-arg, empty, whitespace, >200 chars, unknown, and XSS payload NEVER reflect
      for (const badInput of [
        undefined,
        '',
        '   ',
        'A'.repeat(250),
        '존재하지않는타워999',
        '<script>alert(1)</script>',
      ]) {
        const fallbackMeta =
          badInput === undefined
            ? await generateTechnoValleyMetadata()
            : await generateTechnoValleyMetadata({
                searchParams: Promise.resolve({ jisan: badInput }),
              });
        expect(String(fallbackMeta.title)).toContain('동탄테크노밸리 56개 지식산업센터 전수 카탈로그');
        expect(String(fallbackMeta.title)).not.toContain('<script>');
        expect(String(fallbackMeta.description)).not.toContain('<script>');
        expect(fallbackMeta.alternates?.canonical).toBe('https://dongtanview.com/technovalley');
      }

      // SSR Page Above-the-Fold spotlight, DOM order BEFORE TechnoValleyClient, real transaction fallback, & JSON-LD verification
      const MatchedPageJsx = await TechnoValleyPage({
        searchParams: Promise.resolve({ jisan: 'SH SQUAREⅡ' }),
      });
      const matchedRender = render(MatchedPageJsx);
      const mockHeaderEl = matchedRender.getByTestId('mock-lounge-header');
      const mockClientEl = matchedRender.getByTestId('mock-technovalley-client');
      expect(mockClientEl.getAttribute('data-selected-jisan')).toBe('SH SQUAREⅡ');
      const spotlight = matchedRender.container.querySelector('#technovalley-selected-jisan-ssr');
      expect(spotlight).not.toBeNull();
      // Above-the-Fold DOM order invariant: LoungeHeader MUST precede #technovalley-selected-jisan-ssr, which MUST precede TechnoValleyClient
      expect(
        Boolean(mockHeaderEl.compareDocumentPosition(spotlight!) & Node.DOCUMENT_POSITION_FOLLOWING)
      ).toBe(true);
      expect(
        Boolean(spotlight!.compareDocumentPosition(mockClientEl) & Node.DOCUMENT_POSITION_FOLLOWING)
      ).toBe(true);
      expect(matchedRender.container.querySelectorAll('h1').length).toBe(1);
      expect(spotlight?.textContent).toContain('SH SQUAREⅡ 지식산업센터');
      expect(spotlight?.textContent).toContain('35,576.2㎡');
      expect(spotlight?.textContent).toContain('453실');
      expect(spotlight?.textContent).toContain('등록된 실거래 내역이 없습니다.');
      expect(spotlight?.textContent).toContain('취득세 35% 감면');
      expect(matchedRender.container.querySelectorAll('.font-mono').length).toBe(0);
      expect(matchedRender.container.querySelectorAll('#jisan-catalog tbody tr').length).toBe(56);
      const highlightedRows = matchedRender.container.querySelectorAll(
        '#jisan-catalog tbody tr[aria-current="true"]'
      );
      expect(highlightedRows.length).toBe(1);
      expect(highlightedRows[0].textContent).toContain('SH SQUAREⅡ');
      // All 56 catalog links point to static /technovalley/[slug] instead of ?jisan=
      expect(
        matchedRender.container.querySelectorAll(
          '#jisan-catalog tbody a[href^="/technovalley/"]'
        ).length
      ).toBe(56);
      expect(
        matchedRender.container.querySelectorAll(
          '#jisan-catalog tbody a[href^="/technovalley?jisan="]'
        ).length
      ).toBe(0);

      const matchedJsonLd = JSON.parse(
        matchedRender.container.querySelector('script[type="application/ld+json"]')?.innerHTML ||
          '{}'
      );
      expect(
        matchedJsonLd['@graph'].some(
          (n: { '@id'?: string; url?: string }) =>
            typeof n['@id'] === 'string' &&
            n['@id'].endsWith('#selected-center') &&
            n.url === `https://dongtanview.com/technovalley/${encodeURIComponent('SH-SQUAREⅡ')}`
        )
      ).toBe(true);
      matchedRender.unmount();

      // Verify real MOLIT sale transaction binding & 35% acquisition tax calculation in SSR TechnoValleyPage
      const realTxSamples: JisanOfficeTransactionItem[] = [
        {
          date: '2026-09-18',
          type: '매매',
          sizeSqM: 89.42,
          floor: 7,
          price: '3억 2,000만원',
          priceRaw: 32000,
          buildingName: '동탄 SK V1 center',
          jibun: '영천동 853-1',
        },
        {
          date: '2026-08-05',
          type: '임대',
          sizeSqM: 89.42,
          floor: 5,
          price: '보증금 2,000만 / 월세 150만',
          priceRaw: 150,
          buildingName: '동탄 SK V1 center',
          jibun: '영천동 853-1',
        },
      ];
      const SkV1PageJsx = await TechnoValleyPage({
        searchParams: Promise.resolve({ jisan: '동탄 SK V1 center' }),
        initialTransactions: realTxSamples,
      });
      const skV1Render = render(SkV1PageJsx);
      const skV1RealTxEl = skV1Render.container.querySelector('#technovalley-selected-jisan-real-tx');
      const skV1TaxEl = skV1Render.container.querySelector('#technovalley-selected-jisan-tax-summary');
      expect(skV1RealTxEl?.textContent).toContain('3억 2,000만원');
      expect(skV1RealTxEl?.textContent).toContain('2026-09-18');
      expect(skV1RealTxEl?.textContent).toContain('89.42㎡');
      expect(skV1RealTxEl?.textContent).not.toContain('보증금');
      // 32,000만원 * 4.6% = 1,472만원; 35% 감면 절감액 = Math.round(1472 * 0.35) = 515만원
      expect(skV1TaxEl?.textContent).toContain('515만원');
      skV1Render.unmount();

      // Verify lot-number matching when MOLIT omits buildingName ('미상 건물') with dong-prefixed jibun,
      // rejects unrelated building names on the same lot, and disambiguates multi-block centers (동탄역 메가비즈타워 A/B/C동)
      const skV1Item = jisanList.find((i) => i.name === '동탄 SK V1 center')!;
      expect(
        matchJisanOfficeTransactions(skV1Item, [
          {
            date: '2026-10-01',
            type: '매매',
            sizeSqM: 72.5,
            floor: 8,
            price: '2억 9,500만원',
            priceRaw: 29500,
            buildingName: '미상 건물',
            jibun: '영천동 853-1',
          },
          {
            date: '2026-10-02',
            type: '매매',
            sizeSqM: 72.5,
            floor: 4,
            price: '2억 4,000만원',
            priceRaw: 24000,
            buildingName: '우성르보아타워',
            jibun: '853-1',
          },
        ])
      ).toHaveLength(1);

      const megaBizB = resolveTechnoValleyJisan(jisanList, '동탄 메가비즈타워 B동')!;
      const megaBizA = resolveTechnoValleyJisan(jisanList, '동탄 메가비즈타워')!;
      expect(megaBizA?.name).toBe('동탄역 메가비즈타워 A동');
      expect(megaBizB?.name).toBe('동탄역 메가비즈타워 B동');
      const megaBizBlockTx: JisanOfficeTransactionItem[] = [
        {
          date: '2026-09-20',
          type: '매매',
          sizeSqM: 60.12,
          floor: 5,
          price: '2억 1,000만원',
          priceRaw: 21000,
          buildingName: '동탄역 메가비즈타워',
          jibun: '영천동 873-2',
        },
      ];
      expect(matchJisanOfficeTransactions(megaBizB, megaBizBlockTx)).toHaveLength(1);
      expect(matchJisanOfficeTransactions(megaBizA, megaBizBlockTx)).toHaveLength(0);

      // Verify dashboard/explorer aliases resolve deterministically
      expect(resolveTechnoValleyJisan(jisanList, '금강 IX타워')?.name).toBe(
        '동탄금강펜테리움 IX타워'
      );
      expect(resolveTechnoValleyJisan(jisanList, '현대 실리콘앨리')?.name).toBe(
        '현대 실리콘앨리 동탄'
      );
      expect(resolveTechnoValleyJisan(jisanList, '동탄 헤센IT타워')?.name).toBe(
        '신동탄 헤센IT타워'
      );
      expect(resolveTechnoValleyJisan(jisanList, '동탄 M-TOPIA')?.name).toBe(
        '동탄 2 M-TOPIA 지식산업센터'
      );

      // Verify real TechnoValleyClient renders above-the-fold #technovalley-selected-jisan-hero-banner with real transaction & tax summary when selectedJisan is passed
      const ActualTechnoValleyClient = jest.requireActual(
        '@/app/technovalley/TechnoValleyClient'
      ).default as React.ComponentType<{
        selectedJisan?: (typeof jisanList)[number] | null;
        initialTransactions?: JisanOfficeTransactionItem[];
        hideHeader?: boolean;
      }>;
      const shItem = jisanList.find((i) => i.name === 'SH SQUAREⅡ')!;
      const clientSelectedRender = render(
        <ActualTechnoValleyClient selectedJisan={shItem} initialTransactions={[]} hideHeader={true} />
      );
      expect(clientSelectedRender.queryByTestId('mock-lounge-header')).toBeNull();
      const heroBanner = clientSelectedRender.container.querySelector(
        '#technovalley-selected-jisan-hero-banner'
      );
      expect(heroBanner).not.toBeNull();
      expect(heroBanner?.textContent).toContain('SH SQUAREⅡ 지식산업센터');
      expect(heroBanner?.textContent).toContain('35,576.2㎡');
      expect(heroBanner?.textContent).toContain('453실');
      expect(heroBanner?.textContent).toContain('취득세 35% 감면');
      expect(heroBanner?.textContent).toContain('등록된 실거래 내역이 없습니다.');
      expect(clientSelectedRender.container.querySelectorAll('.font-mono').length).toBe(0);
      clientSelectedRender.unmount();

      const clientWithTxRender = render(
        <ActualTechnoValleyClient
          selectedJisan={skV1Item}
          initialTransactions={matchJisanOfficeTransactions(skV1Item, realTxSamples)}
        />
      );
      expect(
        clientWithTxRender.container.querySelector('#technovalley-client-jisan-real-tx')?.textContent
      ).toContain('3억 2,000만원');
      expect(
        clientWithTxRender.container.querySelector('#technovalley-client-jisan-tax-summary')?.textContent
      ).toContain('515만원');
      clientWithTxRender.unmount();

      const clientDefaultRender = render(<ActualTechnoValleyClient selectedJisan={null} />);
      expect(
        clientDefaultRender.container.querySelector('#technovalley-selected-jisan-hero-banner')
      ).toBeNull();
      clientDefaultRender.unmount();

      const UntrustedPageJsx = await TechnoValleyPage({
        searchParams: Promise.resolve({ jisan: '<img src=x onerror=alert(1)>' }),
      });
      const untrustedRender = render(UntrustedPageJsx);
      expect(untrustedRender.container.querySelector('#technovalley-selected-jisan-ssr')).toBeNull();
      expect(untrustedRender.container.querySelectorAll('h1').length).toBe(1);
      expect(untrustedRender.container.innerHTML).not.toContain('onerror=alert(1)');
      untrustedRender.unmount();
    });

    it('5) maps live GSC zero-click queries (with or without page URL) to exact optimized routes and guards against incidental or untrusted ?jisan= parameters', async () => {
      const txSummary = await getTxSummaryData();
      const aptKeys = Object.keys(txSummary);

      expect(
        recommendDviewSeoAction(
          { query: '동탄 집값 그래프', clicks: 0, impressions: 10, ctr: 0, position: 1 },
          aptKeys
        ).targetRoute
      ).toBe('/');
      expect(
        recommendDviewSeoAction(
          { query: '동탄 아파트 시세', clicks: 0, impressions: 15, ctr: 0, position: 7 },
          aptKeys
        ).targetRoute
      ).toBe('/');
      expect(
        recommendDviewSeoAction(
          { query: '1동탄 2동탄', clicks: 0, impressions: 14, ctr: 0, position: 6.2 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-1-vs-2-comparison');
      expect(
        recommendDviewSeoAction(
          { query: '1동탄 2동탄 차이', clicks: 0, impressions: 12, ctr: 0, position: 5.5 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-1-vs-2-comparison');
      expect(
        recommendDviewSeoAction(
          { query: '1동탄', clicks: 0, impressions: 9, ctr: 0, position: 7.7 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-1-vs-2-comparison');
      expect(
        recommendDviewSeoAction(
          { query: '동탄 학군지', clicks: 0, impressions: 5, ctr: 0, position: 6.6 },
          aptKeys
        ).targetRoute
      ).toBe('/guide/dongtan-school-zone-top-apartments');
      expect(
        recommendDviewSeoAction(
          { query: '동뷰', clicks: 0, impressions: 3, ctr: 0, position: 1.7 },
          aptKeys
        ).targetRoute
      ).toBe('/about');
      expect(
        recommendDviewSeoAction(
          { query: '동탄 기업 리스트', clicks: 0, impressions: 4, ctr: 0, position: 1.0 },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley');
      // Live GSC multi-dimension quirk: generic hub query '동탄 기업 리스트' landed on an incidental ?jisan= URL -> must route to /technovalley hub
      expect(
        recommendDviewSeoAction(
          {
            query: '동탄 기업 리스트',
            page: 'https://dongtanview.com/technovalley?jisan=%EB%8F%99%ED%83%84%20GTOWER',
            clicks: 0,
            impressions: 6,
            ctr: 0,
            position: 1.0,
          },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley');
      // Untrusted ?jisan= in row.page must never leak into targetRoute or recommendedAction
      const untrustedJisanAction = recommendDviewSeoAction(
        {
          query: '동탄 지식산업센터',
          page: 'https://dongtanview.com/technovalley?jisan=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
          clicks: 0,
          impressions: 3,
          ctr: 0,
          position: 5.0,
        },
        aptKeys
      );
      expect(untrustedJisanAction.targetRoute).toBe('/technovalley');
      expect(untrustedJisanAction.recommendedAction).not.toContain('<script>');
      // Page-less GSC Queries.csv rows for specific Jisan centers must route to static /technovalley/<slug> instead of /explore
      expect(
        recommendDviewSeoAction(
          { query: 'SH SQUAREⅡ', clicks: 0, impressions: 5, ctr: 0, position: 2.0 },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley/SH-SQUAREⅡ');
      expect(
        recommendDviewSeoAction(
          { query: 'sh 스퀘어 2', clicks: 0, impressions: 5, ctr: 0, position: 2.0 },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley/SH-SQUAREⅡ');
      expect(
        recommendDviewSeoAction(
          { query: '동탄 GTOWER 입주 업종', clicks: 0, impressions: 4, ctr: 0, position: 3.1 },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley/동탄-GTOWER');
      expect(
        recommendDviewSeoAction(
          { query: '현대 실리콘앨리 동탄 취득세', clicks: 0, impressions: 4, ctr: 0, position: 3.5 },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley/현대-실리콘앨리-동탄');
      expect(
        recommendDviewSeoAction(
          {
            query: '디뷰 부동산',
            page: 'https://dongtanview.com/about',
            clicks: 0,
            impressions: 6,
            ctr: 0,
            position: 6.4,
          },
          aptKeys
        ).targetRoute
      ).toBe('/about');
      expect(
        recommendDviewSeoAction(
          {
            query: 'sh 스퀘어 2',
            page: 'https://dongtanview.com/technovalley?jisan=SH%20SQUARE%E2%85%A1',
            clicks: 0,
            impressions: 5,
            ctr: 0,
            position: 2.1,
          },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley/SH-SQUAREⅡ');
      expect(
        recommendDviewSeoAction(
          {
            query: '동탄 SK V1 center',
            page: 'https://dongtanview.com/technovalley/%EB%8F%99%ED%83%84-SK-V1-center',
            clicks: 0,
            impressions: 12,
            ctr: 0,
            position: 3.0,
          },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley/동탄-SK-V1-center');
      expect(
        recommendDviewSeoAction(
          {
            query: '동탄 sk v1 취득세',
            page: 'https://dongtanview.com/technovalley?jisan=%EB%8F%99%ED%83%84%20SK%20V1',
            clicks: 0,
            impressions: 8,
            ctr: 0,
            position: 2.4,
          },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley/동탄-SK-V1-center');
      expect(
        recommendDviewSeoAction(
          {
            query: '금강펜테리움 ix타워 분양가',
            page: 'https://dongtanview.com/technovalley?jisan=%EA%B8%88%EA%B0%95%ED%8E%9C%ED%85%8C%EB%A6%AC%EC%9B%80%20IX%ED%83%80%EC%9B%8C',
            clicks: 0,
            impressions: 9,
            ctr: 0,
            position: 2.8,
          },
          aptKeys
        ).targetRoute
      ).toBe('/technovalley/동탄금강펜테리움-IX타워');
    });
  });

  describe('8. Guide Article -> Apartment Detail Conversion & Real-Time Mini Preview Cards (/boost)', () => {
    it('builds 100% real-data mini preview models for representative complexes and guards edge cases', async () => {
      const txSummary = await getTxSummaryData();

      // 1. Representative complexes: 동탄역 시범 리슈빌 & 동탄역 롯데캐슬
      const richevilleRaw = txSummary['동탄역시범리슈빌아파트'];
      expect(richevilleRaw).toBeDefined();
      expect(richevilleRaw.latestPriceEok).toMatch(/^(\d+억([\d,]+)?|[\d,]+만)$/);
      expect(richevilleRaw.latestRentDepositEok).toMatch(/^(\d+억([\d,]+)?|[\d,]+만)$/);

      const richeville = buildGuideAptMiniPreview('동탄역시범리슈빌아파트', txSummary);
      expect(richeville).not.toBeNull();
      expect(richeville?.displayName).toBe('동탄역 시범 리슈빌');
      expect(richeville?.canonicalSlug).toBe('동탄역시범리슈빌아파트');
      expect(richeville?.dong).toBe('청계동');
      expect(richeville?.zoneId).toBe('community');
      expect(richeville?.latestPrice).toBeGreaterThan(0);
      expect(richeville?.latestPriceStr).toBe(richevilleRaw.latestPriceEok);
      expect(richeville?.latestRentStr).toBe(richevilleRaw.latestRentDepositEok);

      const richevilleSalesBase =
        richevilleRaw.avg1MPrice || richevilleRaw.avg3MPrice || richevilleRaw.latestPrice;
      const richevilleRentBase =
        richevilleRaw.avg1MRentDeposit ||
        richevilleRaw.avg3MRentDeposit ||
        richevilleRaw.latestRentDeposit ||
        0;
      expect(richeville?.jeonseRatio).toBe(
        Math.round((richevilleRentBase / richevilleSalesBase) * 100)
      );
      expect(richeville?.perValue).toBe((richevilleSalesBase / richevilleRentBase).toFixed(2));
      expect(richeville?.txCount).toBeGreaterThanOrEqual(350);
      expect(richeville?.href).toBe(
        `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );

      const lotteCastleRaw = txSummary['동탄역롯데캐슬'];
      expect(lotteCastleRaw).toBeDefined();
      expect(lotteCastleRaw.latestPriceEok).toMatch(/^(\d+억([\d,]+)?|[\d,]+만)$/);

      const lotteCastle = buildGuideAptMiniPreview('동탄역롯데캐슬', txSummary);
      expect(lotteCastle).not.toBeNull();
      expect(lotteCastle?.displayName).toBe('동탄역 롯데캐슬');
      expect(lotteCastle?.canonicalSlug).toBe('동탄역롯데캐슬');
      expect(lotteCastle?.dong).toBe('여울동');
      expect(lotteCastle?.zoneId).toBe('gbcx');
      expect(lotteCastle?.latestPriceStr).toBe(lotteCastleRaw.latestPriceEok);
      expect(lotteCastle?.txCount).toBeGreaterThan(0);

      // Spaced alias resolution works identically
      const spacedRicheville = buildGuideAptMiniPreview('동탄역 시범 리슈빌', txSummary);
      expect(spacedRicheville?.canonicalSlug).toBe('동탄역시범리슈빌아파트');
      expect(spacedRicheville?.displayName).toBe('동탄역 시범 리슈빌');

      // Disambiguates 석우동 롯데캐슬 -> 예당마을 롯데캐슬
      expect(getGuideAptDisplayName('롯데캐슬', '석우동')).toBe('예당마을 롯데캐슬');
      expect(getGuideAptDisplayName('')).toBe('');
      expect(getGuideAptDisplayName('   ')).toBe('');

      // 2. Date formatting edge cases
      expect(formatGuideTxDate('2026-03-31')).toBe('2026.03.31');
      expect(formatGuideTxDate('20260704')).toBe('2026.07.04');
      expect(formatGuideTxDate('2026.03.31')).toBe('2026.03.31');
      expect(formatGuideTxDate('202603')).toBe('2026.03');
      expect(formatGuideTxDate('')).toBe('정보 없음');
      expect(formatGuideTxDate(null)).toBe('정보 없음');
      expect(formatGuideTxDate(undefined)).toBe('정보 없음');

      // 3. Edge cases: empty, unknown, rent-only (0 sale price), and cross-pyeong ratio > 100%
      expect(buildGuideAptMiniPreview('', txSummary)).toBeNull();
      expect(buildGuideAptMiniPreview('   ', txSummary)).toBeNull();
      expect(buildGuideAptMiniPreview('존재하지않는유령단지_999', txSummary)).toBeNull();

      const customEdgeMap = {
        전세전용테스트단지: {
          dong: '청계동',
          txCount: 12,
          latestPrice: 0,
          latestPriceEok: '0만',
          latestDate: '',
          latestArea: 84.99,
          latestFloor: 15,
          latestRentDeposit: 45000,
          latestRentDepositEok: '4억 5,000만',
        },
        평형역전테스트단지: {
          dong: '여울동',
          txCount: 8,
          latestPrice: 50000,
          latestPriceEok: '5억',
          latestDate: '2026-02-15',
          latestArea: 59.9,
          latestFloor: 10,
          latestRentDeposit: 65000,
          latestRentDepositEok: '6억 5,000만',
        },
      };

      const rentOnlyPreview = buildGuideAptMiniPreview('전세전용테스트단지', customEdgeMap);
      expect(rentOnlyPreview).not.toBeNull();
      expect(rentOnlyPreview?.latestPriceStr).toBe('정보 없음');
      expect(rentOnlyPreview?.latestRentStr).toBe('4억 5,000만');
      expect(rentOnlyPreview?.jeonseRatio).toBe(0);
      expect(rentOnlyPreview?.perValue).toBeNull();
      expect(rentOnlyPreview?.latestDate).toBe('정보 없음');

      const invertedRatioPreview = buildGuideAptMiniPreview('평형역전테스트단지', customEdgeMap);
      expect(invertedRatioPreview).not.toBeNull();
      expect(invertedRatioPreview?.latestPriceStr).toBe('5억');
      expect(invertedRatioPreview?.jeonseRatio).toBe(0);
      expect(invertedRatioPreview?.perValue).toBeNull();

      // 4. Default txMap argument (without explicit txSummary) resolves 100% real metrics & GuideIndexPage renders live price badges
      const defaultArgRicheville = buildGuideAptMiniPreview('동탄역시범리슈빌아파트');
      expect(defaultArgRicheville).not.toBeNull();
      expect(defaultArgRicheville?.latestPrice).toBe(168000);
      expect(defaultArgRicheville?.latestPriceStr).toBe('16억8,000');
      expect(defaultArgRicheville?.latestRentStr).toBe('3억9,900');
      expect(defaultArgRicheville?.jeonseRatio).toBe(42);
      expect(defaultArgRicheville?.perValue).toBe('2.37');
      expect(defaultArgRicheville?.txCount).toBe(356);

      const defaultArgSections = resolveGuideZoneSectionPreviews(GUIDE_ARTICLES[0]);
      expect(defaultArgSections.length).toBe(2);
      expect(defaultArgSections[1].items[0].latestPriceStr).toBe('16억8,000');

      const hubRender = render(<GuideIndexPage />);
      expect(hubRender.container.textContent).toContain('· 26억2,000');
      expect(hubRender.container.textContent).toContain('· 16억8,000');
      hubRender.unmount();

      // 5. Zero-transaction entry guard returns null instead of emitting a ghost '정보 없음' card
      const zeroTxMap = {
        동탄역시범리슈빌아파트: {
          dong: '청계동',
          latestPrice: 0,
          latestRentDeposit: 0,
          txCount: 0,
        },
      };
      expect(buildGuideAptMiniPreview('동탄역시범리슈빌아파트', zeroTxMap)).toBeNull();
      const emptyResolvedSections = resolveGuideZoneSectionPreviews(
        {
          ...GUIDE_ARTICLES[0],
          zoneSectionPreviews: [
            {
              sectionHeadingMatch: '(1) 동탄1신도시',
              sectionTitle: '무거래 테스트 섹션',
              zoneId: 'community',
              apartments: ['동탄역시범리슈빌아파트'],
            },
          ],
        },
        zeroTxMap
      );
      expect(emptyResolvedSections).toEqual([]);
    });

    it('renders real-time transaction mini preview cards in both zone description sections and guide body bottom across all 8 guides', async () => {
      const txSummary = await getTxSummaryData();

      for (const article of GUIDE_ARTICLES) {
        const resolvedSections = resolveGuideZoneSectionPreviews(article, txSummary);
        expect(resolvedSections.length).toBeGreaterThanOrEqual(2);

        const ui = await GuideArticlePage({
          params: Promise.resolve({ slug: article.slug }),
        });
        const { container, unmount } = render(ui);

        const bodyEl = container.querySelector('#guide-article-body');
        expect(bodyEl).not.toBeNull();

        // 1. In-body zone description section preview blocks
        const zonePreviewSections = bodyEl!.querySelectorAll(
          '[data-testid="guide-zone-section-preview"]'
        );
        expect(zonePreviewSections.length).toBe(resolvedSections.length);

        const zoneCards = bodyEl!.querySelectorAll(
          '[data-testid="guide-apt-preview-card-zone_section"]'
        );
        expect(zoneCards.length).toBeGreaterThanOrEqual(4);
        expect(bodyEl!.querySelectorAll('.font-mono').length).toBe(0);

        // Every GuideAptPreviewCard enforces Zero-CLS min-h-[158px] sm:min-h-[168px] & standard Slate tokens
        zoneCards.forEach((card) => {
          expect(card.className).toContain('min-h-[158px]');
          expect(card.className).toContain('sm:min-h-[168px]');
          expect(card.className).toContain('bg-slate-50/90');
        });

        // Inline apartment deep-links (`data-testid="guide-inline-apt-link"`) render in all 8 guides
        const inlineAptLinks = bodyEl!.querySelectorAll('[data-testid="guide-inline-apt-link"]');
        expect(inlineAptLinks.length).toBeGreaterThanOrEqual(2);

        // 2. Bottom-of-guide-body representative apartment mini preview cards
        const bottomSection = container.querySelector('#guide-bottom-apt-preview-cards');
        expect(bottomSection).not.toBeNull();
        expect(bottomSection?.getAttribute('data-testid')).toBe(
          'guide-bottom-apt-preview-cards'
        );
        expect(bottomSection!.querySelectorAll('.font-mono').length).toBe(0);

        const bottomCards = bottomSection!.querySelectorAll(
          '[data-testid="guide-apt-preview-card-article_bottom"]'
        );
        expect(bottomCards.length).toBe((article.featuredApartments || []).length);

        // 3. Contextual mid-article conversion AdSlot is rendered inside bottom preview section
        const midAdSlot = bottomSection!.querySelector(
          '[data-testid="guide-article-adslot-mid"]'
        );
        expect(midAdSlot).not.toBeNull();

        // 4. Specific assertions on flagship comparison guide (dongtan-1-vs-2-comparison)
        if (article.slug === 'dongtan-1-vs-2-comparison') {
          expect(bodyEl!.textContent).toContain('동탄역 시범 리슈빌');
          expect(bodyEl!.textContent).toContain('동탄역 롯데캐슬');
          expect(bodyEl!.textContent).toContain(txSummary['동탄역시범리슈빌아파트'].latestPriceEok);
          expect(bodyEl!.textContent).toContain(txSummary['동탄역롯데캐슬'].latestPriceEok);

          expect(bottomSection!.textContent).toContain('동탄역 시범 리슈빌');
          expect(bottomSection!.textContent).toContain('동탄역 롯데캐슬');
          expect(bottomSection!.textContent).toContain('솔빛마을 서해그랑블');
        }

        // 5. JSON-LD Article schema includes mentions of featured ApartmentComplexes
        const jsonLd = buildGuideArticleJsonLd(article);
        const articleSchema = jsonLd['@graph'].find((n) => n['@type'] === 'Article') as
          | Record<string, unknown>
          | undefined;
        expect(articleSchema).toBeDefined();
        const mentions = articleSchema?.mentions as Array<Record<string, unknown>> | undefined;
        expect(Array.isArray(mentions)).toBe(true);
        expect(mentions!.length).toBe((article.featuredApartments || []).length);
        expect(mentions![0]['@type']).toBe('ApartmentComplex');
        expect(String(mentions![0].url)).toContain('/apartment/');

        unmount();
      }
    });

    it('resolves parenthetical dong suffixes & shorthand aliases in renderInlineBold and preserves H3 zone preview placement across non-matching H4 subheadings', () => {
      expect(normalizeGuideAptName('동탄역 시범 리슈빌(청계동)')).toBe('동탄역시범리슈빌');
      expect(normalizeGuideAptName('시범우남')).toBe('동탄역시범우남퍼스트빌');
      expect(normalizeGuideAptName('시범한화꿈에그린')).toBe(
        '동탄역시범한화꿈에그린프레스티지'
      );

      const lookup = new Map<string, string>([
        [normalizeGuideAptName('동탄역시범리슈빌아파트'), '동탄역시범리슈빌아파트'],
        [normalizeGuideAptName('동탄역시범우남퍼스트빌아파트'), '동탄역시범우남퍼스트빌아파트'],
      ]);
      const inlineRender = render(
        <div>
          {renderInlineBold(
            '청계동 **동탄역 시범 리슈빌(청계동)** 및 **시범우남** 비교',
            lookup
          )}
        </div>
      );
      const links = inlineRender.container.querySelectorAll(
        '[data-testid="guide-inline-apt-link"]'
      );
      expect(links).toHaveLength(2);
      expect(links[0].getAttribute('href')).toBe(
        `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );
      expect(links[1].getAttribute('href')).toBe(
        `/apartment/${encodeURIComponent('동탄역시범우남퍼스트빌아파트')}`
      );
      inlineRender.unmount();

      // H3-matched preview with internal non-matching H4 subheadings flushes AFTER the H4 paragraphs (before ---), not before the first H4
      const previewItem = buildGuideAptMiniPreview('동탄역시범리슈빌아파트')!;
      const bodyNodes = renderGuideBodyContent(
        [
          '### 1. 청계동 시범단지 분석',
          '도입부 설명 문단입니다.',
          '#### (a) 세부 통학 동선',
          '아인초 도보 통학 설명 문단입니다.',
          '---',
          '### 2. 결론',
        ].join('\n'),
        {
          guideSlug: 'dongtan-1-vs-2-comparison',
          zoneSectionPreviews: [
            {
              sectionHeadingMatch: '1. 청계동 시범단지 분석',
              sectionTitle: '시범단지 프리뷰',
              zoneId: 'community',
              zoneName: '커뮤니티시범단지',
              items: [previewItem],
            },
          ],
          inlineSlugLookup: lookup,
        }
      );
      const sectionRender = render(<div>{bodyNodes}</div>);
      const h4El = sectionRender.container.querySelector('h4')!;
      const previewEl = sectionRender.container.querySelector(
        '[data-testid="guide-zone-section-preview"]'
      )!;
      expect(h4El).not.toBeNull();
      expect(previewEl).not.toBeNull();
      // DOCUMENT_POSITION_FOLLOWING (4): previewEl appears AFTER h4El in DOM order
      expect(Boolean(h4El.compareDocumentPosition(previewEl) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
        true
      );
      sectionRender.unmount();
    });

    it('emits virtual pageview and ad_telemetry GUIDE_PREVIEW_CLICK with apartment_name and dong when a GuideAptPreviewCard is clicked, and suppresses virtual pageview on modified/new-tab clicks', async () => {
      const txSummary = await getTxSummaryData();
      const richeville = buildGuideAptMiniPreview('동탄역시범리슈빌아파트', txSummary)!;
      expect(richeville).not.toBeNull();

      resetVirtualPageViewLedger();
      const gtagMock = jest.fn();
      window.gtag = gtagMock;
      window.dataLayer = [];

      const prevNodeEnv = process.env.NODE_ENV;
      const prevGaId = process.env.NEXT_PUBLIC_GA_ID;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
      process.env.NEXT_PUBLIC_GA_ID = 'G-TEST123';

      try {
        const { getByTestId, unmount } = render(
          <GuideAptPreviewCard
            item={richeville}
            guideSlug="dongtan-1-vs-2-comparison"
            placement="zone_section"
            sectionTitle="동탄2신도시 시범단지·동탄역권 대표 단지 실시간 실거래 프리뷰"
          />
        );

        const cardEl = getByTestId('guide-apt-preview-card-zone_section');
        expect(cardEl.getAttribute('href')).toBe(
          `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
        );
        expect(cardEl.textContent).toContain('동탄역 시범 리슈빌');
        expect(cardEl.textContent).toContain(richeville.latestPriceStr);
        expect(cardEl.textContent).toContain('청계동');

        // Prevent jsdom navigation warning on anchor click while allowing React onClick handler to run
        cardEl.addEventListener('click', (e) => e.preventDefault());
        fireEvent.click(cardEl);

        // 1. Session pageviews ledger incremented with target apartment detail path
        const pageviews = getVirtualPageViewLedger();
        expect(pageviews).toHaveLength(1);
        expect(pageviews[0].path).toBe(
          `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
        );
        expect(pageviews[0].params?.page_title).toContain('동탄역 시범 리슈빌');

        // 2. GA4 page_view & guide_apt_preview_click events fired
        expect(gtagMock).toHaveBeenCalledWith(
          'event',
          'page_view',
          expect.objectContaining({
            page_path: `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`,
            virtual_pv: 1,
            adsense_virtual_pv: 1,
          })
        );
        expect(gtagMock).toHaveBeenCalledWith(
          'event',
          'guide_apt_preview_click',
          expect.objectContaining({
            guide_slug: 'dongtan-1-vs-2-comparison',
            placement: 'zone_section',
            apartment_name: '동탄역시범리슈빌아파트',
            display_name: '동탄역 시범 리슈빌',
            dong: '청계동',
          })
        );

        // 3. ad_telemetry GUIDE_PREVIEW_CLICK event dispatched with apartment_name & dong (decoupled from pure ad CLICK)
        expect(gtagMock).toHaveBeenCalledWith(
          'event',
          'ad_telemetry',
          expect.objectContaining({
            slot_id:
              'guide_dongtan-1-vs-2-comparison_zone_section_동탄역시범리슈빌아파트',
            event_type: 'GUIDE_PREVIEW_CLICK',
            placement_slot_id: 'guide_zone_section',
            apartment_name: '동탄역시범리슈빌아파트',
            dong: '청계동',
          })
        );

        // 4. Modified clicks (Ctrl+Click, Meta+Click) do NOT double-count virtual pageview, while still recording click telemetry
        gtagMock.mockClear();
        fireEvent.click(cardEl, { ctrlKey: true });
        fireEvent.click(cardEl, { metaKey: true });
        expect(getVirtualPageViewLedger()).toHaveLength(1);
        expect(gtagMock).not.toHaveBeenCalledWith('event', 'page_view', expect.anything());
        expect(gtagMock).toHaveBeenCalledWith(
          'event',
          'guide_apt_preview_click',
          expect.objectContaining({
            apartment_name: '동탄역시범리슈빌아파트',
          })
        );
        expect(gtagMock).toHaveBeenCalledWith(
          'event',
          'ad_telemetry',
          expect.objectContaining({
            event_type: 'GUIDE_PREVIEW_CLICK',
            apartment_name: '동탄역시범리슈빌아파트',
          })
        );

        unmount();
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', { value: prevNodeEnv, configurable: true });
        process.env.NEXT_PUBLIC_GA_ID = prevGaId;
      }
    });
  });

  describe('Step 4: 184 Apartment Detail Pages FAQPage JSON-LD & Similar Per-Pyeong / School-Zone SSR Cross-Linking', () => {
    it('enriches /apartment/동탄더샵레이크에듀타운 and /apartment/동탄역롯데캐슬 with MOLIT latest trade summary, search-intent keywords, and FAQPage JSON-LD', async () => {
      const targetComplexes = ['동탄더샵레이크에듀타운', '동탄역롯데캐슬'];

      for (const aptName of targetComplexes) {
        const [pageData, meta] = await Promise.all([
          getApartmentPageData(aptName),
          buildApartmentSeoMetadata(aptName, undefined, 'https://dongtanview.com'),
        ]);

        // 1. Canonical URL unification
        const expectedCanonicalUrl = `https://dongtanview.com/apartment/${encodeURIComponent(aptName)}`;
        expect(meta.alternates?.canonical).toBe(expectedCanonicalUrl);
        expect(meta.openGraph?.url).toBe(expectedCanonicalUrl);

        // 2. Title & Meta keywords reflect 실거래가 / 평당가 / 전세가율 / 배정 초등학교 / 호갱노노 비교
        const titleStr = String(meta.title);
        const descStr = String(meta.description);
        const keywordsStr = String(meta.keywords);

        expect(titleStr).toContain(aptName);
        expect(titleStr).toContain('실거래가');
        expect(titleStr).toContain('평당가');
        expect(titleStr).toContain('전세가율');
        expect(keywordsStr).toContain('평당가');
        expect(keywordsStr).toContain('배정 초등학교');
        expect(keywordsStr).toContain('호갱노노 비교');

        // 3. First paragraph (aiBriefing) reflects search-intent keywords + MOLIT latest trade summary (최근 거래일 · 최고가 · 직전 대비 변동액 · 평당가)
        expect(pageData.aiBriefing).toContain('실거래가');
        expect(pageData.aiBriefing).toContain('평당가');
        expect(pageData.aiBriefing).toContain('전세가율');
        expect(pageData.aiBriefing).toContain('배정 초등학교');
        expect(pageData.aiBriefing).toContain('호갱노노 비교');
        expect(pageData.aiBriefing).toMatch(/최근 거래일 \d{4}\.\d{2}\.\d{2}/);
        expect(pageData.aiBriefing).toContain('최고가');
        expect(pageData.aiBriefing).toContain('직전 대비 변동액');
        expect(descStr).toMatch(/최근 거래일 \d{4}\.\d{2}\.\d{2}/);

        // 4. FAQPage JSON-LD reflects the same search-intent keywords and MOLIT latest trade summary
        const jsonLd = buildApartmentJsonLd(pageData, 'https://dongtanview.com');
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        const faqNode = graph.find((n) => n['@type'] === 'FAQPage');
        expect(faqNode).toBeDefined();
        expect(faqNode?.['@id']).toBe(`${expectedCanonicalUrl}#faq`);

        const mainEntity = faqNode?.mainEntity as Array<{
          '@type': string;
          name: string;
          acceptedAnswer: { '@type': string; text: string };
        }>;
        expect(mainEntity).toHaveLength(4);
        const combinedFaqText = mainEntity
          .map((q) => `${q.name} ${q.acceptedAnswer.text}`)
          .join(' ');

        expect(combinedFaqText).toContain('실거래가');
        expect(combinedFaqText).toContain('평당가');
        expect(combinedFaqText).toContain('전세가율');
        expect(combinedFaqText).toContain('배정 초등학교');
        expect(combinedFaqText).toContain('호갱노노 비교');
        expect(combinedFaqText).toMatch(/최근 거래일 \d{4}\.\d{2}\.\d{2}/);
        expect(combinedFaqText).toContain('최고가');
        expect(combinedFaqText).toContain('직전 대비 변동액');
      }
    });

    it('renders static SSR cross-linking sections (같은 동(권역) 내 평당가 유사 단지 TOP 5 & 인접 학군 경쟁 단지 비교) with canonical /apartment/<canonicalSlug> links', async () => {
      const allTxSummary = await getTxSummaryData();

      // Test on 동탄더샵레이크에듀타운 (송동, 왕배초등학교 배정)
      const PageJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '동탄더샵레이크에듀타운' }),
      });
      const { container, getByTestId, unmount } = render(PageJsx);

      const top5Section = getByTestId('apt-similar-per-pyeong-top5-ssr');
      const schoolSection = getByTestId('apt-school-zone-competitors-ssr');

      expect(top5Section.textContent).toContain('같은 동(권역) 내 평당가 유사 단지 TOP 5');
      expect(schoolSection.textContent).toContain('인접 학군 경쟁 단지 비교');
      expect(schoolSection.textContent).toContain('왕배초등학교');

      const top5Links = Array.from(top5Section.querySelectorAll('a[href^="/apartment/"]'));
      const schoolLinks = Array.from(schoolSection.querySelectorAll('a[href^="/apartment/"]'));

      expect(top5Links).toHaveLength(5);
      expect(schoolLinks).toHaveLength(5);

      for (const link of [...top5Links, ...schoolLinks]) {
        const href = link.getAttribute('href') || '';
        expect(href.startsWith('/apartment/')).toBe(true);
        const decodedSlug = decodeURIComponent(href.replace(/^\/apartment\//, ''));
        // Never self-links
        expect(decodedSlug).not.toBe('동탄더샵레이크에듀타운');
        // Strictly canonical slug present in tx-summary.json
        expect(allTxSummary[decodedSlug]).toBeDefined();
        expect(resolveCanonicalAptSlug(decodedSlug, { txMap: allTxSummary })).toBe(decodedSlug);
      }

      // First paragraph in SSR DOM contains MOLIT latest trade summary and search-intent keywords
      const reportSection = container.querySelector('#apt-ssr-comprehensive-report');
      expect(reportSection?.textContent).toContain('최근 거래일');
      expect(reportSection?.textContent).toContain('최고가');
      expect(reportSection?.textContent).toContain('직전 대비 변동액');
      expect(reportSection?.textContent).toContain('호갱노노 비교');

      unmount();
    });

    it('handles rent-only and ghost complexes gracefully in selectApartmentComparisonPeers and SSR cross-linking without NaN or self-links', async () => {
      const [allTxSummary, allByDong, allLocationScores] = await Promise.all([
        getTxSummaryData(),
        getApartmentsByDongData(),
        getLocationScoresData(),
      ]);

      const ghostPeers = selectApartmentComparisonPeers({
        aptName: '존재하지않는유령단지_999',
        canonicalSlug: '존재하지않는유령단지_999',
        allTxSummary,
        byDong: allByDong,
        allLocationScores,
      });

      expect(ghostPeers.sameZoneSimilarPerPyeongTop5).toHaveLength(5);
      expect(ghostPeers.schoolZoneCompetitors).toHaveLength(5);

      for (const peer of ghostPeers.sameZoneSimilarPerPyeongTop5) {
        expect(peer.perPyeongManwon).toBeGreaterThan(0);
        expect(peer.perPyeongStr).not.toBe('0만');
        expect(peer.canonicalSlug).not.toBe('존재하지않는유령단지_999');
      }

      // Unspaced display alias (e.g., '능동역경남아너스빌' -> canonical '동탄숲속마을자연앤경남아너스빌1124-0') must never self-link
      const aliasPeers = selectApartmentComparisonPeers({
        aptName: '능동역경남아너스빌',
        aptDong: '능동',
        allTxSummary,
        byDong: allByDong,
        allLocationScores,
      });
      for (const peer of [
        ...aliasPeers.sameZoneSimilarPerPyeongTop5,
        ...aliasPeers.schoolZoneCompetitors,
      ]) {
        expect(peer.canonicalSlug).not.toBe('동탄숲속마을자연앤경남아너스빌1124-0');
        expect(peer.name).not.toBe('능동역 경남아너스빌');
      }

      // 신동 (newtown) complex prioritizes actual 신동 peers rather than unrelated Dongtan 1 complexes
      const sindongPeers = selectApartmentComparisonPeers({
        aptName: 'e편한세상동탄파크아너스',
        canonicalSlug: 'e편한세상동탄파크아너스',
        aptDong: '신동',
        allTxSummary,
        byDong: allByDong,
        allLocationScores,
      });
      expect(sindongPeers.sameZoneSimilarPerPyeongTop5).toHaveLength(5);
      expect(sindongPeers.sameZoneSimilarPerPyeongTop5.every((p) => p.dong === '신동')).toBe(true);
      expect(sindongPeers.sameZoneSimilarPerPyeongTop5[0].canonicalSlug).toBe('동탄2디에트르포레');
      expect(sindongPeers.sameZoneSimilarPerPyeongTop5[0].perPyeongManwon).toBeGreaterThan(0);

      // Rent-only complex (동탄파크릭스A51-1BL아파트) produces clean Korean FAQPage & aiBriefing without broken "실거래 집계 중 수준입니다"
      const rentOnlyPageData = await getApartmentPageData('동탄파크릭스A51-1BL아파트');
      expect(rentOnlyPageData.aiBriefing).toContain('실거래가');
      expect(rentOnlyPageData.aiBriefing).toContain('평당가');
      expect(rentOnlyPageData.aiBriefing).toContain('전세가율');
      expect(rentOnlyPageData.aiBriefing).toContain('배정 초등학교');
      expect(rentOnlyPageData.aiBriefing).toContain('호갱노노 비교');
      expect(rentOnlyPageData.aiBriefing).toMatch(/최근 거래일 \d{4}\.\d{2}\.\d{2}/);
      expect(rentOnlyPageData.aiBriefing).toContain('최고가');
      expect(rentOnlyPageData.aiBriefing).toContain('직전 대비 변동액');

      const rentOnlyJsonLd = buildApartmentJsonLd(rentOnlyPageData, 'https://dongtanview.com');
      const rentOnlyGraph = rentOnlyJsonLd['@graph'] as Array<Record<string, unknown>>;
      const rentOnlyFaqNode = rentOnlyGraph.find((n) => n['@type'] === 'FAQPage');
      const rentOnlyFaqText = (
        rentOnlyFaqNode?.mainEntity as Array<{
          name: string;
          acceptedAnswer: { text: string };
        }>
      )
        .map((q) => `${q.name} ${q.acceptedAnswer.text}`)
        .join(' ');

      expect(rentOnlyFaqText).not.toContain('최근 매매 실거래가는 실거래 집계 중 수준입니다');
      expect(rentOnlyFaqText).toContain('현재 등록된 매매 실거래 내역이 없으며');
      expect(rentOnlyFaqText).toContain('최근 전월세 보증금 실거래가는');
    });
  });
});






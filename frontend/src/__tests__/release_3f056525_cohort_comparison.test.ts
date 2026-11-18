/**
 * @file release_3f056525_cohort_comparison.test.ts
 * @description Unit, boundary, and adversarial verification suite for commit `3f056525`
 * 7-day pre/post cohort comparison (`2026-11-11 ~ 2026-11-17` vs `2026-11-18 ~ 2026-11-24`).
 */
import crypto from 'crypto';
import fs from 'fs';
import {
  DEFAULT_3F056525_POST_WINDOW,
  DEFAULT_3F056525_PRE_WINDOW,
  ZERO_DENOMINATOR_LABEL,
  analyzeLiveReleaseCohortComparison,
  classifyOpenCalculatorTriggerFamily,
  compareGa4OpenCalculatorFunnel,
  compareGscCtrLift,
  computeExposureDenominators,
  computeGuardedComparison,
  computeGuardedRatePct,
  countInclusiveCalendarDays,
  createEmptyGa4WindowSnapshot,
  createEmptyGscWindowSnapshot,
  evaluateCohortWindowMaturity,
  formatKstIsoDate,
  isValidIsoCalendarDate,
  normalizeDviewRoutePath,
  normalizeGa4CompactDate,
  type Ga4CohortWindowSnapshot,
  type GscWindowSnapshot,
} from '@/lib/services/releaseCohortComparison';
import { fetchSearchConsoleAnalyticsRows } from '@/lib/repositories/searchConsole.repository';

describe('Commit 3f056525 — 7-Day Pre/Post Cohort Comparison Engine (GA4 open_calculator & GSC 0-Click CTR)', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('1. KST Timezone Boundary, Calendar Validation & Window Maturity (Strict Real Data Only)', () => {
    it('resolves KST date accurately across 00:00~08:59 KST when UTC is still the previous day', () => {
      // 2026-11-17T14:59:59Z == 2026-11-17T23:59:59+09:00 -> 2026-11-17
      expect(formatKstIsoDate(new Date('2026-11-17T14:59:59Z'))).toBe('2026-11-17');
      // 2026-11-17T15:00:00Z == 2026-11-18T00:00:00+09:00 -> 2026-11-18
      expect(formatKstIsoDate(new Date('2026-11-17T15:00:00Z'))).toBe('2026-11-18');
      // 2026-11-17T17:20:00Z == 2026-11-18T02:20:00+09:00 -> 2026-11-18
      expect(formatKstIsoDate(new Date('2026-11-17T17:20:00Z'))).toBe('2026-11-18');
    });

    it('rejects non-existent rollover dates (2026-02-30, 2026-11-31) and inverted ranges', () => {
      expect(isValidIsoCalendarDate('2026-11-18')).toBe(true);
      expect(isValidIsoCalendarDate('2026-02-29')).toBe(false); // 2026 is not a leap year
      expect(isValidIsoCalendarDate('2026-02-30')).toBe(false);
      expect(isValidIsoCalendarDate('2026-11-31')).toBe(false);
      expect(isValidIsoCalendarDate('2026/11/18')).toBe(false);
      expect(countInclusiveCalendarDays('2026-11-11', '2026-11-17')).toBe(7);
      expect(countInclusiveCalendarDays('2026-11-18', '2026-11-24')).toBe(7);
      expect(countInclusiveCalendarDays('2026-11-18', '2026-11-17')).toBe(0);

      expect(normalizeGa4CompactDate('20261118')).toBe('2026-11-18');
      expect(normalizeGa4CompactDate('20260230')).toBeNull();
    });

    it('tracks NOT_STARTED, IN_PROGRESS (clamping effectiveQueryEndDate to asOfKstDate), and COMPLETE with GSC lag days', () => {
      // Deploy night (2026-11-17): post window (11/18~11/24) is NOT_STARTED -> effectiveQueryEndDate = null
      const nightDeployPost = evaluateCohortWindowMaturity({
        window: DEFAULT_3F056525_POST_WINDOW,
        asOfKstDate: '2026-11-17',
        ga4ObservedDates: [],
        gscFinalizedDatesInWindow: [],
        gscLatestAvailableDate: '2026-11-15',
      });
      expect(nightDeployPost.status).toBe('NOT_STARTED');
      expect(nightDeployPost.elapsedCalendarDays).toBe(0);
      expect(nightDeployPost.remainingCalendarDays).toBe(7);
      expect(nightDeployPost.effectiveQueryEndDate).toBeNull();
      expect(nightDeployPost.gscLagDaysBehindAsOf).toBe(2);

      // Day 1 of post window (2026-11-18): IN_PROGRESS -> clamps query end date to 2026-11-18
      const day1Post = evaluateCohortWindowMaturity({
        window: DEFAULT_3F056525_POST_WINDOW,
        asOfKstDate: '2026-11-18',
        ga4ObservedDates: ['2026-11-18'],
        gscFinalizedDatesInWindow: [],
        gscLatestAvailableDate: '2026-11-15',
      });
      expect(day1Post.status).toBe('IN_PROGRESS');
      expect(day1Post.elapsedCalendarDays).toBe(1);
      expect(day1Post.remainingCalendarDays).toBe(6);
      expect(day1Post.effectiveQueryEndDate).toBe('2026-11-18');
      expect(day1Post.ga4ObservedActiveDays).toBe(1);
      expect(day1Post.gscFinalizedDays).toBe(0);
      expect(day1Post.gscLagDaysBehindAsOf).toBe(3);

      // Post-cohort finalized (2026-11-27): COMPLETE -> 7/7 days
      const completedPost = evaluateCohortWindowMaturity({
        window: DEFAULT_3F056525_POST_WINDOW,
        asOfKstDate: '2026-11-27',
        ga4ObservedDates: [
          '2026-11-18',
          '2026-11-19',
          '2026-11-20',
          '2026-11-21',
          '2026-11-22',
          '2026-11-23',
          '2026-11-24',
        ],
        gscFinalizedDatesInWindow: [
          '2026-11-18',
          '2026-11-19',
          '2026-11-20',
          '2026-11-21',
          '2026-11-22',
          '2026-11-23',
          '2026-11-24',
        ],
        gscLatestAvailableDate: '2026-11-25',
      });
      expect(completedPost.status).toBe('COMPLETE');
      expect(completedPost.elapsedCalendarDays).toBe(7);
      expect(completedPost.remainingCalendarDays).toBe(0);
      expect(completedPost.effectiveQueryEndDate).toBe('2026-11-24');
      expect(completedPost.gscFinalizedDays).toBe(7);
    });
  });

  describe('2. Strict Zero-Denominator Guard & Rate Delta Math', () => {
    it('never produces NaN, Infinity, or false negative delta when post-window denominator is 0', () => {
      expect(computeGuardedRatePct(0, 0)).toBeNull();
      expect(computeGuardedRatePct(5, 0)).toBeNull();
      expect(computeGuardedRatePct(0, 75)).toBe(0);
      expect(computeGuardedRatePct(1, 75)).toBe(1.33);

      // Critical guard: Pre = 1.73% (14/808), Post = 0/0 (GSC lag / window start) -> deltaRatePp MUST be null, NOT -1.73%p!
      const uncollectedPost = computeGuardedComparison(14, 808, 0, 0);
      expect(uncollectedPost.preRatePct).toBe(1.73);
      expect(uncollectedPost.postRatePct).toBeNull();
      expect(uncollectedPost.deltaRatePp).toBeNull();
      expect(uncollectedPost.relativeLiftPct).toBeNull();
      expect(uncollectedPost.deltaFormatted).toBe(ZERO_DENOMINATOR_LABEL);
      expect(uncollectedPost.postFormatted).toContain(ZERO_DENOMINATOR_LABEL);

      // Baseline 0% -> Post > 0%: deltaRatePp is positive, relativeLiftPct is null (no Infinity%)
      const fromZeroLift = computeGuardedComparison(0, 28, 4, 40);
      expect(fromZeroLift.preRatePct).toBe(0);
      expect(fromZeroLift.postRatePct).toBe(10);
      expect(fromZeroLift.deltaRatePp).toBe(10);
      expect(fromZeroLift.relativeLiftPct).toBeNull();
      expect(fromZeroLift.statusLabel).toBe('기준선 0%(신규 순증)');

      // Real drop when postDenominator > 0: Pre = 5/100 (5.00%), Post = 0/80 (0.00%) -> -5.00%p (-100.00%)
      const realDrop = computeGuardedComparison(5, 100, 0, 80);
      expect(realDrop.deltaRatePp).toBe(-5);
      expect(realDrop.relativeLiftPct).toBe(-100);
      expect(realDrop.statusLabel).toBe('하락');

      // Standard lift: Pre = 1/98 (1.02%), Post = 8/160 (5.00%) -> +3.98%p (+390.20%)
      const standardLift = computeGuardedComparison(1, 98, 8, 160);
      expect(standardLift.deltaRatePp).toBe(3.98);
      expect(standardLift.relativeLiftPct).toBe(390.2);
      expect(standardLift.statusLabel).toBe('상승');
    });
  });

  describe('3. GA4 open_calculator Trigger Family Classification & Exposure Denominator Funnel', () => {
    it('classifies all 3f056525 quick-pill, drawer-tab, tier-bridge, deep-link, and dashboard/not-set triggers accurately', () => {
      expect(classifyOpenCalculatorTriggerFamily('modal_header_quick_pill', 'apartment_modal')).toBe(
        'modal_header_quick_pill'
      );
      expect(classifyOpenCalculatorTriggerFamily('modal_header_quick_pill_tax', 'zone_detail_modal')).toBe(
        'modal_header_quick_pill_tax'
      );
      expect(classifyOpenCalculatorTriggerFamily('inline_header_quick_pill', 'apartment_inline_page')).toBe(
        'inline_header_quick_pill'
      );
      expect(classifyOpenCalculatorTriggerFamily('inline_header_quick_pill_tax', 'apartment_inline_page')).toBe(
        'inline_header_quick_pill_tax'
      );
      expect(
        classifyOpenCalculatorTriggerFamily('apartment_ssr_price_strip_jeonse', 'apartment_ssr_top')
      ).toBe('apartment_ssr_price_strip');
      expect(
        classifyOpenCalculatorTriggerFamily('guide_mid_tier_1_bridge_drawer_tab_tax', 'guide_mid_conversion')
      ).toBe('guide_mid_tier_1_or_default_bridge');
      expect(
        classifyOpenCalculatorTriggerFamily('guide_mid_tier_2_bridge', 'guide_mid_conversion')
      ).toBe('guide_mid_tier_2_bridge');
      expect(
        classifyOpenCalculatorTriggerFamily('guide_mid_tier_3_bridge_tax', 'guide_mid_conversion')
      ).toBe('guide_mid_tier_3_bridge');
      expect(classifyOpenCalculatorTriggerFamily('url_query_deep_link', 'explore_deep_link')).toBe(
        'url_query_deep_link'
      );

      // AptFitFinderCard / MacroDashboardClient omit trigger -> surface disambiguates from legacy (not set)
      expect(classifyOpenCalculatorTriggerFamily('(not set)', 'zone2_terminal')).toBe(
        'dashboard_macro_and_fit_finder'
      );
      expect(classifyOpenCalculatorTriggerFamily('(not set)', 'dashboard')).toBe(
        'dashboard_macro_and_fit_finder'
      );
      expect(classifyOpenCalculatorTriggerFamily('(not set)', '(not set)')).toBe(
        'legacy_unattributed_not_set'
      );
    });

    it('computes exact surface exposure CVRs and tracks legacy (not set) share reduction from 100% toward 0%', () => {
      const preSnap: Ga4CohortWindowSnapshot = {
        ...createEmptyGa4WindowSnapshot(true),
        activeUsers: 46,
        sessions: 75,
        screenPageViews: 160,
        totalEvents: 525,
        eventCountsByName: {
          apartment_view: { eventCount: 32, totalUsers: 10 },
          open_calculator: { eventCount: 1, totalUsers: 1 },
        },
        pageTrafficRows: [
          { pagePath: '/', screenPageViews: 57, sessions: 30, activeUsers: 16 },
          { pagePath: '/explore', screenPageViews: 11, sessions: 8, activeUsers: 6 },
          { pagePath: '/guide/dongtan-budget-tier-ranking', screenPageViews: 11, sessions: 5, activeUsers: 2 },
          { pagePath: '/guide/dongtan-1-vs-2-comparison', screenPageViews: 10, sessions: 8, activeUsers: 8 },
          { pagePath: '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC', screenPageViews: 49, sessions: 20, activeUsers: 12 },
          { pagePath: '/technovalley', screenPageViews: 17, sessions: 12, activeUsers: 10 },
        ],
        apartmentViewRows: [
          { surface: 'apartment_ssr_page', viewType: 'inline_report', eventCount: 4, totalUsers: 3 },
          { surface: '(not set)', viewType: '(not set)', eventCount: 28, totalUsers: 8 },
        ],
        openCalculatorRows: [
          {
            trigger: '(not set)',
            surface: '(not set)',
            calculatorType: '(not set)',
            pagePath: '/apartment/동탄역반도유보라아이비파크5.0',
            eventCount: 1,
            totalUsers: 1,
          },
        ],
        openCalculatorByRawTriggerUsers: [{ key: '(not set)', eventCount: 1, totalUsers: 1 }],
      };

      const postSnap: Ga4CohortWindowSnapshot = {
        ...createEmptyGa4WindowSnapshot(true),
        activeUsers: 80,
        sessions: 120,
        screenPageViews: 280,
        totalEvents: 940,
        financeQuickInteractCount: 25,
        financeQuickInteractUsers: 14,
        eventCountsByName: {
          apartment_view: { eventCount: 50, totalUsers: 22 },
          open_calculator: { eventCount: 12, totalUsers: 9 },
          finance_quick_interact: { eventCount: 25, totalUsers: 14 },
        },
        pageTrafficRows: [
          { pagePath: '/', screenPageViews: 90, sessions: 50, activeUsers: 30 },
          { pagePath: '/explore', screenPageViews: 25, sessions: 16, activeUsers: 12 },
          { pagePath: '/guide/dongtan-budget-tier-ranking', screenPageViews: 20, sessions: 15, activeUsers: 14 },
          { pagePath: '/guide/dongtan-1-vs-2-comparison', screenPageViews: 20, sessions: 16, activeUsers: 15 },
          { pagePath: '/apartment/동탄역롯데캐슬', screenPageViews: 80, sessions: 35, activeUsers: 25 },
          { pagePath: '/technovalley', screenPageViews: 30, sessions: 20, activeUsers: 18 },
        ],
        apartmentViewRows: [
          { surface: 'apartment_ssr_page', viewType: 'inline_report', eventCount: 10, totalUsers: 8 },
          { surface: 'explore_catalog', viewType: 'modal', eventCount: 40, totalUsers: 18 },
        ],
        openCalculatorRows: [
          {
            trigger: 'modal_header_quick_pill',
            surface: 'apartment_modal',
            calculatorType: 'mortgage',
            pagePath: '/',
            eventCount: 4,
            totalUsers: 3,
          },
          {
            trigger: 'inline_header_quick_pill_tax',
            surface: 'apartment_inline_page',
            calculatorType: 'property_tax',
            pagePath: '/apartment/동탄역롯데캐슬',
            eventCount: 4,
            totalUsers: 4,
          },
          {
            trigger: 'guide_mid_tier_2_bridge',
            surface: 'guide_mid_conversion',
            calculatorType: 'mortgage',
            pagePath: '/guide/dongtan-budget-tier-ranking',
            eventCount: 4,
            totalUsers: 3,
          },
        ],
        openCalculatorByRawTriggerUsers: [
          { key: 'modal_header_quick_pill', eventCount: 4, totalUsers: 3 },
          { key: 'inline_header_quick_pill_tax', eventCount: 4, totalUsers: 4 },
          { key: 'guide_mid_tier_2_bridge', eventCount: 4, totalUsers: 3 },
        ],
      };

      const preDenoms = computeExposureDenominators(preSnap);
      expect(preDenoms.apartmentSsrPageViews).toBe(49); // decoded percent-encoded /apartment/...
      expect(preDenoms.modalApartmentViewEvents).toBe(28); // 32 - 4

      const funnel = compareGa4OpenCalculatorFunnel(preSnap, postSnap);
      // Overall Session CVR: 1/75 (1.33%) -> 12/120 (10.00%) = +8.67%p
      expect(funnel.overallSessionCvr.preRatePct).toBe(1.33);
      expect(funnel.overallSessionCvr.postRatePct).toBe(10);
      expect(funnel.overallSessionCvr.deltaRatePp).toBe(8.67);

      // Legacy (not set) share dropped from 100.00% (1/1) to 0.00% (0/12) = -100.00%p!
      expect(funnel.unattributedNotSetShare.preRatePct).toBe(100);
      expect(funnel.unattributedNotSetShare.postRatePct).toBe(0);
      expect(funnel.unattributedNotSetShare.deltaRatePp).toBe(-100);

      // Modal quick pill: 0/28 (0.00%) -> 4/40 (10.00%) = +10.00%p
      const modalQuickPill = funnel.byTriggerFamily.find(
        (f) => f.familyId === 'modal_header_quick_pill'
      );
      expect(modalQuickPill?.surfaceExposureCvr.preRatePct).toBe(0);
      expect(modalQuickPill?.surfaceExposureCvr.postRatePct).toBe(10);
      expect(modalQuickPill?.surfaceExposureCvr.deltaRatePp).toBe(10);

      // Guide mid Tier 2 bridge: 0/21 (0.00%) -> 4/40 (10.00%) = +10.00%p
      const tier2Bridge = funnel.byTriggerFamily.find(
        (f) => f.familyId === 'guide_mid_tier_2_bridge'
      );
      expect(tier2Bridge?.surfaceExposureCvr.preRatePct).toBe(0);
      expect(tier2Bridge?.surfaceExposureCvr.postRatePct).toBe(10);
    });
  });

  describe('4. GSC URL Normalization, Impression-Weighted Position & 0-Click Cohort Resolution', () => {
    it('normalizes encoded Korean URLs, www/query/hash noise, and computes impression-weighted route positions', () => {
      expect(
        normalizeDviewRoutePath(
          'https://www.dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC/?hl=ko-KR#overview'
        )
      ).toBe('/apartment/동탄역롯데캐슬');
      expect(normalizeDviewRoutePath('https://dongtanview.com')).toBe('/');
      expect(normalizeDviewRoutePath('/explore///')).toBe('/explore');
      // Malformed % sequence must never throw
      expect(normalizeDviewRoutePath('/apartment/%E0%A4%A')).toBe('/apartment/%E0%A4%A');

      const preGsc: GscWindowSnapshot = {
        ...createEmptyGscWindowSnapshot(true, 'https://dongtanview.com/'),
        totalClicks: 2,
        totalImpressions: 200,
        averagePosition: 7.5,
        pageRows: [
          // Two apartment URLs: 100 imp at pos 4.0 + 10 imp at pos 26.0 -> weighted pos = (400+260)/110 = 6.0 (NOT unweighted 15.0!)
          {
            keys: ['https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC'],
            clicks: 1,
            impressions: 100,
            ctr: 1,
            position: 4.0,
          },
          {
            keys: ['https://dongtanview.com/apartment/동탄더샵레이크에듀타운?hl=ko'],
            clicks: 0,
            impressions: 10,
            ctr: 0,
            position: 26.0,
          },
          {
            keys: ['https://dongtanview.com/guide/dongtan-1-vs-2-comparison'],
            clicks: 1,
            impressions: 90,
            ctr: 1.11,
            position: 6.3,
          },
        ],
        queryRows: [
          { keys: ['1동탄 2동탄'], clicks: 0, impressions: 55, ctr: 0, position: 5.5 },
          { keys: ['동탄 학군'], clicks: 0, impressions: 20, ctr: 0, position: 6.3 },
          { keys: ['동탄 집값'], clicks: 0, impressions: 15, ctr: 0, position: 14.9 },
        ],
      };

      const postGsc: GscWindowSnapshot = {
        ...createEmptyGscWindowSnapshot(true, 'https://dongtanview.com/'),
        totalClicks: 14,
        totalImpressions: 250,
        averagePosition: 5.2,
        pageRows: [
          {
            keys: ['https://dongtanview.com/apartment/동탄역롯데캐슬'],
            clicks: 6,
            impressions: 120,
            ctr: 5.0,
            position: 3.5,
          },
          {
            keys: ['https://dongtanview.com/guide/dongtan-1-vs-2-comparison'],
            clicks: 8,
            impressions: 130,
            ctr: 6.15,
            position: 4.1,
          },
        ],
        queryRows: [
          { keys: ['1동탄 2동탄'], clicks: 5, impressions: 60, ctr: 8.33, position: 4.2 },
          { keys: ['동탄 학군'], clicks: 0, impressions: 25, ctr: 0, position: 5.8 },
        ],
      };

      const lift = compareGscCtrLift(
        preGsc,
        postGsc,
        [{ sourceMedium: 'google / organic', pagePath: '/guide/dongtan-1-vs-2-comparison', sessions: 3, activeUsers: 3, screenPageViews: 4 }],
        [{ sourceMedium: 'google / organic', pagePath: '/guide/dongtan-1-vs-2-comparison', sessions: 11, activeUsers: 10, screenPageViews: 15 }]
      );

      const aptBucket = lift.byTargetRoute.find((r) => r.routeKey === '/apartment/*');
      expect(aptBucket?.preImpressions).toBe(110);
      expect(aptBucket?.prePosition).toBe(6.0);
      expect(aptBucket?.postCtrPct).toBe(5.0);
      expect(aptBucket?.positionDelta).toBe(-2.5); // 6.0 -> 3.5 rank improvement

      const vsGuide = lift.byTargetRoute.find(
        (r) => r.routeKey === '/guide/dongtan-1-vs-2-comparison'
      );
      expect(vsGuide?.deltaGa4OrganicSessions).toBe(8);

      // Zero-click cohort tracking: "1동탄 2동탄" converted, "동탄 학군" still 0-click, "동탄 집값" pending post impressions
      expect(lift.convertedZeroClickQueryCount).toBe(1);
      expect(lift.stillZeroClickQueryCount).toBe(1);
      expect(lift.pendingPostImpressionZeroClickCount).toBe(1);

      const dynamicHomeQuery = lift.byTargetAndTopZeroClickQueries.find(
        (q) => q.query === '동탄 집값'
      );
      expect(dynamicHomeQuery?.targetRoute).toBe('/');
      expect(dynamicHomeQuery?.resolutionState).toBe('NO_POST_IMPRESSIONS_YET');
    });
  });

  describe('5. End-to-End Live Orchestrator & Sticky GSC Property Handoff + GA4 400 Fallback', () => {
    it('locks verified GSC siteProperty from preWindow onto empty postWindow and gracefully handles GA4 400 fallback & invalid date ranges', async () => {
      // Invalid range check on repository
      const badRange = await fetchSearchConsoleAnalyticsRows({
        startDate: '2026-11-24',
        endDate: '2026-11-18',
        dimensions: ['query'],
      });
      expect(badRange.ok).toBe(false);
      expect(badRange.errorCode).toBe('INVALID_DATE_RANGE');

      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'telemetry-bot@dongtanview.iam.gserviceaccount.com';
      process.env.GOOGLE_PRIVATE_KEY = pem;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

      const gscPostPropertiesQueried: string[] = [];

      const mockFetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'mock-token' }),
            text: async () => JSON.stringify({ access_token: 'mock-token' }),
          } as Response;
        }
        if (url === 'https://www.googleapis.com/webmasters/v3/sites') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              siteEntry: [
                { siteUrl: 'https://www.dongtanview.com/', permissionLevel: 'siteFullUser' },
                { siteUrl: 'https://dongtanview.com/', permissionLevel: 'siteOwner' },
              ],
            }),
          } as Response;
        }
        if (url.includes('/searchAnalytics/query')) {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          // www property is empty
          if (url.includes(encodeURIComponent('https://www.dongtanview.com/'))) {
            return { ok: true, status: 200, json: async () => ({ rows: [] }) } as Response;
          }
          if (body.startDate === '2026-11-18') {
            gscPostPropertiesQueried.push(url);
            // Day 1 post-window has 0 GSC rows due to 2-day GSC lag
            return { ok: true, status: 200, json: async () => ({ rows: [] }) } as Response;
          }
          const dims: string[] = body.dimensions || [];
          if (dims.length === 0) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                rows: [{ clicks: 14, impressions: 808, ctr: 14 / 808, position: 8.2 }],
              }),
            } as Response;
          }
          if (dims[0] === 'date') {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                rows: [
                  { keys: ['2026-11-14'], clicks: 7, impressions: 400, ctr: 0.0175, position: 8.0 },
                  { keys: ['2026-11-15'], clicks: 7, impressions: 408, ctr: 0.0171, position: 8.4 },
                ],
              }),
            } as Response;
          }
          return { ok: true, status: 200, json: async () => ({ rows: [] }) } as Response;
        }
        if (url.includes(':runReport')) {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          const startDate = body.dateRanges?.[0]?.startDate;
          const dims: Array<{ name: string }> = body.dimensions || [];

          // Simulate HTTP 400 on 4-dimension customEvent query to verify pagePath fallback
          if (dims.some((d) => d.name === 'customEvent:calculator_type') && dims.length === 4) {
            return {
              ok: false,
              status: 400,
              text: async () => 'Field customEvent:calculator_type is not a valid dimension',
            } as Response;
          }

          if (startDate === '2026-11-18') {
            return { ok: true, status: 200, json: async () => ({ rows: [] }) } as Response;
          }

          if (dims.length === 0) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                rows: [
                  {
                    metricValues: [
                      { value: '46' },
                      { value: '75' },
                      { value: '160' },
                      { value: '525' },
                    ],
                  },
                ],
              }),
            } as Response;
          }

          if (dims.length === 1 && dims[0].name === 'pagePath' && body.dimensionFilter) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                rows: [
                  {
                    dimensionValues: [{ value: '/apartment/동탄역롯데캐슬' }],
                    metricValues: [{ value: '1' }, { value: '1' }],
                  },
                ],
              }),
            } as Response;
          }

          return { ok: true, status: 200, json: async () => ({ rows: [] }) } as Response;
        }
        throw new Error(`Unexpected URL in mockFetch: ${url}`);
      });

      const report = await analyzeLiveReleaseCohortComparison({
        preWindow: DEFAULT_3F056525_PRE_WINDOW,
        postWindow: DEFAULT_3F056525_POST_WINDOW,
        asOfKstDate: '2026-11-18',
        propertyId: '527874632',
        clientEmail: 'telemetry-bot@dongtanview.iam.gserviceaccount.com',
        privateKey: pem,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      // Post-window locked onto active https://dongtanview.com/ instead of empty www fallback!
      expect(report.gscSiteProperty).toBe('https://dongtanview.com/');
      expect(
        gscPostPropertiesQueried.every((u) => u.includes(encodeURIComponent('https://dongtanview.com/')))
      ).toBe(true);

      // Post-window clamped to 2026-11-18 (1/7 elapsed) with Zero-Denominator Guard
      expect(report.postMaturity.status).toBe('IN_PROGRESS');
      expect(report.postMaturity.effectiveQueryEndDate).toBe('2026-11-18');
      expect(report.postMaturity.gscLatestAvailableDate).toBe('2026-11-15');
      expect(report.ga4Status.customDimensionFallbackUsed).toBe(true);
      expect(report.calculatorFunnel.overallSessionCvr.preRatePct).toBe(1.33);
      expect(report.calculatorFunnel.overallSessionCvr.postRatePct).toBeNull();
      expect(report.gscCtrLift.overallPropertyCtr.deltaRatePp).toBeNull();
    });

    it('separates legacy /technovalley?jisan= individual center URLs from /technovalley hub and covers /guide/* (other) + /zone/*', () => {
      expect(normalizeDviewRoutePath('https://dongtanview.com/technovalley')).toBe('/technovalley');
      expect(normalizeDviewRoutePath('https://dongtanview.com/technovalley?hl=ko')).toBe(
        '/technovalley'
      );
      expect(normalizeDviewRoutePath('https://dongtanview.com/technovalley?jisan=')).toBe(
        '/technovalley'
      );
      expect(
        normalizeDviewRoutePath(
          'https://dongtanview.com/technovalley?jisan=%EB%8F%99%ED%83%84%EA%B8%88%EA%B0%95%ED%8E%9C%ED%85%8C%EB%A6%AC%EC%9B%80%20IX%ED%83%80%EC%9B%8C'
        )
      ).toBe('/technovalley/동탄금강펜테리움 IX타워');

      const preGsc: GscWindowSnapshot = {
        ...createEmptyGscWindowSnapshot(true, 'https://dongtanview.com/'),
        totalClicks: 9,
        totalImpressions: 200,
        averagePosition: 7.5,
        pageRows: [
          {
            keys: ['https://dongtanview.com/technovalley'],
            clicks: 2,
            impressions: 28,
            ctr: 7.14,
            position: 10.4,
          },
          {
            keys: [
              'https://dongtanview.com/technovalley?jisan=%EB%8F%99%ED%83%84%EA%B8%88%EA%B0%95%ED%8E%9C%ED%85%8C%EB%A6%AC%EC%9B%80%20IX%ED%83%80%EC%9B%8C',
            ],
            clicks: 2,
            impressions: 77,
            ctr: 2.6,
            position: 7.9,
          },
          {
            keys: ['https://dongtanview.com/technovalley/%EC%97%90%EC%9D%B4%ED%8C%A9%EC%8B%9C%ED%8B%B0'],
            clicks: 1,
            impressions: 23,
            ctr: 4.35,
            position: 5.9,
          },
          {
            keys: ['https://dongtanview.com/guide/dongtan-1-vs-2-comparison'],
            clicks: 1,
            impressions: 40,
            ctr: 2.5,
            position: 6.0,
          },
          {
            keys: ['https://dongtanview.com/guide/stress-dsr-valuation-guide'],
            clicks: 2,
            impressions: 20,
            ctr: 10.0,
            position: 7.0,
          },
          {
            keys: ['https://dongtanview.com/zone/gbcx'],
            clicks: 1,
            impressions: 12,
            ctr: 8.33,
            position: 4.0,
          },
        ],
      };

      const postGsc = createEmptyGscWindowSnapshot(true, 'https://dongtanview.com/');
      const lift = compareGscCtrLift(
        preGsc,
        postGsc,
        [{ sourceMedium: 'google / organic', pagePath: '/technovalley', sessions: 8, activeUsers: 7, screenPageViews: 10 }],
        [],
        [],
        76,
        0
      );

      const hubRow = lift.byTargetRoute.find((r) => r.routeKey === '/technovalley');
      const jisanDetailRow = lift.byTargetRoute.find((r) => r.routeKey === '/technovalley/*');
      const otherGuidesRow = lift.byTargetRoute.find((r) => r.routeKey === '/guide/* (other)');
      const zoneRow = lift.byTargetRoute.find((r) => r.routeKey === '/zone/*');

      // Hub must NOT absorb legacy ?jisan= individual center rows!
      expect(hubRow?.preImpressions).toBe(28);
      expect(hubRow?.preClicks).toBe(2);
      expect(jisanDetailRow?.preImpressions).toBe(100); // 77 (?jisan=) + 23 (/technovalley/slug)
      expect(jisanDetailRow?.preClicks).toBe(3);

      // /guide/* (other) excludes the 3 hero guides (no double-counting of dongtan-1-vs-2-comparison)
      expect(otherGuidesRow?.preImpressions).toBe(20);
      expect(otherGuidesRow?.preClicks).toBe(2);
      expect(zoneRow?.preImpressions).toBe(12);
      expect(zoneRow?.preClicks).toBe(1);

      // Organic session share guards 0 post sessions instead of reporting fake -73.68%p drop
      expect(lift.ga4OrganicSessionShare.preRatePct).toBe(10.53);
      expect(lift.ga4OrganicSessionShare.postRatePct).toBeNull();
      expect(lift.ga4OrganicSessionShare.deltaRatePp).toBeNull();
    });

    it('classifies chapter05_cta / chapter05_sentinel_cta, excludes non-modal chart_preview from modal denominator, and reconciles GA4 (other) buckets', () => {
      expect(classifyOpenCalculatorTriggerFamily('chapter05_cta', 'apartment_modal')).toBe(
        'chapter05_cta'
      );
      expect(
        classifyOpenCalculatorTriggerFamily('chapter05_sentinel_cta', 'apartment_inline_page')
      ).toBe('chapter05_cta');
      expect(
        classifyOpenCalculatorTriggerFamily('guide_mid_tier_4_bridge_tax', 'guide_mid_conversion')
      ).toBe('guide_mid_tier_3_bridge');
      expect(classifyOpenCalculatorTriggerFamily('(not set)', 'technovalley_hub_top')).toBe(
        'technovalley_b2b_simulator'
      );

      const snap: Ga4CohortWindowSnapshot = {
        ...createEmptyGa4WindowSnapshot(true),
        sessions: 100,
        screenPageViews: 220,
        activeUsers: 60,
        eventCountsByName: {
          apartment_view: { eventCount: 50, totalUsers: 25 },
          open_calculator: { eventCount: 10, totalUsers: 8 },
        },
        pageTrafficRows: [{ pagePath: '/apartment/동탄역롯데캐슬', screenPageViews: 30, sessions: 20, activeUsers: 15 }],
        apartmentViewRows: [
          { surface: 'apartment_ssr_page', viewType: 'inline_report', eventCount: 10, totalUsers: 8 },
          { surface: 'dashboard_chart', viewType: 'chart_preview', eventCount: 15, totalUsers: 7 },
          { surface: 'dashboard_timeline_preview', viewType: 'chart_preview', eventCount: 5, totalUsers: 4 },
          { surface: 'explore_catalog', viewType: 'modal', eventCount: 20, totalUsers: 12 },
        ],
        // Simulate 4-dimension openMultiRes grouping 3 rare pagePath rows into (other)
        openCalculatorRows: [
          {
            trigger: 'chapter05_sentinel_cta',
            surface: 'apartment_modal',
            calculatorType: 'mortgage',
            pagePath: '/',
            eventCount: 2,
            totalUsers: 2,
          },
          {
            trigger: 'modal_header_quick_pill',
            surface: 'apartment_modal',
            calculatorType: 'mortgage',
            pagePath: '/',
            eventCount: 5,
            totalUsers: 4,
          },
          {
            trigger: '(other)',
            surface: 'apartment_modal',
            calculatorType: 'mortgage',
            pagePath: '(other)',
            eventCount: 3,
            totalUsers: 3,
          },
        ],
        // 1-dimension customEvent:trigger has no pagePath cardinality, recovering all 8 modal_header_quick_pill events!
        openCalculatorByRawTriggerUsers: [
          { key: 'chapter05_sentinel_cta', eventCount: 2, totalUsers: 2 },
          { key: 'modal_header_quick_pill', eventCount: 8, totalUsers: 6 },
        ],
      };

      const denoms = computeExposureDenominators(snap);
      expect(denoms.ssrInlineApartmentViewEvents).toBe(10);
      expect(denoms.chartPreviewApartmentViewEvents).toBe(20);
      expect(denoms.modalApartmentViewEvents).toBe(20); // 50 - 10 (ssr) - 20 (chart_preview) = 20 true modal views!
      expect(denoms.allApartmentExposures).toBe(50); // 30 SSR PV + 20 modal views

      const funnel = compareGa4OpenCalculatorFunnel(createEmptyGa4WindowSnapshot(true), snap);
      const ch05 = funnel.byTriggerFamily.find((f) => f.familyId === 'chapter05_cta');
      expect(ch05?.introducedOrHardenedIn3f056525).toBe(true);
      expect(ch05?.surfaceExposureCvr.postRatePct).toBe(4); // 2 / 50 = 4.00%

      const modalPill = funnel.byTriggerFamily.find(
        (f) => f.familyId === 'modal_header_quick_pill'
      );
      expect(modalPill?.surfaceExposureCvr.postNumerator).toBe(8); // recovered from 1-dim trigger!
      expect(modalPill?.surfaceExposureCvr.postRatePct).toBe(40); // 8 / 20 = 40.00%
      expect(funnel.unattributedNotSetShare.postRatePct).toBe(0); // NOT falsely attributed to (not set)!
    });

    it('caps concurrent GA4 RPCs <= 5, never fabricates 0% CVR on partial HTTP 429 quota failure, and falls back across multiple GSC credentials', async () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      // 1) Multi-credential GSC fallback: Cred #1 only sees empty www property, Cred #2 sees real https://dongtanview.com/
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'empty-cred1@dongtanview.iam.gserviceaccount.com';
      process.env.GOOGLE_PRIVATE_KEY = pem;
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'owner-cred2@dongtanview.iam.gserviceaccount.com';
      process.env.FIREBASE_ADMIN_PRIVATE_KEY = pem;

      let tokenCallIdx = 0;
      const multiCredFetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          tokenCallIdx += 1;
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: `tok-${tokenCallIdx}` }),
          } as Response;
        }
        if (url === 'https://www.googleapis.com/webmasters/v3/sites') {
          const auth = (init?.headers as Record<string, string>)?.Authorization || '';
          if (auth === 'Bearer tok-1') {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                siteEntry: [{ siteUrl: 'https://www.dongtanview.com/', permissionLevel: 'siteFullUser' }],
              }),
            } as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              siteEntry: [{ siteUrl: 'https://dongtanview.com/', permissionLevel: 'siteOwner' }],
            }),
          } as Response;
        }
        if (url.includes('/searchAnalytics/query')) {
          const auth = (init?.headers as Record<string, string>)?.Authorization || '';
          if (auth === 'Bearer tok-1') {
            if (url.includes(encodeURIComponent('https://www.dongtanview.com/'))) {
              return { ok: true, status: 200, json: async () => ({ rows: [] }) } as Response;
            }
            return { ok: false, status: 403, text: async () => 'Forbidden' } as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              rows: [{ keys: ['동탄 아파트 시세'], clicks: 3, impressions: 50, ctr: 0.06, position: 4.5 }],
            }),
          } as Response;
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const gscRes = await fetchSearchConsoleAnalyticsRows({
        startDate: '2026-11-11',
        endDate: '2026-11-17',
        dimensions: ['query'],
        fetchFn: multiCredFetch as unknown as typeof fetch,
      });
      expect(gscRes.ok).toBe(true);
      expect(gscRes.serviceAccountEmail).toBe('owner-cred2@dongtanview.iam.gserviceaccount.com');
      expect(gscRes.rows).toHaveLength(1);
      expect(gscRes.rows[0].impressions).toBe(50);

      // 2) Partial HTTP 429 RESOURCE_EXHAUSTED on GA4 open_calculator sub-query + concurrency <= 5 check
      delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;

      let activeGa4Rpcs = 0;
      let peakGa4Rpcs = 0;

      const quota429Fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          return { ok: true, status: 200, json: async () => ({ access_token: 'ga4-tok' }) } as Response;
        }
        if (url.includes('/webmasters/v3/')) {
          // Simulate partial GSC 429 on `page` dimension after `summary` succeeded
          if (url.includes('/searchAnalytics/query') && init?.body) {
            const parsed = JSON.parse(String(init.body));
            if (Array.isArray(parsed.dimensions) && parsed.dimensions[0] === 'page') {
              return {
                ok: false,
                status: 429,
                text: async () => JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'GSC quota exceeded' } }),
              } as Response;
            }
            return {
              ok: true,
              status: 200,
              json: async () => ({ rows: [{ clicks: 10, impressions: 500, ctr: 0.02, position: 7.1 }] }),
            } as Response;
          }
          return { ok: true, status: 200, json: async () => ({ siteEntry: [] }) } as Response;
        }
        if (url.includes(':runReport')) {
          activeGa4Rpcs += 1;
          peakGa4Rpcs = Math.max(peakGa4Rpcs, activeGa4Rpcs);
          await new Promise((r) => setTimeout(r, 5));
          activeGa4Rpcs -= 1;

          const body = init?.body ? JSON.parse(String(init.body)) : {};
          const dims: Array<{ name: string }> = body.dimensions || [];

          // Overview succeeds with 75 sessions, but open_calculator hits HTTP 429!
          if (dims.some((d) => d.name === 'customEvent:calculator_type') && dims.length === 4) {
            return {
              ok: false,
              status: 429,
              text: async () => 'RESOURCE_EXHAUSTED: Exhausted property tokens for a project per hour',
            } as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              rows:
                dims.length === 0
                  ? [{ metricValues: [{ value: '46' }, { value: '75' }, { value: '160' }, { value: '525' }] }]
                  : [],
            }),
          } as Response;
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const failedReport = await analyzeLiveReleaseCohortComparison({
        preWindow: DEFAULT_3F056525_PRE_WINDOW,
        postWindow: DEFAULT_3F056525_POST_WINDOW,
        asOfKstDate: '2026-11-20',
        propertyId: '527874632',
        clientEmail: 'telemetry-bot@dongtanview.iam.gserviceaccount.com',
        privateKey: pem,
        fetchFn: quota429Fetch as unknown as typeof fetch,
      });

      expect(peakGa4Rpcs).toBeLessThanOrEqual(5);
      expect(failedReport.ga4Status.preOk).toBe(false);
      expect(failedReport.ga4Status.preError).toContain('HTTP 429');
      expect(failedReport.ga4Status.preError).toContain('RESOURCE_EXHAUSTED');
      // Must NOT fabricate 0.00% (0/75) CVR when open_calculator sub-query failed with 429!
      expect(failedReport.calculatorFunnel.overallSessionCvr.preRatePct).toBeNull();
      expect(failedReport.calculatorFunnel.overallSessionCvr.preFormatted).toContain(
        ZERO_DENOMINATOR_LABEL
      );

      // Partial GSC 429 on page dimension must also fail preOk rather than reporting 0 route impressions!
      expect(failedReport.gscStatus.preOk).toBe(false);
      expect(failedReport.gscStatus.preError).toContain('GSC quota exceeded');
    });
  });
});

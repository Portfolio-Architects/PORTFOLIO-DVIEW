/**
 * @file ga4_ad_telemetry_and_csp_boost.test.tsx
 * @description Comprehensive verification suite for:
 *   1. Edge Proxy CSP hardening (`connect-src`, `img-src`, `script-src` regional GA4/GTM domains + Turn 2 HTTP 308 preservation)
 *   2. Unified GA4 `ad_telemetry` dispatcher (`dispatchGa4AdTelemetry`, `sendTelemetry`, `sendAdTelemetryBeacon`) with real `@next/third-parties/google` `<GoogleAnalytics />`
 *   3. `<AdSlot />` MRC 1,000ms Active View `VIEWABLE_IMPRESSION` lifecycle & adversarial edge cases
 *   4. `ga4CustomDimensions.ts` metadata-aware report planning, aggregation, and idempotent Admin API v1beta provisioning
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextRequest } from 'next/server';
import { GoogleAnalytics } from '@next/third-parties/google';
import { proxy } from '@/proxy';
import {
  AdSlot,
  GA4_MAX_PARAM_VALUE_LENGTH,
  VIEWABLE_IMPRESSION_DWELL_MS,
  dispatchGa4AdTelemetry,
  sendTelemetry,
  sendAdTelemetryBeacon,
} from '@/components/ads/AdSlot';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';
import {
  DVIEW_GA4_CUSTOM_DIMENSIONS,
  DVIEW_GA4_INTERACTION_DIMENSIONS,
  DVIEW_GA4_CUSTOM_METRICS,
  MAX_GA4_REPORT_DIMENSIONS,
  inspectGa4CustomDimensionCoverage,
  buildAdTelemetryReportPlan,
  buildInteractionFunnelReportPlan,
  summarizeAdTelemetryReportRows,
  syncGa4CustomDefinitions,
} from '@/lib/services/ga4CustomDimensions';

jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

function parseCspDirectives(cspHeader: string): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const rawDirective of cspHeader.split(';')) {
    const tokens = rawDirective.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      map[tokens[0]] = tokens.slice(1);
    }
  }
  return map;
}

describe('1. Edge Proxy CSP Regional GA4/GTM Domain & Canonical Redirect Verification', () => {
  it('allows regional *.google-analytics.com, analytics.google.com, and *.googletagmanager.com in connect-src/img-src/script-src on single-line CSP header', async () => {
    const req = new NextRequest('https://dongtanview.com/guide/dongtan-1-vs-2-comparison');
    const res = await proxy(req);
    const csp = res.headers.get('Content-Security-Policy') || '';

    expect(csp.length).toBeGreaterThan(50);
    expect(/[\r\n]/.test(csp)).toBe(false);

    const directives = parseCspDirectives(csp);

    expect(directives['connect-src']).toEqual(
      expect.arrayContaining([
        'https://www.google-analytics.com',
        'https://*.google-analytics.com',
        'https://analytics.google.com',
        'https://*.analytics.google.com',
        'https://www.googletagmanager.com',
        'https://*.googletagmanager.com',
      ])
    );

    expect(directives['img-src']).toEqual(
      expect.arrayContaining([
        'https://www.google-analytics.com',
        'https://*.google-analytics.com',
        'https://analytics.google.com',
        'https://*.analytics.google.com',
        'https://www.googletagmanager.com',
        'https://*.googletagmanager.com',
        'https://www.google.com',
        'https://*.google.com',
        'https://*.google.co.kr',
      ])
    );

    expect(directives['script-src']).toEqual(
      expect.arrayContaining([
        'https://www.googletagmanager.com',
        'https://*.googletagmanager.com',
      ])
    );
  });

  it('preserves Turn 2 HTTP 308 canonical apartment slug redirect and serves upgraded CSP header on the canonical destination', async () => {
    const nonCanonicalUrl =
      'https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%20%EC%8B%9C%EB%B2%94%20%EB%A6%AC%EC%8A%88%EB%B9%8C?tab=tx';
    const req = new NextRequest(nonCanonicalUrl);
    const redirectRes = await proxy(req);

    expect(redirectRes.status).toBe(308);
    const location = redirectRes.headers.get('location') || '';
    expect(decodeURIComponent(location)).toContain('/apartment/동탄역시범리슈빌아파트?tab=tx');

    const canonicalRes = await proxy(new NextRequest(location));
    expect(canonicalRes.status).toBe(200);
    const csp = canonicalRes.headers.get('Content-Security-Policy') || '';
    const directives = parseCspDirectives(csp);
    expect(directives['connect-src']).toEqual(
      expect.arrayContaining([
        'https://*.google-analytics.com',
        'https://analytics.google.com',
      ])
    );
  });

  it('bypasses PWA Service Worker (public/sw.js) interception for regional *.google-analytics.com POST beacons and .gif/.png tracking pixels', () => {
    const swPath = path.resolve(process.cwd(), 'public', 'sw.js');
    const swCode = fs.readFileSync(swPath, 'utf8');

    const listeners: Record<string, (event: unknown) => void> = {};
    const sandbox = {
      self: {
        location: { origin: 'https://dongtanview.com' },
        addEventListener: (type: string, handler: (event: unknown) => void) => {
          listeners[type] = handler;
        },
        skipWaiting: jest.fn(),
        clients: { claim: jest.fn(), openWindow: jest.fn() },
        registration: { showNotification: jest.fn() },
      },
      URL,
      Response,
      Headers,
      caches: {
        match: jest.fn().mockResolvedValue(undefined),
        open: jest.fn().mockResolvedValue({
          addAll: jest.fn(),
          match: jest.fn().mockResolvedValue(undefined),
          put: jest.fn(),
          delete: jest.fn(),
        }),
        keys: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
      },
      fetch: jest.fn().mockResolvedValue(new Response('ok', { status: 200 })),
    };

    vm.runInNewContext(swCode, sandbox);
    const fetchHandler = listeners.fetch;
    expect(typeof fetchHandler).toBe('function');

    const simulateSwFetch = (url: string, method: string = 'GET') => {
      const respondWith = jest.fn();
      fetchHandler({
        request: { url, method, mode: 'cors', headers: new Headers() },
        respondWith,
      });
      return respondWith;
    };

    // Regional GA4 sendBeacon POST and .gif pixel pings MUST NOT call respondWith (pure browser pass-through)
    expect(
      simulateSwFetch('https://region1.google-analytics.com/g/collect?v=2&tid=G-Y17BHJ77W6', 'POST')
    ).not.toHaveBeenCalled();
    expect(
      simulateSwFetch('https://analytics.google.com/g/collect.gif?v=2&tid=G-Y17BHJ77W6', 'GET')
    ).not.toHaveBeenCalled();
    expect(
      simulateSwFetch('https://pagead2.googlesyndication.com/pagead/gen_204?id= sodar2', 'GET')
    ).not.toHaveBeenCalled();

    // Same-origin Next.js static assets still use Cache-First respondWith
    expect(
      simulateSwFetch('https://dongtanview.com/_next/static/chunks/main.js', 'GET')
    ).toHaveBeenCalledTimes(1);
  });
});

describe('2. Unified GA4 ad_telemetry Dispatcher & Real @next/third-parties/google Integration', () => {
  const originalEnv = process.env;
  const originalSendBeacon = navigator.sendBeacon;
  let sendBeaconMock: jest.Mock;
  let originalPerformanceMark: typeof performance.mark | undefined;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_GA_ID: 'G-Y17BHJ77W6',
    };
    localStorage.clear();
    sendBeaconMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeaconMock,
    });

    originalPerformanceMark = performance.mark;
    if (typeof performance.mark !== 'function') {
      Object.defineProperty(performance, 'mark', {
        value: jest.fn(),
        configurable: true,
        writable: true,
      });
    }

    (window as unknown as { dataLayer?: unknown[] }).dataLayer = undefined;
    (window as unknown as { gtag?: unknown }).gtag = undefined;
  });

  afterEach(() => {
    cleanup();
    process.env = originalEnv;
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: originalSendBeacon,
    });
    if (originalPerformanceMark === undefined) {
      Object.defineProperty(performance, 'mark', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    } else {
      performance.mark = originalPerformanceMark;
    }
    document.getElementById('_next-ga-init')?.remove();
    document.getElementById('_next-ga')?.remove();
    (window as unknown as { dataLayer?: unknown[] }).dataLayer = undefined;
    (window as unknown as { gtag?: unknown }).gtag = undefined;
  });

  it('queues genuine [object Arguments] tuples into window.dataLayer before _next-ga-init defines window.gtag (fixing pre-hydration silent drop)', () => {
    const dispatched = dispatchGa4AdTelemetry({
      eventType: 'VIEWABLE_IMPRESSION',
      slotId: '6782594447',
      placementSlotId: 'article_mid',
      campaignId: 'mortgage-refinance',
      apartmentName: '동탄역롯데캐슬',
      dong: '오산동',
      dwellTimeMs: 1000,
      intersectionRatio: 0.85,
      userAgentCategory: 'MOBILE_WEB',
      timestamp: '2026-10-31T12:00:00.000Z',
    });

    expect(dispatched).toBe(true);
    const dl = (window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer;
    expect(Array.isArray(dl)).toBe(true);
    expect(dl).toHaveLength(1);
    expect(Object.prototype.toString.call(dl![0])).toBe('[object Arguments]');

    const tuple = Array.from(dl![0]);
    expect(tuple[0]).toBe('event');
    expect(tuple[1]).toBe('ad_telemetry');
    expect('campaign_id' in (tuple[2] as Record<string, unknown>)).toBe(false);
    expect(tuple[2]).toEqual({
      event_category: 'VIEWABLE_IMPRESSION',
      event_label: '6782594447',
      slot_id: '6782594447',
      placement_slot_id: 'article_mid',
      cpa_campaign_id: 'mortgage-refinance',
      event_type: 'VIEWABLE_IMPRESSION',
      apartment_name: '동탄역롯데캐슬',
      dong: '오산동',
      dwell_time_ms: 1000,
      intersection_ratio: 0.85,
      user_agent_category: 'MOBILE_WEB',
      timestamp: '2026-10-31T12:00:00.000Z',
    });
  });

  it('hoists delayed _next-ga-init js and config commands ahead of pre-hydrated ad_telemetry Arguments in window.dataLayer', async () => {
    dispatchGa4AdTelemetry({
      eventType: 'ADBLOCK_FALLBACK',
      slotId: '6782594447',
      placementSlotId: 'dashboard_bottom',
      campaignId: 'corporate-relocation',
      apartmentName: 'GLOBAL',
      timestamp: '2026-11-12T12:00:00.000Z',
    });

    const initScript = document.createElement('script');
    initScript.id = '_next-ga-init';
    initScript.innerHTML = `
      window['dataLayer'] = window['dataLayer'] || [];
      function gtag(){window['dataLayer'].push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-Y17BHJ77W6');
    `;
    document.body.appendChild(initScript);
    await Promise.resolve();

    const dl = (window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer || [];
    expect(Object.prototype.hasOwnProperty.call(dl, 'push')).toBe(false);
    const entries = dl.map((item) => Array.from(item));
    expect(entries).toHaveLength(3);
    expect(entries[0][0]).toBe('js');
    expect(entries[1]).toEqual(['config', 'G-Y17BHJ77W6']);
    expect(entries[2][0]).toBe('event');
    expect(entries[2][1]).toBe('ad_telemetry');
    expect((entries[2][2] as Record<string, unknown>).cpa_campaign_id).toBe('corporate-relocation');
    expect('campaign_id' in (entries[2][2] as Record<string, unknown>)).toBe(false);
  });

  it('integrates cleanly with real <GoogleAnalytics gaId="G-Y17BHJ77W6" /> without duplicate events and strips placementSlotId from /api/ads/click wire payload', () => {
    render(<GoogleAnalytics gaId="G-Y17BHJ77W6" />);
    expect(typeof (window as unknown as { gtag?: unknown }).gtag).toBe('function');

    sendTelemetry({
      eventType: 'UNFILLED',
      slotId: '5901189870',
      placementSlotId: '5901189870_top',
      campaignId: 'jeonse-sentinel',
      apartmentName: 'GLOBAL',
      dong: '청계동',
      dwellTimeMs: 0,
      intersectionRatio: 0.72,
      timestamp: '2026-10-31T12:05:00.000Z',
    });

    sendAdTelemetryBeacon({
      eventType: 'FALLBACK_CLICK',
      slotId: '5901189870',
      campaignId: 'jeonse-sentinel',
      apartmentName: '동탄역시범더샵센트럴시티',
      timestamp: '2026-10-31T12:05:03.000Z',
    });

    const entries = ((window as unknown as { dataLayer: Array<ArrayLike<unknown>> }).dataLayer || []).map(
      (item) => Array.from(item)
    );

    const adEvents = entries.filter((e) => e[0] === 'event' && e[1] === 'ad_telemetry');
    expect(adEvents).toHaveLength(2);

    expect(adEvents[0][2]).toMatchObject({
      slot_id: '5901189870',
      placement_slot_id: '5901189870_top',
      event_type: 'UNFILLED',
      apartment_name: 'GLOBAL',
      user_agent_category: expect.stringMatching(/^(DESKTOP|MOBILE_WEB|IN_APP_BROWSER)$/),
    });

    // Legacy sendAdTelemetryBeacon now also populates user_agent_category in GA4
    expect(adEvents[1][2]).toMatchObject({
      slot_id: '5901189870',
      event_type: 'FALLBACK_CLICK',
      apartment_name: '동탄역시범더샵센트럴시티',
      user_agent_category: expect.stringMatching(/^(DESKTOP|MOBILE_WEB|IN_APP_BROWSER)$/),
    });

    // /api/ads/click wire payload must NOT leak placementSlotId
    expect(sendBeaconMock).toHaveBeenCalledTimes(2);
    const wireJson0 = JSON.parse(sendBeaconMock.mock.calls[0][1] as string);
    expect(wireJson0.placementSlotId).toBeUndefined();
    expect(wireJson0.slotId).toBe('5901189870');
  });

  it('respects dview_is_admin exclusion and degrades safely if window.dataLayer is frozen', () => {
    localStorage.setItem('dview_is_admin', 'true');
    const gtagMock = jest.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtagMock;

    expect(
      dispatchGa4AdTelemetry({
        eventType: 'VIEWABLE_IMPRESSION',
        slotId: '6782594447',
      })
    ).toBe(false);
    expect(gtagMock).not.toHaveBeenCalled();

    localStorage.removeItem('dview_is_admin');
    (window as unknown as { gtag?: unknown }).gtag = undefined;
    (window as unknown as { dataLayer?: unknown[] }).dataLayer = Object.freeze([]) as unknown as unknown[];

    expect(() =>
      dispatchGa4AdTelemetry({
        eventType: 'VIEWABLE_IMPRESSION',
        slotId: '6782594447',
      })
    ).not.toThrow();
    expect(
      dispatchGa4AdTelemetry({
        eventType: 'VIEWABLE_IMPRESSION',
        slotId: '6782594447',
      })
    ).toBe(false);
  });

  it('normalizes empty/whitespace apartmentName to GLOBAL and caps >100-char GA4 custom dimension strings to 100 characters', () => {
    const gtagMock = jest.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtagMock;

    const overlongArticleTitle =
      '[2026 동탄 1신도시 vs 2신도시 실거래가·GTX-A·트램·학군·지식산업센터·전세가율 종합 비교 분석 가이드] ' +
      '오산동·청계동·영천동·반송동 핵심 단지 총정리 리포트 (심층 업데이트판)';
    expect(overlongArticleTitle.length).toBeGreaterThan(GA4_MAX_PARAM_VALUE_LENGTH);

    expect(
      dispatchGa4AdTelemetry({
        eventType: 'IMPRESSION',
        slotId: '6782594447',
        apartmentName: '   ',
      })
    ).toBe(true);
    expect(gtagMock.mock.calls[0][2]).toMatchObject({
      apartment_name: 'GLOBAL',
    });

    expect(
      dispatchGa4AdTelemetry({
        eventType: 'VIEWABLE_IMPRESSION',
        slotId: '6782594447',
        apartmentName: overlongArticleTitle,
      })
    ).toBe(true);
    const emittedAptName = (gtagMock.mock.calls[1][2] as { apartment_name: string }).apartment_name;
    expect(emittedAptName.length).toBe(GA4_MAX_PARAM_VALUE_LENGTH);
    expect(emittedAptName).toBe(overlongArticleTitle.slice(0, GA4_MAX_PARAM_VALUE_LENGTH));
  });
});

describe('3. <AdSlot /> MRC 1,000ms Active View VIEWABLE_IMPRESSION Lifecycle & Edge Cases', () => {
  const originalEnv = process.env;
  const originalSendBeacon = navigator.sendBeacon;
  let sendBeaconMock: jest.Mock;
  let gtagMock: jest.Mock;

  const setDocumentHidden = (hidden: boolean) => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-31T12:00:00.000Z'));
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-1122334455667788',
      NEXT_PUBLIC_GA_ID: 'G-Y17BHJ77W6',
    };

    localStorage.clear();
    setDocumentHidden(false);

    jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
      isAdBlockActive: false,
      isLoading: false,
    });

    sendBeaconMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeaconMock,
    });

    gtagMock = jest.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtagMock;

    adRefreshManager.reset();
    delete (window as unknown as { adsbygoogle?: unknown }).adsbygoogle;
  });

  afterEach(() => {
    cleanup();
    adRefreshManager.reset();
    setDocumentHidden(false);
    jest.useRealTimers();
    process.env = originalEnv;
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: originalSendBeacon,
    });
    (window as unknown as { gtag?: unknown }).gtag = undefined;
  });

  const getViewableImpressionCalls = () =>
    gtagMock.mock.calls.filter(
      (call) =>
        call[0] === 'event' &&
        call[1] === 'ad_telemetry' &&
        (call[2] as Record<string, unknown>)?.event_type === 'VIEWABLE_IMPRESSION'
    );

  it('emits VIEWABLE_IMPRESSION after 1,000ms continuous active view (>= 50% visible & filled), deduplicates within cycle, and makes 0 sendBeacon calls', () => {
    const { container } = render(
      <AdSlot
        slotId="6782594447"
        refreshSlotId="guide_article_mid"
        apartmentName="동탄역롯데캐슬"
        dong="오산동"
      />
    );

    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;
    expect(ins).toBeTruthy();

    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });

    // At 999ms: must NOT have fired yet
    act(() => {
      jest.advanceTimersByTime(VIEWABLE_IMPRESSION_DWELL_MS - 1);
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);

    // At 1,000ms: fires exactly once
    act(() => {
      jest.advanceTimersByTime(1);
    });
    const calls = getViewableImpressionCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][2]).toMatchObject({
      slot_id: '6782594447',
      placement_slot_id: 'guide_article_mid',
      event_type: 'VIEWABLE_IMPRESSION',
      apartment_name: '동탄역롯데캐슬',
      dong: '오산동',
      user_agent_category: 'DESKTOP',
    });
    expect((calls[0][2] as { dwell_time_ms: number }).dwell_time_ms).toBeGreaterThanOrEqual(1000);
    expect((calls[0][2] as { intersection_ratio: number }).intersection_ratio).toBeGreaterThanOrEqual(0.5);

    // Zero /api/ads/click sendBeacon calls on normal AdSense fill
    expect(sendBeaconMock).not.toHaveBeenCalled();

    // Remaining viewable for another 15s within Cycle 0 must NOT emit a duplicate
    act(() => {
      jest.advanceTimersByTime(15000);
    });
    expect(getViewableImpressionCalls()).toHaveLength(1);
  });

  it('cancels VIEWABLE_IMPRESSION when scrolled below 50% before 1,000ms and fires only after a full 1,000ms continuous re-entry', () => {
    const { container } = render(
      <AdSlot slotId="6782594447" refreshSlotId="scroll_abort_slot" />
    );
    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;

    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });

    // Viewable for only 600ms, then user scrolls away (ratio = 0.20 < 0.50)
    act(() => {
      jest.advanceTimersByTime(600);
      adRefreshManager.updateIntersection('scroll_abort_slot', 0.2);
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);

    // User scrolls back into view (ratio = 0.75 >= 0.50)
    act(() => {
      adRefreshManager.updateIntersection('scroll_abort_slot', 0.75);
      jest.advanceTimersByTime(900);
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);

    // Minor scroll adjustment while still viewable (0.75 -> 0.90) must NOT reset the ongoing 1s window
    act(() => {
      adRefreshManager.updateIntersection('scroll_abort_slot', 0.9);
      jest.advanceTimersByTime(100);
    });
    expect(getViewableImpressionCalls()).toHaveLength(1);
  });

  it('waits to start the 1,000ms timer if slot fills off-screen until the user scrolls it >= 50% into view', () => {
    const { container } = render(
      <AdSlot slotId="6782594447" refreshSlotId="offscreen_fill_slot" />
    );
    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;

    // Immediately move slot off-screen before fill
    act(() => {
      adRefreshManager.updateIntersection('offscreen_fill_slot', 0.1);
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);

    // Scroll into view -> fires 1,000ms later
    act(() => {
      adRefreshManager.updateIntersection('offscreen_fill_slot', 0.65);
      jest.advanceTimersByTime(999);
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(getViewableImpressionCalls()).toHaveLength(1);
  });

  it('aborts pending VIEWABLE_IMPRESSION when tab becomes hidden (document.hidden) and requires 1,000ms continuous foreground view on return', () => {
    const { container } = render(
      <AdSlot slotId="6782594447" refreshSlotId="tab_hidden_slot" />
    );
    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;

    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });

    act(() => {
      jest.advanceTimersByTime(500);
      setDocumentHidden(true);
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);

    // Return tab to foreground
    act(() => {
      setDocumentHidden(false);
      jest.advanceTimersByTime(999);
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(getViewableImpressionCalls()).toHaveLength(1);
  });

  it('never emits VIEWABLE_IMPRESSION when AdSense returns data-ad-status="unfilled"', () => {
    const { container } = render(
      <AdSlot slotId="6782594447" refreshSlotId="unfilled_slot" />
    );
    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;

    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'unfilled');
      jest.advanceTimersByTime(5000);
    });

    expect(getViewableImpressionCalls()).toHaveLength(0);
    const unfilledCalls = gtagMock.mock.calls.filter(
      (c) => (c[2] as Record<string, unknown>)?.event_type === 'UNFILLED'
    );
    expect(unfilledCalls).toHaveLength(1);
  });

  it('tracks independent VIEWABLE_IMPRESSION events across Cycle 0 and Cycle 1 after a 30s dwell refresh', () => {
    const { container } = render(
      <AdSlot
        slotId="6782594447"
        refreshSlotId="multi_cycle_slot"
        dwellThresholdMs={30000}
      />
    );
    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;

    // Cycle 0 fill
    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getViewableImpressionCalls()).toHaveLength(1);

    // Advance remaining 29,000ms to trigger 30s dwell refresh -> enters Cycle 1
    act(() => {
      jest.advanceTimersByTime(29000);
    });

    // Before Cycle 1 fills: still only 1 VIEWABLE_IMPRESSION
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getViewableImpressionCalls()).toHaveLength(1);

    // Cycle 1 AdSense creative fills -> after 1,000ms emits 2nd VIEWABLE_IMPRESSION
    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getViewableImpressionCalls()).toHaveLength(2);

    // Verify 1:1 IMPRESSION parity across Cycle 0 and Cycle 1 (no duplicate IMPRESSION on Cycle 1 fill)
    const impressionCalls = gtagMock.mock.calls.filter(
      (call) =>
        call[0] === 'event' &&
        call[1] === 'ad_telemetry' &&
        (call[2] as Record<string, unknown>)?.event_type === 'IMPRESSION'
    );
    expect(impressionCalls).toHaveLength(2);
  });

  it('maintains 0 <= VIEWABLE_IMPRESSION <= IMPRESSION on Cycle 0 early bounce (< 1,000ms) while keeping /api/ads/click sendBeacon at 0', () => {
    const { container, unmount } = render(
      <AdSlot
        slotId="6782594447"
        refreshSlotId="early_bounce_slot"
        apartmentName="동탄역롯데캐슬"
      />
    );
    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;

    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });

    // User bounces after 400ms (< 1,000ms MRC threshold)
    act(() => {
      jest.advanceTimersByTime(400);
    });
    unmount();

    const impressionCalls = gtagMock.mock.calls.filter(
      (c) => (c[2] as Record<string, unknown>)?.event_type === 'IMPRESSION'
    );
    expect(impressionCalls).toHaveLength(1);
    expect(impressionCalls[0][2]).toMatchObject({
      slot_id: '6782594447',
      placement_slot_id: 'early_bounce_slot',
      event_type: 'IMPRESSION',
      apartment_name: '동탄역롯데캐슬',
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);
    expect(sendBeaconMock).toHaveBeenCalledTimes(0);
  });

  it('cancels pending VIEWABLE_IMPRESSION, resets <ins>, and re-pushes AdSense when slotId mutates mid-flight while refreshSlotId remains constant', () => {
    const pushSpy = jest.fn();
    (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = {
      push: pushSpy,
    };

    const { container, rerender } = render(
      <AdSlot slotId="1111111111" refreshSlotId="constant_placement_key" />
    );
    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;
    expect(pushSpy).toHaveBeenCalledTimes(1);

    // Slot 1111111111 fills at t = 0ms -> emits IMPRESSION for 1111111111 and arms 1,000ms timer
    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });

    // At t = 500ms, slotId dynamically transitions to 2222222222 while refreshSlotId stays constant
    act(() => {
      jest.advanceTimersByTime(500);
    });
    rerender(<AdSlot slotId="2222222222" refreshSlotId="constant_placement_key" />);

    // <ins> DOM must be wiped and AdSense re-pushed for 2222222222
    expect(ins.getAttribute('data-ad-status')).toBeNull();
    expect(ins.getAttribute('data-adsbygoogle-status')).toBeNull();
    expect(pushSpy).toHaveBeenCalledTimes(2);

    // Advancing past t = 1,000ms without 2222222222 filling MUST NOT emit a forged VIEWABLE_IMPRESSION
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(getViewableImpressionCalls()).toHaveLength(0);

    // Once 2222222222 genuinely fills and remains viewable for 1,000ms, VIEWABLE_IMPRESSION fires for 2222222222
    act(() => {
      ins.setAttribute('data-adsbygoogle-status', 'done');
      ins.setAttribute('data-ad-status', 'filled');
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    const viewableCalls = getViewableImpressionCalls();
    expect(viewableCalls).toHaveLength(1);
    expect(viewableCalls[0][2]).toMatchObject({
      slot_id: '2222222222',
      placement_slot_id: 'constant_placement_key',
      event_type: 'VIEWABLE_IMPRESSION',
    });
  });

  it('handles real AdSense pre-auction host wrapper injection followed by unfilled AND cancels pending VIEWABLE_IMPRESSION when <ins> is replaced via replaceWith/replaceChild', () => {
    // Case A: adsbygoogle.js injects <div id="aswift_1_host"> at push time (data-ad-status === null),
    // then 150ms later sets data-ad-status="unfilled"
    const { container, unmount } = render(
      <AdSlot slotId="6782594447" refreshSlotId="pre_auction_host_slot" />
    );
    const insA = container.querySelector('ins.adsbygoogle') as HTMLElement;

    act(() => {
      insA.setAttribute('data-adsbygoogle-status', 'done');
      const hostWrapper = document.createElement('div');
      hostWrapper.id = 'aswift_1_host';
      insA.appendChild(hostWrapper);
    });

    act(() => {
      jest.advanceTimersByTime(150);
      insA.setAttribute('data-ad-status', 'unfilled');
      jest.advanceTimersByTime(2000);
    });

    expect(
      container.querySelector('[data-testid="ad-slot-cascade-fallback"]')
    ).toBeInTheDocument();
    expect(getViewableImpressionCalls()).toHaveLength(0);
    const caseAImpressions = gtagMock.mock.calls.filter(
      (c) => (c[2] as Record<string, unknown>)?.event_type === 'IMPRESSION'
    );
    expect(caseAImpressions).toHaveLength(0);
    unmount();

    // Case B: <ins> fills at t = 0ms, then at t = 500ms adsbygoogle.js replaces <ins> via replaceWith
    // with an unfilled replacement <ins> -> cancels pending VIEWABLE_IMPRESSION and activates fallback
    gtagMock.mockClear();
    adRefreshManager.reset();

    const renderB = render(
      <AdSlot slotId="6782594447" refreshSlotId="replace_with_abort_slot" />
    );
    const insB = renderB.container.querySelector('ins.adsbygoogle') as HTMLElement;

    act(() => {
      insB.setAttribute('data-adsbygoogle-status', 'done');
      insB.setAttribute('data-ad-status', 'filled');
      jest.advanceTimersByTime(500);
    });

    const replacementIns = document.createElement('ins');
    replacementIns.className = 'adsbygoogle';
    replacementIns.setAttribute('data-adsbygoogle-status', 'done');
    replacementIns.setAttribute('data-ad-status', 'unfilled');

    act(() => {
      insB.replaceWith(replacementIns);
      jest.advanceTimersByTime(1500);
    });

    expect(
      renderB.container.querySelector('[data-testid="ad-slot-cascade-fallback"]')
    ).toBeInTheDocument();
    expect(getViewableImpressionCalls()).toHaveLength(0);
  });
});

describe('4. GA4 Custom Dimensions & Metrics Service Unit & Adversarial Verification', () => {
  it('defines the 4 required core custom dimensions plus extended dimensions and custom metrics', () => {
    const coreNames = DVIEW_GA4_CUSTOM_DIMENSIONS.filter((d) => d.requiredCore).map(
      (d) => d.parameterName
    );
    expect(coreNames).toEqual([
      'slot_id',
      'event_type',
      'apartment_name',
      'user_agent_category',
    ]);
    expect(DVIEW_GA4_CUSTOM_METRICS.map((m) => m.parameterName)).toEqual([
      'dwell_time_ms',
      'intersection_ratio',
    ]);
  });

  it('plans ad_telemetry Data API queries safely across 0, partial, and full custom dimension metadata without exceeding 9 dimensions', () => {
    // Case A: 0 custom dimensions registered (current pre-sync property state)
    const fallbackPlan = buildAdTelemetryReportPlan([], []);
    expect(fallbackPlan.mode).toBe('PAGE_DEVICE_FALLBACK');
    expect(fallbackPlan.dimensions).toEqual(['pagePath', 'deviceCategory']);
    expect(fallbackPlan.metrics).toEqual(['eventCount', 'totalUsers']);
    expect(fallbackPlan.coverage.coreComplete).toBe(false);
    expect(fallbackPlan.coverage.missingCoreDimensions).toEqual([
      'slot_id',
      'event_type',
      'apartment_name',
      'user_agent_category',
    ]);

    // Case B: Partial registration (only slot_id & event_type propagated so far)
    const partialPlan = buildAdTelemetryReportPlan(
      [{ apiName: 'customEvent:slot_id' }, { apiName: 'customEvent:event_type' }],
      []
    );
    expect(partialPlan.mode).toBe('PARTIAL_CUSTOM_BREAKDOWN');
    expect(partialPlan.dimensions).toEqual([
      'pagePath',
      'deviceCategory',
      'customEvent:slot_id',
      'customEvent:event_type',
    ]);

    // Case C: Full registration (all 7 custom dimensions + 2 custom metrics)
    const fullPlan = buildAdTelemetryReportPlan(
      DVIEW_GA4_CUSTOM_DIMENSIONS.map((d) => ({ apiName: d.apiName, customDefinition: true })),
      DVIEW_GA4_CUSTOM_METRICS.map((m) => ({ apiName: m.apiName, customDefinition: true }))
    );
    expect(fullPlan.mode).toBe('FULL_SLOT_BREAKDOWN');
    expect(fullPlan.coverage.coreComplete).toBe(true);
    expect(fullPlan.coverage.allDimensionsComplete).toBe(true);
    expect(fullPlan.coverage.allMetricsComplete).toBe(true);
    expect(fullPlan.dimensions.length).toBeLessThanOrEqual(MAX_GA4_REPORT_DIMENSIONS);
    expect(fullPlan.metrics).toEqual([
      'eventCount',
      'totalUsers',
      'customEvent:dwell_time_ms',
      'customEvent:intersection_ratio',
    ]);
  });

  it('aggregates both pre-registration (pagePath/deviceCategory) and post-registration (slot_id/IMPRESSION/VIEWABLE_IMPRESSION) rows accurately', () => {
    // Pre-registration historical rows matching live GA4 property 527874632 (5 desktop + 6 mobile = 11)
    const historicalSummary = summarizeAdTelemetryReportRows([
      { pagePath: '/', deviceCategory: 'desktop', eventCount: 5 },
      { pagePath: '/guide/dongtan-1-vs-2-comparison', deviceCategory: 'mobile', eventCount: 5 },
      { pagePath: '/guide/dongtan-budget-tier-ranking', deviceCategory: 'mobile', eventCount: 1 },
    ]);
    expect(historicalSummary.totalAdTelemetryEvents).toBe(11);
    expect(historicalSummary.impressionEvents).toBe(0);
    expect(historicalSummary.viewableImpressionEvents).toBe(0);
    expect(historicalSummary.unclassifiedHistoricalEvents).toBe(11);
    expect(historicalSummary.bySlotAndEventType).toHaveLength(0);

    // Post-registration slot-level rows
    const detailedSummary = summarizeAdTelemetryReportRows([
      {
        pagePath: '/',
        deviceCategory: 'desktop',
        'customEvent:slot_id': '6782594447',
        'customEvent:placement_slot_id': 'dashboard_bottom',
        'customEvent:event_type': 'IMPRESSION',
        'customEvent:apartment_name': 'GLOBAL',
        'customEvent:user_agent_category': 'DESKTOP',
        eventCount: 10,
      },
      {
        pagePath: '/',
        deviceCategory: 'desktop',
        'customEvent:slot_id': '6782594447',
        'customEvent:placement_slot_id': 'dashboard_bottom',
        'customEvent:event_type': 'VIEWABLE_IMPRESSION',
        'customEvent:apartment_name': 'GLOBAL',
        'customEvent:user_agent_category': 'DESKTOP',
        eventCount: 8,
      },
      {
        pagePath: '/guide/dongtan-1-vs-2-comparison',
        deviceCategory: 'mobile',
        'customEvent:slot_id': '5901189870',
        'customEvent:placement_slot_id': 'article_mid',
        'customEvent:event_type': 'VIEWABLE_IMPRESSION',
        'customEvent:apartment_name': '동탄역롯데캐슬',
        'customEvent:user_agent_category': 'MOBILE_WEB',
        eventCount: 4,
      },
      {
        pagePath: '/guide/dongtan-1-vs-2-comparison',
        deviceCategory: 'mobile',
        'customEvent:slot_id': '5901189870',
        'customEvent:placement_slot_id': 'article_mid',
        'customEvent:event_type': 'UNFILLED',
        'customEvent:apartment_name': '동탄역롯데캐슬',
        'customEvent:user_agent_category': 'IN_APP_BROWSER',
        eventCount: 2,
      },
    ]);
    expect(detailedSummary.totalAdTelemetryEvents).toBe(24);
    expect(detailedSummary.impressionEvents).toBe(10);
    expect(detailedSummary.viewableImpressionEvents).toBe(12);
    expect(detailedSummary.unclassifiedHistoricalEvents).toBe(0);
    expect(detailedSummary.byEventType).toEqual({
      IMPRESSION: 10,
      VIEWABLE_IMPRESSION: 12,
      UNFILLED: 2,
    });
    expect(detailedSummary.bySlotAndEventType).toHaveLength(4);
  });

  it('idempotently provisions missing definitions across paginated Admin API responses, tolerates 409 ALREADY_EXISTS, and performs 0 POSTs on re-run or dryRun', async () => {
    const createdDimPayloads: Array<Record<string, unknown>> = [];
    const createdMetPayloads: Array<Record<string, unknown>> = [];
    const registeredDims = new Set<string>(['slot_id']); // page 1 already has slot_id
    const registeredMets = new Set<string>();

    const mockFetch: typeof fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const method = (init?.method || 'GET').toUpperCase();

      if (method === 'GET' && url.pathname.endsWith('/customDimensions')) {
        const token = url.searchParams.get('pageToken');
        if (!token) {
          return new Response(
            JSON.stringify({
              customDimensions: [{ parameterName: 'slot_id' }],
              nextPageToken: 'page-2',
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            customDimensions: Array.from(registeredDims)
              .filter((p) => p !== 'slot_id')
              .map((parameterName) => ({ parameterName })),
          }),
          { status: 200 }
        );
      }

      if (method === 'GET' && url.pathname.endsWith('/customMetrics')) {
        return new Response(
          JSON.stringify({
            customMetrics: Array.from(registeredMets).map((parameterName) => ({ parameterName })),
          }),
          { status: 200 }
        );
      }

      if (method === 'POST' && url.pathname.endsWith('/customDimensions')) {
        const body = JSON.parse(String(init?.body || '{}')) as { parameterName: string };
        createdDimPayloads.push(body);
        if (body.parameterName === 'dong') {
          // Simulate concurrent 409 ALREADY_EXISTS race
          registeredDims.add('dong');
          return new Response(
            JSON.stringify({ error: { code: 409, status: 'ALREADY_EXISTS', message: 'Already exists' } }),
            { status: 409 }
          );
        }
        registeredDims.add(body.parameterName);
        return new Response(JSON.stringify(body), { status: 200 });
      }

      if (method === 'POST' && url.pathname.endsWith('/customMetrics')) {
        const body = JSON.parse(String(init?.body || '{}')) as { parameterName: string };
        createdMetPayloads.push(body);
        registeredMets.add(body.parameterName);
        return new Response(JSON.stringify(body), { status: 200 });
      }

      return new Response('Not Found', { status: 404 });
    }) as unknown as typeof fetch;

    const getToken = jest.fn().mockResolvedValue('mock-oauth-token');

    // 1. Dry-run preview makes 0 POSTs
    const dryRes = await syncGa4CustomDefinitions({
      propertyId: '527874632',
      clientEmail: 'sa@portfolio-dtdls-489912.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----',
      dryRun: true,
      fetchFn: mockFetch,
      getAccessTokenFn: getToken,
    });
    expect(dryRes.ok).toBe(true);
    expect(dryRes.status).toBe('DRY_RUN');
    expect(dryRes.alreadyExistingDimensions).toEqual(['slot_id']);
    expect(dryRes.plannedDimensions).toEqual([
      'event_type',
      'apartment_name',
      'user_agent_category',
      'placement_slot_id',
      'cpa_campaign_id',
      'dong',
    ]);
    expect(createdDimPayloads).toHaveLength(0);

    // 2. Live sync creates missing definitions and tolerates 409 on 'dong'
    const syncRes = await syncGa4CustomDefinitions({
      propertyId: '527874632',
      clientEmail: 'sa@portfolio-dtdls-489912.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----',
      fetchFn: mockFetch,
      getAccessTokenFn: getToken,
    });
    expect(syncRes.ok).toBe(true);
    expect(syncRes.status).toBe('SYNCED');
    expect(syncRes.createdDimensions).toEqual([
      'event_type',
      'apartment_name',
      'user_agent_category',
      'placement_slot_id',
      'cpa_campaign_id',
    ]);
    expect(syncRes.alreadyExistingDimensions).toEqual(['slot_id', 'dong']);
    expect(syncRes.createdMetrics).toEqual(['dwell_time_ms', 'intersection_ratio']);

    // 3. Second live sync is 100% idempotent (0 additional POSTs)
    const postCountBeforeRerun = createdDimPayloads.length + createdMetPayloads.length;
    const secondSync = await syncGa4CustomDefinitions({
      propertyId: '527874632',
      clientEmail: 'sa@portfolio-dtdls-489912.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----',
      fetchFn: mockFetch,
      getAccessTokenFn: getToken,
    });
    expect(secondSync.ok).toBe(true);
    expect(secondSync.status).toBe('SYNCED');
    expect(secondSync.createdDimensions).toEqual([]);
    expect(secondSync.createdMetrics).toEqual([]);
    expect(createdDimPayloads.length + createdMetPayloads.length).toBe(postCountBeforeRerun);
  });

  it('accurately classifies 403 SERVICE_DISABLED, 403 PERMISSION_DENIED, MISSING_CREDENTIALS, and invalid propertyId', async () => {
    const getToken = jest.fn().mockResolvedValue('mock-oauth-token');

    // Missing credentials
    const missingRes = await syncGa4CustomDefinitions({
      propertyId: '527874632',
      clientEmail: '',
      privateKey: '',
    });
    expect(missingRes.ok).toBe(false);
    expect(missingRes.status).toBe('MISSING_CREDENTIALS');

    // Invalid non-numeric propertyId
    const invalidPropRes = await syncGa4CustomDefinitions({
      propertyId: 'not-a-number',
      clientEmail: 'sa@test.iam.gserviceaccount.com',
      privateKey: 'key',
    });
    expect(invalidPropRes.ok).toBe(false);
    expect(invalidPropRes.status).toBe('API_ERROR');

    // 403 SERVICE_DISABLED
    const disabledFetch: typeof fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 403,
            status: 'PERMISSION_DENIED',
            message:
              'Google Analytics Admin API has not been used in project 388809605487 before or it is disabled.',
            details: [
              {
                reason: 'SERVICE_DISABLED',
                metadata: {
                  activationUrl:
                    'https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=388809605487',
                },
              },
            ],
          },
        }),
        { status: 403 }
      )
    ) as unknown as typeof fetch;

    const disabledRes = await syncGa4CustomDefinitions({
      propertyId: '527874632',
      clientEmail: 'sa@portfolio-dtdls-489912.iam.gserviceaccount.com',
      privateKey: 'key',
      fetchFn: disabledFetch,
      getAccessTokenFn: getToken,
    });
    expect(disabledRes.ok).toBe(false);
    expect(disabledRes.status).toBe('BLOCKED_ADMIN_API_DISABLED');
    expect(disabledRes.activationUrl).toBe(
      'https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=388809605487'
    );

    // 403 PERMISSION_DENIED (Admin API enabled, but service account only has Viewer role)
    const viewerOnlyFetch: typeof fetch = jest.fn(async (_input, init) => {
      if (!init?.method || init.method === 'GET') {
        return new Response(JSON.stringify({ customDimensions: [] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          error: {
            code: 403,
            status: 'PERMISSION_DENIED',
            message: 'The caller does not have permission',
          },
        }),
        { status: 403 }
      );
    }) as unknown as typeof fetch;

    const viewerOnlyRes = await syncGa4CustomDefinitions({
      propertyId: '527874632',
      clientEmail: 'sa@portfolio-dtdls-489912.iam.gserviceaccount.com',
      privateKey: 'key',
      fetchFn: viewerOnlyFetch,
      getAccessTokenFn: getToken,
    });
    expect(viewerOnlyRes.ok).toBe(false);
    expect(viewerOnlyRes.status).toBe('BLOCKED_INSUFFICIENT_ROLE');
  });

  it('inspectGa4CustomDimensionCoverage handles null/undefined/blank apiName entries cleanly', () => {
    const cov = inspectGa4CustomDimensionCoverage(
      [{ apiName: null }, { apiName: '   ' }, { apiName: 'customEvent:slot_id' }],
      [{ apiName: undefined }]
    );
    expect(cov.registeredCoreDimensions).toEqual(['slot_id']);
    expect(cov.missingCoreDimensions).toEqual([
      'event_type',
      'apartment_name',
      'user_agent_category',
    ]);
    expect(cov.interactionComplete).toBe(false);
    expect(cov.missingInteractionDimensions).toEqual(
      DVIEW_GA4_INTERACTION_DIMENSIONS.map((d) => d.parameterName)
    );
  });

  it('resolves legacy customEvent:campaign_id alias in buildAdTelemetryReportPlan & summarizeAdTelemetryReportRows and prefers canonical customEvent:cpa_campaign_id when both exist', () => {
    // 1. Live Property 527874632 state: legacy customEvent:campaign_id present, canonical customEvent:cpa_campaign_id missing
    const legacyMetadataDims = [
      { apiName: 'customEvent:slot_id' },
      { apiName: 'customEvent:event_type' },
      { apiName: 'customEvent:apartment_name' },
      { apiName: 'customEvent:user_agent_category' },
      { apiName: 'customEvent:placement_slot_id' },
      { apiName: 'customEvent:campaign_id' },
      { apiName: 'customEvent:dong' },
    ];
    const legacyPlan = buildAdTelemetryReportPlan(legacyMetadataDims, []);
    expect(legacyPlan.mode).toBe('FULL_SLOT_BREAKDOWN');
    expect(legacyPlan.coverage.missingExtendedDimensions).toEqual(['cpa_campaign_id']);
    expect(legacyPlan.coverage.legacyAliasDimensions).toEqual([
      {
        parameterName: 'cpa_campaign_id',
        canonicalApiName: 'customEvent:cpa_campaign_id',
        activeLegacyApiName: 'customEvent:campaign_id',
      },
    ]);
    expect(legacyPlan.dimensions).toContain('customEvent:campaign_id');
    expect(legacyPlan.dimensions.length).toBeLessThanOrEqual(MAX_GA4_REPORT_DIMENSIONS);

    // 2. Dual state during migration: canonical cpa_campaign_id + legacy campaign_id both registered -> prefer canonical only
    const bothPlan = buildAdTelemetryReportPlan(
      [...legacyMetadataDims, { apiName: 'customEvent:cpa_campaign_id' }],
      []
    );
    expect(bothPlan.coverage.allDimensionsComplete).toBe(true);
    expect(bothPlan.coverage.legacyAliasDimensions).toEqual([]);
    expect(bothPlan.dimensions).toContain('customEvent:cpa_campaign_id');
    expect(bothPlan.dimensions).not.toContain('customEvent:campaign_id');

    // 3. summarizeAdTelemetryReportRows merges historical campaign_id and canonical cpa_campaign_id rows uniformly
    const mergedSummary = summarizeAdTelemetryReportRows([
      {
        pagePath: '/',
        deviceCategory: 'desktop',
        'customEvent:slot_id': '6782594447',
        'customEvent:placement_slot_id': 'dashboard_bottom',
        'customEvent:event_type': 'ADBLOCK_FALLBACK',
        'customEvent:apartment_name': 'GLOBAL',
        'customEvent:user_agent_category': 'DESKTOP',
        'customEvent:campaign_id': 'mortgage-refinance',
        eventCount: 3,
      },
      {
        pagePath: '/',
        deviceCategory: 'mobile',
        'customEvent:slot_id': '6782594447',
        'customEvent:placement_slot_id': 'dashboard_bottom',
        'customEvent:event_type': 'FALLBACK_CLICK',
        'customEvent:apartment_name': 'GLOBAL',
        'customEvent:user_agent_category': 'MOBILE_WEB',
        'customEvent:cpa_campaign_id': 'corporate-relocation',
        eventCount: 2,
      },
    ]);
    expect(mergedSummary.byCpaCampaign).toEqual({
      'mortgage-refinance': 3,
      'corporate-relocation': 2,
    });
    expect(mergedSummary.bySlotAndEventType[0].cpaCampaignId).toBe('mortgage-refinance');
    expect(mergedSummary.bySlotAndEventType[1].cpaCampaignId).toBe('corporate-relocation');
  });

  it('disambiguates displayName collisions and continues provisioning surface/view_type when search_term hits GA4 predefined-parameter HTTP 400', async () => {
    const postedPayloads: Array<{ parameterName: string; displayName: string }> = [];
    const mockFetch: typeof fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const method = (init?.method || 'GET').toUpperCase();

      if (method === 'GET' && url.pathname.endsWith('/customDimensions')) {
        return new Response(
          JSON.stringify({
            customDimensions: [
              { parameterName: 'slot_id', displayName: 'Ad Slot ID' },
              { parameterName: 'event_type', displayName: 'Ad Telemetry Event Type' },
              { parameterName: 'apartment_name', displayName: 'Apartment Name' },
              { parameterName: 'user_agent_category', displayName: 'User Agent Category' },
              { parameterName: 'placement_slot_id', displayName: 'Ad Placement Slot Key' },
              { parameterName: 'campaign_id', displayName: 'CPA Fallback Campaign ID' },
              { parameterName: 'dong', displayName: 'Legal Dong' },
            ],
          }),
          { status: 200 }
        );
      }

      if (method === 'GET' && url.pathname.endsWith('/customMetrics')) {
        return new Response(
          JSON.stringify({
            customMetrics: [
              { parameterName: 'dwell_time_ms' },
              { parameterName: 'intersection_ratio' },
            ],
          }),
          { status: 200 }
        );
      }

      if (method === 'POST' && url.pathname.endsWith('/customDimensions')) {
        const body = JSON.parse(String(init?.body || '{}')) as {
          parameterName: string;
          displayName: string;
        };
        postedPayloads.push(body);
        if (body.parameterName === 'search_term') {
          return new Response(
            JSON.stringify({
              error: {
                code: 400,
                status: 'INVALID_ARGUMENT',
                message: 'Parameter name search_term is reserved for built-in dimension searchTerm.',
              },
            }),
            { status: 400 }
          );
        }
        return new Response(JSON.stringify(body), { status: 200 });
      }

      return new Response('Not Found', { status: 404 });
    }) as unknown as typeof fetch;

    const res = await syncGa4CustomDefinitions({
      propertyId: '527874632',
      clientEmail: 'sa@test.iam.gserviceaccount.com',
      privateKey: 'mock-key',
      includeInteractionDimensions: true,
      fetchFn: mockFetch,
      getAccessTokenFn: async () => 'mock-token',
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe('SYNCED');
    expect(res.createdDimensions).toEqual([
      'cpa_campaign_id',
      'surface',
      'view_type',
      'trigger',
      'chapter_id',
      'selected_apt',
      'zone',
      'calculator_type',
      'tab_name',
    ]);
    expect(res.alreadyExistingDimensions).toEqual([
      'slot_id',
      'event_type',
      'apartment_name',
      'user_agent_category',
      'placement_slot_id',
      'dong',
      'search_term',
    ]);
    expect(postedPayloads.find((p) => p.parameterName === 'cpa_campaign_id')?.displayName).toBe(
      'CPA Campaign ID'
    );
    expect(res.remediationSteps.some((s) => s.includes('searchTerm'))).toBe(true);
  });

  it('buildInteractionFunnelReportPlan resolves built-in searchTerm fallback before customEvent:search_term propagates', () => {
    const preSyncPlan = buildInteractionFunnelReportPlan([
      { apiName: 'searchTerm' },
      { apiName: 'customEvent:apartment_name' },
    ]);
    expect(preSyncPlan.resolvedMap).toEqual({
      search_term: 'searchTerm',
      apartment_name: 'customEvent:apartment_name',
    });
    expect(preSyncPlan.dimensions).toEqual(['searchTerm', 'customEvent:apartment_name']);

    const fullInteractionPlan = buildInteractionFunnelReportPlan([
      { apiName: 'searchTerm' },
      ...DVIEW_GA4_INTERACTION_DIMENSIONS.map((d) => ({ apiName: d.apiName })),
      { apiName: 'customEvent:apartment_name' },
      { apiName: 'customEvent:dong' },
    ]);
    expect(fullInteractionPlan.resolvedMap.search_term).toBe('customEvent:search_term');
    expect(fullInteractionPlan.resolvedMap.surface).toBe('customEvent:surface');
    expect(fullInteractionPlan.resolvedMap.view_type).toBe('customEvent:view_type');
    expect(fullInteractionPlan.dimensions.length).toBeLessThanOrEqual(MAX_GA4_REPORT_DIMENSIONS);
  });
});

import {
  trackEvent,
  trackApartmentView,
  trackSearchQuery,
  resetAnalyticsInteractionState,
  trackVirtualPageView,
  getVirtualPageViewCount,
  resetVirtualPageViewLedger,
  normalizeGa4DataLayerBootstrapOrder,
} from './analytics';
import { sendGAEvent } from '@next/third-parties/google';
import { logger } from '@/lib/services/logger';

// Mock sendGAEvent
jest.mock('@next/third-parties/google', () => ({
  sendGAEvent: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/services/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('analytics.trackEvent & trackVirtualPageView Utility', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    localStorage.clear();
    resetVirtualPageViewLedger();
    resetAnalyticsInteractionState();
    window.dataLayer = undefined;
    window.gtag = undefined;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
    window.dataLayer = undefined;
    window.gtag = undefined;
  });

  it('should log to console in development mode', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    trackEvent('test_event', { key: 'value' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Analytics Event] test_event'),
      expect.any(String),
      { key: 'value' }
    );
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('should not track anything if the user is an admin', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    localStorage.setItem('dview_is_admin', 'true');

    trackEvent('test_event', { key: 'value' });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('should call sendGAEvent with gtag.js 3-arg tuple in production if NEXT_PUBLIC_GA_ID is set', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    trackEvent('prod_event', { foo: 'bar' });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(sendGAEvent).toHaveBeenCalledTimes(1);
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'prod_event', {
      foo: 'bar',
    });
  });

  it('should not call sendGAEvent in production if NEXT_PUBLIC_GA_ID is missing', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_GA_ID;

    trackEvent('prod_event', { foo: 'bar' });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('should log an error if sendGAEvent throws an exception and restore dataLayer.push', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';
    window.dataLayer = [];
    const initialPush = window.dataLayer.push;

    const testError = new Error('GA Network Error');
    (sendGAEvent as jest.Mock).mockImplementationOnce(() => {
      throw testError;
    });

    trackEvent('error_event', { data: 123 });

    expect(window.dataLayer.push).toBe(initialPush);
    expect(logger.error).toHaveBeenCalledWith(
      'analytics.trackEvent',
      'Failed to send GA event',
      undefined,
      testError
    );
  });

  it('should default omitted params to empty object {} and strip undefined property values without mutating frozen input', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    trackEvent('no_params_event');
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'no_params_event', {});

    const frozenParams = Object.freeze({
      calculator_type: 'mortgage',
      apt_name: undefined,
      surface: 'dashboard',
      zero_val: 0,
      false_val: false,
      empty_str: '',
    });

    trackEvent('open_calculator', frozenParams);
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'open_calculator', {
      calculator_type: 'mortgage',
      surface: 'dashboard',
      zero_val: 0,
      false_val: false,
      empty_str: '',
    });
  });

  it('should ignore empty or whitespace-only event names', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    trackEvent('');
    trackEvent('   ');

    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('should fall back to window.gtag when sendGAEvent does not push to dataLayer, and avoid duplicate call when sendGAEvent pushes', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    const gtagMock = jest.fn();
    window.gtag = gtagMock;

    // Case 1: sendGAEvent is uninitialized (no push to window.dataLayer) -> fallback to window.gtag fires once
    (sendGAEvent as jest.Mock).mockImplementationOnce(() => {
      // Simulates ga.js returning early when currDataLayerName === undefined
    });
    trackEvent('view_apartment', { apt_name: '동탄역 롯데캐슬' });
    expect(sendGAEvent).toHaveBeenCalledTimes(1);
    expect(gtagMock).toHaveBeenCalledTimes(1);
    expect(gtagMock).toHaveBeenCalledWith('event', 'view_apartment', {
      apt_name: '동탄역 롯데캐슬',
    });

    // Case 2: sendGAEvent pushes to window.dataLayer -> window.gtag fallback MUST NOT fire (no duplicate event)
    gtagMock.mockClear();
    (sendGAEvent as jest.Mock).mockImplementationOnce((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });
    trackEvent('search_apartment', { query: '롯데캐슬' });
    expect(gtagMock).not.toHaveBeenCalled();
    expect(window.dataLayer).toHaveLength(1);
  });

  it('should continue tracking if localStorage throws SecurityError and handle frozen dataLayer gracefully', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('SecurityError: storage disabled');
    });
    window.dataLayer = Object.freeze([]) as unknown as NonNullable<Window['dataLayer']>;

    trackEvent('tab_view', { tab_name: 'macro' });

    expect(sendGAEvent).toHaveBeenCalledWith('event', 'tab_view', { tab_name: 'macro' });
    expect(logger.error).not.toHaveBeenCalled();
    getItemSpy.mockRestore();
  });

  it('should queue genuine [object Arguments] into window.dataLayer when both sendGAEvent is uninitialized and window.gtag is undefined', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';
    window.dataLayer = undefined;
    window.gtag = undefined;

    (sendGAEvent as jest.Mock).mockImplementationOnce(() => {
      // Simulates ga.js returning early when currDataLayerName === undefined before _next-ga-init runs
    });

    trackEvent('view_apartment', { apt_name: '동탄역 롯데캐슬', dong: undefined });

    expect(sendGAEvent).toHaveBeenCalledTimes(1);
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer).toHaveLength(1);
    const queued = (window.dataLayer as unknown[])[0] as ArrayLike<unknown>;
    expect(Object.prototype.toString.call(queued)).toBe('[object Arguments]');
    expect(Array.from(queued)).toEqual([
      'event',
      'view_apartment',
      { apt_name: '동탄역 롯데캐슬' },
    ]);
    // Temporary push wrapper must not leave an own 'push' property on a pristine Array
    expect(Object.prototype.hasOwnProperty.call(window.dataLayer, 'push')).toBe(false);
  });

  it('should handle sealed, non-extensible, and getter-only dataLayer.push descriptors without throwing or clobbering reassigned push handlers', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    // 1. Sealed array (Object.isFrozen is false on empty sealed array, but Object.isExtensible is false)
    window.dataLayer = Object.seal([]) as unknown as NonNullable<Window['dataLayer']>;
    trackEvent('tab_view', { tab_name: 'overview' });
    expect(logger.error).not.toHaveBeenCalled();
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'tab_view', { tab_name: 'overview' });

    // 2. Getter-only accessor descriptor on push
    const backing: unknown[] = [];
    const customLayer = [] as unknown as NonNullable<Window['dataLayer']>;
    Object.defineProperty(customLayer, 'push', {
      get: () => (...items: unknown[]) => backing.push(...items),
      configurable: true,
    });
    window.dataLayer = customLayer;
    (sendGAEvent as jest.Mock).mockImplementationOnce((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });
    trackEvent('search_apartment', { query: '동탄역' });
    expect(logger.error).not.toHaveBeenCalled();
    expect(backing).toHaveLength(1);

    // 3. Reassigned dataLayer.push during execution (e.g. gtag.js upgrading queue processor) must NOT be clobbered
    const nextGtagPush = jest.fn(() => 1);
    const dynamicLayer = [] as unknown as NonNullable<Window['dataLayer']>;
    dynamicLayer.push = function () {
      dynamicLayer.push = nextGtagPush;
      return 1;
    };
    window.dataLayer = dynamicLayer;
    (sendGAEvent as jest.Mock).mockImplementationOnce((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });
    trackEvent('share_apartment', { apt_name: '동탄역 롯데캐슬', method: 'kakao' });
    expect(window.dataLayer.push).toBe(nextGtagPush);
  });

  it('should dispatch GA4 page_view via trackVirtualPageView with resolved page_location and protected core parameters', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';
    window.history.replaceState(null, '', '/');

    const entry = trackVirtualPageView('apartment/%EB%8F%99%ED%83%84%EC%97%AD', {
      apt_name: '동탄역 롯데캐슬',
      dong: undefined,
      page_path: '/corrupted-override',
      virtual_pv: 0,
    });

    expect(entry.path).toBe('/apartment/%EB%8F%99%ED%83%84%EC%97%AD');
    expect(getVirtualPageViewCount()).toBe(1);
    expect(sendGAEvent).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({
        page_path: '/apartment/%EB%8F%99%ED%83%84%EC%97%AD',
        page_location: `${window.location.origin}/apartment/%EB%8F%99%ED%83%84%EC%97%AD`,
        virtual_pv: 1,
        adsense_virtual_pv: 1,
        apt_name: '동탄역 롯데캐슬',
      })
    );
    const dispatchedParams = (sendGAEvent as jest.Mock).mock.calls[0][2] as Record<string, unknown>;
    expect('dong' in dispatchedParams).toBe(false);
  });

  it('strips gtag reserved campaign parameters (source, medium) across frozen, blank, and dual-surface payloads to prevent GA4 Unassigned session pollution', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    // 1. Frozen payload with source -> remaps to surface and strips source without mutating frozen input
    const frozenFavParams = Object.freeze({
      apt_name: '동탄역 롯데캐슬',
      is_favorite: true,
      source: 'apartment_detail',
    });
    trackEvent('watchlist_toggle_favorite', frozenFavParams);
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'watchlist_toggle_favorite', {
      apt_name: '동탄역 롯데캐슬',
      is_favorite: true,
      surface: 'apartment_detail',
    });

    // 2. Coexisting surface + distinct source -> preserves surface, captures source in trigger, strips source
    trackEvent('watchlist_toggle_favorite', {
      apt_name: '동탄역 롯데캐슬',
      is_favorite: false,
      surface: 'zone1_bar',
      source: 'watchlist',
    });
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'watchlist_toggle_favorite', {
      apt_name: '동탄역 롯데캐슬',
      is_favorite: false,
      surface: 'zone1_bar',
      trigger: 'watchlist',
    });

    // 3. Blank/whitespace source and reserved medium collision -> both stripped cleanly
    trackEvent('custom_action', {
      apt_name: '동탄역 푸르지오',
      source: '   ',
      medium: 'banner_cta',
    });
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'custom_action', {
      apt_name: '동탄역 푸르지오',
      interaction_medium: 'banner_cta',
    });

    // 4. Legacy source passed to search_query -> populates surface instead of falling back to 'unknown'
    trackEvent('search_query', {
      query: '  동탄역 롯데캐슬  ',
      source: 'legacy_search_box',
    });
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'search_query', {
      search_term: '동탄역 롯데캐슬',
      query: '동탄역 롯데캐슬',
      surface: 'legacy_search_box',
    });

    // 5. Reserved campaign_id (&ci=) -> remaps to cpa_campaign_id and strips campaign_id
    trackEvent('ad_fallback_click', {
      slot_id: '6782594447',
      campaign_id: 'corporate-relocation',
    });
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'ad_fallback_click', {
      slot_id: '6782594447',
      cpa_campaign_id: 'corporate-relocation',
    });

    // 6. Reserved campaign (&cn=), term (&ck=), and content (&cc=) -> safely remapped & stripped
    trackEvent('share_report', {
      report_title: '스트레스 DSR 가이드',
      campaign: 'guide_stress_dsr',
      content: 'bottom_cta',
    });
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'share_report', {
      report_title: '스트레스 DSR 가이드',
      share_campaign: 'guide_stress_dsr',
      interaction_content: 'bottom_cta',
    });

    trackEvent('search_query', {
      term: '  동탄역 시범 우남퍼스트빌  ',
      source: 'header_quick_search',
    });
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'search_query', {
      search_term: '동탄역 시범 우남퍼스트빌',
      query: '동탄역 시범 우남퍼스트빌',
      surface: 'header_quick_search',
    });

    // 7. Direct trackSearchQuery & trackApartmentView helpers remap legacy source BEFORE normalization (surface !== 'unknown')
    expect(
      trackSearchQuery({
        search_term: '힐스테이트 동탄역',
        source: 'explore_legacy_caller',
      })
    ).toBe(true);
    expect(sendGAEvent).toHaveBeenLastCalledWith('event', 'search_query', {
      search_term: '힐스테이트 동탄역',
      query: '힐스테이트 동탄역',
      surface: 'explore_legacy_caller',
    });

    expect(
      trackApartmentView({
        apartment_name: '동탄역 롯데캐슬',
        source: 'apartment_detail',
      })
    ).toBe(true);
    expect(sendGAEvent).toHaveBeenLastCalledWith(
      'event',
      'apartment_view',
      expect.objectContaining({
        apartment_name: '동탄역 롯데캐슬',
        apt_name: '동탄역 롯데캐슬',
        surface: 'apartment_detail',
      })
    );
    const lastAptParams = (sendGAEvent as jest.Mock).mock.calls.at(-1)?.[2] as Record<
      string,
      unknown
    >;
    expect('source' in lastAptParams).toBe(false);
  });

  it('hoists delayed _next-ga-init js and config tuples ahead of pre-queued event Arguments in-place without leaving own push property', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';
    window.dataLayer = undefined;
    window.gtag = undefined;

    // Simulate ga.js before _next-ga-init runs (sendGAEvent is a no-op)
    (sendGAEvent as jest.Mock).mockImplementation(() => {});

    trackEvent('tab_view', { tab_name: 'overview' });
    trackVirtualPageView('/apartment/%EB%8F%99%ED%83%84%EC%97%AD', {
      apt_name: '동탄역 롯데캐슬',
    });

    const initialDlRef = window.dataLayer;
    expect(Array.isArray(initialDlRef)).toBe(true);
    expect(initialDlRef).toHaveLength(2);
    expect(Object.prototype.hasOwnProperty.call(initialDlRef, 'push')).toBe(false);

    // Simulate Selective Hydration appending <script id="_next-ga-init"> in a later macrotask
    const initScript = document.createElement('script');
    initScript.id = '_next-ga-init';
    initScript.innerHTML = `
      window['dataLayer'] = window['dataLayer'] || [];
      function gtag(){window['dataLayer'].push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-TEST');
    `;
    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          document.body.appendChild(initScript);
          resolve();
        }, 10);
      });
      // Allow MutationObserver / microtask checkpoint to run before external gtag.js loads
      await Promise.resolve();

      expect(window.dataLayer).toBe(initialDlRef);
      expect(Object.prototype.hasOwnProperty.call(window.dataLayer, 'push')).toBe(false);

      const rawEntries = window.dataLayer as unknown as Array<ArrayLike<unknown>>;
      expect(rawEntries).toHaveLength(4);
      for (const entry of rawEntries) {
        expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]');
      }

      const tuples = rawEntries.map((item) => Array.from(item));
      expect(tuples[0][0]).toBe('js');
      expect(tuples[0][1]).toBeInstanceOf(Date);
      expect(tuples[1]).toEqual(['config', 'G-TEST']);
      expect(tuples[2]).toEqual(['event', 'tab_view', { tab_name: 'overview' }]);
      expect(tuples[3][0]).toBe('event');
      expect(tuples[3][1]).toBe('page_view');

      // Already normalized queue must be a zero-mutation no-op
      expect(normalizeGa4DataLayerBootstrapOrder(window.dataLayer)).toBe(false);

      // Once gtag.js upgrades window.dataLayer with its own push handler, normalizer must never reorder
      const upgradedLayer: unknown[] = [
        ['event', 'late_event', {}],
        ['config', 'G-TEST'],
      ];
      upgradedLayer.push = jest.fn();
      expect(normalizeGa4DataLayerBootstrapOrder(upgradedLayer)).toBe(false);
      expect((upgradedLayer[0] as string[])[0]).toBe('event');
    } finally {
      initScript.remove();
    }
  });
});



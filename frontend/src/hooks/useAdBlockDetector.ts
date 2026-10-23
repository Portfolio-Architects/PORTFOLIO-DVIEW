'use client';

import { useSyncExternalStore } from 'react';

export interface AdBlockDetectorState {
  isAdBlockActive: boolean;
  isLoading: boolean;
}

export class AdBlockDetectorStore {
  private static instance: AdBlockDetectorStore | null = null;
  private static readonly SERVER_SNAPSHOT: AdBlockDetectorState = Object.freeze({
    isAdBlockActive: false,
    isLoading: false,
  });

  private state: AdBlockDetectorState = Object.freeze({
    isAdBlockActive: false,
    isLoading: true,
  });

  private subscribers = new Set<() => void>();
  private inFlightBaitEl: HTMLDivElement | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private scriptErrored = false;
  private scriptLoaded = false;
  private boundScriptEl: Element | null = null;
  private handleScriptErrorBound: (() => void) | null = null;
  private handleScriptLoadBound: (() => void) | null = null;
  private isProbing = false;
  private hasSettled = false;

  private constructor() {}

  public static getInstance(): AdBlockDetectorStore {
    if (!AdBlockDetectorStore.instance) {
      AdBlockDetectorStore.instance = new AdBlockDetectorStore();
    }
    return AdBlockDetectorStore.instance;
  }

  public subscribe = (onStoreChange: () => void): (() => void) => {
    this.subscribers.add(onStoreChange);
    this.ensureProbe();
    return () => {
      this.subscribers.delete(onStoreChange);
      if (this.subscribers.size === 0 && !this.hasSettled) {
        this.cleanupProbe();
      }
    };
  };

  public getSnapshot = (): AdBlockDetectorState => {
    return this.state;
  };

  public getServerSnapshot = (): AdBlockDetectorState => {
    return AdBlockDetectorStore.SERVER_SNAPSHOT;
  };

  public resetForTesting(): void {
    this.cleanupProbe();
    this.unbindScriptListeners();
    this.hasSettled = false;
    this.scriptErrored = false;
    this.scriptLoaded = false;
    this.state = Object.freeze({
      isAdBlockActive: false,
      isLoading: true,
    });
    this.notify();
  }

  private notify(): void {
    for (const sub of Array.from(this.subscribers)) {
      sub();
    }
  }

  private cleanupProbe(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.inFlightBaitEl) {
      if (typeof document !== 'undefined' && document.body?.contains(this.inFlightBaitEl)) {
        document.body.removeChild(this.inFlightBaitEl);
      }
      this.inFlightBaitEl = null;
    }
    this.isProbing = false;
  }

  private unbindScriptListeners(): void {
    if (this.boundScriptEl && this.handleScriptErrorBound && this.handleScriptLoadBound) {
      this.boundScriptEl.removeEventListener('error', this.handleScriptErrorBound);
      this.boundScriptEl.removeEventListener('load', this.handleScriptLoadBound);
    }
    this.boundScriptEl = null;
    this.handleScriptErrorBound = null;
    this.handleScriptLoadBound = null;
  }

  private bindScriptListeners(): void {
    if (typeof document === 'undefined') return;
    const currentScriptEl = document.querySelector(
      'script#google-adsense, script[src*="adsbygoogle"]'
    );
    if (currentScriptEl && currentScriptEl !== this.boundScriptEl) {
      this.unbindScriptListeners();
      this.boundScriptEl = currentScriptEl;
      this.handleScriptErrorBound = () => this.handleScriptError();
      this.handleScriptLoadBound = () => this.handleScriptLoad();
      currentScriptEl.addEventListener('error', this.handleScriptErrorBound);
      currentScriptEl.addEventListener('load', this.handleScriptLoadBound);
    }
  }

  private evaluateBaitAndScript(): { isBlocked: boolean } {
    if (typeof window === 'undefined') {
      return { isBlocked: false };
    }

    const adsbygoogle = (window as unknown as { adsbygoogle?: unknown }).adsbygoogle as
      | { push?: unknown; loaded?: boolean }
      | unknown[]
      | undefined;

    const hasCustomPush =
      Boolean(adsbygoogle) &&
      typeof (adsbygoogle as { push?: unknown }).push === 'function' &&
      (adsbygoogle as { push?: unknown }).push !== Array.prototype.push;
    const isLoadedFlag =
      Boolean(adsbygoogle) &&
      (adsbygoogle as { loaded?: boolean }).loaded === true;

    let domCollapsed = false;
    if (this.inFlightBaitEl) {
      const rect = this.inFlightBaitEl.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(this.inFlightBaitEl);
      const cssExplicitlyHidden =
        computedStyle.display === 'none' || computedStyle.visibility === 'hidden';
      domCollapsed =
        this.inFlightBaitEl.offsetHeight === 0 ||
        this.inFlightBaitEl.clientHeight === 0 ||
        rect.height === 0 ||
        cssExplicitlyHidden;
    }

    const currentScriptEl =
      this.boundScriptEl ??
      document.querySelector('script#google-adsense, script[src*="adsbygoogle"]');
    const hasExplicitErrorAttr =
      currentScriptEl?.getAttribute('data-adblock-error') === 'true';
    const isSlowNetworkPending =
      Boolean(currentScriptEl) &&
      !domCollapsed &&
      !this.scriptErrored &&
      !this.scriptLoaded &&
      !hasExplicitErrorAttr;

    const scriptBlocked = !hasCustomPush && !isLoadedFlag && !isSlowNetworkPending;
    const isBlocked = scriptBlocked || domCollapsed;

    return { isBlocked };
  }

  private handleScriptError(): void {
    this.scriptErrored = true;
    this.boundScriptEl?.setAttribute('data-adblock-error', 'true');
    this.cleanupProbe();
    this.hasSettled = true;
    this.state = Object.freeze({
      isAdBlockActive: true,
      isLoading: false,
    });
    this.notify();
  }

  private handleScriptLoad(): void {
    this.scriptLoaded = true;
    const { isBlocked } = this.evaluateBaitAndScript();
    this.cleanupProbe();
    this.hasSettled = true;
    this.state = Object.freeze({
      isAdBlockActive: isBlocked,
      isLoading: false,
    });
    this.notify();
  }

  public ensureProbe(): void {
    if (typeof window === 'undefined') {
      this.state = Object.freeze({ isAdBlockActive: false, isLoading: false });
      return;
    }

    const isTestEnvironment =
      process.env.NODE_ENV === 'test' ||
      (typeof navigator !== 'undefined' &&
        typeof navigator.userAgent === 'string' &&
        navigator.userAgent.toLowerCase().includes('jsdom'));

    // In production, once settled, return cached state with zero probe overhead
    if (this.hasSettled && !isTestEnvironment) {
      return;
    }

    // If a probe is currently in flight, concurrent mounts must share it (N_bait <= 1)
    if (this.isProbing) {
      return;
    }

    this.isProbing = true;
    this.bindScriptListeners();

    // 1. Create a single bait element mimicking ad placement
    // EasyList filters target classes like adsbox, ad-placeholder, adsbygoogle, ad-banner
    const testDiv = document.createElement('div');
    testDiv.className = 'adsbox ad-placeholder adsbygoogle ad-banner';
    testDiv.setAttribute(
      'style',
      'position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px; display: block !important;'
    );

    if (document.body) {
      document.body.appendChild(testDiv);
    }
    this.inFlightBaitEl = testDiv;

    // Single 2,000ms delay timer
    this.timerId = setTimeout(() => {
      this.timerId = null;
      const { isBlocked } = this.evaluateBaitAndScript();
      this.cleanupProbe();
      this.hasSettled = true;
      this.state = Object.freeze({
        isAdBlockActive: isBlocked,
        isLoading: false,
      });
      this.notify();
    }, 2000);
  }
}

export function useAdBlockDetector(): AdBlockDetectorState {
  const store = AdBlockDetectorStore.getInstance();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

export default useAdBlockDetector;

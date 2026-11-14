/**
 * @file adsense_preview_sandbox_guard.test.tsx
 * @description Regression suite verifying that D-VIEW renders cleanly without crashing
 * inside Google AdSense Preview (`adsense.google.com/.../myads/sites/preview`) and
 * storage-restricted sandboxed iframes where `sessionStorage`, `localStorage`,
 * `document.cookie`, `indexedDB`, and `navigator.serviceWorker` getters throw SecurityError.
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextRequest } from 'next/server';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import SWRProvider from '@/components/pwa/SWRProvider';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import WelcomeModal from '@/components/ui/WelcomeModal';
import { safeReload } from '@/lib/utils/safeReload';
import { enqueueOfflineRequest, retryOfflineRequests } from '@/lib/utils/offlineQueue';
import { proxy } from '@/proxy';

jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AdSense Preview Sandboxed Iframe & Frame-Ancestors Guard', () => {
  const makeSecurityError = (api: string) => {
    const err = new Error(`Failed to read '${api}': Access is denied for this document.`);
    err.name = 'SecurityError';
    return err;
  };

  it('1. renders RootLayout provider stack (SWRProvider + SettingsProvider + AuthProvider + PWAProvider + WelcomeModal) without throwing when storage, cookies, IndexedDB, and ServiceWorker getters throw SecurityError', () => {
    const origSessionDesc = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    const origLocalDesc = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const origIndexedDbDesc = Object.getOwnPropertyDescriptor(window, 'indexedDB');
    const origSwDesc = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker') ||
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(navigator), 'serviceWorker');
    const origCookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

    try {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get() {
          throw makeSecurityError('sessionStorage');
        },
      });
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw makeSecurityError('localStorage');
        },
      });
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        get() {
          throw makeSecurityError('indexedDB');
        },
      });
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        get() {
          throw makeSecurityError('serviceWorker');
        },
      });
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get() {
          throw makeSecurityError('cookie');
        },
        set() {
          throw makeSecurityError('cookie');
        },
      });

      expect(() => {
        render(
          <SWRProvider>
            <SettingsProvider>
              <AuthProvider>
                <PWAProvider>
                  <div data-testid="sandbox-app-content">동탄 아파트 실거래가 정상 렌더링</div>
                  <WelcomeModal autoOpenOnMount={false} />
                </PWAProvider>
              </AuthProvider>
            </SettingsProvider>
          </SWRProvider>
        );
      }).not.toThrow();

      expect(screen.getByTestId('sandbox-app-content')).toHaveTextContent(
        '동탄 아파트 실거래가 정상 렌더링'
      );

      // safeReload must abort cleanly without throwing or looping when sessionStorage is blocked
      expect(() => safeReload('sandbox_test_key', 'test')).not.toThrow();
    } finally {
      if (origSessionDesc) Object.defineProperty(window, 'sessionStorage', origSessionDesc);
      if (origLocalDesc) Object.defineProperty(window, 'localStorage', origLocalDesc);
      if (origIndexedDbDesc) Object.defineProperty(window, 'indexedDB', origIndexedDbDesc);
      if (origSwDesc) {
        Object.defineProperty(navigator, 'serviceWorker', origSwDesc);
      } else {
        delete (navigator as unknown as Record<string, unknown>).serviceWorker;
      }
      if (origCookieDesc) {
        Object.defineProperty(Document.prototype, 'cookie', origCookieDesc);
      }
      delete (document as unknown as Record<string, unknown>).cookie;
    }
  });

  it('2. offlineQueue converts synchronous IndexedDB SecurityError into clean Promise rejection and retryOfflineRequests resolves safely', async () => {
    const origIndexedDbDesc = Object.getOwnPropertyDescriptor(window, 'indexedDB');
    const origGlobalIndexedDbDesc = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');

    try {
      Object.defineProperty(globalThis, 'indexedDB', {
        configurable: true,
        get() {
          throw makeSecurityError('indexedDB');
        },
      });

      await expect(
        enqueueOfflineRequest({ url: '/api/favorite', method: 'POST', body: {} })
      ).rejects.toThrow(/Access is denied/);

      await expect(retryOfflineRequests()).resolves.toBeUndefined();
    } finally {
      if (origIndexedDbDesc) Object.defineProperty(window, 'indexedDB', origIndexedDbDesc);
      if (origGlobalIndexedDbDesc) {
        Object.defineProperty(globalThis, 'indexedDB', origGlobalIndexedDbDesc);
      }
    }
  });

  it('3. public/js/pwa-register.js catches synchronous navigator.serviceWorker getter SecurityError in sandboxed iframes', () => {
    const pwaRegisterPath = path.resolve(process.cwd(), 'public', 'js', 'pwa-register.js');
    const code = fs.readFileSync(pwaRegisterPath, 'utf-8');

    const navProxy = {};
    Object.defineProperty(navProxy, 'serviceWorker', {
      enumerable: true,
      get() {
        throw makeSecurityError('serviceWorker');
      },
    });

    const sandbox = {
      window: { location: { hostname: 'dongtanview.com', port: '' } },
      navigator: navProxy,
      document: { readyState: 'complete', addEventListener: jest.fn() },
      console: { warn: jest.fn(), log: jest.fn() },
    };

    expect(() => vm.runInNewContext(code, sandbox)).not.toThrow();
    expect(sandbox.console.warn).toHaveBeenCalled();
  });

  it('4. proxy() CSP allows Google AdSense Preview in frame-ancestors, omits conflicting X-Frame-Options: DENY, and whitelists adsense.google.com origin', async () => {
    const pageReq = new NextRequest('https://dongtanview.com/');
    const pageRes = await proxy(pageReq);

    const csp = pageRes.headers.get('Content-Security-Policy') || '';
    expect(/[\r\n]/.test(csp)).toBe(false);
    expect(csp).toContain("frame-ancestors 'self' https://adsense.google.com");
    expect(csp).toContain('https://*.googleusercontent.com');
    expect(csp).not.toContain("frame-ancestors 'none'");
    expect(pageRes.headers.get('X-Frame-Options')).toBeNull();

    // API origin check allows AdSense Preview origin while still blocking arbitrary external origins
    const adsenseApiReq = new NextRequest('https://dongtanview.com/api/dashboard-init', {
      headers: { origin: 'https://adsense.google.com' },
    });
    const adsenseApiRes = await proxy(adsenseApiReq);
    expect(adsenseApiRes.status).not.toBe(403);

    const attackerApiReq = new NextRequest('https://dongtanview.com/api/dashboard-init', {
      headers: { origin: 'https://evil-scraper.example.com' },
    });
    const attackerApiRes = await proxy(attackerApiReq);
    expect(attackerApiRes.status).toBe(403);
  });

  it('5. global-error.tsx preserves google-adsense-account meta tag in <head> and degrades gracefully to captured SSR HTML inside embedded preview iframes', () => {
    const globalErrorPath = path.resolve(process.cwd(), 'src', 'app', 'global-error.tsx');
    const source = fs.readFileSync(globalErrorPath, 'utf-8');
    expect(source).toContain('<meta');
    expect(source).toContain('name="google-adsense-account"');
    expect(source).toContain('ca-pub-1103228112872356');
    expect(source).toContain('__DVIEW_EMBEDDED_PREVIEW__');
    expect(source).toContain('__DVIEW_SSR_SNAPSHOT__');

    const layoutPath = path.resolve(process.cwd(), 'src', 'app', 'layout.tsx');
    const layoutSource = fs.readFileSync(layoutPath, 'utf-8');
    expect(layoutSource).toContain('id="dview-preview-iframe-shield"');
    expect(layoutSource).toContain('id="dview-preview-snap-trigger"');
    expect(layoutSource).toContain('Node.prototype.removeChild');
    expect(layoutSource).toContain('window.history.replaceState');
  });

  it('6. dview-preview-iframe-shield neutralizes cross-origin history SecurityError + DOM reparenting errors and GlobalError/Error render preserved SSR snapshot inside embedded preview', () => {
    const layoutPath = path.resolve(process.cwd(), 'src', 'app', 'layout.tsx');
    const layoutSource = fs.readFileSync(layoutPath, 'utf-8');
    const match = layoutSource.match(/const PREVIEW_IFRAME_SHIELD_SCRIPT = `([\s\S]*?)`;/);
    expect(match).not.toBeNull();
    const shieldCode = match![1];

    const historyCalls: Array<[unknown, string, unknown]> = [];
    const mockHistory = {
      replaceState(state: unknown, title: string, url?: unknown) {
        if (url !== undefined) {
          throw makeSecurityError('replaceState');
        }
        historyCalls.push([state, title, url]);
      },
      pushState(state: unknown, title: string, url?: unknown) {
        if (url !== undefined) {
          throw makeSecurityError('pushState');
        }
        historyCalls.push([state, title, url]);
      },
    };

    function FakeNode(this: { children: unknown[]; parentNode: unknown }) {
      this.children = [];
      this.parentNode = null;
    }
    FakeNode.prototype.removeChild = function (child: { parentNode: unknown }) {
      if (child.parentNode !== this) {
        throw new Error("Failed to execute 'removeChild' on 'Node'");
      }
      return child;
    };
    FakeNode.prototype.appendChild = function (child: { parentNode: unknown }) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    };
    FakeNode.prototype.insertBefore = function (
      newNode: { parentNode: unknown },
      refNode: { parentNode: unknown } | null
    ) {
      if (refNode && refNode.parentNode !== this) {
        throw new Error("Failed to execute 'insertBefore' on 'Node'");
      }
      newNode.parentNode = this;
      this.children.push(newNode);
      return newNode;
    };

    const longSsrBody = `<div id="dview-main-content"><h1>동탄 아파트 실거래가 D-VIEW</h1>${'<span>데이터</span>'.repeat(80)}</div>`;
    const fakeClone = {
      innerHTML: longSsrBody,
      querySelectorAll: () => [],
      querySelector: () => ({ innerHTML: '<h1>동탄 아파트 실거래가 D-VIEW</h1>' }),
    };
    const sandboxWindow: Record<string, unknown> = {
      self: {},
      top: {}, // different reference -> isIframe === true
      location: {
        hostname: 'abc-apidata.googleusercontent.com',
        origin: 'https://abc-apidata.googleusercontent.com',
      },
      history: mockHistory,
    };
    const sandboxDoc = {
      readyState: 'complete',
      documentElement: { className: '__variable_pretendard' },
      head: {
        querySelectorAll: () => [
          { outerHTML: '<base href="https://dongtanview.com/">' },
          { outerHTML: '<meta name="google-adsense-account" content="ca-pub-1103228112872356">' },
        ],
      },
      body: {
        innerHTML: longSsrBody,
        className: 'antialiased bg-body',
        cloneNode: () => fakeClone,
      },
      addEventListener: jest.fn(),
    };

    vm.runInNewContext(shieldCode, {
      window: sandboxWindow,
      document: sandboxDoc,
      Node: FakeNode,
    });

    expect(sandboxWindow.__DVIEW_EMBEDDED_PREVIEW__).toBe(true);
    expect(sandboxWindow.__DVIEW_SSR_SNAPSHOT__).toBeDefined();

    // Cross-origin URL in replaceState should NOT throw; falls back to URL-less replaceState
    expect(() =>
      (sandboxWindow.history as typeof mockHistory).replaceState({ idx: 0 }, '', '/')
    ).not.toThrow();
    expect(historyCalls).toHaveLength(1);

    // Detached/reparented nodes caused by AdSense Preview overlay injection should NOT throw
    const parent = new (FakeNode as unknown as new () => {
      removeChild: (c: unknown) => unknown;
      insertBefore: (n: unknown, r: unknown) => unknown;
      children: unknown[];
    })();
    const detachedRef = { parentNode: null };
    const newNode = { parentNode: null };
    expect(() => parent.removeChild(detachedRef)).not.toThrow();
    expect(() => parent.insertBefore(newNode, detachedRef)).not.toThrow();
    expect(parent.children).toContain(newNode);

    // Verify Route Error boundary renders preserved mainHtml inside embedded preview
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RouteError = require('@/app/error').default;
    window.__DVIEW_EMBEDDED_PREVIEW__ = true;
    window.__DVIEW_SSR_SNAPSHOT__ = sandboxWindow.__DVIEW_SSR_SNAPSHOT__ as Window['__DVIEW_SSR_SNAPSHOT__'];
    try {
      const { unmount } = render(<RouteError error={new Error('Preview hydration glitch')} />);
      expect(screen.getByText('동탄 아파트 실거래가 D-VIEW')).toBeInTheDocument();
      expect(screen.queryByText('페이지를 불러올 수 없어요')).not.toBeInTheDocument();
      unmount();
    } finally {
      delete window.__DVIEW_EMBEDDED_PREVIEW__;
      delete window.__DVIEW_SSR_SNAPSHOT__;
    }
  });

  it('7. PreHydrationInlineScript (#dview-preview-snap-trigger) renders on the client with type="application/json" and zero React 19 script-tag console errors', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PreHydrationInlineScript = require('@/components/common/PreHydrationInlineScript').default;
    const snapSpy = jest.fn();
    (window as Window & { __dviewCapturePreviewSnap?: () => void }).__dviewCapturePreviewSnap = snapSpy;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { container, unmount } = render(
        <PreHydrationInlineScript
          id="dview-preview-snap-trigger"
          runCapturePreviewOnMount
          code="try{if(window.__dviewCapturePreviewSnap)window.__dviewCapturePreviewSnap();}catch(_){}"
        />
      );

      const scriptEl = container.querySelector('#dview-preview-snap-trigger');
      expect(scriptEl).not.toBeNull();
      expect(scriptEl?.getAttribute('type')).toBe('application/json');
      expect(snapSpy).toHaveBeenCalledTimes(1);

      const scriptTagErrors = errorSpy.mock.calls
        .map((args) => args.map(String).join(' '))
        .filter((msg) => /Encountered a script tag while rendering React component/i.test(msg));
      expect(scriptTagErrors).toEqual([]);

      unmount();
    } finally {
      errorSpy.mockRestore();
      delete (window as Window & { __dviewCapturePreviewSnap?: () => void }).__dviewCapturePreviewSnap;
    }
  });
});

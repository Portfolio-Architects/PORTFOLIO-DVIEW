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

  it('5. global-error.tsx preserves google-adsense-account meta tag in <head> as fallback safety net', () => {
    const globalErrorPath = path.resolve(process.cwd(), 'src', 'app', 'global-error.tsx');
    const source = fs.readFileSync(globalErrorPath, 'utf-8');
    expect(source).toContain('<meta');
    expect(source).toContain('name="google-adsense-account"');
    expect(source).toContain('ca-pub-1103228112872356');
  });
});

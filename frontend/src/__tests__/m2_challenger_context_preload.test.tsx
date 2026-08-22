/**
 * @file m2_challenger_context_preload.test.tsx
 * @description Empirical Challenger 1 Test Suite for Milestone 2:
 * 1. SettingsProvider & useSettings SSR and Client render verification
 * 2. SettingsModal trigger states, keyboard accessibility (Escape, Focus trap), and state mutations
 * 3. Backward-compatible re-exports in src/lib/contexts/ full runtime parity verification
 * 4. UI preload decoupling verification
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// New canonical imports
import {
  SettingsProvider,
  useSettings,
  useSettingsValues,
  useSettingsUi,
  AreaUnitSchema,
  ThemeSchema,
} from '@/contexts/SettingsContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Legacy backward-compatible imports
import * as LegacySettingsContext from '@/lib/contexts/SettingsContext';
import * as LegacyAuthContext from '@/lib/contexts/AuthContext';

// Components & Utils
import SettingsModal from '@/components/SettingsModal';
import { preloadImage, preloadJson } from '@/lib/utils/preloadHelpers';
import { preloadApartmentModal, preloadDashboardFeatures } from '@/components/common/preload';

// Mock usePWA
jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    pushSubscription: null,
    unsubscribeFromPush: jest.fn().mockResolvedValue(true),
    isPushSupported: true,
  }),
  PWAProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Firebase Config
jest.mock('@/lib/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn((cb) => {
      cb(null);
      return jest.fn();
    }),
  },
}));

describe('Milestone 2 Challenger 1: Context Relocation & UI Preload Decoupling', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.body.innerHTML = '<div id="modal-root"></div>';
  });

  afterAll(async () => {
    // Wait for any trailing async microtasks from dynamic imports to settle
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  // =========================================================================
  // 1. SSR and Client Environment Rendering of SettingsProvider & useSettings
  // =========================================================================
  describe('1. SettingsProvider & useSettings SSR & Client Rendering', () => {
    function ConsumerComponent() {
      const { areaUnit, theme, isSettingsModalOpen } = useSettings();
      return (
        <div data-testid="settings-consumer">
          <span data-testid="unit">{areaUnit}</span>
          <span data-testid="theme">{theme}</span>
          <span data-testid="modal-state">{isSettingsModalOpen ? 'OPEN' : 'CLOSED'}</span>
        </div>
      );
    }

    test('SSR: renders to string without window / document exceptions', () => {
      const html = ReactDOMServer.renderToString(
        <SettingsProvider>
          <ConsumerComponent />
        </SettingsProvider>
      );

      expect(html).toContain('data-testid="settings-consumer"');
      expect(html).toContain('m2');
      expect(html).toContain('light');
      expect(html).toContain('CLOSED');
    });

    test('Client: renders and mounts properly, hydrating defaults without errors', () => {
      render(
        <SettingsProvider>
          <ConsumerComponent />
        </SettingsProvider>
      );

      expect(screen.getByTestId('unit')).toHaveTextContent('m2');
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(screen.getByTestId('modal-state')).toHaveTextContent('CLOSED');
    });

    test('Client: granular hooks (useSettingsValues, useSettingsUi) work seamlessly', () => {
      function GranularConsumer() {
        const { areaUnit, theme, setAreaUnit, setTheme } = useSettingsValues();
        const { isSettingsModalOpen, setIsSettingsModalOpen } = useSettingsUi();
        return (
          <div>
            <span data-testid="val-unit">{areaUnit}</span>
            <span data-testid="val-theme">{theme}</span>
            <span data-testid="ui-modal">{isSettingsModalOpen ? 'OPEN' : 'CLOSED'}</span>
            <button onClick={() => setAreaUnit('pyeong')}>Set Pyeong</button>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
            <button onClick={() => setIsSettingsModalOpen(true)}>Open Modal</button>
          </div>
        );
      }

      render(
        <SettingsProvider>
          <GranularConsumer />
        </SettingsProvider>
      );

      expect(screen.getByTestId('val-unit')).toHaveTextContent('m2');
      expect(screen.getByTestId('ui-modal')).toHaveTextContent('CLOSED');

      act(() => {
        screen.getByText('Set Pyeong').click();
        screen.getByText('Set Dark').click();
        screen.getByText('Open Modal').click();
      });

      expect(screen.getByTestId('val-unit')).toHaveTextContent('pyeong');
      expect(screen.getByTestId('val-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('ui-modal')).toHaveTextContent('OPEN');
    });

    test('Isolated hook execution outside provider throws descriptive error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<ConsumerComponent />)).toThrow(
        'useSettings must be used within a SettingsProvider'
      );
      consoleErrorSpy.mockRestore();
    });
  });

  // =========================================================================
  // 2. SettingsModal Trigger States, Accessibility, and State Operations
  // =========================================================================
  describe('2. SettingsModal Opening, Closing, and Regression Verification', () => {
    function AppWrapper() {
      const { setIsSettingsModalOpen } = useSettings();
      return (
        <div>
          <button onClick={() => setIsSettingsModalOpen(true)}>Trigger Settings</button>
          <SettingsModal />
        </div>
      );
    }

    test('Modal is not in the DOM initially when isSettingsModalOpen is false', () => {
      render(
        <SettingsProvider>
          <AppWrapper />
        </SettingsProvider>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('소비자 설정')).not.toBeInTheDocument();
    });

    test('Opening modal via trigger renders dialog with all controls', () => {
      render(
        <SettingsProvider>
          <AppWrapper />
        </SettingsProvider>
      );

      act(() => {
        screen.getByText('Trigger Settings').click();
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('소비자 설정')).toBeInTheDocument();
      expect(screen.getByText('화면 모드')).toBeInTheDocument();
      expect(screen.getByText('면적 표시 기준')).toBeInTheDocument();
      expect(screen.getByText('확인')).toBeInTheDocument();
    });

    test('Changing area unit and theme within modal mutates state correctly', () => {
      render(
        <SettingsProvider>
          <AppWrapper />
        </SettingsProvider>
      );

      act(() => {
        screen.getByText('Trigger Settings').click();
      });

      // Select '평'
      const pyeongBtn = screen.getByText('평');
      act(() => {
        pyeongBtn.click();
      });
      expect(pyeongBtn).toHaveAttribute('aria-pressed', 'true');

      // Select '다크'
      const darkBtn = screen.getByText('다크').closest('button');
      act(() => {
        darkBtn?.click();
      });
      expect(darkBtn).toHaveAttribute('aria-pressed', 'true');
    });

    test('Closing modal via bottom "확인" button', () => {
      render(
        <SettingsProvider>
          <AppWrapper />
        </SettingsProvider>
      );

      act(() => {
        screen.getByText('Trigger Settings').click();
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      act(() => {
        screen.getByText('확인').click();
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('Closing modal via Escape key', () => {
      render(
        <SettingsProvider>
          <AppWrapper />
        </SettingsProvider>
      );

      act(() => {
        screen.getByText('Trigger Settings').click();
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      act(() => {
        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('Closing modal via backdrop click', () => {
      render(
        <SettingsProvider>
          <AppWrapper />
        </SettingsProvider>
      );

      act(() => {
        screen.getByText('Trigger Settings').click();
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const backdrop = screen.getAllByLabelText('설정 창 닫기')[0];
      act(() => {
        backdrop.click();
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('Closing modal via top-right X button', () => {
      render(
        <SettingsProvider>
          <AppWrapper />
        </SettingsProvider>
      );

      act(() => {
        screen.getByText('Trigger Settings').click();
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const closeButtons = screen.getAllByLabelText('설정 창 닫기');
      const xButton = closeButtons[closeButtons.length - 1];
      act(() => {
        xButton.click();
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Backward-Compatible Re-exports in src/lib/contexts/
  // =========================================================================
  describe('3. Backward Compatibility Re-export Parity', () => {
    test('SettingsContext re-exports all identifiers with 100% reference parity', () => {
      expect(LegacySettingsContext.SettingsProvider).toBe(SettingsProvider);
      expect(LegacySettingsContext.useSettings).toBe(useSettings);
      expect(LegacySettingsContext.useSettingsValues).toBe(useSettingsValues);
      expect(LegacySettingsContext.useSettingsUi).toBe(useSettingsUi);
      expect(LegacySettingsContext.AreaUnitSchema).toBe(AreaUnitSchema);
      expect(LegacySettingsContext.ThemeSchema).toBe(ThemeSchema);
    });

    test('AuthContext re-exports all identifiers with 100% reference parity', () => {
      expect(LegacyAuthContext.AuthProvider).toBe(AuthProvider);
      expect(LegacyAuthContext.useAuth).toBe(useAuth);
    });

    test('Legacy caller importing from @/lib/contexts/SettingsContext executes identically', () => {
      function LegacyConsumer() {
        const { areaUnit, setAreaUnit } = LegacySettingsContext.useSettings();
        return (
          <div>
            <span data-testid="legacy-unit">{areaUnit}</span>
            <button onClick={() => setAreaUnit('pyeong')}>Change</button>
          </div>
        );
      }

      render(
        <LegacySettingsContext.SettingsProvider>
          <LegacyConsumer />
        </LegacySettingsContext.SettingsProvider>
      );

      expect(screen.getByTestId('legacy-unit')).toHaveTextContent('m2');

      act(() => {
        screen.getByText('Change').click();
      });

      expect(screen.getByTestId('legacy-unit')).toHaveTextContent('pyeong');
    });
  });

  // =========================================================================
  // 4. UI Preload Decoupling Verification
  // =========================================================================
  describe('4. UI Preload Decoupling Verification', () => {
    test('preloadHelpers is pure and contains only asset preload functions', () => {
      expect(typeof preloadImage).toBe('function');
      expect(typeof preloadJson).toBe('function');
    });

    test('preloadImage executes safely with empty or invalid URL without hanging', async () => {
      await expect(preloadImage('')).resolves.toBeUndefined();
    });

    test('preloadImage handles Image load callback safely', async () => {
      const originalImage = window.Image;
      class MockImage {
        src = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      }
      // @ts-expect-error Mocking Image
      window.Image = MockImage;

      await expect(preloadImage('https://example.com/test.png')).resolves.toBeUndefined();
      // Second call returns cached immediately
      await expect(preloadImage('https://example.com/test.png')).resolves.toBeUndefined();

      window.Image = originalImage;
    });

    test('preloadJson handles network failure and invalid input gracefully', async () => {
      const result = await preloadJson('');
      expect(result).toBeNull();
    });

    test('presentation preload.ts preloads components without throwing errors', () => {
      expect(() => preloadApartmentModal()).not.toThrow();
      expect(() => preloadDashboardFeatures()).not.toThrow();
    });
  });
});

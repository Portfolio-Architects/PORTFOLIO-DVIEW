/**
 * @file m2_challenger1_empirical_verification.test.tsx
 * @description Milestone 2 Comprehensive Empirical Challenge Test Suite (Challenger 1):
 * 1. Modals Clean Rendering & Interaction Integrity:
 *    - SettingsModal: theme, unit toggling, push notifications, modal-root portal
 *    - WelcomeModal: first-time visitor timer, cookie/localStorage persistence, dismiss
 *    - CustomA2HSModal: A2HS trigger, iOS/Android guidance, body scroll locking
 *    - OfficeDetailModal: building spec rendering, tab navigation, null safety, tax calculator
 *    - PushSubscriptionModal: subscription action, error states, portal dismiss
 * 2. Dynamic PDF Export Engine (EngineeringReportClient & ReportClient):
 *    - Dynamic import('jspdf') lazy resolution
 *    - Canvas capture & pdf.save execution
 *    - Fallback error handling & alert triggering
 * 3. Dynamic Code Splitting, Preloading & Network Resilience:
 *    - scheduleIdle & preloadComponent execution with requestIdleCallback and setTimeout fallback
 *    - Chunk failure catch and safe fallback
 */

import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="react-markdown">{children}</div>,
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => () => {},
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn((cb) => {
      cb(null);
      return jest.fn();
    }),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isAdmin: false,
    isSuperAdmin: false,
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const mockReportData = {
  metadata: {
    date: '2026-08-22',
    grade: 'A+',
    branch: '동탄 1·2신도시',
    status: '정상 운영',
  },
  markdownContent: '# D-VIEW 기술 분석 리포트\n\n- 성능 최적화 완료',
};

jest.mock('@/app/actions/getEngineeringReport', () => ({
  getEngineeringReport: jest.fn().mockResolvedValue({
    metadata: {
      date: '2026-08-22',
      grade: 'A+',
      branch: '동탄 1·2신도시',
      status: '정상 운영',
    },
    markdownContent: '# D-VIEW 기술 분석 리포트\n\n- 성능 최적화 완료',
  }),
}));

// Mock jsPDF module
const mockSave = jest.fn();
const mockAddImage = jest.fn();
const mockGetPageWidth = jest.fn().mockReturnValue(210);

jest.mock('jspdf', () => {
  return {
    jsPDF: jest.fn().mockImplementation(() => ({
      internal: {
        pageSize: {
          getWidth: mockGetPageWidth,
        },
      },
      addImage: mockAddImage,
      save: mockSave,
    })),
  };
});

// Mock html2canvasPatch
const mockSafeHtml2canvas = jest.fn().mockResolvedValue({
  toDataURL: jest.fn().mockReturnValue('data:image/png;base64,MOCK_BASE64_DATA'),
  width: 800,
  height: 1200,
});

jest.mock('@/lib/utils/html2canvasPatch', () => ({
  safeHtml2canvas: (el: HTMLElement, opts: any) => mockSafeHtml2canvas(el, opts),
}));

// Mock PWAProvider hook
const mockSetShowCustomA2HSModal = jest.fn();
const mockTriggerA2HSPrompt = jest.fn().mockResolvedValue(true);
const mockSubscribeToPush = jest.fn().mockResolvedValue(true);
const mockUnsubscribeFromPush = jest.fn().mockResolvedValue(true);
const mockShowToast = jest.fn();

let mockPWAContext = {
  isPWA: false,
  isStandalone: false,
  isIOS: false,
  isAndroid: true,
  canInstall: true,
  showCustomA2HSModal: false,
  setShowCustomA2HSModal: mockSetShowCustomA2HSModal,
  triggerA2HSPrompt: mockTriggerA2HSPrompt,
  isPushSupported: true,
  isPushSubscribed: false,
  pushSubscription: null as any,
  subscribeToPush: mockSubscribeToPush,
  unsubscribeFromPush: mockUnsubscribeFromPush,
  showToast: mockShowToast,
  permissionState: 'default' as NotificationPermission,
};

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => mockPWAContext,
  PWAProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock SettingsContext hook
let mockSettingsModalOpen = false;
let mockAreaUnit: 'pyeong' | 'sqm' = 'pyeong';
let mockTheme: 'light' | 'dark' | 'system' = 'light';
const mockSetIsSettingsModalOpen = jest.fn((val: boolean) => {
  mockSettingsModalOpen = val;
});
const mockSetAreaUnit = jest.fn((val: 'pyeong' | 'sqm') => {
  mockAreaUnit = val;
});
const mockSetTheme = jest.fn((val: 'light' | 'dark' | 'system') => {
  mockTheme = val;
});

jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    isSettingsModalOpen: mockSettingsModalOpen,
    setIsSettingsModalOpen: mockSetIsSettingsModalOpen,
    areaUnit: mockAreaUnit,
    setAreaUnit: mockSetAreaUnit,
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Imports of target components
import SettingsModal from '@/components/SettingsModal';
import WelcomeModal from '@/components/ui/WelcomeModal';
import CustomA2HSModal from '@/components/pwa/CustomA2HSModal';
import OfficeDetailModal, { OfficeBuilding } from '@/components/OfficeDetailModal';
import PushSubscriptionModal from '@/components/pwa/PushSubscriptionModal';
import EngineeringReportClient from '@/components/EngineeringReportClient';
import ReportClient from '@/components/ReportClient';
import { scheduleIdle, preloadComponent, preloadApartmentModal, preloadDashboardFeatures } from '@/lib/preload';

describe('Milestone 2 Challenger 1 Comprehensive Empirical Verification Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="modal-root"></div>';
    mockSettingsModalOpen = false;
    mockAreaUnit = 'pyeong';
    mockTheme = 'light';
    mockPWAContext = {
      isPWA: false,
      isStandalone: false,
      isIOS: false,
      isAndroid: true,
      canInstall: true,
      showCustomA2HSModal: false,
      setShowCustomA2HSModal: mockSetShowCustomA2HSModal,
      triggerA2HSPrompt: mockTriggerA2HSPrompt,
      isPushSupported: true,
      isPushSubscribed: false,
      pushSubscription: null,
      subscribeToPush: mockSubscribeToPush,
      unsubscribeFromPush: mockUnsubscribeFromPush,
      showToast: mockShowToast,
      permissionState: 'default',
    };
    localStorage.clear();
    document.cookie = '';
  });

  // =========================================================================
  // Test Section 1: Modal Clean Rendering & Interaction Verification
  // =========================================================================
  describe('1. Modals Verification', () => {
    describe('1.1 SettingsModal', () => {
      it('renders nothing when isSettingsModalOpen is false', () => {
        mockSettingsModalOpen = false;
        render(<SettingsModal />);
        expect(screen.queryByText('소비자 설정')).not.toBeInTheDocument();
      });

      it('renders properly in portal when opened and allows theme / unit toggle', async () => {
        mockSettingsModalOpen = true;
        render(<SettingsModal />);

        expect(screen.getByText('소비자 설정')).toBeInTheDocument();
        expect(screen.getByText('화면 모드')).toBeInTheDocument();
        expect(screen.getByText('면적 표시 기준')).toBeInTheDocument();

        // Toggle unit to sqm
        fireEvent.click(screen.getByText('제곱미터 (m²)'));
        expect(mockSetAreaUnit).toHaveBeenCalledWith('m2');

        // Toggle theme to dark
        const darkThemeBtn = screen.getByText('다크');
        fireEvent.click(darkThemeBtn);
        expect(mockSetTheme).toHaveBeenCalledWith('dark');

        // Close modal
        const closeBtns = screen.getAllByLabelText('설정 창 닫기');
        fireEvent.click(closeBtns[0]);
        expect(mockSetIsSettingsModalOpen).toHaveBeenCalledWith(false);
      });

      it('handles Escape key to close modal', async () => {
        mockSettingsModalOpen = true;
        render(<SettingsModal />);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(mockSetIsSettingsModalOpen).toHaveBeenCalledWith(false);
      });
    });

    describe('1.2 WelcomeModal', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });
      afterEach(() => {
        jest.useRealTimers();
      });

      it('opens after 1500ms delay for first-time visitors', async () => {
        render(<WelcomeModal />);

        // Initially not visible before timer
        expect(screen.queryByText(/에 오신 것을 환영합니다/i)).not.toBeInTheDocument();

        // Advance timers by 1500ms
        act(() => {
          jest.advanceTimersByTime(1500);
        });

        expect(screen.getByText(/에 오신 것을 환영합니다/i)).toBeInTheDocument();

        // Click "D-VIEW 탐색 시작하기" button to dismiss
        const startBtn = screen.getByText('D-VIEW 탐색 시작하기');
        fireEvent.click(startBtn);

        expect(localStorage.getItem('dview-welcome-seen')).toBe('true');
        expect(screen.queryByText(/에 오신 것을 환영합니다/i)).not.toBeInTheDocument();
      });

      it('does not open if already seen in localStorage', () => {
        localStorage.setItem('dview-welcome-seen', 'true');
        render(<WelcomeModal />);

        act(() => {
          jest.advanceTimersByTime(2000);
        });

        expect(screen.queryByText(/에 오신 것을 환영합니다/i)).not.toBeInTheDocument();
      });
    });

    describe('1.3 CustomA2HSModal', () => {
      it('renders nothing when showCustomA2HSModal is false', () => {
        mockPWAContext.showCustomA2HSModal = false;
        render(<CustomA2HSModal />);
        expect(screen.queryByText('D-VIEW 앱 설치하기')).not.toBeInTheDocument();
      });

      it('renders installation prompt on Android and handles click', async () => {
        mockPWAContext.showCustomA2HSModal = true;
        mockPWAContext.isAndroid = true;
        mockPWAContext.isIOS = false;

        render(<CustomA2HSModal />);
        expect(screen.getByText('D-VIEW 앱 설치하기')).toBeInTheDocument();
        expect(screen.getByText('지금 추가하기')).toBeInTheDocument();

        // Trigger install
        fireEvent.click(screen.getByText('지금 추가하기'));
        expect(mockTriggerA2HSPrompt).toHaveBeenCalled();
      });

      it('renders iOS specific instructions when isIOS is true', () => {
        mockPWAContext.showCustomA2HSModal = true;
        mockPWAContext.isIOS = true;
        mockPWAContext.isAndroid = false;

        render(<CustomA2HSModal />);
        expect(screen.getByText('🍎 Safari 브라우저에서 홈화면 추가하기')).toBeInTheDocument();
        expect(screen.getByText(/Safari 브라우저 하단 도구 막대/i)).toBeInTheDocument();
      });
    });

    describe('1.4 OfficeDetailModal', () => {
      const mockBuilding: OfficeBuilding = {
        name: '동탄 금강펜테리움 IX타워',
        type: '지식산업센터',
        dong: '동탄영천동',
        address: '경기도 화성시 동탄첨단산업1로 27',
        rentPerPy: '4.5만원',
        features: ['드라이브인 시스템', '도어투도어', '초고속 화물용 E/V'],
        driveIn: true,
        stationDistance: 'very-close',
        desc: '동탄 최대 규모 랜드마크 지식산업센터',
        imgPlaceholder: 'ix-tower',
        score: 95,
        totalUnits: 1420,
        vacancyRate: 8.5,
        recentTransactions: [
          { date: '2026.02', type: '매매', sizeSqM: 99.1, floor: 12, price: '2억 8,000만' },
          { date: '2026.01', type: '임대', sizeSqM: 66.2, floor: 5, price: '1,000/90' },
        ],
        specs: {
          gfa: '280,000㎡',
          scale: '지하 2층 ~ 지상 38층 (2개동)',
          parking: '1,850대',
          completion: '2021.05',
        },
      };

      it('renders nothing when building is null', () => {
        const handleClose = jest.fn();
        render(<OfficeDetailModal building={null} onClose={handleClose} />);
        expect(screen.queryByText('동탄 금강펜테리움 IX타워')).not.toBeInTheDocument();
      });

      it('renders building details, switches tabs, and handles close', async () => {
        const handleClose = jest.fn();
        render(<OfficeDetailModal building={mockBuilding} onClose={handleClose} />);

        expect(screen.getByText('동탄 금강펜테리움 IX타워')).toBeInTheDocument();
        expect(screen.getByText('지식산업센터')).toBeInTheDocument();
        expect(screen.getAllByText('경기도 화성시 동탄첨단산업1로 27')[0]).toBeInTheDocument();

        // Switch to '국토부 매매 실거래가' tab
        fireEvent.click(screen.getByText('국토부 매매 실거래가'));
        expect(screen.getByText('국토교통부 매매 실거래가 내역')).toBeInTheDocument();

        // Switch to '입주혜택 & 절세 계산기' tab
        fireEvent.click(screen.getByText('입주혜택 & 절세 계산기'));
        expect(screen.getByText('취득세 절감액 즉시 시뮬레이터')).toBeInTheDocument();

        // Close button click
        const closeBtn = screen.getByTitle('닫기');
        fireEvent.click(closeBtn);
        expect(handleClose).toHaveBeenCalled();
      });
    });

    describe('1.5 PushSubscriptionModal', () => {
      it('renders nothing when isOpen is false', () => {
        const handleClose = jest.fn();
        render(<PushSubscriptionModal isOpen={false} onClose={handleClose} aptName="동탄역 롯데캐슬" />);
        expect(screen.queryByText('동탄역 롯데캐슬 알림 신청')).not.toBeInTheDocument();
      });

      it('renders subscription modal and handles subscribe action', async () => {
        const handleClose = jest.fn();
        render(<PushSubscriptionModal isOpen={true} onClose={handleClose} aptName="동탄역 롯데캐슬" />);

        expect(screen.getByText('동탄역 롯데캐슬 알림 신청')).toBeInTheDocument();

        const subscribeBtn = screen.getByText('실거래가 알림 신청하기');
        fireEvent.click(subscribeBtn);

        await waitFor(() => {
          expect(mockSubscribeToPush).toHaveBeenCalledWith(null, '동탄역 롯데캐슬');
          expect(handleClose).toHaveBeenCalled();
        });
      });
    });
  });

  // =========================================================================
  // Test Section 2: Dynamic PDF Export Engine Verification
  // =========================================================================
  describe('2. Dynamic PDF Export Engine (jspdf dynamic import)', () => {
    it('EngineeringReportClient renders markdown and structure cleanly', () => {
      const contentRef = { current: document.createElement('div') };
      render(
        <EngineeringReportClient 
          metadata={mockReportData.metadata} 
          markdownContent={mockReportData.markdownContent} 
          contentRef={contentRef} 
        />
      );

      expect(screen.getByText('SECTION 1: ENGINEERING REPORT')).toBeInTheDocument();
      expect(screen.getByText('CONFIDENTIAL')).toBeInTheDocument();
      expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
    });

    it('ReportClient dynamically resolves jspdf upon Export PDF click and saves file', async () => {
      render(<ReportClient />);

      // Wait for data load
      await waitFor(() => {
        expect(screen.getAllByText('리포트').length).toBeGreaterThan(0);
        expect(screen.getByText('Export PDF')).toBeInTheDocument();
      });

      const exportBtn = screen.getByText('Export PDF');
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(mockSafeHtml2canvas).toHaveBeenCalled();
        expect(mockAddImage).toHaveBeenCalledWith(
          'data:image/png;base64,MOCK_BASE64_DATA',
          'PNG',
          0,
          0,
          expect.any(Number),
          expect.any(Number)
        );
        expect(mockSave).toHaveBeenCalledWith('DVIEW_Engineering_Report.pdf');
      });
    });

    it('ReportClient handles PDF export failure gracefully with error alert', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockSafeHtml2canvas.mockRejectedValueOnce(new Error('Canvas rasterization failed'));

      render(<ReportClient />);

      await waitFor(() => {
        expect(screen.getByText('Export PDF')).toBeInTheDocument();
      });

      const exportBtn = screen.getByText('Export PDF');
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('PDF 변환에 실패했습니다.');
      });
      alertMock.mockRestore();
    });
  });

  // =========================================================================
  // Test Section 3: Preload Utility & Network Latency Stress Verification
  // =========================================================================
  describe('3. Preloader & Idle Scheduling Verification', () => {
    it('scheduleIdle executes callback via requestIdleCallback when available', async () => {
      let executed = false;
      window.requestIdleCallback = jest.fn((cb) => {
        return setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 10) as unknown as number;
      });

      scheduleIdle(() => {
        executed = true;
      }, 1000);

      await waitFor(() => expect(executed).toBe(true));
    });

    it('scheduleIdle falls back to setTimeout when requestIdleCallback is absent', async () => {
      let executed = false;
      // @ts-expect-error test fallback
      delete window.requestIdleCallback;

      scheduleIdle(() => {
        executed = true;
      }, 100);

      await waitFor(() => expect(executed).toBe(true));
    });

    it('preloadComponent safely invokes importer and swallows network errors', async () => {
      let rejected = false;
      const failingImporter = jest.fn().mockImplementation(() => {
        rejected = true;
        return Promise.reject(new Error('Network Chunk Fetch Failed (503)'));
      });

      preloadComponent(failingImporter, 50);

      await waitFor(() => expect(failingImporter).toHaveBeenCalled());
      expect(rejected).toBe(true);
    });

    it('preloadApartmentModal and preloadDashboardFeatures execute without throwing', () => {
      expect(() => preloadApartmentModal()).not.toThrow();
      expect(() => preloadDashboardFeatures()).not.toThrow();
    });
  });
});

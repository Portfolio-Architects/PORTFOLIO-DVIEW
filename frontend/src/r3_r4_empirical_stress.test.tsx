import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components under test
import OfflineBannerGlobal from '@/components/OfflineBanner';
import { OfflineBanner as OfflineBannerUI } from '@/components/ui/OfflineBanner';
import SWRProvider from '@/components/pwa/SWRProvider';
import LoungeSkeleton from '@/components/ui/LoungeSkeleton';
import MacroDashboardSkeleton from '@/components/ui/MacroDashboardSkeleton';
import ApartmentModalSkeleton from '@/components/ui/ApartmentModalSkeleton';

// Dynamic mock for useNetworkStatus that notifies subscribers upon state changes
let currentNetworkStatus = true;
const listeners: Array<() => void> = [];

jest.mock('@/lib/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => {
    const [online, setOnline] = React.useState(currentNetworkStatus);
    React.useEffect(() => {
      const listener = () => setOnline(currentNetworkStatus);
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx > -1) listeners.splice(idx, 1);
      };
    }, []);
    return online;
  },
}));

function updateNetworkStatus(isOnline: boolean) {
  currentNetworkStatus = isOnline;
  act(() => {
    listeners.forEach((l) => l());
  });
}

// Import utils
import { useSWRConfig } from 'swr';
import { retryOfflineRequests } from '@/lib/utils/offlineQueue';

jest.mock('@/lib/utils/offlineQueue', () => ({
  retryOfflineRequests: jest.fn().mockResolvedValue(undefined),
  enqueueOfflineRequest: jest.fn().mockResolvedValue(undefined),
}));

// Test helper component to read SWR config values
const SWRConfigInspector = () => {
  const config = useSWRConfig();
  return (
    <div>
      <span data-testid="revalidateOnReconnect">{config.revalidateOnReconnect ? 'true' : 'false'}</span>
      <span data-testid="refreshInterval">{config.refreshInterval === 0 ? '0' : 'active'}</span>
      <span data-testid="shouldRetryOnError">{config.shouldRetryOnError ? 'true' : 'false'}</span>
    </div>
  );
};

describe('R3: Offline/Slow Network Resilience & Auto-Sync Stress Suite', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners.length = 0;
    currentNetworkStatus = true;
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('1. Skeleton Components Render & Layout Shift Stability', () => {
    it('renders LoungeSkeleton cleanly with animate-pulse container', () => {
      const { container } = render(<LoungeSkeleton />);
      const skeleton = screen.getByTestId('lounge-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain('animate-pulse');
      expect(container.querySelectorAll('.bg-neutral-200, .bg-zinc-800').length).toBeGreaterThan(0);
    });

    it('renders MacroDashboardSkeleton cleanly with all indicator placeholders', () => {
      render(<MacroDashboardSkeleton />);
      const skeleton = screen.getByTestId('macrodashboard-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain('animate-pulse');
    });

    it('renders ApartmentModalSkeleton cleanly with portal container', () => {
      // Create modal root container
      const modalRoot = document.createElement('div');
      modalRoot.setAttribute('id', 'modal-root');
      document.body.appendChild(modalRoot);

      render(<ApartmentModalSkeleton onClose={jest.fn()} />);
      expect(screen.getByText('아파트 임장 카드 로드 중...')).toBeInTheDocument();
      expect(screen.getByText('단지 소식')).toBeInTheDocument();

      document.body.removeChild(modalRoot);
    });
  });

  describe('2. OfflineBanner Behavior (Global & UI)', () => {
    it('Global OfflineBanner stays hidden when online and not returning from offline', () => {
      updateNetworkStatus(true);
      const { container } = render(<OfflineBannerGlobal />);
      expect(container.firstChild).toBeNull();
    });

    it('Global OfflineBanner displays alert when device goes offline', async () => {
      updateNetworkStatus(false);
      render(<OfflineBannerGlobal />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/오프라인 상태입니다/i)).toBeInTheDocument();
      });
    });

    it('Global OfflineBanner shows reconnected message briefly when back online', async () => {
      // Step 1: Start offline
      updateNetworkStatus(false);
      render(<OfflineBannerGlobal />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Step 2: Transition to Online (subscribers notified, maintaining component state)
      updateNetworkStatus(true);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText(/네트워크가 다시 연결되었습니다/i)).toBeInTheDocument();
      });
    });

    it('UI OfflineBanner displays stale cache warning when online but serving cached data', () => {
      updateNetworkStatus(true);
      const onRefreshMock = jest.fn();
      render(<OfflineBannerUI isStale={true} onRefresh={onRefreshMock} />);

      expect(screen.getByText('캐시 데이터 표시 중')).toBeInTheDocument();
      expect(screen.getByText('최신 정보를 동기화하는 동안 오프라인 캐시 데이터를 표시합니다.')).toBeInTheDocument();

      const refreshBtn = screen.getByRole('button', { name: '새로고침' });
      fireEvent.click(refreshBtn);
      expect(onRefreshMock).toHaveBeenCalledTimes(1);
    });

    it('UI OfflineBanner can be dismissed by user', () => {
      updateNetworkStatus(false);
      render(<OfflineBannerUI />);

      expect(screen.getByText('오프라인 모드')).toBeInTheDocument();
      const closeBtn = screen.getByTitle('닫기');
      fireEvent.click(closeBtn);

      expect(screen.queryByText('오프라인 모드')).not.toBeInTheDocument();
    });
  });

  describe('3. Auto-Reconnection Sync & SWR Configuration', () => {
    it('dynamically updates SWR configuration parameters based on online status', () => {
      updateNetworkStatus(true);
      render(
        <SWRProvider>
          <SWRConfigInspector />
        </SWRProvider>
      );

      expect(screen.getByTestId('revalidateOnReconnect').textContent).toBe('true');
      expect(screen.getByTestId('refreshInterval').textContent).toBe('active');

      // Transition to offline
      updateNetworkStatus(false);

      expect(screen.getByTestId('revalidateOnReconnect').textContent).toBe('false');
      expect(screen.getByTestId('refreshInterval').textContent).toBe('0');
      expect(screen.getByTestId('shouldRetryOnError').textContent).toBe('false');
    });

    it('triggers retryOfflineRequests when device reconnects to network', async () => {
      updateNetworkStatus(false);
      render(
        <SWRProvider>
          <div>Child</div>
        </SWRProvider>
      );

      // Device comes back online
      updateNetworkStatus(true);

      await waitFor(() => {
        expect(retryOfflineRequests).toHaveBeenCalled();
      });
    });
  });

  describe('4. Rapid Online/Offline Stress Simulation', () => {
    it('handles 10 rapid online/offline toggles without crashing or throwing errors', async () => {
      updateNetworkStatus(true);
      render(
        <SWRProvider>
          <OfflineBannerGlobal />
          <SWRConfigInspector />
        </SWRProvider>
      );

      for (let i = 0; i < 10; i++) {
        const onlineState = i % 2 === 0;
        updateNetworkStatus(onlineState);
      }

      // Final state check
      expect(screen.getByTestId('revalidateOnReconnect')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import SWRProvider from './SWRProvider';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { useSWRConfig } from 'swr';

// Mock the network status hook
jest.mock('@/lib/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

// Dummy child component to inspect SWRConfig values at runtime
const TestChild = () => {
  const config = useSWRConfig();
  return (
    <div>
      <span data-testid="revalidateOnFocus">{config.revalidateOnFocus ? 'true' : 'false'}</span>
      <span data-testid="revalidateOnReconnect">{config.revalidateOnReconnect ? 'true' : 'false'}</span>
      <span data-testid="refreshInterval">{config.refreshInterval === 0 ? 'paused' : 'active'}</span>
    </div>
  );
};

describe('SWRProvider Offline Resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('configures SWR for active fetching when online', () => {
    // Mock network status as online (true)
    (useNetworkStatus as jest.Mock).mockReturnValue(true);

    render(
      <SWRProvider>
        <TestChild />
      </SWRProvider>
    );

    expect(screen.getByTestId('revalidateOnFocus').textContent).toBe('false');
    expect(screen.getByTestId('revalidateOnReconnect').textContent).toBe('true');
    expect(screen.getByTestId('refreshInterval').textContent).toBe('active');
  });

  it('pauses SWR fetching and polling when offline', () => {
    // Mock network status as offline (false)
    (useNetworkStatus as jest.Mock).mockReturnValue(false);

    render(
      <SWRProvider>
        <TestChild />
      </SWRProvider>
    );

    expect(screen.getByTestId('revalidateOnFocus').textContent).toBe('false');
    expect(screen.getByTestId('revalidateOnReconnect').textContent).toBe('false');
    expect(screen.getByTestId('refreshInterval').textContent).toBe('paused');
  });
});

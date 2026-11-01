import React from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import '@testing-library/jest-dom';

import MacroDashboardClient from '@/components/MacroDashboardClient';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('MacroDashboardClient TrafficNoticeBoard SSR Hydration Safety', () => {
  it('hydrates cleanly without mismatch even when client SWR cache already holds /api/local-notices?dongtan=true from localStorage', async () => {
    const serverCache = new Map();
    const clientCache = new Map<string, unknown>([
      [
        '/api/local-notices?dongtan=true',
        {
          data: {
            notices: [
              {
                id: 'n-1',
                title: '주민등록 무단전출자 직권조치 결과 공고',
                date: '2026-10-28',
                dept: '동탄출장소',
                url: 'https://www.hscity.go.kr',
              },
            ],
          },
        },
      ],
    ]);

    const buildTree = (cache: Map<any, any>) => (
      <SWRConfig value={{ provider: () => cache, fetcher: () => Promise.resolve(null) }}>
        <AuthProvider>
          <SettingsProvider>
            <MacroDashboardClient
              sheetApartments={{}}
              txSummaryData={{}}
              recentTransactions={[]}
              macroTrendData={[]}
            />
          </SettingsProvider>
        </AuthProvider>
      </SWRConfig>
    );

    const ssrHtml = renderToString(buildTree(serverCache));
    const container = document.createElement('div');
    container.innerHTML = ssrHtml;
    document.body.appendChild(container);

    const recoverableErrors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | null = null;

    await act(async () => {
      root = hydrateRoot(container, buildTree(clientCache), {
        onRecoverableError: (err) => {
          recoverableErrors.push(err);
        },
      });
    });

    expect(recoverableErrors).toHaveLength(0);
    // After mount effect finishes, cached notice renders cleanly on client
    expect(container.textContent).toContain('주민등록 무단전출자 직권조치 결과 공고');

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });
});

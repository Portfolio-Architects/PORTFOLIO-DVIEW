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

describe('MacroDashboardClient TrafficNoticeBoard SSR Hydration & Railway Filtering', () => {
  it('hydrates cleanly without mismatch and renders only genuine railway/tram notices while excluding general/AI notices', async () => {
    const serverCache = new Map();
    const clientCache = new Map<string, unknown>([
      [
        '/api/local-notices?dongtan=true',
        {
          data: {
            notices: [
              {
                id: 'bbs_12760',
                title: '동탄구청 식품위생법 및 식품 등의 표시광고에 관한 법률 위반 사실의 공표(2026년 10월)',
                date: '2026-11-05',
                dept: '동탄출장소 위생과',
                source: 'bbs',
                isDongtan: true,
                url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbs.do?q_bbsCode=1019&q_bbscttSn=12760',
              },
              {
                id: 'dong_57700120000_103',
                title: '[동탄3동] 주민자치센터 프로그램 강사 모집 공고',
                date: '2026-11-04',
                dept: '동탄3동',
                source: 'dong',
                isDongtan: true,
                url: 'https://www.hscity.go.kr/dongtan/user/bbs/BD_selectBbs.do?q_bbsCode=1049&q_bbscttSn=103',
              },
              {
                id: 'ai_report_gap_analysis_20261105',
                title: '[AI 리포트] 동탄2신도시 전세가율 70% 이상 주거 안심 추천 단지 TOP 3',
                date: '2026-11-05',
                dept: 'D-VIEW AI 데이터 랩',
                source: 'culture',
                isDongtan: true,
                url: 'https://dongtanview.com/#lounge-notices-culture',
              },
              {
                id: 'rail_12',
                title: '신안산선 향남 연장 추진현황',
                date: '2026-10-13',
                dept: '철도전략과',
                source: 'rail',
                isDongtan: false,
                url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbs.do?q_bbsCode=1131&q_bbscttSn=202308010012',
              },
              {
                id: 'rail_13',
                title: '동탄역 환승센터 추진현황',
                date: '2026-10-13',
                dept: '철도전략과',
                source: 'rail',
                isDongtan: true,
                url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbs.do?q_bbsCode=1131&q_bbscttSn=202506020001',
              },
              {
                id: 'rail_10',
                title: '가칭솔빛나루역 신설사업 추진현황',
                date: '2026-10-13',
                dept: '철도전략과',
                source: 'rail',
                isDongtan: true,
                url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbs.do?q_bbsCode=1131&q_bbscttSn=202308010010',
              },
              {
                id: 'rail_1154_94',
                title: '동탄트램 추진현황(2026년 10월 5주)',
                date: '2026-10-30',
                dept: '트램건설추진단',
                source: 'rail',
                isDongtan: true,
                url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbs.do?q_bbsCode=1154&q_bbscttSn=202611020010',
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
    // Genuine Dongtan railway and tram notices are rendered
    expect(container.textContent).toContain('동탄역 환승센터 추진현황');
    expect(container.textContent).toContain('가칭솔빛나루역 신설사업 추진현황');
    expect(container.textContent).toContain('동탄트램 추진현황(2026년 10월 5주)');

    // Non-railway notices, synthetic AI reports, and non-Dongtan western rail notices are strictly excluded
    expect(container.textContent).not.toContain('식품위생법');
    expect(container.textContent).not.toContain('주민자치센터 프로그램 강사 모집 공고');
    expect(container.textContent).not.toContain('[AI 리포트]');
    expect(container.textContent).not.toContain('신안산선 향남 연장 추진현황');

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });
});

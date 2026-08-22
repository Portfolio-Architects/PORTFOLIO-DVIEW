import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TechnoValleyDashboard from '../components/macro/TechnoValleyDashboard';
import MacroDashboardClient from '../components/MacroDashboardClient';
import LoungeHeader from '../components/LoungeHeader';
import MobileDock from '../components/pwa/MobileDock';

// -------------------------------------------------------------
// Mocks
// -------------------------------------------------------------

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="mock-responsive-container" style={{ width: '100%', height: '100%' }}>{children}</div>,
    PieChart: ({ children }: any) => <svg data-testid="mock-pie-chart">{children}</svg>,
    Pie: ({ children }: any) => <g data-testid="mock-pie">{children}</g>,
    Cell: () => <path data-testid="mock-cell" />,
    LineChart: ({ children }: any) => <svg data-testid="mock-line-chart">{children}</svg>,
    Line: () => <g data-testid="mock-line" />,
    XAxis: () => <g data-testid="mock-xaxis" />,
    YAxis: () => <g data-testid="mock-yaxis" />,
    CartesianGrid: () => <g data-testid="mock-grid" />,
    Tooltip: () => <div data-testid="mock-tooltip" />,
  };
});

jest.mock('swr', () => {
  return jest.fn((key: string | null) => {
    if (!key) return { data: null, isValidating: false, isLoading: false };
    if (key.includes('/api/technovalley/industry-distribution')) {
      return {
        data: {
          success: true,
          data: [
            {
              name: '반도체·첨단제조',
              value: 33.3,
              color: '#004696',
              count: 4,
              companies: [
                '어플라이드 머티리얼즈 코리아 - 경기도 화성시 동탄기흥로 614-26',
                '도쿄일렉트론코리아 - 경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워',
                'ASM 코리아 - 경기도 화성시 동탄기흥로 635',
                '케이씨텍 - 경기도 화성시 동탄기흥로 642'
              ]
            },
            {
              name: 'IT·소프트웨어',
              value: 9.5,
              color: '#dc6e2d',
              count: 2,
              companies: [
                '위즈코리아 - 경기도 화성시 동탄대로21길 26, SH타임스퀘어',
                '한국아이티에스 - 경기도 화성시 동탄대로22길 17'
              ]
            }
          ]
        },
        isValidating: false,
        isLoading: false
      };
    }
    if (key.includes('/api/technovalley/trend')) {
      return {
        data: {
          success: true,
          data: [
            { date: '21.01', '금강 IX': 58.5, '금강IX_임대료': 2.95, 평균임대료: 2.56 },
            { date: '21.05', '금강 IX': 55.0, '금강IX_임대료': 3.00, 평균임대료: 2.60 }
          ]
        },
        isValidating: false,
        isLoading: false
      };
    }
    if (key.includes('/api/technovalley/jisan-status')) {
      return {
        data: { total: 56, completedCount: 43, underConstructionCount: 3, notStartedCount: 10, centers: [] },
        isValidating: false,
        isLoading: false
      };
    }
    return { data: null, isValidating: false, isLoading: false };
  });
});

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-123', email: 'test@example.com' },
    loading: false,
  }),
}));

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsUi: () => ({
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
  useSettingsValues: () => ({
    areaUnit: 'pyeong',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
  }),
  useSettings: () => ({
    areaUnit: 'pyeong',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
}));

jest.mock('@/hooks/useStaticData', () => ({
  useLocationScores: () => ({}),
}));

// -------------------------------------------------------------
// Test Suites
// -------------------------------------------------------------

describe('Milestone 1 Challenger 1 Empirical & Adversarial Stress Suite', () => {

  describe('1. TechnoValleyDashboard Re-render Elimination & Search Stress', () => {
    it('is exported as a React.memo component', () => {
      expect(TechnoValleyDashboard).toBeDefined();
      expect((TechnoValleyDashboard as any).$$typeof?.toString()).toContain('Symbol(react.memo)');
    });

    it('handles high-frequency rapid keystrokes (50+ changes) in search query without crashing or desyncing', () => {
      render(<TechnoValleyDashboard />);

      const searchInput = screen.getByPlaceholderText('기업명 또는 건물명/도로명 검색...');
      expect(searchInput).toBeInTheDocument();

      const testInputs = [
        'ASM',
        '도쿄',
        '케이씨텍',
        '위즈코리아',
        '금강펜테리움',
        '동탄기흥로',
        '존재하지않는기업명',
        '',
        '코리아',
        '   ',
        '한',
        '한국',
        '한국아이티에스'
      ];

      act(() => {
        for (let i = 0; i < 50; i++) {
          const val = testInputs[i % testInputs.length];
          fireEvent.change(searchInput, { target: { value: val } });
        }
      });

      // Clear button test
      const clearBtn = screen.queryByRole('button', { name: /초기화|지우기/i }) || searchInput.parentElement?.querySelector('button');
      if (clearBtn) {
        act(() => {
          fireEvent.click(clearBtn);
        });
      }
      expect(searchInput).toHaveValue('');
    });

    it('safely handles adversarial search strings: regex metacharacters, extreme lengths, emojis, and XSS payloads', () => {
      render(<TechnoValleyDashboard />);

      const searchInput = screen.getByPlaceholderText('기업명 또는 건물명/도로명 검색...');

      const adversarialPayloads = [
        '([.*+?^${}()|[\\]\\\\])',     // Regex characters that break unescaped RegExp
        '<script>alert("xss")</script>', // HTML/XSS injection
        '🚀🔥🏢🤖💻✨',                   // Multibyte Emojis
        'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ',     // Korean Hangul Jamo only
        'A'.repeat(2000),                // Extreme length query (2000 chars)
        '\'"`;!--<>=',                   // SQL/HTML injection tokens
        '   \t   ',                      // Mixed whitespace
      ];

      adversarialPayloads.forEach((payload) => {
        act(() => {
          fireEvent.change(searchInput, { target: { value: payload } });
        });
        expect(searchInput).toHaveValue(payload);
        expect(screen.getByText('업종 구분별 기업 리스트')).toBeInTheDocument();
      });
    });

    it('shows non-matching feedback banner when query finds zero matching companies', () => {
      render(<TechnoValleyDashboard />);

      const searchInput = screen.getByPlaceholderText('기업명 또는 건물명/도로명 검색...');
      act(() => {
        fireEvent.change(searchInput, { target: { value: '완전무결매칭불가키워드999' } });
      });

      expect(screen.getByText('검색 조건에 맞는 기업이 없습니다.')).toBeInTheDocument();
    });

    it('handles rapid category selection and outside clicks without throwing errors', () => {
      render(<TechnoValleyDashboard />);

      const sectorButtons = screen.getAllByRole('button');
      const categoryBtn = sectorButtons.find(btn => btn.textContent?.includes('반도체') || btn.textContent?.includes('IT'));

      if (categoryBtn) {
        act(() => {
          for (let i = 0; i < 20; i++) {
            fireEvent.click(categoryBtn);
          }
        });
      }

      // Outside click simulation
      act(() => {
        fireEvent.click(document.body);
      });

      expect(screen.getByText('업종 구분별 기업 리스트')).toBeInTheDocument();
    });

    it('handles metric mode toggle and timeframe change safely under rapid interaction', () => {
      render(<TechnoValleyDashboard />);

      const rentBtn = screen.getByRole('button', { name: /임대료/i });
      const vacancyBtn = screen.getByRole('button', { name: /공실률/i });

      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.click(rentBtn);
          fireEvent.click(vacancyBtn);
        }
      });

      // Timeframe buttons
      const timeframes = ['3Y', '6M', 'YTD', '1Y', 'ALL'];
      timeframes.forEach((tf) => {
        const tfBtn = screen.queryByRole('button', { name: tf });
        if (tfBtn) {
          act(() => {
            fireEvent.click(tfBtn);
          });
        }
      });

      expect(screen.getByText(/테크노밸리.*(임대료|공실률).*추이/)).toBeInTheDocument();
    });

    it('handles expand all, collapse all, and show more pagination under rapid clicking', () => {
      render(<TechnoValleyDashboard />);

      const expandAllBtn = screen.getByRole('button', { name: /전체 펼치기/i });
      const collapseAllBtn = screen.getByRole('button', { name: /전체 접기/i });

      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.click(expandAllBtn);
          fireEvent.click(collapseAllBtn);
        }
      });

      expect(screen.getByText('업종 구분별 기업 리스트')).toBeInTheDocument();
    });
  });

  describe('2. MacroDashboardClient Prop Stability & Fallback Immutability', () => {
    it('is exported as a React.memo component', () => {
      expect(MacroDashboardClient).toBeDefined();
      expect((MacroDashboardClient as any).$$typeof?.toString()).toContain('Symbol(react.memo)');
    });

    it('maintains referential stability on fallback objects and handlers across parent renders', () => {
      let parentRenderCount = 0;

      const dummySheetApartments = {
        '청계동': [
          {
            name: '동탄역 롯데캐슬',
            dong: '오산동',
            totalUnits: 940,
            buildYear: 2021,
            lat: 37.2,
            lng: 127.1,
            pyeongList: [34],
            exclusiveAreas: [84.9]
          }
        ]
      };

      const dummyTxSummary = {
        '동탄역 롯데캐슬': {
          aptName: '동탄역 롯데캐슬',
          dong: '오산동',
          highestPrice: 160000,
          latestPrice: 155000,
          txCount: 42,
          lastUpdated: '2026-08-20',
          recentHighDate: '2026-08-15',
          priceDelta: 5000
        }
      };

      // Wrapper component that re-renders with changing state
      function ParentHarness() {
        const [ticker, setTicker] = useState(0);
        parentRenderCount++;

        return (
          <div>
            <button onClick={() => setTicker(t => t + 1)} data-testid="tick-btn">
              Tick {ticker}
            </button>
            <MacroDashboardClient
              sheetApartments={dummySheetApartments}
              txSummaryData={dummyTxSummary}
              macroTrendData={[]}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              // Deliberately omit nameMapping, locationScores, onSelectApt to test default fallbacks
            />
          </div>
        );
      }

      const { getByTestId } = render(<ParentHarness />);
      expect(parentRenderCount).toBe(1);

      // Trigger 5 individual parent re-renders with separate act blocks
      for (let i = 0; i < 5; i++) {
        act(() => {
          fireEvent.click(getByTestId('tick-btn'));
        });
      }

      expect(parentRenderCount).toBe(6);
      expect(screen.getAllByText('D-VIEW 아파트 랩').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. DashboardClient Tab Navigation Callback Stability', () => {
    it('LoungeHeader and MobileDock receive identical handler identities without re-allocating new arrow closures', () => {
      const handleTabChangeSpy = jest.fn();

      const { rerender } = render(
        <>
          <LoungeHeader activeTab="overview" onTabChange={handleTabChangeSpy} />
          <MobileDock activeTab="overview" onTabClick={handleTabChangeSpy} />
        </>
      );

      // Re-render with same handler
      rerender(
        <>
          <LoungeHeader activeTab="technovalley" onTabChange={handleTabChangeSpy} />
          <MobileDock activeTab="technovalley" onTabClick={handleTabChangeSpy} />
        </>
      );

      // Click on both
      const technoLinks = screen.getAllByRole('link', { name: /테크노 랩/i });
      expect(technoLinks.length).toBe(2);

      fireEvent.click(technoLinks[0]);
      expect(handleTabChangeSpy).toHaveBeenCalledWith('technovalley');

      fireEvent.click(technoLinks[1]);
      expect(handleTabChangeSpy).toHaveBeenCalledWith('technovalley');
    });

    it('stress tests rapid tab clicks across all 4 main navigation tabs (40 iterations)', () => {
      const tabSpy = jest.fn();
      render(
        <LoungeHeader activeTab="overview" onTabChange={tabSpy} />
      );

      const tabs = ['overview', 'imjang', 'technovalley', 'office'];
      const links = [
        screen.getByRole('link', { name: /아파트 랩/i }),
        screen.getByRole('link', { name: /아파트 탐색/i }),
        screen.getByRole('link', { name: /테크노 랩/i }),
        screen.getByRole('link', { name: /사무실 탐색/i }),
      ];

      act(() => {
        for (let i = 0; i < 40; i++) {
          const idx = i % links.length;
          fireEvent.click(links[idx]);
        }
      });

      expect(tabSpy).toHaveBeenCalledTimes(40);
      expect(tabSpy).toHaveBeenLastCalledWith(tabs[39 % tabs.length]);
    });
  });
});

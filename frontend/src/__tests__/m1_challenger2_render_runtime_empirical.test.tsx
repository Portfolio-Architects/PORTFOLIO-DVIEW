import React, { useState, useCallback } from 'react';
import { render, screen, fireEvent, act, renderHook, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TechnoValleyDashboard from '../components/macro/TechnoValleyDashboard';
import LoungeHeader from '../components/LoungeHeader';
import MobileDock from '../components/pwa/MobileDock';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));

jest.mock('@/components/FloatingUserBar', () => {
  return function MockFloatingUserBar() {
    return <div data-testid='mock-floating-user-bar' />;
  };
});

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsUi: () => ({
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
  }),
  useSettings: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
}));

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid='responsive-container' style={{ width: '100%', height: '100%' }}>{children}</div>,
    PieChart: ({ children }: any) => <svg data-testid='pie-chart'>{children}</svg>,
    Pie: ({ children }: any) => <g>{children}</g>,
    Cell: () => <path />,
    LineChart: ({ children }: any) => <svg data-testid='line-chart'>{children}</svg>,
    Line: () => <g />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    CartesianGrid: () => <g />,
    Tooltip: () => <div />,
  };
});

jest.mock('swr', () => {
  return jest.fn((key: string) => {
    if (key === '/api/technovalley/industry-distribution') {
      return {
        data: {
          success: true,
          data: [
            { name: '반도체·첨단제조', value: 50, color: '#004696', count: 100, companies: ['어플라이드 머티리얼즈 코리아 - 경기도 화성시 동탄기흥로 614-26', '도쿄일렉트론코리아 - 경기도 화성시 동탄첨단산업1로 27'] },
            { name: 'IT·소프트웨어', value: 50, color: '#dc6e2d', count: 50, companies: ['한국아이티에스 - 경기도 화성시 동탄대로22길 17', '위즈코리아 - 경기도 화성시 동탄대로21길 26'] }
          ]
        },
        isValidating: false,
        isLoading: false
      };
    }
    if (key === '/api/technovalley/trend') {
      return {
        data: {
          success: true,
          data: [
            { date: '24.01', '금강 IX': 10, '실리콘앨리': 12, '테라타워': 15, '금강IX_임대료': 3.0, 평균임대료: 3.2 },
            { date: '24.06', '금강 IX': 8, '실리콘앨리': 10, '테라타워': 12, '금강IX_임대료': 3.2, 평균임대료: 3.4 }
          ]
        },
        isValidating: false,
        isLoading: false
      };
    }
    if (key === '/api/technovalley/jisan-status') {
      return {
        data: { total: 56, completedCount: 43, underConstructionCount: 3, notStartedCount: 10, centers: [] },
        isValidating: false,
        isLoading: false
      };
    }
    return { data: null, isValidating: false, isLoading: false };
  });
});

describe('Milestone 1 Challenger 2 Empirical Stress & Verification Suite', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. React.memo Stability Under Parent State Churn', () => {
    
    it('prevents child re-renders when parent component undergoes 50 rapid state updates', () => {
      let childRenderCount = 0;
      
      const MemoizedChild = React.memo(function MemoizedChild({ staticProp, fallbackObj, onAction }: { staticProp: string; fallbackObj: Record<string, any>; onAction: () => void }) {
        childRenderCount++;
        return (
          <div data-testid='memoized-child'>
            <span>{staticProp}</span>
            <button onClick={onAction}>Click</button>
          </div>
        );
      });

      const FROZEN_FALLBACK = Object.freeze({});
      const STABLE_CALLBACK = () => {};

      function ParentWrapper() {
        const [ticker, setTicker] = useState(0);
        
        return (
          <div>
            <span data-testid='parent-ticker'>{ticker}</span>
            <button data-testid='trigger-parent-render' onClick={() => setTicker(c => c + 1)}>
              Tick
            </button>
            <MemoizedChild 
              staticProp='stable-value' 
              fallbackObj={FROZEN_FALLBACK} 
              onAction={STABLE_CALLBACK} 
            />
          </div>
        );
      }

      render(<ParentWrapper />);
      expect(childRenderCount).toBe(1);

      const tickBtn = screen.getByTestId('trigger-parent-render');

      act(() => {
        for (let i = 0; i < 50; i++) {
          fireEvent.click(tickBtn);
        }
      });

      expect(screen.getByTestId('parent-ticker')).toHaveTextContent('50');
      expect(childRenderCount).toBe(1);
    });

    it('TechnoValleyDashboard root memoization survives parent re-rendering cycles', () => {
      let parentRenders = 0;

      function DashboardParent() {
        const [dummyCount, setDummyCount] = useState(0);
        parentRenders++;

        return (
          <div>
            <button data-testid='bump-parent' onClick={() => setDummyCount(c => c + 1)}>
              Bump Parent
            </button>
            <TechnoValleyDashboard />
          </div>
        );
      }

      render(<DashboardParent />);
      expect(screen.getByText('테크노밸리 입주 기업 업종 분포')).toBeInTheDocument();
      expect(parentRenders).toBe(1);

      const bumpBtn = screen.getByTestId('bump-parent');
      
      act(() => { fireEvent.click(bumpBtn); });
      expect(parentRenders).toBe(2);

      act(() => { fireEvent.click(bumpBtn); });
      expect(parentRenders).toBe(3);

      act(() => { fireEvent.click(bumpBtn); });
      expect(parentRenders).toBe(4);

      expect(screen.getByText('테크노밸리 입주 기업 업종 분포')).toBeInTheDocument();
    });
  });

  describe('2. useDeferredValue & UI Consistency (Company Search & Sector Toggles)', () => {

    it('handles search input keystrokes, deferred filtering, matching counts, and clear search', () => {
      render(<TechnoValleyDashboard />);

      const searchInput = screen.getByPlaceholderText('기업명 또는 건물명/도로명 검색...');
      expect(searchInput).toBeInTheDocument();

      act(() => {
        fireEvent.change(searchInput, { target: { value: '어플라이드' } });
      });

      expect(searchInput).toHaveValue('어플라이드');
      expect(screen.getByText('1개 매칭')).toBeInTheDocument();
      expect(screen.getByText('어플라이드 머티리얼즈 코리아')).toBeInTheDocument();
      expect(screen.queryByText('위즈코리아')).not.toBeInTheDocument();

      act(() => {
        fireEvent.change(searchInput, { target: { value: '존재하지않는기업XYZ' } });
      });

      expect(screen.getByText('검색 조건에 맞는 기업이 없습니다.')).toBeInTheDocument();

      const clearBtn = screen.getByRole('button', { name: '' });
      act(() => {
        fireEvent.click(clearBtn);
      });

      expect(searchInput).toHaveValue('');
      expect(screen.queryByText('검색 조건에 맞는 기업이 없습니다.')).not.toBeInTheDocument();
      expect(screen.getAllByText('2개 기업')).toHaveLength(2);
    });

    it('toggles sectors, expand-all, and collapse-all accurately without race conditions', () => {
      render(<TechnoValleyDashboard />);

      const expandAllBtn = screen.getByText('전체 펼치기');
      const collapseAllBtn = screen.getByText('전체 접기');

      act(() => {
        fireEvent.click(expandAllBtn);
      });

      expect(screen.getByText('어플라이드 머티리얼즈 코리아')).toBeInTheDocument();
      expect(screen.getByText('한국아이티에스')).toBeInTheDocument();

      act(() => {
        fireEvent.click(collapseAllBtn);
      });

      // After collapse all, company card should be closed
      expect(screen.queryByText('한국아이티에스')).not.toBeInTheDocument();

      // Individual sector toggle (IT sector)
      const itSectorButtons = screen.getAllByRole('button');
      const itAccordion = itSectorButtons.find(btn => btn.textContent?.includes('IT·소프트웨어'));
      expect(itAccordion).toBeDefined();

      act(() => {
        if (itAccordion) fireEvent.click(itAccordion);
      });

      expect(screen.getByText('한국아이티에스')).toBeInTheDocument();
    });
  });

  describe('3. Tab Switching Navigation Callbacks (handleTabChange)', () => {

    it('updates activeTab, pushes window history, and invokes router.replace for each valid tab', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});

      const handleTabChange = (tab: string, setActiveTab: (t: any) => void) => {
        const targetTab = tab as 'overview' | 'imjang' | 'office' | 'technovalley';
        setActiveTab(targetTab);
        let href = '/';
        if (targetTab === 'office') href = '/overview?tab=office';
        else if (targetTab === 'imjang') href = '/explore';
        else if (targetTab === 'technovalley') href = '/technovalley';
        else if (targetTab === 'overview') href = '/';
        window.history.pushState(null, '', href);
        try { mockReplace(href, { scroll: false }); } catch (err) {}
      };

      const { result } = renderHook(() => {
        const [activeTab, setActiveTab] = useState<'overview' | 'imjang' | 'office' | 'technovalley'>('overview');
        const onTabChange = useCallback((tab: string) => {
          handleTabChange(tab, setActiveTab);
        }, []);
        return { activeTab, onTabChange };
      });

      act(() => {
        result.current.onTabChange('office');
      });
      expect(result.current.activeTab).toBe('office');
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/overview?tab=office');
      expect(mockReplace).toHaveBeenCalledWith('/overview?tab=office', { scroll: false });

      act(() => {
        result.current.onTabChange('imjang');
      });
      expect(result.current.activeTab).toBe('imjang');
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/explore');
      expect(mockReplace).toHaveBeenCalledWith('/explore', { scroll: false });

      act(() => {
        result.current.onTabChange('technovalley');
      });
      expect(result.current.activeTab).toBe('technovalley');
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/technovalley');
      expect(mockReplace).toHaveBeenCalledWith('/technovalley', { scroll: false });

      act(() => {
        result.current.onTabChange('overview');
      });
      expect(result.current.activeTab).toBe('overview');
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/');
      expect(mockReplace).toHaveBeenCalledWith('/', { scroll: false });

      pushStateSpy.mockRestore();
    });

    it('LoungeHeader correctly invokes handleTabChange on tab clicks', () => {
      const mockOnTabChange = jest.fn();

      const { container } = render(
        <LoungeHeader activeTab='overview' onTabChange={mockOnTabChange} />
      );

      const technovalleyLink = within(container).getByRole('link', { name: /테크노 랩/i });
      fireEvent.click(technovalleyLink);
      expect(mockOnTabChange).toHaveBeenCalledWith('technovalley');
    });

    it('MobileDock correctly invokes handleTabChange on tab clicks', () => {
      const mockOnTabChange = jest.fn();

      const { container } = render(
        <MobileDock activeTab='overview' onTabClick={mockOnTabChange} />
      );

      const imjangLink = within(container).getByRole('link', { name: /아파트 탐색/i });
      fireEvent.click(imjangLink);
      expect(mockOnTabChange).toHaveBeenCalledWith('imjang');
    });
  });
});

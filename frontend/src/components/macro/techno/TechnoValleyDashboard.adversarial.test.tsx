import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TechnoCompanyList } from './TechnoCompanyList';
import { TechnoMetricCards } from './TechnoMetricCards';
import { TechnoDonutSection } from './TechnoDonutSection';
import { TechnoTrendSection } from './TechnoTrendSection';
import TechnoValleyDashboard from '../TechnoValleyDashboard';

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    PieChart: ({ children }: any) => <svg data-testid="pie-chart">{children}</svg>,
    Pie: ({ children }: any) => <g>{children}</g>,
    Cell: () => <path />,
    LineChart: ({ children }: any) => <svg data-testid="line-chart">{children}</svg>,
    Line: () => <g />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    CartesianGrid: () => <g />,
    Tooltip: () => <div />,
  };
});

// Mock SWR to return specific test fixtures
jest.mock('swr', () => {
  return jest.fn((key: string) => {
    if (key === '/api/technovalley/industry-distribution') {
      return { data: { success: true, data: [] }, isValidating: false, isLoading: false };
    }
    if (key === '/api/technovalley/trend') {
      return { data: { success: true, data: [] }, isValidating: false, isLoading: false };
    }
    if (key === '/api/technovalley/jisan-status') {
      return { data: { total: 0, completedCount: 0, underConstructionCount: 0, notStartedCount: 0, centers: [] }, isValidating: false, isLoading: false };
    }
    return { data: null, isValidating: false, isLoading: false };
  });
});

describe('Adversarial & Stress Tests: TechnoValley Components', () => {
  describe('TechnoMetricCards Stress Suite', () => {
    it('handles 0 and extreme metrics safely without throwing', () => {
      render(
        <TechnoMetricCards
          totalCompanies={0}
          avgVacancy={0}
          avgRent={0}
          totalWorkers={0}
        />
      );

      expect(screen.getByText('0개사')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText('0.00만원')).toBeInTheDocument();
      expect(screen.getByText('약 0.0만명')).toBeInTheDocument();
    });
  });

  describe('TechnoCompanyList Stress Suite', () => {
    it('handles empty sectors array without errors', () => {
      const { container } = render(
        <TechnoCompanyList
          sectors={[]}
          expandedSectors={{}}
          onToggleSector={jest.fn()}
          visibleCounts={{}}
          onLoadMore={jest.fn()}
        />
      );
      expect(screen.getByText('동탄 테크노밸리 주요 입주기업 디렉토리')).toBeInTheDocument();
      expect(container.querySelectorAll('.rounded-2xl')).toHaveLength(0);
    });

    it('handles sectors with 0 companies gracefully', () => {
      const emptySectors = [
        {
          name: '신규 업종',
          value: 0,
          color: '#004696',
          count: 0,
          companies: [],
        },
      ];

      render(
        <TechnoCompanyList
          sectors={emptySectors}
          expandedSectors={{ '신규 업종': true }}
          onToggleSector={jest.fn()}
          visibleCounts={{ '신규 업종': 12 }}
          onLoadMore={jest.fn()}
        />
      );

      expect(screen.getByText('신규 업종')).toBeInTheDocument();
      expect(screen.getByText('0개 대표 입주 기업 수록 (0%)')).toBeInTheDocument();
      // Should not render "기업 더보기" button when there are no more companies
      expect(screen.queryByText(/기업 더보기/)).not.toBeInTheDocument();
    });

    it('handles companies with malformed strings (missing address delimiter)', () => {
      const weirdSectors = [
        {
          name: '특수 업종',
          value: 10,
          color: '#10b981',
          count: 1,
          companies: ['단일이름기업'], // No " - " delimiter
        },
      ];

      render(
        <TechnoCompanyList
          sectors={weirdSectors}
          expandedSectors={{ '특수 업종': true }}
          onToggleSector={jest.fn()}
          visibleCounts={{ '특수 업종': 12 }}
          onLoadMore={jest.fn()}
        />
      );

      expect(screen.getByText('단일이름기업')).toBeInTheDocument();
    });
  });

  describe('TechnoTrendSection Stress Suite', () => {
    it('handles empty trend data or missing rent data without crashing', () => {
      const mockSetMetricMode = jest.fn();
      const mockSetTimeframe = jest.fn();
      const mockSetVisibleBuildings = jest.fn();

      const buildings = [
        { id: '금강 IX', name: '금강 IX타워', color: '#dc6e2d', rentKey: '금강IX_임대료', totalUnits: 2701 },
      ];

      render(
        <TechnoTrendSection
          mounted={true}
          trendData={[]}
          metricMode="rent"
          setMetricMode={mockSetMetricMode}
          timeframe="ALL"
          setTimeframe={mockSetTimeframe}
          visibleBuildings={['금강 IX']}
          setVisibleBuildings={mockSetVisibleBuildings}
          availableBuildings={buildings}
          onOpenHelpModal={jest.fn()}
          onOpenDetailModal={jest.fn()}
        />
      );

      expect(screen.getByText('지식산업센터 공실률 & 임대료 시계열 추이')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles null values for building rent in trend data', () => {
      const mockTrendData = [
        { date: '21.01', '금강 IX': null, '금강IX_임대료': null, 평균임대료: null },
      ];

      render(
        <TechnoTrendSection
          mounted={true}
          trendData={mockTrendData}
          metricMode="rent"
          setMetricMode={jest.fn()}
          timeframe="ALL"
          setTimeframe={jest.fn()}
          visibleBuildings={['금강 IX']}
          setVisibleBuildings={jest.fn()}
          availableBuildings={[
            { id: '금강 IX', name: '금강 IX타워', color: '#dc6e2d', rentKey: '금강IX_임대료', totalUnits: 2701 },
          ]}
          onOpenHelpModal={jest.fn()}
          onOpenDetailModal={jest.fn()}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('TechnoValleyDashboard Integration Suite', () => {
    it('renders top-level dashboard with fallback data when API returns empty', () => {
      render(<TechnoValleyDashboard />);
      expect(screen.getByText('테크노밸리 입주 기업 업종 분포')).toBeInTheDocument();
      expect(screen.getByText('총 상주 근로자 수')).toBeInTheDocument();
      expect(screen.getByText('평당 평균 임대료')).toBeInTheDocument();
    });
  });
});

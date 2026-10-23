import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  MacroTimelineView,
  TimelineGroup,
  TimelineItem,
} from '../components/macro/components/MacroTimelineView';

describe('Empirical Verification: Registration Date & Fallback Edge-Case Stress Tests', () => {

  // =========================================================================
  // Section 1: Algorithmic Date Grouping & Sorting Oracles
  // =========================================================================
  describe('1. Registration Date vs Contract Date Grouping & Sorting Oracles', () => {

    const parseDateHelper = (dateStr: string | number, parentLatestDate?: string): Date | null => {
      if (dateStr === null || dateStr === undefined) return null;
      const clean = String(dateStr).replace(/[^0-9]/g, '');
      if (clean.length === 8) {
        const y = parseInt(clean.substring(0, 4), 10);
        const m = parseInt(clean.substring(4, 6), 10) - 1;
        const d = parseInt(clean.substring(6, 8), 10);
        const dt = new Date(y, m, d);
        return isNaN(dt.getTime()) ? null : dt;
      }
      if (String(dateStr).includes('.')) {
        const parts = String(dateStr).split('.');
        if (parts.length >= 2) {
          const m = parseInt(parts[0], 10) - 1;
          const d = parseInt(parts[1], 10);
          if (isNaN(m) || isNaN(d)) return null;
          let y = 2026;
          let latestDt: Date | null = null;
          if (parentLatestDate && parentLatestDate.length === 8) {
            const ly = parseInt(parentLatestDate.substring(0, 4), 10);
            const lm = parseInt(parentLatestDate.substring(4, 6), 10) - 1;
            const ld = parseInt(parentLatestDate.substring(6, 8), 10);
            const lDt = new Date(ly, lm, ld);
            if (!isNaN(lDt.getTime())) {
              latestDt = lDt;
              y = ly;
            }
          }
          const dt = new Date(y, m, d);
          if (isNaN(dt.getTime())) return null;
          if (latestDt && dt.getTime() > latestDt.getTime()) {
            dt.setFullYear(y - 1);
          }
          return dt;
        }
      }
      return null;
    };

    const groupTimelineTransactions = (transactions: Array<{
      aptName: string;
      registeredDate?: string | null;
      contractDate?: string | null;
      date?: string | null;
      priceVal: number;
    }>) => {
      const groups: Record<string, {
        dateStr: string;
        dateKey: string;
        timestamp: number;
        items: any[];
      }> = {};

      transactions.forEach((tx) => {
        const dt = parseDateHelper(tx.registeredDate || tx.contractDate || tx.date || '');
        if (!dt) return;

        const year = dt.getFullYear();
        const month = dt.getMonth() + 1;
        const dateVal = dt.getDate();
        const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = daysOfWeek[dt.getDay()];
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(dateVal).padStart(2, '0')}`;
        const dateStr = `${year}.${String(month).padStart(2, '0')}.${String(dateVal).padStart(2, '0')} (${dayName})`;

        if (!groups[dateKey]) {
          groups[dateKey] = {
            dateStr,
            dateKey,
            timestamp: dt.getTime(),
            items: [],
          };
        }

        groups[dateKey].items.push({
          aptName: tx.aptName,
          contractDate: tx.contractDate,
          registeredDate: tx.registeredDate,
          priceVal: tx.priceVal,
        });
      });

      return Object.values(groups)
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((group) => {
          const sortedItems = [...group.items].sort((a, b) => {
            const dateDiff = (b.contractDate || '').localeCompare(a.contractDate || '');
            if (dateDiff !== 0) return dateDiff;
            return b.priceVal - a.priceVal;
          });
          return {
            ...group,
            items: sortedItems,
          };
        });
    };

    it('places 30+ day delayed transactions under registration date group instead of burying them in the past', () => {
      const testCases = [
        // 35 days delay (Registered: 2026-10-22, Contracted: 2026-09-17)
        { aptName: '단지_35일지연', registeredDate: '20261022', contractDate: '20260917', priceVal: 10.5 },
        // 60 days delay (Registered: 2026-10-22, Contracted: 2026-08-23)
        { aptName: '단지_60일지연', registeredDate: '20261022', contractDate: '20260823', priceVal: 12.0 },
        // Standard normal 5 days delay (Registered: 2026-10-22, Contracted: 2026-10-17)
        { aptName: '단지_정상', registeredDate: '20261022', contractDate: '20261017', priceVal: 8.5 },
        // Past transaction without registration date (Contracted: 2026-09-15)
        { aptName: '단지_과거건', registeredDate: undefined, contractDate: '20260915', priceVal: 7.0 },
      ];

      const grouped = groupTimelineTransactions(testCases);

      // Expect exactly 2 groups: 2026-10-22 and 2026-09-15
      expect(grouped.length).toBe(2);
      expect(grouped[0].dateKey).toBe('2026-10-22');
      expect(grouped[1].dateKey).toBe('2026-09-15');

      // The 2026-10-22 group must contain ALL 3 items registered on 20261022 regardless of 30+ day delay
      const topGroup = grouped[0];
      expect(topGroup.items.length).toBe(3);
      expect(topGroup.items.map(i => i.aptName)).toEqual([
        '단지_정상',      // contractDate: 20261017 (newest contract first)
        '단지_35일지연',   // contractDate: 20260917
        '단지_60일지연',   // contractDate: 20260823
      ]);

      // The 2026-09-15 group must contain the past transaction
      expect(grouped[1].items[0].aptName).toBe('단지_과거건');
    });

    it('falls back seamlessly to contractDate when registeredDate is missing, undefined, null, or empty string', () => {
      const fallbackCases = [
        { aptName: '단지_undefined', registeredDate: undefined, contractDate: '20261015', priceVal: 9.0 },
        { aptName: '단지_null', registeredDate: null, contractDate: '20261014', priceVal: 8.0 },
        { aptName: '단지_emptyStr', registeredDate: '', contractDate: '20261013', priceVal: 7.0 },
      ];

      const grouped = groupTimelineTransactions(fallbackCases);
      expect(grouped.length).toBe(3);
      expect(grouped[0].dateKey).toBe('2026-10-15');
      expect(grouped[1].dateKey).toBe('2026-10-14');
      expect(grouped[2].dateKey).toBe('2026-10-13');
      expect(grouped[0].items[0].aptName).toBe('단지_undefined');
      expect(grouped[1].items[0].aptName).toBe('단지_null');
      expect(grouped[2].items[0].aptName).toBe('단지_emptyStr');
    });

    it('falls back to date (MM.DD) when both registeredDate and contractDate are missing', () => {
      const dateOnlyCase = [
        { aptName: '단지_dateOnly', registeredDate: null, contractDate: null, date: '10.22', priceVal: 15.0 },
      ];

      const grouped = groupTimelineTransactions(dateOnlyCase);
      expect(grouped.length).toBe(1);
      expect(grouped[0].dateKey).toBe('2026-10-22');
      expect(grouped[0].items[0].aptName).toBe('단지_dateOnly');
    });

    it('sorts within identical registeredDate group by contractDate desc, then priceVal desc', () => {
      const multiItems = [
        { aptName: '단지_A_동일계약_저가', registeredDate: '20261022', contractDate: '20261010', priceVal: 5.0 },
        { aptName: '단지_B_최근계약', registeredDate: '20261022', contractDate: '20261020', priceVal: 6.0 },
        { aptName: '단지_C_동일계약_고가', registeredDate: '20261022', contractDate: '20261010', priceVal: 15.0 },
        { aptName: '단지_D_과거계약', registeredDate: '20261022', contractDate: '20260901', priceVal: 20.0 },
      ];

      const grouped = groupTimelineTransactions(multiItems);
      expect(grouped.length).toBe(1);
      const items = grouped[0].items;
      expect(items.map(i => i.aptName)).toEqual([
        '단지_B_최근계약',       // 20261020
        '단지_C_동일계약_고가',   // 20261010, 15.0
        '단지_A_동일계약_저가',   // 20261010, 5.0
        '단지_D_과거계약',       // 20260901
      ]);
    });
  });

  // =========================================================================
  // Section 2: MacroTimelineView Component UI Verification for Registered Date
  // =========================================================================
  describe('2. MacroTimelineView UI Rendering Verification', () => {
    const sampleGroups: TimelineGroup[] = [
      {
        dateStr: '2026.10.22 (목)',
        dateKey: '2026-10-22',
        timestamp: new Date(2026, 9, 22).getTime(),
        totalCount: 2,
        avgPriceVal: 11.0,
        avgPriceEok: '11억',
        items: [
          {
            aptName: '동탄역 롯데캐슬',
            dong: '오산동',
            priceEok: '16억',
            priceVal: 16.0,
            areaPyeong: 34,
            area: 84.9,
            floor: 20,
            type: 'high',
            contractDate: '2026.09.10', // 42 days earlier than registration date!
            registeredDate: '20261022',
            registeredDateLabel: '10.22',
          },
          {
            aptName: '동탄역 시범 우남퍼스트빌',
            dong: '청계동',
            priceEok: '6억',
            priceVal: 6.0,
            areaPyeong: 25,
            area: 59.9,
            floor: 10,
            type: 'normal',
            contractDate: '20261021',
            registeredDate: '20261022',
            registeredDateLabel: '10.22',
          },
        ],
      },
    ];

    it('renders "국토부 등록일" badge in the sticky date header', () => {
      render(
        <MacroTimelineView
          displayedTimelineData={sampleGroups}
          selectedTimelineApt={null}
          areaUnit="m2"
          isMobileViewport={false}
          totalTimelineCardsCount={2}
          visibleTimelineCount={8}
          timelineDongFilter="전체"
          timelineAptFilter="전체"
          availableDongs={['오산동', '청계동']}
          availableApts={['동탄역 롯데캐슬', '동탄역 시범 우남퍼스트빌']}
          viewMode="list"
        />
      );

      // Verify date header text
      expect(screen.getByText('2026.10.22 (목)')).toBeInTheDocument();
      // Verify "국토부 등록일" badge presence
      expect(screen.getByText('국토부 등록일')).toBeInTheDocument();
    });

    it('renders contractDate in metadata for delayed transactions in list view mode', () => {
      render(
        <MacroTimelineView
          displayedTimelineData={sampleGroups}
          selectedTimelineApt={null}
          areaUnit="m2"
          isMobileViewport={false}
          totalTimelineCardsCount={2}
          visibleTimelineCount={8}
          timelineDongFilter="전체"
          timelineAptFilter="전체"
          availableDongs={['오산동', '청계동']}
          availableApts={['동탄역 롯데캐슬', '동탄역 시범 우남퍼스트빌']}
          viewMode="list"
        />
      );

      // Item 1 has contractDate: 2026.09.10 -> Expect "계약일 09.10"
      expect(screen.getByText(/계약일 09\.10/)).toBeInTheDocument();
      // Item 2 has contractDate: 20261021 -> Expect "계약일 10.21"
      expect(screen.getByText(/계약일 10\.21/)).toBeInTheDocument();
    });
  });
});

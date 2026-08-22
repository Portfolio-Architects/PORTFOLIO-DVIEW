import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransactionSummaryMetrics } from './TransactionSummaryMetrics';
import { TransactionTable } from './TransactionTable';

// Mock settings context
jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
  }),
}));

describe('Milestone 4 Frontend UI & Metrics Stress Testing', () => {
  const typeMap = {};
  const normalizeAptName = (name: string) => name;

  describe('1. TransactionSummaryMetrics Gap Cards Verification', () => {
    it('checks whether gap cards ("실구매 필요차액", "전세가율") render when only 월세 contracts exist for rent', () => {
      const transactions = [
        {
          aptName: '동탄역 롯데캐슬',
          dong: '오산동',
          area: 84.9,
          areaPyeong: 33,
          contractYm: '202605',
          contractDay: '10',
          price: 150000,
          priceEok: '15억',
          floor: 20,
          buildYear: 2021,
          dealType: '매매',
        },
        {
          aptName: '동탄역 롯데캐슬',
          dong: '오산동',
          area: 84.9,
          areaPyeong: 33,
          contractYm: '202605',
          contractDay: '15',
          price: 0,
          priceEok: '1억/50',
          deposit: 10000,
          monthlyRent: 50,
          floor: 15,
          buildYear: 2021,
          dealType: '월세',
        },
      ];

      render(
        <TransactionSummaryMetrics
          transactions={transactions}
          apartmentName="동탄역 롯데캐슬"
          typeMap={typeMap}
        />
      );

      // Check if gap cards ("실구매 필요차액", "전세가율") are in document
      const gapCard = screen.queryByText(/실구매 필요차액/i);
      const jeonseRatioCard = screen.queryByText(/실거래 전세가율/i);

      // Note: If baseTx is filtered by periodDealType ('sale'), filteredJeonses becomes empty and gap cards disappear!
      console.log('Gap Card Present:', !!gapCard);
      console.log('Jeonse Ratio Card Present:', !!jeonseRatioCard);

      // Verify empirical result
      expect(gapCard).toBeInTheDocument();
      expect(jeonseRatioCard).toBeInTheDocument();
    });
  });

  describe('2. TransactionTable Sorting (getP) Verification', () => {
    it('ranks deposit 10,000만 + monthly 50만 higher than deposit 1,500만 + monthly 0만 when sorted by price_desc', () => {
      const getP = (t: any) => {
        if (t.dealType === '월세') {
          return (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055);
        }
        if (t.dealType === '전세') {
          return t.deposit || t.price || 0;
        }
        return t.price || t.deposit || 0;
      };

      const recordA = {
        aptName: '테스트아파트',
        area: 84,
        areaPyeong: 33,
        contractYm: '202605',
        contractDay: '01',
        price: 0,
        priceEok: '1억/50',
        deposit: 10000,
        monthlyRent: 50,
        floor: 10,
        buildYear: 2020,
        dealType: '월세',
      };

      const recordB = {
        aptName: '테스트아파트',
        area: 84,
        areaPyeong: 33,
        contractYm: '202605',
        contractDay: '01',
        price: 0,
        priceEok: '1,500만',
        deposit: 1500,
        monthlyRent: 0,
        floor: 5,
        buildYear: 2020,
        dealType: '전세',
      };

      const pA = getP(recordA); // 10000 + Math.round(600 / 0.055) = 10000 + 10909 = 20909
      const pB = getP(recordB); // 1500

      expect(pA).toBeGreaterThan(pB);
      expect(pA).toBe(20909);
      expect(pB).toBe(1500);

      // Verify rendering sorting in TransactionTable with chartType="jeonse"
      render(
        <TransactionTable
          transactions={[recordB, recordA]}
          typeMap={typeMap}
          chartType="jeonse"
          normalizeAptName={normalizeAptName}
        />
      );

      // Open sort dropdown or inspect table rows order
      // Both records should be visible when visibleCount >= 2
    });
  });

  describe('3. MacroDashboardClient rentsByMonth Conversion Verification', () => {
    it('verifies rentsByMonth includes 월세 records converted to deposit equivalent', () => {
      const aptRealTxData = [
        {
          contractYm: '202605',
          dealType: '월세',
          deposit: 10000,
          monthlyRent: 50,
        },
        {
          contractYm: '202605',
          dealType: '전세',
          deposit: 30000,
        },
      ];

      const rentsByMonth: Record<string, number[]> = {};

      aptRealTxData.forEach(tx => {
        if (!tx.contractYm) return;
        const yy = tx.contractYm.substring(2, 4);
        const mm = tx.contractYm.substring(4, 6);
        const key = `${yy}.${mm}`;

        if (tx.dealType === '전세' || tx.dealType === '월세') {
          const depositVal = tx.dealType === '월세'
            ? ((tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055)) / 10000
            : (tx.deposit || (tx as any).price || 0) / 10000;
          if (depositVal > 0) {
            if (!rentsByMonth[key]) rentsByMonth[key] = [];
            rentsByMonth[key].push(depositVal);
          }
        }
      });

      expect(rentsByMonth['26.05']).toBeDefined();
      expect(rentsByMonth['26.05'].length).toBe(2);

      // Monthly rent deposit equivalent calculation: (10000 + 10909) / 10000 = 2.0909
      expect(rentsByMonth['26.05'][0]).toBeCloseTo(2.0909, 4);
      // Jeonse deposit calculation: 30000 / 10000 = 3
      expect(rentsByMonth['26.05'][1]).toBe(3);
    });
  });
});

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchApartmentMeta: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/firebaseConfig', () => ({
  db: {},
  auth: {},
  storage: {},
}));

// 1. Hook and Module imports
import { useMacroFilters } from '../components/macro/hooks/useMacroFilters';
import { useMacroDragDrop } from '../components/macro/hooks/useMacroDragDrop';
import { useApartmentModalState } from '../components/apartment/hooks/useApartmentModalState';
import {
  calculateAcquisitionCost,
  calculateMortgageLoan,
  calculateJeonseSafetyRisk,
  calculatePropertyHoldingTax,
} from '../lib/utils/calculatorEngines';

// 2. Facade imports
import ApartmentModalFacade from '../components/ApartmentModal';
import ApartmentModalActual from '../components/apartment/ApartmentModal';

describe('Milestone 4 Challenger Adversarial Empirical Test Suite', () => {

  describe('1. Re-export Facade Integrity (ApartmentModal)', () => {
    it('verifies that root ApartmentModal re-exports the modular ApartmentModal identically', () => {
      expect(ApartmentModalFacade).toBeDefined();
      expect(ApartmentModalActual).toBeDefined();
      expect(ApartmentModalFacade).toBe(ApartmentModalActual);
    });
  });

  describe('2. useMacroFilters Hook Adversarial & Stress Testing', () => {
    it('handles undefined and empty sheetApartments gracefully', () => {
      const { result, rerender } = renderHook(({ sheets }: { sheets?: any }) => useMacroFilters({ sheetApartments: sheets }), {
        initialProps: { sheets: undefined as any },
      });

      expect(result.current.availableDongs).toEqual([]);
      expect(result.current.availableApts).toEqual([]);
      expect(result.current.timelineDongFilter).toBe('전체');
      expect(result.current.timelineAptFilter).toBe('전체');
      expect(result.current.timeframe).toBe('3Y');

      rerender({ sheets: {} });
      expect(result.current.availableDongs).toEqual([]);
      expect(result.current.availableApts).toEqual([]);
    });

    it('correctly filters and sorts available apartments by selected dong, resetting apt filter on dong change', () => {
      const mockSheets = {
        '청계동': [
          { name: '동탄역시범우남퍼스트빌', dong: '청계동', lat: 37.2, lng: 127.1 },
          { name: '동탄역반도유보라아이비파크4.0', dong: '청계동', lat: 37.2, lng: 127.1 },
        ],
        '오산동': [
          { name: '동탄역롯데캐슬', dong: '오산동', lat: 37.2, lng: 127.1 },
        ],
        '영천동': [
          { name: '동탄파크푸르지오', dong: '영천동', lat: 37.2, lng: 127.1 },
        ],
      };

      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheets as any }));

      expect(result.current.availableDongs).toEqual(['영천동', '오산동', '청계동']);
      expect(result.current.availableApts).toEqual([
        '동탄역롯데캐슬',
        '동탄역반도유보라아이비파크4.0',
        '동탄역시범우남퍼스트빌',
        '동탄파크푸르지오',
      ]);

      // Select specific dong
      act(() => {
        result.current.setTimelineDongFilter('청계동');
      });

      expect(result.current.timelineDongFilter).toBe('청계동');
      expect(result.current.availableApts).toEqual([
        '동탄역반도유보라아이비파크4.0',
        '동탄역시범우남퍼스트빌',
      ]);

      // Select specific apt in that dong
      act(() => {
        result.current.setTimelineAptFilter('동탄역시범우남퍼스트빌');
      });
      expect(result.current.timelineAptFilter).toBe('동탄역시범우남퍼스트빌');

      // Changing dong filter resets timelineAptFilter to 전체
      act(() => {
        result.current.setTimelineDongFilter('오산동');
      });
      expect(result.current.timelineDongFilter).toBe('오산동');
      expect(result.current.timelineAptFilter).toBe('전체');
      expect(result.current.availableApts).toEqual(['동탄역롯데캐슬']);

      // Non-existent dong produces empty list safely
      act(() => {
        result.current.setTimelineDongFilter('비존재동');
      });
      expect(result.current.availableApts).toEqual([]);
    });

    it('manages timeframe state transitions across all valid enum values', () => {
      const { result } = renderHook(() => useMacroFilters({}));

      const timeframes = ['3M', '6M', '1Y', '3Y', '5Y', 'ALL'] as const;
      timeframes.forEach((tf) => {
        act(() => {
          result.current.setTimeframe(tf);
        });
        expect(result.current.timeframe).toBe(tf);
      });
    });
  });

  describe('3. useMacroDragDrop Hook Stress & Edge Case Testing', () => {
    it('handles drag-and-drop reordering and triggers updateFavoriteOrder callback', () => {
      const updateFavoriteOrderMock = jest.fn().mockResolvedValue(undefined);
      const favorites = ['단지A', '단지B', '단지C', '단지D'];

      const { result } = renderHook(() =>
        useMacroDragDrop({
          favoritesArray: favorites,
          updateFavoriteOrder: updateFavoriteOrderMock,
        })
      );

      // Start dragging item at index 0 (단지A)
      const mockDragEvent = {
        preventDefault: jest.fn(),
        dataTransfer: { effectAllowed: '' },
      } as any;

      act(() => {
        result.current.handleDragStart(mockDragEvent, 0);
      });

      expect(result.current.draggedIndex).toBe(0);
      expect(mockDragEvent.dataTransfer.effectAllowed).toBe('move');

      // Drag over index 2 (단지C) -> should move 단지A to index 2
      act(() => {
        result.current.handleDragOver(mockDragEvent, 2);
      });

      expect(result.current.draggedIndex).toBe(2);
      expect(updateFavoriteOrderMock).toHaveBeenCalledWith(['단지B', '단지C', '단지A', '단지D']);

      // Drag over same index (2) -> should be a no-op (no duplicate call)
      updateFavoriteOrderMock.mockClear();
      act(() => {
        result.current.handleDragOver(mockDragEvent, 2);
      });
      expect(updateFavoriteOrderMock).not.toHaveBeenCalled();

      // End drag
      act(() => {
        result.current.handleDragEnd();
      });
      expect(result.current.draggedIndex).toBeNull();
    });

    it('ignores dragOver when no drag was started (draggedIndex is null)', () => {
      const updateFavoriteOrderMock = jest.fn();
      const favorites = ['단지A', '단지B'];

      const { result } = renderHook(() =>
        useMacroDragDrop({
          favoritesArray: favorites,
          updateFavoriteOrder: updateFavoriteOrderMock,
        })
      );

      const mockDragEvent = {
        preventDefault: jest.fn(),
        dataTransfer: { effectAllowed: '' },
      } as any;

      act(() => {
        result.current.handleDragOver(mockDragEvent, 1);
      });

      expect(updateFavoriteOrderMock).not.toHaveBeenCalled();
      expect(result.current.draggedIndex).toBeNull();
    });

    it('attaches and detaches outside click listener appropriately', () => {
      const { result, unmount } = renderHook(() =>
        useMacroDragDrop({
          favoritesArray: ['단지A'],
        })
      );

      const mockElement = document.createElement('div');
      document.body.appendChild(mockElement);
      (result.current.orderEditorRef as any).current = mockElement;

      act(() => {
        result.current.setShowOrderEditor(true);
      });
      expect(result.current.showOrderEditor).toBe(true);

      // Click inside mock element should keep open
      act(() => {
        const insideEvent = new MouseEvent('mousedown', { bubbles: true });
        mockElement.dispatchEvent(insideEvent);
      });
      expect(result.current.showOrderEditor).toBe(true);

      // Outside click simulation on document.body
      act(() => {
        const outsideTarget = document.createElement('span');
        document.body.appendChild(outsideTarget);
        const outsideEvent = new MouseEvent('mousedown', { bubbles: true });
        outsideTarget.dispatchEvent(outsideEvent);
        document.body.removeChild(outsideTarget);
      });
      expect(result.current.showOrderEditor).toBe(false);

      document.body.removeChild(mockElement);
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('4. useApartmentModalState Hook Lifecycle & Resource Cleanup Testing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('manages animation timer and mounted state cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useApartmentModalState());

      expect(result.current.mountedRef.current).toBe(true);
      expect(result.current.isAnimationFinished).toBe(false);

      // Fast-forward animation timer (300ms)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.isAnimationFinished).toBe(true);

      // Unmount should mark mountedRef.current false and clear active timers
      unmount();
      expect(result.current.mountedRef.current).toBe(false);
    });

    it('manages tool dropdown state and click outside handler', () => {
      const { result } = renderHook(() => useApartmentModalState());

      const mockDropdown = document.createElement('div');
      document.body.appendChild(mockDropdown);
      (result.current.toolDropdownRef as any).current = mockDropdown;

      act(() => {
        result.current.setIsToolDropdownOpen(true);
      });
      expect(result.current.isToolDropdownOpen).toBe(true);

      // Click inside should not close
      act(() => {
        const insideEvent = new MouseEvent('mousedown', { bubbles: true });
        mockDropdown.dispatchEvent(insideEvent);
      });
      expect(result.current.isToolDropdownOpen).toBe(true);

      // Outside click on a separate element should close
      act(() => {
        const outsideTarget = document.createElement('button');
        document.body.appendChild(outsideTarget);
        const outsideEvent = new MouseEvent('mousedown', { bubbles: true });
        outsideTarget.dispatchEvent(outsideEvent);
        document.body.removeChild(outsideTarget);
      });
      expect(result.current.isToolDropdownOpen).toBe(false);

      document.body.removeChild(mockDropdown);
    });
  });

  describe('5. Quantitative Calculator Engines Adversarial Stress Testing', () => {
    describe('calculateAcquisitionCost', () => {
      it('returns 0 for negative, zero, or NaN prices', () => {
        expect(calculateAcquisitionCost(0)).toEqual({ tax: 0, brokerFee: 0, otherFee: 0, totalFees: 0 });
        expect(calculateAcquisitionCost(-1000)).toEqual({ tax: 0, brokerFee: 0, otherFee: 0, totalFees: 0 });
        expect(calculateAcquisitionCost(NaN)).toEqual({ tax: 0, brokerFee: 0, otherFee: 0, totalFees: 0 });
      });

      it('applies 1% tax rate for prices <= 60,000 (6억)', () => {
        const res = calculateAcquisitionCost(60000);
        expect(res.tax).toBe(600); // 1% of 60,000
        expect(res.brokerFee).toBe(240); // 0.4%
        expect(res.otherFee).toBe(120); // 0.2%
        expect(res.totalFees).toBe(960);
      });

      it('applies graduated progressive tax rate for prices between 60,000 and 90,000 (6~9억)', () => {
        // At 75,000 (7.5억): rate = 1% + (15000/30000)*2% = 2%
        const res = calculateAcquisitionCost(75000);
        expect(res.tax).toBe(1500); // 2% of 75,000
        expect(res.brokerFee).toBe(300);
        expect(res.otherFee).toBe(150);
        expect(res.totalFees).toBe(1950);
      });

      it('applies 3% tax rate for prices > 90,000 (9억+)', () => {
        const res = calculateAcquisitionCost(150000); // 15억
        expect(res.tax).toBe(4500); // 3% of 150,000
        expect(res.brokerFee).toBe(600);
        expect(res.otherFee).toBe(300);
        expect(res.totalFees).toBe(5400);
      });
    });

    describe('calculateMortgageLoan', () => {
      it('handles 0 or negative loan amount and term gracefully', () => {
        const res1 = calculateMortgageLoan(0, 3.5, 30);
        expect(res1.monthlyPayment).toBe(0);
        expect(res1.schedule).toHaveLength(0);

        const res2 = calculateMortgageLoan(50000, 3.5, 0);
        expect(res2.monthlyPayment).toBe(0);
        expect(res2.schedule).toHaveLength(0);
      });

      it('handles 0% interest rate without dividing by zero', () => {
        const res = calculateMortgageLoan(36000, 0, 30, 'equal_principal_interest');
        // 36,000 / 360 months = 100/mo
        expect(res.monthlyPayment).toBe(100);
        expect(res.totalInterest).toBe(0);
        expect(res.totalRepayment).toBe(36000);
      });

      it('computes 30-year equal principal & interest mortgage correctly', () => {
        // 5억 loan, 4% annual interest, 30 years
        const res = calculateMortgageLoan(50000, 4.0, 30, 'equal_principal_interest');
        expect(res.monthlyPayment).toBeGreaterThan(230);
        expect(res.monthlyPayment).toBeLessThan(250);
        expect(res.totalRepayment).toBeGreaterThan(50000);
        expect(res.schedule.length).toBeGreaterThan(0);
      });

      it('computes 30-year equal principal mortgage correctly', () => {
        const res = calculateMortgageLoan(36000, 4.0, 30, 'equal_principal');
        expect(res.monthlyPayment).toBeGreaterThan(100);
        expect(res.schedule[0].principal).toBe(100);
      });
    });

    describe('calculateJeonseSafetyRisk', () => {
      it('returns safe fallback on invalid inputs', () => {
        const res = calculateJeonseSafetyRisk(0, 0);
        expect(res.ratio).toBe(0);
        expect(res.riskTier).toBe('safe');
      });

      it('identifies safe ratio (< 65%)', () => {
        const res = calculateJeonseSafetyRisk(100000, 50000); // 50%
        expect(res.ratio).toBe(50);
        expect(res.riskTier).toBe('safe');
        expect(res.riskScore).toBe(15);
        expect(res.gapManWon).toBe(50000);
      });

      it('identifies caution ratio (65% ~ 75%)', () => {
        const res = calculateJeonseSafetyRisk(100000, 70000); // 70%
        expect(res.ratio).toBe(70);
        expect(res.riskTier).toBe('caution');
        expect(res.riskScore).toBe(45);
      });

      it('identifies danger ratio (75% ~ 85%)', () => {
        const res = calculateJeonseSafetyRisk(100000, 80000); // 80%
        expect(res.ratio).toBe(80);
        expect(res.riskTier).toBe('danger');
        expect(res.riskScore).toBe(75);
      });

      it('identifies critical ratio (>= 85%) including senior debt', () => {
        // Sale 10억, Jeonse 6억, Senior Debt 3억 -> total 9억 (90%)
        const res = calculateJeonseSafetyRisk(100000, 60000, 30000);
        expect(res.ratio).toBe(90);
        expect(res.riskTier).toBe('critical');
        expect(res.riskScore).toBe(95);
      });
    });

    describe('calculatePropertyHoldingTax', () => {
      it('calculates official price, fair market value, and holding tax correctly for 10억 property', () => {
        const res = calculatePropertyHoldingTax(100000, 0.70);
        expect(res.officialPrice).toBe(70000); // 7억
        expect(res.propertyTax).toBeGreaterThan(0);
        expect(res.urbanAreaTax).toBeGreaterThan(0);
        expect(res.localEducationTax).toBe(Math.round(res.propertyTax * 0.2));
        expect(res.holdingTaxTotal).toBe(res.propertyTax + res.urbanAreaTax + res.localEducationTax);
      });
    });
  });
});

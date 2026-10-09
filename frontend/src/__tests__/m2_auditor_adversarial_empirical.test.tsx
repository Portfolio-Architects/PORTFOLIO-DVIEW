/**
 * @file m2_auditor_adversarial_empirical.test.tsx
 * @description Forensic Auditor Independent Stress & Anticheat Suite
 * Target:
 *   - R1: ApartmentChapterNavBar (8 discrete chapters, IntersectionObserver scroll spy, manual scroll guard)
 *   - R2: ApartmentModal 8-chapter DOM architecture & in-feed AdSlot 1000000002 bounding box
 *   - R3: adRefreshManager deterministic dwell time (>= 30s) & intersection ratio (>= 50%)
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AdRefreshManager,
  adRefreshManager,
  DWELL_TIME_THRESHOLD_MS,
  MIN_INTERSECTION_RATIO,
} from '@/lib/ads/adRefreshManager';
import {
  ApartmentChapterNavBar,
  APARTMENT_CHAPTERS,
} from '@/components/apartment/ApartmentChapterNavBar';
import { AdSlot, getAdSlotMinHeightClass } from '@/components/ads/AdSlot';

describe('Auditor 2.1 Forensic Adversarial Empirical Suite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    adRefreshManager.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =========================================================================
  // Dimension 1: adRefreshManager Adversarial Edge Cases
  // =========================================================================
  describe('Dimension 1: adRefreshManager Adversarial Edge Cases', () => {
    it('rejects negative or backwards timestamp (system clock regression)', () => {
      const slotId = 'adv_slot_clock_skew';
      const initialTime = 1000000;
      jest.setSystemTime(initialTime);

      adRefreshManager.registerSlot(slotId, 0.8);
      // Clock skew backwards in time
      const skewedTime = initialTime - 50000;
      expect(adRefreshManager.canRefresh(slotId, skewedTime)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId, skewedTime)).toBe(false);
    });

    it('sanitizes extreme and non-finite intersection ratios (NaN, Infinity, -Infinity, negative)', () => {
      const slotId = 'adv_slot_ratio_sanitize';
      adRefreshManager.registerSlot(slotId, 1.0);

      // NaN ratio -> clamped to 0
      adRefreshManager.updateIntersection(slotId, NaN);
      expect(adRefreshManager.getSlot(slotId)?.intersectionRatio).toBe(0);

      // Infinity ratio -> clamped to 0
      adRefreshManager.updateIntersection(slotId, Infinity);
      expect(adRefreshManager.getSlot(slotId)?.intersectionRatio).toBe(0);

      // -Infinity ratio -> clamped to 0
      adRefreshManager.updateIntersection(slotId, -Infinity);
      expect(adRefreshManager.getSlot(slotId)?.intersectionRatio).toBe(0);

      // Negative ratio -> clamped to 0
      adRefreshManager.updateIntersection(slotId, -0.99);
      expect(adRefreshManager.getSlot(slotId)?.intersectionRatio).toBe(0);

      // Ratio > 1.0 -> clamped to 1.0
      adRefreshManager.updateIntersection(slotId, 2.5);
      expect(adRefreshManager.getSlot(slotId)?.intersectionRatio).toBe(1.0);
    });

    it('isolates callback failures during bulk onTabSwitch so other slots still refresh', () => {
      const slotGood1 = 'slot_good_1';
      const slotBuggy = 'slot_buggy';
      const slotGood2 = 'slot_good_2';

      const goodMock1 = jest.fn();
      const goodMock2 = jest.fn();
      const buggyMock = jest.fn().mockImplementation(() => {
        throw new Error('Exploding callback');
      });

      adRefreshManager.registerSlot(slotGood1, 0.9, goodMock1);
      adRefreshManager.registerSlot(slotBuggy, 0.9, buggyMock);
      adRefreshManager.registerSlot(slotGood2, 0.9, goodMock2);

      jest.advanceTimersByTime(30000);

      const result = adRefreshManager.onTabSwitch();

      // All three were eligible: slotGood1, slotBuggy (error trapped), slotGood2
      expect(result.refreshed).toContain(slotGood1);
      expect(result.refreshed).toContain(slotBuggy);
      expect(result.refreshed).toContain(slotGood2);
      expect(goodMock1).toHaveBeenCalledWith(1);
      expect(goodMock2).toHaveBeenCalledWith(1);
    });

    it('verifies non-existent slotId operations return safe defaults without exception', () => {
      expect(adRefreshManager.canRefresh('ghost_slot')).toBe(false);
      expect(adRefreshManager.triggerRefresh('ghost_slot')).toBe(false);
      expect(adRefreshManager.getSlot('ghost_slot')).toBeUndefined();
      expect(() => adRefreshManager.updateIntersection('ghost_slot', 0.8)).not.toThrow();
      expect(() => adRefreshManager.unregisterSlot('ghost_slot')).not.toThrow();
    });

    it('handles high volume slot registration and unregistration without memory leak', () => {
      const manager = new AdRefreshManager();
      const N = 1000;
      for (let i = 0; i < N; i++) {
        manager.registerSlot(`slot_${i}`, 0.6);
      }
      expect(manager.getRegisteredSlotIds()).toHaveLength(N);

      for (let i = 0; i < N; i++) {
        manager.unregisterSlot(`slot_${i}`);
      }
      expect(manager.getRegisteredSlotIds()).toHaveLength(0);
    });
  });

  // =========================================================================
  // Dimension 2: ApartmentChapterNavBar Adversarial Boundary Cases
  // =========================================================================
  describe('Dimension 2: ApartmentChapterNavBar Boundary Invariants', () => {
    it('handles missing or unmapped activeChapter gracefully without breaking DOM', () => {
      const onSelectMock = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="non_existent_chapter_id"
          onSelectChapter={onSelectMock}
        />
      );

      // No button should have aria-current="page"
      const activeBtns = container.querySelectorAll('button[aria-current="page"]');
      expect(activeBtns).toHaveLength(0);

      // Pill indicator should not be rendered
      expect(screen.queryByTestId('active-chapter-pill')).toBeNull();
    });

    it('handles rapid sequential clicking without throwing or missing selection callbacks', () => {
      const onSelectMock = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectMock}
        />
      );

      const buttons = container.querySelectorAll('button[data-chapter-id]');
      expect(buttons.length).toBe(8);

      // Click all 8 buttons rapidly
      buttons.forEach((btn) => {
        fireEvent.click(btn);
      });

      expect(onSelectMock).toHaveBeenCalledTimes(8);
      expect(onSelectMock).toHaveBeenNthCalledWith(1, 'chapter-01-overview');
      expect(onSelectMock).toHaveBeenNthCalledWith(8, 'chapter-08-report');
    });

    it('ignores disconnected scrollContainerRef without runtime error', () => {
      const disconnectedDiv = document.createElement('div');
      const ref = { current: disconnectedDiv };

      expect(() => {
        render(
          <ApartmentChapterNavBar
            activeChapter="chapter-02-volume"
            onSelectChapter={jest.fn()}
            scrollContainerRef={ref}
          />
        );
      }).not.toThrow();
    });
  });

  // =========================================================================
  // Dimension 3: AdSlot MinHeight and RefreshKey Boundary Invariants
  // =========================================================================
  describe('Dimension 3: AdSlot MinHeight and RefreshKey Invariants', () => {
    it('verifies getAdSlotMinHeightClass contracts across all standard formats', () => {
      expect(getAdSlotMinHeightClass('in-feed')).toBe('min-h-[140px] sm:min-h-[160px]');
      expect(getAdSlotMinHeightClass('banner')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('rectangle')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('horizontal-strip')).toBe('min-h-[90px] sm:min-h-[100px]');
      expect(getAdSlotMinHeightClass('auto')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass(undefined)).toBe('min-h-[250px]');
    });

    it('applies custom minHeightClass prop override with priority over default format class', () => {
      const customClass = 'min-h-[180px] sm:min-h-[220px] md:min-h-[250px]';
      const { container } = render(
        <AdSlot
          format="in-feed"
          minHeightClass={customClass}
          testMode={true}
        />
      );

      const slotContainer = container.querySelector('[data-testid="ad-slot-container"]');
      expect(slotContainer).toHaveClass('min-h-[180px]');
      expect(slotContainer).toHaveClass('sm:min-h-[220px]');
      expect(slotContainer).toHaveClass('md:min-h-[250px]');
    });

    it('updates data-refresh-key attribute when refreshKey increments', () => {
      const { container, rerender } = render(
        <AdSlot
          format="in-feed"
          refreshKey={0}
          testMode={true}
        />
      );

      expect(container.querySelector('[data-testid="ad-slot-container"]')).toHaveAttribute('data-refresh-key', '0');

      rerender(
        <AdSlot
          format="in-feed"
          refreshKey={1}
          testMode={true}
        />
      );

      expect(container.querySelector('[data-testid="ad-slot-container"]')).toHaveAttribute('data-refresh-key', '1');
    });
  });
});

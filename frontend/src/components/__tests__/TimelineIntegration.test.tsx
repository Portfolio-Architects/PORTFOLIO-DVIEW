import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoading: false, handleLogin: jest.fn() }),
}));

jest.mock('@/hooks/useStaticData', () => ({
  useLocationScores: () => ({ locationScores: {} }),
}));

import {
  TimelineItemCard,
  TimelineItemRow,
  TimelineItem,
  formatEokWithUnit,
  formatDeltaPrice,
} from '../MacroDashboardClient';

describe('Milestone 3 Integration Tests: TimelineItemCard & TimelineItemRow', () => {
  const sampleCardItem: TimelineItem = {
    aptName: '동탄역 롯데캐슬',
    displayAptName: '동탄역 롯데캐슬',
    dong: '오산동',
    priceEok: '16억 5,000만',
    priceVal: 16.5,
    areaPyeong: 34,
    area: 84.9,
    floor: 25,
    type: 'high',
    delta: 1.5,
    deltaPercent: 10.0,
    prevPriceVal: 15.0,
    areaLabelM2: '84A㎡',
    areaLabelPyeong: '34평',
  };

  const sampleFallingItem: TimelineItem = {
    aptName: '동탄역 시범 더샵 센트럴시티',
    displayAptName: '동탄역 시범 더샵 센트럴시티',
    dong: '청계동',
    priceEok: '12억',
    priceVal: 12.0,
    areaPyeong: 34,
    area: 84.5,
    floor: 10,
    type: 'normal',
    delta: -0.8,
    deltaPercent: -6.25,
    prevPriceVal: 12.8,
  };

  describe('1. TimelineItemCard Interactive Features', () => {
    it('renders favorite heart button and calls onToggleFavorite with stopPropagation', () => {
      const onToggleFavoriteMock = jest.fn();
      const onCardClickMock = jest.fn();
      const onCardHoverMock = jest.fn();
      const onDetailsClickMock = jest.fn();
      const onDetailsHoverMock = jest.fn();

      const { rerender } = render(
        <TimelineItemCard
          item={sampleCardItem}
          isSelected={false}
          areaUnit="m2"
          isFavorite={false}
          onToggleFavorite={onToggleFavoriteMock}
          onCardHover={onCardHoverMock}
          onCardClick={onCardClickMock}
          onDetailsClick={onDetailsClickMock}
          onDetailsHover={onDetailsHoverMock}
        />
      );

      const favButton = screen.getByLabelText(/동탄역 롯데캐슬 관심 단지 등록/);
      expect(favButton).toBeInTheDocument();

      // Click favorite button
      fireEvent.click(favButton);
      expect(onToggleFavoriteMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
      // Card click should not be triggered due to stopPropagation
      expect(onCardClickMock).not.toHaveBeenCalled();

      // Re-render as active favorite
      rerender(
        <TimelineItemCard
          item={sampleCardItem}
          isSelected={false}
          areaUnit="m2"
          isFavorite={true}
          onToggleFavorite={onToggleFavoriteMock}
          onCardHover={onCardHoverMock}
          onCardClick={onCardClickMock}
          onDetailsClick={onDetailsClickMock}
          onDetailsHover={onDetailsHoverMock}
        />
      );

      const heartSvg = favButton.querySelector('svg');
      expect(heartSvg).toHaveClass('fill-rose-500');
    });

    it('renders Price per Pyeong and previous price strikethrough correctly', () => {
      render(
        <TimelineItemCard
          item={sampleCardItem}
          isSelected={false}
          areaUnit="m2"
          onCardHover={jest.fn()}
          onCardClick={jest.fn()}
          onDetailsClick={jest.fn()}
          onDetailsHover={jest.fn()}
        />
      );

      // Price per pyeong: (16.5 * 10000) / 34 = 4853 -> 평당 4,853만
      expect(screen.getByText(/평당 4,853만/)).toBeInTheDocument();

      // Previous price strikethrough: 15억
      expect(screen.getByText('15억')).toBeInTheDocument();
    });

    it('renders "상세" button and triggers onDetailsClick without triggering onCardClick', () => {
      const onCardClickMock = jest.fn();
      const onDetailsClickMock = jest.fn();
      const onDetailsHoverMock = jest.fn();

      render(
        <TimelineItemCard
          item={sampleCardItem}
          isSelected={false}
          areaUnit="m2"
          onCardHover={jest.fn()}
          onCardClick={onCardClickMock}
          onDetailsClick={onDetailsClickMock}
          onDetailsHover={onDetailsHoverMock}
        />
      );

      const detailsBtn = screen.getByText('상세');
      fireEvent.mouseEnter(detailsBtn);
      expect(onDetailsHoverMock).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');

      fireEvent.click(detailsBtn);
      expect(onDetailsClickMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
      expect(onCardClickMock).not.toHaveBeenCalled();
    });
  });

  describe('2. TimelineItemRow Compact List View Features', () => {
    it('renders compact row with favorite, apt name, area/floor, price, delta and detail button', () => {
      const onToggleFavoriteMock = jest.fn();
      const onCardClickMock = jest.fn();
      const onDetailsClickMock = jest.fn();

      render(
        <TimelineItemRow
          item={sampleFallingItem}
          isSelected={true}
          areaUnit="p"
          isFavorite={true}
          onToggleFavorite={onToggleFavoriteMock}
          onCardClick={onCardClickMock}
          onDetailsClick={onDetailsClickMock}
        />
      );

      const row = screen.getByTestId('timeline-row-동탄역 시범 더샵 센트럴시티');
      expect(row).toBeInTheDocument();
      expect(row).toHaveClass('bg-orange-50/20');

      // Apt name and dong/floor/area
      expect(screen.getByText('동탄역 시범 더샵 센트럴시티')).toBeInTheDocument();
      expect(screen.getByText(/청계동 · 10층 · 34평/)).toBeInTheDocument();

      // Price & delta
      expect(screen.getByText('12억')).toBeInTheDocument();
      expect(screen.getByText(/▼ 8,000만/)).toBeInTheDocument();

      // Favorite toggle
      const favBtn = screen.getByLabelText(/동탄역 시범 더샵 센트럴시티 관심 단지 등록/);
      fireEvent.click(favBtn);
      expect(onToggleFavoriteMock).toHaveBeenCalledWith('동탄역 시범 더샵 센트럴시티');
      expect(onCardClickMock).not.toHaveBeenCalled();

      // Details button
      const detailsBtn = screen.getByText('상세');
      fireEvent.click(detailsBtn);
      expect(onDetailsClickMock).toHaveBeenCalledWith('동탄역 시범 더샵 센트럴시티');
      expect(onCardClickMock).not.toHaveBeenCalled();

      // Card body click
      const cardBodyBtn = screen.getByLabelText(/실거래 분석 아파트 선택: 동탄역 시범 더샵 센트럴시티/);
      fireEvent.click(cardBodyBtn);
      expect(onCardClickMock).toHaveBeenCalledWith('동탄역 시범 더샵 센트럴시티');
    });
  });

  describe('3. Formatting Utilities', () => {
    it('formatEokWithUnit formats values correctly', () => {
      expect(formatEokWithUnit(165000)).toEqual({ value: '16억 5,000', unit: '만원' });
      expect(formatEokWithUnit(100000)).toEqual({ value: '10억', unit: '원' });
      expect(formatEokWithUnit(8000)).toEqual({ value: '8,000', unit: '만원' });
    });

    it('formatDeltaPrice formats delta values correctly', () => {
      expect(formatDeltaPrice(1.5)).toBe('1억 5,000만');
      expect(formatDeltaPrice(0.05)).toBe('500만');
      expect(formatDeltaPrice(2.0)).toBe('2억');
    });
  });
});

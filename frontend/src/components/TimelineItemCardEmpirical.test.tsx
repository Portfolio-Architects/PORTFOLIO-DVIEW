import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

describe('TimelineItemCard Empirical Stress & Edge Case Test Suite', () => {
  const clientPath = path.resolve(__dirname, 'MacroDashboardClient.tsx');
  const tempPath = path.resolve(__dirname, 'TimelineItemCardEmpiricalTemp.tsx');

  beforeAll(() => {
    const content = fs.readFileSync(clientPath, 'utf8');

    // Extract formatEokWithUnit
    const formatEokMatch = content.match(/export const formatEokWithUnit = [\s\S]+?\n};/);
    if (!formatEokMatch) throw new Error('Failed to find formatEokWithUnit');

    // Extract formatDeltaPrice
    const formatDeltaMatch = content.match(/export const formatDeltaPrice = [\s\S]+?\n};/);
    if (!formatDeltaMatch) throw new Error('Failed to find formatDeltaPrice');

    // Extract TimelineItemCardProps & TimelineItemCard
    const cardInterfaceMatch = content.match(/interface TimelineItemCardProps {[\s\S]+?\n}/);
    if (!cardInterfaceMatch) throw new Error('Failed to find TimelineItemCardProps');

    const cardComponentMatch = content.match(/const TimelineItemCard = React\.memo\([\s\S]+?\n\}\);/);
    if (!cardComponentMatch) throw new Error('Failed to find TimelineItemCard component');

    const tempFileContent = `
import React from 'react';
import { TimelineItem } from './MacroDashboardClient';

${formatEokMatch[0]}
${formatDeltaMatch[0]}
${cardInterfaceMatch[0]}
${cardComponentMatch[0]}

export { TimelineItemCard, TimelineItemCardProps };
`;
    fs.writeFileSync(tempPath, tempFileContent, 'utf8');
  });

  afterAll(() => {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  });

  const getComponent = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./TimelineItemCardEmpiricalTemp').TimelineItemCard;
  };

  const defaultProps = {
    isSelected: false,
    areaUnit: 'm2',
    onCardHover: jest.fn(),
    onCardClick: jest.fn(),
    onDetailsClick: jest.fn(),
    onDetailsHover: jest.fn(),
  };

  it('renders standard normal item correctly in m2 unit', () => {
    const TimelineItemCard = getComponent();
    const item = {
      aptName: '동탄역 롯데캐슬',
      dong: '오산동',
      priceEok: '15억 5,000만',
      priceVal: 15.5,
      areaPyeong: 34,
      area: 84.9,
      floor: 15,
      type: 'normal',
      delta: 0.5,
      prevPriceVal: 15.0,
      areaLabelM2: '84A㎡',
      areaLabelPyeong: '34평형',
    };

    render(<TimelineItemCard {...defaultProps} item={item} />);

    expect(screen.getByText('동탄역 롯데캐슬')).toBeDefined();
    expect(screen.getByText('오산동')).toBeDefined();
    expect(screen.getByText('84A㎡')).toBeDefined();
    expect(screen.getByText('15층')).toBeDefined();
  });

  it('handles areaUnit = pyeong and missing area labels', () => {
    const TimelineItemCard = getComponent();
    const item = {
      aptName: '시범다은삼성래미안',
      dong: '반송동',
      priceEok: '7억 2,000만',
      priceVal: 7.2,
      areaPyeong: 25.4,
      area: 59.8,
      floor: 8,
      type: 'normal',
      delta: -0.2,
    };

    render(<TimelineItemCard {...defaultProps} areaUnit="p" item={item} />);

    // areaLabelPyeong is undefined, should fallback to Math.round(areaPyeong) + '평' -> '25평'
    expect(screen.getByText('25평')).toBeDefined();
  });

  it('renders 신고가 badge for item.type === "high"', () => {
    const TimelineItemCard = getComponent();
    const item = {
      aptName: '신고가 단지',
      dong: '청계동',
      priceEok: '20억',
      priceVal: 20.0,
      areaPyeong: 42,
      area: 102,
      floor: 25,
      type: 'high',
      delta: 2.0,
      prevPriceVal: 18.0,
    };

    render(<TimelineItemCard {...defaultProps} item={item} />);
    expect(screen.getByText('신고가')).toBeDefined();
  });

  it('EMPIRICAL BUG TEST: Mobile price regex drops precision for sub-1000만 amounts (e.g. 500만)', () => {
    const TimelineItemCard = getComponent();
    const item = {
      aptName: '정밀도 테스트 단지',
      dong: '영천동',
      priceEok: '15억 500만',
      priceVal: 15.05,
      areaPyeong: 34,
      area: 84,
      floor: 10,
      type: 'normal',
      delta: 0.05,
    };

    const { container } = render(<TimelineItemCard {...defaultProps} item={item} />);
    
    // Target price elements
    const priceSpans = container.querySelectorAll('.text-\\[12\\.5px\\], .text-\\[13px\\], .text-\\[14\\.5px\\]');
    const mobilePrice = priceSpans[0]?.querySelector('.inline.sm\\:hidden')?.textContent;
    const desktopPrice = priceSpans[0]?.querySelector('.hidden.sm\\:inline')?.textContent;

    // Expectation check: 15억 500만 on mobile becomes '15.05억'
    expect(desktopPrice).toBe('15억 500만');
    expect(mobilePrice).toBe('15.05억');
  });

  it('EMPIRICAL BUG TEST: Mobile delta regex preserves precision for sub-1000만 eok deltas (e.g. 1.05억)', () => {
    const TimelineItemCard = getComponent();
    const item = {
      aptName: '델타 정밀도 단지',
      dong: '청계동',
      priceEok: '16억 500만',
      priceVal: 16.05,
      areaPyeong: 34,
      area: 84,
      floor: 12,
      type: 'normal',
      delta: 1.05, // 1억 500만원 상승
      prevPriceVal: 15.0,
    };

    const { container } = render(<TimelineItemCard {...defaultProps} item={item} />);
    
    // Target delta badge element
    const deltaBadgeSpans = container.querySelectorAll('span.font-black.px-1');
    const mobileDelta = deltaBadgeSpans[0]?.querySelector('.inline.sm\\:hidden')?.textContent;
    const desktopDelta = deltaBadgeSpans[0]?.querySelector('.hidden.sm\\:inline')?.textContent;

    expect(desktopDelta).toBe('▲ 1억 500만');
    expect(mobileDelta).toBe('▲ 1.05억');
  });

  it('EMPIRICAL TEST: Row 1 Header shrinking and clipping behavior under long dong string', () => {
    const TimelineItemCard = getComponent();
    const item = {
      aptName: '초장문 동 테스트',
      dong: '서울특별시 강남구 개포1동 산2-1번지 특별자치구',
      priceEok: '12억',
      priceVal: 12.0,
      areaPyeong: 34,
      area: 84,
      floor: 10,
      type: 'normal',
      delta: 0,
    };

    const { container } = render(<TimelineItemCard {...defaultProps} item={item} />);
    const headerRow = container.querySelector('.text-\\[9\\.5px\\]');
    expect(headerRow).not.toBeNull();
    
    // Check if dong span has shrink-0 with truncate
    const dongSpan = headerRow?.children[0];
    expect(dongSpan?.className).toContain('shrink-0');
    expect(dongSpan?.className).toContain('truncate');
  });

  it('stress tests extremely long apartment name', () => {
    const TimelineItemCard = getComponent();
    const item = {
      aptName: '동탄역 시범 한화 꿈에그린 프레스티지 아파트 101동 2002호 특별분양분 대표선정단지 34평형 A타입 초장문아파트명',
      displayAptName: '동탄역 시범 한화 꿈에그린 프레스티지 아파트 101동 2002호',
      dong: '오산동',
      priceEok: '120억 8,000만',
      priceVal: 120.8,
      areaPyeong: 88,
      area: 210,
      floor: 49,
      type: 'high',
      delta: 15.5,
      prevPriceVal: 105.3,
    };

    const { container } = render(<TimelineItemCard {...defaultProps} item={item} />);
    const aptSpan = container.querySelector('.text-xs, .text-\\[13px\\], .text-sm');
    expect(aptSpan?.textContent).toBe(item.displayAptName);
    expect(aptSpan?.getAttribute('title')).toBe(item.displayAptName);
    expect(aptSpan?.className).toContain('truncate');
  });

  it('tests zero delta (보합) and negative delta formatting', () => {
    const TimelineItemCard = getComponent();
    const itemZero = {
      aptName: '보합 단지',
      dong: '목동',
      priceEok: '6억',
      priceVal: 6.0,
      areaPyeong: 24,
      area: 59,
      floor: 3,
      type: 'normal',
      delta: 0,
    };

    const { rerender, container } = render(<TimelineItemCard {...defaultProps} item={itemZero} />);
    expect(screen.getAllByText('보합').length).toBeGreaterThan(0);

    const itemNeg = {
      ...itemZero,
      aptName: '하락 단지',
      delta: -0.5, // 5,000만 하락
      prevPriceVal: 6.5,
    };

    rerender(<TimelineItemCard {...defaultProps} item={itemNeg} />);
    const deltaBadgeSpans = container.querySelectorAll('span.font-black.px-1');
    const mobileDelta = deltaBadgeSpans[0]?.querySelector('.inline.sm\\:hidden')?.textContent;
    const desktopDelta = deltaBadgeSpans[0]?.querySelector('.hidden.sm\\:inline')?.textContent;
    expect(desktopDelta).toBe('▼ 5,000만');
    expect(mobileDelta).toBe('▼ 5,000만');
  });

  it('verifies click and hover callback triggers and e.stopPropagation on details button', () => {
    const TimelineItemCard = getComponent();
    const onCardClickMock = jest.fn();
    const onCardHoverMock = jest.fn();
    const onDetailsClickMock = jest.fn();
    const onDetailsHoverMock = jest.fn();

    const item = {
      aptName: '콜백 테스트 단지',
      dong: '중동',
      priceEok: '9억',
      priceVal: 9.0,
      areaPyeong: 30,
      area: 74,
      floor: 5,
      type: 'normal',
      delta: 0.1,
    };

    render(
      <TimelineItemCard
        item={item}
        isSelected={false}
        areaUnit="m2"
        onCardHover={onCardHoverMock}
        onCardClick={onCardClickMock}
        onDetailsClick={onDetailsClickMock}
        onDetailsHover={onDetailsHoverMock}
      />
    );

    // Click card body button
    const cardButton = screen.getByLabelText(/실거래 분석 아파트 선택/);
    fireEvent.click(cardButton);
    expect(onCardClickMock).toHaveBeenCalledWith('콜백 테스트 단지');

    // Click details button
    const detailsButton = screen.getByText('상세');
    fireEvent.click(detailsButton);
    expect(onDetailsClickMock).toHaveBeenCalledWith('콜백 테스트 단지');
    expect(onCardClickMock).toHaveBeenCalledTimes(1);

    // Hover container
    const outerContainer = detailsButton.closest('.group');
    if (outerContainer) {
      fireEvent.mouseEnter(outerContainer);
      expect(onCardHoverMock).toHaveBeenCalledWith('콜백 테스트 단지', '중동');
    }
  });
});

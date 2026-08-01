import fs from 'fs';
import path from 'path';
import React, { useState, useCallback } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

declare global {
  // eslint-disable-next-line no-var
  var stressCardRenderCounts: Record<string, number>;
}

describe('TimelineItemCard Empirical Stress & Edge Case Test Suite', () => {
  const clientPath = path.resolve(__dirname, 'MacroDashboardClient.tsx');
  const tempPath = path.resolve(__dirname, 'TimelineItemCardStressTemp.tsx');

  beforeAll(() => {
    const content = fs.readFileSync(clientPath, 'utf8');

    const formatEokMatch = content.match(/export const formatEokWithUnit = [\s\S]+?\n};/);
    if (!formatEokMatch) throw new Error('Failed to find formatEokWithUnit');
    const formatEokCode = formatEokMatch[0];

    const formatDeltaMatch = content.match(/export const formatDeltaPrice = [\s\S]+?\n};/);
    if (!formatDeltaMatch) throw new Error('Failed to find formatDeltaMatch');
    const formatDeltaCode = formatDeltaMatch[0];

    const cardInterfaceMatch = content.match(/interface TimelineItemCardProps {[\s\S]+?\n}/);
    if (!cardInterfaceMatch) throw new Error('Failed to find TimelineItemCardProps');
    const cardInterfaceCode = cardInterfaceMatch[0];

    const cardComponentMatch = content.match(/const TimelineItemCard = React\.memo\([\s\S]+?\n\}\);/);
    if (!cardComponentMatch) throw new Error('Failed to find TimelineItemCard component');
    let cardComponentCode = cardComponentMatch[0];

    const injectionPoint = 'const isRising = item.delta > 0;';
    const trackingCode = `
  global.stressCardRenderCounts = global.stressCardRenderCounts || {};
  global.stressCardRenderCounts[item.aptName] = (global.stressCardRenderCounts[item.aptName] || 0) + 1;
`;
    cardComponentCode = cardComponentCode.replace(injectionPoint, trackingCode + injectionPoint);

    const tempFileContent = `
import React from 'react';
import { TimelineItem } from './MacroDashboardClient';

${formatEokCode}
${formatDeltaCode}
${cardInterfaceCode}
${cardComponentCode}

export { TimelineItemCard };
`;
    fs.writeFileSync(tempPath, tempFileContent, 'utf8');
  });

  afterAll(() => {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  });

  beforeEach(() => {
    global.stressCardRenderCounts = {};
  });

  it('1. Rapid Selection Stress Test: switching selection 100 times across 50 cards', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TimelineItemCard } = require('./TimelineItemCardStressTemp');

    const items = Array.from({ length: 50 }, (_, i) => ({
      aptName: `단지_${i}`,
      dong: `동_${i % 5}`,
      priceEok: `${10 + (i % 5)}억 ${((i * 500) % 9000)}만`,
      priceVal: (10 + (i % 5)) * 10000 + ((i * 500) % 9000),
      areaPyeong: 34,
      area: 84,
      floor: (i % 20) + 1,
      type: i % 10 === 0 ? 'high' : 'normal',
      delta: (i % 3 === 0) ? 0.5 : (i % 3 === 1) ? -0.3 : 0,
    }));

    const onCardHoverMock = jest.fn();
    const onCardClickMock = jest.fn();
    const onDetailsClickMock = jest.fn();
    const onDetailsHoverMock = jest.fn();

    function TestHarness() {
      const [selectedApt, setSelectedApt] = useState<string | null>('단지_0');
      const [dummyUnrelatedState, setDummyUnrelatedState] = useState(0);

      const handleCardHover = useCallback((aptName: string, dong: string) => {
        onCardHoverMock(aptName, dong);
      }, []);

      const handleCardClick = useCallback((aptName: string) => {
        setSelectedApt(aptName);
        onCardClickMock(aptName);
      }, []);

      const handleDetailsClick = useCallback((aptName: string) => {
        onDetailsClickMock(aptName);
      }, []);

      const handleDetailsHover = useCallback((aptName: string, dong: string) => {
        onDetailsHoverMock(aptName, dong);
      }, []);

      return (
        <div>
          <button data-testid="bump-dummy" onClick={() => setDummyUnrelatedState(s => s + 1)}>
            Bump State ({dummyUnrelatedState})
          </button>
          {items.map((item, idx) => (
            <TimelineItemCard
              key={`${item.aptName}-${idx}`}
              item={item}
              isSelected={selectedApt === item.aptName}
              areaUnit="m2"
              onCardHover={handleCardHover}
              onCardClick={handleCardClick}
              onDetailsClick={handleDetailsClick}
              onDetailsHover={handleDetailsHover}
            />
          ))}
        </div>
      );
    }

    render(<TestHarness />);

    // Initial render count for all 50 items should be 1 each
    items.forEach((item) => {
      expect(global.stressCardRenderCounts[item.aptName]).toBe(1);
    });

    // Fire 49 rapid clicks switching selection from 단지_0 -> 단지_1 -> ... -> 단지_49
    for (let i = 1; i < 50; i++) {
      const targetBtn = screen.getByLabelText(new RegExp(`^실거래 분석 아파트 선택: 단지_${i},`));
      fireEvent.click(targetBtn);
    }

    // Unrelated parent state updates (10 times)
    const bumpBtn = screen.getByTestId('bump-dummy');
    for (let k = 0; k < 10; k++) {
      fireEvent.click(bumpBtn);
    }

    // Verification of re-render counts:
    // With React.memo + stable callbacks, unrelated parent state updates MUST NOT cause re-renders.
    // '단지_0' was selected initially and unselected on step 1 -> total renders = 2.
    // '단지_49' was selected on step 49 and remained selected -> total renders = 2.
    // '단지_25' was selected on step 25 (render 2) and unselected on step 26 (render 3) -> total renders = 3.
    expect(global.stressCardRenderCounts['단지_0']).toBe(2);
    expect(global.stressCardRenderCounts['단지_49']).toBe(2);
    expect(global.stressCardRenderCounts['단지_25']).toBe(3);
  });

  it('2. Unstable Callbacks Anti-Pattern Test: demonstrates breakdown of React.memo when callbacks are inline', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TimelineItemCard } = require('./TimelineItemCardStressTemp');

    const item = {
      aptName: '테스트단지',
      dong: '테스트동',
      priceEok: '15억',
      priceVal: 150000,
      areaPyeong: 34,
      area: 84,
      floor: 10,
      type: 'normal',
      delta: 0.5,
    };

    function UnstableParent() {
      const [count, setCount] = useState(0);

      return (
        <div>
          <button data-testid="rerender-parent" onClick={() => setCount(c => c + 1)}>
            Re-render Parent ({count})
          </button>
          <TimelineItemCard
            item={item}
            isSelected={false}
            areaUnit="m2"
            onCardHover={(apt, dong) => console.log(apt, dong)} // inline!
            onCardClick={(apt) => console.log(apt)} // inline!
            onDetailsClick={(apt) => console.log(apt)} // inline!
            onDetailsHover={(apt, dong) => console.log(apt, dong)} // inline!
          />
        </div>
      );
    }

    render(<UnstableParent />);
    expect(global.stressCardRenderCounts['테스트단지']).toBe(1);

    // Re-render parent 5 times
    const btn = screen.getByTestId('rerender-parent');
    for (let i = 0; i < 5; i++) {
      fireEvent.click(btn);
    }

    // Because inline functions create new references every render, React.memo fails and card re-renders every time!
    expect(global.stressCardRenderCounts['테스트단지']).toBe(6);
  });

  it('3. Detail Button Click Event Isolation Test: e.stopPropagation prevents card selection', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TimelineItemCard } = require('./TimelineItemCardStressTemp');

    const item = {
      aptName: '이벤트단지',
      dong: '이벤트동',
      priceEok: '20억',
      priceVal: 200000,
      areaPyeong: 45,
      area: 114,
      floor: 30,
      type: 'high',
      delta: 1.2,
    };

    const onCardClickMock = jest.fn();
    const onDetailsClickMock = jest.fn();

    render(
      <TimelineItemCard
        item={item}
        isSelected={false}
        areaUnit="m2"
        onCardHover={jest.fn()}
        onCardClick={onCardClickMock}
        onDetailsClick={onDetailsClickMock}
        onDetailsHover={jest.fn()}
      />
    );

    const detailsBtn = screen.getByText('상세');
    fireEvent.click(detailsBtn);

    // onDetailsClick must be called with aptName
    expect(onDetailsClickMock).toHaveBeenCalledWith('이벤트단지');
    // onCardClick MUST NOT be called because event propagation is stopped
    expect(onCardClickMock).not.toHaveBeenCalled();
  });

  it('4. Area Unit Change Test: changing unit from m2 to pyeong re-renders cards correctly', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TimelineItemCard } = require('./TimelineItemCardStressTemp');

    const item = {
      aptName: '평형단지',
      dong: '평형동',
      priceEok: '10억',
      priceVal: 100000,
      areaPyeong: 34,
      area: 84,
      floor: 5,
      type: 'normal',
      delta: 0,
      areaLabelM2: '84.95㎡',
      areaLabelPyeong: '34.2평',
    };

    const { rerender } = render(
      <TimelineItemCard
        item={item}
        isSelected={false}
        areaUnit="m2"
        onCardHover={jest.fn()}
        onCardClick={jest.fn()}
        onDetailsClick={jest.fn()}
        onDetailsHover={jest.fn()}
      />
    );

    expect(screen.getByText('84.95㎡')).toBeInTheDocument();
    expect(global.stressCardRenderCounts['평형단지']).toBe(1);

    // Switch to pyeong
    rerender(
      <TimelineItemCard
        item={item}
        isSelected={false}
        areaUnit="pyeong"
        onCardHover={jest.fn()}
        onCardClick={jest.fn()}
        onDetailsClick={jest.fn()}
        onDetailsHover={jest.fn()}
      />
    );

    expect(screen.getByText('34.2평')).toBeInTheDocument();
    expect(global.stressCardRenderCounts['평형단지']).toBe(2);
  });

  it('5. Edge Case Formatting Test: verifies robust rendering under extreme or zero delta and price values', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TimelineItemCard } = require('./TimelineItemCardStressTemp');

    const itemEdge = {
      aptName: '엣지단지',
      dong: '엣지동',
      priceEok: '5억 200만',
      priceVal: 50200,
      areaPyeong: 25,
      area: 59,
      floor: 1,
      type: 'high',
      delta: 0.02, // 200만원 rise
      prevPriceVal: 50000,
    };

    render(
      <TimelineItemCard
        item={itemEdge}
        isSelected={false}
        areaUnit="m2"
        onCardHover={jest.fn()}
        onCardClick={jest.fn()}
        onDetailsClick={jest.fn()}
        onDetailsHover={jest.fn()}
      />
    );

    // Badge "신고가" should render
    expect(screen.getByText('신고가')).toBeInTheDocument();
    // Delta should display ▲ 200만
    expect(screen.getAllByText(/▲ 200만/).length).toBeGreaterThan(0);
  });

  it('6. Hover Callback Trigger Test: mouseenter fires onCardHover and onDetailsHover', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TimelineItemCard } = require('./TimelineItemCardStressTemp');

    const item = {
      aptName: '호버단지',
      dong: '호버동',
      priceEok: '8억',
      priceVal: 80000,
      areaPyeong: 30,
      area: 74,
      floor: 15,
      type: 'normal',
      delta: -0.1,
    };

    const onCardHoverMock = jest.fn();
    const onDetailsHoverMock = jest.fn();

    render(
      <TimelineItemCard
        item={item}
        isSelected={false}
        areaUnit="m2"
        onCardHover={onCardHoverMock}
        onCardClick={jest.fn()}
        onDetailsClick={jest.fn()}
        onDetailsHover={onDetailsHoverMock}
      />
    );

    const mainBtn = screen.getByLabelText(/실거래 분석 아파트 선택: 호버단지/);
    fireEvent.mouseEnter(mainBtn);
    expect(onCardHoverMock).toHaveBeenCalledWith('호버단지', '호버동');

    const detailsBtn = screen.getByText('상세');
    fireEvent.mouseEnter(detailsBtn);
    expect(onDetailsHoverMock).toHaveBeenCalledWith('호버단지', '호버동');
  });
});

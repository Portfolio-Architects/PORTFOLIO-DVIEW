import fs from 'fs';
import path from 'path';
import React, { useState, useCallback } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Declare global types for test tracking
declare global {
  var timelineItemCardRenderCounts: Record<string, number>;
}

describe('TimelineItemCard Memoization Render Test', () => {
  const clientPath = path.resolve(__dirname, 'MacroDashboardClient.tsx');
  const tempPath = path.resolve(__dirname, 'TimelineItemCardTemp.tsx');

  beforeAll(() => {
    // 1. Read MacroDashboardClient.tsx
    const content = fs.readFileSync(clientPath, 'utf8');

    // 2. Extract formatEokWithUnit
    const formatEokMatch = content.match(/export const formatEokWithUnit = [\s\S]+?\n};/);
    if (!formatEokMatch) throw new Error('Failed to find formatEokWithUnit');
    const formatEokCode = formatEokMatch[0];

    // 3. Extract formatDeltaPrice
    const formatDeltaMatch = content.match(/export const formatDeltaPrice = [\s\S]+?\n};/);
    if (!formatDeltaMatch) throw new Error('Failed to find formatDeltaPrice');
    const formatDeltaCode = formatDeltaMatch[0];

    // 4. Extract TimelineItemCardProps interface and TimelineItemCard component
    const cardInterfaceMatch = content.match(/interface TimelineItemCardProps {[\s\S]+?\n}/);
    if (!cardInterfaceMatch) throw new Error('Failed to find TimelineItemCardProps');
    const cardInterfaceCode = cardInterfaceMatch[0];

    const cardComponentMatch = content.match(/const TimelineItemCard = React\.memo\([\s\S]+?\n\}\);/);
    if (!cardComponentMatch) throw new Error('Failed to find TimelineItemCard component');
    let cardComponentCode = cardComponentMatch[0];

    // 5. Inject render tracking code inside TimelineItemCard component
    const injectionPoint = 'const isRising = item.delta > 0;';
    const trackingCode = `
  global.timelineItemCardRenderCounts = global.timelineItemCardRenderCounts || {};
  global.timelineItemCardRenderCounts[item.aptName] = (global.timelineItemCardRenderCounts[item.aptName] || 0) + 1;
`;
    cardComponentCode = cardComponentCode.replace(injectionPoint, trackingCode + injectionPoint);

    // 6. Write to temp file
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
    // Clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  });

  it('verifies that only the changed cards re-render when switching selected items with stable callbacks', () => {
    // Reset render counts
    global.timelineItemCardRenderCounts = {};

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TimelineItemCard } = require('./TimelineItemCardTemp');

    // Create dummy timeline items
    const itemA = {
      aptName: '단지A',
      dong: '청계동',
      priceEok: '10억',
      priceVal: 100000,
      areaPyeong: 34,
      area: 84,
      floor: 12,
      type: 'normal',
      delta: 5000,
    };

    const itemB = {
      aptName: '단지B',
      dong: '영천동',
      priceEok: '8억',
      priceVal: 80000,
      areaPyeong: 25,
      area: 59,
      floor: 8,
      type: 'normal',
      delta: -2000,
    };

    const itemC = {
      aptName: '단지C',
      dong: '오산동',
      priceEok: '12억',
      priceVal: 120000,
      areaPyeong: 34,
      area: 84,
      floor: 20,
      type: 'high',
      delta: 0,
    };

    const items = [itemA, itemB, itemC];

    // Dummy callback functions
    const onCardHoverMock = jest.fn();
    const onCardClickMock = jest.fn();
    const onDetailsClickMock = jest.fn();
    const onDetailsHoverMock = jest.fn();

    // Test Parent Component to simulate state changes with stable callbacks (like in production)
    function TestParent() {
      const [selectedApt, setSelectedApt] = useState<string | null>('단지A');

      const handleCardHover = useCallback((aptName: string, dong: string) => {
        onCardHoverMock(aptName, dong);
      }, []);

      const handleCardClick = useCallback((aptName: string) => {
        setSelectedApt(aptName);
        onCardClickMock(aptName);
      }, [setSelectedApt]);

      const handleDetailsClick = useCallback((aptName: string) => {
        onDetailsClickMock(aptName);
      }, []);

      const handleDetailsHover = useCallback((aptName: string, dong: string) => {
        onDetailsHoverMock(aptName, dong);
      }, []);

      return (
        <div>
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

    // 1. Initial Render
    const { rerender } = render(<TestParent />);

    // Assert that each card rendered exactly once
    expect(global.timelineItemCardRenderCounts['단지A']).toBe(1);
    expect(global.timelineItemCardRenderCounts['단지B']).toBe(1);
    expect(global.timelineItemCardRenderCounts['단지C']).toBe(1);

    // 2. Click on '단지B' (switching selected item from '단지A' to '단지B')
    // Find the button inside the second card (단지B) and click it
    const buttonB = screen.getByLabelText(/실거래 분석 아파트 선택: 단지B/);
    fireEvent.click(buttonB);

    // Verify click callback was triggered
    expect(onCardClickMock).toHaveBeenCalledWith('단지B');

    // Assert render counts after state update:
    // - '단지A': was selected, now unselected. Should re-render (total: 2)
    // - '단지B': was unselected, now selected. Should re-render (total: 2)
    // - '단지C': was unselected, remains unselected. Should NOT re-render (total: 1)
    expect(global.timelineItemCardRenderCounts['단지A']).toBe(2);
    expect(global.timelineItemCardRenderCounts['단지B']).toBe(2);
    expect(global.timelineItemCardRenderCounts['단지C']).toBe(1);
  });
});

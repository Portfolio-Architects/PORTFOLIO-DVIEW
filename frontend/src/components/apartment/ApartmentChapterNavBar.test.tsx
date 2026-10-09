import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  ApartmentChapterNavBar,
  APARTMENT_CHAPTERS,
} from './ApartmentChapterNavBar';

describe('ApartmentChapterNavBar & APARTMENT_CHAPTERS Invariant Suite', () => {
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  describe('1. 8대 이산 챕터 불변식 검증 (APARTMENT_CHAPTERS)', () => {
    it('정확히 8개의 분석 챕터가 정의되어 있어야 한다', () => {
      expect(APARTMENT_CHAPTERS).toHaveLength(8);
    });

    it('각 챕터의 ID 및 번호가 명세와 1:1로 일치해야 한다', () => {
      const expectedSpecs = [
        { id: 'chapter-01-overview', number: '01', title: '개요 및 실거래 궤적', subtitle: 'Overview & Price' },
        { id: 'chapter-02-volume', number: '02', title: '거래량 회전율 분석', subtitle: 'Turnover & Volume' },
        { id: 'chapter-03-gap', number: '03', title: '전세가율 갭투자 매트릭스', subtitle: 'Jeonse Gap' },
        { id: 'chapter-04-infra', number: '04', title: '학군 및 하이퍼로컬 인프라', subtitle: 'Schools & Infra' },
        { id: 'chapter-05-mortgage', number: '05', title: '주담대 LDI 및 역전세 센티넬', subtitle: 'Mortgage LDI' },
        { id: 'chapter-06-ledger', number: '06', title: '세대수 및 평형별 거래 대장', subtitle: 'Pyeong Ledger' },
        { id: 'chapter-07-macro', number: '07', title: '거시 체제 및 지역 상관도', subtitle: 'Macro Correlation' },
        { id: 'chapter-08-report', number: '08', title: '단지 종합 평가 리포트', subtitle: 'Executive Monograph' },
      ];

      expectedSpecs.forEach((spec, idx) => {
        const chapter = APARTMENT_CHAPTERS[idx];
        expect(chapter.id).toBe(spec.id);
        expect(chapter.number).toBe(spec.number);
        expect(chapter.title).toBe(spec.title);
        expect(chapter.subtitle).toBe(spec.subtitle);
        expect(chapter.icon).toBeDefined();
      });
    });
  });

  describe('2. 렌더링 및 레이아웃 검증', () => {
    it('8개 챕터 버튼이 모두 렌더링되고 번호/제목/부제목이 표시되어야 한다', () => {
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
        />
      );

      APARTMENT_CHAPTERS.forEach((chapter) => {
        expect(screen.getByText(chapter.number)).toBeInTheDocument();
        expect(screen.getByText(chapter.title)).toBeInTheDocument();
        expect(screen.getByText(chapter.subtitle)).toBeInTheDocument();
      });
    });

    it('내비게이션 컨테이너에 sticky top-0 z-[60] 및 사용자 정의 클래스가 적용되어야 한다', () => {
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
          className="custom-test-navbar"
        />
      );

      const navEl = container.querySelector('nav');
      expect(navEl).toBeInTheDocument();
      expect(navEl).toHaveClass('sticky');
      expect(navEl).toHaveClass('top-0');
      expect(navEl).toHaveClass('z-[60]');
      expect(navEl).toHaveClass('custom-test-navbar');
    });
  });

  describe('3. 활성 필 인디케이터 (Active Pill Indicator & Framer Motion layoutId)', () => {
    it('활성 챕터 버튼에만 aria-current="page" 및 activeApartmentChapterPill이 렌더링되어야 한다', () => {
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-02-volume"
          onSelectChapter={jest.fn()}
        />
      );

      const activeBtn = container.querySelector('button[data-chapter-id="chapter-02-volume"]');
      expect(activeBtn).toHaveAttribute('aria-current', 'page');

      const pill = screen.getByTestId('active-chapter-pill');
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveAttribute('data-layout-id', 'activeApartmentChapterPill');
      expect(activeBtn).toContainElement(pill);

      // 다른 챕터 버튼에는 aria-current가 없어야 함
      const inactiveBtn = container.querySelector('button[data-chapter-id="chapter-01-overview"]');
      expect(inactiveBtn).not.toHaveAttribute('aria-current');
    });

    it('activeChapter prop이 변경되면 활성 인디케이터 위치 및 centering scrollIntoView가 호출되어야 한다', () => {
      const { rerender, container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
        />
      );

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
      scrollIntoViewMock.mockClear();

      rerender(
        <ApartmentChapterNavBar
          activeChapter="chapter-05-mortgage"
          onSelectChapter={jest.fn()}
        />
      );

      const activeBtn = container.querySelector('button[data-chapter-id="chapter-05-mortgage"]');
      expect(activeBtn).toHaveAttribute('aria-current', 'page');
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
    });
  });

  describe('4. 사용자 탭 클릭 상호작용', () => {
    it('챕터 버튼 클릭 시 onSelectChapter 콜백이 대상 chapterId와 함께 호출되어야 한다', () => {
      const onSelectChapter = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectChapter}
        />
      );

      const targetBtn = container.querySelector('button[data-chapter-id="chapter-03-gap"]');
      expect(targetBtn).toBeInTheDocument();

      fireEvent.click(targetBtn!);
      expect(onSelectChapter).toHaveBeenCalledTimes(1);
      expect(onSelectChapter).toHaveBeenCalledWith('chapter-03-gap');
    });

    it('DOM에 대상 섹션이 존재할 경우 부드러운 스크롤 이동이 트리거되어야 한다', () => {
      const targetSection = document.createElement('section');
      targetSection.id = 'chapter-04-infra';
      const sectionScrollMock = jest.fn();
      targetSection.scrollIntoView = sectionScrollMock;
      document.body.appendChild(targetSection);

      const onSelectChapter = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectChapter}
        />
      );

      const btn = container.querySelector('button[data-chapter-id="chapter-04-infra"]');
      fireEvent.click(btn!);

      expect(onSelectChapter).toHaveBeenCalledWith('chapter-04-infra');
      expect(sectionScrollMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });

      document.body.removeChild(targetSection);
    });
  });

  describe('5. scrollContainerRef 안전성 및 Nullability 검증', () => {
    it('scrollContainerRef가 undefined일 때 크래시 없이 정상 렌더링되어야 한다', () => {
      expect(() => {
        render(
          <ApartmentChapterNavBar
            activeChapter="chapter-01-overview"
            onSelectChapter={jest.fn()}
            scrollContainerRef={undefined}
          />
        );
      }).not.toThrow();
    });

    it('scrollContainerRef.current가 null일 때 크래시 없이 정상 동작해야 한다', () => {
      const ref = { current: null };
      expect(() => {
        render(
          <ApartmentChapterNavBar
            activeChapter="chapter-01-overview"
            onSelectChapter={jest.fn()}
            scrollContainerRef={ref}
          />
        );
      }).not.toThrow();
    });

    it('scrollContainerRef에 모달 컨테이너가 바인딩된 경우 내부 섹션 탐색을 수행해야 한다', () => {
      const containerDiv = document.createElement('div');
      const innerSection = document.createElement('section');
      innerSection.id = 'chapter-06-ledger';
      const innerScrollMock = jest.fn();
      innerSection.scrollIntoView = innerScrollMock;
      containerDiv.appendChild(innerSection);
      document.body.appendChild(containerDiv);

      const ref = { current: containerDiv };
      const onSelectChapter = jest.fn();

      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectChapter}
          scrollContainerRef={ref}
        />
      );

      const btn = container.querySelector('button[data-chapter-id="chapter-06-ledger"]');
      fireEvent.click(btn!);

      expect(onSelectChapter).toHaveBeenCalledWith('chapter-06-ledger');
      expect(innerScrollMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });

      document.body.removeChild(containerDiv);
    });
  });

  describe('6. IntersectionObserver 스크롤 스파이 동기화 검증', () => {
    let mockObserverCallback: IntersectionObserverCallback;
    let observeMock: jest.Mock;
    let disconnectMock: jest.Mock;
    const originalIO = global.IntersectionObserver;

    beforeEach(() => {
      observeMock = jest.fn();
      disconnectMock = jest.fn();

      global.IntersectionObserver = jest.fn().mockImplementation((callback, options) => {
        mockObserverCallback = callback;
        return {
          root: options?.root ?? null,
          rootMargin: options?.rootMargin ?? '',
          thresholds: options?.threshold ?? [],
          observe: observeMock,
          unobserve: jest.fn(),
          disconnect: disconnectMock,
          takeRecords: () => [],
        };
      }) as unknown as typeof IntersectionObserver;
    });

    afterEach(() => {
      global.IntersectionObserver = originalIO;
    });

    it('IntersectionObserver가 rootMargin -15% 0px -60% 0px로 초기화되어야 한다', () => {
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
        />
      );

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          rootMargin: '-15% 0px -60% 0px',
        })
      );
    });

    it('스크롤 스파이 교차 이벤트 발생 시 상위 활성 챕터로 onSelectChapter가 호출되어야 한다', () => {
      const onSelectChapter = jest.fn();
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectChapter}
        />
      );

      const targetEl = document.createElement('div');
      targetEl.id = 'chapter-03-gap';

      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: targetEl,
              boundingClientRect: { top: 120 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      expect(onSelectChapter).toHaveBeenCalledWith('chapter-03-gap');
    });

    it('탭 클릭 후 쿨다운 기간(수동 스크롤) 중에는 스파이 교차 이벤트가 억제되어야 한다', () => {
      const onSelectChapter = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectChapter}
        />
      );

      const btn = container.querySelector('button[data-chapter-id="chapter-07-macro"]');
      fireEvent.click(btn!);
      expect(onSelectChapter).toHaveBeenCalledWith('chapter-07-macro');
      onSelectChapter.mockClear();

      // 수동 스크롤 중 중간 챕터 교차 통과 시뮬레이션
      const intermediateEl = document.createElement('div');
      intermediateEl.id = 'chapter-04-infra';

      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: intermediateEl,
              boundingClientRect: { top: 100 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      // 쿨다운 기간이므로 중간 챕터 변경 호출이 억제되어야 함
      expect(onSelectChapter).not.toHaveBeenCalled();
    });

    it('컴포넌트 언마운트 시 observer.disconnect가 호출되어야 한다', () => {
      const { unmount } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
        />
      );

      unmount();
      expect(disconnectMock).toHaveBeenCalled();
    });
  });
});

'use client';

import React, { useEffect, useRef } from 'react';
import {
  TrendingUp,
  Activity,
  Layers,
  GraduationCap,
  ShieldAlert,
  Building2,
  Globe2,
  FileText,
} from 'lucide-react';

export interface ApartmentChapter {
  id: string;
  number: string; // '01' ~ '08'
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

export interface ApartmentChapterNavBarProps {
  activeChapter: string;
  onSelectChapter: (chapterId: string) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null> | React.RefObject<HTMLDivElement | null>;
  className?: string;
}

/**
 * 8대 이산 챕터 불변식 정의
 * 01: 개요 및 실거래 궤적 (chapter-01-overview)
 * 02: 거래량 회전율 분석 (chapter-02-volume)
 * 03: 전세가율 갭투자 매트릭스 (chapter-03-gap)
 * 04: 학군 및 하이퍼로컬 인프라 (chapter-04-infra)
 * 05: 주담대 LDI 및 역전세 센티넬 (chapter-05-mortgage)
 * 06: 세대수 및 평형별 거래 대장 (chapter-06-ledger)
 * 07: 거시 체제 및 지역 상관도 (chapter-07-macro)
 * 08: 단지 종합 평가 리포트 (chapter-08-report)
 */
export const APARTMENT_CHAPTERS: ApartmentChapter[] = [
  {
    id: 'chapter-01-overview',
    number: '01',
    title: '개요 및 실거래 궤적',
    subtitle: 'Overview & Price',
    icon: <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-02-volume',
    number: '02',
    title: '거래량 회전율 분석',
    subtitle: 'Turnover & Volume',
    icon: <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-03-gap',
    number: '03',
    title: '전세가율 갭투자 매트릭스',
    subtitle: 'Jeonse Gap',
    icon: <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-04-infra',
    number: '04',
    title: '학군 및 하이퍼로컬 인프라',
    subtitle: 'Schools & Infra',
    icon: <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-05-mortgage',
    number: '05',
    title: '주담대 LDI 및 역전세 센티넬',
    subtitle: 'Mortgage LDI',
    icon: <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-06-ledger',
    number: '06',
    title: '세대수 및 평형별 거래 대장',
    subtitle: 'Pyeong Ledger',
    icon: <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-07-macro',
    number: '07',
    title: '거시 체제 및 지역 상관도',
    subtitle: 'Macro Correlation',
    icon: <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-08-report',
    number: '08',
    title: '단지 종합 평가 리포트',
    subtitle: 'Executive Monograph',
    icon: <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
];

interface MotionDivProps extends React.HTMLAttributes<HTMLDivElement> {
  layoutId?: string;
  transition?: Record<string, unknown>;
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
}

/**
 * Framer Motion layoutId 호환 및 무결속 CSS 전환 폴백 모션 래퍼
 */
const motion = {
  div: React.forwardRef<HTMLDivElement, MotionDivProps>(
    ({ layoutId, className = '', children, ...rest }, ref) => (
      <div
        ref={ref}
        data-layout-id={layoutId}
        className={`${className} transition-all duration-200`}
        {...rest}
      >
        {children}
      </div>
    )
  ),
};
motion.div.displayName = 'MotionDiv';

export const ApartmentChapterNavBar: React.FC<ApartmentChapterNavBarProps> = ({
  activeChapter,
  onSelectChapter,
  scrollContainerRef,
  className = '',
}) => {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const onSelectChapterRef = useRef(onSelectChapter);
  const activeChapterRef = useRef(activeChapter);

  useEffect(() => {
    onSelectChapterRef.current = onSelectChapter;
    activeChapterRef.current = activeChapter;
  }, [onSelectChapter, activeChapter]);

  const isManualScrollRef = useRef(false);
  const manualScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 활성 챕터 변경 시 가로 스크롤 컨테이너 내 탭 중앙 정렬
  useEffect(() => {
    const targetButton = buttonRefs.current.get(activeChapter);
    if (targetButton && typeof targetButton.scrollIntoView === 'function') {
      targetButton.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [activeChapter]);

  // IntersectionObserver 기반 스크롤 스파이 동기화 (rootMargin: '-15% 0px -60% 0px')
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const root = scrollContainerRef?.current ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollRef.current) return;

        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length === 0) return;

        visibleEntries.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        );

        const activeEntry = visibleEntries[0];
        const chapterId = activeEntry.target.id;
        if (chapterId && chapterId !== activeChapterRef.current) {
          onSelectChapterRef.current(chapterId);
        }
      },
      {
        root,
        rootMargin: '-15% 0px -60% 0px',
        threshold: [0, 0.1, 0.25, 0.5],
      }
    );

    const observed = new Set<string>();

    const registerTargets = () => {
      APARTMENT_CHAPTERS.forEach((chapter) => {
        if (observed.has(chapter.id)) return;
        const el = root
          ? (root.querySelector(`#${chapter.id}`) as HTMLElement | null)
          : document.getElementById(chapter.id);
        if (el) {
          observer.observe(el);
          observed.add(chapter.id);
        }
      });
    };

    registerTargets();

    // 지연 렌더링 청크 및 동적 로드 요소 대응 탐색 재시도
    const timer1 = setTimeout(registerTargets, 150);
    const timer2 = setTimeout(registerTargets, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current);
      }
      observer.disconnect();
    };
  }, [scrollContainerRef]);

  const handleTabClick = (chapterId: string) => {
    if (manualScrollTimeoutRef.current) {
      clearTimeout(manualScrollTimeoutRef.current);
    }
    isManualScrollRef.current = true;
    manualScrollTimeoutRef.current = setTimeout(() => {
      isManualScrollRef.current = false;
    }, 900);

    onSelectChapter(chapterId);

    const root = scrollContainerRef?.current ?? null;
    const target = root
      ? (root.querySelector(`#${chapterId}`) as HTMLElement | null)
      : document.getElementById(chapterId);

    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <nav
      aria-label="아파트 단지 분석 챕터 내비게이션"
      className={`sticky top-0 z-[60] w-full bg-surface/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-border/80 py-2 px-3 sm:px-4 ${className}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {APARTMENT_CHAPTERS.map((chapter) => {
          const isActive = activeChapter === chapter.id;

          return (
            <button
              key={chapter.id}
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(chapter.id, el);
                } else {
                  buttonRefs.current.delete(chapter.id);
                }
              }}
              type="button"
              onClick={() => handleTabClick(chapter.id)}
              aria-current={isActive ? 'page' : undefined}
              data-chapter-id={chapter.id}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors duration-150 shrink-0 select-none cursor-pointer outline-none ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-tertiary hover:text-secondary hover:bg-surface-variant/40'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeApartmentChapterPill"
                  data-testid="active-chapter-pill"
                  className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl -z-10 border border-primary/30"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}

              <span
                className={`inline-flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-white dark:bg-primary dark:text-white'
                    : 'bg-surface-variant text-tertiary'
                }`}
              >
                {chapter.number}
              </span>

              {chapter.icon && (
                <span className={`shrink-0 ${isActive ? 'text-primary' : 'text-tertiary'}`}>
                  {chapter.icon}
                </span>
              )}

              <div className="flex flex-col text-left leading-tight">
                <span className="text-[12px] sm:text-[13px] font-medium sm:font-semibold">
                  {chapter.title}
                </span>
                <span className="text-[9.5px] sm:text-[10px] text-tertiary font-normal tracking-tight">
                  {chapter.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ApartmentChapterNavBar;

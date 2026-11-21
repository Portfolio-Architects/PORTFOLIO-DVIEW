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
import { QuickNonLoginRetentionAction } from '@/components/common/QuickNonLoginRetentionAction';

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
  compact?: boolean;
  className?: string;
  apartmentName?: string;
  displayAptName?: string;
  canonicalSlug?: string;
  dong?: string;
  inline?: boolean;
  onOpenPushModal?: () => void;
}

/**
 * 8대 이산 챕터 정의 (실사용자 친화 담백한 명칭)
 * 01: 시세·실거래 (chapter-01-overview)
 * 02: 거래량 (chapter-02-volume)
 * 03: 전세·갭 (chapter-03-gap)
 * 04: 학군·입지 (chapter-04-infra)
 * 05: 대출·전세안전 (chapter-05-mortgage)
 * 06: 단지정보 (chapter-06-ledger)
 * 07: 적정가·금리 (chapter-07-macro)
 * 08: 임장·후기 (chapter-08-report)
 */
export const APARTMENT_CHAPTERS: ApartmentChapter[] = [
  {
    id: 'chapter-01-overview',
    number: '01',
    title: '시세·실거래',
    subtitle: '실거래 추이',
    icon: <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-02-volume',
    number: '02',
    title: '거래량',
    subtitle: '기간별 평균',
    icon: <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-03-gap',
    number: '03',
    title: '전세·갭',
    subtitle: '매매·전세 차이',
    icon: <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-04-infra',
    number: '04',
    title: '학군·입지',
    subtitle: '학교·교통·상권',
    icon: <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-05-mortgage',
    number: '05',
    title: '대출·전세안전',
    subtitle: 'DSR·역전세',
    icon: <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-06-ledger',
    number: '06',
    title: '단지정보',
    subtitle: '세대·주차·연식',
    icon: <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-07-macro',
    number: '07',
    title: '적정가·금리',
    subtitle: '금리별 시세',
    icon: <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
  },
  {
    id: 'chapter-08-report',
    number: '08',
    title: '임장·후기',
    subtitle: '사진·현장 메모',
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
  compact = false,
  className = '',
  apartmentName,
  displayAptName,
  canonicalSlug,
  dong,
  inline = false,
  onOpenPushModal,
}) => {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const navListRef = useRef<HTMLDivElement | null>(null);
  const onSelectChapterRef = useRef(onSelectChapter);
  const activeChapterRef = useRef(activeChapter);

  useEffect(() => {
    onSelectChapterRef.current = onSelectChapter;
    activeChapterRef.current = activeChapter;
  }, [onSelectChapter, activeChapter]);

  const isManualScrollRef = useRef(false);
  const manualScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 활성 챕터 변경 시 가로 스크롤 컨테이너 내부(scrollLeft)만 중앙 정렬하여 세로/바깥 스크롤 충돌 원천 차단
  useEffect(() => {
    const targetButton = buttonRefs.current.get(activeChapter);
    if (!targetButton) return;

    const navList = navListRef.current;
    if (
      navList &&
      navList.scrollWidth > navList.clientWidth &&
      typeof navList.scrollTo === 'function'
    ) {
      const targetLeft =
        targetButton.offsetLeft - (navList.clientWidth - targetButton.offsetWidth) / 2;
      navList.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
      return;
    }

    if (!scrollContainerRef?.current && typeof targetButton.scrollIntoView === 'function') {
      targetButton.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [activeChapter, scrollContainerRef]);

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

    if (!target) return;

    if (root && typeof root.scrollTo === 'function') {
      const rootRect = root.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const hasMeasuredLayout =
        rootRect.height > 0 ||
        targetRect.height > 0 ||
        targetRect.top !== 0 ||
        rootRect.top !== 0;
      if (hasMeasuredLayout) {
        const nextTop = Math.max(0, root.scrollTop + (targetRect.top - rootRect.top) - 12);
        root.scrollTo({
          top: nextTop,
          behavior: 'smooth',
        });
        return;
      }
    }

    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const showStickyRetention = Boolean(apartmentName && apartmentName.trim());

  return (
    <nav
      aria-label="아파트 단지 분석 챕터 내비게이션"
      data-compact={compact ? 'true' : 'false'}
      data-scroll-interactive="true"
      className={`sticky top-0 z-[60] w-full ${
        compact
          ? 'bg-surface border-b border-border px-4 md:px-6'
          : 'bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border py-1.5 px-3 sm:px-4'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
      <div
        ref={navListRef}
        className={`flex flex-1 min-w-0 items-center ${compact ? 'gap-1 sm:gap-2' : 'gap-1.5 sm:gap-2'} overflow-x-auto no-scrollbar scroll-smooth`}
      >
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
              className={`relative flex items-center whitespace-nowrap transition-colors duration-150 shrink-0 select-none cursor-pointer outline-none border-none bg-transparent ${
                compact
                  ? 'px-2.5 py-2.5 text-[13px]'
                  : 'gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm'
              } ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-tertiary hover:text-secondary font-semibold'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeApartmentChapterPill"
                  data-testid="active-chapter-pill"
                  className={
                    compact
                      ? 'absolute bottom-0 inset-x-1.5 h-[2px] rounded-full bg-primary'
                      : 'absolute inset-0 bg-[#eff1f5] dark:bg-[#1e2532] -z-10 rounded-xl'
                  }
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}

              {compact ? (
                <span className="leading-none">
                  {chapter.title}
                </span>
              ) : (
                <>
                  <span
                    className={`tabular-nums text-[11px] font-bold transition-colors ${
                      isActive ? 'text-primary' : 'text-tertiary/80'
                    }`}
                  >
                    {chapter.number}
                  </span>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-[12.5px] sm:text-[13px] font-bold">
                      {chapter.title}
                    </span>
                    <span className="text-[10px] text-tertiary font-medium tracking-tight">
                      {chapter.subtitle}
                    </span>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {showStickyRetention && apartmentName && (
        <div
          data-testid="chapter-nav-sticky-retention"
          className="shrink-0 pl-1.5 sm:pl-2 border-l border-border"
        >
          <QuickNonLoginRetentionAction
            aptName={apartmentName}
            displayAptName={displayAptName}
            canonicalSlug={canonicalSlug}
            dong={dong}
            surface={inline ? 'apartment_inline_chapter_nav' : 'apartment_modal_chapter_nav'}
            triggerPrefix="sticky_chapter"
            size="xs"
            compactMobileLabels
            testIdPrefix="chapter-nav-retention"
            onOpenPushModal={onOpenPushModal ? () => onOpenPushModal() : undefined}
          />
        </div>
      )}
      </div>
    </nav>
  );
};

export default ApartmentChapterNavBar;

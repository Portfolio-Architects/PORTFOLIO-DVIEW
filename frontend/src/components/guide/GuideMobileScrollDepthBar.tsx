'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListTree } from 'lucide-react';
import { getControlPillClass } from '@/lib/design-system/controls';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import { trackEvent } from '@/lib/utils/analytics';
import { isAppleTouchDevice } from '@/lib/utils/bodyScrollLock';

export interface GuideSectionAnchorItem {
  id: string;
  label: string;
  fullTitle?: string;
}

export interface GuideMobileScrollDepthBarProps {
  guideSlug: string;
  sections: ReadonlyArray<GuideSectionAnchorItem>;
}

export const SCROLL_DEPTH_MILESTONES = [25, 50, 75, 90] as const;

export type MobileScrollPlatform =
  | 'ios_inapp'
  | 'ios_safari'
  | 'android_web'
  | 'desktop';

const IN_APP_UA_REGEX =
  /kakaotalk|naver|line\/|instagram|fb_iab|fb4a|fban|fbios|twitter|twttr/i;

/**
 * Classifies client browser platform for scroll-depth retention diagnostics
 * (isolating iOS/iPadOS Safari & iOS In-App early-exit cohorts, including iPadOS 13+ desktop-class UA).
 */
export function detectMobileScrollPlatform(
  userAgent?: string | null,
  maxTouchPoints?: number | null
): MobileScrollPlatform {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'desktop';

  if (isAppleTouchDevice(ua, maxTouchPoints)) {
    return IN_APP_UA_REGEX.test(ua) ? 'ios_inapp' : 'ios_safari';
  }
  if (/android/.test(ua)) {
    return 'android_web';
  }
  return 'desktop';
}

/**
 * Computes clamped integer scroll progress percentage in [0, 100].
 * Safely absorbs iOS Safari rubber-band negative scrollTop, overscroll > maxScroll,
 * short viewports (scrollHeight <= clientHeight), and non-finite inputs.
 */
export function computeScrollProgressPct(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  if (
    !Number.isFinite(scrollTop) ||
    !Number.isFinite(scrollHeight) ||
    !Number.isFinite(clientHeight)
  ) {
    return 0;
  }
  const maxScrollable = scrollHeight - clientHeight;
  if (maxScrollable <= 0 || scrollTop <= 0) {
    return 0;
  }
  if (scrollTop >= maxScrollable) {
    return 100;
  }
  return Math.min(100, Math.max(0, Math.round((scrollTop / maxScrollable) * 100)));
}

export const GuideMobileScrollDepthBar = React.memo(function GuideMobileScrollDepthBar({
  guideSlug,
  sections,
}: GuideMobileScrollDepthBarProps) {
  const [progressPct, setProgressPct] = useState(0);
  const [activeId, setActiveId] = useState<string>(() => sections[0]?.id || '');
  const firedMilestonesRef = useRef<Set<number>>(new Set());
  const rafIdRef = useRef<number | null>(null);
  const rafScheduledRef = useRef(false);
  const sectionsRef = useRef<ReadonlyArray<GuideSectionAnchorItem>>(sections);
  const chipListRef = useRef<HTMLDivElement | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);
  const sectionsKey = useMemo(() => sections.map((sec) => sec.id).join('|'), [sections]);

  const evaluateScroll = useCallback(
    (emitMilestones: boolean) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      const docEl = document.documentElement;
      const rawScrollTop =
        typeof window.scrollY === 'number' && window.scrollY !== 0
          ? window.scrollY
          : docEl?.scrollTop || 0;
      const scrollHeight = docEl?.scrollHeight || 0;
      const clientHeight =
        (docEl?.clientHeight && docEl.clientHeight > 0
          ? docEl.clientHeight
          : window.innerHeight) || 0;

      const pct = computeScrollProgressPct(rawScrollTop, scrollHeight, clientHeight);
      setProgressPct(pct);

      if (emitMilestones) {
        const platform = detectMobileScrollPlatform(
          typeof navigator !== 'undefined' ? navigator.userAgent : '',
          typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0
        );
        const trigger = `${platform}_scroll`;

        for (const milestone of SCROLL_DEPTH_MILESTONES) {
          if (pct >= milestone && !firedMilestonesRef.current.has(milestone)) {
            firedMilestonesRef.current.add(milestone);
            trackEvent('guide_scroll_depth', {
              guide_slug: guideSlug,
              milestone_pct: milestone,
              chapter_id: `depth_${milestone}`,
              surface: 'guide_article',
              trigger,
            });
          }
        }
      }

      const currentSections = sectionsRef.current;
      if (currentSections.length > 0) {
        const activeThresholdPx = (window.innerWidth || 0) >= 768 ? 204 : 172;
        let matchedSectionId = currentSections[0].id;
        for (const sec of currentSections) {
          const el = document.getElementById(sec.id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= activeThresholdPx) {
            matchedSectionId = sec.id;
          }
        }
        setActiveId(matchedSectionId);
      }
    },
    [guideSlug]
  );

  // Reset milestone deduplication ONLY when navigating to a different guideSlug,
  // and synchronize initial scroll/hash position on first mount without firing GA4 milestones prematurely.
  useEffect(() => {
    firedMilestonesRef.current.clear();
    const firstId = sectionsRef.current[0]?.id || '';
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const initialScrollTop =
          typeof window.scrollY === 'number' && window.scrollY !== 0
            ? window.scrollY
            : document.documentElement?.scrollTop || 0;
        if (initialScrollTop > 0 && sectionsRef.current.length > 0) {
          evaluateScroll(false);
          return;
        }
      }
    }
    setProgressPct(0);
    setActiveId(firstId);
  }, [guideSlug, evaluateScroll]);

  // Keep activeId valid if section IDs structurally change within the same guide, without clearing firedMilestonesRef.
  useEffect(() => {
    if (sectionsRef.current.length === 0) {
      setActiveId('');
      return;
    }
    setActiveId((prev) =>
      sectionsRef.current.some((sec) => sec.id === prev)
        ? prev
        : sectionsRef.current[0]?.id || ''
    );
  }, [sectionsKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !sectionsKey) return;

    const onScroll = () => {
      if (rafScheduledRef.current) return;
      if (typeof window.requestAnimationFrame === 'function') {
        rafScheduledRef.current = true;
        const id = window.requestAnimationFrame(() => {
          rafScheduledRef.current = false;
          rafIdRef.current = null;
          evaluateScroll(true);
        });
        if (rafScheduledRef.current) {
          rafIdRef.current = id;
        }
      } else {
        evaluateScroll(true);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      rafScheduledRef.current = false;
      if (rafIdRef.current !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [evaluateScroll, sectionsKey]);

  // Keep the active TOC chip centered horizontally inside the scrollable strip on narrow mobile screens.
  useEffect(() => {
    const chipListEl = chipListRef.current;
    if (!chipListEl || !activeId || typeof chipListEl.scrollTo !== 'function') return;
    if (chipListEl.scrollWidth <= chipListEl.clientWidth) return;

    const activeChipEl = chipListEl.querySelector<HTMLElement>(
      `[data-section-id="${CSS?.escape ? CSS.escape(activeId) : activeId}"]`
    );
    if (!activeChipEl) return;

    const targetLeft = Math.max(
      0,
      activeChipEl.offsetLeft - chipListEl.clientWidth / 2 + activeChipEl.offsetWidth / 2
    );
    let prefersReducedMotion = false;
    try {
      prefersReducedMotion = Boolean(
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      );
    } catch {
      prefersReducedMotion = false;
    }
    chipListEl.scrollTo({
      left: targetLeft,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [activeId]);

  const handleChipClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, section: GuideSectionAnchorItem) => {
      setActiveId(section.id);
      trackEvent('guide_toc_jump', {
        guide_slug: guideSlug,
        target_section: section.id,
        chapter_id: section.id,
        surface: 'guide_toc_bar',
        trigger: 'chip_click',
      });

      if (typeof document === 'undefined') return;
      const targetEl = document.getElementById(section.id);
      if (!targetEl) return;

      e.preventDefault();
      let prefersReducedMotion = false;
      try {
        prefersReducedMotion = Boolean(
          window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
        );
      } catch {
        prefersReducedMotion = false;
      }

      if (typeof targetEl.scrollIntoView === 'function') {
        targetEl.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }

      try {
        window.history?.replaceState?.(null, '', `#${section.id}`);
      } catch {
        // Ignore SecurityError in sandboxed preview iframes
      }
    },
    [guideSlug]
  );

  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <nav
      data-testid="guide-mobile-scroll-depth-bar"
      aria-label="리포트 목차 바로가기 및 읽기 진행률"
      className="sticky top-[48px] md:top-[84px] z-20 w-full min-h-[56px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] px-3.5 py-2.5 space-y-2 transition-colors box-border"
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="inline-flex items-center gap-1.5 shrink-0">
          <ListTree size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-[11.5px] sm:text-xs font-extrabold text-primary">
            목차 바로가기
          </span>
        </div>

        <span
          data-testid="guide-scroll-progress-label"
          className={getVisualSignalPillClass(
            progressPct >= 75 ? 'safe' : progressPct >= 25 ? 'down' : 'neutral',
            'tabular-nums shrink-0'
          )}
        >
          <span>읽기 {progressPct}%</span>
        </span>
      </div>

      <div
        ref={chipListRef}
        data-testid="guide-toc-chip-list"
        className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain no-scrollbar py-0.5"
      >
        {sections.map((sec) => {
          const isActive = activeId === sec.id;
          return (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              title={sec.fullTitle || sec.label}
              data-section-id={sec.id}
              data-testid={`guide-toc-chip-${sec.id}`}
              aria-current={isActive ? 'location' : undefined}
              onClick={(e) => handleChipClick(e, sec)}
              className={getControlPillClass({
                active: isActive,
                extraClass: 'h-[30px] sm:h-[32px] px-2.5 sm:px-3 text-[11.5px] sm:text-[12px]',
              })}
            >
              <span>{sec.label}</span>
            </a>
          );
        })}
      </div>

      <div
        role="progressbar"
        aria-label="리포트 읽기 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
        data-testid="guide-scroll-progressbar"
        className="h-1 w-full rounded-full bg-[#f2f4f6] dark:bg-[#202027] overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-150 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </nav>
  );
});

export default GuideMobileScrollDepthBar;

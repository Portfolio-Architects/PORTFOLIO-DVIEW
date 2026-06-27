"use client";

import React, { useEffect, useState } from "react";
import FloatingUserBar from "./FloatingUserBar";

export interface PageHeroHeaderProps {
  readonly title: string;
  readonly subtitleStrong: string | React.ReactNode;
  readonly subtitleLight: string | React.ReactNode;
  readonly rightContent?: React.ReactNode;
  readonly rightSideContent?: React.ReactNode;
  readonly compactTitle?: string;
  readonly bottomContent?: React.ReactNode;
  readonly isTitleDiv?: boolean;
}

const PageHeroHeader = React.memo(function PageHeroHeader({
  title,
  subtitleStrong,
  subtitleLight,
  rightContent,
  rightSideContent,
  compactTitle,
  bottomContent,
  isTitleDiv,
}: PageHeroHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasModalOpen, setHasModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let scrollFrame: number | null = null;
    const handleScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 80);
        scrollFrame = null;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkModal = () => {
      const hash = window.location.hash;
      setHasModalOpen(
        hash.includes("apt=") ||
        hash.includes("post=") ||
        hash.includes("notice=")
      );
    };
    checkModal();
    window.addEventListener("hashchange", checkModal, { passive: true });
    return () => window.removeEventListener("hashchange", checkModal);
  }, []);

  const TitleTag = (isTitleDiv || hasModalOpen) ? "div" : "h1";

  return (
    <>
      {/* Compact Dynamic Sticky Header (Mobile Only) */}
      <div
        className={`fixed top-0 left-0 right-0 md:hidden z-30 bg-surface/95 backdrop-blur-md px-5 py-3 flex items-center justify-between transition-all duration-300 ${
          isScrolled
            ? "opacity-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            : "opacity-0 pointer-events-none"
        }`}
        style={{
          transform: isScrolled ? 'translate3d(0, 0, 0)' : 'translate3d(0, -100%, 0)',
          willChange: 'transform'
        }}
      >
        <div className="text-[16px] font-extrabold text-primary tracking-tight">
          {compactTitle || title}
        </div>
        <div className="flex items-center gap-3">
          <FloatingUserBar />
        </div>
      </div>

      {/* Standardized Hero Header */}
      <div className="min-h-[156px] sm:min-h-[144px] flex flex-col gap-[19px] sm:gap-[23px] px-4 sm:px-6 md:px-10 lg:px-16 pt-[20px] md:pt-6 lg:pt-8 pb-4 sm:pb-6 w-full bg-transparent border-b border-border/60 shrink-0 z-20 relative">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-[19px] sm:gap-[23px] w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-[12px] sm:rounded-[14px] bg-white border border-border flex items-center justify-center shrink-0 w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] shadow-sm overflow-hidden relative p-0.5 sm:p-1">
                  <img
                    src="/hwaseong-symbol.png"
                    alt="화성시 심볼"
                    className="w-full h-full object-contain"
                  />
                </div>
                <TitleTag className="font-extrabold text-primary tracking-tight leading-none whitespace-nowrap text-[22px] sm:text-[30px] lg:text-[36px] -translate-y-[1px] sm:-translate-y-[1.5px]">
                  {title}
                </TitleTag>
              </div>
              {rightContent}
            </div>
            
            <div className="md:hidden flex items-center justify-end absolute right-4 top-[34px]">
              <FloatingUserBar />
            </div>

            {/* Subtitle */}
            <div className="flex flex-col justify-end mb-0 sm:mb-0">
              <div className="flex w-full">
                <div className="w-[2px] rounded-full mr-4 shrink-0 bg-[#ea6100]" />
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-start flex-1 gap-1 sm:gap-2">
                  <strong className="text-primary text-[14px] sm:text-[16px] whitespace-nowrap">
                    {subtitleStrong}
                  </strong>
                  <div className="text-tertiary font-normal text-[13px] sm:text-[14.5px] leading-snug break-keep flex items-center flex-wrap gap-1 sm:gap-0 mt-0.5 sm:mt-0">
                    {typeof subtitleLight === 'string' ? (
                      <>
                        <span className="hidden sm:inline text-[#d1d6db] mr-1.5">—</span>
                        {subtitleLight}
                      </>
                    ) : (
                      subtitleLight
                    )}
                  </div>
                </div>
              </div>
            </div>

            {bottomContent && (
              <div className="mt-2 sm:mt-4">
                {bottomContent}
              </div>
            )}
          </div>

          {/* Right Side Content (e.g. Ad Banner) */}
          {rightSideContent && (
            <div className="hidden lg:block shrink-0">
              {rightSideContent}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

PageHeroHeader.displayName = 'PageHeroHeader';
export default PageHeroHeader;

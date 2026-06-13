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

export default function PageHeroHeader({
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkModal = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        setHasModalOpen(
          hash.includes("apt=") ||
          hash.includes("post=") ||
          hash.includes("notice=")
        );
      }
    };
    checkModal();
    window.addEventListener("hashchange", checkModal);
    return () => window.removeEventListener("hashchange", checkModal);
  }, []);

  const TitleTag = (isTitleDiv || hasModalOpen) ? "div" : "h1";

  return (
    <>
      {/* Compact Dynamic Sticky Header (Mobile Only) */}
      <div
        className={`fixed top-0 left-0 right-0 md:hidden z-30 bg-surface/95 backdrop-blur-md px-5 py-3 flex items-center justify-between transition-all duration-300 ${
          isScrolled
            ? "translate-y-0 opacity-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="text-[16px] font-extrabold text-primary tracking-tight">
          {compactTitle || title}
        </div>
        <div className="flex items-center gap-3">
          <FloatingUserBar />
        </div>
      </div>

      {/* Standardized Hero Header */}
      <div className="min-h-[156px] sm:min-h-[144px] flex flex-col gap-[19px] sm:gap-[23px] px-4 sm:px-6 md:px-10 lg:px-16 pt-[20px] md:pt-6 lg:pt-8 pb-4 sm:pb-6 w-full bg-surface border-b border-border shrink-0 z-20 relative">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-[19px] sm:gap-[23px] w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-[12px] sm:rounded-[14px] bg-white border border-border flex items-center justify-center shrink-0 w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] shadow-sm overflow-hidden relative p-0.5 sm:p-1">
                  <div className="relative w-full h-full">
                    {/* SVG Inline Logo to achieve 0ms RTT & Perfect LCP */}
                    <svg
                      viewBox="0 0 100 100"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-full h-full object-contain"
                    >
                       {/* 45-degree rotated rounded rect to create diamond background */}
                      <rect
                        x="16"
                        y="16"
                        width="68"
                        height="68"
                        rx="18"
                        transform="rotate(45 50 50)"
                        fill="url(#dview-logo-grad)"
                      />
                      {/* House icon centered and scaled inside the diamond */}
                      <g transform="translate(50 51.5) scale(0.8) translate(-50 -50)">
                        <path
                          d="M50 20L22 42.4V74C22 77.3 24.7 80 28 80H42V58H58V80H72C75.3 80 78 77.3 78 74V42.4L50 20Z"
                          fill="#FFFFFF"
                        />
                      </g>
                    </svg>
                  </div>
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
                <div className="w-[2px] rounded-full mr-4 shrink-0 bg-[#00d29d]" />
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
}

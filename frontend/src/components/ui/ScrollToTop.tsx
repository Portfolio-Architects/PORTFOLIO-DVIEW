'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = (e: Event) => {
      const target = e.target;
      let scrollTop = 0;
      
      if (target === document) {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
      } else if (target instanceof HTMLElement) {
        scrollTop = target.scrollTop;
      }

      // 출현 시점 단축: 120px 이상 스크롤 시 버튼 노출
      if (scrollTop > 120) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Use capture phase (true) to intercept scroll events from nested scroll containers like modal backdrops
    window.addEventListener('scroll', toggleVisibility, true);
    return () => window.removeEventListener('scroll', toggleVisibility, true);
  }, []);

  const scrollToTop = () => {
    // Try to find if there is an active scrollable modal backdrop
    const modalBackdrops = document.querySelectorAll('.fixed.overflow-y-auto');
    const scrolledModal = Array.from(modalBackdrops).find(
      (el) => el instanceof HTMLElement && el.scrollTop > 50
    ) as HTMLElement | undefined;

    if (scrolledModal) {
      scrolledModal.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed right-5 bottom-24 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border border-border/40 cursor-pointer active:scale-90 md:hidden ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100 bg-[#008262] text-white dark:bg-[#00d29d] dark:text-[#191f28]' 
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
      aria-label="최상단으로 스크롤"
    >
      <ChevronUp size={24} strokeWidth={2.5} />
    </button>
  );
}

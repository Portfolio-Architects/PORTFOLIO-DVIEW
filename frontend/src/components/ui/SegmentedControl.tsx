'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  DVIEW_CONTROL_CLASSES,
  getToggleTrackClass,
  type ControlSize,
} from '@/lib/design-system/controls';

interface Option<T> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
  size?: ControlSize;
}

function SegmentedControlInner<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
  disabled = false,
  size = 'md',
}: SegmentedControlProps<T>) {
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const optionsKey = options.map((opt) => `${opt.label}-${opt.value}`).join('|');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMounted) return;

    const updateSlider = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (activeTabRef.current && containerRef.current) {
          const activeRect = activeTabRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          
          const left = activeRect.left - containerRect.left + containerRef.current.scrollLeft;
          const width = activeRect.width;
          
          setSliderStyle({
            transform: `translateX(${left}px)`,
            width: `${width}px`,
          });
        }
      });
    };

    // Run update on frame to avoid layout thrashing
    const timer = setTimeout(updateSlider, 20);
    window.addEventListener('resize', updateSlider, { passive: true });
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSlider);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, optionsKey, isMounted]);

  return (
    <div
      ref={containerRef}
      className={getToggleTrackClass(
        `relative overflow-x-auto no-scrollbar max-w-full ${
          disabled ? 'opacity-60 pointer-events-none' : ''
        } ${className}`
      )}
    >
      {/* Sliding Background */}
      {isMounted && (
        <div
          className="absolute top-[3px] bottom-[3px] left-0 bg-surface dark:bg-[#2c2c35] rounded-[7px] shadow-xs transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={sliderStyle}
        />
      )}
      
      {/* Options Buttons */}
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={isActive ? activeTabRef : null}
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            className={`${DVIEW_CONTROL_CLASSES.btnBase} ${DVIEW_CONTROL_CLASSES.btnSize[size]} relative flex-1 z-10 border-none outline-none bg-transparent ${
              disabled ? 'cursor-not-allowed text-tertiary' : 'cursor-pointer'
            } ${
              isActive ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-secondary hover:text-primary'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const SegmentedControl = React.memo(SegmentedControlInner) as (<T extends string | number>(
  props: SegmentedControlProps<T>
) => React.ReactElement) & { displayName?: string };

SegmentedControl.displayName = 'SegmentedControl';

export default SegmentedControl;

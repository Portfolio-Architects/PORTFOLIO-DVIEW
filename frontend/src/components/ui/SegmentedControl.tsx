'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Option<T> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

function SegmentedControlInner<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const updateSlider = () => {
      if (activeTabRef.current && containerRef.current) {
        const activeRect = activeTabRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        const left = activeRect.left - containerRect.left;
        const width = activeRect.width;
        
        setSliderStyle({
          transform: `translateX(${left}px)`,
          width: `${width}px`,
        });
      }
    };

    // Run update on frame to avoid layout thrashing
    const timer = setTimeout(updateSlider, 20);
    window.addEventListener('resize', updateSlider);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSlider);
    };
  }, [value, options, isMounted]);

  return (
    <div
      ref={containerRef}
      className={`relative flex bg-[#f2f4f6] dark:bg-[#151b26]/50 p-0.5 rounded-xl shrink-0 overflow-hidden shadow-inner select-none ${className}`}
    >
      {/* Sliding Background */}
      {isMounted && (
        <div
          className="absolute top-0.5 bottom-0.5 left-0 bg-surface rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
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
            onClick={() => onChange(opt.value)}
            className={`relative flex-1 z-10 px-4 py-1.5 rounded-lg text-[13.5px] font-extrabold text-center whitespace-nowrap border-none outline-none transition-colors duration-200 cursor-pointer bg-transparent ${
              isActive ? 'text-primary' : 'text-tertiary hover:text-secondary'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const SegmentedControl = React.memo(SegmentedControlInner) as <T extends string | number>(
  props: SegmentedControlProps<T>
) => React.ReactElement;

(SegmentedControl as any).displayName = 'SegmentedControl';

export default SegmentedControl;

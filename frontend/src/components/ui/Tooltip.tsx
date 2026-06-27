'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<any>;
  delay?: number; // delay in ms (default: 300ms)
  className?: string;
}

export const Tooltip = React.memo(function Tooltip({ content, children, delay = 300, className = '' }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'top' });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const idRef = useRef<string>('');

  useEffect(() => {
    idRef.current = 'tooltip-' + Math.random().toString(36).substring(2, 9);
  }, []);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (typeof window === 'undefined') return;
      if (!triggerRef.current || !tooltipRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      const tooltipHeight = tooltipRect.height || 36;
      const tooltipWidth = tooltipRect.width || 180;
      
      // Default: centered at the top of target
      let left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
      let top = triggerRect.top - tooltipHeight - 8; // 8px margin
      let placement = 'top';

      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      const viewportWidth = window.innerWidth;
      const padding = 12; // viewport safety padding

      // Prevent spilling left edge
      if (left < padding) {
        left = padding;
      }
      // Prevent spilling right edge
      else if (left + tooltipWidth > viewportWidth - padding) {
        left = viewportWidth - tooltipWidth - padding;
      }

      // Prevent spilling top edge
      if (triggerRect.top - tooltipHeight - padding < 0) {
        top = triggerRect.bottom + 8; // flip to bottom
        placement = 'bottom';
      }

      setCoords({
        top: top + scrollY,
        left: left + scrollX,
        placement
      });
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isOpen) {
      // Small timeout to allow tooltip DOM mount and bounding rect calculation
      const renderTimer = setTimeout(() => {
        updatePosition();
      }, 0);

      window.addEventListener('resize', updatePosition, { passive: true });
      window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
      
      return () => {
        clearTimeout(renderTimer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [isOpen, updatePosition]);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpen(false);
  };

  const handleFocus = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpen(true);
  };

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Clone child to inject event listeners securely without losing existing refs
  const childRef = (children as any).ref || null;
  const setRefs = (node: HTMLElement | null) => {
    (triggerRef as any).current = node;
    if (childRef) {
      if (typeof childRef === 'function') {
        childRef(node);
      } else if (childRef && 'current' in childRef) {
        // eslint-disable-next-line react-hooks/immutability
        childRef.current = node;
      }
    }
  };

  // Determine if children element is naturally focusable to avoid redundant tabIndex
  const isFocusableElement = (type: unknown): boolean => {
    if (typeof type !== 'string') return true;
    return ['button', 'a', 'input', 'select', 'textarea', 'area'].includes(type);
  };

  const clonedChild = React.cloneElement(children, {
    ref: setRefs,
    onMouseEnter: (e: React.MouseEvent) => {
      if (children.props.onMouseEnter) children.props.onMouseEnter(e);
      handleMouseEnter();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      if (children.props.onMouseLeave) children.props.onMouseLeave(e);
      handleMouseLeave();
    },
    onFocus: (e: React.FocusEvent) => {
      if (children.props.onFocus) children.props.onFocus(e);
      handleFocus();
    },
    onBlur: (e: React.FocusEvent) => {
      if (children.props.onBlur) children.props.onBlur(e);
      handleBlur();
    },
    onTouchStart: (e: React.TouchEvent) => {
      if (children.props.onTouchStart) children.props.onTouchStart(e);
      // Toggle on touch devices
      setIsOpen((prev) => !prev);
    },
    'aria-describedby': isOpen ? idRef.current : children.props['aria-describedby'],
    tabIndex: children.props.tabIndex !== undefined
      ? children.props.tabIndex
      : (isFocusableElement(children.type) ? undefined : 0)
  });

  return (
    <>
      {clonedChild}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          id={idRef.current}
          aria-live="polite"
          role="tooltip"
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 20000,
          }}
          className={`pointer-events-none px-3.5 py-2 bg-[#1e293b]/95 dark:bg-[#0f172a]/95 text-white text-[11px] font-bold rounded-xl shadow-xl max-w-[280px] break-keep text-center animate-tooltip-spring transition-opacity select-none border border-white/10 ${className}`}
        >
          <div className="relative z-10">{content}</div>
          {/* Spring Arrow indicator */}
          <div 
            style={{
              left: triggerRef.current 
                ? `${Math.min(
                    Math.max(
                      triggerRef.current.getBoundingClientRect().left + triggerRef.current.getBoundingClientRect().width / 2 - coords.left,
                      8
                    ),
                    (tooltipRef.current?.getBoundingClientRect().width || 180) - 8
                  )}px` 
                : '50%'
            }}
            className={`absolute -translate-x-1/2 border-4 border-transparent transition-all ${
              coords.placement === 'top'
                ? 'top-full border-t-[#1e293b]/95 dark:border-t-[#0f172a]/95'
                : 'bottom-full border-b-[#1e293b]/95 dark:border-b-[#0f172a]/95'
            }`}
          />
        </div>,
        document.body
      )}
    </>
  );
});

Tooltip.displayName = 'Tooltip';

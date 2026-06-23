'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { logger } from '@/lib/services/logger';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  pullThreshold?: number;
  scrollContainerId?: string;
  disabled?: boolean;
}

const PullToRefresh = React.memo(function PullToRefresh({ 
  children, 
  onRefresh,
  pullThreshold = 80,
  scrollContainerId,
  disabled = false
}: PullToRefreshProps) {
  const router = useRouter();
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);
  const mountedRef = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onRefreshRef = useRef(onRefresh);

  // Sync state with refs for event listener stability
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  useEffect(() => {
    progressRef.current = pullProgress;
  }, [pullProgress]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const getScrollTop = () => {
      if (scrollContainerId) {
        const el = document.getElementById(scrollContainerId);
        if (el) return el.scrollTop;
      }
      return window.scrollY;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull-to-refresh if we are at the very top of the scroll container
      if (getScrollTop() > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (disabled || startY.current === null || isRefreshingRef.current) return;
      
      const y = e.touches[0].clientY;
      const deltaY = y - startY.current;

      if (deltaY > 0 && getScrollTop() === 0) {
        // We are pulling down
        setIsPulling(true);
        // Add some resistance
        const progress = Math.min((deltaY / pullThreshold) * 100, 150);
        setPullProgress(progress);
        
        // Prevent default browser scroll/refresh behavior
        if (e.cancelable) {
          try {
            e.preventDefault();
          } catch (err) {
            logger.warn('PullToRefresh.handleTouchMove', 'Failed to preventDefault on touchmove', undefined, err);
          }
        }
      }
    };

    const handleTouchEnd = async () => {
      if (startY.current === null) return;
      
      if (progressRef.current >= 100 && !isRefreshingRef.current) {
        if (mountedRef.current) {
          setIsRefreshing(true);
          setPullProgress(100); // Lock it at 100% while refreshing
        }
        
        try {
          if (onRefreshRef.current) {
            await onRefreshRef.current();
          } else {
            // Fallback to Next.js router refresh
            router.refresh();
            // Artificial delay for better UX
            await new Promise<void>(resolve => {
              refreshTimeoutRef.current = setTimeout(resolve, 800);
            });
          }
        } catch (error) {
          logger.error('PullToRefresh.handleTouchEnd', 'Refresh failed', undefined, error);
        } finally {
          if (mountedRef.current) {
            setIsRefreshing(false);
            setIsPulling(false);
            setPullProgress(0);
          }
          startY.current = null;
        }
      } else {
        if (mountedRef.current) {
          setIsPulling(false);
          setPullProgress(0);
        }
        startY.current = null;
      }
    };

    const handleTouchCancel = () => {
      if (isRefreshingRef.current) return;
      setIsPulling(false);
      setPullProgress(0);
      startY.current = null;
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });
      element.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    }

    return () => {
      if (element) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
        element.removeEventListener('touchcancel', handleTouchCancel);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [disabled, scrollContainerId, pullThreshold, router]);

  return (
    <div ref={contentRef} className="min-h-screen">
      {/* PTR Indicator */}
      <div 
        className="fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `translateY(${Math.min(pullProgress * 0.6 - 40, 20)}px)`,
          opacity: Math.min(pullProgress / 100, 1),
        }}
      >
        <div className="bg-surface rounded-full p-2.5 shadow-md flex items-center justify-center">
          <RefreshCw 
            size={20} 
            className={`text-emerald-500 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshing ? 'none' : `rotate(${pullProgress * 3.6}deg)`
            }}
          />
        </div>
      </div>
      
      {/* Content wrapper. Moves down slightly when pulled */}
      <div 
        className="transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: isPulling || isRefreshing ? `translateY(${Math.min(pullProgress * 0.4, 40)}px)` : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
});

PullToRefresh.displayName = 'PullToRefresh';
export default PullToRefresh;

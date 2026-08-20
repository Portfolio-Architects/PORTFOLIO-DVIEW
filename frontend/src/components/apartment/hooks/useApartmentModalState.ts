import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseApartmentModalStateProps {
  initialActiveTab?: string;
}

export function useApartmentModalState({ initialActiveTab = 'sec-price-overview' }: UseApartmentModalStateProps = {}) {
  const [activeTab, setActiveTab] = useState<string>(initialActiveTab);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<'all-link' | 'summary' | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isToolDropdownOpen, setIsToolDropdownOpen] = useState(false);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);

  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shareActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const toolDropdownRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const animTimer = setTimeout(() => {
      if (mountedRef.current) setIsAnimationFinished(true);
    }, 300);

    return () => {
      mountedRef.current = false;
      clearTimeout(animTimer);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      if (shareActionTimeoutRef.current) clearTimeout(shareActionTimeoutRef.current);
    };
  }, []);

  // Close tool dropdown on click outside
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    function handleClickOutside(event: MouseEvent) {
      if (toolDropdownRef.current && !toolDropdownRef.current.contains(event.target as Node)) {
        setIsToolDropdownOpen(false);
      }
    }
    if (isToolDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToolDropdownOpen]);

  return {
    activeTab,
    setActiveTab,
    isSharing,
    setIsSharing,
    copiedStatus,
    setCopiedStatus,
    isPhotoModalOpen,
    setIsPhotoModalOpen,
    isPushModalOpen,
    setIsPushModalOpen,
    isToolDropdownOpen,
    setIsToolDropdownOpen,
    isAnimationFinished,
    copiedTimeoutRef,
    shareActionTimeoutRef,
    shareCardRef,
    toolDropdownRef,
    mountedRef,
  };
}

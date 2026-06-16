'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

type AreaUnit = 'm2' | 'pyeong';
type Theme = 'light' | 'dark' | 'system';

const AreaUnitSchema = z.enum(['m2', 'pyeong']);
const ThemeSchema = z.enum(['light', 'dark', 'system']);

interface SettingsValueContextType {
  areaUnit: AreaUnit;
  setAreaUnit: (unit: AreaUnit) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

interface SettingsUiContextType {
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SettingsValueContext = React.createContext<SettingsValueContextType | undefined>(undefined);
const SettingsUiContext = React.createContext<SettingsUiContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [areaUnit, setAreaUnitState] = useState<AreaUnit>('m2');
  const [theme, setThemeState] = useState<Theme>('light');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Helper to safely access localStorage (handles SecurityError when cookies/localStorage are disabled or restricted by the browser security sandbox)
  const safeGetItem = (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch (e) {
      logger.warn('SettingsProvider.safeGetItem', 'localStorage getItem failed due to security or sandbox restriction', { key }, e as Error);
      return null;
    }
  };

  const safeSetItem = (key: string, value: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      logger.warn('SettingsProvider.safeSetItem', 'localStorage setItem failed due to security or sandbox restriction', { key, value }, e as Error);
      return false;
    }
  };

  // 1. Safely apply theme to HTML element class (with SSR/SSG safety guards)
  const applyTheme = (targetTheme: Theme) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    try {
      const root = document.documentElement;
      let isDark = targetTheme === 'dark';
      
      if (targetTheme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    } catch (err) {
      logger.error('SettingsProvider.applyTheme', 'Failed to toggle html class', {}, err as Error);
    }
  };

  // 2. Load settings on client mount (avoids SSG hydration mismatch)
  useEffect(() => {
    setMounted(true);
    
    // Restore area unit
    try {
      const storedArea = safeGetItem('dtdls-area-unit');
      const parsedArea = AreaUnitSchema.safeParse(storedArea);
      if (parsedArea.success) {
        setAreaUnitState(parsedArea.data);
      }
    } catch (e) {
      logger.warn('SettingsProvider.init', 'localStorage areaUnit read failed', {}, e as Error);
    }

    // Restore theme preference
    try {
      const storedTheme = safeGetItem('dtdls-theme') || 'system';
      const parsedTheme = ThemeSchema.safeParse(storedTheme);
      const activeTheme = parsedTheme.success ? parsedTheme.data : 'system';
      setThemeState(activeTheme);
      applyTheme(activeTheme);
    } catch (e) {
      logger.warn('SettingsProvider.init', 'localStorage theme read failed', {}, e as Error);
    }
  }, []);

  // 3. System theme change listener (only active for system preference)
  useEffect(() => {
    if (!mounted || theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('system');
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [mounted, theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    safeSetItem('dtdls-theme', newTheme);
  };

  const setAreaUnit = (unit: AreaUnit) => {
    setAreaUnitState(unit);
    safeSetItem('dtdls-area-unit', unit);
  };

  return (
    <SettingsValueContext.Provider value={{ areaUnit, setAreaUnit, theme, setTheme }}>
      <SettingsUiContext.Provider value={{ isSettingsModalOpen, setIsSettingsModalOpen }}>
        {children}
      </SettingsUiContext.Provider>
    </SettingsValueContext.Provider>
  );
}

export function useSettingsValues() {
  const context = React.useContext(SettingsValueContext);
  if (context === undefined) {
    throw new Error('useSettingsValues must be used within a SettingsProvider');
  }
  return context;
}

export function useSettingsUi() {
  const context = React.useContext(SettingsUiContext);
  if (context === undefined) {
    throw new Error('useSettingsUi must be used within a SettingsProvider');
  }
  return context;
}

export function useSettings() {
  const valueContext = React.useContext(SettingsValueContext);
  const uiContext = React.useContext(SettingsUiContext);
  if (valueContext === undefined || uiContext === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return {
    ...valueContext,
    ...uiContext,
  };
}

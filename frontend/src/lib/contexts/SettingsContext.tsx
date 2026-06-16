'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

type AreaUnit = 'm2' | 'pyeong';
type Theme = 'light' | 'dark' | 'system';

const AreaUnitSchema = z.enum(['m2', 'pyeong']);
const ThemeSchema = z.enum(['light', 'dark', 'system']);

interface SettingsContextType {
  areaUnit: AreaUnit;
  setAreaUnit: (unit: AreaUnit) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [areaUnit, setAreaUnitState] = useState<AreaUnit>('m2');
  const [theme, setThemeState] = useState<Theme>('light');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
      const storedArea = localStorage.getItem('dtdls-area-unit');
      const parsedArea = AreaUnitSchema.safeParse(storedArea);
      if (parsedArea.success) {
        setAreaUnitState(parsedArea.data);
      }
    } catch (e) {
      logger.warn('SettingsProvider.init', 'localStorage areaUnit read failed', {}, e as Error);
    }

    // Restore theme preference
    try {
      const storedTheme = localStorage.getItem('dtdls-theme') || 'system';
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
    try {
      localStorage.setItem('dtdls-theme', newTheme);
    } catch (e) {
      logger.warn('SettingsProvider.setTheme', 'Failed to save theme to localStorage', { newTheme }, e as Error);
    }
  };

  const setAreaUnit = (unit: AreaUnit) => {
    setAreaUnitState(unit);
    try {
      localStorage.setItem('dtdls-area-unit', unit);
    } catch (e) {
      logger.warn('SettingsProvider.setAreaUnit', 'Failed to save areaUnit to localStorage', { unit }, e as Error);
    }
  };

  return (
    <SettingsContext.Provider value={{ areaUnit, setAreaUnit, theme, setTheme, isSettingsModalOpen, setIsSettingsModalOpen }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

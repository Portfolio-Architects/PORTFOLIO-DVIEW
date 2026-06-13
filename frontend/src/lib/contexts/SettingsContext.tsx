'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

type AreaUnit = 'm2' | 'pyeong';

const AreaUnitSchema = z.enum(['m2', 'pyeong']);


interface SettingsContextType {
  areaUnit: AreaUnit;
  setAreaUnit: (unit: AreaUnit) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [areaUnit, setAreaUnitState] = useState<AreaUnit>('m2');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dtdls-area-unit');
      const parsed = AreaUnitSchema.safeParse(stored);
      if (parsed.success) {
        setTimeout(() => {
          setAreaUnitState(parsed.data);
        }, 0);
      } else if (stored !== null) {
        logger.warn('SettingsProvider.init', 'Invalid area unit stored in localStorage', { stored });
      }
    } catch (e) {
      logger.warn('SettingsProvider.init', 'localStorage is blocked or unavailable', {}, e as Error);
    }
  }, []);

  const setAreaUnit = (unit: AreaUnit) => {
    setAreaUnitState(unit);
    try {
      localStorage.setItem('dtdls-area-unit', unit);
    } catch (e) {
      logger.warn('SettingsProvider.setAreaUnit', 'Failed to save areaUnit to localStorage', { unit }, e as Error);
    }
  };

  return (
    <SettingsContext.Provider value={{ areaUnit, setAreaUnit, isSettingsModalOpen, setIsSettingsModalOpen }}>
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

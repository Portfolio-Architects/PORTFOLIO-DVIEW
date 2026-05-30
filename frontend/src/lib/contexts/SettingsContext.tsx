'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type AreaUnit = 'm2' | 'pyeong';

interface SettingsContextType {
  areaUnit: AreaUnit;
  setAreaUnit: (unit: AreaUnit) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (isOpen: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [areaUnit, setAreaUnitState] = useState<AreaUnit>('m2');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dtdls-area-unit');
      if (stored === 'm2' || stored === 'pyeong') {
        setTimeout(() => {
          setAreaUnitState(stored);
        }, 0);
      }
    } catch (e) {
      console.warn('localStorage is blocked or unavailable:', e);
    }
  }, []);

  const setAreaUnit = (unit: AreaUnit) => {
    setAreaUnitState(unit);
    try {
      localStorage.setItem('dtdls-area-unit', unit);
    } catch (e) {
      console.warn('Failed to save areaUnit to localStorage:', e);
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

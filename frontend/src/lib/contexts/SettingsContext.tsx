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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('dtdls-area-unit');
    if (stored === 'm2' || stored === 'pyeong') {
      setAreaUnitState(stored);
    }
  }, []);

  const setAreaUnit = (unit: AreaUnit) => {
    setAreaUnitState(unit);
    localStorage.setItem('dtdls-area-unit', unit);
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

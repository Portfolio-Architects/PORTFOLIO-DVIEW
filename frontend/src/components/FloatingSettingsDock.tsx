'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { useSettings } from '@/lib/contexts/SettingsContext';

export default function FloatingSettingsDock() {
  const { setIsSettingsModalOpen } = useSettings();

  return (
    <div className="hidden md:flex fixed bottom-8 right-8 z-50">
      <button
        onClick={() => setIsSettingsModalOpen(true)}
        className="w-14 h-14 bg-surface rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border flex items-center justify-center text-secondary hover:text-toss-blue hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] transition-all duration-300 group"
        aria-label="설정"
      >
        <Settings size={24} className="group-hover:rotate-45 transition-transform duration-300" />
      </button>
    </div>
  );
}

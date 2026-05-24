import React from 'react';
import { Sparkles } from 'lucide-react';

interface NativeAdPlaceholderProps {
  location: string;
  onClick?: () => void;
}

export function NativeAdPlaceholder({ location, onClick }: NativeAdPlaceholderProps) {
  return (
    <div 
      className="w-full bg-gradient-to-br from-[#e8f3ff]/50 to-[#f0f4f8]/50 rounded-[20px] px-5 border border-border border-dashed flex flex-row items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer h-[78px] md:h-[86px]"
      onClick={onClick}
    >
      <div className="absolute top-1.5 right-3 text-[8px] font-bold text-tertiary/60 uppercase tracking-widest sm:hidden">
        Sponsored
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 flex-1 min-w-0 text-left">
        <h4 className="text-[14px] sm:text-[15px] md:text-[16px] font-extrabold text-primary group-hover:text-toss-blue transition-colors leading-tight shrink-0">
          D-VIEW 프리미엄 파트너 공간
        </h4>
        <span className="hidden sm:inline text-tertiary/40">—</span>
        <p className="text-[11px] sm:text-[12.5px] font-medium text-secondary truncate">
          [{location}] 제휴 및 광고 문의를 남겨주세요
        </p>
      </div>
      <div className="hidden sm:block text-[10px] font-bold text-tertiary/60 uppercase tracking-widest shrink-0 ml-4">
        Sponsored
      </div>
    </div>
  );
}

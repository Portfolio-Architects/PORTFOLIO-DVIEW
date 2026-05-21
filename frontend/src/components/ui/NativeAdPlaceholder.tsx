import React from 'react';
import { Sparkles } from 'lucide-react';

interface NativeAdPlaceholderProps {
  location: string;
  onClick?: () => void;
}

export function NativeAdPlaceholder({ location, onClick }: NativeAdPlaceholderProps) {
  return (
    <div 
      className="w-full bg-gradient-to-br from-[#e8f3ff]/50 to-[#f0f4f8]/50 rounded-2xl p-5 md:p-6 border border-border border-dashed flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer min-h-[104px]"
      onClick={onClick}
    >
      <div className="absolute top-2 right-3 text-[10px] font-bold text-tertiary/60 uppercase tracking-widest">
        Sponsored
      </div>
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
        <Sparkles className="w-6 h-6 text-toss-blue" />
      </div>
      <h4 className="text-[15px] md:text-[16px] font-extrabold text-primary mb-1 group-hover:text-toss-blue transition-colors">
        D-VIEW 프리미엄 파트너 공간
      </h4>
      <p className="text-[13px] font-medium text-secondary">
        [{location}] 제휴 및 광고 문의를 남겨주세요
      </p>
    </div>
  );
}

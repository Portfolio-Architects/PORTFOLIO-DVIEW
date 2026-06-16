'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { DONGS, getDongByName } from '@/lib/dongs';

interface DongFilterBarProps {
  selectedDong: string | null;
  onSelectDong: (dong: string | null) => void;
  totalAptCount: number;
  dongAptCounts: Record<string, number>;
  dongReportCounts: Record<string, number>;
  listSort: 'views' | 'likes' | 'name' | 'price-rank' | 'valuation' | 'total-price';
  onSortChange: (sort: 'views' | 'likes' | 'name' | 'price-rank' | 'valuation' | 'total-price') => void;
}

const DongFilterBar = memo(function DongFilterBar({
  selectedDong,
  onSelectDong,
  totalAptCount,
  dongAptCounts,
  dongReportCounts,
  listSort,
  onSortChange,
}: DongFilterBarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const dongInfo = selectedDong ? getDongByName(selectedDong) : null;
  const currentCount = selectedDong ? (dongAptCounts[selectedDong] || 0) : totalAptCount;
  const currentLabel = selectedDong || '전체';

  return (
    <div className="flex items-center justify-between gap-3">
      {/* 좌: 동 드롭다운 */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all border border-border bg-surface hover:border-toss-gray shadow-sm text-primary"
          style={dongInfo ? { borderColor: dongInfo.color, color: dongInfo.color } : {}}
        >
          {dongInfo && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dongInfo.color }} />}
          {currentLabel}
          <span className="text-tertiary font-medium">({currentCount})</span>
          <ChevronDown size={14} className={`text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* 드롭다운 메뉴 */}
        {open && (
          <div className="absolute top-full left-0 mt-1.5 bg-surface border border-border rounded-xl shadow-lg z-50 min-w-[200px] py-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => { onSelectDong(null); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-[13px] font-bold transition-colors flex items-center justify-between ${
                !selectedDong ? 'bg-body text-primary' : 'text-secondary hover:bg-body'
              }`}
            >
              <span>전체</span>
              <span className="text-[11px] text-tertiary font-medium">{totalAptCount}</span>
            </button>
            {DONGS.map(dong => {
              const aptCount = dongAptCounts[dong.name] || 0;
              if (aptCount === 0) return null;
              const isActive = selectedDong === dong.name;
              return (
                <button
                  key={dong.id}
                  onClick={() => { onSelectDong(isActive ? null : dong.name); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-[13px] font-bold transition-colors flex items-center justify-between ${
                    isActive ? 'text-surface' : 'text-secondary hover:bg-body'
                  }`}
                  style={isActive ? { backgroundColor: dong.color } : {}}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dong.color }} />
                    {dong.name}
                  </span>
                  <span className={`text-[11px] font-medium ${isActive ? 'text-surface/70' : 'text-tertiary'}`}>{aptCount}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 우: 정렬 탭 */}
      <div className="flex items-center gap-1 bg-body rounded-lg p-1 overflow-x-auto custom-scrollbar whitespace-nowrap shrink max-w-[65vw]">
        {[
          { id: 'total-price' as const, label: '매매가순' },
          { id: 'price-rank' as const, label: '평당가순' },
          { id: 'valuation' as const, label: '전세가율순' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => onSortChange(s.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 ${
              listSort === s.id ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export default DongFilterBar;

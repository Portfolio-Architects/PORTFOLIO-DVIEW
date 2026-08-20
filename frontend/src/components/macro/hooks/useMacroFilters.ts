import { useState, useEffect, useMemo } from 'react';
import type { DongApartment } from '@/lib/dong-apartments';

export interface UseMacroFiltersProps {
  sheetApartments?: Record<string, DongApartment[]>;
}

export function useMacroFilters({ sheetApartments }: UseMacroFiltersProps) {
  const [gapRankingDong, setGapRankingDong] = useState<string>("전체");
  const [timelineDongFilter, setTimelineDongFilter] = useState<string>("전체");
  const [timelineAptFilter, setTimelineAptFilter] = useState<string>("전체");
  const [timeframe, setTimeframe] = useState<"3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL">("3Y");

  useEffect(() => {
    setTimelineAptFilter("전체");
  }, [timelineDongFilter]);

  const availableDongs = useMemo(() => {
    if (!sheetApartments) return [];
    return Object.keys(sheetApartments).sort();
  }, [sheetApartments]);

  const availableApts = useMemo(() => {
    if (!sheetApartments) return [];
    if (timelineDongFilter !== "전체") {
      return (sheetApartments[timelineDongFilter] || []).map(a => a.name).sort();
    }
    return Object.values(sheetApartments).flat().map(a => a.name).sort();
  }, [sheetApartments, timelineDongFilter]);

  return {
    gapRankingDong,
    setGapRankingDong,
    timelineDongFilter,
    setTimelineDongFilter,
    timelineAptFilter,
    setTimelineAptFilter,
    timeframe,
    setTimeframe,
    availableDongs,
    availableApts,
  };
}

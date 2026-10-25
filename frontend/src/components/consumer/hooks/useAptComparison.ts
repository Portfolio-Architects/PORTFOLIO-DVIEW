'use client';

import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, LocationScoreItem } from '@/types/transaction';
import type { FieldReportData, ObjectiveMetrics } from '@/types/report';
import { findTxKey, normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { localCache } from '@/lib/utils/localCache';
import { ViewedAptsSchema, QuizAnswerSchema } from '@/lib/validation/facade.schemas';
import { BUILD_VERSION } from '@/lib/build-version';
import { logger } from '@/lib/services/logger';
import type { ComparisonMetrics, QuizAnswers } from '../compare/CompareSpecTable';
import type { RadarDataPoint } from '../compare/CompareRadarChart';
import type { CombinedChartPoint } from '../compare/ComparePriceHistoryChart';

export interface TxDataPoint {
  contractYm: string;
  price: number;
  dealType: string;
  deposit?: number;
  areaPyeong: number;
}

export type PriceMetricMode = 'absolute' | 'perPyeong';
export type ChartDealType = 'sale' | 'jeonse';

export interface UseAptComparisonOptions {
  isOpen?: boolean;
  initialAptName?: string;
  initialAptIds?: string[];
  sheetApartments?: Record<string, DongApartment[]>;
  txSummaryData?: Record<string, AptTxSummary>;
  nameMapping?: Record<string, string>;
  fieldReportsMap?: ReadonlyMap<string, FieldReportData> | Map<string, FieldReportData>;
  locationScores?: Record<string, LocationScoreItem>;
  initialPriceMetric?: PriceMetricMode;
  initialChartType?: ChartDealType;
  maxApartments?: number;
}

export interface MetricWins {
  subway: boolean | null;
  elementary: boolean | null;
  middle: boolean | null;
  high: boolean | null;
  starbucks: boolean | null;
  oliveYoung: boolean | null;
  indeokwon: boolean | null;
  tram: boolean | null;
  park: boolean | null;
  households: boolean | null;
  year: boolean | null;
  parking: boolean | null;
  price: boolean | null;
  rent: boolean | null;
  ratio: boolean | null;
  perPyeong: boolean | null;
  [key: string]: boolean | null;
}

export interface AiFitScores {
  score1: number;
  score2: number;
  winner: 'apt1' | 'apt2' | null;
}

export interface AptComparisonState {
  // Canonical contracts (PROJECT.md)
  apartments: DongApartment[];
  isLoading: boolean;
  error: Error | null;
  selectedAptIds: string[];
  addApartment: (aptId: string) => void;
  removeApartment: (aptId: string) => void;

  // Slot-based accessors
  apt1: DongApartment | null;
  apt2: DongApartment | null;
  setApt1: (apt: DongApartment | null) => void;
  setApt2: (apt: DongApartment | null) => void;
  apt1Label: string;
  apt2Label: string;

  // Search & autocomplete
  searchQuery1: string;
  setSearchQuery1: (val: string) => void;
  searchQuery2: string;
  setSearchQuery2: (val: string) => void;
  isFocused1: boolean;
  setIsFocused1: (val: boolean) => void;
  isFocused2: boolean;
  setIsFocused2: (val: boolean) => void;
  activeIndex1: number;
  setActiveIndex1: React.Dispatch<React.SetStateAction<number>>;
  activeIndex2: number;
  setActiveIndex2: React.Dispatch<React.SetStateAction<number>>;
  dropdownOptions1: DongApartment[];
  dropdownOptions2: DongApartment[];
  handleKeyDown1: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleKeyDown2: (e: React.KeyboardEvent<HTMLInputElement>) => void;

  // Cache & preferences
  recentApts: DongApartment[];
  saveToRecent: (apt: DongApartment | DongApartment[]) => void;
  quizAnswers: QuizAnswers | null;
  priceMetric: PriceMetricMode;
  setPriceMetric: (val: PriceMetricMode) => void;
  chartType: ChartDealType;
  setChartType: (val: ChartDealType) => void;

  // Transaction data
  txData1: TxDataPoint[];
  txData2: TxDataPoint[];
  isTxLoading: boolean;
  isTxLoading1: boolean;
  isTxLoading2: boolean;

  // Derived comparison metrics
  metrics1: ComparisonMetrics | null;
  metrics2: ComparisonMetrics | null;
  wins: MetricWins;
  score: { apt1: number; apt2: number };
  aiFitScores: AiFitScores;

  // Charts
  radarChartData: Array<{ subject: string; [label: string]: number | string }>;
  radarDataPoints: RadarDataPoint[];
  combinedChartData: CombinedChartPoint[];
  yAxisDomain: [number | string, number | string];

  // Helpers
  displayPrice: (val: number) => string;
  formatYearBuilt: (rawYb: string | number | undefined, yb: number) => string;
  getCompareClass: (isApt1: boolean, winValue: boolean | null) => string;
}

export function getEffectiveMetrics(
  apt: DongApartment | null | undefined,
  report: FieldReportData | undefined,
  locationScores?: Record<string, LocationScoreItem>,
  nameMapping?: Record<string, string>
) {
  if (!apt || typeof apt !== 'object') {
    return {
      brand: '',
      householdCount: 800,
      parkingPerHousehold: 1.25,
      yearBuilt: 2018,
      rawYearBuilt: 2018,
      distanceToSubway: 2000,
      distanceToElementary: 350,
      distanceToMiddle: 600,
      distanceToHigh: 800,
      distanceToPark: 500,
      distanceToStarbucks: 800,
      distanceToOliveYoung: 600,
      distanceToIndeokwon: 2000,
      distanceToTram: 1000,
    };
  }
  const reportYearRaw = report?.metrics?.yearBuilt;
  const aptYearRaw = apt.yearBuilt ? parseInt(apt.yearBuilt, 10) : 2018;
  const rawYearBuilt = reportYearRaw || aptYearRaw;
  const ybStr = String(rawYearBuilt);
  const yearBuilt = ybStr.length >= 4 ? parseInt(ybStr.substring(0, 4), 10) : parseInt(ybStr, 10) || 2018;

  if (report?.metrics) {
    return {
      brand: report.metrics.brand || apt.brand || '',
      householdCount: report.metrics.householdCount || apt.householdCount || 800,
      parkingPerHousehold: report.metrics.parkingPerHousehold || (report.sections?.specs?.parkingRatio ? parseFloat(report.sections.specs.parkingRatio) : 1.25),
      yearBuilt,
      rawYearBuilt,
      distanceToSubway: report.metrics.distanceToSubway || 2000,
      distanceToElementary: report.metrics.distanceToElementary || 350,
      distanceToMiddle: report.metrics.distanceToMiddle || 600,
      distanceToHigh: report.metrics.distanceToHigh || 800,
      distanceToPark: report.metrics.distanceToPark || 500,
      distanceToStarbucks: report.metrics.distanceToStarbucks || 800,
      distanceToOliveYoung: report.metrics.distanceToOliveYoung || 600,
      distanceToIndeokwon: report.metrics.distanceToIndeokwon || 2000,
      distanceToTram: report.metrics.distanceToTram || 1000,
    };
  }

  const brand = apt.brand || '';
  const householdCount = apt.householdCount || 800;
  const parkingPerHousehold = 1.25;

  let locScore: LocationScoreItem | null = null;
  if (locationScores) {
    const matchKey = findTxKey(apt.name, locationScores, nameMapping || {});
    if (matchKey) {
      locScore = locationScores[matchKey];
    }
  }

  let distanceToSubway = locScore?.distanceToSubway ?? 2000;
  let distanceToElementary = locScore?.distanceToElementary ?? 350;
  let distanceToMiddle = locScore?.distanceToMiddle ?? 600;
  let distanceToHigh = locScore?.distanceToHigh ?? 800;
  let distanceToPark = 500;
  let distanceToStarbucks = locScore?.distanceToStarbucks ?? 800;
  let distanceToOliveYoung = locScore?.distanceToOliveYoung ?? 600;
  let distanceToIndeokwon = locScore?.distanceToIndeokwon ?? 2000;
  let distanceToTram = locScore?.distanceToTram ?? 1000;

  if (!locScore) {
    const dong = apt.dong || '';
    if (dong.includes('오산동')) {
      distanceToSubway = 500;
      distanceToPark = 400;
      distanceToStarbucks = 400;
      distanceToElementary = 300;
      distanceToMiddle = 400;
      distanceToHigh = 600;
      distanceToOliveYoung = 300;
      distanceToIndeokwon = 500;
      distanceToTram = 400;
    } else if (dong.includes('송동') || dong.includes('산척동')) {
      distanceToSubway = 2500;
      distanceToPark = 250;
      distanceToStarbucks = 450;
      distanceToElementary = 400;
      distanceToMiddle = 500;
      distanceToHigh = 700;
      distanceToOliveYoung = 400;
      distanceToIndeokwon = 2500;
      distanceToTram = 300;
    } else if (dong.includes('청계동')) {
      distanceToSubway = 1200;
      distanceToPark = 350;
      distanceToStarbucks = 300;
      distanceToElementary = 200;
      distanceToMiddle = 300;
      distanceToHigh = 500;
      distanceToOliveYoung = 300;
      distanceToIndeokwon = 1200;
      distanceToTram = 400;
    } else if (dong.includes('영천동')) {
      distanceToSubway = 1800;
      distanceToPark = 500;
      distanceToStarbucks = 500;
      distanceToElementary = 300;
      distanceToMiddle = 450;
      distanceToHigh = 650;
      distanceToOliveYoung = 400;
      distanceToIndeokwon = 1000;
      distanceToTram = 500;
    } else if (dong.includes('목동')) {
      distanceToSubway = 2800;
      distanceToPark = 400;
      distanceToStarbucks = 600;
      distanceToElementary = 250;
      distanceToMiddle = 400;
      distanceToHigh = 600;
      distanceToOliveYoung = 500;
      distanceToIndeokwon = 2800;
      distanceToTram = 500;
    } else if (dong.includes('방교동') || dong.includes('금곡동')) {
      distanceToSubway = 3000;
      distanceToPark = 800;
      distanceToStarbucks = 1200;
      distanceToElementary = 600;
      distanceToMiddle = 800;
      distanceToHigh = 1000;
      distanceToOliveYoung = 1000;
      distanceToIndeokwon = 3000;
      distanceToTram = 1500;
    }
  }

  return {
    brand,
    householdCount,
    parkingPerHousehold,
    yearBuilt,
    rawYearBuilt,
    distanceToElementary,
    distanceToMiddle,
    distanceToHigh,
    distanceToSubway,
    distanceToPark,
    distanceToStarbucks,
    distanceToOliveYoung,
    distanceToIndeokwon,
    distanceToTram,
  };
}

const EMPTY_OPTIONS: UseAptComparisonOptions = Object.freeze({});
const EMPTY_SHEET_APARTMENTS: Record<string, DongApartment[]> = Object.freeze({});
const EMPTY_TX_SUMMARY_RECORD: Record<string, AptTxSummary> = Object.freeze({});
const EMPTY_NAME_MAPPING: Record<string, string> = Object.freeze({});
const EMPTY_FIELD_REPORTS_MAP: ReadonlyMap<string, FieldReportData> = Object.freeze(new Map());
const EMPTY_LOCATION_SCORES: Record<string, LocationScoreItem> = Object.freeze({});

export function useAptComparison(options: UseAptComparisonOptions = EMPTY_OPTIONS): AptComparisonState {
  const {
    isOpen = true,
    initialAptName,
    initialAptIds,
    sheetApartments = EMPTY_SHEET_APARTMENTS,
    txSummaryData = EMPTY_TX_SUMMARY_RECORD,
    nameMapping = EMPTY_NAME_MAPPING,
    fieldReportsMap = EMPTY_FIELD_REPORTS_MAP,
    locationScores = EMPTY_LOCATION_SCORES,
    initialPriceMetric = 'absolute',
    initialChartType = 'sale',
  } = options;

  // Flattened all apartments (deduplicated by display name)
  const allApartments = useMemo(() => {
    const seen = new Set<string>();
    const result: DongApartment[] = [];
    for (const apt of Object.values(sheetApartments).flat()) {
      const displayName = getDisplayAptName(apt.name);
      if (displayName && !seen.has(displayName)) {
        seen.add(displayName);
        result.push({ ...apt, name: displayName });
      }
    }
    return result;
  }, [sheetApartments]);

  // Selected apartment states
  const [apt1, setApt1] = useState<DongApartment | null>(null);
  const [apt2, setApt2] = useState<DongApartment | null>(null);

  // Search input & focus states
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const deferredQuery1 = useDeferredValue(searchQuery1);
  const deferredQuery2 = useDeferredValue(searchQuery2);
  const [isFocused1, setIsFocused1] = useState(false);
  const [isFocused2, setIsFocused2] = useState(false);

  // Price metric & chart type
  const [priceMetric, setPriceMetric] = useState<PriceMetricMode>(initialPriceMetric);
  const [chartType, setChartType] = useState<ChartDealType>(initialChartType);

  // Recent selections
  const [recentApts, setRecentApts] = useState<DongApartment[]>([]);

  // Keyboard navigation active indexes
  const [activeIndex1, setActiveIndex1] = useState(-1);
  const [activeIndex2, setActiveIndex2] = useState(-1);

  // Transaction states
  const [txData1, setTxData1] = useState<TxDataPoint[]>([]);
  const [txData2, setTxData2] = useState<TxDataPoint[]>([]);
  const [isTxLoading1, setIsTxLoading1] = useState(false);
  const [isTxLoading2, setIsTxLoading2] = useState(false);
  const [txError, setTxError] = useState<Error | null>(null);

  // Lifestyle quiz answers
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers | null>(null);

  // Load recent apartments from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const parsedNames = localCache.get('dview_compare_recent', ViewedAptsSchema, []);
        const matched = parsedNames
          .map(name => allApartments.find(a => a.name === name))
          .filter((a): a is DongApartment => Boolean(a));
        setRecentApts(prev => {
          if (prev.length === matched.length && prev.every((p, idx) => p.name === matched[idx]?.name)) {
            return prev;
          }
          return matched;
        });
      } catch (e) {
        logger.error('useAptComparison', 'Error loading recent apartments', undefined, e);
      }
    }
  }, [isOpen, allApartments]);

  // Save selected apartment to cache
  const saveToRecent = useCallback((input: DongApartment | DongApartment[]) => {
    const apts = Array.isArray(input) ? input : [input];
    if (apts.length === 0) return;

    setRecentApts(prev => {
      const allPresent = apts.every(a => prev.some(p => p.name === a.name));
      if (allPresent) {
        return prev;
      }

      const incomingNames = new Set(apts.map(a => a.name));
      const filtered = prev.filter(a => !incomingNames.has(a.name));
      const updated = [...apts, ...filtered].slice(0, 5);
      if (prev.length === updated.length && prev.every((p, idx) => p.name === updated[idx]?.name)) {
        return prev;
      }
      try {
        localCache.set('dview_compare_recent', updated.map(a => a.name), 604800);
      } catch (e) {
        logger.error('useAptComparison', 'Error saving recent apartment(s)', { count: apts.length }, e);
      }
      return updated;
    });
  }, []);

  // Subscribe to quiz answers
  useEffect(() => {
    const loadQuizAnswers = () => {
      try {
        const answers = localCache.get('drive_quiz_answers', QuizAnswerSchema, null);
        setQuizAnswers(answers);
      } catch (e) {
        logger.warn('useAptComparison', 'Failed to parse quiz answers', undefined, e);
      }
    };
    if (isOpen) {
      loadQuizAnswers();
      if (typeof window !== 'undefined') {
        window.addEventListener('drive_quiz_answers_changed', loadQuizAnswers);
      }
    } else {
      setQuizAnswers(null);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('drive_quiz_answers_changed', loadQuizAnswers);
      }
    };
  }, [isOpen]);

  // Initial apartment initialization
  const initialAptIdsKey = initialAptIds ? initialAptIds.join(',') : '';
  const currentInitKey = initialAptIdsKey
    ? `ids:${initialAptIdsKey}`
    : initialAptName
      ? `name:${initialAptName}`
      : '';
  const lastInitializedKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isOpen) {
      lastInitializedKeyRef.current = '';
      return;
    }
    if (!currentInitKey) return;
    if (lastInitializedKeyRef.current === currentInitKey) return;

    if (initialAptIds && initialAptIds.length > 0) {
      const firstApt = allApartments.find(a => normalizeAptName(a.name) === normalizeAptName(initialAptIds[0]));
      const secondApt = initialAptIds.length > 1
        ? allApartments.find(a => normalizeAptName(a.name) === normalizeAptName(initialAptIds[1]))
        : undefined;

      if (firstApt) {
        setApt1(prev => (prev?.name === firstApt.name ? prev : firstApt));
        setSearchQuery1(prev => {
          const display = getDisplayAptName(firstApt.name);
          return prev === display ? prev : display;
        });
      }
      if (secondApt) {
        setApt2(prev => (prev?.name === secondApt.name ? prev : secondApt));
        setSearchQuery2(prev => {
          const display = getDisplayAptName(secondApt.name);
          return prev === display ? prev : display;
        });
      }

      const toSave = [firstApt, secondApt].filter((a): a is DongApartment => Boolean(a));
      if (toSave.length > 0) {
        saveToRecent(toSave);
      }

      if (allApartments.length > 0) {
        lastInitializedKeyRef.current = currentInitKey;
      }
    } else if (initialAptName) {
      const matched = allApartments.find(a => normalizeAptName(a.name) === normalizeAptName(initialAptName));
      if (matched) {
        setApt1(prev => (prev?.name === matched.name ? prev : matched));
        setSearchQuery1(prev => {
          const display = getDisplayAptName(matched.name);
          return prev === display ? prev : display;
        });
        saveToRecent(matched);
      }
      if (allApartments.length > 0) {
        lastInitializedKeyRef.current = currentInitKey;
      }
    }
  }, [isOpen, initialAptName, initialAptIdsKey, currentInitKey, allApartments, saveToRecent]);

  // Autocomplete options
  const dropdownOptions1 = useMemo(() => {
    if (deferredQuery1.trim() === '') {
      const recentNames = new Set(recentApts.map(a => a.name));
      const remaining = allApartments.filter(a => !recentNames.has(a.name));
      return [...recentApts, ...remaining];
    }
    const query = normalizeAptName(deferredQuery1);
    return allApartments.filter(a => normalizeAptName(a.name).includes(query) || a.dong.includes(deferredQuery1));
  }, [deferredQuery1, allApartments, recentApts]);

  const dropdownOptions2 = useMemo(() => {
    if (deferredQuery2.trim() === '') {
      const recentNames = new Set(recentApts.map(a => a.name));
      const remaining = allApartments.filter(a => !recentNames.has(a.name));
      return [...recentApts, ...remaining];
    }
    const query = normalizeAptName(deferredQuery2);
    return allApartments.filter(a => normalizeAptName(a.name).includes(query) || a.dong.includes(deferredQuery2));
  }, [deferredQuery2, allApartments, recentApts]);

  // Keyboard navigation
  useEffect(() => {
    setActiveIndex1(prev => (prev === -1 ? prev : -1));
  }, [searchQuery1, isFocused1]);

  useEffect(() => {
    setActiveIndex2(prev => (prev === -1 ? prev : -1));
  }, [searchQuery2, isFocused2]);

  const handleKeyDown1 = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused1 || dropdownOptions1.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex1(prev => (prev + 1) % dropdownOptions1.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex1(prev => (prev - 1 + dropdownOptions1.length) % dropdownOptions1.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex1 >= 0 && activeIndex1 < dropdownOptions1.length) {
        const selected = dropdownOptions1[activeIndex1];
        setApt1(selected);
        setSearchQuery1(getDisplayAptName(selected.name));
        setIsFocused1(false);
        saveToRecent(selected);
      }
    } else if (e.key === 'Escape') {
      setIsFocused1(false);
      (e.target as HTMLInputElement).blur();
    }
  }, [isFocused1, dropdownOptions1, activeIndex1, saveToRecent]);

  const handleKeyDown2 = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused2 || dropdownOptions2.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex2(prev => (prev + 1) % dropdownOptions2.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex2(prev => (prev - 1 + dropdownOptions2.length) % dropdownOptions2.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex2 >= 0 && activeIndex2 < dropdownOptions2.length) {
        const selected = dropdownOptions2[activeIndex2];
        setApt2(selected);
        setSearchQuery2(getDisplayAptName(selected.name));
        setIsFocused2(false);
        saveToRecent(selected);
      }
    } else if (e.key === 'Escape') {
      setIsFocused2(false);
      (e.target as HTMLInputElement).blur();
    }
  }, [isFocused2, dropdownOptions2, activeIndex2, saveToRecent]);

  // Transaction Fetching 1
  useEffect(() => {
    let active = true;
    if (!apt1) {
      setTxData1(prev => (prev.length === 0 ? prev : []));
      setIsTxLoading1(prev => (prev ? false : prev));
      return;
    }
    setIsTxLoading1(true);
    const controller = new AbortController();
    const resolved = findTxKey(apt1.name, txSummaryData, nameMapping) || apt1.name;
    const txKey = normalizeAptName(resolved);
    fetch(`/tx-data/${encodeURIComponent(txKey)}.json?v=${BUILD_VERSION}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('No data');
        return res.json();
      })
      .then(data => {
        if (active) {
          setTxData1(prev => (prev.length === 0 && Array.isArray(data) && data.length === 0 ? prev : data));
          setTxError(prev => (prev === null ? prev : null));
        }
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (active) {
          setTxData1(prev => (prev.length === 0 ? prev : []));
          setTxError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (active) setIsTxLoading1(prev => (prev ? false : prev));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [apt1, txSummaryData, nameMapping]);

  // Transaction Fetching 2
  useEffect(() => {
    let active = true;
    if (!apt2) {
      setTxData2(prev => (prev.length === 0 ? prev : []));
      setIsTxLoading2(prev => (prev ? false : prev));
      return;
    }
    setIsTxLoading2(true);
    const controller = new AbortController();
    const resolved = findTxKey(apt2.name, txSummaryData, nameMapping) || apt2.name;
    const txKey = normalizeAptName(resolved);
    fetch(`/tx-data/${encodeURIComponent(txKey)}.json?v=${BUILD_VERSION}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('No data');
        return res.json();
      })
      .then(data => {
        if (active) {
          setTxData2(prev => (prev.length === 0 && Array.isArray(data) && data.length === 0 ? prev : data));
          setTxError(prev => (prev === null ? prev : null));
        }
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (active) {
          setTxData2(prev => (prev.length === 0 ? prev : []));
          setTxError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (active) setIsTxLoading2(prev => (prev ? false : prev));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [apt2, txSummaryData, nameMapping]);

  // Add & remove apartment canonical methods
  const addApartment = useCallback((aptId: string) => {
    const found = allApartments.find(a => normalizeAptName(a.name) === normalizeAptName(aptId));
    if (!found) return;
    if (!apt1) {
      setApt1(found);
      setSearchQuery1(getDisplayAptName(found.name));
    } else if (!apt2) {
      setApt2(found);
      setSearchQuery2(getDisplayAptName(found.name));
    } else {
      setApt2(found);
      setSearchQuery2(getDisplayAptName(found.name));
    }
    saveToRecent(found);
  }, [allApartments, apt1, apt2, saveToRecent]);

  const removeApartment = useCallback((aptId: string) => {
    const norm = normalizeAptName(aptId);
    if (apt1 && normalizeAptName(apt1.name) === norm) {
      setApt1(null);
      setSearchQuery1('');
    }
    if (apt2 && normalizeAptName(apt2.name) === norm) {
      setApt2(null);
      setSearchQuery2('');
    }
  }, [apt1, apt2]);

  // Derived metrics
  const metrics1 = useMemo<ComparisonMetrics | null>(() => {
    if (!apt1) return null;
    const report = fieldReportsMap.get(apt1.name);
    const effective = getEffectiveMetrics(apt1, report, locationScores, nameMapping);
    const txKey = findTxKey(apt1.name, txSummaryData, nameMapping);
    const summary = txKey ? txSummaryData[txKey] : null;

    const avg3MPriceVal = summary ? (summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0) : 0;
    const avg3MRentVal = summary ? (summary.avg1MRentDeposit || summary.avg3MRentDeposit || summary.latestRentDeposit || 0) : 0;
    const jeonseRatioVal = avg3MPriceVal > 0 && avg3MRentVal > 0 ? (avg3MRentVal / avg3MPriceVal) * 100 : 0;
    const avg3MPerPyeongVal = summary ? (summary.avg1MPerPyeong || summary.avg3MPerPyeong || 0) : 0;

    return {
      ...effective,
      avg3MPrice: avg3MPriceVal,
      avg3MRent: avg3MRentVal,
      jeonseRatio: jeonseRatioVal,
      avg3MPerPyeong: avg3MPerPyeongVal,
    };
  }, [apt1, fieldReportsMap, txSummaryData, nameMapping, locationScores]);

  const metrics2 = useMemo<ComparisonMetrics | null>(() => {
    if (!apt2) return null;
    const report = fieldReportsMap.get(apt2.name);
    const effective = getEffectiveMetrics(apt2, report, locationScores, nameMapping);
    const txKey = findTxKey(apt2.name, txSummaryData, nameMapping);
    const summary = txKey ? txSummaryData[txKey] : null;

    const avg3MPriceVal = summary ? (summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0) : 0;
    const avg3MRentVal = summary ? (summary.avg1MRentDeposit || summary.avg3MRentDeposit || summary.latestRentDeposit || 0) : 0;
    const jeonseRatioVal = avg3MPriceVal > 0 && avg3MRentVal > 0 ? (avg3MRentVal / avg3MPriceVal) * 100 : 0;
    const avg3MPerPyeongVal = summary ? (summary.avg1MPerPyeong || summary.avg3MPerPyeong || 0) : 0;

    return {
      ...effective,
      avg3MPrice: avg3MPriceVal,
      avg3MRent: avg3MRentVal,
      jeonseRatio: jeonseRatioVal,
      avg3MPerPyeong: avg3MPerPyeongVal,
    };
  }, [apt2, fieldReportsMap, txSummaryData, nameMapping, locationScores]);

  const wins = useMemo<MetricWins>(() => {
    const emptyWins: MetricWins = {
      subway: null,
      elementary: null,
      middle: null,
      high: null,
      starbucks: null,
      oliveYoung: null,
      indeokwon: null,
      tram: null,
      park: null,
      households: null,
      year: null,
      parking: null,
      price: null,
      rent: null,
      ratio: null,
      perPyeong: null,
    };

    if (!metrics1 || !metrics2) return emptyWins;

    const compare = (val1: string | number | undefined | null, val2: string | number | undefined | null, lowerIsBetter = false): boolean | null => {
      const v1 = typeof val1 === 'number' ? val1 : parseFloat(String(val1 || ''));
      const v2 = typeof val2 === 'number' ? val2 : parseFloat(String(val2 || ''));
      if (isNaN(v1) && isNaN(v2)) return null;
      if (isNaN(v1)) return false;
      if (isNaN(v2)) return true;
      if (v1 === v2) return null;
      return lowerIsBetter ? v1 < v2 : v1 > v2;
    };

    return {
      subway: compare(metrics1.distanceToSubway, metrics2.distanceToSubway, true),
      elementary: compare(metrics1.distanceToElementary, metrics2.distanceToElementary, true),
      middle: compare(metrics1.distanceToMiddle, metrics2.distanceToMiddle, true),
      high: compare(metrics1.distanceToHigh, metrics2.distanceToHigh, true),
      starbucks: compare(metrics1.distanceToStarbucks, metrics2.distanceToStarbucks, true),
      oliveYoung: compare(metrics1.distanceToOliveYoung, metrics2.distanceToOliveYoung, true),
      indeokwon: compare(metrics1.distanceToIndeokwon, metrics2.distanceToIndeokwon, true),
      tram: compare(metrics1.distanceToTram, metrics2.distanceToTram, true),
      park: compare(metrics1.distanceToPark, metrics2.distanceToPark, true),
      households: compare(metrics1.householdCount, metrics2.householdCount),
      year: compare(metrics1.yearBuilt, metrics2.yearBuilt),
      parking: compare(metrics1.parkingPerHousehold, metrics2.parkingPerHousehold),
      price: compare(metrics1.avg3MPrice, metrics2.avg3MPrice),
      rent: compare(metrics1.avg3MRent, metrics2.avg3MRent),
      ratio: compare(metrics1.jeonseRatio, metrics2.jeonseRatio),
      perPyeong: compare(metrics1.avg3MPerPyeong, metrics2.avg3MPerPyeong),
    };
  }, [metrics1, metrics2]);

  const score = useMemo(() => {
    let apt1Count = 0;
    let apt2Count = 0;
    Object.values(wins).forEach((val) => {
      if (val === true) apt1Count++;
      if (val === false) apt2Count++;
    });
    return { apt1: apt1Count, apt2: apt2Count };
  }, [wins]);

  const aiFitScores = useMemo<AiFitScores>(() => {
    if (!metrics1 || !metrics2 || !quizAnswers) {
      return { score1: 0, score2: 0, winner: null };
    }

    let score1 = 0;
    let score2 = 0;

    const { transit, family, lifestyle } = quizAnswers;

    if (transit === 'gtx') {
      const d1 = metrics1.distanceToSubway ?? 9999;
      const d2 = metrics2.distanceToSubway ?? 9999;
      if (d1 < d2) score1 += 30;
      else if (d2 < d1) score2 += 30;
    } else if (transit === 'indeokwon') {
      const d1 = metrics1.distanceToIndeokwon ?? 9999;
      const d2 = metrics2.distanceToIndeokwon ?? 9999;
      if (d1 < d2) score1 += 30;
      else if (d2 < d1) score2 += 30;
    } else if (transit === 'tram') {
      const d1 = metrics1.distanceToTram ?? 9999;
      const d2 = metrics2.distanceToTram ?? 9999;
      if (d1 < d2) score1 += 30;
      else if (d2 < d1) score2 += 30;
    }

    if (family === 'baby' || family === 'elementary' || family === 'middleHigh') {
      const e1 = metrics1.distanceToElementary ?? 9999;
      const e2 = metrics2.distanceToElementary ?? 9999;
      if (e1 < e2) score1 += 25;
      else if (e2 < e1) score2 += 25;

      const p1 = metrics1.distanceToPark ?? 9999;
      const p2 = metrics2.distanceToPark ?? 9999;
      if (p1 < p2) score1 += 15;
      else if (p2 < p1) score2 += 15;
    }

    if (lifestyle === 'nature') {
      const p1 = metrics1.distanceToPark ?? 9999;
      const p2 = metrics2.distanceToPark ?? 9999;
      if (p1 < p2) score1 += 30;
      else if (p2 < p1) score2 += 30;
    } else if (lifestyle === 'shop') {
      const s1 = metrics1.distanceToStarbucks ?? 9999;
      const s2 = metrics2.distanceToStarbucks ?? 9999;
      if (s1 < s2) score1 += 20;
      else if (s2 < s1) score2 += 20;
    }

    let winner: 'apt1' | 'apt2' | null = null;
    if (score1 > score2) winner = 'apt1';
    else if (score2 > score1) winner = 'apt2';

    return { score1, score2, winner };
  }, [metrics1, metrics2, quizAnswers]);

  const apt1Label = apt1 ? getDisplayAptName(apt1.name) : '단지 1';
  const apt2Label = apt2 ? getDisplayAptName(apt2.name) : '단지 2';

  // 5-Axis Radar Chart Data
  const { radarChartData, radarDataPoints } = useMemo(() => {
    if (!metrics1 || !metrics2 || !apt1 || !apt2) {
      return { radarChartData: [], radarDataPoints: [] };
    }

    const getSubwayScore = (m: ComparisonMetrics) => {
      const distSubway = m.distanceToSubway || 2000;
      const distTram = m.distanceToTram || 1000;
      return Math.min(100, Math.max(10, Math.round(100 - (distSubway / 25 + distTram / 15))));
    };

    const getSchoolScore = (m: ComparisonMetrics) => {
      const distElem = m.distanceToElementary || 350;
      const distMiddle = m.distanceToMiddle || 600;
      const acadDensity = 30;
      return Math.min(100, Math.max(10, Math.round(100 - (distElem / 6 + distMiddle / 12) + Math.min(20, acadDensity / 3))));
    };

    const getConvenienceScore = (m: ComparisonMetrics) => {
      const distSb = m.distanceToStarbucks || 800;
      const distOy = m.distanceToOliveYoung || 600;
      return Math.min(100, Math.max(10, Math.round(100 - (distSb / 15 + distOy / 12))));
    };

    const getScaleScore = (m: ComparisonMetrics) => {
      const hh = m.householdCount || 800;
      const pkg = m.parkingPerHousehold || 1.25;
      return Math.min(100, Math.max(15, Math.round(Math.min(60, hh / 25) + Math.min(40, pkg * 30))));
    };

    const getAgeScore = (m: ComparisonMetrics) => {
      const yb = typeof m.yearBuilt === 'number' ? m.yearBuilt : parseInt(String(m.yearBuilt || 2018), 10) || 2018;
      return Math.min(100, Math.max(10, Math.round((yb - 2005) * 5)));
    };

    const axes = [
      { subject: '역세권 (철도/트램)', s1: getSubwayScore(metrics1), s2: getSubwayScore(metrics2) },
      { subject: '학군 (초/중등)', s1: getSchoolScore(metrics1), s2: getSchoolScore(metrics2) },
      { subject: '슬세권 (편의/상권)', s1: getConvenienceScore(metrics1), s2: getConvenienceScore(metrics2) },
      { subject: '단지 스펙 (규모/주차)', s1: getScaleScore(metrics1), s2: getScaleScore(metrics2) },
      { subject: '신축/연식', s1: getAgeScore(metrics1), s2: getAgeScore(metrics2) },
    ];

    const chartData = axes.map(a => ({
      subject: a.subject,
      A: a.s1,
      B: a.s2,
      [apt1Label]: a.s1,
      [apt2Label]: a.s2,
      fullMark: 100,
    }));

    const dataPoints: RadarDataPoint[] = axes.map(a => ({
      subject: a.subject,
      A: a.s1,
      B: a.s2,
      fullMark: 100,
    }));

    return { radarChartData: chartData, radarDataPoints: dataPoints };
  }, [metrics1, metrics2, apt1, apt2, apt1Label, apt2Label]);

  // Combined Chart Data with monthly carry-forward
  const combinedChartData = useMemo<CombinedChartPoint[]>(() => {
    if ((txData1.length === 0 && txData2.length === 0) || (!apt1 && !apt2)) return [];

    const groupDataByMonth = (txs: TxDataPoint[]) => {
      const grouped: Record<string, number[]> = {};
      const txsList = Array.isArray(txs) ? txs : [];
      txsList.forEach(tx => {
        if (!tx || typeof tx !== 'object') return;
        if (!tx.contractYm) return;
        const yy = tx.contractYm.substring(2, 4);
        const mm = tx.contractYm.substring(4, 6);
        const key = `${yy}.${mm}`;

        const isMatch = chartType === 'jeonse' ? tx.dealType === '전세' : (tx.dealType !== '전세' && tx.dealType !== '월세');
        const value = chartType === 'jeonse' ? (tx.deposit || tx.price || 0) : (tx.price || 0);

        if (isMatch && value > 0) {
          if (!grouped[key]) grouped[key] = [];
          if (priceMetric === 'perPyeong') {
            const pyeong = tx.areaPyeong || 30;
            grouped[key].push(value / pyeong);
          } else {
            grouped[key].push(value / 10000);
          }
        }
      });

      const averages: Record<string, number> = {};
      Object.entries(grouped).forEach(([key, prices]) => {
        averages[key] = prices.reduce((a, b) => a + b, 0) / prices.length;
      });
      return averages;
    };

    const avgs1 = groupDataByMonth(txData1);
    const avgs2 = groupDataByMonth(txData2);

    const allMonths = Array.from(new Set([...Object.keys(avgs1), ...Object.keys(avgs2)])).sort();
    const timelineMonths = allMonths.slice(-24);

    const targetEndYear = 26;
    const targetEndMonth = 6;
    if (timelineMonths.length > 0) {
      const lastMonthStr = timelineMonths[timelineMonths.length - 1];
      const [yStr, mStr] = lastMonthStr.split('.');
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10);
      while (y < targetEndYear || (y === targetEndYear && m < targetEndMonth)) {
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
        timelineMonths.push(`${String(y).padStart(2, '0')}.${String(m).padStart(2, '0')}`);
      }
    }

    let lastA1: number | null = null;
    let lastA2: number | null = null;

    return timelineMonths.map(month => {
      const raw1 = avgs1[month];
      const raw2 = avgs2[month];

      if (raw1 !== undefined) lastA1 = raw1;
      if (raw2 !== undefined) lastA2 = raw2;

      const formatValue = (val: number | null) => {
        if (val === null) return null;
        if (priceMetric === 'perPyeong') {
          return Math.round(val);
        }
        return Math.round(val * 100) / 100;
      };

      return {
        month,
        [apt1 ? getDisplayAptName(apt1.name) : '단지 1']: formatValue(lastA1),
        [apt2 ? getDisplayAptName(apt2.name) : '단지 2']: formatValue(lastA2),
      };
    });
  }, [txData1, txData2, chartType, priceMetric, apt1, apt2]);

  // Dynamic Y-axis domain
  const yAxisDomain = useMemo<[number | string, number | string]>(() => {
    if (combinedChartData.length === 0 || (!apt1 && !apt2)) return [0, 'auto'];

    const label1 = apt1 ? getDisplayAptName(apt1.name) : '단지 1';
    const label2 = apt2 ? getDisplayAptName(apt2.name) : '단지 2';

    let minVal = Infinity;
    let maxVal = -Infinity;

    combinedChartData.forEach(item => {
      const val1 = item[label1];
      const val2 = item[label2];
      if (val1 !== null && val1 !== undefined && typeof val1 === 'number') {
        if (val1 < minVal) minVal = val1;
        if (val1 > maxVal) maxVal = val1;
      }
      if (val2 !== null && val2 !== undefined && typeof val2 === 'number') {
        if (val2 < minVal) minVal = val2;
        if (val2 > maxVal) maxVal = val2;
      }
    });

    if (minVal === Infinity || maxVal === -Infinity) {
      return [0, 'auto'];
    }

    const diff = maxVal - minVal;
    const padding = diff > 0 ? diff * 0.1 : (priceMetric === 'perPyeong' ? 50 : 0.5);
    const calculatedMin = Math.max(0, minVal - padding);
    const calculatedMax = maxVal + padding;

    if (priceMetric === 'perPyeong') {
      return [Math.floor(calculatedMin), Math.ceil(calculatedMax)];
    }
    return [Math.floor(calculatedMin * 10) / 10, Math.ceil(calculatedMax * 10) / 10];
  }, [combinedChartData, priceMetric, apt1, apt2]);

  // Display price formatter
  const displayPrice = useCallback((val: number) => {
    if (!val) return '-';
    const eok = Math.floor(val / 10000);
    const man = val % 10000;
    if (eok > 0) {
      return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
    }
    return `${man.toLocaleString()}`;
  }, []);

  // Format year built
  const formatYearBuilt = useCallback((rawYb: string | number | undefined, yb: number) => {
    if (!rawYb) return '-';
    const ybStr = String(rawYb);
    const currentYear = new Date().getFullYear();
    const age = currentYear - yb;
    if (ybStr.length >= 6) {
      const year = ybStr.substring(0, 4);
      const month = parseInt(ybStr.substring(4, 6), 10);
      return `${year}년 ${month}월 (${age}년차)`;
    }
    return `${yb}년 (${age}년차)`;
  }, []);

  // Highlight class generator
  const getCompareClass = useCallback((isApt1: boolean, winValue: boolean | null) => {
    if (winValue === null) return 'border-border/50 text-secondary bg-surface/30';
    const isWinner = isApt1 ? winValue === true : winValue === false;
    return isWinner
      ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/10 shadow-[0_0_0_1px_#2563eb_inset]'
      : 'border-border/30 text-tertiary opacity-70 bg-surface/10';
  }, []);

  const apartments = useMemo(() => {
    return [apt1, apt2].filter((a): a is DongApartment => Boolean(a));
  }, [apt1, apt2]);

  const selectedAptIds = useMemo(() => {
    return apartments.map(a => a.name);
  }, [apartments]);

  return {
    apartments,
    isLoading: isTxLoading1 || isTxLoading2,
    error: txError,
    selectedAptIds,
    addApartment,
    removeApartment,
    apt1,
    apt2,
    setApt1,
    setApt2,
    apt1Label,
    apt2Label,
    searchQuery1,
    setSearchQuery1,
    searchQuery2,
    setSearchQuery2,
    isFocused1,
    setIsFocused1,
    isFocused2,
    setIsFocused2,
    activeIndex1,
    setActiveIndex1,
    activeIndex2,
    setActiveIndex2,
    dropdownOptions1,
    dropdownOptions2,
    handleKeyDown1,
    handleKeyDown2,
    recentApts,
    saveToRecent,
    quizAnswers,
    priceMetric,
    setPriceMetric,
    chartType,
    setChartType,
    txData1,
    txData2,
    isTxLoading: isTxLoading1 || isTxLoading2,
    isTxLoading1,
    isTxLoading2,
    metrics1,
    metrics2,
    wins,
    score,
    aiFitScores,
    radarChartData,
    radarDataPoints,
    combinedChartData,
    yAxisDomain,
    displayPrice,
    formatYearBuilt,
    getCompareClass,
  };
}

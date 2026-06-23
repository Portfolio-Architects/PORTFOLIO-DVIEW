'use client';

import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { X, Search, Building2, TrendingUp, Sparkles, Award, School, TreePine, MapPin, Share2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { shareCompareToKakao } from '@/lib/utils/kakaoShare';
import { localCache } from '@/lib/utils/localCache';
import { ViewedAptsSchema, QuizAnswerSchema } from '@/lib/validation/facade.schemas';
import { BUILD_VERSION } from '@/lib/build-version';

interface AptCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAptName?: string;
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  fieldReportsMap: Map<string, FieldReportData>;
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  locationScores?: Record<string, any>;
}

interface TxDataPoint {
  contractYm: string;
  price: number;
  dealType: string;
  deposit?: number;
  areaPyeong: number;
}

// Fallback metrics estimator for apartments without Firestore scouting reports
function getEffectiveMetrics(
  apt: DongApartment | null | undefined,
  report: FieldReportData | undefined,
  locationScores?: Record<string, any>,
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
  const aptYearRaw = apt.yearBuilt ? parseInt(apt.yearBuilt) : 2018;
  const rawYearBuilt = reportYearRaw || aptYearRaw;
  const ybStr = String(rawYearBuilt);
  const yearBuilt = ybStr.length >= 4 ? parseInt(ybStr.substring(0, 4)) : parseInt(ybStr) || 2018;

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

  // Estimate/Look up based on locationScores
  const brand = apt.brand || '';
  const householdCount = apt.householdCount || 800;
  const parkingPerHousehold = 1.25; // default fallback

  // Find exact coordinate scores if locationScores is provided
  let locScore: any = null;
  if (locationScores) {
    const matchKey = findTxKey(apt.name, locationScores, nameMapping || {});
    if (matchKey) {
      locScore = locationScores[matchKey];
    }
  }

  // Default values before dong-based fallback
  let distanceToSubway = locScore?.distanceToSubway ?? 2000;
  let distanceToElementary = locScore?.distanceToElementary ?? 350;
  let distanceToMiddle = locScore?.distanceToMiddle ?? 600;
  let distanceToHigh = locScore?.distanceToHigh ?? 800;
  let distanceToPark = 500;
  let distanceToStarbucks = locScore?.distanceToStarbucks ?? 800;
  let distanceToOliveYoung = locScore?.distanceToOliveYoung ?? 600;
  let distanceToIndeokwon = locScore?.distanceToIndeokwon ?? 2000;
  let distanceToTram = locScore?.distanceToTram ?? 1000;

  // Only fall back to dong-based approximations if NOT found in locationScores
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

const AptCompareModal = React.memo(function AptCompareModal({
  isOpen,
  onClose,
  initialAptName,
  sheetApartments,
  txSummaryData,
  nameMapping,
  fieldReportsMap,
  typeMap,
  locationScores = {},
}: AptCompareModalProps) {
  // Flatten list of all apartments
  const allApartments = useMemo(() => {
    return Object.values(sheetApartments).flat();
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

  // Price metric: 'absolute' (절대 가격) vs 'perPyeong' (평당 가격)
  const [priceMetric, setPriceMetric] = useState<'absolute' | 'perPyeong'>('absolute');

  // Recently compared apartments state
  const [recentApts, setRecentApts] = useState<DongApartment[]>([]);

  // Autocomplete active indexes for keyboard navigation
  const [activeIndex1, setActiveIndex1] = useState(-1);
  const [activeIndex2, setActiveIndex2] = useState(-1);

  // Transaction data states
  const [txData1, setTxData1] = useState<TxDataPoint[]>([]);
  const [txData2, setTxData2] = useState<TxDataPoint[]>([]);
  const [isTxLoading1, setIsTxLoading1] = useState(false);
  const [isTxLoading2, setIsTxLoading2] = useState(false);

  // Chart type: 'sale' (매매) vs 'jeonse' (전세)
  const [chartType, setChartType] = useState<'sale' | 'jeonse'>('sale');
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const mountedRef = React.useRef(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Quiz integration states
  const [quizAnswers, setQuizAnswers] = useState<any>(null);

  // Input refs for clicking outside
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef1 = useRef<HTMLDivElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);

  // Load recent apartments from localStorage on mount/isOpen
  useEffect(() => {
    if (isOpen) {
      try {
        const parsedNames = localCache.get('dview_compare_recent', ViewedAptsSchema, []);
        const matched = parsedNames
          .map(name => allApartments.find(a => a.name === name))
          .filter((a): a is DongApartment => !!a);
        setRecentApts(matched);
      } catch (e) {
        console.error('Error loading recent apartments', e);
      }
    }
  }, [isOpen, allApartments]);

  // Load and subscribe to lifestyle quiz answers
  useEffect(() => {
    const loadQuizAnswers = () => {
      try {
        const answers = localCache.get('dview_quiz_answers', QuizAnswerSchema, null);
        setQuizAnswers(answers);
      } catch (e) {
        console.warn('Failed to parse quiz answers in AptCompareModal:', e);
      }
    };
    if (isOpen) {
      loadQuizAnswers();
      window.addEventListener('dview_quiz_answers_changed', loadQuizAnswers);
    } else {
      setQuizAnswers(null);
    }
    return () => {
      window.removeEventListener('dview_quiz_answers_changed', loadQuizAnswers);
    };
  }, [isOpen]);

  // Helper to save selected apartment to localStorage
  const saveToRecent = React.useCallback((apt: DongApartment) => {
    setRecentApts(prev => {
      const filtered = prev.filter(a => a.name !== apt.name);
      const updated = [apt, ...filtered].slice(0, 5); // Keep last 5
      try {
        localCache.set('dview_compare_recent', updated.map(a => a.name), 604800); // 7 days TTL
      } catch (e) {
        console.error('Error saving recent apartment', e);
      }
      return updated;
    });
  }, []);

  // Options to render in dropdown 1 (prepends recent apartments when search query is empty)
  const dropdownOptions1 = useMemo(() => {
    if (deferredQuery1.trim() === '') {
      const recentNames = new Set(recentApts.map(a => a.name));
      const remaining = allApartments.filter(a => !recentNames.has(a.name));
      return [...recentApts, ...remaining];
    }
    const query = normalizeAptName(deferredQuery1);
    return allApartments.filter(a => normalizeAptName(a.name).includes(query) || a.dong.includes(deferredQuery1));
  }, [deferredQuery1, allApartments, recentApts]);

  // Options to render in dropdown 2 (prepends recent apartments when search query is empty)
  const dropdownOptions2 = useMemo(() => {
    if (deferredQuery2.trim() === '') {
      const recentNames = new Set(recentApts.map(a => a.name));
      const remaining = allApartments.filter(a => !recentNames.has(a.name));
      return [...recentApts, ...remaining];
    }
    const query = normalizeAptName(deferredQuery2);
    return allApartments.filter(a => normalizeAptName(a.name).includes(query) || a.dong.includes(deferredQuery2));
  }, [deferredQuery2, allApartments, recentApts]);

  // Reset active index when dropdown states change
  useEffect(() => {
    setActiveIndex1(-1);
  }, [searchQuery1, isFocused1]);

  useEffect(() => {
    setActiveIndex2(-1);
  }, [searchQuery2, isFocused2]);

  // Scroll active elements into view
  useEffect(() => {
    if (activeIndex1 >= 0 && dropdownRef1.current) {
      const activeEl = dropdownRef1.current.querySelector(`[data-index="${activeIndex1}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex1]);

  useEffect(() => {
    if (activeIndex2 >= 0 && dropdownRef2.current) {
      const activeEl = dropdownRef2.current.querySelector(`[data-index="${activeIndex2}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex2]);

  // Keyboard navigation handlers
  const handleKeyDown1 = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  };

  const handleKeyDown2 = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Set initial apartment if passed
  useEffect(() => {
    if (initialAptName && isOpen) {
      const matched = allApartments.find(a => normalizeAptName(a.name) === normalizeAptName(initialAptName));
      if (matched) {
        setApt1(matched);
        setSearchQuery1(getDisplayAptName(matched.name));
        saveToRecent(matched);
      }
    }
  }, [initialAptName, allApartments, isOpen, saveToRecent]);

  // Handle clicking outside of dropdowns to close them
  useEffect(() => {
    if (!isFocused1 && !isFocused2) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (isFocused1 && dropdownRef1.current && !dropdownRef1.current.contains(target)) {
        setIsFocused1(false);
      }
      if (isFocused2 && dropdownRef2.current && !dropdownRef2.current.contains(target)) {
        setIsFocused2(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isFocused1, isFocused2]);

  // Fetch transactions for Apartment 1
  useEffect(() => {
    let active = true;
    if (!apt1) {
      setTxData1([]);
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
        if (active) setTxData1(data);
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (active) setTxData1([]);
      })
      .finally(() => {
        if (active) setIsTxLoading1(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [apt1, txSummaryData, nameMapping]);

  // Fetch transactions for Apartment 2
  useEffect(() => {
    let active = true;
    if (!apt2) {
      setTxData2([]);
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
        if (active) setTxData2(data);
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (active) setTxData2([]);
      })
      .finally(() => {
        if (active) setIsTxLoading2(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [apt2, txSummaryData, nameMapping]);

  // Filter lists for Autocomplete
  const filteredApts1 = useMemo(() => {
    if (!deferredQuery1.trim()) return allApartments;
    const query = normalizeAptName(deferredQuery1);
    return allApartments.filter(a => normalizeAptName(a.name).includes(query) || a.dong.includes(deferredQuery1));
  }, [deferredQuery1, allApartments]);

  const filteredApts2 = useMemo(() => {
    if (!deferredQuery2.trim()) return allApartments;
    const query = normalizeAptName(deferredQuery2);
    return allApartments.filter(a => normalizeAptName(a.name).includes(query) || a.dong.includes(deferredQuery2));
  }, [deferredQuery2, allApartments]);

  // Retrieve metrics & summary stats for compared apartments
  const metrics1 = useMemo(() => {
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

  const metrics2 = useMemo(() => {
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

  // Determine comparison highlight wins (true means Apt1 wins, false means Apt2 wins, null means tie or N/A)
  const wins = useMemo(() => {
    if (!metrics1 || !metrics2) return {} as Record<string, boolean | null>;

    const compare = (val1: any, val2: any, lowerIsBetter = false) => {
      const v1 = typeof val1 === 'number' ? val1 : parseFloat(val1);
      const v2 = typeof val2 === 'number' ? val2 : parseFloat(val2);
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
      price: compare(metrics1.avg3MPrice, metrics2.avg3MPrice), // Higher valuation
      rent: compare(metrics1.avg3MRent, metrics2.avg3MRent),     // Higher rent
      ratio: compare(metrics1.jeonseRatio, metrics2.jeonseRatio), // Higher jeonse ratio
      perPyeong: compare(metrics1.avg3MPerPyeong, metrics2.avg3MPerPyeong), // Higher value per pyeong
    };
  }, [metrics1, metrics2]);

  const apt1Label = apt1 ? getDisplayAptName(apt1.name) : '단지 1';
  const apt2Label = apt2 ? getDisplayAptName(apt2.name) : '단지 2';

  const score = useMemo(() => {
    if (!wins) return { apt1: 0, apt2: 0 };
    let apt1Count = 0;
    let apt2Count = 0;
    Object.values(wins).forEach((val) => {
      if (val === true) apt1Count++;
      if (val === false) apt2Count++;
    });
    return { apt1: apt1Count, apt2: apt2Count };
  }, [wins]);

  // AI Fit Scorecard calculation based on quiz preferences
  const aiFitScores = useMemo(() => {
    if (!metrics1 || !metrics2 || !quizAnswers) {
      return { score1: 0, score2: 0, winner: null as 'apt1' | 'apt2' | null };
    }

    let score1 = 0;
    let score2 = 0;

    const { transit, family, lifestyle } = quizAnswers;

    // 1. 교통 선호도 (Transit)
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

    // 2. 육아 선호도 (Family)
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

    // 3. 라이프스타일 선호도 (Lifestyle)
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

  // 5대 핵심 지표 레이더 차트 데이터 연산
  const radarChartData = useMemo(() => {
    if (!metrics1 || !metrics2 || !apt1 || !apt2) return [];

    const getSubwayScore = (m: any) => {
      const distSubway = m.distanceToSubway || 2000;
      const distTram = m.distanceToTram || 1000;
      return Math.min(100, Math.max(10, Math.round(100 - (distSubway / 25 + distTram / 15))));
    };

    const getSchoolScore = (m: any) => {
      const distElem = m.distanceToElementary || 350;
      const distMiddle = m.distanceToMiddle || 600;
      const acadDensity = m.academyDensity || 30;
      return Math.min(100, Math.max(10, Math.round(100 - (distElem / 6 + distMiddle / 12) + Math.min(20, acadDensity / 3))));
    };

    const getConvenienceScore = (m: any) => {
      const distSb = m.distanceToStarbucks || 800;
      const distOy = m.distanceToOliveYoung || 600;
      return Math.min(100, Math.max(10, Math.round(100 - (distSb / 15 + distOy / 12))));
    };

    const getScaleScore = (m: any) => {
      const hh = m.householdCount || 800;
      const pkg = m.parkingPerHousehold || 1.25;
      return Math.min(100, Math.max(15, Math.round(Math.min(60, hh / 25) + Math.min(40, pkg * 30))));
    };

    const getAgeScore = (m: any) => {
      const yb = m.yearBuilt || 2018;
      return Math.min(100, Math.max(10, Math.round((yb - 2005) * 5)));
    };

    return [
      {
        subject: '역세권 (철도/트램)',
        [apt1Label]: getSubwayScore(metrics1),
        [apt2Label]: getSubwayScore(metrics2),
      },
      {
        subject: '학군 (초/중등)',
        [apt1Label]: getSchoolScore(metrics1),
        [apt2Label]: getSchoolScore(metrics2),
      },
      {
        subject: '슬세권 (편의/상권)',
        [apt1Label]: getConvenienceScore(metrics1),
        [apt2Label]: getConvenienceScore(metrics2),
      },
      {
        subject: '단지 스펙 (규모/주차)',
        [apt1Label]: getScaleScore(metrics1),
        [apt2Label]: getScaleScore(metrics2),
      },
      {
        subject: '신축/연식',
        [apt1Label]: getAgeScore(metrics1),
        [apt2Label]: getAgeScore(metrics2),
      },
    ];
  }, [metrics1, metrics2, apt1, apt2, apt1Label, apt2Label]);

  // Aggregate monthly transaction averages for the compared charts
  const combinedChartData = useMemo(() => {
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
            const pyeong = tx.areaPyeong || 30; // fallback if areaPyeong is missing
            grouped[key].push(value / pyeong); // 평당 가격 (만원)
          } else {
            grouped[key].push(value / 10000); // 절대 가격 (억)
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

    // Get union of all months in the last 24 months (e.g. from 24.06 to 26.05) or simply sorted months from data
    const allMonths = Array.from(new Set([...Object.keys(avgs1), ...Object.keys(avgs2)])).sort();

    // Limit to last 24 months for readability if list is too long
    const timelineMonths = allMonths.slice(-24);

    const targetEndYear = 26;
    const targetEndMonth = 6;
    if (timelineMonths.length > 0) {
      const lastMonthStr = timelineMonths[timelineMonths.length - 1];
      const [yStr, mStr] = lastMonthStr.split('.');
      let y = parseInt(yStr);
      let m = parseInt(mStr);
      while (y < targetEndYear || (y === targetEndYear && m < targetEndMonth)) {
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
        timelineMonths.push(`${String(y).padStart(2, '0')}.${String(m).padStart(2, '0')}`);
      }
    }

    // Interpolation (Carry-forward)
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
          return Math.round(val); // 평당 가격은 소수점 제거 (정수 반올림)
        }
        return Math.round(val * 100) / 100; // 절대 가격은 소수점 둘째자리까지 유지
      };

      return {
        month,
        [apt1 ? getDisplayAptName(apt1.name) : '단지 1']: formatValue(lastA1),
        [apt2 ? getDisplayAptName(apt2.name) : '단지 2']: formatValue(lastA2),
      };
    });
  }, [txData1, txData2, chartType, priceMetric, apt1, apt2]);

  // Dynamic Y-axis domain based on min and max of combined chart data
  const yAxisDomain = useMemo(() => {
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

    // Apply a margin/padding (e.g. 10% of diff, or at least 0.5 billion / 50 man won to avoid cutting off labels/line dots)
    const diff = maxVal - minVal;
    const padding = diff > 0 ? diff * 0.1 : (priceMetric === 'perPyeong' ? 50 : 0.5);
    
    // Ensure min value doesn't go below 0
    const calculatedMin = Math.max(0, minVal - padding);
    const calculatedMax = maxVal + padding;

    // Return rounded domain values for clean UI labels
    if (priceMetric === 'perPyeong') {
      return [
        Math.floor(calculatedMin), // 평당 가격은 정수 축 라벨링
        Math.ceil(calculatedMax)
      ];
    }
    return [
      Math.floor(calculatedMin * 10) / 10,
      Math.ceil(calculatedMax * 10) / 10
    ];
  }, [combinedChartData, priceMetric, apt1, apt2]);

  if (!isOpen) return null;

  const displayPrice = (val: number) => {
    if (!val) return '-';
    const eok = Math.floor(val / 10000);
    const man = val % 10000;
    if (eok > 0) {
      return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
    }
    return `${man.toLocaleString()}`;
  };

  const formatYearBuilt = (rawYb: any, yb: number) => {
    if (!rawYb) return '-';
    const ybStr = String(rawYb);
    const currentYear = new Date().getFullYear();
    const age = currentYear - yb;
    if (ybStr.length >= 6) {
      const year = ybStr.substring(0, 4);
      const month = parseInt(ybStr.substring(4, 6));
      return `${year}년 ${month}월 (${age}년차)`;
    }
    return `${yb}년 (${age}년차)`;
  };

  const handleShare = () => {
    if (!apt1 || !apt2 || !metrics1 || !metrics2) return;
    
    const text = `[D-VIEW 단지 1:1 비교 분석 리포트]

- 비교 대상
단지 A: ${apt1Label}
단지 B: ${apt2Label}

- 종합 비교 결과
${apt1Label} 우세 항목: ${score.apt1}개
${apt2Label} 우세 항목: ${score.apt2}개
최종 결과: ${
      score.apt1 > score.apt2
        ? `${apt1Label} 단지가 더 많은 지표에서 우세합니다.`
        : score.apt2 > score.apt1
        ? `${apt2Label} 단지가 더 많은 지표에서 우세합니다.`
        : '두 단지의 우세 지표 개수가 동일합니다.'
    }

- 주요 입지 및 스펙 비교
1. SRT/GTX-A 역 거리
단지 A: ${metrics1.distanceToSubway ? `${metrics1.distanceToSubway}m` : '-'}
단지 B: ${metrics2.distanceToSubway ? `${metrics2.distanceToSubway}m` : '-'}

2. 동인선 예정역 거리
단지 A: ${metrics1.distanceToIndeokwon ? `${metrics1.distanceToIndeokwon}m` : '-'}
단지 B: ${metrics2.distanceToIndeokwon ? `${metrics2.distanceToIndeokwon}m` : '-'}

3. 동탄트램 예정역 거리
단지 A: ${metrics1.distanceToTram ? `${metrics1.distanceToTram}m` : '-'}
단지 B: ${metrics2.distanceToTram ? `${metrics2.distanceToTram}m` : '-'}

4. 초등학교 도보 통학 거리
단지 A: ${metrics1.distanceToElementary ? `${metrics1.distanceToElementary}m` : '-'}
단지 B: ${metrics2.distanceToElementary ? `${metrics2.distanceToElementary}m` : '-'}

5. 중학교 도보 통학 거리
단지 A: ${metrics1.distanceToMiddle ? `${metrics1.distanceToMiddle}m` : '-'}
단지 B: ${metrics2.distanceToMiddle ? `${metrics2.distanceToMiddle}m` : '-'}

6. 고등학교 도보 통학 거리
단지 A: ${metrics1.distanceToHigh ? `${metrics1.distanceToHigh}m` : '-'}
단지 B: ${metrics2.distanceToHigh ? `${metrics2.distanceToHigh}m` : '-'}

7. 스타벅스 / 올리브영 거리
단지 A: 스타벅스 ${metrics1.distanceToStarbucks ? `${metrics1.distanceToStarbucks}m` : '-'} / 올리브영 ${metrics1.distanceToOliveYoung ? `${metrics1.distanceToOliveYoung}m` : '-'}
단지 B: 스타벅스 ${metrics2.distanceToStarbucks ? `${metrics2.distanceToStarbucks}m` : '-'} / 올리브영 ${metrics2.distanceToOliveYoung ? `${metrics2.distanceToOliveYoung}m` : '-'}

8. 세대수 및 연식
단지 A: ${metrics1.householdCount ? `${metrics1.householdCount.toLocaleString()}세대` : '-'} (${metrics1.yearBuilt ? `${metrics1.yearBuilt}년` : '-'})
단지 B: ${metrics2.householdCount ? `${metrics2.householdCount.toLocaleString()}세대` : '-'} (${metrics2.yearBuilt ? `${metrics2.yearBuilt}년` : '-'})

9. 평균 매매시세 (최근 3개월)
단지 A: ${displayPrice(metrics1.avg3MPrice)}
단지 B: ${displayPrice(metrics2.avg3MPrice)}

10. 평균 평당가 (최근 3개월)
단지 A: ${metrics1.avg3MPerPyeong ? `${metrics1.avg3MPerPyeong.toLocaleString()}만 원` : '-'}
단지 B: ${metrics2.avg3MPerPyeong ? `${metrics2.avg3MPerPyeong.toLocaleString()}만 원` : '-'}

D-VIEW에서 더 자세한 입지 분석과 실거래가 분석을 확인해보세요.`;

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    navigator.clipboard.writeText(text).then(() => {
      if (!mountedRef.current) return;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      setIsCopied(true);
      copyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsCopied(false);
          copyTimeoutRef.current = null;
        }
      }, 2000);
    });
  };

  const getCompareClass = (isApt1: boolean, winValue: boolean | null) => {
    if (winValue === null) return 'border-border/50 text-secondary bg-surface/30';
    const isWinner = isApt1 ? winValue === true : winValue === false;
    return isWinner
      ? 'border-[#00d29d] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shadow-[0_0_0_1px_#00d29d_inset]'
      : 'border-border/30 text-tertiary opacity-70 bg-surface/10';
  };

  return (
    <div className="fixed inset-0 z-[12000] flex flex-col justify-end md:justify-center items-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div
        ref={containerRef}
        className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-[1150px] h-[92vh] md:h-auto md:min-h-[460px] md:max-h-[90vh] rounded-t-[24px] md:rounded-[24px] flex flex-col shadow-2xl transition-transform duration-300 slide-in-from-bottom overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4 shrink-0 bg-surface/50">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-black text-primary flex items-center gap-1.5">
              <span>1:1 아파트 단지 비교 분석기</span>
            </h2>
            <p className="text-[12px] font-medium text-tertiary">
              두 단지의 입지 조건, 단지 규모, 실거래 트렌드를 직관적으로 대조 비교합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-body hover:bg-border/30 text-secondary transition-all"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>

        {/* Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* Selectors Section */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center bg-body/50 p-4 rounded-2xl border border-border/20">
            {/* Apt 1 Input */}
            <div className="md:col-span-3 relative" ref={dropdownRef1}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
                <input
                  type="text"
                  placeholder="1번 단지 검색..."
                  value={searchQuery1}
                  onChange={(e) => {
                    setSearchQuery1(e.target.value);
                    if (apt1) setApt1(null);
                  }}
                  onFocus={() => setIsFocused1(true)}
                  onKeyDown={handleKeyDown1}
                  className="w-full bg-surface border border-border/40 focus:border-[#00d29d] rounded-xl py-2 pl-9 pr-8 text-[13.5px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
                />
                {searchQuery1 && (
                  <button
                    onClick={() => {
                      setSearchQuery1('');
                      setApt1(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {isFocused1 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border shadow-xl rounded-xl z-50 overflow-y-auto max-h-[220px] py-1">
                  {dropdownOptions1.length > 0 ? (
                    <>
                      {searchQuery1.trim() === '' && recentApts.length > 0 && (
                        <div className="px-3 py-1 text-[10px] font-black text-tertiary uppercase tracking-wider border-b border-border/10 mb-1">
                          최근 선택 단지
                        </div>
                      )}
                      {dropdownOptions1.map((apt, index) => {
                        const isFirstRemaining = searchQuery1.trim() === '' && recentApts.length > 0 && index === recentApts.length;
                        return (
                          <React.Fragment key={apt.name}>
                            {isFirstRemaining && (
                              <div className="px-3 py-1 mt-2 text-[10px] font-black text-tertiary uppercase tracking-wider border-t border-b border-border/10 mb-1 pt-1.5">
                                전체 단지 리스트
                              </div>
                            )}
                            <button
                              data-index={index}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setApt1(apt);
                                setSearchQuery1(getDisplayAptName(apt.name));
                                setIsFocused1(false);
                                saveToRecent(apt);
                              }}
                              className={`w-full text-left px-3 py-2 text-[12.5px] font-bold hover:bg-body text-secondary flex items-center justify-between transition-all ${
                                activeIndex1 === index ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : ''
                              }`}
                            >
                              <span>{getDisplayAptName(apt.name)}</span>
                              <span className="text-[10px] text-tertiary px-1.5 py-0.5 bg-body rounded">{apt.dong}</span>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-[12px] font-bold text-tertiary text-center">검색 결과가 없습니다</div>
                  )}
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="md:col-span-1 flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d29d] to-emerald-500 text-white font-black text-[12px] flex items-center justify-center shadow-md select-none shrink-0">
                VS
              </span>
            </div>

            {/* Apt 2 Input */}
            <div className="md:col-span-3 relative" ref={dropdownRef2}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
                <input
                  type="text"
                  placeholder="2번 단지 검색..."
                  value={searchQuery2}
                  onChange={(e) => {
                    setSearchQuery2(e.target.value);
                    if (apt2) setApt2(null);
                  }}
                  onFocus={() => setIsFocused2(true)}
                  onKeyDown={handleKeyDown2}
                  className="w-full bg-surface border border-border/40 focus:border-[#00d29d] rounded-xl py-2 pl-9 pr-8 text-[13.5px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
                />
                {searchQuery2 && (
                  <button
                    onClick={() => {
                      setSearchQuery2('');
                      setApt2(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {isFocused2 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border shadow-xl rounded-xl z-50 overflow-y-auto max-h-[220px] py-1">
                  {dropdownOptions2.length > 0 ? (
                    <>
                      {searchQuery2.trim() === '' && recentApts.length > 0 && (
                        <div className="px-3 py-1 text-[10px] font-black text-tertiary uppercase tracking-wider border-b border-border/10 mb-1">
                          최근 선택 단지
                        </div>
                      )}
                      {dropdownOptions2.map((apt, index) => {
                        const isFirstRemaining = searchQuery2.trim() === '' && recentApts.length > 0 && index === recentApts.length;
                        return (
                          <React.Fragment key={apt.name}>
                            {isFirstRemaining && (
                              <div className="px-3 py-1 mt-2 text-[10px] font-black text-tertiary uppercase tracking-wider border-t border-b border-border/10 mb-1 pt-1.5">
                                전체 단지 리스트
                              </div>
                            )}
                            <button
                              data-index={index}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setApt2(apt);
                                setSearchQuery2(getDisplayAptName(apt.name));
                                setIsFocused2(false);
                                saveToRecent(apt);
                              }}
                              className={`w-full text-left px-3 py-2 text-[12.5px] font-bold hover:bg-body text-secondary flex items-center justify-between transition-all ${
                                activeIndex2 === index ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : ''
                              }`}
                            >
                              <span>{getDisplayAptName(apt.name)}</span>
                              <span className="text-[10px] text-tertiary px-1.5 py-0.5 bg-body rounded">{apt.dong}</span>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-[12px] font-bold text-tertiary text-center">검색 결과가 없습니다</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warning / Instruction when not selected */}
          {(!apt1 || !apt2) && (
            <div className="flex flex-col items-center justify-center p-8 bg-body/30 rounded-2xl border border-dashed border-border text-center">
              <Building2 className="w-10 h-10 text-tertiary/75 mb-3" />
              <p className="text-[14px] font-extrabold text-secondary">비교할 단지를 모두 선택해주세요</p>
              <p className="text-[11.5px] font-medium text-tertiary mt-1">상단 자동완성 드롭다운을 통해 두 단지를 선택하면 입지 가치와 차트 비교가 활성화됩니다.</p>
            </div>
          )}

          {/* Comparison Matrix Table */}
          {apt1 && apt2 && metrics1 && metrics2 && (
            <div className="space-y-6">
              {/* Verdict Summary Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[12px] font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                    종합 분석 결과 판정
                  </div>
                  <div className="text-[15px] font-extrabold text-primary leading-snug">
                    {score.apt1 > score.apt2 ? (
                      <span>
                        {apt1Label} 단지가 총 {score.apt1}개 지표에서 우위에 있습니다. (상대 단지 {score.apt2}개)
                      </span>
                    ) : score.apt2 > score.apt1 ? (
                      <span>
                        {apt2Label} 단지가 총 {score.apt2}개 지표에서 우위에 있습니다. (상대 단지 {score.apt1}개)
                      </span>
                    ) : (
                      <span>
                        두 단지가 각각 {score.apt1}개 지표에서 동률로 팽팽합니다.
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] font-medium text-tertiary">
                    10대 핵심 인프라 및 가치 지표를 종합 분석한 정량적 비교 결과입니다.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 relative">
                  <button
                    onClick={() => {
                      if (apt1 && apt2) {
                        shareCompareToKakao({
                          apt1Name: apt1.name,
                          apt2Name: apt2.name,
                          scoreApt1: score.apt1,
                          scoreApt2: score.apt2
                        });
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl text-[12.5px] font-black bg-[#FEE500] hover:bg-[#FEE500]/95 text-[#3A1D1D] shadow-md hover:shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 select-none"
                  >
                    <Share2 size={14} />
                    <span>카카오톡 결과 공유</span>
                  </button>

                  <div className="relative flex flex-col items-stretch">
                    <button
                      onClick={handleShare}
                      className={`px-4 py-2.5 rounded-xl text-[12.5px] font-black transition-all duration-200 select-none ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg active:scale-95 cursor-pointer'
                      }`}
                    >
                      {isCopied ? '클립보드 복사 완료' : '비교 보고서 복사'}
                    </button>
                    <div className={`mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 text-right transition-all duration-300 absolute top-full right-0 z-50 ${
                      isCopied ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-1 invisible'
                    } leading-normal max-w-[220px] break-keep`}>
                      복사되었습니다. 이제 카카오톡방이나 메모장에 붙여넣기(Ctrl + V) 하실 수 있습니다.
                    </div>
                  </div>
                </div>
              </div>

              {/* Radar Chart Section */}
              <div className="bg-[#fcfdfe]/50 dark:bg-[#151b26]/30 border border-border/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 space-y-2">
                  <h4 className="text-[13px] font-black text-[#00d29d] tracking-wider uppercase">단지 가치 오각형 분석</h4>
                  <h3 className="text-[16px] font-black text-primary">5대 지표 스펙트럼 대조</h3>
                  <p className="text-[12px] font-medium text-tertiary leading-relaxed break-keep">
                    철도교통, 초·중등 학군, 상권 인프라, 세대당 주차 및 단지 규모, 준공 연식 등 입지를 구성하는 5가지 다차원 가치를 정량화한 분석 차트입니다. 다각형 면적이 넓고 균형 잡힐수록 완성도 높은 입지를 뜻합니다.
                  </p>
                </div>
                
                {/* Radar Chart Container */}
                <div className="w-full md:w-[360px] h-[260px] shrink-0 flex items-center justify-center relative">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                        <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" className="dark:stroke-zinc-800" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                        />
                        <PolarRadiusAxis 
                          angle={30} 
                          domain={[0, 100]} 
                          tick={{ fill: '#94a3b8', fontSize: 8 }}
                          axisLine={false}
                        />
                        <Radar
                          name={apt1Label}
                          dataKey={apt1Label}
                          stroke="#00d29d"
                          fill="#00d29d"
                          fillOpacity={0.25}
                        />
                        <Radar
                          name={apt2Label}
                          dataKey={apt2Label}
                          stroke="#ff9f0a"
                          fill="#ff9f0a"
                          fillOpacity={0.25}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={24}
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '10.5px', fontWeight: 800, color: '#475569' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-body/20 rounded-xl" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5 px-1">
                  <Award size={16} className="text-[#00d29d]" />
                  <span>1:1 지표 매트릭스 비교</span>
                </h3>

              <div className="overflow-hidden border border-border/30 rounded-2xl shadow-sm bg-surface/40">
                {/* Header row */}
                <div className="grid grid-cols-3 bg-body/50 border-b border-border/30 px-4 py-3 text-[11px] font-extrabold text-tertiary tracking-wider uppercase">
                  <div className="flex flex-col justify-center">비교 평가 지표</div>
                  <div className="text-center truncate flex flex-col items-center justify-center gap-1">
                    {aiFitScores.winner === 'apt1' && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-white bg-[#00d29d] px-2 py-0.5 rounded-full shadow-sm animate-pulse mb-1 shrink-0">
                        <Sparkles size={8} className="fill-white" />
                        <span>AI 맞춤 위너</span>
                      </span>
                    )}
                    <span className="block">{apt1Label}</span>
                    {quizAnswers && (
                      <span className="text-[9.5px] text-emerald-600 dark:text-[#00d29d] font-bold">
                        AI 적합도 {aiFitScores.score1}점
                      </span>
                    )}
                  </div>
                  <div className="text-center truncate flex flex-col items-center justify-center gap-1">
                    {aiFitScores.winner === 'apt2' && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-white bg-[#00d29d] px-2 py-0.5 rounded-full shadow-sm animate-pulse mb-1 shrink-0">
                        <Sparkles size={8} className="fill-white" />
                        <span>AI 맞춤 위너</span>
                      </span>
                    )}
                    <span className="block">{apt2Label}</span>
                    {quizAnswers && (
                      <span className="text-[9.5px] text-emerald-600 dark:text-[#00d29d] font-bold">
                        AI 적합도 {aiFitScores.score2}점
                      </span>
                    )}
                  </div>
                </div>

                {/* --- Section: 역세권 인프라 --- */}
                <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
                  <MapPin size={12} className="text-[#0284c7]" /> 역세권 인프라 (철도 및 트램)
                </div>

                <div className="divide-y divide-border/20">
                  {/* GTX Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.transit === 'gtx' ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold">GTX-A / SRT역 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.subway)}`}>
                      {metrics1.distanceToSubway ? `${metrics1.distanceToSubway}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.subway)}`}>
                      {metrics2.distanceToSubway ? `${metrics2.distanceToSubway}m` : '-'}
                    </div>
                  </div>

                  {/* Indeokwon Line Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.transit === 'indeokwon' ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold">동인선 예정역 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.indeokwon)}`}>
                      {metrics1.distanceToIndeokwon ? `${metrics1.distanceToIndeokwon}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.indeokwon)}`}>
                      {metrics2.distanceToIndeokwon ? `${metrics2.distanceToIndeokwon}m` : '-'}
                    </div>
                  </div>

                  {/* Tram Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.transit === 'tram' ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold">동탄트램 예정역 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.tram)}`}>
                      {metrics1.distanceToTram ? `${metrics1.distanceToTram}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.tram)}`}>
                      {metrics2.distanceToTram ? `${metrics2.distanceToTram}m` : '-'}
                    </div>
                  </div>
                </div>

                {/* --- Section: 교육 및 생활 인프라 --- */}
                <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-t border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
                  <School size={12} className="text-[#0ea5e9]" /> 교육 및 생활 인프라 (학교 및 편의시설)
                </div>

                <div className="divide-y divide-border/20">
                  {/* School Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${(quizAnswers?.family === 'baby' || quizAnswers?.family === 'elementary') ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold flex items-center gap-1">
                      <span>초등학교 도보 통학 거리</span>
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.elementary)}`}>
                      {metrics1.distanceToElementary ? `${metrics1.distanceToElementary}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.elementary)}`}>
                      {metrics2.distanceToElementary ? `${metrics2.distanceToElementary}m` : '-'}
                    </div>
                  </div>

                  {/* Middle School Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.family === 'middleHigh' ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold">중학교 도보 통학 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.middle)}`}>
                      {metrics1.distanceToMiddle ? `${metrics1.distanceToMiddle}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.middle)}`}>
                      {metrics2.distanceToMiddle ? `${metrics2.distanceToMiddle}m` : '-'}
                    </div>
                  </div>

                  {/* High School Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.family === 'middleHigh' ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold">고등학교 도보 통학 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.high)}`}>
                      {metrics1.distanceToHigh ? `${metrics1.distanceToHigh}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.high)}`}>
                      {metrics2.distanceToHigh ? `${metrics2.distanceToHigh}m` : '-'}
                    </div>
                  </div>

                  {/* Park Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${(quizAnswers?.lifestyle === 'nature' || quizAnswers?.family === 'baby' || quizAnswers?.family === 'elementary' || quizAnswers?.family === 'middleHigh') ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold flex items-center gap-1">
                      <TreePine size={13} className="text-emerald-500" />
                      <span>공원 도보 거리</span>
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.park)}`}>
                      {metrics1.distanceToPark ? `${metrics1.distanceToPark}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.park)}`}>
                      {metrics2.distanceToPark ? `${metrics2.distanceToPark}m` : '-'}
                    </div>
                  </div>

                  {/* Starbucks Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.lifestyle === 'shop' ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold">스타벅스 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.starbucks)}`}>
                      {metrics1.distanceToStarbucks ? `${metrics1.distanceToStarbucks}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.starbucks)}`}>
                      {metrics2.distanceToStarbucks ? `${metrics2.distanceToStarbucks}m` : '-'}
                    </div>
                  </div>

                  {/* Olive Young Distance */}
                  <div className={`grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium transition-colors ${quizAnswers?.lifestyle === 'shop' ? 'bg-emerald-500/10' : ''}`}>
                    <div className="text-secondary font-bold">올리브영 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.oliveYoung)}`}>
                      {metrics1.distanceToOliveYoung ? `${metrics1.distanceToOliveYoung}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.oliveYoung)}`}>
                      {metrics2.distanceToOliveYoung ? `${metrics2.distanceToOliveYoung}m` : '-'}
                    </div>
                  </div>
                </div>

                                {/* --- Section: 단지 스펙 --- */}
                <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-t border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
                  <Building2 size={12} className="text-[#db2777]" /> 단지 스펙 (규모·연식)
                </div>

                <div className="divide-y divide-border/20">
                  {/* Household Count */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">총 세대수</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.households)}`}>
                      {metrics1.householdCount ? `${metrics1.householdCount.toLocaleString()}세대` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.households)}`}>
                      {metrics2.householdCount ? `${metrics2.householdCount.toLocaleString()}세대` : '-'}
                    </div>
                  </div>

                  {/* Year Built */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">준공년도 (연식)</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.year)}`}>
                      {formatYearBuilt(metrics1.rawYearBuilt, metrics1.yearBuilt)}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.year)}`}>
                      {formatYearBuilt(metrics2.rawYearBuilt, metrics2.yearBuilt)}
                    </div>
                  </div>

                  {/* Parking Per Household */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">세대당 주차대수</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.parking)}`}>
                      {metrics1.parkingPerHousehold ? `${metrics1.parkingPerHousehold.toFixed(2)}대` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.parking)}`}>
                      {metrics2.parkingPerHousehold ? `${metrics2.parkingPerHousehold.toFixed(2)}대` : '-'}
                    </div>
                  </div>

                  {/* Brand */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">건설사 브랜드</div>
                    <div className="mx-auto px-3 py-1 rounded-xl border border-border/50 text-center font-bold text-secondary bg-surface/30">
                      {metrics1.brand || '-'}
                    </div>
                    <div className="mx-auto px-3 py-1 rounded-xl border border-border/50 text-center font-bold text-secondary bg-surface/30">
                      {metrics2.brand || '-'}
                    </div>
                  </div>
                </div>

                {/* --- Section: 가치 및 시세 정보 --- */}
                <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-t border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
                  <TrendingUp size={12} className="text-[#00d29d]" /> 가치 & 거래 정보 (최근 3M 기준)
                </div>

                <div className="divide-y divide-border/20">
                  {/* Average Price */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">평균 매매시세 (3M)</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.price)}`}>
                      {displayPrice(metrics1.avg3MPrice)}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.price)}`}>
                      {displayPrice(metrics2.avg3MPrice)}
                    </div>
                  </div>

                  {/* Price per Pyeong */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">평균 평당가 (3M)</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.perPyeong)}`}>
                      {metrics1.avg3MPerPyeong ? `${metrics1.avg3MPerPyeong.toLocaleString()}만 원` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.perPyeong)}`}>
                      {metrics2.avg3MPerPyeong ? `${metrics2.avg3MPerPyeong.toLocaleString()}만 원` : '-'}
                    </div>
                  </div>

                  {/* Average Rent */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">평균 전세보증금 (3M)</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.rent)}`}>
                      {displayPrice(metrics1.avg3MRent)}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.rent)}`}>
                      {displayPrice(metrics2.avg3MRent)}
                    </div>
                  </div>

                  {/* Jeonse Ratio */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">평균 전세가율</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.ratio)}`}>
                      {metrics1.jeonseRatio ? `${metrics1.jeonseRatio.toFixed(1)}%` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.ratio)}`}>
                      {metrics2.jeonseRatio ? `${metrics2.jeonseRatio.toFixed(1)}%` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sponsored moving/interior helper card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-500/10 dark:border-emerald-500/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    AD
                  </span>
                  <span className="text-[12px] font-black text-secondary">
                    제휴 혜택 안내
                  </span>
                </div>
                <div className="text-[14px] font-extrabold text-primary leading-snug">
                  동탄역 대단지 전문 이사 및 고품격 인테리어 무료 견적
                </div>
                <p className="text-[11.5px] font-medium text-tertiary">
                  D-VIEW 제휴 파트너사를 통해 제공되는 매칭 특별 할인 혜택을 비교와 동시에 만나보세요.
                </p>
              </div>
              
              <a
                href="https://dview-moving.toss.im"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl text-[12.5px] font-black text-center bg-toss-blue hover:bg-[#00b386] text-white shadow-md hover:shadow-lg transition-all duration-200 select-none shrink-0"
              >
                무료 견적 받기
              </a>
            </div>
          </div>
        )}

          {/* Historical Price Trend Dual Chart */}
          {apt1 && apt2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1 flex-wrap gap-3">
                <h3 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-toss-blue" />
                  <span>실거래 시계열 가격 트렌드 (월별 평균 거래가)</span>
                </h3>
                
                {/* Chart Toggle Group */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Absolute / Per-Pyeong Toggle */}
                  <div className="flex bg-[#f2f4f6] dark:bg-zinc-800 p-0.5 rounded-xl border border-border/10">
                    <button
                      onClick={() => setPriceMetric('absolute')}
                      className={`px-3 py-1 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer ${priceMetric === 'absolute' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                    >
                      절대 가격
                    </button>
                    <button
                      onClick={() => setPriceMetric('perPyeong')}
                      className={`px-3 py-1 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer ${priceMetric === 'perPyeong' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                    >
                      평당 가격
                    </button>
                  </div>

                  {/* Sale / Rent Toggle */}
                  <div className="flex bg-[#f2f4f6] dark:bg-zinc-800 p-0.5 rounded-xl border border-border/10">
                    <button
                      onClick={() => setChartType('sale')}
                      className={`px-3 py-1 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer ${chartType === 'sale' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                    >
                      매매 가격
                    </button>
                    <button
                      onClick={() => setChartType('jeonse')}
                      className={`px-3 py-1 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer ${chartType === 'jeonse' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                    >
                      전세 보증금
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full bg-surface/50 border border-border/20 rounded-2xl p-4 md:p-6 shadow-sm">
                {isTxLoading1 || isTxLoading2 ? (
                  <div className="w-full h-[320px] flex items-center justify-center">
                    <span className="text-[13px] font-bold text-tertiary animate-pulse">실거래 추이 데이터를 불러오는 중...</span>
                  </div>
                ) : combinedChartData.length > 0 ? (
                  <div className="w-full h-[320px]">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.2)" />
                          <XAxis
                            dataKey="month"
                            stroke="#94a3b8"
                            fontSize={11}
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value: string) => {
                              if (typeof value === 'string' && /^\d{2}\.\d{2}$/.test(value)) {
                                const parts = value.split('.');
                                return `${parts[0]}년 ${parts[1]}월`;
                              }
                              return value;
                            }}
                          />
                          <YAxis
                            stroke="#94a3b8"
                            fontSize={11}
                            fontWeight="bold"
                            width={priceMetric === 'perPyeong' ? 60 : 42}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => priceMetric === 'perPyeong' ? `${value.toLocaleString()}만` : `${value}억`}
                            domain={yAxisDomain as any}
                            allowDataOverflow={true}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(30, 41, 59, 0.95)',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                            }}
                            labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            labelFormatter={(value: any) => {
                              if (typeof value === 'string' && /^\d{2}\.\d{2}$/.test(value)) {
                                const parts = value.split('.');
                                return `${parts[0]}년 ${parts[1]}월`;
                              }
                              return value;
                            }}
                            formatter={(value: any) => [priceMetric === 'perPyeong' ? `${value.toLocaleString()}만 원` : `${value}억원`]}
                            useTranslate3d={true}
                            animationDuration={150}
                          />
                          <Legend
                            verticalAlign="top"
                            height={36}
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Line
                            type="monotone"
                            dataKey={getDisplayAptName(apt1.name)}
                            stroke="#00d29d"
                            strokeWidth={3}
                            dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }}
                            activeDot={{ r: 5 }}
                            connectNulls
                            animationDuration={300}
                            animationEasing="ease-out"
                          />
                          <Line
                            type="monotone"
                            dataKey={getDisplayAptName(apt2.name)}
                            stroke="#4196f7"
                            strokeWidth={3}
                            dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }}
                            activeDot={{ r: 5 }}
                            connectNulls
                            animationDuration={300}
                            animationEasing="ease-out"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-body/20 rounded-xl" />
                    )}
                  </div>
                ) : (
                  <div className="w-full h-[320px] flex items-center justify-center text-center">
                    <p className="text-[12.5px] font-bold text-tertiary">시계열 거래 정보가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AptCompareModal.displayName = 'AptCompareModal';
export default AptCompareModal;

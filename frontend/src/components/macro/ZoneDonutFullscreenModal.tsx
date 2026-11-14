'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  X,
  Minimize2,
  Search,
  ChevronRight,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import {
  PERIOD_BUTTONS,
  PERIOD_LABELS,
  formatPriceEok,
  formatDeltaPrice,
  type AptDonutDataItem,
  type AptDonutPeriod,
  type AptEnergyItem,
} from './AptDonutSection';
import {
  getToggleTrackClass,
  getToggleBtnClass,
  getControlInputClass,
} from '@/lib/design-system/controls';
import { matchesApartmentSearch } from '@/lib/utils/apartmentSearch';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { preloadApartmentModal } from '@/components/common/ComponentPreloader';
import { trackEvent, trackApartmentView, trackSearchQuery } from '@/lib/utils/analytics';

export type ZoneChronoSortOrder = 'latest' | 'oldest' | 'price_desc';
export type ZoneAllGroupingMode = 'by_zone' | 'unified_time';

export interface ZoneDetailStats {
  count: number;
  sharePct: number;
  distinctComplexCount: number;
  avgPriceVal: number;
  avgPriceLabel: string;
  compactAvgLabel: string;
  medianPriceVal: number;
  medianPriceLabel: string;
  avgPyeongPriceMan: number;
  equiv84Label: string;
  maxItem: AptEnergyItem | null;
  minItem: AptEnergyItem | null;
  newHighCount: number;
  newHighRatioPct: number;
  risingCount: number;
  fallingCount: number;
  flatCount: number;
}

export interface ChronoDateInfo {
  sortKey: string;
  fullDate: string;
  shortDate: string;
  yearStr: string;
}

export function extractChronoDateInfo(
  contractDate?: string,
  dateLabel?: string
): ChronoDateInfo {
  const rawContract = String(contractDate || '').replace(/[^0-9]/g, '');
  if (rawContract.length >= 8) {
    const y = rawContract.slice(0, 4);
    const m = rawContract.slice(4, 6);
    const d = rawContract.slice(6, 8);
    return {
      sortKey: `${y}${m}${d}`,
      fullDate: `${y}.${m}.${d}`,
      shortDate: `${m}.${d}`,
      yearStr: y,
    };
  }

  const rawLabel = String(dateLabel || contractDate || '').trim();
  if (rawLabel) {
    const fullMatch = rawLabel.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
    if (fullMatch) {
      const y = fullMatch[1];
      const m = fullMatch[2].padStart(2, '0');
      const d = fullMatch[3].padStart(2, '0');
      return {
        sortKey: `${y}${m}${d}`,
        fullDate: `${y}.${m}.${d}`,
        shortDate: `${m}.${d}`,
        yearStr: y,
      };
    }

    const shortMatch = rawLabel.match(/(\d{1,2})[.\-/월\s]+(\d{1,2})/);
    if (shortMatch) {
      const m = shortMatch[1].padStart(2, '0');
      const d = shortMatch[2].padStart(2, '0');
      return {
        sortKey: `0000${m}${d}`,
        fullDate: `${m}.${d}`,
        shortDate: `${m}.${d}`,
        yearStr: '',
      };
    }
  }

  return {
    sortKey: '00000000',
    fullDate: '-',
    shortDate: '-',
    yearStr: '',
  };
}

export function sortItemsChronologically<T extends AptEnergyItem>(
  items: readonly T[],
  sortOrder: ZoneChronoSortOrder
): T[] {
  const decorated = items.map((item, idx) => ({
    item,
    idx,
    sortKey: extractChronoDateInfo(
      item.registeredDate || item.contractDate,
      item.registeredDateLabel || item.dateLabel
    ).sortKey,
  }));

  decorated.sort((a, b) => {
    if (sortOrder === 'price_desc') {
      const priceDiff = (b.item.priceVal || 0) - (a.item.priceVal || 0);
      if (priceDiff !== 0) return priceDiff;
      return b.sortKey.localeCompare(a.sortKey) || a.idx - b.idx;
    }

    if (sortOrder === 'oldest') {
      const aUndated = a.sortKey === '00000000';
      const bUndated = b.sortKey === '00000000';
      if (aUndated !== bUndated) return aUndated ? 1 : -1;
      const dateDiff = a.sortKey.localeCompare(b.sortKey);
      if (dateDiff !== 0) return dateDiff;
      return (b.item.priceVal || 0) - (a.item.priceVal || 0) || a.idx - b.idx;
    }

    // Default: 'latest' (newest contractDate -> oldest)
    const dateDiff = b.sortKey.localeCompare(a.sortKey);
    if (dateDiff !== 0) return dateDiff;
    return (b.item.priceVal || 0) - (a.item.priceVal || 0) || a.idx - b.idx;
  });

  return decorated.map((d) => d.item);
}

export function computeZoneDetailStats(
  items: readonly AptEnergyItem[],
  marketTotalCount: number
): ZoneDetailStats {
  const valid = (items || []).filter(
    (it) =>
      it &&
      typeof it.priceVal === 'number' &&
      isFinite(it.priceVal) &&
      it.priceVal > 0
  );

  if (valid.length === 0) {
    return {
      count: 0,
      sharePct: 0,
      distinctComplexCount: 0,
      avgPriceVal: 0,
      avgPriceLabel: '-',
      compactAvgLabel: '-',
      medianPriceVal: 0,
      medianPriceLabel: '-',
      avgPyeongPriceMan: 0,
      equiv84Label: '-',
      maxItem: null,
      minItem: null,
      newHighCount: 0,
      newHighRatioPct: 0,
      risingCount: 0,
      fallingCount: 0,
      flatCount: 0,
    };
  }

  let priceSum = 0;
  let pyeongPriceSum = 0;
  let pyeongValidCount = 0;
  let newHighCount = 0;
  let risingCount = 0;
  let fallingCount = 0;
  let flatCount = 0;
  let maxItem: AptEnergyItem = valid[0];
  let minItem: AptEnergyItem = valid[0];
  const complexSet = new Set<string>();
  const prices: number[] = [];

  for (const it of valid) {
    const p = it.priceVal;
    prices.push(p);
    priceSum += p;

    if (p > maxItem.priceVal) maxItem = it;
    if (p < minItem.priceVal) minItem = it;

    const normKey = normalizeAptName(it.aptName || it.displayAptName || '');
    if (normKey) complexSet.add(normKey);

    const pyeong =
      typeof it.areaPyeong === 'number' && it.areaPyeong > 0
        ? it.areaPyeong
        : typeof it.area === 'number' && it.area > 0
          ? it.area / 3.3058
          : 0;
    if (pyeong > 0) {
      pyeongPriceSum += (p * 10000) / pyeong;
      pyeongValidCount++;
    }

    if (it.isNewHigh) {
      newHighCount++;
    }
    if (it.isNewHigh || (typeof it.delta === 'number' && it.delta > 0.0001)) {
      risingCount++;
    } else if (typeof it.delta === 'number' && it.delta < -0.0001) {
      fallingCount++;
    } else {
      flatCount++;
    }
  }

  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const medianPriceVal =
    prices.length % 2 === 1
      ? prices[mid]
      : (prices[mid - 1] + prices[mid]) / 2;

  const avgPriceVal = priceSum / valid.length;
  const avgPyeongPriceMan =
    pyeongValidCount > 0 ? Math.round(pyeongPriceSum / pyeongValidCount) : 0;

  const compactAvgLabel =
    avgPriceVal >= 1
      ? `${(Math.round(avgPriceVal * 10) / 10).toFixed(1)}억`
      : formatPriceEok(avgPriceVal);

  const equiv84Eok = avgPyeongPriceMan > 0 ? (avgPyeongPriceMan * 34) / 10000 : 0;
  const equiv84Label =
    equiv84Eok >= 1
      ? `${(Math.round(equiv84Eok * 10) / 10).toFixed(1)}억`
      : equiv84Eok > 0
        ? formatPriceEok(equiv84Eok)
        : '-';

  const sharePct =
    marketTotalCount > 0
      ? Math.round((valid.length / marketTotalCount) * 1000) / 10
      : 0;
  const newHighRatioPct = Math.round((newHighCount / valid.length) * 1000) / 10;

  return {
    count: valid.length,
    sharePct,
    distinctComplexCount: complexSet.size,
    avgPriceVal,
    avgPriceLabel: formatPriceEok(avgPriceVal),
    compactAvgLabel,
    medianPriceVal,
    medianPriceLabel: formatPriceEok(medianPriceVal),
    avgPyeongPriceMan,
    equiv84Label,
    maxItem,
    minItem,
    newHighCount,
    newHighRatioPct,
    risingCount,
    fallingCount,
    flatCount,
  };
}

interface EnrichedZoneItem extends AptEnergyItem {
  zoneKey: string;
  zoneName: string;
  zoneColor: string;
}

interface TransactionRowProps {
  item: AptEnergyItem;
  zoneKey: string;
  zoneName: string;
  zoneColor: string;
  showZoneBadge: boolean;
  onSelectApt?: (aptName: string, dong?: string) => void;
  preloadApartmentTx?: (aptName: string, dong: string) => void;
}

const ChronologicalTransactionRow = React.memo(function ChronologicalTransactionRow({
  item,
  zoneKey,
  zoneName,
  zoneColor,
  showZoneBadge,
  onSelectApt,
  preloadApartmentTx,
}: TransactionRowProps) {
  const dateInfo = extractChronoDateInfo(
    item.registeredDate || item.contractDate,
    item.registeredDateLabel || item.dateLabel
  );
  const displayName = item.displayAptName || item.aptName;
  const areaPyeong =
    item.areaPyeong && item.areaPyeong > 0
      ? item.areaPyeong
      : item.area && item.area > 0
        ? item.area / 3.3058
        : 0;
  const areaM2 =
    item.area && item.area > 0
      ? item.area
      : areaPyeong > 0
        ? areaPyeong * 3.3058
        : 0;
  const pyeongPriceMan =
    areaPyeong > 0 && item.priceVal > 0
      ? Math.round((item.priceVal * 10000) / areaPyeong)
      : 0;

  const hasDelta = typeof item.delta === 'number' && isFinite(item.delta);
  const deltaFormatted = hasDelta ? formatDeltaPrice(item.delta) : '';
  const isRising = Boolean(item.isNewHigh || (hasDelta && item.delta > 0.0001));
  const isFalling = Boolean(!item.isNewHigh && hasDelta && item.delta < -0.0001);
  const deltaPctRounded =
    typeof item.deltaPercent === 'number' && isFinite(item.deltaPercent)
      ? Math.round(item.deltaPercent * 10) / 10
      : 0;

  return (
    <button
      type="button"
      data-testid={`fullscreen-tx-row-${item.aptName}`}
      onClick={() => {
        trackEvent('donut_fullscreen_tx_click', {
          apt_name: item.aptName,
          dong: item.dong || '',
          zone: zoneKey,
        });
        const viewPayload = {
          apartment_name: item.aptName,
          apt_name: item.aptName,
          dong: item.dong || undefined,
          zone: zoneKey,
          surface: 'donut_fullscreen_modal',
          view_type: 'modal_tx_click' as const,
        };
        if (typeof trackApartmentView === 'function') {
          trackApartmentView(viewPayload);
        } else {
          trackEvent('apartment_view', viewPayload);
        }
        onSelectApt?.(item.aptName, item.dong);
      }}
      onMouseEnter={() => {
        if (preloadApartmentTx) {
          preloadApartmentTx(item.aptName, item.dong || '');
        }
        preloadApartmentModal();
      }}
      className="w-full px-3 sm:px-4 py-3 flex items-center gap-2.5 sm:gap-4 text-left bg-transparent hover:bg-elevated transition-colors border-b border-border last:border-b-0 cursor-pointer group outline-none focus-visible:bg-elevated focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600/30"
    >
      {/* Column 1: Chronological Contract Date */}
      <div className="w-[54px] sm:w-[82px] shrink-0 flex flex-col tabular-nums">
        <span className="text-[12px] sm:text-[12.5px] font-extrabold text-secondary leading-tight">
          <span className="hidden sm:inline">{dateInfo.fullDate}</span>
          <span className="inline sm:hidden">{dateInfo.shortDate}</span>
        </span>
        {dateInfo.yearStr && (
          <span className="text-[10px] text-tertiary font-medium leading-tight sm:hidden">
            {dateInfo.yearStr}년
          </span>
        )}
      </div>

      {/* Column 2: Apartment Name, Zone Badge (in unified mode), Dong · Area · Floor */}
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {showZoneBadge && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-extrabold shrink-0 whitespace-nowrap leading-none"
              style={{
                color: zoneColor,
                backgroundColor: `${zoneColor}16`,
              }}
            >
              {zoneName}
            </span>
          )}
          <span className="text-[13px] sm:text-[14px] font-extrabold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {displayName}
          </span>
          {item.isNewHigh && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/12 text-red-600 dark:text-red-400 text-[9.5px] sm:text-[10px] font-black shrink-0 whitespace-nowrap leading-none">
              신고가
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-[11.5px] text-tertiary font-medium tabular-nums">
          {item.dong && <span className="text-secondary font-semibold">{item.dong}</span>}
          {areaM2 > 0 && (
            <span>
              {item.dong ? '· ' : ''}전용 {Math.round(areaM2)}㎡
              {areaPyeong > 0 ? ` (${Math.round(areaPyeong)}평)` : ''}
            </span>
          )}
          {item.floor !== undefined && item.floor !== '' && (
            <span>· {item.floor}층</span>
          )}
        </div>
      </div>

      {/* Column 3: Real Transaction Price, Per-Pyeong Price & Momentum Delta */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-2.5 tabular-nums">
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={`text-[13.5px] sm:text-[15px] font-black tracking-tight leading-tight whitespace-nowrap ${
              item.isNewHigh
                ? 'text-red-600 dark:text-red-400'
                : 'text-primary'
            }`}
          >
            {item.priceEok || formatPriceEok(item.priceVal)}
          </span>
          <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] whitespace-nowrap">
            {pyeongPriceMan > 0 && (
              <span className="text-tertiary font-medium hidden xs:inline sm:inline">
                평당 {pyeongPriceMan.toLocaleString()}만
              </span>
            )}
            {hasDelta && item.delta !== 0 && deltaFormatted ? (
              <span
                className={`font-bold ${
                  isRising
                    ? 'text-red-600 dark:text-red-400'
                    : isFalling
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-tertiary'
                }`}
              >
                {item.delta > 0 ? `+${deltaFormatted}` : `-${deltaFormatted}`}
                {deltaPctRounded !== 0 && (
                  <span className="hidden sm:inline">
                    {` (${deltaPctRounded > 0 ? '+' : ''}${deltaPctRounded}%)`}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-tertiary font-medium">보합</span>
            )}
          </div>
        </div>
        <ChevronRight
          size={15}
          className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block"
        />
      </div>
    </button>
  );
});

export interface ZoneDonutFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneSlices: AptDonutDataItem[];
  totalCount: number;
  period: AptDonutPeriod;
  onPeriodChange: (period: AptDonutPeriod) => void;
  isPeriodLoading?: boolean;
  initialSelectedZone?: string | null;
  onSelectApt?: (aptName: string, dong?: string) => void;
  preloadApartmentTx?: (aptName: string, dong: string) => void;
}

const DEFAULT_ZONE_PREVIEW_LIMIT = 12;
const DEFAULT_SINGLE_STREAM_LIMIT = 40;

interface FullscreenDonutPieCanvasProps {
  totalCount: number;
  pieRenderData: AptDonutDataItem[];
  onSliceMouseEnter: (data: unknown, index: number) => void;
  onSliceMouseLeave: () => void;
  onSliceClick: (entry: { category?: string; name?: string }) => void;
}

const FullscreenDonutPieCanvas = React.memo(function FullscreenDonutPieCanvas({
  totalCount,
  pieRenderData,
  onSliceMouseEnter,
  onSliceMouseLeave,
  onSliceClick,
}: FullscreenDonutPieCanvasProps) {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      minHeight={0}
      initialDimension={{ width: 228, height: 228 }}
    >
      <PieChart>
        {totalCount === 0 ? (
          <Pie
            data={[{ value: 1 }]}
            cx="50%"
            cy="50%"
            innerRadius="68%"
            outerRadius="96%"
            dataKey="value"
            stroke="transparent"
            rootTabIndex={-1}
            isAnimationActive={false}
          >
            <Cell
              className="fill-slate-200 dark:fill-slate-800"
              fill="currentColor"
            />
          </Pie>
        ) : (
          <Pie
            data={pieRenderData}
            cx="50%"
            cy="50%"
            innerRadius="68%"
            outerRadius="96%"
            paddingAngle={2.5}
            dataKey="value"
            rootTabIndex={-1}
            onMouseEnter={onSliceMouseEnter}
            onMouseLeave={onSliceMouseLeave}
            onClick={onSliceClick}
            cursor="pointer"
            isAnimationActive={false}
          >
            {pieRenderData.map((entry) => (
              <Cell
                key={entry.category}
                fill={entry.color}
                opacity={1}
                stroke="transparent"
                strokeWidth={0}
                className="transition-all duration-200 outline-none cursor-pointer"
              />
            ))}
          </Pie>
        )}
        <Tooltip content={() => null} />
      </PieChart>
    </ResponsiveContainer>
  );
});

export const ZoneDonutFullscreenModal = React.memo(function ZoneDonutFullscreenModal({
  isOpen,
  onClose,
  zoneSlices,
  totalCount,
  period,
  onPeriodChange,
  isPeriodLoading = false,
  initialSelectedZone = null,
  onSelectApt,
  preloadApartmentTx,
}: ZoneDonutFullscreenModalProps) {
  const [selectedZoneKey, setSelectedZoneKey] = useState<string>('all');
  const [hoveredZoneKey, setHoveredZoneKey] = useState<string | null>(null);
  const [groupingMode, setGroupingMode] = useState<ZoneAllGroupingMode>('by_zone');
  const [sortOrder, setSortOrder] = useState<ZoneChronoSortOrder>('latest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoneLimits, setZoneLimits] = useState<Record<string, number>>({});
  const [streamLimit, setStreamLimit] = useState<number>(DEFAULT_SINGLE_STREAM_LIMIT);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const selectedZoneKeyRef = useRef<string>(selectedZoneKey);

  useEffect(() => {
    selectedZoneKeyRef.current = selectedZoneKey;
  }, [selectedZoneKey]);

  const trimmedFullscreenSearch = searchQuery.trim();
  const lastTrackedFullscreenSearchRef = useRef<string>('');

  useEffect(() => {
    if (!trimmedFullscreenSearch) {
      lastTrackedFullscreenSearchRef.current = '';
      return;
    }
    if (!isOpen) return;

    const normalizedQuery = trimmedFullscreenSearch.slice(0, 100);
    const timer = setTimeout(() => {
      if (lastTrackedFullscreenSearchRef.current !== normalizedQuery) {
        lastTrackedFullscreenSearchRef.current = normalizedQuery;
        const searchPayload = {
          search_term: normalizedQuery,
          query: normalizedQuery,
          surface: 'donut_fullscreen_modal',
          zone: selectedZoneKeyRef.current,
        };
        if (typeof trackSearchQuery === 'function') {
          trackSearchQuery(searchPayload);
        } else {
          trackEvent('search_query', searchPayload);
        }
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [trimmedFullscreenSearch, isOpen]);

  // Sync initial selection when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (
      initialSelectedZone &&
      zoneSlices.some(
        (z) => z.category === initialSelectedZone || z.name === initialSelectedZone
      )
    ) {
      const matched = zoneSlices.find(
        (z) => z.category === initialSelectedZone || z.name === initialSelectedZone
      );
      setSelectedZoneKey(matched ? matched.category : 'all');
    } else {
      setSelectedZoneKey('all');
    }
    setHoveredZoneKey(null);
    setZoneLimits({});
    setStreamLimit(DEFAULT_SINGLE_STREAM_LIMIT);
  }, [isOpen, initialSelectedZone, zoneSlices]);

  // Reset pagination limits when period, sort, or search changes
  useEffect(() => {
    setZoneLimits({});
    setStreamLimit(DEFAULT_SINGLE_STREAM_LIMIT);
    if (rightScrollRef.current && typeof rightScrollRef.current.scrollTo === 'function') {
      rightScrollRef.current.scrollTo({ top: 0 });
    }
  }, [period, sortOrder, searchQuery, selectedZoneKey, groupingMode]);

  // Lock body scroll and bind Escape key while open
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelectZone = useCallback((zoneCategory: string) => {
    setHoveredZoneKey(null);
    setSelectedZoneKey((prev) => {
      const next = prev === zoneCategory ? 'all' : zoneCategory;
      trackEvent('donut_fullscreen_zone_filter', { zone: next });
      return next;
    });
  }, []);

  const pieRenderData = useMemo(() => {
    const nonZero = zoneSlices.filter((z) => z.count > 0);
    return nonZero.length > 0 ? nonZero : zoneSlices;
  }, [zoneSlices]);

  const trimmedQuery = searchQuery.trim();

  // Filter & chronologically sort each zone's real transactions
  const processedZones = useMemo(() => {
    return zoneSlices.map((zone) => {
      const filteredItems = trimmedQuery
        ? (zone.items || []).filter((it) =>
            matchesApartmentSearch(
              {
                name: it.aptName || '',
                displayName: it.displayAptName,
                dong: it.dong,
                extraTerms: [zone.name, zone.subName || ''],
              },
              trimmedQuery
            )
          )
        : zone.items || [];

      const chronoItems = sortItemsChronologically(filteredItems, sortOrder);
      const stats = computeZoneDetailStats(filteredItems, totalCount);

      return {
        zone,
        chronoItems,
        stats,
      };
    });
  }, [zoneSlices, trimmedQuery, sortOrder, totalCount]);

  const filteredMarketTotalCount = useMemo(
    () => processedZones.reduce((acc, pz) => acc + pz.chronoItems.length, 0),
    [processedZones]
  );

  // Active statistical summary (either selected single zone or all 6 zones combined)
  const activeScopeStats = useMemo(() => {
    if (selectedZoneKey !== 'all') {
      const target = processedZones.find((pz) => pz.zone.category === selectedZoneKey);
      return target
        ? target.stats
        : computeZoneDetailStats([], filteredMarketTotalCount);
    }
    const allFilteredItems = processedZones.flatMap((pz) => pz.chronoItems);
    return computeZoneDetailStats(allFilteredItems, totalCount);
  }, [selectedZoneKey, processedZones, filteredMarketTotalCount, totalCount]);

  const activeZoneMeta = useMemo(() => {
    if (selectedZoneKey === 'all') return null;
    return zoneSlices.find((z) => z.category === selectedZoneKey) || null;
  }, [selectedZoneKey, zoneSlices]);

  const hudPreviewZone = useMemo(() => {
    if (activeZoneMeta) return activeZoneMeta;
    if (hoveredZoneKey) {
      return zoneSlices.find((z) => z.category === hoveredZoneKey) || null;
    }
    return null;
  }, [activeZoneMeta, hoveredZoneKey, zoneSlices]);

  const fullscreenChartBoxRef = useRef<HTMLDivElement | null>(null);
  const fullscreenTouchTimeRef = useRef<number>(0);

  const canUseFullscreenHover = useCallback(() => {
    if (Date.now() - fullscreenTouchTimeRef.current < 600) return false;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        if (window.matchMedia('(hover: none)').matches) return false;
      } catch {
        // Ignore matchMedia errors
      }
    }
    return true;
  }, []);

  const fullscreenSliceHandlersRef = useRef({
    selectedZoneKey,
    pieRenderData,
    zoneSlices,
    handleSelectZone,
    canUseFullscreenHover,
  });
  useEffect(() => {
    fullscreenSliceHandlersRef.current = {
      selectedZoneKey,
      pieRenderData,
      zoneSlices,
      handleSelectZone,
      canUseFullscreenHover,
    };
  });

  const handleFullscreenSliceEnter = useCallback((_data: unknown, index: number) => {
    const {
      selectedZoneKey: curZone,
      pieRenderData: curPieData,
      canUseFullscreenHover: checkHover,
    } = fullscreenSliceHandlersRef.current;
    if (curZone !== 'all' || !checkHover()) return;
    const entry = curPieData[index];
    if (entry) {
      setHoveredZoneKey((prev) => (prev === entry.category ? prev : entry.category));
    }
  }, []);

  const handleFullscreenSliceLeave = useCallback(() => {
    setHoveredZoneKey((prev) => (prev === null ? prev : null));
  }, []);

  const handleFullscreenSliceClick = useCallback((entry: { category?: string; name?: string }) => {
    const { zoneSlices: curZones, handleSelectZone: selectZone } = fullscreenSliceHandlersRef.current;
    const matched = curZones.find(
      (z) => z.category === entry?.category || z.name === entry?.name
    );
    if (matched) {
      selectZone(matched.category);
    }
  }, []);

  useEffect(() => {
    const box = fullscreenChartBoxRef.current;
    if (!box) return;
    const paths = box.querySelectorAll<SVGElement>('.recharts-sector, [data-testid="pie-cell"]');
    paths.forEach((pathEl, idx) => {
      const entry = pieRenderData[idx];
      if (!entry) return;
      const isSelected = selectedZoneKey === entry.category;
      const isHover = selectedZoneKey === 'all' && hoveredZoneKey === entry.category;
      const isHighlighted =
        (selectedZoneKey === 'all' && hoveredZoneKey === null) || isSelected || isHover;
      const targetOpacity = isHighlighted ? '1' : '0.3';
      const targetStroke = isSelected || isHover ? '#ffffff' : 'transparent';
      const targetStrokeWidth = isSelected || isHover ? '2.5' : '0';
      pathEl.setAttribute('opacity', targetOpacity);
      pathEl.style.opacity = targetOpacity;
      pathEl.setAttribute('stroke', targetStroke);
      pathEl.setAttribute('stroke-width', targetStrokeWidth);
    });
  }, [selectedZoneKey, hoveredZoneKey, pieRenderData, totalCount, isOpen]);

  // Unified chronological stream across all zones (when groupingMode === 'unified_time' or single zone selected)
  const unifiedChronoStream = useMemo<EnrichedZoneItem[]>(() => {
    const sourceZones =
      selectedZoneKey === 'all'
        ? processedZones
        : processedZones.filter((pz) => pz.zone.category === selectedZoneKey);

    const merged: EnrichedZoneItem[] = [];
    for (const pz of sourceZones) {
      for (const it of pz.chronoItems) {
        merged.push({
          ...it,
          zoneKey: pz.zone.category,
          zoneName: pz.zone.name,
          zoneColor: pz.zone.color,
        });
      }
    }
    return sortItemsChronologically(merged, sortOrder);
  }, [selectedZoneKey, processedZones, sortOrder]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = document.getElementById('modal-root') || document.body;

  return createPortal(
    <div
      data-testid="zone-donut-fullscreen-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zone-donut-fullscreen-title"
      className="fixed inset-0 z-[9000] w-screen h-[100dvh] bg-surface text-primary flex flex-col overflow-hidden animate-in fade-in duration-150"
    >
      {/* ═══ Top Sticky Command Header ═══ */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-3 border-b border-border bg-surface shrink-0 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: activeZoneMeta ? activeZoneMeta.color : '#3182f6',
            }}
          />
          <h2
            id="zone-donut-fullscreen-title"
            className="text-[15px] sm:text-[17px] font-black text-primary tracking-tight truncate"
          >
            권역별 실거래 · 시세 상세 분석
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-elevated text-[11px] sm:text-[12px] font-extrabold text-secondary tabular-nums shrink-0">
            총 {totalCount.toLocaleString()}건
          </span>
          <span className="hidden md:inline text-[12px] text-tertiary font-medium">
            국토교통부 실거래가 기준 ({PERIOD_LABELS[period]})
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
          {/* Period Switcher synced directly with Donut Chart */}
          <div className={getToggleTrackClass()}>
            {PERIOD_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                type="button"
                data-testid={`fullscreen-period-${btn.key}`}
                onClick={() => onPeriodChange(btn.key)}
                className={getToggleBtnClass({
                  active: period === btn.key,
                  size: 'sm',
                  extraClass: 'tabular-nums',
                })}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="donut-fullscreen-close-btn"
            onClick={onClose}
            aria-label="전체화면 닫기"
            className="h-[34px] sm:h-[36px] px-3 rounded-[10px] bg-elevated hover:bg-slate-200/70 dark:hover:bg-slate-800 text-[12px] sm:text-[13px] font-extrabold text-secondary hover:text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
          >
            <Minimize2 size={14} className="hidden sm:block" />
            <X size={16} className="sm:hidden" />
            <span className="hidden sm:inline">축소</span>
          </button>
        </div>
      </header>

      {/* ═══ Main Fullscreen Split Workspace ═══ */}
      <div
        ref={rightScrollRef}
        className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden"
      >
        {/* ─── Left Column: Enlarged Interactive Donut & 6-Zone Breakdown Matrix ─── */}
        <aside
          onTouchStartCapture={() => {
            fullscreenTouchTimeRef.current = Date.now();
          }}
          className="lg:col-span-5 xl:col-span-4 border-b lg:border-b-0 lg:border-r border-border bg-surface p-4 sm:p-6 flex flex-col gap-5 lg:overflow-y-auto"
        >
          {/* Enlarged Interactive Donut Stage */}
          <div className="w-full flex flex-col items-center justify-center py-1">
            <div
              ref={fullscreenChartBoxRef}
              data-testid="fullscreen-donut-box"
              onMouseLeave={handleFullscreenSliceLeave}
              className={`relative w-[228px] h-[228px] sm:w-[272px] sm:h-[272px] xl:w-[292px] xl:h-[292px] flex items-center justify-center transition-opacity duration-200 ${
                isPeriodLoading ? 'opacity-50' : 'opacity-100'
              }`}
            >
              <FullscreenDonutPieCanvas
                totalCount={totalCount}
                pieRenderData={pieRenderData}
                onSliceMouseEnter={handleFullscreenSliceEnter}
                onSliceMouseLeave={handleFullscreenSliceLeave}
                onSliceClick={handleFullscreenSliceClick}
              />

              {/* Enlarged Center HUD */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none px-4">
                {hudPreviewZone ? (
                  <>
                    <span className="text-[12px] sm:text-[13px] font-bold text-secondary truncate max-w-[170px]">
                      {hudPreviewZone.name}
                    </span>
                    <span className="text-[26px] sm:text-[32px] font-black text-primary leading-tight mt-0.5 tabular-nums">
                      {hudPreviewZone.count.toLocaleString()}건
                    </span>
                    <span
                      className="text-[11px] sm:text-[12px] font-extrabold px-2.5 py-0.5 rounded-full mt-1 tabular-nums whitespace-nowrap"
                      style={{
                        color: hudPreviewZone.color,
                        backgroundColor: `${hudPreviewZone.color}18`,
                      }}
                    >
                      {hudPreviewZone.value.toFixed(1)}%
                      {hudPreviewZone.avgPriceLabel
                        ? ` · ${hudPreviewZone.avgPriceLabel}`
                        : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[12px] sm:text-[13px] font-bold text-tertiary">
                      동탄 6대 권역 전체
                    </span>
                    <span className="text-[26px] sm:text-[32px] font-black text-primary leading-tight mt-0.5 tabular-nums">
                      {isPeriodLoading
                        ? '조회 중...'
                        : `${totalCount.toLocaleString()}건`}
                    </span>
                    {activeScopeStats.count > 0 && (
                      <span className="text-[11px] sm:text-[12px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full mt-1 tabular-nums">
                        전체 평균 {activeScopeStats.compactAvgLabel}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive 6-Zone Selector Matrix */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1 mb-0.5">
              <span className="text-[12px] font-extrabold text-secondary">
                권역별 거래 비중 · 평균가 비교
              </span>
              {selectedZoneKey !== 'all' && (
                <button
                  type="button"
                  data-testid="fullscreen-reset-zone-btn"
                  onClick={() => setSelectedZoneKey('all')}
                  className="text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>전체 권역 보기</span>
                </button>
              )}
            </div>

            {/* All Zones Summary Row */}
            <button
              type="button"
              data-testid="fullscreen-zone-matrix-all"
              onClick={() => setSelectedZoneKey('all')}
              aria-pressed={selectedZoneKey === 'all'}
              className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer text-left ${
                selectedZoneKey === 'all'
                  ? 'bg-elevated ring-1 ring-blue-600/30'
                  : 'hover:bg-elevated/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span className="text-[12.5px] sm:text-[13px] font-extrabold text-primary">
                  동탄 전체 권역 한눈에
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 tabular-nums shrink-0">
                <span className="text-[12.5px] sm:text-[13px] font-black text-primary">
                  {totalCount.toLocaleString()}건
                </span>
                <span className="text-[11px] font-medium text-tertiary">
                  (100%)
                </span>
              </div>
            </button>

            {processedZones.map(({ zone, stats }, idx) => {
              const isSelected = selectedZoneKey === zone.category;
              const isDimmed = selectedZoneKey !== 'all' && !isSelected;
              return (
                <button
                  key={zone.category}
                  type="button"
                  data-testid={`fullscreen-zone-matrix-${zone.category}`}
                  onClick={() => handleSelectZone(zone.category)}
                  onMouseEnter={() => {
                    if (selectedZoneKey === 'all') {
                      setHoveredZoneKey(zone.category);
                    }
                  }}
                  onMouseLeave={() => setHoveredZoneKey(null)}
                  aria-pressed={isSelected}
                  className={`w-full px-3 py-2.5 rounded-xl flex flex-col gap-1.5 transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-elevated ring-1 ring-blue-600/30'
                      : 'hover:bg-elevated/70'
                  } ${isDimmed ? 'opacity-50 hover:opacity-85' : 'opacity-100'}`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: zone.color }}
                      />
                      <span className="text-[12.5px] sm:text-[13px] font-extrabold text-primary truncate">
                        {zone.name}
                      </span>
                      {idx === 0 && zone.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[9.5px] font-extrabold shrink-0 leading-none">
                          1위
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5 tabular-nums shrink-0">
                      <span className="text-[12.5px] sm:text-[13px] font-black text-primary">
                        {zone.count.toLocaleString()}건
                      </span>
                      <span className="text-[11px] font-medium text-tertiary">
                        ({zone.value.toFixed(1)}%)
                      </span>
                      {zone.avgPriceLabel && (
                        <span className="text-[11.5px] sm:text-[12px] font-bold text-secondary">
                          · {zone.avgPriceLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] text-tertiary tabular-nums">
                    <span className="truncate">{zone.subName}</span>
                    {stats.avgPyeongPriceMan > 0 && (
                      <span className="shrink-0">
                        평당 {stats.avgPyeongPriceMan.toLocaleString()}만
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-[3px] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(zone.count > 0 ? 2 : 0, zone.value))}%`,
                        backgroundColor: zone.color,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ─── Right Column: Statistical Dashboard & Chronological Real-Transaction Lists ─── */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col min-w-0 lg:h-full lg:overflow-y-auto bg-surface">
          {/* Quick Sticky Zone Filter Bar + Controls */}
          <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-xs border-b border-border px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3">
            {/* Horizontal Zone Pill Selector */}
            <div
              data-testid="fullscreen-zone-tabs"
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
            >
              <button
                type="button"
                data-testid="fullscreen-zone-tab-all"
                onClick={() => setSelectedZoneKey('all')}
                className={`h-[32px] px-3 rounded-[9px] text-[12px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer tabular-nums ${
                  selectedZoneKey === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-elevated text-secondary hover:text-primary'
                }`}
              >
                전체 권역 ({filteredMarketTotalCount.toLocaleString()})
              </button>
              {processedZones.map(({ zone, chronoItems }) => {
                const isSelected = selectedZoneKey === zone.category;
                return (
                  <button
                    key={zone.category}
                    type="button"
                    data-testid={`fullscreen-zone-tab-${zone.category}`}
                    onClick={() => handleSelectZone(zone.category)}
                    className={`h-[32px] px-3 rounded-[9px] text-[12px] font-extrabold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors cursor-pointer tabular-nums ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-elevated text-secondary hover:text-primary'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span>{zone.name}</span>
                    <span className="opacity-75">
                      {chronoItems.length.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grouping Mode + Chronological Sort + Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedZoneKey === 'all' && (
                  <div className={getToggleTrackClass()}>
                    <button
                      type="button"
                      data-testid="fullscreen-group-by-zone"
                      onClick={() => setGroupingMode('by_zone')}
                      className={getToggleBtnClass({
                        active: groupingMode === 'by_zone',
                        size: 'sm',
                      })}
                    >
                      권역별 시간순
                    </button>
                    <button
                      type="button"
                      data-testid="fullscreen-group-unified"
                      onClick={() => setGroupingMode('unified_time')}
                      className={getToggleBtnClass({
                        active: groupingMode === 'unified_time',
                        size: 'sm',
                      })}
                    >
                      통합 시간순
                    </button>
                  </div>
                )}

                <div className={getToggleTrackClass()}>
                  <button
                    type="button"
                    data-testid="fullscreen-sort-latest"
                    onClick={() => setSortOrder('latest')}
                    className={getToggleBtnClass({
                      active: sortOrder === 'latest',
                      size: 'sm',
                    })}
                  >
                    최신순
                  </button>
                  <button
                    type="button"
                    data-testid="fullscreen-sort-oldest"
                    onClick={() => setSortOrder('oldest')}
                    className={getToggleBtnClass({
                      active: sortOrder === 'oldest',
                      size: 'sm',
                    })}
                  >
                    과거순
                  </button>
                  <button
                    type="button"
                    data-testid="fullscreen-sort-price"
                    onClick={() => setSortOrder('price_desc')}
                    className={getToggleBtnClass({
                      active: sortOrder === 'price_desc',
                      size: 'sm',
                    })}
                  >
                    높은가격순
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-[220px] xl:w-[250px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
                />
                <input
                  type="text"
                  data-testid="fullscreen-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="단지명 또는 법정동 검색"
                  aria-label="단지명 또는 법정동 검색"
                  className={getControlInputClass('w-full pl-8 pr-7')}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="검색어 지우기"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── 4-Card Soft-Surface Statistical Briefing (Ad Money v5.0 Isomorphic Surface) ─── */}
          <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-[13.5px] sm:text-[14.5px] font-black text-primary truncate">
                  {activeZoneMeta
                    ? `${activeZoneMeta.name} (${activeZoneMeta.subName}) 실거래 통계`
                    : '동탄 6대 권역 통합 실거래 통계'}
                </h3>
                {activeZoneMeta?.policyBadge && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-elevated text-[11px] font-bold text-secondary shrink-0">
                    {activeZoneMeta.policyBadge}
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-[11.5px] text-tertiary font-medium tabular-nums shrink-0">
                {PERIOD_LABELS[period]} 체결 기준
              </span>
            </div>

            <div
              data-testid="fullscreen-stats-grid"
              className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3"
            >
              {/* Stat Card 1: Volume & Share */}
              <div className="bg-elevated rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-1.5 tabular-nums">
                <span className="text-[11px] sm:text-[11.5px] font-bold text-tertiary">
                  실거래량 · 비중
                </span>
                <span className="text-[17px] sm:text-[19px] font-black text-primary leading-tight">
                  {activeScopeStats.count.toLocaleString()}건
                </span>
                <span className="text-[11px] font-medium text-secondary truncate">
                  {activeZoneMeta
                    ? `동탄 전체의 ${activeScopeStats.sharePct.toFixed(1)}% · ${activeScopeStats.distinctComplexCount}개 단지`
                    : `거래 발생 ${activeScopeStats.distinctComplexCount}개 단지`}
                </span>
              </div>

              {/* Stat Card 2: Mean & Median Price */}
              <div className="bg-elevated rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-1.5 tabular-nums">
                <span className="text-[11px] sm:text-[11.5px] font-bold text-tertiary">
                  평균 · 중위 실거래가
                </span>
                <span className="text-[17px] sm:text-[19px] font-black text-primary leading-tight">
                  {activeScopeStats.avgPriceLabel}
                </span>
                <span className="text-[11px] font-medium text-secondary truncate">
                  중위가 {activeScopeStats.medianPriceLabel}
                </span>
              </div>

              {/* Stat Card 3: Price per Pyeong & 84㎡ Equivalent */}
              <div className="bg-elevated rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-1.5 tabular-nums">
                <span className="text-[11px] sm:text-[11.5px] font-bold text-tertiary">
                  평당 평균가 (3.3㎡)
                </span>
                <span className="text-[17px] sm:text-[19px] font-black text-primary leading-tight">
                  {activeScopeStats.avgPyeongPriceMan > 0
                    ? `${activeScopeStats.avgPyeongPriceMan.toLocaleString()}만원`
                    : '-'}
                </span>
                <span className="text-[11px] font-medium text-secondary truncate">
                  {activeScopeStats.equiv84Label !== '-'
                    ? `전용 84㎡ 환산 약 ${activeScopeStats.equiv84Label}`
                    : '실거래 면적 기준'}
                </span>
              </div>

              {/* Stat Card 4: Highest Price & Momentum Energy */}
              <div className="bg-elevated rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-1.5 tabular-nums">
                <span className="text-[11px] sm:text-[11.5px] font-bold text-tertiary">
                  최고 실거래 · 상승 에너지
                </span>
                <span className="text-[17px] sm:text-[19px] font-black text-red-600 dark:text-red-400 leading-tight">
                  {activeScopeStats.maxItem
                    ? activeScopeStats.maxItem.priceEok ||
                      formatPriceEok(activeScopeStats.maxItem.priceVal)
                    : '-'}
                </span>
                <span
                  className="text-[11px] font-medium text-secondary truncate"
                  title={
                    activeScopeStats.maxItem
                      ? `${activeScopeStats.maxItem.displayAptName || activeScopeStats.maxItem.aptName}`
                      : undefined
                  }
                >
                  {activeScopeStats.count > 0
                    ? `신고가 ${activeScopeStats.newHighCount}건 · 상승 ${activeScopeStats.risingCount}건`
                    : '거래 내역 없음'}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Chronological Real-Transaction Feed ─── */}
          <div className="px-4 sm:px-6 lg:px-8 pb-10 pt-2 flex flex-col gap-6 flex-1">
            {selectedZoneKey === 'all' && groupingMode === 'by_zone' ? (
              /* Mode A: Zone-by-Zone Chronological Lists with Per-Zone Statistical Strip */
              processedZones.every((pz) => pz.chronoItems.length === 0) ? (
                <div
                  data-testid="fullscreen-empty-state"
                  className="w-full py-16 px-4 rounded-2xl bg-elevated flex flex-col items-center justify-center text-center gap-2"
                >
                  <p className="text-[14px] font-extrabold text-primary">
                    {trimmedQuery
                      ? `"${trimmedQuery}" 조건과 일치하는 실거래 내역이 없습니다.`
                      : '선택한 기간에 등록된 실거래 내역이 없습니다.'}
                  </p>
                  {trimmedQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-1 px-3.5 py-1.5 rounded-[10px] bg-surface text-[12px] font-extrabold text-blue-600 dark:text-blue-400 cursor-pointer"
                    >
                      검색어 초기화
                    </button>
                  )}
                </div>
              ) : (
                processedZones.map(({ zone, chronoItems, stats }) => {
                  if (trimmedQuery && chronoItems.length === 0) {
                    return null;
                  }
                  const limit =
                    zoneLimits[zone.category] ?? DEFAULT_ZONE_PREVIEW_LIMIT;
                  const visibleItems = chronoItems.slice(0, limit);
                  const remainingCount = chronoItems.length - visibleItems.length;

                  return (
                    <div
                      key={zone.category}
                      data-testid={`fullscreen-zone-section-${zone.category}`}
                      className="flex flex-col border-t border-border pt-4 first:border-t-0 first:pt-2"
                    >
                      {/* Per-Zone Header & Key Statistical Strip */}
                      <div className="flex flex-col gap-2 pb-3 border-b border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: zone.color }}
                            />
                            <h4 className="text-[15px] sm:text-[16px] font-black text-primary tracking-tight">
                              {zone.name}
                            </h4>
                            <span className="text-[12px] text-tertiary font-medium truncate">
                              {zone.subName}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectZone(zone.category)}
                            className="text-[11.5px] sm:text-[12px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                          >
                            <span>권역 집중 보기</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>

                        {/* Per-Zone Statistics Pills */}
                        {stats.count > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] tabular-nums">
                            <span className="px-2.5 py-1 rounded-lg bg-elevated font-extrabold text-primary">
                              거래 {stats.count.toLocaleString()}건 ({stats.sharePct.toFixed(1)}%)
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-elevated font-bold text-secondary">
                              평균 {stats.avgPriceLabel}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-elevated font-bold text-secondary">
                              중위 {stats.medianPriceLabel}
                            </span>
                            {stats.avgPyeongPriceMan > 0 && (
                              <span className="px-2.5 py-1 rounded-lg bg-elevated font-bold text-secondary">
                                평당 {stats.avgPyeongPriceMan.toLocaleString()}만
                              </span>
                            )}
                            {stats.maxItem && (
                              <span className="px-2.5 py-1 rounded-lg bg-elevated font-bold text-secondary">
                                최고 {stats.maxItem.priceEok || formatPriceEok(stats.maxItem.priceVal)}
                              </span>
                            )}
                            {stats.newHighCount > 0 && (
                              <span className="px-2.5 py-1 rounded-lg bg-red-500/10 font-extrabold text-red-600 dark:text-red-400">
                                신고가 {stats.newHighCount}건
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* Chronological Transaction Rows for This Zone */}
                      {chronoItems.length === 0 ? (
                        <div className="py-6 text-center text-[12.5px] text-tertiary font-medium">
                          선택한 기간에 등록된 실거래 내역이 없습니다.
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            {visibleItems.map((it, itemIdx) => (
                              <ChronologicalTransactionRow
                                key={`${zone.category}-${it.aptName}-${it.contractDate || ''}-${it.floor || ''}-${it.priceVal}-${itemIdx}`}
                                item={it}
                                zoneKey={zone.category}
                                zoneName={zone.name}
                                zoneColor={zone.color}
                                showZoneBadge={false}
                                onSelectApt={onSelectApt}
                                preloadApartmentTx={preloadApartmentTx}
                              />
                            ))}
                          </div>

                          {remainingCount > 0 && (
                            <div className="pt-2.5 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                data-testid={`fullscreen-zone-more-${zone.category}`}
                                onClick={() =>
                                  setZoneLimits((prev) => ({
                                    ...prev,
                                    [zone.category]:
                                      (prev[zone.category] ??
                                        DEFAULT_ZONE_PREVIEW_LIMIT) + 24,
                                  }))
                                }
                                className="h-[36px] px-4 rounded-xl bg-elevated hover:bg-slate-200/70 dark:hover:bg-slate-800 text-[12px] font-extrabold text-secondary hover:text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer tabular-nums"
                              >
                                <span>
                                  {zone.name} 실거래 더보기 ({remainingCount.toLocaleString()}건 남음)
                                </span>
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              /* Mode B: Single Selected Zone OR Unified All-Zone Chronological Stream */
              <div
                data-testid="fullscreen-unified-stream"
                className="flex flex-col"
              >
                {unifiedChronoStream.length === 0 ? (
                  <div
                    data-testid="fullscreen-empty-state"
                    className="w-full py-16 px-4 rounded-2xl bg-elevated flex flex-col items-center justify-center text-center gap-2"
                  >
                    <p className="text-[14px] font-extrabold text-primary">
                      {trimmedQuery
                        ? `"${trimmedQuery}" 조건과 일치하는 실거래 내역이 없습니다.`
                        : '선택한 기간에 등록된 실거래 내역이 없습니다.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-2.5 border-b border-border text-[11.5px] text-tertiary font-bold">
                      <span>
                        {activeZoneMeta
                          ? `${activeZoneMeta.name} 시간순 실거래 내역 (${unifiedChronoStream.length.toLocaleString()}건)`
                          : `동탄 전체 권역 통합 시간순 내역 (${unifiedChronoStream.length.toLocaleString()}건)`}
                      </span>
                      <span>
                        {sortOrder === 'latest'
                          ? '계약일 최신순'
                          : sortOrder === 'oldest'
                            ? '계약일 과거순'
                            : '실거래가 높은순'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      {unifiedChronoStream
                        .slice(0, streamLimit)
                        .map((it, idx) => (
                          <ChronologicalTransactionRow
                            key={`${it.zoneKey}-${it.aptName}-${it.contractDate || ''}-${it.floor || ''}-${it.priceVal}-${idx}`}
                            item={it}
                            zoneKey={it.zoneKey}
                            zoneName={it.zoneName}
                            zoneColor={it.zoneColor}
                            showZoneBadge={selectedZoneKey === 'all'}
                            onSelectApt={onSelectApt}
                            preloadApartmentTx={preloadApartmentTx}
                          />
                        ))}
                    </div>

                    {unifiedChronoStream.length > streamLimit && (
                      <div className="pt-4 flex justify-center">
                        <button
                          type="button"
                          data-testid="fullscreen-stream-more-btn"
                          onClick={() => setStreamLimit((prev) => prev + 40)}
                          className="h-[38px] px-5 rounded-xl bg-elevated hover:bg-slate-200/70 dark:hover:bg-slate-800 text-[12.5px] font-extrabold text-secondary hover:text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer tabular-nums"
                        >
                          <span>
                            이전 실거래 더보기 (
                            {(unifiedChronoStream.length - streamLimit).toLocaleString()}
                            건 남음)
                          </span>
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>,
    portalTarget
  );
});

export default ZoneDonutFullscreenModal;

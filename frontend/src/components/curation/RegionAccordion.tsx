'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { haversineDistance } from "@/lib/utils/haversine";
import { normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import { formatEokWithUnit, formatGapPrice } from '../MacroDashboardClient';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/DashboardFacade';

interface RegionAccordionProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string> | undefined;
  publicRentalSet: Set<string>;
  fieldReportsMap: Map<string, FieldReportData>;
  favoriteCounts: Record<string, number>;
  onSelectApt: (name: string) => void;
  onOpenAdModal?: () => void;
}

const sibumPolygon = [
  { lat: 37.204400, lng: 127.099303 },
  { lat: 37.194603, lng: 127.099151 },
  { lat: 37.199094, lng: 127.115916 },
  { lat: 37.203404, lng: 127.112905 }
];

const culturePolygon = [
  { lat: 37.194037, lng: 127.082630 },
  { lat: 37.193915, lng: 127.099012 },
  { lat: 37.178302, lng: 127.103808 },
  { lat: 37.188171, lng: 127.083393 }
];

const waterfrontPolygon = [
  { lat: 37.172228, lng: 127.094673 },
  { lat: 37.171307, lng: 127.118744 },
  { lat: 37.165758, lng: 127.114791 },
  { lat: 37.165082, lng: 127.091299 }
];

const gwangBizPolygon = [
  { lat: 37.204512, lng: 127.085889 },
  { lat: 37.194624, lng: 127.083147 },
  { lat: 37.194700, lng: 127.098262 },
  { lat: 37.204544, lng: 127.098434 }
];

const isPointInPolygon = (point: { lat: number; lng: number }, vs: { lat: number; lng: number }[]) => {
  const x = point.lng, y = point.lat;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].lng, yi = vs[i].lat;
    const xj = vs[j].lng, yj = vs[j].lat;
    const intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

interface GroupedApartment {
  name: string;
  latestPrice: number;
  latestPriceEok: string;
  pyeongPrice: number;
  mdd: number;
  gap: number;
  liquid: number;
  householdCount: number;
  yearBuilt: string;
  distToDongtan: number | null;
  dong?: string;
  txKey?: string;
  views: number;
  likes: number;
  latestRentDeposit: number;
}

interface GroupedCategory {
  title: string;
  dong: string;
  totalValue: number;
  totalPyeongValue: number;
  count: number;
  apartments: GroupedApartment[];
  avgPrice?: number;
  avgPyeongPrice?: number;
}

export const RegionAccordion = React.memo(function RegionAccordion({
  sheetApartments,
  txSummaryData,
  nameMapping,
  publicRentalSet,
  fieldReportsMap,
  favoriteCounts,
  onSelectApt,
  onOpenAdModal
}: RegionAccordionProps) {
  const [accordionMode, setAccordionMode] = useState<"price" | "pyeong">("price");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const accordionData = useMemo(() => {
    if (!sheetApartments || !txSummaryData) return [];

    const grouped: Record<string, GroupedCategory> = {};

    Object.values(sheetApartments)
      .flat()
      .forEach((apt) => {
        const lat = apt.lat || 0;
        const lng = apt.lng || 0;

        const dongtanCoord = { lat: 37.2005, lng: 127.0985 };
        const distToDongtan =
          lat && lng
            ? haversineDistance(
              { lat: Number(lat), lng: Number(lng) },
              dongtanCoord
            )
            : null;

        const themeTitles: string[] = [];

        const isSibumArea = lat !== 0 && lng !== 0 && isPointInPolygon({ lat: Number(lat), lng: Number(lng) }, sibumPolygon);
        const isCultureArea = lat !== 0 && lng !== 0 && isPointInPolygon({ lat: Number(lat), lng: Number(lng) }, culturePolygon);
        const isLakeArea = lat !== 0 && lng !== 0 && isPointInPolygon({ lat: Number(lat), lng: Number(lng) }, waterfrontPolygon);
        const isGwangBizArea = lat !== 0 && lng !== 0 && isPointInPolygon({ lat: Number(lat), lng: Number(lng) }, gwangBizPolygon);
        const isDongtanName = apt.name.includes("동탄역");

        let isDongtanArea = false;
        if (distToDongtan !== null) {
          isDongtanArea = distToDongtan <= 1500;
        } else {
          isDongtanArea = isDongtanName || apt.dong === "오산동" || apt.dong === "여울동";
        }

        const is1Dongtan = apt.dong === "반송동" || apt.dong === "능동" || apt.dong === "석우동";

        if (isDongtanArea) {
          themeTitles.push("동탄역세권");
        }

        if (isGwangBizArea) {
          themeTitles.push("광역비지니스컴플렉스");
        } else if (isSibumArea) {
          themeTitles.push("커뮤니티시범단지");
        } else if (isCultureArea) {
          themeTitles.push("문화디자인밸리");
        } else if (isLakeArea) {
          themeTitles.push("워터프론트컴플렉스");
        } else if (is1Dongtan) {
          themeTitles.push("1동탄");
        }

        if (themeTitles.length === 0) {
          themeTitles.push("기타 권역");
        }

        if (publicRentalSet && publicRentalSet.has && publicRentalSet.has(apt.name)) return;
        const rawTxKey =
          apt.txKey || findTxKey(apt.name, txSummaryData, nameMapping);
        const txKey = rawTxKey ? normalizeAptName(rawTxKey) : null;
        const tx = txKey ? txSummaryData[txKey] : undefined;

        if (tx) {
          const sales = tx.avg1MPrice || tx.avg3MPrice || tx.latestPrice || 0;
          if (sales > 0) {
            const maxPrice = tx.maxPrice || sales;
            const mdd =
              maxPrice > 0 ? ((sales - maxPrice) / maxPrice) * 100 : 0;
            const gap =
              sales > 0 && tx.latestRentDeposit
                ? (tx.latestRentDeposit / sales) * 100
                : 0;
            const liquid = tx.avg3MTxCount || 0;

            let formattedYear = apt.yearBuilt || "";
            if (formattedYear.length === 6 && !isNaN(Number(formattedYear))) {
              formattedYear = `${formattedYear.substring(0, 4)}년 ${formattedYear.substring(4, 6)}월`;
            } else if (
              formattedYear.length === 4 &&
              !isNaN(Number(formattedYear))
            ) {
              formattedYear = `${formattedYear}년`;
            }

            const pyeongPrice =
              tx.avg1MPerPyeong ||
              tx.avg3MPerPyeong ||
              (tx.latestArea ? tx.latestPrice / (tx.latestArea / 3.3058) : 0);

            themeTitles.forEach(themeTitle => {
              if (!grouped[themeTitle]) {
                grouped[themeTitle] = {
                  title: themeTitle,
                  dong: themeTitle,
                  totalValue: 0,
                  totalPyeongValue: 0,
                  count: 0,
                  apartments: [],
                };
              }

              grouped[themeTitle].apartments.push({
                name: apt.name,
                latestPrice: sales,
                latestPriceEok: formatEokWithUnit(sales).value + (formatEokWithUnit(sales).unit === '만원' ? '만' : ''),
                pyeongPrice: pyeongPrice,
                mdd: mdd,
                gap: gap,
                liquid: liquid,
                householdCount: apt.householdCount || 0,
                yearBuilt: formattedYear,
                distToDongtan: distToDongtan,
                dong: apt.dong,
                txKey: apt.txKey,
                views: fieldReportsMap.get(apt.name)?.viewCount || 0,
                likes: favoriteCounts[apt.name] || 0,
                latestRentDeposit: tx.latestRentDeposit || 0,
              });

              grouped[themeTitle].totalValue += sales;
              grouped[themeTitle].totalPyeongValue += pyeongPrice;
              grouped[themeTitle].count += 1;
            });
          }
        }
      });

    const themeOrder = [
      "동탄역세권",
      "광역비지니스컴플렉스",
      "커뮤니티시범단지",
      "워터프론트컴플렉스",
      "문화디자인밸리",
      "1동탄",
      "기타 권역",
    ];

    const result = Object.values(grouped)
      .filter((g) => g.count > 0)
      .map((g) => {
        g.avgPrice = g.totalValue / g.count;
        g.avgPyeongPrice = g.totalPyeongValue / g.count;
        g.apartments.sort((a, b) => b.latestPrice - a.latestPrice);
        (g as any).recentTxCount = g.apartments.reduce((sum, apt) => sum + (apt.liquid || 0), 0);
        return g;
      })
      .sort((a, b) => {
        const indexA = themeOrder.indexOf(a.title);
        const indexB = themeOrder.indexOf(b.title);
        return indexA - indexB;
      });

    return result;
  }, [sheetApartments, txSummaryData, nameMapping, publicRentalSet, fieldReportsMap, favoriteCounts]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Detailed Real Estate Portfolio Section */}
      <div className="flex items-center justify-between px-0">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-[16px] bg-[#ea6100] rounded-full" />
          <h2 className="text-[22px] font-bold text-primary">
            권역별 단지 분류
          </h2>
        </div>

        {/* Toss Style Segmented Control for Accordion */}
        <div className="flex bg-body p-1 rounded-lg">
          <button
            onClick={() => setAccordionMode("price")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all border-none cursor-pointer ${accordionMode === "price"
              ? "bg-surface text-primary shadow-sm"
              : "text-tertiary hover:text-secondary bg-transparent"
              }`}
          >
            매매가
          </button>
          <button
            onClick={() => setAccordionMode("pyeong")}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all border-none cursor-pointer ${accordionMode === "pyeong"
              ? "bg-surface text-primary shadow-sm"
              : "text-tertiary hover:text-secondary bg-transparent"
              }`}
          >
            평단가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-0 px-0 items-start">
        {accordionData.map((group) => {
          const isExpanded = expandedGroups[group.title];

          const themeColors: Record<string, string> = {
            "동탄역세권": "#c44d00",
            "광역비지니스컴플렉스": "#ff9f0a",
            "커뮤니티시범단지": "#af52de",
            "워터프론트컴플렉스": "#ea6100",
            "문화디자인밸리": "#f04452",
            "1동탄": "#4e5968",
          };
          const themeColor = themeColors[group.title] || "#ea6100";

          return (
            <div
              key={group.title}
              className="bg-surface rounded-[20px] shadow-sm border border-border transition-all duration-300 relative"
            >
              {/* Group Header */}
              <button
                type="button"
                aria-expanded={isExpanded ? "true" : "false"}
                aria-controls={`accordion-panel-${group.title.replace(/\s+/g, '-')}`}
                id={`accordion-header-${group.title.replace(/\s+/g, '-')}`}
                className={`px-5 flex items-center justify-between cursor-pointer hover:bg-body/50 rounded-t-[20px] h-[78px] md:h-[86px] ${!isExpanded ? 'rounded-b-[20px]' : ''} w-full text-left bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#ea6100]/50`}
                onClick={() => toggleGroup(group.title)}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: themeColor }}
                  />
                  <span className="text-[15.5px] md:text-[17px] font-extrabold text-primary truncate leading-tight">
                    {group.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* volume info */}
                  <span className="hidden sm:inline-flex text-[11px] font-bold text-[#ff8f00] bg-[#fff3e0] px-2 py-[3.5px] rounded-[6px]">
                    90일 거래 {(group as any).recentTxCount || 0}건
                  </span>

                  <div className="flex flex-col items-end gap-0.5 text-right">
                    <span className="text-[15px] md:text-[16.5px] font-black text-primary leading-tight">
                      {accordionMode === "price" ? (
                        (() => {
                          const { value, unit } = formatEokWithUnit(group.avgPrice || 0);
                          return `${value} ${unit}`;
                        })()
                      ) : (
                        `${Math.round(group.avgPyeongPrice || 0).toLocaleString()} 만원`
                      )}
                    </span>
                    <span className="text-[10px] md:text-[10.5px] font-bold text-tertiary leading-none">
                      평균 실거래가
                    </span>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-tertiary transition-transform" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-tertiary transition-transform" />
                  )}
                </div>
              </button>

              {/* Group Panel (Apartments List) */}
              <div
                id={`accordion-panel-${group.title.replace(/\s+/g, '-')}`}
                role="region"
                aria-labelledby={`accordion-header-${group.title.replace(/\s+/g, '-')}`}
                className={`${isExpanded ? "block border-t border-border p-4 flex flex-col gap-3 max-h-[380px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full" : "hidden"}`}
              >
                {(() => {
                  const activeTier = { apts: group.apartments };
                  return (
                    <div className="flex flex-col gap-2 mt-1 animate-in fade-in duration-300">
                      {activeTier.apts.map((apt) => (
                        <button
                          key={apt.name}
                          type="button"
                          aria-label={`${apt.name} 아파트 리포트 보기`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectApt) {
                              onSelectApt(apt.name);
                            }
                          }}
                          className="flex flex-col p-3.5 sm:p-4 rounded-[14px] border border-border bg-surface hover:border-[#ea6100]/30 hover:bg-body cursor-pointer transition-all shadow-sm group/apt gap-2 sm:gap-2.5 w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[#ea6100]/50"
                        >
                          {/* Top Row: Name and Chevron */}
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                              <div className="w-1.5 h-1.5 bg-[#d1d6db] rounded-full shrink-0 group-hover/apt:bg-[#ea6100] transition-colors" />
                              <span className="text-[14.5px] sm:text-[15.5px] font-extrabold text-primary truncate">
                                {apt.name}
                              </span>
                              {!!((apt.likes && apt.likes >= 3) || (apt.views && apt.views >= 100)) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[5px] text-[10px] font-black bg-rose-50 dark:bg-rose-950/20 text-rose-500 border border-rose-500/10 leading-none shrink-0 gap-0.5 animate-pulse">
                                  🔥 HOT
                                </span>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-tertiary shrink-0" />
                          </div>

                          {/* Bottom Row: Distance, High-value indicators and Price */}
                          <div className="flex items-center justify-between pl-4 mt-0.5">
                            <div className="flex flex-wrap gap-1.5 items-center min-w-0 pr-2">
                              {apt.distToDongtan !== null && (
                                <span className="text-[10px] sm:text-[11px] font-bold text-[#c44d00] bg-[#e6f7f3] px-2 py-[3px] rounded-[6px] group-hover/apt:bg-[#ccf0e6] transition-colors border border-[#c44d00]/10 inline-flex whitespace-nowrap">
                                  동탄역 {(apt.distToDongtan / 1000).toFixed(2)}km
                                </span>
                              )}
                              {apt.latestRentDeposit !== undefined && apt.latestPrice > apt.latestRentDeposit && apt.gap > 0 && (
                                <span className="text-[10px] sm:text-[11px] font-bold text-[#ff8f00] bg-[#fff3e0] dark:bg-[#ea6100]/10 px-2 py-[3px] rounded-[6px] border border-[#ff8f00]/10 inline-flex whitespace-nowrap">
                                  갭 {formatGapPrice(apt.latestPrice - apt.latestRentDeposit)} ({Math.round(apt.gap)}%)
                                </span>
                              )}
                              {apt.mdd !== undefined && apt.mdd <= -5 && (
                                <span className="text-[10px] sm:text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-[3px] rounded-[6px] border border-rose-500/10 inline-flex whitespace-nowrap">
                                  낙폭 {apt.mdd.toFixed(1)}%
                                </span>
                              )}
                            </div>

                            <div className="flex flex-row items-baseline gap-1 text-right shrink-0">
                              {accordionMode === "price" ? (
                                (() => {
                                  const { value, unit } = formatEokWithUnit(apt.latestPrice);
                                  return (
                                    <>
                                      <span className="text-[13.5px] sm:text-[15px] font-extrabold text-primary whitespace-nowrap">
                                        {value}
                                      </span>
                                      <span className="text-[10px] sm:text-[11px] font-bold text-tertiary whitespace-nowrap">
                                        {unit}
                                      </span>
                                    </>
                                  );
                                })()
                              ) : (
                                <>
                                  <span className="text-[13.5px] sm:text-[15px] font-extrabold text-primary whitespace-nowrap">
                                    {Math.round(apt.pyeongPrice).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] sm:text-[11px] font-bold text-tertiary whitespace-nowrap">
                                    만원/평
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}

                      {/* 커뮤니티 라운지 연결 브릿지 */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/lounge`;
                        }}
                        className="mt-2.5 flex items-center justify-between p-3.5 rounded-[12px] bg-body hover:bg-[#e6f7f3] hover:text-[#c44d00] border border-dashed border-border text-secondary text-[12px] font-extrabold cursor-pointer transition-colors group/bridge gap-2 w-full text-left bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#c44d00]/50"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MessageSquare className="w-3.5 h-3.5 text-[#c44d00] shrink-0" />
                          <span className="truncate">"{group.title}" 권역 입주민 라운지 수다방 입장</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-[#c44d00] inline-flex items-center shrink-0">
                          대화 참여
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5 transform group-hover/bridge:translate-x-0.5 transition-transform" />
                        </span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

RegionAccordion.displayName = 'RegionAccordion';
export default RegionAccordion;

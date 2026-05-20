import React from 'react';
import { MapPin } from 'lucide-react';

/**
 * AnchorTenantCard — 앵커 테넌트 근접도 시각화 카드
 * 스타벅스, 올리브영, 다이소, 대형마트, 맥도날드까지의 거리를
 * 깔끔하고 모던한 UI로 표시합니다.
 */

interface AnchorTenantCardProps {
  distanceToStarbucks?: number;
  starbucksName?: string;
  starbucksAddress?: string;
  starbucksCoordinates?: string;
  distanceToOliveYoung?: number;
  oliveYoungName?: string;
  oliveYoungAddress?: string;
  oliveYoungCoordinates?: string;
  distanceToDaiso?: number;
  daisoName?: string;
  daisoAddress?: string;
  daisoCoordinates?: string;
  distanceToSupermarket?: number;
  supermarketName?: string;
  supermarketAddress?: string;
  supermarketCoordinates?: string;
  distanceToMcDonalds?: number;
  mcdonaldsName?: string;
  mcdonaldsAddress?: string;
  mcdonaldsCoordinates?: string;
}

interface AnchorItem {
  id: string;
  name: string;
  distance: number | undefined;
  color: string;
  metaName?: string;
  metaAddress?: string;
  metaCoordinates?: string;
}

export default function AnchorTenantCard(props: AnchorTenantCardProps) {
  const anchors: AnchorItem[] = [
    { 
      id: 'starbucks',
      name: '스타벅스', 
      distance: props.distanceToStarbucks, 
      color: '#00704A', 
      metaName: props.starbucksName,
      metaAddress: props.starbucksAddress,
      metaCoordinates: props.starbucksCoordinates
    },
    { 
      id: 'oliveyoung', 
      name: '올리브영', 
      distance: props.distanceToOliveYoung, 
      color: '#9db44f', 
      metaName: props.oliveYoungName,
      metaAddress: props.oliveYoungAddress,
      metaCoordinates: props.oliveYoungCoordinates
    },
    { 
      id: 'daiso', 
      name: '다이소', 
      distance: props.distanceToDaiso, 
      color: '#E02020', 
      metaName: props.daisoName,
      metaAddress: props.daisoAddress,
      metaCoordinates: props.daisoCoordinates
    },
    { 
      id: 'supermarket', 
      name: '대형마트', 
      distance: props.distanceToSupermarket, 
      color: '#f59e0b', 
      metaName: props.supermarketName,
      metaAddress: props.supermarketAddress,
      metaCoordinates: props.supermarketCoordinates
    },
    { 
      id: 'mcdonalds', 
      name: '맥도날드', 
      distance: props.distanceToMcDonalds, 
      color: '#DA291C', 
      metaName: props.mcdonaldsName,
      metaAddress: props.mcdonaldsAddress,
      metaCoordinates: props.mcdonaldsCoordinates
    },
  ];

  const available = anchors.filter(a => a.distance != null);
  if (available.length === 0) return null;

  const TRACK_MAX_DISTANCE = 2000;

  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-3 border-b border-border">
        <h2 className="text-[17px] md:text-[19px] font-extrabold text-primary flex items-center gap-2 tracking-wide">
          주요 편의시설 접근성
        </h2>
      </div>

      {/* Anchor List */}
      <div className="flex flex-col">
        {anchors.map((anchor) => {
          if (anchor.distance == null) return null;
          const walkingTime = Math.ceil(anchor.distance / 80);
          
          return (
            <div key={anchor.id} className="group flex items-center justify-between gap-3 md:gap-4 py-4 md:py-5 border-b border-border last:border-0 hover:bg-body transition-all duration-200 -mx-6 px-6 md:-mx-8 md:px-8 rounded-none first:mt-3 last:mb-0">
              
              {/* Left: Category & Name */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Category */}
                <div className="flex items-center gap-2 shrink-0 w-[65px] md:w-[75px]">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0" style={{ backgroundColor: anchor.color }}></div>
                  <span className="text-[13px] md:text-[14px] font-bold text-secondary">{anchor.name}</span>
                </div>
                
                {/* Store Name & Address */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-primary font-extrabold text-[14px] md:text-[16px] truncate tracking-tight">
                    {anchor.metaName || "-"}
                  </span>
                  {anchor.metaAddress && (
                    <span className="text-secondary font-medium text-[12px] md:text-[13px] truncate mt-0.5 hidden md:block">
                      {anchor.metaAddress}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Right: Distance & Map */}
              <div className="flex items-center gap-3 md:gap-5 shrink-0">
                <div className="flex flex-col items-end justify-center">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[18px] md:text-[22px] font-extrabold text-primary tabular-nums tracking-tight leading-none">
                      {(anchor.distance / 1000).toFixed(2)}
                    </span>
                    <span className="text-[12px] md:text-[13px] font-bold text-secondary ml-1 mt-auto pb-[2px]">km</span>
                  </div>
                  <span className="text-[11px] md:text-[12px] font-bold text-secondary bg-[#f0f2f5] px-2 py-1 rounded-md mt-1">
                    도보 {walkingTime}분
                  </span>
                </div>
                
                {anchor.metaCoordinates && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${anchor.metaCoordinates}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="shrink-0 text-secondary bg-surface border border-border shadow-sm hover:bg-body hover:border-gray-300 hover:text-primary p-2 md:px-3 md:py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
                    title={`${anchor.metaName} 지도에서 보기`}
                  >
                    <MapPin size={14} strokeWidth={2.5} className="md:w-4 md:h-4" />
                    <span className="text-[12px] md:text-[13px] font-bold hidden md:inline-block">지도</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


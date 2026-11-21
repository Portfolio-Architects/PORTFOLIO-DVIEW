import React, { memo } from 'react';
import { MapPin } from 'lucide-react';

/**
 * AnchorTenantCard — 앵커 테넌트 근접도 시각화 카드
 * 스타벅스, 올리브영, 다이소, 배스킨라빈스까지의 거리를
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

const AnchorTenantCard = memo(function AnchorTenantCard(props: AnchorTenantCardProps) {
  const anchors: AnchorItem[] = [
    { 
      id: 'starbucks',
      name: '스타벅스', 
      distance: props.distanceToStarbucks, 
      color: '', 
      metaName: props.starbucksName,
      metaAddress: props.starbucksAddress,
      metaCoordinates: props.starbucksCoordinates
    },
    { 
      id: 'oliveyoung', 
      name: '올리브영', 
      distance: props.distanceToOliveYoung, 
      color: '', 
      metaName: props.oliveYoungName,
      metaAddress: props.oliveYoungAddress,
      metaCoordinates: props.oliveYoungCoordinates
    },
    { 
      id: 'daiso', 
      name: '다이소', 
      distance: props.distanceToDaiso, 
      color: '', 
      metaName: props.daisoName,
      metaAddress: props.daisoAddress,
      metaCoordinates: props.daisoCoordinates
    },
    { 
      id: 'mcdonalds', 
      name: '배스킨라빈스', 
      distance: props.distanceToMcDonalds, 
      color: '', 
      metaName: props.mcdonaldsName,
      metaAddress: props.mcdonaldsAddress,
      metaCoordinates: props.mcdonaldsCoordinates
    },
  ];

  const available = anchors.filter(a => a.distance != null);
  if (available.length === 0) return null;

  const TRACK_MAX_DISTANCE = 2000;

  return (
    <div className="pt-6 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] md:text-[20px] font-extrabold text-primary tracking-tight">
          주요 편의시설 접근성
        </h2>
      </div>

      {/* Anchor List - Ad Money v6.0 Live Spark Soft Surface Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {anchors.map((anchor) => {
          if (anchor.distance == null) return null;
          const walkingTime = Math.ceil(anchor.distance / 80);
          const percent = Math.min((anchor.distance / 1000) * 100, 100);
          
          return (
            <div key={anchor.id} className="bg-elevated rounded-2xl p-4 flex flex-col justify-between transition-colors min-h-[168px] relative overflow-hidden">
              
              {/* Top Info: Category & Distance */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary"></div>
                  <span className="text-[12.5px] font-bold text-secondary">{anchor.name}</span>
                </div>
                <div className="flex items-baseline gap-0.5 text-right tabular-nums">
                  <span className="text-[16px] font-extrabold text-primary tracking-tight leading-none">
                    {Math.round(anchor.distance).toLocaleString()}
                  </span>
                  <span className="text-[11px] font-semibold text-tertiary ml-0.5">
                    m
                  </span>
                </div>
              </div>
              
              {/* Store Details: Name & Address */}
              <div className="flex flex-col min-w-0 my-1.5 flex-1 justify-center">
                <span className="text-primary font-bold text-[14.5px] leading-tight truncate tracking-tight" title={anchor.metaName}>
                  {anchor.metaName || "-"}
                </span>
                {anchor.metaAddress && (
                  <span className="text-tertiary font-medium text-[11.5px] truncate mt-1 leading-normal" title={anchor.metaAddress}>
                    {anchor.metaAddress}
                  </span>
                )}
              </div>

              {/* Distance Gauge Bar */}
              <div className="mt-1 w-full bg-[#eff1f5] dark:bg-[#1e2532] h-1.5 rounded-full overflow-hidden relative mb-3">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out bg-slate-900 dark:bg-slate-100"
                  style={{ 
                    width: `${percent}%`
                  }}
                />
              </div>
              
              {/* Bottom Actions: Walking Time & Map link */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border">
                <span className="text-[12px] font-bold text-primary shrink-0 whitespace-nowrap tabular-nums">
                  도보 {walkingTime}분
                </span>
                
                {anchor.metaCoordinates && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${anchor.metaCoordinates}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-secondary hover:text-primary bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] px-2 py-1 rounded-[10px] transition-colors flex items-center justify-center gap-1 shrink-0"
                    title={`${anchor.metaName} 지도에서 보기`}
                  >
                    <MapPin size={12} strokeWidth={2.2} className="shrink-0" />
                    <span className="text-[11.5px] font-semibold">지도</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

AnchorTenantCard.displayName = 'AnchorTenantCard';
export default AnchorTenantCard;


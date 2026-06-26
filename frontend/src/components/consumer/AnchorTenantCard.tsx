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
      id: 'mcdonalds', 
      name: '배스킨라빈스', 
      distance: props.distanceToMcDonalds, 
      color: '#FF6699', 
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

      {/* Anchor List - 카드 그리드 레이아웃 적용 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {anchors.map((anchor) => {
          if (anchor.distance == null) return null;
          const walkingTime = Math.ceil(anchor.distance / 80);
          const percent = Math.min((anchor.distance / 1000) * 100, 100);
          
          return (
            <div key={anchor.id} className="bg-body rounded-2xl p-4 flex flex-col justify-between hover:bg-surface hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-black/5 dark:ring-white/10 min-h-[190px] relative overflow-hidden will-change-transform">
              
              {/* Top Info: Category Badge & Distance */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: anchor.color }}></div>
                  <span className="text-[13px] md:text-[14px] font-bold text-secondary">{anchor.name}</span>
                </div>
                <div className="flex items-baseline gap-0.5 text-right">
                  <span className="text-[16px] md:text-[18px] font-extrabold text-primary tabular-nums tracking-tight leading-none">
                    {Math.round(anchor.distance).toLocaleString()}
                  </span>
                  <span className="text-[11px] md:text-[12px] font-bold text-secondary ml-0.5">
                    m
                  </span>
                </div>
              </div>
              
              {/* Store Details: Name & Address */}
              <div className="flex flex-col min-w-0 my-2 flex-1 justify-center">
                <span className="text-primary font-black text-[15.5px] md:text-[17px] leading-tight truncate tracking-tight" title={anchor.metaName}>
                  {anchor.metaName || "-"}
                </span>
                {anchor.metaAddress && (
                  <span className="text-tertiary font-semibold text-[12px] md:text-[13px] truncate mt-1.5 leading-normal" title={anchor.metaAddress}>
                    {anchor.metaAddress}
                  </span>
                )}
              </div>

              {/* Toss-style Distance Gauge Bar */}
              <div className="mt-1 w-full bg-slate-100 dark:bg-slate-800/60 h-2 rounded-full overflow-hidden relative shadow-inner mb-3">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${percent}%`,
                    backgroundColor: anchor.color
                  }}
                />
              </div>
              
              {/* Bottom Actions: Walking Time & Map button */}
              <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/40">
                <span className="text-[12px] font-extrabold text-[#c44d00] dark:text-[#ea6100] bg-[#c44d00]/10 dark:bg-[#ea6100]/10 px-2.5 py-1.5 rounded-md shrink-0 whitespace-nowrap">
                  도보 {walkingTime}분
                </span>
                
                {anchor.metaCoordinates && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${anchor.metaCoordinates}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-secondary bg-surface border border-border shadow-sm hover:bg-body hover:border-gray-300 hover:text-primary p-1.5 rounded-lg transition-all flex items-center justify-center gap-1 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
                    title={`${anchor.metaName} 지도에서 보기`}
                  >
                    <MapPin size={12} strokeWidth={2.5} className="shrink-0" />
                    <span className="text-[12px] font-bold">지도</span>
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


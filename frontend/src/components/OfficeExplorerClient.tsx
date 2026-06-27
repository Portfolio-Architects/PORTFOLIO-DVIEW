'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  X, 
  Filter, 
  MapPin, 
  Building
} from 'lucide-react';
import PageHeroHeader from '@/components/PageHeroHeader';

interface OfficeTransaction {
  readonly date: string;
  readonly type: '매매' | '임대';
  readonly sizeSqM: number;
  readonly floor: number;
  readonly price: string;
}

interface OfficeBuilding {
  name: string;
  type: string;
  rentPerPy: string;
  features: string[];
  driveIn: boolean;
  stationDistance: 'very-close' | 'close' | 'moderate';
  desc: string;
  imgPlaceholder: string;
  score: number;
  recentTransactions: OfficeTransaction[];
}

const BUILDINGS_DB: OfficeBuilding[] = [
  {
    name: '금강펜테리움 IX타워',
    type: '초대형 지식산업센터',
    rentPerPy: '3.5만 ~ 4.2만원',
    features: ['드라이브인 (지하 2층 ~ 지상 7층)', '동탄역 셔틀버스 상시 운행', '최대 층고 5.8m 제조 특화', '피트니스 & 옥상정원 인프라'],
    driveIn: true,
    stationDistance: 'close',
    desc: '대규모 입주 기업 네트워킹과 드라이브인 물류 동선이 최적화된 초대형 랜드마크 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600',
    score: 95,
    recentTransactions: [
      { date: '2026-05-12', type: '임대', sizeSqM: 45.2, floor: 15, price: '보증금 1,000만 / 월세 90만' },
      { date: '2026-05-03', type: '임대', sizeSqM: 88.9, floor: 3, price: '보증금 1,500만 / 월세 150만' },
      { date: '2026-04-18', type: '매매', sizeSqM: 108.5, floor: 7, price: '4억 1,000만원' }
    ]
  },
  {
    name: '현대 실리콘앨리 동탄',
    type: '문화복합형 지식산업센터',
    rentPerPy: '3.8만 ~ 4.5만원',
    features: ['뉴욕 스트리트형 대형 상권 연계', '섹션 오피스 레이아웃 최적화', '공유 라운지 & 세미나실 제공', '친환경 태양광 발전 및 에너지 절감'],
    driveIn: false,
    stationDistance: 'close',
    desc: '세련된 오피스 인테리어와 업무 편의 시설, 다채로운 먹거리 상권이 융합된 문화형 복합 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600',
    score: 92,
    recentTransactions: [
      { date: '2026-05-20', type: '임대', sizeSqM: 51.6, floor: 8, price: '보증금 1,000만 / 월세 110만' },
      { date: '2026-04-11', type: '임대', sizeSqM: 102.3, floor: 4, price: '보증금 2,000만 / 월세 210만' },
      { date: '2026-03-29', type: '매매', sizeSqM: 72.4, floor: 12, price: '2억 9,500만원' }
    ]
  },
  {
    name: '동탄 IT타워',
    type: '도보 역세권 지식산업센터',
    rentPerPy: '3.2만 ~ 3.7만원',
    features: ['동탄역 도보 10분권', '소형 사무실(10~15평) 섹션 특화', '합리적인 가성비 임대료', '개별 냉난방 및 조용한 환경'],
    driveIn: false,
    stationDistance: 'very-close',
    desc: '동탄역과의 지리적 접근성이 가장 뛰어나며, 소자본 스타트업이나 소형 오피스에 안성맞춤입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-orange-600',
    score: 89,
    recentTransactions: [
      { date: '2026-05-24', type: '임대', sizeSqM: 33.1, floor: 9, price: '보증금 500만 / 월세 65만' },
      { date: '2026-04-15', type: '임대', sizeSqM: 66.2, floor: 11, price: '보증금 1,000만 / 월세 115만' },
      { date: '2026-02-28', type: '매매', sizeSqM: 33.1, floor: 5, price: '1억 2,000만원' }
    ]
  },
  {
    name: 'SH타임스퀘어',
    type: '제조/도어투도어 지식산업센터',
    rentPerPy: '3.0만 ~ 3.5만원',
    features: ['도어투도어 (호실 앞 주차 가능)', '하중 설계 평당 4톤 이상', '화물용 엘리베이터 인접', '소형 공장 등록 가능'],
    driveIn: true,
    stationDistance: 'moderate',
    desc: '하역 동선과 중장비 설비 안착이 필요한 고부하 제조 및 물류 적재 업종에 최적화된 맞춤형 센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-600',
    score: 87,
    recentTransactions: [
      { date: '2026-05-18', type: '임대', sizeSqM: 75.4, floor: 2, price: '보증금 800만 / 월세 85만' },
      { date: '2026-03-05', type: '임대', sizeSqM: 150.8, floor: 1, price: '보증금 2,000만 / 월세 200만' },
      { date: '2026-01-20', type: '매매', sizeSqM: 75.4, floor: 4, price: '2억 1,000만원' }
    ]
  }
];

export default function OfficeExplorerClient() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDong, setSelectedDong] = useState('전체');
  const [selectedDriveIn, setSelectedDriveIn] = useState<'all' | 'yes' | 'no'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'rentPerPy' | 'station'>('score');
  const [selectedBuilding, setSelectedBuilding] = useState<OfficeBuilding | null>(null);
  
  const isResizingRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      if (animationFrameIdRef.current) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = window.requestAnimationFrame(() => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(180, Math.min(380, startWidth + deltaX));
        setSidebarWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const filteredBuildings = useMemo(() => {
    return BUILDINGS_DB.filter(building => {
      const matchesSearch = building.name.includes(searchQuery) || building.desc.includes(searchQuery);
      const matchesDriveIn = selectedDriveIn === 'all' || 
        (selectedDriveIn === 'yes' && building.driveIn) || 
        (selectedDriveIn === 'no' && !building.driveIn);
      return matchesSearch && matchesDriveIn;
    }).sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'rentPerPy') {
        const rentA = parseFloat(a.rentPerPy.replace(/[^0-9.]/g, ''));
        const rentB = parseFloat(b.rentPerPy.replace(/[^0-9.]/g, ''));
        return rentA - rentB;
      }
      if (sortBy === 'station') {
        const distScore = { 'very-close': 3, 'close': 2, 'moderate': 1 };
        return distScore[b.stationDistance] - distScore[a.stationDistance];
      }
      return 0;
    });
  }, [searchQuery, selectedDriveIn, sortBy]);

  return (
    <div className="flex flex-col w-full bg-transparent">
      <PageHeroHeader 
        title="D-VIEW 사무실 탐색"
        subtitleStrong="지식산업센터 공실 매칭 & 혜택 센터"
        subtitleLight="수도권 최대 규모 산업 클러스터 활성화를 위한 원스톱 오피스 솔루션"
      />

      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-0 flex flex-col">
        <div className="flex w-full bg-surface md:rounded-2xl md:border md:border-border/80 md:shadow-sm items-stretch flex-1 min-h-[500px]">
          
          {/* Sidebar 필터 영역 */}
          <aside 
            style={{ width: `${sidebarWidth}px` }}
            className="hidden md:flex flex-col shrink-0 border-r border-border bg-neutral-50/40 dark:bg-zinc-900/10 py-6 px-4 sticky top-[68px] self-start md:rounded-l-2xl"
          >
            <div className="mb-6">
              <h3 className="text-xs font-bold text-secondary mb-3 flex items-center gap-1.5">
                <MapPin size={14} className="text-[#ea6100]" />
                행정구역 필터
              </h3>
              <div className="flex flex-col gap-1">
                {['전체', '동탄영천동', '동탄오산동', '동탄목동', '동탄장지동'].map(dong => (
                  <button
                    key={dong}
                    onClick={() => setSelectedDong(dong)}
                    className={`w-full text-left py-2 px-3 text-[13px] font-extrabold rounded-xl transition-all ${
                      selectedDong === dong 
                        ? 'bg-[#c44d00]/5 text-[#c44d00] dark:bg-[#ea6100]/5 dark:text-[#ea6100]'
                        : 'text-tertiary hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {dong}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-bold text-secondary mb-3 flex items-center gap-1.5">
                <Filter size={14} className="text-[#ea6100]" />
                시설 조건
              </h3>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'all', label: '전체 오피스' },
                  { id: 'yes', label: '드라이브인 가능' },
                  { id: 'no', label: '드라이브인 불가' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedDriveIn(opt.id as 'all' | 'yes' | 'no')}
                    className={`w-full text-left py-2 px-3 text-[13px] font-extrabold rounded-xl transition-all ${
                      selectedDriveIn === opt.id 
                        ? 'bg-[#c44d00]/5 text-[#c44d00] dark:bg-[#ea6100]/5 dark:text-[#ea6100]'
                        : 'text-tertiary hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Drag Resizer */}
          <div 
            onMouseDown={handleMouseDown}
            className="hidden md:block w-1 bg-border/80 hover:bg-[#ea6100]/60 transition-all cursor-col-resize shrink-0 relative z-30"
          />

          {/* 메인 리스트 영역 */}
          <div className="flex-1 flex flex-col bg-transparent min-w-0 md:pl-6 lg:pl-8 md:pr-6 lg:pr-8 py-2 md:rounded-r-2xl">
            
            {/* 상단 검색 / 소팅 바 */}
            <div className="px-0 py-3 md:py-4 border-b border-border flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-transparent">
              <div>
                <h2 className="text-lg font-black text-primary">지식산업센터 탐색</h2>
                <p className="text-[12px] text-tertiary mt-1">
                  총 <span className="text-[#ea6100] font-extrabold">{filteredBuildings.length}</span>개의 빌딩이 탐색되었습니다.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                {/* 검색 인풋 */}
                <div className="relative w-full sm:w-[220px]">
                  <input
                    type="text"
                    placeholder="빌딩명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-body border border-border focus:border-[#ea6100] rounded-xl pl-9 pr-4 py-2 text-[12.5px] font-semibold outline-none transition-all"
                  />
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary" />
                </div>

                {/* 정렬 필터 */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar shrink-0 py-1">
                  {[
                    { id: 'score', label: '종합 점수순' },
                    { id: 'rentPerPy', label: '저렴한 임대료순' },
                    { id: 'station', label: '역세권순' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as 'score' | 'rentPerPy' | 'station')}
                      className={`px-3 py-1.5 rounded-full text-[11.5px] font-extrabold border transition-all shrink-0 ${
                        sortBy === opt.id
                          ? 'bg-[#c44d00] border-[#c44d00] text-white shadow-sm'
                          : 'bg-body border-border text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 테이블형 목록 */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-4">
              <div className="flex flex-col gap-3">
                {filteredBuildings.map((building, idx) => (
                  <div 
                    key={building.name}
                    onClick={() => setSelectedBuilding(building)}
                    className="group flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 border border-border hover:border-[#ea6100]/40 rounded-2xl bg-surface hover:bg-neutral-50/20 dark:hover:bg-zinc-900/10 transition-all cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-black ${building.imgPlaceholder}`}>
                        {idx + 1}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-primary truncate">{building.name}</h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-secondary shrink-0">
                            {building.type}
                          </span>
                          {building.driveIn && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 shrink-0">
                              드라이브인
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-tertiary mt-1.5 leading-relaxed truncate md:max-w-[500px]">
                          {building.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border border-dashed shrink-0">
                      <div className="flex flex-col items-start md:items-end">
                        <span className="text-[11px] font-bold text-tertiary">평당 임대료</span>
                        <span className="text-sm font-black text-[#ea6100] mt-0.5">{building.rentPerPy}</span>
                      </div>
                      <span className="text-[12px] font-extrabold text-secondary bg-neutral-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-border/40 group-hover:bg-[#ea6100]/10 group-hover:text-[#ea6100] group-hover:border-[#ea6100]/20 transition-all">
                        상세 정보
                      </span>
                    </div>
                  </div>
                ))}

                {filteredBuildings.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <Building size={40} className="text-tertiary mb-3 opacity-60" />
                    <p className="text-sm font-bold text-secondary">조건에 맞는 사무실/지산 빌딩이 없습니다.</p>
                    <p className="text-xs text-tertiary mt-1">검색어나 필터를 초기화해 보세요.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 상세 정보 모달 (껍데기 형식) */}
      {selectedBuilding && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-[580px] rounded-3xl shadow-2xl border border-border p-6 sm:p-8 flex flex-col animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setSelectedBuilding(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-secondary transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3.5 mb-5 mt-2">
              <div className="p-3 bg-[#ea6100]/10 text-[#ea6100] rounded-2xl">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-primary">{selectedBuilding.name}</h3>
                <span className="text-xs font-bold text-tertiary mt-1 block">{selectedBuilding.type}</span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-secondary mb-2">빌딩 상세 특징</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBuilding.features.map(feat => (
                    <span key={feat} className="text-[11px] font-extrabold px-3 py-1.5 bg-neutral-50 dark:bg-zinc-800/40 rounded-xl border border-border/30 text-secondary">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-secondary mb-2">기본 정보</h4>
                <p className="text-[12.5px] leading-relaxed text-secondary font-medium">
                  {selectedBuilding.desc}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-secondary mb-2.5">최근 3개월 실거래/시세 현황 (형식)</h4>
                <div className="border border-border/80 rounded-2xl overflow-hidden divide-y divide-border/60 bg-body/20">
                  {selectedBuilding.recentTransactions.map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 text-[12px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          tx.type === '매매' ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600'
                        }`}>
                          {tx.type}
                        </span>
                        <span className="text-secondary">{tx.sizeSqM}㎡ (실평수)</span>
                        <span className="text-tertiary">{tx.floor}층</span>
                      </div>
                      <div className="text-primary font-black">{tx.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 w-full mt-8">
              <button
                onClick={() => setSelectedBuilding(null)}
                className="flex-1 py-3 bg-[#c44d00] hover:bg-[#9e3c00] dark:bg-[#ff8f00] dark:hover:bg-[#c44d00] text-white font-extrabold text-[13px] rounded-2xl shadow-md transition-all active:scale-[0.98]"
              >
                확인
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

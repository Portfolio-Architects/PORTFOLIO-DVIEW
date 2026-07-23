'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  X, 
  Filter, 
  Building,
  Calendar,
  Layers,
  Car,
  Maximize2
} from 'lucide-react';
import PageHeroHeader from '@/components/PageHeroHeader';
import dynamic from 'next/dynamic';

const CoLeasingBoard = dynamic(() => import('@/components/macro/CoLeasingBoard'), {
  ssr: false,
  loading: () => <div className="w-full h-[230px] min-h-[230px] bg-body/20 dark:bg-zinc-800/20 rounded-[20px] animate-pulse" />
});

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
  dong: '동탄영천동' | '동탄오산동' | '동탄목동' | '동탄장지동';
  rentPerPy: string;
  features: string[];
  driveIn: boolean;
  stationDistance: 'very-close' | 'close' | 'moderate';
  desc: string;
  imgPlaceholder: string;
  score: number;
  totalUnits: number;
  vacancyRate: number;
  recentTransactions: OfficeTransaction[];
  specs: {
    gfa: string;
    scale: string;
    parking: string;
    completion: string;
  };
}

const BUILDINGS_DB: OfficeBuilding[] = [
  {
    name: '금강펜테리움 IX타워',
    type: '초대형 지식산업센터',
    dong: '동탄영천동',
    rentPerPy: '3.5만 ~ 4.2만원',
    features: ['드라이브인 (지하 2층 ~ 지상 7층)', '동탄역 셔틀버스 상시 운행', '최대 층고 5.8m 제조 특화', '피트니스 & 옥상정원 인프라'],
    driveIn: true,
    stationDistance: 'close',
    desc: '대규모 입주 기업 네트워킹과 드라이브인 물류 동선이 최적화된 초대형 랜드마크 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20',
    score: 95,
    totalUnits: 2701,
    vacancyRate: 21.6,
    recentTransactions: [
      { date: '2026-05-12', type: '임대', sizeSqM: 45.2, floor: 15, price: '보증금 1,000만 / 월세 90만' },
      { date: '2026-05-03', type: '임대', sizeSqM: 88.9, floor: 3, price: '보증금 1,500만 / 월세 150만' },
      { date: '2026-04-18', type: '매매', sizeSqM: 108.5, floor: 7, price: '4억 1,000만원' }
    ],
    specs: {
      gfa: '286,970㎡ (약 8.6만 평, 남부권 최대)',
      scale: '지하 2층 ~ 지상 38층 (총 3개동)',
      parking: '1,879대 (법정대비 170%)',
      completion: '2021년 08월'
    }
  },
  {
    name: '현대 실리콘앨리 동탄',
    type: '문화복합형 지식산업센터',
    dong: '동탄영천동',
    rentPerPy: '3.8만 ~ 4.5만원',
    features: ['뉴욕 스트리트형 대형 상권 연계', '섹션 오피스 레이아웃 최적화', '공유 라운지 & 세미나실 제공', '친환경 태양광 발전 및 에너지 절감'],
    driveIn: false,
    stationDistance: 'close',
    desc: '세련된 오피스 인테리어와 업무 편의 시설, 다채로운 먹거리 상권이 융합된 문화형 복합 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-orange-light to-brand-orange/15 text-brand-orange dark:from-brand-orange-light/10 dark:to-brand-orange/20',
    score: 92,
    totalUnits: 2470,
    vacancyRate: 28.5,
    recentTransactions: [
      { date: '2026-05-20', type: '임대', sizeSqM: 51.6, floor: 8, price: '보증금 1,000만 / 월세 110만' },
      { date: '2026-04-11', type: '임대', sizeSqM: 102.3, floor: 4, price: '보증금 2,000만 / 월세 210만' },
      { date: '2026-03-29', type: '매매', sizeSqM: 72.4, floor: 12, price: '2억 9,500만원' }
    ],
    specs: {
      gfa: '238,615㎡ (약 7.2만 평, 초대형 단지)',
      scale: '지하 4층 ~ 지상 30층 (총 2개동)',
      parking: '1,671대 (넉넉함)',
      completion: '2023년 06월'
    }
  },
  {
    name: '동탄 IT타워',
    type: '도보 역세권 지식산업센터',
    dong: '동탄영천동',
    rentPerPy: '3.2만 ~ 3.7만원',
    features: ['동탄역 도보 10분권', '소형 사무실(10~15평) 섹션 특화', '합리적인 가성비 임대료', '개별 냉난방 및 조용한 환경'],
    driveIn: false,
    stationDistance: 'very-close',
    desc: '동탄역과의 지리적 접근성이 가장 뛰어나며, 소자본 스타트업이나 소형 오피스에 안성맞춤입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 dark:from-zinc-800 dark:to-zinc-900/70 dark:text-zinc-400',
    score: 89,
    totalUnits: 320,
    vacancyRate: 13.5,
    recentTransactions: [
      { date: '2026-05-24', type: '임대', sizeSqM: 33.1, floor: 9, price: '보증금 500만 / 월세 65만' },
      { date: '2026-04-15', type: '임대', sizeSqM: 66.2, floor: 11, price: '보증금 1,000만 / 월세 115만' },
      { date: '2026-02-28', type: '매매', sizeSqM: 33.1, floor: 5, price: '1억 2,000만원' }
    ],
    specs: {
      gfa: '41,200㎡ (실속형 비즈니스 특화)',
      scale: '지하 2층 ~ 지상 15층 (단일동)',
      parking: '298대 (법정 수준)',
      completion: '2018년 04월'
    }
  },
  {
    name: 'SH타임스퀘어',
    type: '제조/도어투도어 지식산업센터',
    dong: '동탄영천동',
    rentPerPy: '3.0만 ~ 3.5만원',
    features: ['도어투도어 (호실 앞 주차 가능)', '하중 설계 평당 4톤 이상', '화물용 엘리베이터 인접', '소형 공장 등록 가능'],
    driveIn: true,
    stationDistance: 'moderate',
    desc: '하역 동선과 중장비 설비 안착이 필요한 고부하 제조 및 물류 적재 업종에 최적화된 맞춤형 센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20',
    score: 87,
    totalUnits: 369,
    vacancyRate: 19.8,
    recentTransactions: [
      { date: '2026-05-18', type: '임대', sizeSqM: 75.4, floor: 2, price: '보증금 800만 / 월세 85만' },
      { date: '2026-03-05', type: '임대', sizeSqM: 150.8, floor: 1, price: '보증금 2,000만 / 월세 200만' },
      { date: '2026-01-20', type: '매매', sizeSqM: 75.4, floor: 4, price: '2억 1,000만원' }
    ],
    specs: {
      gfa: '56,700㎡ (제조·물류 특화형)',
      scale: '지하 2층 ~ 지상 12층 (단일동)',
      parking: '388대 (하역 데크 확보)',
      completion: '2018년 11월'
    }
  },
  {
    name: '동탄 테라타워',
    type: '제조·오피스 하이브리드 지산',
    dong: '동탄영천동',
    rentPerPy: '3.3만 ~ 3.9만원',
    features: ['드라이브인 시스템 완비', '동탄역세권 대중교통 인접', '초고속 화물 승강기', '커뮤니티 및 회의실 연계'],
    driveIn: true,
    stationDistance: 'close',
    desc: '제조형 공장과 스마트 오피스가 조화롭게 융합된 현대엔지니어링 시공의 프리미엄 지식산업센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-orange-light to-brand-orange/15 text-brand-orange dark:from-brand-orange-light/10 dark:to-brand-orange/20',
    score: 91,
    totalUnits: 824,
    vacancyRate: 18.2,
    recentTransactions: [
      { date: '2026-05-15', type: '임대', sizeSqM: 60.5, floor: 5, price: '보증금 1,000만 / 월세 100만' },
      { date: '2026-04-20', type: '매매', sizeSqM: 120.4, floor: 8, price: '3억 8,000만원' }
    ],
    specs: {
      gfa: '143,600㎡ (중대형급 복합 지산)',
      scale: '지하 2층 ~ 지상 29층',
      parking: '984대 (쾌적한 주차)',
      completion: '2020년 10월'
    }
  },
  {
    name: '동탄 에이팩시티',
    type: '랜드마크형 IT 지식산업센터',
    dong: '동탄영천동',
    rentPerPy: '3.4만 ~ 4.0만원',
    features: ['초대형 하역 데크 시스템', '입주 기업 전용 네트워킹 라운지', '동탄테크노밸리 초입 입지', '주변 풍부한 근린 상가'],
    driveIn: false,
    stationDistance: 'close',
    desc: '동탄테크노밸리 진입로에 위치하여 뛰어난 가시성과 브랜드 파워를 자랑하는 전통의 랜드마크 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 dark:from-zinc-800 dark:to-zinc-900/70 dark:text-zinc-400',
    score: 93,
    totalUnits: 618,
    vacancyRate: 15.4,
    recentTransactions: [
      { date: '2026-05-10', type: '임대', sizeSqM: 48.2, floor: 12, price: '보증금 1,000만 / 월세 95만' },
      { date: '2026-04-05', type: '임대', sizeSqM: 92.4, floor: 6, price: '보증금 1,500만 / 월세 155만' }
    ],
    specs: {
      gfa: '72,000㎡ (랜드마크 비즈니스)',
      scale: '지하 3층 ~ 지상 17층',
      parking: '524대',
      completion: '2017년 12월'
    }
  },
  {
    name: '동탄 SK V1',
    type: '대단지 도어투도어 제조형 지산',
    dong: '동탄영천동',
    rentPerPy: '3.1만 ~ 3.6만원',
    features: ['전 층 드라이브인 램프', '램프 입구 폭 9m로 대형차 통행 원활', '평당 5톤 하중 바닥', '집하 및 하역 공간 분리'],
    driveIn: true,
    stationDistance: 'moderate',
    desc: '대형 화물 물류와 하역이 빈번한 정밀 제조 및 가공 조립 업종에 압도적인 편의를 제공하는 대단지 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20',
    score: 90,
    totalUnits: 776,
    vacancyRate: 22.8,
    recentTransactions: [
      { date: '2026-05-19', type: '임대', sizeSqM: 99.5, floor: 3, price: '보증금 1,200만 / 월세 115만' },
      { date: '2026-03-24', type: '매매', sizeSqM: 99.5, floor: 2, price: '2억 6,000만원' }
    ],
    specs: {
      gfa: '89,800㎡ (대규모 제조 물류망)',
      scale: '지하 2층 ~ 지상 20층',
      parking: '650대',
      completion: '2019년 02월'
    }
  },
  {
    name: '동탄 비즈타워',
    type: '실속형 콤팩트 지식산업센터',
    dong: '동탄영천동',
    rentPerPy: '2.8만 ~ 3.3만원',
    features: ['가장 합리적인 평단 임대 가격', '드라이브인 하역 램프 탑재', '소규모 분할 섹션 오피스 다수', '주차 100% 이상 확보'],
    driveIn: true,
    stationDistance: 'moderate',
    desc: '스타트업 및 소형 창고 임차가 필요한 소자본 임차인에게 최고의 평단 가성비를 제공하는 실속형 센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-orange-light to-brand-orange/15 text-brand-orange dark:from-brand-orange-light/10 dark:to-brand-orange/20',
    score: 86,
    totalUnits: 276,
    vacancyRate: 25.4,
    recentTransactions: [
      { date: '2026-05-22', type: '임대', sizeSqM: 40.5, floor: 7, price: '보증금 500만 / 월세 55만' },
      { date: '2026-04-12', type: '임대', sizeSqM: 80.2, floor: 4, price: '보증금 1,000만 / 월세 95만' }
    ],
    specs: {
      gfa: '32,500㎡ (소규모 실속 임차)',
      scale: '지하 1층 ~ 지상 10층',
      parking: '210대',
      completion: '2016년 08월'
    }
  },
  {
    name: '동탄 더퍼스트타워',
    type: '역세권 스마트 섹션 지산',
    dong: '동탄영천동',
    rentPerPy: '3.3만 ~ 3.8만원',
    features: ['동탄역 도보 8분권', '소형 오피스 전용 섹션 설계', '공동 회의실 지원', '쾌적한 중앙 광장 조경'],
    driveIn: false,
    stationDistance: 'very-close',
    desc: '동탄역 접근성이 극대화되고 입주사 비즈니스 편의 시설이 우수한 스마트 사무 특화 지식산업센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 dark:from-zinc-800 dark:to-zinc-900/70 dark:text-zinc-400',
    score: 90,
    totalUnits: 460,
    vacancyRate: 16.8,
    recentTransactions: [
      { date: '2026-05-14', type: '임대', sizeSqM: 40.2, floor: 10, price: '보증금 1,000만 / 월세 85만' },
      { date: '2026-04-19', type: '매매', sizeSqM: 80.5, floor: 15, price: '2억 4,000만원' }
    ],
    specs: {
      gfa: '58,200㎡ (역세권 랜드마크)',
      scale: '지하 3층 ~ 지상 20층 (단일동)',
      parking: '420대 (안정적인 확보)',
      completion: '2018년 04월'
    }
  },
  {
    name: '동탄 메가비즈타워',
    type: '소규모 실속형 섹션 지산',
    dong: '동탄영천동',
    rentPerPy: '2.9만 ~ 3.4만원',
    features: ['스타트업 소형 사무실 특화', '기흥IC 차량 3분 최적 진입', '구내 식당 및 편의점 연계', '저렴한 관리비용'],
    driveIn: false,
    stationDistance: 'moderate',
    desc: '초기 창업 기업 및 1인 스타트업이 저렴한 고정 비용으로 입주할 수 있도록 유닛을 잘게 쪼갠 가성비 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20',
    score: 85,
    totalUnits: 168,
    vacancyRate: 23.5,
    recentTransactions: [
      { date: '2026-05-18', type: '임대', sizeSqM: 33.1, floor: 8, price: '보증금 500만 / 월세 50만' },
      { date: '2026-04-02', type: '임대', sizeSqM: 66.2, floor: 12, price: '보증금 1,000만 / 월세 90만' }
    ],
    specs: {
      gfa: '21,800㎡ (스타트업 비즈니스 특화)',
      scale: '지하 2층 ~ 지상 12층',
      parking: '145대',
      completion: '2019년 05월'
    }
  }
];

interface OfficeBuildingCardProps {
  building: OfficeBuilding;
  idx: number;
  onSelect: (building: OfficeBuilding) => void;
}

const OfficeBuildingCard = React.memo(function OfficeBuildingCard({
  building,
  idx,
  onSelect
}: OfficeBuildingCardProps) {
  return (
    <div 
      onClick={() => onSelect(building)}
      className="group flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 border border-border/40 dark:border-white/10 bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md hover:bg-surface/95 dark:hover:bg-zinc-900/95 hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:scale-[1.01] rounded-[20px] transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-black ${building.imgPlaceholder}`}>
          {idx + 1}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-primary/95 dark:text-zinc-100 tracking-tight leading-normal truncate">{building.name}</h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-secondary/80 dark:text-zinc-400 shrink-0">
              {building.type}
            </span>
            {building.driveIn && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                드라이브인
              </span>
            )}
          </div>
          <p className="text-[12px] text-secondary/75 dark:text-zinc-400 mt-1.5 leading-relaxed truncate md:max-w-[500px]">
            {building.desc}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[10.5px] font-bold text-secondary/60 dark:text-zinc-400">
            <span>총 {building.totalUnits.toLocaleString()}호</span>
            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-zinc-700 shrink-0" />
            <span>공실률 {building.vacancyRate}%</span>
          </div>
        </div>
      </div>

      <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 dark:border-white/10 border-dashed shrink-0">
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-secondary/60 dark:text-zinc-400">평당 임대료</span>
          <span className="text-sm font-black text-[#ea6100] mt-0.5">{building.rentPerPy}</span>
        </div>
        <span className="text-[12px] font-extrabold text-secondary/90 dark:text-zinc-300 bg-neutral-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-border/40 dark:border-white/10 group-hover:bg-[#ea6100]/10 group-hover:text-[#ea6100] group-hover:border-[#ea6100]/20 dark:group-hover:bg-[#ea6100]/20 dark:group-hover:border-[#ea6100]/30 transition-all duration-300">
          상세 정보
        </span>
      </div>
    </div>
  );
});

OfficeBuildingCard.displayName = 'OfficeBuildingCard';

const OfficeExplorerClient = React.memo(function OfficeExplorerClient() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriveIn, setSelectedDriveIn] = useState<'all' | 'yes' | 'no'>('all');
  const [selectedStation, setSelectedStation] = useState<'all' | 'near'>('all');
  const [selectedScale, setSelectedScale] = useState<'all' | 'huge'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'rentPerPy' | 'station' | 'units' | 'vacancy'>('score');
  const [selectedBuilding, setSelectedBuilding] = useState<OfficeBuilding | null>(null);
  
  const isResizingRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const resizeListenersRef = useRef<{
    mousemove: ((e: MouseEvent) => void) | null;
    mouseup: (() => void) | null;
  }>({ mousemove: null, mouseup: null });

  useEffect(() => {
    return () => {
      const { mousemove, mouseup } = resizeListenersRef.current;
      if (mousemove) document.removeEventListener('mousemove', mousemove);
      if (mouseup) document.removeEventListener('mouseup', mouseup);
      if (animationFrameIdRef.current) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

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
      resizeListenersRef.current = { mousemove: null, mouseup: null };
    };

    resizeListenersRef.current = { mousemove: handleMouseMove, mouseup: handleMouseUp };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const filteredBuildings = useMemo(() => {
    return BUILDINGS_DB.filter(building => {
      const matchesSearch = building.name.includes(searchQuery) || building.desc.includes(searchQuery);
      const matchesDriveIn = selectedDriveIn === 'all' || 
        (selectedDriveIn === 'yes' && building.driveIn) || 
        (selectedDriveIn === 'no' && !building.driveIn);
      const matchesStation = selectedStation === 'all' || 
        (selectedStation === 'near' && (building.stationDistance === 'very-close' || building.stationDistance === 'close'));
      const matchesScale = selectedScale === 'all' || 
        (selectedScale === 'huge' && building.totalUnits >= 800);
      
      return matchesSearch && matchesDriveIn && matchesStation && matchesScale;
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
      if (sortBy === 'units') {
        return b.totalUnits - a.totalUnits;
      }
      if (sortBy === 'vacancy') {
        return a.vacancyRate - b.vacancyRate;
      }
      return 0;
    });
  }, [searchQuery, selectedDriveIn, selectedStation, selectedScale, sortBy]);

  return (
    <div className="flex flex-col w-full max-w-full overflow-x-hidden min-w-0 bg-transparent min-h-[85vh] min-h-[800px]">
      <PageHeroHeader 
        title="D-VIEW 사무실 탐색"
        subtitleStrong="나에게 맞는 지식산업센터 사무실 찾기"
        subtitleLight="공실 정보부터 맞춤형 입주 혜택까지, 동탄 테크노밸리 원스톱 매칭 솔루션"
      />

      <div className="w-full max-w-full overflow-x-hidden min-w-0 px-3.5 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-[85vh] min-h-[800px] flex flex-col gap-6 sm:gap-8">
        
        {/* 소형 오피스 공동임차 매칭 보드 상단 배치 */}
        <CoLeasingBoard />

        <div className="flex w-full max-w-full min-w-0 bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md md:rounded-[20px] md:border md:border-border/40 md:dark:border-white/10 md:shadow-[0_8px_30px_rgb(0,0,0,0.02)] items-stretch flex-1 min-h-[85vh] min-h-[800px]">
          
          {/* Sidebar 필터 영역 */}
          <aside 
            style={{ width: `${sidebarWidth}px` }}
            className="hidden md:flex flex-col shrink-0 border-r border-border/40 dark:border-white/10 bg-neutral-50/20 dark:bg-zinc-900/20 backdrop-blur-md py-6 px-4 sticky top-[68px] self-start md:rounded-l-[20px] gap-6 select-none"
          >
            {/* Filter Group 1: Drive-In */}
            <div>
              <h3 className="text-xs font-bold text-secondary/95 dark:text-zinc-100 tracking-tight leading-normal mb-3 flex items-center gap-1.5">
                <Filter size={14} className="text-[#ea6100]" />
                물류 / 하역 시설
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
                    className={`w-full text-left py-2 px-3 text-[13px] font-extrabold rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] duration-200 ${
                      selectedDriveIn === opt.id 
                        ? 'bg-[#c44d00]/5 text-[#c44d00] dark:bg-[#ea6100]/5 dark:text-[#ea6100]'
                        : 'text-secondary/70 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Group 2: Station Proximity */}
            <div>
              <h3 className="text-xs font-bold text-secondary/95 dark:text-zinc-100 tracking-tight leading-normal mb-3 flex items-center gap-1.5">
                <Filter size={14} className="text-[#ea6100]" />
                대중교통 입지
              </h3>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'all', label: '전체 입지' },
                  { id: 'near', label: '초역세권 (도보 10분 내)' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedStation(opt.id as 'all' | 'near')}
                    className={`w-full text-left py-2 px-3 text-[13px] font-extrabold rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] duration-200 ${
                      selectedStation === opt.id 
                        ? 'bg-[#c44d00]/5 text-[#c44d00] dark:bg-[#ea6100]/5 dark:text-[#ea6100]'
                        : 'text-secondary/70 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Group 3: Building Scale */}
            <div>
              <h3 className="text-xs font-bold text-secondary/95 dark:text-zinc-100 tracking-tight leading-normal mb-3 flex items-center gap-1.5">
                <Filter size={14} className="text-[#ea6100]" />
                단지 규모
              </h3>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'all', label: '전체 규모' },
                  { id: 'huge', label: '대단지 (연면적 10만㎡+)' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedScale(opt.id as 'all' | 'huge')}
                    className={`w-full text-left py-2 px-3 text-[13px] font-extrabold rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] duration-200 ${
                      selectedScale === opt.id 
                        ? 'bg-[#c44d00]/5 text-[#c44d00] dark:bg-[#ea6100]/5 dark:text-[#ea6100]'
                        : 'text-secondary/70 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
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
            className="hidden md:block w-[2px] hover:w-[4px] bg-border/30 dark:bg-white/10 hover:bg-[#ea6100]/60 dark:hover:bg-[#ea6100]/60 transition-all cursor-col-resize shrink-0 relative z-30"
          />

          {/* 메인 리스트 영역 */}
          <div className="flex-1 flex flex-col bg-transparent min-w-0 md:pl-6 lg:pl-8 md:pr-6 lg:pr-8 py-2 md:rounded-r-[20px] max-w-full overflow-hidden">
            
            {/* 상단 검색 / 소팅 바 */}
            <div className="px-0 py-3 md:py-4 border-b border-border/40 dark:border-white/10 flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-transparent min-w-0 max-w-full overflow-hidden">
              <div>
                <h2 className="text-lg font-black text-primary/95 dark:text-zinc-100 tracking-tight leading-normal">지식산업센터 탐색</h2>
                <p className="text-[12px] text-secondary/80 dark:text-zinc-400 mt-1 leading-relaxed">
                  총 <span className="text-[#ea6100] font-extrabold">{filteredBuildings.length}</span>개의 빌딩이 탐색되었습니다.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center min-w-0 max-w-full">
                {/* 검색 인풋 */}
                <div className="relative w-full sm:w-[220px]">
                  <input
                    type="text"
                    placeholder="빌딩명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-body/60 dark:bg-zinc-850/40 border border-border/40 dark:border-white/10 focus:ring-2 focus:ring-[#ea6100]/30 dark:focus:ring-[#ea6100]/30 focus:border-[#ea6100] dark:focus:border-[#ea6100] rounded-xl pl-9 pr-4 py-2 text-[12.5px] font-semibold outline-none transition-all duration-300"
                  />
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary/70 dark:text-zinc-400" />
                </div>

                {/* 정렬 필터 */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar shrink-0 py-1 max-w-full">
                  {[
                    { id: 'score', label: '종합 점수순' },
                    { id: 'rentPerPy', label: '저렴한 임대료순' },
                    { id: 'station', label: '역세권순' },
                    { id: 'units', label: '총 호수순' },
                    { id: 'vacancy', label: '공실률 낮은순' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as 'score' | 'rentPerPy' | 'station' | 'units' | 'vacancy')}
                      className={`px-3 py-1.5 rounded-full text-[11.5px] font-extrabold border transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98] duration-200 ${
                        sortBy === opt.id
                          ? 'bg-[#c44d00] border-[#c44d00] text-white shadow-sm'
                          : 'bg-body border-border/40 dark:border-white/10 text-secondary/80 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 테이블형 목록 */}
            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth py-4">
              <div className="flex flex-col gap-3">
                {filteredBuildings.map((building, idx) => (
                  <OfficeBuildingCard
                    key={building.name}
                    building={building}
                    idx={idx}
                    onSelect={setSelectedBuilding}
                  />
                ))}

                {filteredBuildings.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <Building size={40} className="text-secondary/50 dark:text-zinc-500 mb-3 opacity-60" />
                    <p className="text-sm font-bold text-secondary/90 dark:text-zinc-300">조건에 맞는 사무실/지산 빌딩이 없습니다.</p>
                    <p className="text-xs text-secondary/60 dark:text-zinc-500 mt-1">검색어나 필터를 초기화해 보세요.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 상세 정보 모달 */}
      {selectedBuilding && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface/90 dark:bg-zinc-900/90 backdrop-blur-lg w-full max-w-[580px] h-[82vh] max-h-[640px] rounded-[20px] shadow-2xl border border-border/40 dark:border-white/10 p-6 sm:p-8 flex flex-col justify-between animate-in zoom-in-95 duration-200 relative">
            
            <button 
              onClick={() => setSelectedBuilding(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-secondary dark:text-zinc-400 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3.5 mb-2 mt-2 shrink-0">
              <div className="p-3 bg-[#ea6100]/10 text-[#ea6100] rounded-2xl">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-primary/95 dark:text-zinc-100 tracking-tight leading-normal">{selectedBuilding.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-secondary/70 dark:text-zinc-400">{selectedBuilding.type}</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-zinc-700 shrink-0" />
                  <span className="text-xs font-extrabold text-[#ea6100]">{selectedBuilding.dong}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Content Area with Stable Height */}
            <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-5 scrollbar-thin select-none">
              
              {/* 빌딩 주요 제원 */}
              <div>
                <h4 className="text-xs font-black text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2.5">빌딩 주요 제원</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-[20px] flex items-center gap-3">
                    <div className="text-secondary/70 dark:text-zinc-400 shrink-0"><Maximize2 size={16} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">연면적 (GFA)</span>
                      <span className="text-[11px] text-secondary/90 dark:text-zinc-300 font-extrabold mt-0.5 truncate">{selectedBuilding.specs.gfa}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-[20px] flex items-center gap-3">
                    <div className="text-secondary/70 dark:text-zinc-400 shrink-0"><Layers size={16} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">건물 규모</span>
                      <span className="text-[11px] text-secondary/90 dark:text-zinc-300 font-extrabold mt-0.5 truncate">{selectedBuilding.specs.scale}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-[20px] flex items-center gap-3">
                    <div className="text-secondary/70 dark:text-zinc-400 shrink-0"><Car size={16} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">주차 시설</span>
                      <span className="text-[11px] text-secondary/90 dark:text-zinc-300 font-extrabold mt-0.5 truncate">{selectedBuilding.specs.parking}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-body/40 dark:bg-zinc-800/40 border border-border/40 dark:border-white/10 rounded-[20px] flex items-center gap-3">
                    <div className="text-secondary/70 dark:text-zinc-400 shrink-0"><Calendar size={16} /></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-secondary/60 dark:text-zinc-400 font-bold">준공 연월</span>
                      <span className="text-[11px] text-secondary/90 dark:text-zinc-300 font-extrabold mt-0.5 truncate">{selectedBuilding.specs.completion}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 빌딩 상세 특징 */}
              <div>
                <h4 className="text-xs font-bold text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2.5">빌딩 상세 특징</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBuilding.features.map(feat => (
                    <span key={feat} className="text-[11px] font-extrabold px-3 py-1.5 bg-neutral-50/50 dark:bg-zinc-800/50 rounded-xl border border-border/30 dark:border-white/5 text-secondary dark:text-zinc-300">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* 빌딩 설명 */}
              <div>
                <h4 className="text-xs font-bold text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2">빌딩 설명</h4>
                <p className="text-[12.5px] leading-relaxed text-secondary/90 dark:text-zinc-300 font-medium">
                  {selectedBuilding.desc}
                </p>
              </div>

              {/* 최근 3개월 실거래/시세 현황 */}
              <div>
                <h4 className="text-xs font-bold text-secondary/90 dark:text-zinc-300 tracking-tight leading-normal mb-2.5">최근 3개월 실거래/시세 현황</h4>
                <div className="border border-border/40 dark:border-white/10 rounded-[20px] overflow-hidden divide-y divide-border/40 dark:divide-white/10 bg-body/20">
                  {selectedBuilding.recentTransactions.map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3.5 text-[12px] font-bold hover:bg-body/20 dark:hover:bg-zinc-800/20 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          tx.type === '매매' ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600' : 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600'
                        }`}>
                          {tx.type}
                        </span>
                        <span className="text-secondary dark:text-zinc-300">{tx.sizeSqM}㎡ (실평수)</span>
                        <span className="text-secondary/70 dark:text-zinc-400">{tx.floor}층</span>
                      </div>
                      <div className="text-primary/95 dark:text-zinc-100 font-black">{tx.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 w-full mt-2 shrink-0">
              <button
                onClick={() => setSelectedBuilding(null)}
                className="flex-1 py-3.5 bg-[#c44d00] hover:bg-[#9e3c00] dark:bg-[#ff8f00] dark:hover:bg-[#c44d00] text-white font-extrabold text-[13px] rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                확인
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
});

OfficeExplorerClient.displayName = 'OfficeExplorerClient';
export default OfficeExplorerClient;


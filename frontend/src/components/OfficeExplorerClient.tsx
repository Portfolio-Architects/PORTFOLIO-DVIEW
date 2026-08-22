'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import useSWR from 'swr';
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
import OfficeDetailModal from '@/components/OfficeDetailModal';
import type { JisanStatusItem } from '@/types';

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
  address?: string;
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
    address: '경기도 화성시 동탄기흥로 590 (영천동 98-1)',
    rentPerPy: '3.5만 ~ 4.2만원',
    features: ['드라이브인 (지하 2층 ~ 지상 7층)', '동탄역 셔틀버스 상시 운행', '최대 층고 5.8m 제조 특화', '피트니스 & 옥상정원 인프라'],
    driveIn: true,
    stationDistance: 'close',
    desc: '대규모 입주 기업 네트워킹과 드라이브인 물류 동선이 최적화된 초대형 랜드마크 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20',
    score: 95,
    totalUnits: 2701,
    vacancyRate: 21.6,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄첨단산업1로 57 (영천동 98-4)',
    rentPerPy: '3.8만 ~ 4.5만원',
    features: ['뉴욕 스트리트형 대형 상권 연계', '섹션 오피스 레이아웃 최적화', '공유 라운지 & 세미나실 제공', '친환경 태양광 발전 및 에너지 절감'],
    driveIn: false,
    stationDistance: 'close',
    desc: '세련된 오피스 인테리어와 업무 편의 시설, 다채로운 먹거리 상권이 융합된 문화형 복합 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-orange-light to-brand-orange/15 text-brand-orange dark:from-brand-orange-light/10 dark:to-brand-orange/20',
    score: 92,
    totalUnits: 2470,
    vacancyRate: 28.5,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄대로21길 10 (영천동 651-1500)',
    rentPerPy: '3.2만 ~ 3.7만원',
    features: ['동탄역 도보 10분권', '소형 사무실(10~15평) 섹션 특화', '합리적인 가성비 임대료', '개별 냉난방 및 조용한 환경'],
    driveIn: false,
    stationDistance: 'very-close',
    desc: '동탄역과의 지리적 접근성이 가장 뛰어나며, 소자본 스타트업이나 소형 오피스에 안성맞춤입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 dark:from-zinc-800 dark:to-zinc-900/70 dark:text-zinc-400',
    score: 89,
    totalUnits: 320,
    vacancyRate: 13.5,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄첨단산업1로 51 (영천동 98-3)',
    rentPerPy: '3.0만 ~ 3.5만원',
    features: ['도어투도어 (호실 앞 주차 가능)', '하중 설계 평당 4톤 이상', '화물용 엘리베이터 인접', '소형 공장 등록 가능'],
    driveIn: true,
    stationDistance: 'moderate',
    desc: '하역 동선과 중장비 설비 안착이 필요한 고부하 제조 및 물류 적재 업종에 최적화된 맞춤형 센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20',
    score: 87,
    totalUnits: 369,
    vacancyRate: 19.8,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄순환대로 823 (영천동 620-1)',
    rentPerPy: '3.3만 ~ 3.9만원',
    features: ['드라이브인 시스템 완비', '동탄역세권 대중교통 인접', '초고속 화물 승강기', '커뮤니티 및 회의실 연계'],
    driveIn: true,
    stationDistance: 'close',
    desc: '제조형 공장과 스마트 오피스가 조화롭게 융합된 현대엔지니어링 시공의 프리미엄 지식산업센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-orange-light to-brand-orange/15 text-brand-orange dark:from-brand-orange-light/10 dark:to-brand-orange/20',
    score: 91,
    totalUnits: 824,
    vacancyRate: 18.2,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄첨단산업1로 27 (영천동 103)',
    rentPerPy: '3.4만 ~ 4.0만원',
    features: ['초대형 하역 데크 시스템', '입주 기업 전용 네트워킹 라운지', '동탄테크노밸리 초입 입지', '주변 풍부한 근린 상가'],
    driveIn: false,
    stationDistance: 'close',
    desc: '동탄테크노밸리 진입로에 위치하여 뛰어난 가시성과 브랜드 파워를 자랑하는 전통의 랜드마크 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 dark:from-zinc-800 dark:to-zinc-900/70 dark:text-zinc-400',
    score: 93,
    totalUnits: 618,
    vacancyRate: 15.4,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄기흥로 557 (영천동 99-6)',
    rentPerPy: '3.1만 ~ 3.6만원',
    features: ['전 층 드라이브인 램프', '램프 입구 폭 9m로 대형차 통행 원활', '평당 5톤 하중 바닥', '집하 및 하역 공간 분리'],
    driveIn: true,
    stationDistance: 'moderate',
    desc: '대형 화물 물류와 하역이 빈번한 정밀 제조 및 가공 조립 업종에 압도적인 편의를 제공하는 대단지 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20',
    score: 90,
    totalUnits: 776,
    vacancyRate: 22.8,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄기흥로 565 (영천동 99-3)',
    rentPerPy: '2.8만 ~ 3.3만원',
    features: ['가장 합리적인 평단 임대 가격', '드라이브인 하역 램프 탑재', '소규모 분할 섹션 오피스 다수', '주차 100% 이상 확보'],
    driveIn: true,
    stationDistance: 'moderate',
    desc: '스타트업 및 소형 창고 임차가 필요한 소자본 임차인에게 최고의 평단 가성비를 제공하는 실속형 센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-orange-light to-brand-orange/15 text-brand-orange dark:from-brand-orange-light/10 dark:to-brand-orange/20',
    score: 86,
    totalUnits: 276,
    vacancyRate: 25.4,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄대로 636-14 (영천동 651-1502)',
    rentPerPy: '3.3만 ~ 3.8만원',
    features: ['동탄역 도보 8분권', '소형 오피스 전용 섹션 설계', '공동 회의실 지원', '쾌적한 중앙 광장 조경'],
    driveIn: false,
    stationDistance: 'very-close',
    desc: '동탄역 접근성이 극대화되고 입주사 비즈니스 편의 시설이 우수한 스마트 사무 특화 지식산업센터입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 dark:from-zinc-800 dark:to-zinc-900/70 dark:text-zinc-400',
    score: 90,
    totalUnits: 460,
    vacancyRate: 16.8,
    recentTransactions: [],
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
    address: '경기도 화성시 동탄첨단산업1로 51-9 (영천동 98-7)',
    rentPerPy: '2.9만 ~ 3.4만원',
    features: ['스타트업 소형 사무실 특화', '기흥IC 차량 3분 최적 진입', '구내 식당 및 편의점 연계', '저렴한 관리비용'],
    driveIn: false,
    stationDistance: 'moderate',
    desc: '초기 창업 기업 및 1인 스타트업이 저렴한 고정 비용으로 입주할 수 있도록 유닛을 잘게 쪼갠 가성비 지산입니다.',
    imgPlaceholder: 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20',
    score: 85,
    totalUnits: 168,
    vacancyRate: 23.5,
    recentTransactions: [],
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
      className="group flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 border border-border/40 dark:border-white/10 bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md hover:bg-surface/95 dark:hover:bg-zinc-900/95 hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:scale-[1.01] rounded-[20px] transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-full box-border min-w-0"
    >
      <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0 max-w-full">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 text-base sm:text-lg font-black ${building.imgPlaceholder}`}>
          {idx + 1}
        </div>
        <div className="flex flex-col min-w-0 flex-1 max-w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 max-w-full">
            <h3 className="text-sm sm:text-base font-black text-primary/95 dark:text-zinc-100 tracking-tight leading-normal truncate min-w-0 max-w-full">{building.name}</h3>
            <span className="text-[9.5px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-secondary/80 dark:text-zinc-400 shrink-0">
              {building.type}
            </span>
            <span className="text-[9.5px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-[#ea6100] shrink-0">
              종합 {building.score}점
            </span>
            {building.driveIn && (
              <span className="text-[9.5px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                드라이브인
              </span>
            )}
          </div>
          <p className="text-[11.5px] sm:text-[12px] text-secondary/75 dark:text-zinc-400 mt-1.5 leading-relaxed truncate md:max-w-[500px] min-w-0 max-w-full">
            {building.desc}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[10px] sm:text-[10.5px] font-bold text-secondary/60 dark:text-zinc-400 min-w-0 max-w-full">
            <span>총 {building.totalUnits.toLocaleString()}호</span>
            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-zinc-700 shrink-0" />
            <span>공실률 {building.vacancyRate}%</span>
          </div>
        </div>
      </div>

      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 dark:border-white/10 border-dashed shrink-0 w-full md:w-auto min-w-0 box-border">
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[10.5px] sm:text-[11px] font-bold text-secondary/60 dark:text-zinc-400">평당 임대료</span>
          <span className="text-xs sm:text-sm font-black text-[#ea6100] mt-0.5">{building.rentPerPy}</span>
        </div>
        <span className="text-[11.5px] sm:text-[12px] font-extrabold text-secondary/90 dark:text-zinc-300 bg-neutral-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-border/40 dark:border-white/10 group-hover:bg-[#ea6100]/10 group-hover:text-[#ea6100] group-hover:border-[#ea6100]/20 dark:group-hover:bg-[#ea6100]/20 dark:group-hover:border-[#ea6100]/30 transition-all duration-300 shrink-0">
          상세 정보
        </span>
      </div>
    </div>
  );
});

OfficeBuildingCard.displayName = 'OfficeBuildingCard';

function calculateJisanScore(item: Partial<JisanStatusItem>, existingScore?: number): number {
  let score = 10;

  // 1. 건축/입주 상태 (최대 20점)
  const status = item.buildingStatus || '';
  if (status.includes('완공') || status.includes('완료')) score += 20;
  else if (status.includes('건축중')) score += 10;
  else score += 2; // 미착공 / 사업승인

  // 2. 단지 규모 (연면적 & 총 호수) (최대 20점)
  const units = item.unitCount || 0;
  const area = item.totalFloorArea || 0;
  if (area >= 200000 || units >= 1500) score += 20;
  else if (area >= 100000 || units >= 800) score += 16;
  else if (area >= 50000 || units >= 400) score += 12;
  else if (area >= 20000 || units >= 200) score += 8;
  else score += 4;

  // 3. 입지 및 도로 교통 (최대 20점)
  const address = (item.roadAddress || item.jibunAddress || '');
  if (address.includes('동탄대로')) score += 20;
  else if (address.includes('동탄기흥로')) score += 16;
  else if (address.includes('동탄첨단산업1로') || address.includes('동탄첨단산업2로')) score += 12;
  else score += 8;

  // 4. 드라이브인 / 제조 하역 시설 (최대 15점)
  const name = item.name || '';
  const isDriveIn = name.includes('IX') || 
                    name.includes('V1') || 
                    name.includes('드라이브') || 
                    name.includes('테라타워') || 
                    name.includes('SH타임스퀘어') ||
                    (item.regType || '').includes('제조');
  if (isDriveIn) score += 15;
  else score += 8;

  // 5. 시공사 브랜드 (최대 15점)
  const builder = item.builder || item.developer || '';
  if (builder.includes('현대') || builder.includes('금강') || builder.includes('SK') || builder.includes('포스코') || builder.includes('DL') || builder.includes('한화') || builder.includes('GS') || builder.includes('대우')) score += 15;
  else if (builder && builder !== '미착공') score += 8;
  else score += 2;

  const calculated = Math.min(98, Math.max(45, score));
  return existingScore ? Math.max(existingScore, calculated) : calculated;
}

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

  const { data: jisanStatusRes } = useSWR('/api/technovalley/jisan-status', (url: string) => fetch(url).then(res => res.json()), {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const allBuildings = useMemo<OfficeBuilding[]>(() => {
    const centers: JisanStatusItem[] = Array.isArray(jisanStatusRes?.centers) ? jisanStatusRes.centers : [];
    if (!centers.length) return BUILDINGS_DB;

    const normalizeKey = (s: string) => s.replace(/동탄|\s+/g, '');
    const existingMap = new Map(BUILDINGS_DB.map(b => [normalizeKey(b.name), b]));
    
    return centers.map((item, idx) => {
      const cleanName = item.name ? normalizeKey(item.name) : '';
      let existing = existingMap.get(cleanName);
      if (!existing && cleanName) {
        existing = BUILDINGS_DB.find(b => {
          const bKey = normalizeKey(b.name);
          return bKey.includes(cleanName) || cleanName.includes(bKey);
        });
      }

      if (existing) {
        return {
          ...existing,
          name: item.name || existing.name,
          address: existing.address || item.roadAddress || item.jibunAddress,
          totalUnits: item.unitCount || existing.totalUnits,
          score: calculateJisanScore(item, existing.score),
          specs: {
            ...existing.specs,
            gfa: item.totalFloorArea ? `${Math.round(item.totalFloorArea).toLocaleString()}㎡ (약 ${Math.round(item.totalFloorArea * 0.3025).toLocaleString()}평)` : existing.specs.gfa,
            completion: item.completionDate ? `${item.completionDate.slice(0,4)}년 ${item.completionDate.slice(4,6)}월` : existing.specs.completion
          }
        };
      }

      const driveIn = (item.name || '').includes('IX') || 
                      (item.name || '').includes('V1') || 
                      (item.name || '').includes('드라이브') || 
                      (item.name || '').includes('테라타워') || 
                      (item.name || '').includes('SH타임스퀘어') || 
                      (item.regType || '').includes('제조');
      const isVeryClose = (item.roadAddress || '').includes('동탄대로') || (item.roadAddress || '').includes('동탄기흥로');
      
      return {
        name: item.name || '지식산업센터',
        type: item.buildingStatus ? `${item.buildingStatus} 지식산업센터` : '지식산업센터',
        dong: ((item.roadAddress || '').includes('오산동') || (item.jibunAddress || '').includes('오산동')) ? '동탄오산동' : '동탄영천동',
        address: item.roadAddress || item.jibunAddress || `경기도 화성시 ${((item.roadAddress || '').includes('오산동') || (item.jibunAddress || '').includes('오산동')) ? '오산동' : '영천동'}`,
        rentPerPy: '3.0만 ~ 4.0만원',
        features: [
          item.buildingStatus ? `상태: ${item.buildingStatus}` : '동탄테크노밸리 입지',
          item.builder && item.builder !== '미착공' ? `시공: ${item.builder}` : '지식산업센터 현황',
          item.totalFloorArea ? `연면적 ${Math.round(item.totalFloorArea).toLocaleString()}㎡` : '신규 센터'
        ],
        driveIn,
        stationDistance: isVeryClose ? 'close' : 'moderate',
        desc: item.roadAddress || item.jibunAddress || `${item.name} 지식산업센터입니다.`,
        imgPlaceholder: idx % 3 === 0 
          ? 'bg-gradient-to-br from-brand-blue-light to-brand-blue/15 text-brand-blue dark:from-brand-blue-light/10 dark:to-brand-blue/20'
          : (idx % 3 === 1 
            ? 'bg-gradient-to-br from-brand-orange-light to-brand-orange/15 text-brand-orange dark:from-brand-orange-light/10 dark:to-brand-orange/20'
            : 'bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-600 dark:from-zinc-800 dark:to-zinc-900/70 dark:text-zinc-400'),
        score: calculateJisanScore(item),
        totalUnits: item.unitCount || 100,
        vacancyRate: item.buildingStatus === '건축완료' ? 18.5 : (item.buildingStatus === '건축중' ? 45.0 : 90.0),
        recentTransactions: [],
        specs: {
          gfa: item.totalFloorArea ? `${Math.round(item.totalFloorArea).toLocaleString()}㎡ (약 ${Math.round(item.totalFloorArea * 0.3025).toLocaleString()}평)` : '-',
          scale: item.buildingStatus || '지식산업센터',
          parking: item.unitCount ? `${Math.round(item.unitCount * 1.2)}대` : '법정대비 넉넉함',
          completion: item.completionDate ? `${item.completionDate.slice(0,4)}년 ${item.completionDate.slice(4,6)}월` : (item.buildingStatus || '-')
        }
      };
    });
  }, [jisanStatusRes]);

  const filteredBuildings = useMemo(() => {
    return allBuildings.filter(building => {
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
  }, [allBuildings, searchQuery, selectedDriveIn, selectedStation, selectedScale, sortBy]);

  // Handle #building= hash to open modal automatically
  useEffect(() => {
    if (typeof window === 'undefined' || !allBuildings.length) return;
    const handleHashChange = () => {
      const hash = decodeURIComponent(window.location.hash || '');
      if (hash.includes('#building=')) {
        const buildingName = hash.split('#building=')[1]?.trim();
        if (buildingName) {
          const match = allBuildings.find(b => b.name === buildingName || b.name.replace(/\s+/g, '') === buildingName.replace(/\s+/g, ''));
          if (match) setSelectedBuilding(match);
        }
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [allBuildings]);

  return (
    <div className="flex flex-col w-full max-w-full overflow-x-clip min-w-0 box-border bg-transparent min-h-[85vh] min-h-[800px]" style={{ contain: 'layout paint', containIntrinsicSize: '800px' }}>
      <PageHeroHeader 
        title="D-VIEW 사무실 탐색"
        subtitleStrong="지식산업센터 맞춤 사무실 탐색"
        subtitleLight="공실 현황 데이터 및 입주 혜택 원스톱 매칭"
      />

      <div className="w-full max-w-full overflow-x-clip min-w-0 box-border px-3 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-[85vh] min-h-[800px] flex flex-col gap-6 sm:gap-8">
        
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
            <div className="px-0 py-3 md:py-4 border-b border-border/40 dark:border-white/10 flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-transparent min-w-0 w-full max-w-full overflow-hidden box-border">
              <div>
                <h2 className="text-base sm:text-lg font-black text-primary/95 dark:text-zinc-100 tracking-tight leading-normal">지식산업센터 탐색</h2>
                <p className="text-[11.5px] sm:text-[12px] text-secondary/80 dark:text-zinc-400 mt-1 leading-relaxed">
                  총 <span className="text-[#ea6100] font-extrabold">{filteredBuildings.length}</span>개의 빌딩이 탐색되었습니다.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center min-w-0 max-w-full w-full md:w-auto">
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
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-1 w-full max-w-full min-w-0 box-border">
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
                      className={`px-3 py-1.5 rounded-full text-[11px] sm:text-[11.5px] font-extrabold border transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98] duration-200 ${
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

      {/* 고도화된 지식산업센터 상세정보 모달 (Portal 기반) */}
      <OfficeDetailModal 
        building={selectedBuilding} 
        onClose={() => setSelectedBuilding(null)} 
      />
    </div>
  );
});

OfficeExplorerClient.displayName = 'OfficeExplorerClient';
export default OfficeExplorerClient;


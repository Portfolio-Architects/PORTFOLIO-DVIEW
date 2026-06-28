'use client';

import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Users, 
  Calculator, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Building, 
  CheckCircle2, 
  ChevronRight, 
  HelpCircle, 
  Loader2, 
  Sparkles, 
  Trophy,
  Coins,
  MapPin,
  TrendingDown,
  X
} from 'lucide-react';
import { usePWA } from '@/components/pwa/PWAProvider';
import PageHeroHeader from '@/components/PageHeroHeader';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import TechnoValleyDashboard from '@/components/macro/TechnoValleyDashboard';

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
    imgPlaceholder: 'bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-rose-600',
    score: 87,
    recentTransactions: [
      { date: '2026-05-18', type: '임대', sizeSqM: 132.2, floor: 3, price: '보증금 2,000만 / 월세 240만' },
      { date: '2026-04-05', type: '임대', sizeSqM: 198.3, floor: 1, price: '보증금 3,000만 / 월세 360만' },
      { date: '2026-03-14', type: '매매', sizeSqM: 198.3, floor: 2, price: '6억 2,000만원' }
    ]
  }
];

export default function TechnoValleyClient() {
  const { showToast } = usePWA();
  const [activeSubTab, setActiveSubTab] = useState<'intro' | 'fitfinder' | 'board' | 'calculator'>('intro');
  const [isPending, startTransition] = useTransition();

  // 실거래가 API 동적 연동 상태
  const [fetchedTransactions, setFetchedTransactions] = useState<any[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(true);

  // 지식산업센터 공식 제원 API 동적 연동 상태
  const [centerSpecs, setCenterSpecs] = useState<Record<string, any>>({});
  const [isLoadingSpecs, setIsLoadingSpecs] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const loadSpecs = async () => {
      try {
        setIsLoadingSpecs(true);
        const res = await fetch('/api/technovalley/center-specs');
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.centers) {
            setCenterSpecs(data.centers);
          }
        }
      } catch (err) {
        console.error('Failed to load center specs from KICOX API', err);
      } finally {
        if (active) setIsLoadingSpecs(false);
      }
    };
    loadSpecs();
    return () => { active = false; };
  }, []);

  // 핏파인더 상태
  const [budget, setBudget] = useState<'under100' | '100to200' | 'above200'>('100to200');
  const [employees, setEmployees] = useState<'under5' | '5to15' | 'above15'>('5to15');
  const [needDriveIn, setNeedDriveIn] = useState<boolean>(false);
  const [stationImportance, setStationImportance] = useState<'low' | 'high'>('high');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<OfficeBuilding | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 동탄 테크노밸리 오피스 실거래가 동적 로드
  useEffect(() => {
    let active = true;
    const loadTx = async () => {
      try {
        setIsLoadingTx(true);
        const res = await fetch('/api/technovalley/transactions?lawdCd=41590&dealYmd=202605');
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setFetchedTransactions(data);
          }
        }
      } catch (err) {
        console.error('Failed to load office transactions', err);
      } finally {
        if (active) setIsLoadingTx(false);
      }
    };
    loadTx();
    return () => { active = false; };
  }, []);

  const matchedTransactions = useMemo(() => {
    if (!searchResult) return [];
    return fetchedTransactions.filter(tx => 
      tx.buildingName.replace(/\s/g, '').includes(searchResult.name.replace(/\s/g, '')) ||
      searchResult.name.replace(/\s/g, '').includes(tx.buildingName.replace(/\s/g, ''))
    );
  }, [fetchedTransactions, searchResult]);

  // 세제 혜택 계산기 상태
  const [currentTax, setCurrentTax] = useState<string>('3000'); // 연간 법인세 (만원 단위)
  const [isOvercrowded, setIsOvercrowded] = useState<boolean>(true);
  const [calculatedSavings, setCalculatedSavings] = useState<{
    fourYears: number;
    sixYears: number;
    acquisitionDiscount: string;
    propertyDiscount: string;
  } | null>(null);

  // 공동 임차 매칭 보드 상태
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<{ id: string; title: string; area: string; rent: string } | null>(null);
  const [applyName, setApplyName] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [applyBizType, setApplyBizType] = useState('');
  const [applyErrors, setApplyErrors] = useState<{ name?: string; phone?: string; bizType?: string }>({});

  // 입주 컨설팅 신청 모달 상태
  const [isConsultingModalOpen, setIsConsultingModalOpen] = useState(false);
  const [consultingName, setConsultingName] = useState('');
  const [consultingPhone, setConsultingPhone] = useState('');
  const [consultingDate, setConsultingDate] = useState('');
  const [consultingBizSize, setConsultingBizSize] = useState<'under5' | '5to15' | 'above15'>('under5');
  const [consultingErrors, setConsultingErrors] = useState<{ name?: string; phone?: string; date?: string }>({});

  // 핏파인더 추천 알고리즘
  const handleFindOffice = () => {
    setIsSearching(true);
    setSearchResult(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // 매칭 점수 계산
      const scored = BUILDINGS_DB.map(building => {
        let score = building.score;
        
        // 드라이브인 매칭
        if (needDriveIn && !building.driveIn) score -= 40;
        if (!needDriveIn && building.driveIn) score -= 5; // 비제조형도 드라이브인을 일부 기피할 수 있으므로 소액 감점

        // 역 접근성 매칭
        if (stationImportance === 'high') {
          if (building.stationDistance === 'very-close') score += 15;
          if (building.stationDistance === 'moderate') score -= 20;
        }

        // 인원수 매칭 (면적 예측 기반 빌딩 규모 고려)
        if (employees === 'above15' && building.name === '동탄 IT타워') score -= 15; // 소형 위주라 대기업에 좁음
        if (employees === 'under5' && building.name === '금강펜테리움 IX타워') score += 5; // 소형 섹션도 잘 되어 있음

        return { ...building, finalScore: score };
      });

      const best = scored.sort((a, b) => b.finalScore - a.finalScore)[0];
      setSearchResult(best);
      setIsSearching(false);
      showToast('🏢 맞춤 오피스 정밀 매칭이 완료되었습니다!');
    }, 1200);
  };

  // 세제 계산기 로직
  const handleCalculateTax = () => {
    const taxNum = parseFloat(currentTax);
    if (isNaN(taxNum) || taxNum <= 0) {
      showToast('⚠️ 올바른 법인세액을 입력해 주세요.');
      return;
    }

    if (!isOvercrowded) {
      showToast('ℹ️ 서울/수도권 과밀억제권역에서 이전하는 경우에만 소득세/법인세 감면 혜택이 적용됩니다.');
    }

    // 4년간 100% 감면 + 이후 2년간 50% 감면 계산
    const yearlySavings = isOvercrowded ? taxNum : 0;
    const fourYears = yearlySavings * 4;
    const sixYears = fourYears + (yearlySavings * 0.5 * 2);

    setCalculatedSavings({
      fourYears,
      sixYears,
      acquisitionDiscount: isOvercrowded ? '취득세 75% 감면' : '취득세 50% 감면 (지방세 특례)',
      propertyDiscount: isOvercrowded ? '5년간 재산세 100% 감면, 이후 3년간 50% 감면' : '재산세 37.5% 감면 (지방세 특례)'
    });
    showToast('📊 세제 혜택 시뮬레이션 결과가 계산되었습니다.');
  };

  // 공동 임차 메이트 매칭 신청 접수
  const handleApplyMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof applyErrors = {};
    if (!applyName.trim()) {
      errors.name = '기업명 또는 대표자명을 입력해주세요.';
    }
    const phoneRegex = /^(010-\d{3,4}-\d{4}|010\d{7,8})$/;
    if (!applyPhone.trim()) {
      errors.phone = '연락처를 입력해주세요.';
    } else if (!phoneRegex.test(applyPhone)) {
      errors.phone = '올바른 휴대폰 번호 형식(010-XXXX-XXXX)으로 입력해주세요.';
    }
    if (!applyBizType.trim()) {
      errors.bizType = '업종 및 선호 면적을 입력해주세요.';
    }

    if (Object.keys(errors).length > 0) {
      setApplyErrors(errors);
      showToast('⚠️ 입력 정보를 다시 확인해주세요.');
      return;
    }

    setApplyErrors({});
    showToast('💚 공동 임차 매칭 신청이 접수되었습니다! 매이트 찾기 알림톡을 발송합니다.');
    setIsApplyModalOpen(false);
    setSelectedPost(null);
    setApplyName('');
    setApplyPhone('');
    setApplyBizType('');
  };

  // 입주 컨설팅 연계 신청 접수
  const handleConsultingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof consultingErrors = {};
    if (!consultingName.trim()) {
      errors.name = '기업명 또는 신청자명을 입력해주세요.';
    }
    const phoneRegex = /^(010-\d{3,4}-\d{4}|010\d{7,8})$/;
    if (!consultingPhone.trim()) {
      errors.phone = '연락처를 입력해주세요.';
    } else if (!phoneRegex.test(consultingPhone)) {
      errors.phone = '올바른 휴대폰 번호 형식(010-XXXX-XXXX)으로 입력해주세요.';
    }
    if (!consultingDate) {
      errors.date = '희망 입주일자를 선택해주세요.';
    }

    if (Object.keys(errors).length > 0) {
      setConsultingErrors(errors);
      showToast('⚠️ 입력 정보를 다시 확인해주세요.');
      return;
    }

    setConsultingErrors({});
    showToast('☎️ 입주 컨설팅 연계 신청이 접수되었습니다! 담당 전문가가 24시간 내 연락해 드립니다.');
    setIsConsultingModalOpen(false);
    setConsultingName('');
    setConsultingPhone('');
    setConsultingDate('');
    setConsultingBizSize('under5');
  };

  // 매칭 보드 가상 데이터
  const sharingPosts = [
    {
      id: 'share-1',
      title: '금강 IX타워 실평 20평 분할 메이트 구합니다.',
      author: '웹디자인 에이전시',
      bizType: 'IT 서비스',
      area: '전체 40평 중 20평 사용',
      rent: '보증금 500만원 / 월세 45만원',
      tags: ['회의실 공유', '인터넷 무상제공', '여유로운 주차'],
      status: '매칭 중'
    },
    {
      id: 'share-2',
      title: '실리콘앨리 소형 섹션오피스 쉐어할 1인 작가님 계신가요?',
      author: '독립 출판 크리에이터',
      bizType: '디자인/미디어',
      area: '전체 12평 중 책상 1개 구역 분할',
      rent: '보증금 100만원 / 월세 18만원',
      tags: ['조용한 환경', '커피 머신 구비', '단기 가능'],
      status: '매칭 대기'
    },
    {
      id: 'share-3',
      title: '제조형 SH타임스퀘어 반 공간 쉐어 임차 구함',
      author: '(주)하이테크 정밀',
      bizType: '정밀 제조/3D 프린팅',
      area: '전체 60평 중 적재 창고구역 25평 분할',
      rent: '보증금 800만원 / 월세 65만원',
      tags: ['드라이브인 가능', '지게차 공동 사용', '하역 수월'],
      status: '매칭 완료'
    }
  ];

  return (
    <>
      <LoungeHeader activeTab="technovalley" />
      
      <div className="flex flex-col w-full bg-transparent">
        {/* Hero Header */}
        <PageHeroHeader 
          title="D-VIEW 테크노 랩"
          subtitleStrong="화성시 동탄구 테크노밸리 연구소"
          subtitleLight="데이터 기반 동탄 테크노밸리 첨단 산업 단지 활성화 솔루션"
        />

        <div className="max-w-[2000px] mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-16">
          
          {/* 상단 통합 통계 대시보드 */}
          <TechnoValleyDashboard />

          {/* 서브 탭 Segmented Control */}
          <div className="flex items-center bg-body p-1.5 rounded-[20px] w-full max-w-[680px] border border-border/60 mx-auto mb-8 shadow-sm overflow-x-auto no-scrollbar flex-nowrap">
            {[
              { id: 'intro', label: '밸리 소개 & 현황', icon: Building },
              { id: 'fitfinder', label: '오피스 핏파인더', icon: Search },
              { id: 'board', label: '공동 임차 매칭', icon: Users },
              { id: 'calculator', label: '세제 혜택 시뮬레이션', icon: Calculator }
            ].map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => startTransition(() => setActiveSubTab(tab.id as 'intro' | 'fitfinder' | 'board' | 'calculator'))}
                  className={`shrink-0 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[14px] text-[12.5px] sm:text-[13px] font-extrabold whitespace-nowrap transition-all duration-300 active:scale-[0.98] ${
                    isActive 
                      ? 'bg-surface text-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 탭 콘텐츠 영역 */}
          <div className="w-full min-h-[580px] sm:min-h-[640px]">
            
            {/* 0. 밸리 소개 & 현황 */}
            {activeSubTab === 'intro' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* ═══ LEFT PANEL: 입주 기업 & 상권 현황 (lg:col-span-6) ═══ */}
                <div className="lg:col-span-6 flex flex-col gap-6">
                  {/* 1. 입주 기업 현황 */}
                  <div className="bg-surface border border-border/80 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-5">
                    <div>
                      <h4 className="text-[16px] font-black text-primary flex items-center gap-2">
                        <Users size={18} className="text-hs-orange" />
                        주요 입주 기업 및 R&D 생태계
                      </h4>
                      <p className="text-[12px] text-tertiary mt-1">대기업 연구센터와 글로벌 테크 기업들이 밀집한 고부가가치 클러스터입니다.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="bg-body/20 p-4 rounded-2xl border border-border/30 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#ea580c]/10 flex items-center justify-center text-[#ea580c] shrink-0">
                          <Building2 size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-extrabold text-primary">ASML 동탄 뉴캠퍼스 (예정)</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ea580c]/10 text-[#ea580c] border border-[#ea580c]/10">글로벌 반도체</span>
                          </div>
                          <p className="text-[11.5px] text-secondary mt-1.5 leading-relaxed">
                            약 2,400억 원 규모 투자. 극자외선(EUV) 및 심자외선(DUV) 트레이닝 센터와 재제조 센터 건립 추진으로 반도체 장비 전문 엔지니어 허브 구축.
                          </p>
                        </div>
                      </div>

                      <div className="bg-body/20 p-4 rounded-2xl border border-border/30 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center text-[#f97316] shrink-0">
                          <Building2 size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-extrabold text-primary">한미약품 연구센터</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/10">바이오·R&D</span>
                          </div>
                          <p className="text-[11.5px] text-secondary mt-1.5 leading-relaxed">
                            동탄 영천동 테크노밸리 내 최대 규모 신약 연구 핵심 기지. 바이오신약, 합성신약 및 제제기술 고도화 연구를 위한 고급 석박사 인력 상주.
                          </p>
                        </div>
                      </div>

                      <div className="bg-body/20 p-4 rounded-2xl border border-border/30 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-hs-orange/10 flex items-center justify-center text-hs-orange shrink-0">
                          <Building2 size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-extrabold text-primary">현대자동차 협력사 R&D 센터</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-hs-orange/10 text-hs-orange border border-hs-orange/10">미래 모빌리티</span>
                          </div>
                          <p className="text-[11.5px] text-secondary mt-1.5 leading-relaxed">
                            자율주행, 전동화 부품 설계 및 배터리 시스템 엔지니어링 파트너 기업 대거 입주. 남양연구소(화성)와의 직주근접 시너지 극대화.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. 상권 & 교통 인프라 */}
                  <div className="bg-surface border border-border/80 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-5">
                    <div>
                      <h4 className="text-[16px] font-black text-primary flex items-center gap-2">
                        <MapPin size={18} className="text-hs-orange" />
                        상권 특징 및 인프라 매핑
                      </h4>
                      <p className="text-[12px] text-tertiary mt-1">상주 직장인 약 4만 명의 두터운 소비력과 동탄역 광역 대중교통망을 보유하고 있습니다.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-body/20 p-4 rounded-2xl border border-border/30 flex flex-col justify-between min-h-[140px]">
                        <div>
                          <span className="text-[12.5px] font-bold text-primary block">영천 F&B 상권</span>
                          <span className="text-[10.5px] text-tertiary block mt-0.5">영천동 먹거리 타운</span>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[11px] text-secondary font-medium">
                            <span>집객력</span>
                            <span className="font-extrabold text-hs-orange">4.8 / 5.0</span>
                          </div>
                          <div className="w-full bg-body/30 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div className="bg-hs-orange h-full rounded-full" style={{ width: '96%' }} />
                          </div>
                        </div>
                      </div>

                      <div className="bg-body/20 p-4 rounded-2xl border border-border/30 flex flex-col justify-between min-h-[140px]">
                        <div>
                          <span className="text-[12.5px] font-bold text-primary block">실리콘앨리 스트리트몰</span>
                          <span className="text-[10.5px] text-tertiary block mt-0.5">뉴욕 테마 문화 복합몰</span>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[11px] text-secondary font-medium">
                            <span>집객력</span>
                            <span className="font-extrabold text-[#f97316]">4.2 / 5.0</span>
                          </div>
                          <div className="w-full bg-body/30 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div className="bg-[#f97316] h-full rounded-full" style={{ width: '84%' }} />
                          </div>
                        </div>
                      </div>

                      <div className="bg-body/20 p-4 rounded-2xl border border-border/30 flex flex-col justify-between min-h-[140px]">
                        <div>
                          <span className="text-[12.5px] font-bold text-primary block">교통 커넥티비티</span>
                          <span className="text-[10.5px] text-tertiary block mt-0.5">동탄역 셔틀 & 버스</span>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[11px] text-secondary font-medium">
                            <span>연계율</span>
                            <span className="font-extrabold text-hs-orange">4.5 / 5.0</span>
                          </div>
                          <div className="w-full bg-body/30 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div className="bg-hs-orange h-full rounded-full" style={{ width: '90%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══ RIGHT PANEL: 지식산업센터 단지별 세부 공실 분석 (lg:col-span-6) ═══ */}
                <div className="lg:col-span-6 bg-surface border border-border/80 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-5">
                  <div>
                    <h4 className="text-[16px] font-black text-primary flex items-center gap-2">
                      <Building size={18} className="text-hs-orange" />
                      주요 단지별 스펙 및 공실률 분석
                    </h4>
                    <p className="text-[12px] text-tertiary mt-1">동탄 영천동 테크노밸리를 대표하는 4대 지식산업센터의 세부 특성과 실시간 현황 정보입니다.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {BUILDINGS_DB.map((b, idx) => (
                      <div key={idx} className="bg-body/20 p-4 sm:p-5 rounded-2xl border border-border/30 flex flex-col gap-3.5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[14px] font-black text-primary">{b.name}</span>
                            <span className="text-[11.5px] text-tertiary block mt-0.5">{b.type}</span>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              b.driveIn 
                                ? 'bg-orange-500/10 text-[#dc6e2d] dark:bg-orange-950/20' 
                                : 'bg-orange-100 text-secondary border border-border/30'
                            }`}>
                              {b.driveIn ? '드라이브인 물류 가능' : '섹션오피스 전용'}
                            </span>
                            <span className="text-[12px] font-bold text-hs-orange mt-1.5">임대 시세: {b.rentPerPy}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {b.features.slice(0, 3).map((f, fIdx) => (
                            <span key={fIdx} className="text-[10.5px] font-bold px-2 py-0.5 bg-body/40 rounded-lg text-secondary border border-border/10">
                              {f}
                            </span>
                          ))}
                        </div>

                        {/* KICOX Public API Spec Data */}
                        {centerSpecs[b.name] && (
                          <div className="bg-body/30 p-3 rounded-xl border border-border/20 grid grid-cols-2 gap-y-2 gap-x-4 text-[10.5px]">
                            <div>
                              <span className="text-tertiary block text-[9.5px]">용지면적</span>
                              <span className="font-bold text-secondary">{centerSpecs[b.name].landArea}</span>
                            </div>
                            <div>
                              <span className="text-tertiary block text-[9.5px]">연면적</span>
                              <span className="font-bold text-secondary">{centerSpecs[b.name].totalFloorArea}</span>
                            </div>
                            <div>
                              <span className="text-tertiary block text-[9.5px]">설치 주체</span>
                              <span className="font-bold text-secondary truncate block" title={centerSpecs[b.name].developer}>
                                {centerSpecs[b.name].developer}
                              </span>
                            </div>
                            <div>
                              <span className="text-tertiary block text-[9.5px]">건축 상태</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                {centerSpecs[b.name].status}
                              </span>
                            </div>
                            <div className="col-span-2 pt-1.5 border-t border-border/10 text-[9.5px] text-tertiary truncate">
                              📍 {centerSpecs[b.name].address}
                            </div>
                            {centerSpecs[b.name].tenants && centerSpecs[b.name].tenants.length > 0 && (
                              <div className="col-span-2 pt-1.5 border-t border-border/10">
                                <span className="text-[9.5px] text-tertiary font-extrabold block mb-1">🏢 주요 입주 등록 기업 ({centerSpecs[b.name].tenants.length}개사)</span>
                                <div className="flex flex-wrap gap-1">
                                  {centerSpecs[b.name].tenants.slice(0, 4).map((tenant: string, tIdx: number) => (
                                    <span key={tIdx} className="text-[9px] px-1.5 py-0.5 bg-orange-500/5 text-[#dc6e2d] border border-[#dc6e2d]/10 rounded font-semibold truncate max-w-[120px]" title={tenant}>
                                      {tenant}
                                    </span>
                                  ))}
                                  {centerSpecs[b.name].tenants.length > 4 && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded font-bold shrink-0">
                                      +{centerSpecs[b.name].tenants.length - 4}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-3 border-t border-border/30 flex items-center justify-between text-[11px] text-tertiary">
                          <span className="truncate max-w-[280px]">{b.desc}</span>
                          <span className="font-black text-secondary flex items-center gap-0.5">
                            적합도 점수 <strong className="text-primary text-[12px] font-extrabold">{b.score}점</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 1. 오피스 핏파인더 */}
            {activeSubTab === 'fitfinder' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 조건 설정 영역 */}
                <div className="lg:col-span-5 bg-surface border border-border/60 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-6">
                  <div>
                    <h3 className="text-[17px] font-black text-primary flex items-center gap-2">
                      <Sparkles size={18} className="text-[#c44d00] dark:text-[#ea6100]" />
                      사무실 조건 매칭 조건 입력
                    </h3>
                    <p className="text-[12.5px] text-secondary mt-1">기업에 꼭 필요한 기본 요건을 체크해 주세요.</p>
                  </div>

                  {/* 1. 희망 가용 예산 */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12.5px] font-bold text-secondary">월 가용 예산 (임대료 기준)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'under100', label: '100만원 미만' },
                        { id: '100to200', label: '100 ~ 200만' },
                        { id: 'above200', label: '200만원 초과' }
                      ] as const).map(item => (
                        <button
                          key={item.id}
                          onClick={() => setBudget(item.id)}
                          className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                            budget === item.id 
                              ? 'bg-[#c44d00]/10 border-[#c44d00] text-[#c44d00] dark:bg-[#ea6100]/10 dark:border-[#ea6100] dark:text-[#ea6100]' 
                              : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. 상주 근무 인원 */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12.5px] font-bold text-secondary">상주 근무 인원수 (규모)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'under5', label: '5인 미만 소형' },
                        { id: '5to15', label: '5인 ~ 15인 중형' },
                        { id: 'above15', label: '15인 이상 대형' }
                      ] as const).map(item => (
                        <button
                          key={item.id}
                          onClick={() => setEmployees(item.id)}
                          className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                            employees === item.id 
                              ? 'bg-[#c44d00]/10 border-[#c44d00] text-[#c44d00] dark:bg-[#ea6100]/10 dark:border-[#ea6100] dark:text-[#ea6100]' 
                              : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. 드라이브인 (하역/물류 특화) 여부 */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12.5px] font-bold text-secondary">제조/물류 동선 (드라이브인 필요성)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNeedDriveIn(true)}
                        className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                          needDriveIn === true 
                            ? 'bg-[#c44d00]/10 border-[#c44d00] text-[#c44d00] dark:bg-[#ea6100]/10 dark:border-[#ea6100] dark:text-[#ea6100]' 
                            : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                        }`}
                      >
                        필요함 (물류/하역 특화)
                      </button>
                      <button
                        onClick={() => setNeedDriveIn(false)}
                        className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                          needDriveIn === false 
                            ? 'bg-[#c44d00]/10 border-[#c44d00] text-[#c44d00] dark:bg-[#ea6100]/10 dark:border-[#ea6100] dark:text-[#ea6100]' 
                            : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                        }`}
                      >
                        상관없음 (사무 전용)
                      </button>
                    </div>
                  </div>

                  {/* 4. 동탄역 도보 접근성 중시 */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12.5px] font-bold text-secondary">대중교통 / 동탄역 접근성 선호도</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStationImportance('high')}
                        className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                          stationImportance === 'high' 
                            ? 'bg-[#c44d00]/10 border-[#c44d00] text-[#c44d00] dark:bg-[#ea6100]/10 dark:border-[#ea6100] dark:text-[#ea6100]' 
                            : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                        }`}
                      >
                        역세권 최우선 고려
                      </button>
                      <button
                        onClick={() => setStationImportance('low')}
                        className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                          stationImportance === 'low' 
                            ? 'bg-[#c44d00]/10 border-[#c44d00] text-[#c44d00] dark:bg-[#ea6100]/10 dark:border-[#ea6100] dark:text-[#ea6100]' 
                            : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                        }`}
                      >
                        외곽이어도 임대료 중시
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleFindOffice}
                    disabled={isSearching}
                    className="w-full mt-4 py-4 bg-[#c44d00] dark:bg-[#ea6100] text-white dark:text-black font-extrabold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-[14.5px] disabled:opacity-50 cursor-pointer active:scale-[0.99] shadow-md shadow-emerald-500/5"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>AI 정밀 필터 매칭 계산 중...</span>
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        <span>맞춤 지식산업센터 찾기</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 결과 시각화 영역 */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {isSearching ? (
                    <div className="bg-surface border border-border/60 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-6 animate-pulse min-h-[580px] justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="w-full">
                          <div className="h-4 bg-body/20 dark:bg-surface/5 rounded w-32 mb-2" />
                          <div className="h-6 bg-body/20 dark:bg-surface/5 rounded w-48 mt-2" />
                          <div className="h-3 bg-body/20 dark:bg-surface/5 rounded w-24 mt-2" />
                        </div>
                      </div>
                      
                      <div className="w-full h-44 bg-body/20 dark:bg-surface/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin text-tertiary" size={24} />
                        <span className="text-[12px] font-bold text-tertiary">AI 가치평가 및 공실률 분석 중...</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="h-4 bg-body/20 dark:bg-surface/5 rounded w-28 mb-2" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-12 bg-body/20 dark:bg-surface/5 rounded-xl" />
                          ))}
                        </div>
                      </div>

                      <div className="h-16 bg-body/20 dark:bg-surface/5 rounded-xl w-full" />
                      <div className="h-12 bg-body/20 dark:bg-surface/5 rounded-xl w-full" />
                    </div>
                  ) : searchResult ? (
                    <div className="bg-surface border border-border/60 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-[#c44d00]/10 text-[#c44d00] dark:bg-[#ea6100]/10 dark:text-[#ea6100] border border-[#c44d00]/15">
                            AI 최적 추천 매칭률 98%
                          </span>
                          <h4 className="text-[20px] font-black text-primary mt-2">{searchResult.name}</h4>
                          <p className="text-[12px] text-tertiary mt-0.5">{searchResult.type}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[13px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                          <Trophy size={16} />
                          <span>추천 지표 1위</span>
                        </div>
                      </div>

                      {/* 빌딩 대표 컨셉 영역 */}
                      <div className={`w-full h-44 rounded-2xl ${searchResult.imgPlaceholder} flex flex-col items-center justify-center gap-2 p-6 text-center border border-border/20`}>
                        <Building size={48} className="opacity-80" />
                        <span className="text-[14px] font-extrabold tracking-tight">{searchResult.name} 스펙 시트</span>
                        <span className="text-[11px] font-medium opacity-70">평당 임대 시세: {searchResult.rentPerPy}</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[12.5px] font-bold text-secondary">빌딩 주요 특징</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {searchResult.features.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-body/20 p-3 rounded-xl border border-border/30">
                              <CheckCircle2 size={15} className="text-[#c44d00] dark:text-[#ea6100] shrink-0 mt-0.5" />
                              <span className="text-[12px] font-medium text-secondary leading-snug">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-body/30 p-4 rounded-xl border border-border/30 flex items-start gap-3">
                        <AlertCircle size={17} className="text-secondary shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[12px] font-bold text-primary block">분석 소견</span>
                          <span className="text-[11.5px] text-secondary font-medium mt-1 block leading-relaxed">{searchResult.desc}</span>
                        </div>
                      </div>

                      {/* 실거래가 연동 테이블 */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[12.5px] font-bold text-secondary flex items-center gap-1.5">
                          <Coins size={16} className="text-[#c44d00] dark:text-[#ea6100]" />
                          해당 지식산업센터 최근 실거래 정보 (국토교통부 연동)
                        </span>
                        <div className="overflow-x-auto border border-border/40 rounded-2xl bg-body/10">
                          {isLoadingTx ? (
                            <div className="p-4 space-y-3.5 animate-pulse">
                              <div className="flex justify-between items-center">
                                <div className="h-4 bg-body/30 rounded w-1/4"></div>
                                <div className="h-4 bg-body/30 rounded w-1/6"></div>
                              </div>
                              <div className="space-y-2.5">
                                <div className="h-3 bg-body/20 rounded w-full"></div>
                                <div className="h-3 bg-body/20 rounded w-11/12"></div>
                                <div className="h-3 bg-body/20 rounded w-10/12"></div>
                              </div>
                            </div>
                          ) : (
                            <table className="w-full text-left border-collapse text-[11.5px]">
                              <thead>
                                <tr className="bg-body/30 border-b border-border/30 text-tertiary">
                                  <th className="p-3 font-bold">계약일</th>
                                  <th className="p-3 font-bold">구분</th>
                                  <th className="p-3 font-bold">전용면적</th>
                                  <th className="p-3 font-bold text-center">층</th>
                                  <th className="p-3 font-bold text-right">거래 금액</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(matchedTransactions.length > 0 ? matchedTransactions : searchResult.recentTransactions).map((tx, idx) => {
                                  const sizeInPy = Math.round(tx.sizeSqM / 3.3057 * 10) / 10;
                                  return (
                                    <tr key={idx} className="border-b border-border/20 last:border-0 hover:bg-body/25 transition-colors">
                                      <td className="p-3 text-secondary font-medium">{tx.date}</td>
                                      <td className="p-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                          tx.type === '매매' 
                                            ? 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20' 
                                            : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                                        }`}>
                                          {tx.type}
                                        </span>
                                      </td>
                                      <td className="p-3 text-secondary font-medium">{tx.sizeSqM}㎡ ({sizeInPy}평)</td>
                                      <td className="p-3 text-secondary font-medium text-center">{tx.floor}F</td>
                                      <td className="p-3 text-primary font-bold text-right">{tx.price}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => setIsConsultingModalOpen(true)}
                          className="flex-1 py-3.5 bg-secondary text-primary-inverse text-[13.5px] font-extrabold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                        >
                          <span>공실 매물 및 무료 임대 투어 신청</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface/50 border border-dashed border-border/60 p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-4 h-full min-h-[380px]">
                      <div className="w-14 h-14 rounded-2xl bg-body/20 flex items-center justify-center text-tertiary">
                        <Building size={28} />
                      </div>
                      <div>
                        <h4 className="text-[15.5px] font-extrabold text-primary">지식산업센터 조건 매칭 대기 중</h4>
                        <p className="text-[12.5px] text-tertiary mt-1.5 max-w-[340px] leading-relaxed">
                          좌측 조건 필터링에서 예산, 인원, 물류 요건을 설정하고 맞춤 찾기 버튼을 누르면 인공지능이 최적의 지산 건물을 큐레이션합니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* 2. 공동 임차 매칭 보드 */}
            {activeSubTab === 'board' && (
              <div className="flex flex-col gap-6">
                
                {/* 보드 소개 및 공동임차 신청 버튼 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-border/60 p-6 rounded-3xl shadow-sm">
                  <div>
                    <h4 className="text-[16px] font-black text-primary">스타트업 & 1인 기업 공동 임차 매칭 보드</h4>
                    <p className="text-[12.5px] text-secondary mt-1 max-w-[620px] leading-relaxed">
                      넓은 지식산업센터 공간을 분할하여 임차 비용을 절반으로 낮추어 보세요. D-VIEW가 임차 조건이 맞는 이웃 기업들을 엮어드립니다.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPost(null);
                      setIsApplyModalOpen(true);
                    }}
                    className="px-5 py-3 bg-[#c44d00] dark:bg-[#ea6100] text-white dark:text-black text-[13px] font-extrabold rounded-2xl hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98] shrink-0"
                  >
                    <Users size={15} />
                    <span>공동 임차 등록하기</span>
                  </button>
                </div>

                {/* 매칭 카드 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {sharingPosts.map(post => (
                    <div 
                      key={post.id}
                      className="bg-surface/85 border border-border/50 rounded-3xl p-5 flex flex-col justify-between min-h-[260px] hover:shadow-[0_12px_24px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 relative group overflow-hidden shadow-sm"
                    >
                      <div>
                        {/* 상태 배지 */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            post.status === '매칭 완료' 
                              ? 'bg-gray-100 text-gray-500 dark:bg-zinc-800' 
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-[#ea6100]'
                          }`}>
                            {post.status}
                          </span>
                          <span className="text-[11px] text-tertiary font-medium">{post.bizType}</span>
                        </div>

                        <h5 className="text-[14px] sm:text-[15px] font-black text-primary mt-3 group-hover:text-[#c44d00] dark:group-hover:text-[#ea6100] transition-colors leading-snug tracking-tight">
                          {post.title}
                        </h5>

                        <div className="flex flex-col gap-1.5 mt-4 text-[12px] text-secondary font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-tertiary">임차:</span>
                            <span className="font-bold">{post.area}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-tertiary">시세:</span>
                            <span className="font-extrabold text-[#c44d00] dark:text-[#ea6100]">{post.rent}</span>
                          </div>
                        </div>

                        {/* 태그 리스트 */}
                        <div className="flex flex-wrap gap-1 mt-4">
                          {post.tags.map((tag, idx) => (
                            <span key={idx} className="text-[9.5px] font-extrabold px-1.5 py-0.5 bg-body/20 rounded-md text-secondary border border-border/20">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-border/40 pt-4 mt-5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-tertiary font-bold">{post.author}</span>
                        {post.status !== '매칭 완료' && (
                          <button
                            onClick={() => {
                              setSelectedPost(post);
                              setIsApplyModalOpen(true);
                            }}
                            className="text-[11px] font-extrabold text-[#c44d00] dark:text-[#ea6100] hover:underline flex items-center gap-0.5"
                          >
                            <span>매칭 제안</span>
                            <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* 3. 세제 혜택 계산기 */}
            {activeSubTab === 'calculator' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 입력 제어 카드 */}
                <div className="lg:col-span-5 bg-surface border border-border/60 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-6">
                  <div>
                    <h3 className="text-[17px] font-black text-primary flex items-center gap-2">
                      <Calculator size={18} className="text-[#c44d00] dark:text-[#ea6100]" />
                      법인 세제 혜택 시뮬레이션
                    </h3>
                    <p className="text-[12.5px] text-secondary mt-1">기업의 현재 법인세 정보를 바탕으로 혜택을 예측합니다.</p>
                  </div>

                  {/* 1. 현재 납부 법인세 */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12.5px] font-bold text-secondary flex items-center justify-between">
                      <span>연간 법인세 (또는 소득세) 납부액</span>
                      <span className="text-[11px] text-tertiary">단위: 만원</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={currentTax}
                        onChange={(e) => setCurrentTax(e.target.value)}
                        placeholder="예: 3000"
                        className="w-full bg-body/30 border border-border/40 focus:border-[#c44d00] dark:focus:border-[#ea6100] rounded-2xl py-3 px-4 text-[14px] font-extrabold outline-none text-primary"
                      />
                      <span className="absolute right-4 text-[12.5px] font-extrabold text-secondary">만원</span>
                    </div>
                  </div>

                  {/* 2. 과밀억제권역 여부 */}
                  <div className="flex flex-col gap-2 bg-body/20 p-4 rounded-2xl border border-border/30">
                    <label className="text-[12.5px] font-bold text-secondary flex items-center justify-between">
                      <span>현재 본점 소재지 권역</span>
                    </label>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-primary">수도권 과밀억제권역 입지</span>
                        <span className="text-[10px] text-tertiary mt-0.5">서울, 인천, 수원, 성남, 부천 등</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isOvercrowded}
                        onChange={(e) => setIsOvercrowded(e.target.checked)}
                        className="w-5 h-5 accent-[#c44d00] dark:accent-[#ea6100] cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCalculateTax}
                    className="w-full mt-2 py-4 bg-[#c44d00] dark:bg-[#ea6100] text-white dark:text-black font-extrabold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-[14.5px] cursor-pointer active:scale-[0.99] shadow-md shadow-emerald-500/5"
                  >
                    <Calculator size={18} />
                    <span>혜택 예측 결과 산출</span>
                  </button>
                </div>

                {/* 결과 분석 카드 */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {calculatedSavings ? (
                    <div className="bg-surface border border-border/60 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#c44d00]/10 text-[#c44d00] dark:bg-[#ea6100]/10 dark:text-[#ea6100] border border-[#c44d00]/15">
                          예상 절세 시뮬레이션 리포트
                        </span>
                        <h4 className="text-[19px] font-black text-primary mt-2">동탄 영천동 테크노밸리 이전 시 예상 세무 혜택</h4>
                        <p className="text-[12.5px] text-secondary mt-1">조세특례제한법 및 화성시 시조례 감면 가이드라인을 준용했습니다.</p>
                      </div>

                      {/* 100% 감면 수치 가시화 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-body/20 p-5 rounded-2xl border border-border/30">
                          <p className="text-[11px] text-tertiary font-bold">초기 4개년 누적 절세액 (100% 감면)</p>
                          <p className="text-[22px] font-black text-[#c44d00] dark:text-[#ea6100] mt-1">
                            {(calculatedSavings.fourYears).toLocaleString()} <span className="text-[14px] font-bold">만원</span>
                          </p>
                          <p className="text-[9.5px] text-tertiary mt-1">매년 법인세 전액 면제 (4년간)</p>
                        </div>
                        <div className="bg-body/20 p-5 rounded-2xl border border-border/30">
                          <p className="text-[11px] text-tertiary font-bold">총 6개년 누적 절세액 (+50% 감면 2년)</p>
                          <p className="text-[22px] font-black text-indigo-600 dark:text-indigo-400 mt-1">
                            {(calculatedSavings.sixYears).toLocaleString()} <span className="text-[14px] font-bold">만원</span>
                          </p>
                          <p className="text-[9.5px] text-tertiary mt-1">이후 2년간 법인세 50% 추가 감면</p>
                        </div>
                      </div>

                      {/* 지방세 감면 규정 목록 */}
                      <div className="flex flex-col gap-3 border-t border-border/40 pt-4 mt-2">
                        <h5 className="text-[12.5px] font-bold text-primary">추가 취득세 & 재산세 혜택</h5>
                        
                        <div className="flex items-start gap-2 bg-body/20 p-3.5 rounded-xl border border-border/30">
                          <CheckCircle2 size={15} className="text-[#c44d00] dark:text-[#ea6100] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[12px] font-bold text-secondary">본점 부동산 취득세 감면</span>
                            <span className="text-[11.5px] text-tertiary block mt-0.5 leading-relaxed">{calculatedSavings.acquisitionDiscount}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 bg-body/20 p-3.5 rounded-xl border border-border/30">
                          <CheckCircle2 size={15} className="text-[#c44d00] dark:text-[#ea6100] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[12px] font-bold text-secondary">지방세법 규정 재산세 감면</span>
                            <span className="text-[11.5px] text-tertiary block mt-0.5 leading-relaxed">{calculatedSavings.propertyDiscount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 flex items-start gap-3 mt-1">
                        <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-secondary font-medium leading-relaxed">
                          * 과밀억제권역에서 본점을 이전하는 날 기준, 직전 소득세 과세연도에 계속 가동 중이었던 법인 요건을 충족해야 세액감면 혜택을 100% 적용받을 수 있습니다. 정확한 법인세 세무처리는 주계약 세무사와의 세세한 실무 검토가 필요합니다.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface/50 border border-dashed border-border/60 p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-4 h-full min-h-[380px]">
                      <div className="w-14 h-14 rounded-2xl bg-body/20 flex items-center justify-center text-tertiary">
                        <Calculator size={28} />
                      </div>
                      <div>
                        <h4 className="text-[15.5px] font-extrabold text-primary">시뮬레이션 정보 대기 중</h4>
                        <p className="text-[12.5px] text-tertiary mt-1.5 max-w-[340px] leading-relaxed">
                          좌측 조건 필터에 기존 세액과 소재지 정보를 입력하고 산출 버튼을 누르면, D-VIEW 이전 혜택 분석기에 따라 절세 시나리오가 렌더링됩니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* 공동 임차 메칭 신청 모달 */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-[20000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/80 w-full max-w-[480px] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <h3 className="text-[16px] font-black text-primary">
                {selectedPost ? '공동 임차 메이트 신청' : '공동 임차 모집 등록'}
              </h3>
              <button
                onClick={() => {
                  setIsApplyModalOpen(false);
                  setSelectedPost(null);
                  setApplyErrors({});
                }}
                className="p-1 rounded-lg hover:bg-body/30 text-secondary transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleApplyMatch} noValidate className="p-5 flex flex-col gap-2">
              {selectedPost && (
                <div className="bg-body/20 p-3.5 rounded-xl border border-border/30 text-[12px] text-secondary font-medium mb-2">
                  <p className="font-bold text-primary">{selectedPost.title}</p>
                  <p className="text-tertiary mt-1">제안 조건: {selectedPost.rent} / {selectedPost.area}</p>
                </div>
              )}

              {/* 기업명 */}
              <div className="flex flex-col gap-1.5 relative pb-6">
                <label className="text-[12px] font-bold text-secondary">기업명 (또는 대표자 성함)</label>
                <input
                  type="text"
                  placeholder="예: D-VIEW 솔루션"
                  value={applyName}
                  onChange={(e) => {
                    setApplyName(e.target.value);
                    if (applyErrors.name) setApplyErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  className={`w-full bg-body/30 border ${
                    applyErrors.name 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-border/40 focus:border-[#c44d00] dark:focus:border-[#ea6100]'
                  } rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold transition-all`}
                />
                {applyErrors.name && (
                  <div className="absolute left-0 bottom-0 text-[11px] font-extrabold text-rose-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} />
                    <span>{applyErrors.name}</span>
                  </div>
                )}
              </div>

              {/* 연락처 */}
              <div className="flex flex-col gap-1.5 relative pb-6">
                <label className="text-[12px] font-bold text-secondary">휴대폰 번호 (연락처)</label>
                <input
                  type="tel"
                  placeholder="예: 010-1234-5678"
                  value={applyPhone}
                  onChange={(e) => {
                    setApplyPhone(e.target.value);
                    if (applyErrors.phone) setApplyErrors(prev => ({ ...prev, phone: undefined }));
                  }}
                  className={`w-full bg-body/30 border ${
                    applyErrors.phone 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-border/40 focus:border-[#c44d00] dark:focus:border-[#ea6100]'
                  } rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold transition-all`}
                />
                {applyErrors.phone && (
                  <div className="absolute left-0 bottom-0 text-[11px] font-extrabold text-rose-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} />
                    <span>{applyErrors.phone}</span>
                  </div>
                )}
              </div>

              {/* 업종 */}
              <div className="flex flex-col gap-1.5 relative pb-6">
                <label className="text-[12px] font-bold text-secondary">업종 및 선호 면적</label>
                <input
                  type="text"
                  placeholder="예: IT 벤처 / 10평 내외 선호"
                  value={applyBizType}
                  onChange={(e) => {
                    setApplyBizType(e.target.value);
                    if (applyErrors.bizType) setApplyErrors(prev => ({ ...prev, bizType: undefined }));
                  }}
                  className={`w-full bg-body/30 border ${
                    applyErrors.bizType 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-border/40 focus:border-[#c44d00] dark:focus:border-[#ea6100]'
                  } rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold transition-all`}
                />
                {applyErrors.bizType && (
                  <div className="absolute left-0 bottom-0 text-[11px] font-extrabold text-rose-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} />
                    <span>{applyErrors.bizType}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-[#c44d00] dark:bg-[#ea6100] text-white dark:text-black font-extrabold rounded-xl hover:opacity-90 transition-all text-[13.5px] cursor-pointer active:scale-[0.98]"
              >
                {selectedPost ? '매이트 매칭 신청 제안' : '공동 임차 모집글 게시'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 입주 컨설팅 신청 모달 */}
      {isConsultingModalOpen && (
        <div className="fixed inset-0 z-[20000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/80 w-full max-w-[480px] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <h3 className="text-[16px] font-black text-primary">
                입주 컨설팅 & 무료 임대 투어 신청
              </h3>
              <button
                onClick={() => {
                  setIsConsultingModalOpen(false);
                  setConsultingErrors({});
                }}
                className="p-1 rounded-lg hover:bg-body/30 text-secondary transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleConsultingSubmit} noValidate className="p-5 flex flex-col gap-2">
              <div className="bg-[#c44d00]/5 dark:bg-[#ea6100]/5 p-3.5 rounded-2xl border border-[#c44d00]/10 dark:border-[#ea6100]/10 text-[12px] text-secondary font-medium mb-2">
                <p className="font-extrabold text-[#c44d00] dark:text-[#ea6100] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>AI 매칭 추천 빌딩: {searchResult?.name}</span>
                </p>
                <p className="text-tertiary mt-1 leading-normal">
                  선택하신 예산 및 물류 동선 조건에 최적화된 호실과 시세 맞춤 혜택을 24시간 내 제공해 드립니다.
                </p>
              </div>

              {/* 기업명 */}
              <div className="flex flex-col gap-1.5 relative pb-6">
                <label className="text-[12px] font-bold text-secondary">기업명 (또는 신청자 성함)</label>
                <input
                  type="text"
                  placeholder="예: D-VIEW 솔루션"
                  value={consultingName}
                  onChange={(e) => {
                    setConsultingName(e.target.value);
                    if (consultingErrors.name) setConsultingErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  className={`w-full bg-body/30 border ${
                    consultingErrors.name 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-border/40 focus:border-[#c44d00] dark:focus:border-[#ea6100]'
                  } rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold transition-all`}
                />
                {consultingErrors.name && (
                  <div className="absolute left-0 bottom-0 text-[11px] font-extrabold text-rose-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} />
                    <span>{consultingErrors.name}</span>
                  </div>
                )}
              </div>

              {/* 연락처 */}
              <div className="flex flex-col gap-1.5 relative pb-6">
                <label className="text-[12px] font-bold text-secondary">휴대폰 번호 (연락처)</label>
                <input
                  type="tel"
                  placeholder="예: 010-1234-5678"
                  value={consultingPhone}
                  onChange={(e) => {
                    setConsultingPhone(e.target.value);
                    if (consultingErrors.phone) setConsultingErrors(prev => ({ ...prev, phone: undefined }));
                  }}
                  className={`w-full bg-body/30 border ${
                    consultingErrors.phone 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-border/40 focus:border-[#c44d00] dark:focus:border-[#ea6100]'
                  } rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold transition-all`}
                />
                {consultingErrors.phone && (
                  <div className="absolute left-0 bottom-0 text-[11px] font-extrabold text-rose-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} />
                    <span>{consultingErrors.phone}</span>
                  </div>
                )}
              </div>

              {/* 희망 입주일자 */}
              <div className="flex flex-col gap-1.5 relative pb-6">
                <label className="text-[12px] font-bold text-secondary">희망 입주일자</label>
                <input
                  type="date"
                  value={consultingDate}
                  onChange={(e) => {
                    setConsultingDate(e.target.value);
                    if (consultingErrors.date) setConsultingErrors(prev => ({ ...prev, date: undefined }));
                  }}
                  className={`w-full bg-body/30 border ${
                    consultingErrors.date 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-border/40 focus:border-[#c44d00] dark:focus:border-[#ea6100]'
                  } rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold transition-all`}
                />
                {consultingErrors.date && (
                  <div className="absolute left-0 bottom-0 text-[11px] font-extrabold text-rose-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} />
                    <span>{consultingErrors.date}</span>
                  </div>
                )}
              </div>

              {/* 입주 규모 선택 */}
              <div className="flex flex-col gap-1.5 mb-2">
                <label className="text-[12px] font-bold text-secondary">예상 상주 인원</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'under5', label: '5인 미만' },
                    { id: '5to15', label: '5 ~ 15인' },
                    { id: 'above15', label: '15인 이상' }
                  ] as const).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setConsultingBizSize(item.id)}
                      className={`py-2 rounded-xl text-[12px] font-extrabold transition-all border ${
                        consultingBizSize === item.id 
                          ? 'bg-[#c44d00]/10 border-[#c44d00] text-[#c44d00] dark:bg-[#ea6100]/10 dark:border-[#ea6100] dark:text-[#ea6100]' 
                          : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-[#c44d00] dark:bg-[#ea6100] text-white dark:text-black font-extrabold rounded-xl hover:opacity-90 transition-all text-[13.5px] cursor-pointer shadow-sm active:scale-[0.98]"
              >
                상담 및 투어 일정 신청 완료
              </button>
            </form>
          </div>
        </div>
      )}

      <MobileDock activeTab="technovalley" />
    </>
  );
}

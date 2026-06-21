'use client';

import React, { useState, useTransition, useMemo } from 'react';
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
    score: 95
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
    score: 92
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
    score: 89
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
    score: 87
  }
];

export default function TechnoValleyClient() {
  const { showToast } = usePWA();
  const [activeSubTab, setActiveSubTab] = useState<'fitfinder' | 'board' | 'calculator'>('fitfinder');
  const [isPending, startTransition] = useTransition();

  // 핏파인더 상태
  const [budget, setBudget] = useState<'under100' | '100to200' | 'above200'>('100to200');
  const [employees, setEmployees] = useState<'under5' | '5to15' | 'above15'>('5to15');
  const [needDriveIn, setNeedDriveIn] = useState<boolean>(false);
  const [stationImportance, setStationImportance] = useState<'low' | 'high'>('high');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<OfficeBuilding | null>(null);

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

  // 핏파인더 추천 알고리즘
  const handleFindOffice = () => {
    setIsSearching(true);
    setSearchResult(null);

    setTimeout(() => {
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
    if (!applyName || !applyPhone || !applyBizType) {
      showToast('⚠️ 모든 정보를 입력해 주세요.');
      return;
    }
    showToast('💚 공동 임차 매칭 신청이 접수되었습니다! 매이트 찾기 알림톡을 발송합니다.');
    setIsApplyModalOpen(false);
    setSelectedPost(null);
    setApplyName('');
    setApplyPhone('');
    setApplyBizType('');
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
          title="D-VIEW 테크노밸리"
          subtitleStrong="지식산업센터 공실 매칭 & 혜택 센터"
          subtitleLight="수도권 최대 규모 산업 클러스터 활성화를 위한 솔루션"
        />

        <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 pt-6 pb-16">
          
          {/* 상단 통합 통계 위젯 */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-surface/75 border border-border/40 backdrop-blur-md p-5 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-[#008262] dark:text-[#00d29d] shrink-0">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-[12px] text-tertiary font-bold">테크노밸리 전체 면적</p>
                <p className="text-[18px] font-black text-primary mt-0.5">약 1,550,000 ㎡</p>
                <p className="text-[10.5px] text-[#008262] dark:text-[#00d29d] font-bold mt-0.5">판교테크노밸리의 2.3배</p>
              </div>
            </div>
            <div className="bg-surface/75 border border-border/40 backdrop-blur-md p-5 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[12px] text-tertiary font-bold">상주 기업 및 임직원</p>
                <p className="text-[18px] font-black text-primary mt-0.5">4,500+ 개사 / 6.7만명</p>
                <p className="text-[10.5px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">지속적인 유관 기업 입주 유입</p>
              </div>
            </div>
            <div className="bg-surface/75 border border-border/40 backdrop-blur-md p-5 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
                <TrendingDown size={24} />
              </div>
              <div>
                <p className="text-[12px] text-tertiary font-bold">임대 공급 과잉 공실률</p>
                <p className="text-[18px] font-black text-primary mt-0.5">평균 약 18.2 %</p>
                <p className="text-[10.5px] text-rose-500 dark:text-rose-400 font-bold mt-0.5">소호 쉐어 & 혜택 매칭으로 대안 제시</p>
              </div>
            </div>
          </section>

          {/* 서브 탭 Segmented Control */}
          <div className="flex bg-body/80 p-1.5 rounded-[20px] w-full max-w-[540px] border border-border/40 mx-auto mb-8 shadow-sm backdrop-blur-md">
            {[
              { id: 'fitfinder', label: '오피스 핏파인더', icon: Search },
              { id: 'board', label: '공동 임차 매칭', icon: Users },
              { id: 'calculator', label: '세제 혜택 시뮬레이션', icon: Calculator }
            ].map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => startTransition(() => setActiveSubTab(tab.id as 'fitfinder' | 'board' | 'calculator'))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] text-[13px] font-extrabold transition-all duration-300 active:scale-[0.98] ${
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
            
            {/* 1. 오피스 핏파인더 */}
            {activeSubTab === 'fitfinder' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 조건 설정 영역 */}
                <div className="lg:col-span-5 bg-surface/70 border border-border/50 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-6">
                  <div>
                    <h3 className="text-[17px] font-black text-primary flex items-center gap-2">
                      <Sparkles size={18} className="text-[#008262] dark:text-[#00d29d]" />
                      사무실 조건 매칭 조건 입력
                    </h3>
                    <p className="text-[12.5px] text-secondary mt-1">기업에 꼭 필요한 기본 요건을 체크해 주세요.</p>
                  </div>

                  {/* 1. 희망 가용 예산 */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12.5px] font-bold text-secondary">월 가용 예산 (임대료 기준)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'under100', label: '100만원 미만' },
                        { id: '100to200', label: '100 ~ 200만' },
                        { id: 'above200', label: '200만원 초과' }
                      ].map(item => (
                        <button
                          key={item.id}
                          onClick={() => setBudget(item.id as any)}
                          className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                            budget === item.id 
                              ? 'bg-[#008262]/10 border-[#008262] text-[#008262] dark:bg-[#00d29d]/10 dark:border-[#00d29d] dark:text-[#00d29d]' 
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
                      {[
                        { id: 'under5', label: '5인 미만 소형' },
                        { id: '5to15', label: '5인 ~ 15인 중형' },
                        { id: 'above15', label: '15인 이상 대형' }
                      ].map(item => (
                        <button
                          key={item.id}
                          onClick={() => setEmployees(item.id as any)}
                          className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                            employees === item.id 
                              ? 'bg-[#008262]/10 border-[#008262] text-[#008262] dark:bg-[#00d29d]/10 dark:border-[#00d29d] dark:text-[#00d29d]' 
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
                            ? 'bg-[#008262]/10 border-[#008262] text-[#008262] dark:bg-[#00d29d]/10 dark:border-[#00d29d] dark:text-[#00d29d]' 
                            : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                        }`}
                      >
                        필요함 (물류/하역 특화)
                      </button>
                      <button
                        onClick={() => setNeedDriveIn(false)}
                        className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                          needDriveIn === false 
                            ? 'bg-[#008262]/10 border-[#008262] text-[#008262] dark:bg-[#00d29d]/10 dark:border-[#00d29d] dark:text-[#00d29d]' 
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
                            ? 'bg-[#008262]/10 border-[#008262] text-[#008262] dark:bg-[#00d29d]/10 dark:border-[#00d29d] dark:text-[#00d29d]' 
                            : 'bg-body/20 border-border/40 text-secondary hover:bg-body/40'
                        }`}
                      >
                        역세권 최우선 고려
                      </button>
                      <button
                        onClick={() => setStationImportance('low')}
                        className={`py-2.5 rounded-xl text-[12.5px] font-extrabold transition-all border ${
                          stationImportance === 'low' 
                            ? 'bg-[#008262]/10 border-[#008262] text-[#008262] dark:bg-[#00d29d]/10 dark:border-[#00d29d] dark:text-[#00d29d]' 
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
                    className="w-full mt-4 py-4 bg-[#008262] dark:bg-[#00d29d] text-white dark:text-black font-extrabold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-[14.5px] disabled:opacity-50 cursor-pointer active:scale-[0.99] shadow-md shadow-emerald-500/5"
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
                    <div className="bg-surface/75 border border-border/50 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-md flex flex-col gap-6 animate-pulse min-h-[580px] justify-between">
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
                    <div className="bg-surface/75 border border-border/50 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-md flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-[#008262]/10 text-[#008262] dark:bg-[#00d29d]/10 dark:text-[#00d29d] border border-[#008262]/15">
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
                              <CheckCircle2 size={15} className="text-[#008262] dark:text-[#00d29d] shrink-0 mt-0.5" />
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

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => {
                            showToast('☎️ 입주 컨설팅 연계 신청이 접수되었습니다! 담당 전문가가 24시간 내 연락해 드립니다.');
                          }}
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface/75 border border-border/40 p-6 rounded-3xl backdrop-blur-md shadow-sm">
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
                    className="px-5 py-3 bg-[#008262] dark:bg-[#00d29d] text-white dark:text-black text-[13px] font-extrabold rounded-2xl hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98] shrink-0"
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
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-[#00d29d]'
                          }`}>
                            {post.status}
                          </span>
                          <span className="text-[11px] text-tertiary font-medium">{post.bizType}</span>
                        </div>

                        <h5 className="text-[14px] sm:text-[15px] font-black text-primary mt-3 group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors leading-snug tracking-tight">
                          {post.title}
                        </h5>

                        <div className="flex flex-col gap-1.5 mt-4 text-[12px] text-secondary font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-tertiary">임차:</span>
                            <span className="font-bold">{post.area}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-tertiary">시세:</span>
                            <span className="font-extrabold text-[#008262] dark:text-[#00d29d]">{post.rent}</span>
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
                            className="text-[11px] font-extrabold text-[#008262] dark:text-[#00d29d] hover:underline flex items-center gap-0.5"
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
                <div className="lg:col-span-5 bg-surface/70 border border-border/50 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col gap-6">
                  <div>
                    <h3 className="text-[17px] font-black text-primary flex items-center gap-2">
                      <Calculator size={18} className="text-[#008262] dark:text-[#00d29d]" />
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
                        className="w-full bg-body/30 border border-border/40 focus:border-[#008262] dark:focus:border-[#00d29d] rounded-2xl py-3 px-4 text-[14px] font-extrabold outline-none text-primary"
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
                        className="w-5 h-5 accent-[#008262] dark:accent-[#00d29d] cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCalculateTax}
                    className="w-full mt-2 py-4 bg-[#008262] dark:bg-[#00d29d] text-white dark:text-black font-extrabold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-[14.5px] cursor-pointer active:scale-[0.99] shadow-md shadow-emerald-500/5"
                  >
                    <Calculator size={18} />
                    <span>혜택 예측 결과 산출</span>
                  </button>
                </div>

                {/* 결과 분석 카드 */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {calculatedSavings ? (
                    <div className="bg-surface/75 border border-border/50 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-md flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#008262]/10 text-[#008262] dark:bg-[#00d29d]/10 dark:text-[#00d29d] border border-[#008262]/15">
                          예상 절세 시뮬레이션 리포트
                        </span>
                        <h4 className="text-[19px] font-black text-primary mt-2">동탄 테크노밸리 이전 시 예상 세무 혜택</h4>
                        <p className="text-[12.5px] text-secondary mt-1">조세특례제한법 및 화성시 시조례 감면 가이드라인을 준용했습니다.</p>
                      </div>

                      {/* 100% 감면 수치 가시화 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-body/20 p-5 rounded-2xl border border-border/30">
                          <p className="text-[11px] text-tertiary font-bold">초기 4개년 누적 절세액 (100% 감면)</p>
                          <p className="text-[22px] font-black text-[#008262] dark:text-[#00d29d] mt-1">
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
                          <CheckCircle2 size={15} className="text-[#008262] dark:text-[#00d29d] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[12px] font-bold text-secondary">본점 부동산 취득세 감면</span>
                            <span className="text-[11.5px] text-tertiary block mt-0.5 leading-relaxed">{calculatedSavings.acquisitionDiscount}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 bg-body/20 p-3.5 rounded-xl border border-border/30">
                          <CheckCircle2 size={15} className="text-[#008262] dark:text-[#00d29d] shrink-0 mt-0.5" />
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
        <div className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border/80 w-full max-w-[480px] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <h3 className="text-[16px] font-black text-primary">
                {selectedPost ? '공동 임차 메이트 신청' : '공동 임차 모집 등록'}
              </h3>
              <button
                onClick={() => {
                  setIsApplyModalOpen(false);
                  setSelectedPost(null);
                }}
                className="p-1 rounded-lg hover:bg-body/30 text-secondary transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleApplyMatch} className="p-5 flex flex-col gap-4">
              {selectedPost && (
                <div className="bg-body/20 p-3.5 rounded-xl border border-border/30 text-[12px] text-secondary font-medium">
                  <p className="font-bold text-primary">{selectedPost.title}</p>
                  <p className="text-tertiary mt-1">제안 조건: {selectedPost.rent} / {selectedPost.area}</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-secondary">기업명 (또는 대표자 성함)</label>
                <input
                  type="text"
                  required
                  placeholder="예: D-VIEW 솔루션"
                  value={applyName}
                  onChange={(e) => setApplyName(e.target.value)}
                  className="w-full bg-body/30 border border-border/40 focus:border-[#008262] dark:focus:border-[#00d29d] rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-secondary">휴대폰 번호 (연락처)</label>
                <input
                  type="tel"
                  required
                  placeholder="예: 010-1234-5678"
                  value={applyPhone}
                  onChange={(e) => setApplyPhone(e.target.value)}
                  className="w-full bg-body/30 border border-border/40 focus:border-[#008262] dark:focus:border-[#00d29d] rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-secondary">업종 및 선호 면적</label>
                <input
                  type="text"
                  required
                  placeholder="예: IT 벤처 / 10평 내외 선호"
                  value={applyBizType}
                  onChange={(e) => setApplyBizType(e.target.value)}
                  className="w-full bg-body/30 border border-border/40 focus:border-[#008262] dark:focus:border-[#00d29d] rounded-xl py-2.5 px-3 text-[13px] outline-none text-primary font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-[#008262] dark:bg-[#00d29d] text-white dark:text-black font-extrabold rounded-xl hover:opacity-90 transition-all text-[13.5px]"
              >
                {selectedPost ? '매이트 매칭 신청 제안' : '공동 임차 모집글 게시'}
              </button>
            </form>
          </div>
        </div>
      )}

      <MobileDock activeTab="technovalley" />
    </>
  );
}

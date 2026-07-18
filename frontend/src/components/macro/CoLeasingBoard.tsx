'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Users, Calendar, Coins, Sparkles, Filter, Plus, ArrowRight, Check, Send, ChevronLeft, ChevronRight } from 'lucide-react';

export interface CoLeasePost {
  id: string | number;
  title: string;
  buildingName: string;
  sector: string;
  spaceType: string;
  deposit: number; // 만원
  rent: number; // 만원
  inclusions: string[];
  status: 'available' | 'applied' | 'matched';
  description: string;
  isMock?: boolean;
}

export const INITIAL_POSTS: CoLeasePost[] = [
  {
    id: 1,
    title: '금강 IX타워 실평 20평 분할 쉐어 메이트 구합니다.',
    buildingName: '금강 IX타워',
    sector: 'IT 서비스 (웹디자인 에이전시)',
    spaceType: '실평수 20평 전용 분할',
    deposit: 500,
    rent: 45,
    inclusions: ['회의실 공유', '인터넷 무상제공', '무료 주차 1대 지원'],
    status: 'available',
    description: '전체 40평 오피스 중 창가 쪽 20평 구역을 독립적으로 사용하실 파트너사를 찾습니다. 디자인이나 개발 관련 업종이면 서로 협업 시너지도 기대할 수 있습니다. 탕비실과 대회의실은 공동 사용 조건입니다.',
    isMock: true
  },
  {
    id: 2,
    title: '실리콘앨리 소형 섹션오피스 쉐어할 1인 작가님 계신가요?',
    buildingName: '현대 실리콘앨리',
    sector: '디자인/미디어 (독립 출판 크리에이터)',
    spaceType: '책상 1개 개인 구역',
    deposit: 100,
    rent: 18,
    inclusions: ['조용한 업무 환경', '커피 머신 무상 제공', '1개월 단기 가능'],
    status: 'available',
    description: '조용히 글을 쓰거나 개인 그래픽 작업을 하시는 프리랜서 작가분을 모집합니다. 공간이 예쁘고 조용합니다. 기본 사무집기(모니터 거치대 등)는 세팅되어 있으니 노트북만 들고 오시면 됩니다.',
    isMock: true
  },
  {
    id: 3,
    title: '제조형 SH타임스퀘어 반 공간 쉐어 임차 구함',
    buildingName: 'SH타임스퀘어',
    sector: '정밀 제조/3D 프린팅 ((주)하이테크 정밀)',
    spaceType: '창고 및 적재 구역 25평',
    deposit: 800,
    rent: 65,
    inclusions: ['드라이브인 직통 하역 가능', '지게차 공동 사용', '하중 평당 4톤 설계'],
    status: 'available',
    description: '도어투도어가 가능한 드라이브인 호실입니다. 저희가 기계설비 구역을 사용하고 있어, 남는 적재 공간 25평가량을 물류창고나 하역 작업장으로 쉐어해서 사용하실 하드웨어 제조업체를 찾습니다.',
    isMock: true
  },
  {
    id: 4,
    title: '동탄 SK V1 10평 섹션 쉐어하실 쇼핑몰 사장님',
    buildingName: '동탄 SK V1',
    sector: '전자상거래 (의류 쇼핑몰)',
    spaceType: '공동 패킹대 + 데스크 1개',
    deposit: 300,
    rent: 30,
    inclusions: ['계약 택배 수거 연계', '촬영 스튜디오 쉐어', '냉난방 완비'],
    status: 'available',
    description: '쇼핑몰 하시는 분 환영합니다. 택배 수거 계약이 되어 있어 저렴하게 물류 처리가 가능하고, 호실 내에 촬영 스튜디오 스크린과 조명 장비가 있어 예약제로 무료 쉐어해서 사용할 수 있습니다.',
    isMock: true
  }
];

const AVAILABLE_BUILDING_OPTIONS = [
  '전체 빌딩',
  '금강 IX타워',
  '현대 실리콘앨리',
  'SH타임스퀘어',
  '동탄 SK V1',
  '동탄 에이팩시티',
  '동탄 테라타워'
];

export default function CoLeasingBoard() {
  const [posts, setPosts] = useState<CoLeasePost[]>(INITIAL_POSTS);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('전체 빌딩');
  const [maxRent, setMaxRent] = useState<number>(100); // 100만원 이하 필터 기본값
  const [mounted, setMounted] = useState(false);

  // Timer refs to prevent memory leaks in async handlers on unmount
  const applyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const createTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (applyTimeoutRef.current) clearTimeout(applyTimeoutRef.current);
      if (createTimeoutRef.current) clearTimeout(createTimeoutRef.current);
    };
  }, []);

  // Modals state
  const [activeDetailPost, setActiveDetailPost] = useState<CoLeasePost | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Apply Form states
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantNote, setApplicantNote] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // New Post Form states
  const [newTitle, setNewTitle] = useState('');
  const [newBuilding, setNewBuilding] = useState('금강 IX타워');
  const [newSector, setNewSector] = useState('');
  const [newSpaceType, setNewSpaceType] = useState('');
  const [newDeposit, setNewDeposit] = useState<number>(300);
  const [newRent, setNewRent] = useState<number>(30);
  const [newInclusionsText, setNewInclusionsText] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchBuilding = selectedBuilding === '전체 빌딩' || post.buildingName === selectedBuilding;
      const matchRent = post.rent <= maxRent;
      return matchBuilding && matchRent;
    });
  }, [posts, selectedBuilding, maxRent]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 3;
  
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBuilding, maxRent]);

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantPhone || !activeDetailPost) return;

    setIsApplying(true);
    if (applyTimeoutRef.current) clearTimeout(applyTimeoutRef.current);
    applyTimeoutRef.current = setTimeout(() => {
      // Update state to mark this post as applied
      setPosts(prev => prev.map(p => {
        if (p.id === activeDetailPost.id) {
          return { ...p, status: 'applied' };
        }
        return p;
      }));
      setIsApplying(false);
      setIsApplyModalOpen(false);
      setActiveDetailPost(null);
      
      // Reset form
      setApplicantName('');
      setApplicantPhone('');
      setApplicantNote('');

      alert('공동임차 쉐어 신청이 성공적으로 접수되었습니다! 매칭 제안자에게 승인 요청 알림이 전송되었습니다.');
      applyTimeoutRef.current = null;
    }, 1200);
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSector || !newSpaceType || !newDescription) return;

    setIsCreating(true);
    if (createTimeoutRef.current) clearTimeout(createTimeoutRef.current);
    createTimeoutRef.current = setTimeout(() => {
      const parsedInclusions = newInclusionsText
        ? newInclusionsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : ['사무 공간 공유'];

      const newPost: CoLeasePost = {
        id: posts.length + 1,
        title: newTitle,
        buildingName: newBuilding,
        sector: newSector,
        spaceType: newSpaceType,
        deposit: newDeposit,
        rent: newRent,
        inclusions: parsedInclusions,
        status: 'available',
        description: newDescription
      };

      setPosts(prev => [newPost, ...prev]);
      setIsCreating(false);
      setIsCreateModalOpen(false);

      // Reset form
      setNewTitle('');
      setNewSector('');
      setNewSpaceType('');
      setNewDeposit(300);
      setNewRent(30);
      setNewInclusionsText('');
      setNewDescription('');

      alert('공동임차 구인 피드가 등록되었습니다! 지산 쉐어 매칭 보드에 즉시 활성화됩니다.');
      createTimeoutRef.current = null;
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* ═══ TOP: Co-Leasing KPIs ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1 */}
        <div className="bg-surface border border-border/80 p-5 rounded-[20px] shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] text-tertiary font-bold">이번 달 매칭 성사</span>
            <span className="text-[20px] font-black text-primary">14 건 완료</span>
          </div>
          <span className="p-2 bg-emerald-500/10 text-[#00a37b] rounded-xl">
            <Check size={18} />
          </span>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface border border-border/80 p-5 rounded-[20px] shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] text-tertiary font-bold">평균 공실 해소 기간</span>
            <span className="text-[20px] font-black text-primary">18.5 일 소요</span>
          </div>
          <span className="p-2 bg-hs-orange/10 text-hs-orange rounded-xl">
            <Calendar size={18} />
          </span>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface border border-border/80 p-5 rounded-[20px] shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] text-tertiary font-bold">대기 중인 오피스 메이트</span>
            <span className="text-[20px] font-black text-primary">42 개 기업 / 창업자</span>
          </div>
          <span className="p-2 bg-hs-blue/10 text-hs-blue rounded-xl">
            <Users size={18} />
          </span>
        </div>

      </div>

      {/* ═══ MIDDLE: Filter Controls & Action Button ═══ */}
      <div className="bg-surface border border-border/80 p-5 rounded-[24px] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Building Select */}
          <div className="flex items-center gap-1.5 bg-body/80 border border-border/40 rounded-xl px-2.5 py-1.5">
            <Filter size={13} className="text-tertiary" />
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="bg-transparent text-[11px] font-black text-secondary focus:outline-none border-none cursor-pointer"
            >
              {AVAILABLE_BUILDING_OPTIONS.map(b => (
                <option key={b} value={b} className="bg-surface text-primary">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Max Rent Range */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-tertiary font-bold">월세 상한선:</span>
            <span className="text-[11.5px] font-extrabold text-hs-orange">{maxRent === 100 ? '전체' : `${maxRent}만 원 이하`}</span>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={maxRent}
              onChange={(e) => setMaxRent(Number(e.target.value))}
              className="w-24 sm:w-32 h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-hs-orange"
            />
          </div>

        </div>

        {/* Create Ad Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1 px-4 py-2.5 bg-hs-orange hover:bg-hs-orange/95 text-white text-[11.5px] font-black rounded-xl cursor-pointer shadow-sm transition-all active:scale-[0.98] w-full md:w-auto justify-center"
        >
          <Plus size={15} />
          <span>공동임차 구인 등록</span>
        </button>

      </div>

      {/* ═══ BOTTOM: Feed Grid ═══ */}
      {filteredPosts.length === 0 ? (
        <div className="bg-surface border border-border/80 rounded-[24px] py-16 px-4 text-center">
          <p className="text-[13px] font-bold text-tertiary">조건에 일치하는 공동임차 구인 건이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paginatedPosts.map(post => {
              const isApplied = post.status === 'applied';
              return (
                <div
                  key={post.id}
                  onClick={() => setActiveDetailPost(post)}
                  className="bg-surface border border-border/80 p-5 rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300 cursor-pointer min-h-[220px]"
                >
                  {/* Card Top */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-block px-2.5 py-0.5 bg-body text-tertiary text-[9.5px] font-black rounded-full border border-border/40">
                          {post.buildingName}
                        </span>
                        {post.isMock && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9.5px] font-black border border-blue-500/20">
                            가상 데이터
                          </span>
                        )}
                      </div>
                      
                      {isApplied ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#00a37b] text-[9.5px] font-black flex items-center gap-0.5">
                          <Check size={11} />
                          신청 완료
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-hs-orange/10 text-hs-orange text-[9.5px] font-black">
                          모집 중
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-[13.5px] font-black text-primary leading-snug tracking-tight">
                      {post.title}
                    </h4>
                    
                    <p className="text-[11px] text-tertiary font-bold truncate">
                      {post.sector} • {post.spaceType}
                    </p>
                  </div>

                  {/* Card Inclusions */}
                  <div className="flex flex-wrap gap-1 my-3">
                    {post.inclusions.slice(0, 3).map((inc, i) => (
                      <span key={i} className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-lg bg-body text-secondary border border-border/20">
                        {inc}
                      </span>
                    ))}
                  </div>

                  {/* Card Bottom */}
                  <div className="flex justify-between items-center pt-3 border-t border-border/30 mt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-tertiary font-extrabold">분담:</span>
                      <span className="text-[13px] font-black text-primary">
                        {post.deposit} / {post.rent}만 원
                      </span>
                    </div>
                    
                    <span className="text-[10px] font-black text-hs-orange flex items-center gap-0.5 hover:underline">
                      상세보기
                      <ArrowRight size={11} />
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

          {/* ═══ PAGINATION CONTROLS ═══ */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface/50 border border-border/60 p-4 rounded-[22px] shadow-sm">
              <span className="text-[11px] text-tertiary font-bold">
                총 <span className="text-primary font-black">{filteredPosts.length}</span>개 중 {(currentPage - 1) * POSTS_PER_PAGE + 1}-{Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} 표시
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(prev - 1, 1)); }}
                  disabled={currentPage === 1}
                  className="p-2 border border-border rounded-xl bg-body text-secondary hover:bg-neutral-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={(e) => { e.stopPropagation(); setCurrentPage(pageNum); }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-[12px] font-black transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-hs-orange text-white shadow-md shadow-hs-orange/20'
                        : 'border border-border bg-body text-secondary hover:bg-neutral-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(prev + 1, totalPages)); }}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-border rounded-xl bg-body text-secondary hover:bg-neutral-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="다음 페이지"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ═══ DETAIL & APPLY MODAL ═══ */}
      {mounted && activeDetailPost && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => {
                setActiveDetailPost(null);
                setIsApplyModalOpen(false);
              }}
              className="absolute top-4 right-4 text-tertiary hover:text-primary transition-all p-1 text-[18px] cursor-pointer font-bold"
            >
              &times;
            </button>

            {!isApplyModalOpen ? (
              // 1) Detail view
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
                  <span className="text-[10px] font-black text-hs-orange uppercase tracking-wide">
                    {activeDetailPost.buildingName} • 공동임차 세부 정보
                  </span>
                  <h3 className="text-[15px] font-black text-primary leading-snug">
                    {activeDetailPost.title}
                  </h3>
                </div>

                <div className="flex flex-col gap-3 py-1">
                  <div className="grid grid-cols-2 gap-4 bg-body/60 p-3 rounded-2xl border border-border/40">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-tertiary font-bold">임대조건 (보증금 / 월세)</span>
                      <span className="text-[13.5px] font-black text-primary">
                        {activeDetailPost.deposit}만 원 / {activeDetailPost.rent}만 원
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-tertiary font-bold">모집자 업종 및 용도</span>
                      <span className="text-[13.5px] font-black text-primary truncate">
                        {activeDetailPost.sector}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11.5px] font-black text-secondary">공유 상세 설명</span>
                    <p className="text-[11.5px] text-tertiary font-medium leading-relaxed bg-body/30 p-3 rounded-xl border border-border/10">
                      {activeDetailPost.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11.5px] font-black text-secondary">제공 혜택 및 시설 공유</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDetailPost.inclusions.map((inc, i) => (
                        <span key={i} className="text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-body text-secondary border border-border/40">
                          ✓ {inc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-border/40 mt-2">
                  <button
                    onClick={() => setActiveDetailPost(null)}
                    className="flex-1 py-3 border border-border rounded-xl text-[12px] font-bold text-secondary bg-body hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    닫기
                  </button>
                  {activeDetailPost.status === 'applied' ? (
                    <button
                      disabled
                      className="flex-1 py-3 bg-neutral-200 dark:bg-zinc-800 text-neutral-400 text-[12px] font-black rounded-xl cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <Check size={14} />
                      이미 신청함
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsApplyModalOpen(true)}
                      className="flex-1 py-3 bg-hs-orange hover:bg-hs-orange/95 text-white text-[12px] font-black rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Send size={13} />
                      공동임차 신청하기
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // 2) Apply view
              <div className="flex flex-col gap-4 animate-in slide-in-from-right-3 duration-200">
                <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
                  <h4 className="text-[14px] font-black text-primary">공동임차 메이트 신청</h4>
                  <span className="text-[10px] text-tertiary font-bold">희망 정보를 작성하시면 게시자에게 즉각 전달됩니다.</span>
                </div>

                <form onSubmit={handleApplySubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-bold text-secondary">기업명 (또는 개인 신청자명)</label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="예: (주)알파크리에이티브"
                      className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-bold text-secondary">연락처 (휴대전화 번호)</label>
                    <input
                      type="text"
                      required
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="예: 010-9876-5432"
                      className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-bold text-secondary">전달 메시지 (희망업무 형태, 질문 등)</label>
                    <textarea
                      value={applicantNote}
                      onChange={(e) => setApplicantNote(e.target.value)}
                      rows={3}
                      placeholder="예: 독립 그래픽 디자이너입니다. 7월 중순 입주 가능하며, 회의실은 주 2회 정도 사용할 예정입니다."
                      className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange resize-none font-bold"
                    />
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(false)}
                      className="flex-1 py-3 border border-border rounded-xl text-[12px] font-bold text-secondary bg-body hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      이전으로
                    </button>
                    <button
                      type="submit"
                      disabled={isApplying}
                      className="flex-1 py-3 bg-hs-orange hover:bg-hs-orange/95 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-[12px] font-black rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      {isApplying ? '제출 중...' : '신청서 제출'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ═══ CREATE POST AD MODAL ═══ */}
      {mounted && isCreateModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-tertiary hover:text-primary transition-all p-1 text-[18px] cursor-pointer font-bold"
            >
              &times;
            </button>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <span className="p-1.5 bg-hs-orange/10 text-hs-orange rounded-xl">
                  <Sparkles size={18} />
                </span>
                <div className="flex flex-col">
                  <h4 className="text-[14px] font-black text-primary">공동임차 구인 등록</h4>
                  <span className="text-[10px] text-tertiary font-bold">오피스 쉐어할 메이트를 찾아보세요.</span>
                </div>
              </div>

              <form onSubmit={handleCreatePostSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-secondary">구인 글 제목</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="예: 실리콘앨리 테라스 뷰 15평 분할 임차"
                    className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-bold text-secondary">지식산업센터 빌딩</label>
                    <select
                      value={newBuilding}
                      onChange={(e) => setNewBuilding(e.target.value)}
                      className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                    >
                      {AVAILABLE_BUILDING_OPTIONS.filter(o => o !== '전체 빌딩').map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-bold text-secondary">본인 업종 및 분야</label>
                    <input
                      type="text"
                      required
                      value={newSector}
                      onChange={(e) => setNewSector(e.target.value)}
                      placeholder="예: IT 서비스 (개발사)"
                      className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-bold text-secondary">분담 보증금 (만원)</label>
                    <input
                      type="number"
                      required
                      value={newDeposit}
                      onChange={(e) => setNewDeposit(Number(e.target.value))}
                      className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-bold text-secondary">분담 월세 (만원)</label>
                    <input
                      type="number"
                      required
                      value={newRent}
                      onChange={(e) => setNewRent(Number(e.target.value))}
                      className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-secondary">모집 대상 면적 및 구역</label>
                  <input
                    type="text"
                    required
                    value={newSpaceType}
                    onChange={(e) => setNewSpaceType(e.target.value)}
                    placeholder="예: 전용 면적 10평 분할 구역"
                    className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-secondary">제공 혜택 및 공유 옵션 (쉼표 구분)</label>
                  <input
                    type="text"
                    value={newInclusionsText}
                    onChange={(e) => setNewInclusionsText(e.target.value)}
                    placeholder="예: 회의실 사용 가능, 원두 커피 무료, 주차 등록 가능"
                    className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-secondary">공유 제안 상세 설명</label>
                  <textarea
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                    placeholder="사무실 환경, 매이트에게 바라는 점 등을 상세하게 적어주세요."
                    className="w-full bg-body border border-border/80 rounded-xl py-2 px-3 text-[12px] text-primary focus:outline-none focus:border-hs-orange resize-none font-bold"
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-3 border border-border rounded-xl text-[12px] font-bold text-secondary bg-body hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 py-3 bg-hs-orange hover:bg-hs-orange/95 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-[12px] font-black rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    {isCreating ? '게시글 등록 중...' : '구인 글 등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

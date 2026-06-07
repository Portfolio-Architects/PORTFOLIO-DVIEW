import { useState } from 'react';
import { Sparkles, Calendar, Eye, Share, Building2, ExternalLink } from 'lucide-react';
import { AptTxSummary } from '@/lib/types/transaction';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import useSWR from 'swr';

interface LocalNoticeItem {
  id: string;
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
}

interface LocalEventCurationProps {
  txSummaryData: Record<string, AptTxSummary>;
  onSelectApt: (name: string) => void;
}

export default function LocalEventCuration({ txSummaryData, onSelectApt }: LocalEventCurationProps) {
  const [shareStatus, setShareStatus] = useState<'copied' | 'shared' | null>(null);
  const [noticeCopiedId, setNoticeCopiedId] = useState<string | null>(null);

  const { data: noticesData, error: noticesError } = useSWR('/api/local-notices');
  const allNotices = (noticesData?.notices || []) as LocalNoticeItem[];
  // Filter for Dongtan-related ones or fallback to latest general if none found
  const localNotices = allNotices.filter((n: LocalNoticeItem) => n.isDongtan).slice(0, 5);
  const displayNotices = localNotices.length > 0 ? localNotices : allNotices.slice(0, 5);

  const handleCopyNoticeLink = async (e: React.MouseEvent, notice: LocalNoticeItem) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText((notice.url || '').trim());
      setNoticeCopiedId(notice.id);
      setTimeout(() => setNoticeCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy notice link:', err);
    }
  };

  const handleShareCuration = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#gap`;
    const shareTitle = "동탄 하이퍼로컬 라이프 큐레이션 - D-VIEW";
    const shareText = "동탄 3040 실수요자가 주목하는 호수공원 루나쇼 일정 및 조망 아파트 정보 확인하기!";

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus('shared');
        setTimeout(() => setShareStatus(null), 2000);
      } catch (err) {
        console.error("Curation share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('copied');
        setTimeout(() => setShareStatus(null), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  const curations = [
    {
      id: 'luna',
      title: '동탄호수공원 루나 분수쇼',
      subtitle: '2026 루나쇼 일정',
      desc: '화려한 분수와 멀티미디어 레이저 융합쇼! 매월 격주 토요일 저녁 진행됩니다. 명당 단지는 집안에서도 감상이 가능하여 호재로 작용합니다.',
      eventColor: 'text-indigo-600',
      badgeColor: 'text-indigo-700',
      bgColor: 'from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border-indigo-100/50 dark:border-indigo-900/30',
      infoBorderColor: 'border-indigo-100',
      infoColor: 'text-indigo-600',
      infoList: [
        { 
          label: '가까운 일정', 
          value: (() => {
            const nextLuna = allNotices.find(n => n.source === 'culture' && n.title.includes('[루나쇼]'));
            return nextLuna ? `${nextLuna.date} (격주 토요일)` : '5월~10월 격주 토요일';
          })(), 
          highlight: true 
        },
        { label: '시작 시간', value: '20:00 ~ 20:50 (50분)', highlight: true },
        { label: '진행 주관', value: '화성시 푸른도시사업소', highlight: false }
      ],
      listTitle: '루나쇼 분수 영구조망 & 명당 아파트 리스트',
      apts: [
        {
          name: '동탄레이크자이더테라스',
          desc: '테라스에서 루나쇼 분수가 한눈에 펼쳐지는 호수공원 정남향 영구조망 대장 단지',
          badge: '조망권 A+'
        },
        {
          name: '동탄린스트라우스더레이크',
          desc: '호수공원 바로 앞에 위치해 루나쇼 쇼타임 시 거실 and 안방에서 화려한 레이저쇼 감상 가능',
          badge: '초인접 랜드마크'
        },
        {
          name: '동탄더샵레이크에듀타운',
          desc: '고층 세대 한정 호수 조망이 탁월하며, 호수공원 산책로와 즉시 연결되는 입지',
          badge: '호수 조망 고층'
        }
      ]
    },
    {
      id: 'gtx',
      title: 'GTX-A 동탄~수서 개통 & 삼성 연장',
      subtitle: '교통망 호재 일정',
      desc: '수서까지 20분 내 도달하여 강남 생활권을 실현하는 핵심 교통 호재! GTX-A의 단계별 개통 및 연계 버스망으로 가치가 동반 상승합니다.',
      eventColor: 'text-blue-600',
      badgeColor: 'text-blue-700',
      bgColor: 'from-blue-50/50 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10 border-blue-100/50 dark:border-blue-900/30',
      infoBorderColor: 'border-blue-100',
      infoColor: 'text-blue-600',
      infoList: [
        { label: '동탄~수서', value: '2024년 3월 개통 완료', highlight: true },
        { label: '삼성역 연장', value: '2028년 완전 개통 예정', highlight: true },
        { label: '운행 효과', value: '출퇴근 시간 40분 이상 단축', highlight: false }
      ],
      listTitle: 'GTX-A 초역세권 & 출퇴근 수혜 아파트 리스트',
      apts: [
        {
          name: '동탄역롯데캐슬',
          desc: '동탄역 1번 출구와 지하 통로로 직접 연결되는 명실상부한 동탄의 최고 대장 랜드마크 단지',
          badge: '역 직통 연결'
        },
        {
          name: '동탄역시범한화꿈에그린프레스티지',
          desc: '동탄역 도보 5분 거리의 시범단지 최고 인기 대단지로 GTX 개통에 따른 실거주 가치 급상승',
          badge: '도보 역세권'
        },
        {
          name: '동탄역삼정그린코아더베스트',
          desc: '동탄역 서측 출구 도보 5분 거리에 위치하여 수서·삼성 방면 출퇴근이 극히 편리한 신축 단지',
          badge: '서측 수혜 단지'
        }
      ]
    },
    {
      id: 'waterpark',
      title: '동탄 무료 어린이 물놀이장 & 공원 개장',
      subtitle: '2026 여름 시즌 개장 소식',
      desc: '여름철 무료로 개방되는 여울공원, 신리천공원, 동탄호수공원 어린이 물놀이장! 주말 가족 나들이 및 아이들 물놀이에 최고입니다. 주차가 편리하고 인접한 수혜 단지들이 주목받습니다.',
      eventColor: 'text-teal-600',
      badgeColor: 'text-teal-700',
      bgColor: 'from-teal-50/50 to-emerald-50/30 dark:from-teal-950/20 dark:to-emerald-950/10 border-teal-100/50 dark:border-teal-900/30',
      infoBorderColor: 'border-teal-100',
      infoColor: 'text-teal-600',
      infoList: [
        { 
          label: '개장 예정일', 
          value: (() => {
            const nextWater = allNotices.find(n => n.source === 'culture' && n.title.includes('물놀이장'));
            return nextWater ? nextWater.date : '7월 초 개장';
          })(), 
          highlight: true 
        },
        { label: '운영 시간', value: '10:00 ~ 17:00 (매시간 45분 가동)', highlight: true },
        { label: '이용 요금', value: '무료 (화성시 공원관리과 주관)', highlight: false }
      ],
      listTitle: '공원 물놀이장 초인접 & 직접 생활권 아파트 리스트',
      apts: [
        {
          name: '동탄역시범대원칸타빌1차',
          desc: '단지 바로 앞에 신리천 어린이 물놀이장 및 수변공원이 넓게 펼쳐진 쾌적한 물세권 단지',
          badge: '신리천 물세권'
        },
        {
          name: '동탄역유림노르웨이숲',
          desc: '여울공원 대규모 어린이 물놀이장 및 공원 인프라와 단지 뒤편이 도보 2분 거리로 직결된 친환경 단지',
          badge: '여울공원 직결'
        },
        {
          name: '동탄역반도유보라아이비파크7.0',
          desc: '여울공원 축제광장 및 물놀이 시설 접근성이 매우 뛰어나 여름철 공원 시설 이용이 극히 편리한 단지',
          badge: '여울공원 도보권'
        }
      ]
    }
  ];

  // 3040 실수요 타겟 주민자치센터 실시간 강좌 필터링
  const activeLectures = allNotices
    .filter(n => n.source === 'culture' && n.title.includes('[강좌]'))
    .slice(0, 4);

  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm border border-border flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 dark:bg-amber-950/30 p-1.5 rounded-lg">
              <Sparkles size={18} className="text-amber-500" />
            </div>
            <h3 className="text-[18px] md:text-[20px] font-black text-primary tracking-tight">동탄 하이퍼로컬 라이프 큐레이션</h3>
          </div>
          <p className="text-[12px] md:text-[13px] text-tertiary font-bold pl-8">
            동탄 3040 실수요자가 주목하는 로컬 이벤트와 인근 아파트 가치 분석
          </p>
        </div>
        <button
          onClick={handleShareCuration}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[12.5px] font-extrabold rounded-xl transition-all self-start md:self-center border border-indigo-100 dark:border-indigo-900/30 active:scale-95 shrink-0"
        >
          <Share size={14} />
          <span>{shareStatus === 'copied' ? '복사 완료!' : shareStatus === 'shared' ? '공유 완료!' : '일정 공유하기'}</span>
        </button>
      </div>

      <div className="flex flex-col gap-10 mt-2">
        {curations.map((curation) => (
          <div key={curation.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-border/40 pb-8 last:border-0 last:pb-0">
            {/* 큐레이션 이벤트 정보 카드 */}
            <div className={`lg:col-span-1 bg-gradient-to-br ${curation.bgColor} p-5 rounded-2xl border flex flex-col justify-between`}>
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Calendar size={14} className={curation.eventColor} />
                  <span className={`text-[11px] md:text-[12px] font-extrabold ${curation.badgeColor}`}>{curation.subtitle}</span>
                </div>
                <h4 className="text-[15px] md:text-[17px] font-black text-primary tracking-tight leading-snug mb-2">
                  {curation.title}
                </h4>
                <p className="text-[12px] md:text-[13px] text-secondary font-medium leading-relaxed mb-4">
                  {curation.desc}
                </p>
              </div>
              
              <div className={`bg-white/80 dark:bg-surface/60 rounded-xl p-3 border ${curation.infoBorderColor} flex flex-col gap-1.5`}>
                {curation.infoList.map((info, idx) => (
                  <div key={info.label} className={`flex justify-between text-[11px] md:text-[12px] ${idx > 0 && idx === curation.infoList.length - 1 ? `border-t ${curation.infoBorderColor} pt-1.5 mt-0.5` : ''}`}>
                    <span className="font-bold text-tertiary">{info.label}:</span>
                    <span className={info.highlight ? `font-extrabold ${curation.infoColor}` : 'font-semibold text-secondary'}>{info.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 추천 아파트 리스트 */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <Eye size={14} className="text-emerald-500" />
                <span className="text-[11px] md:text-[12px] font-extrabold text-secondary">{curation.listTitle}</span>
              </div>

              <div className="flex flex-col gap-3">
                {curation.apts.map((apt) => {
                  const key = normalizeAptName(apt.name);
                  const sum = txSummaryData[key];
                  const latestSale = sum?.latestPriceEok && sum.latestPriceEok !== "0" ? sum.latestPriceEok : null;
                  const latestJeonse = sum?.latestRentDepositEok && sum.latestRentDepositEok !== "0" ? sum.latestRentDepositEok : null;

                  return (
                    <div 
                      key={apt.name}
                      onClick={() => onSelectApt(apt.name)}
                      className="bg-body hover:bg-surface rounded-2xl p-4 border border-border hover:border-emerald-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.03)] cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-300 group"
                    >
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight group-hover:text-emerald-600 transition-colors">
                            {apt.name}
                          </span>
                          <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] md:text-[11px] font-extrabold shrink-0">
                            {apt.badge}
                          </span>
                        </div>
                        <p className="text-[12px] md:text-[13px] text-tertiary font-medium leading-relaxed">
                          {apt.desc}
                        </p>

                        {/* 실거래가 정보 표시 영역 */}
                        <div className="flex gap-4 mt-1 border-t border-border/20 pt-2 text-[11.5px] md:text-[12px] text-secondary font-bold">
                          {latestSale && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              최근 매매 <strong className="text-primary">{latestSale}</strong>
                            </span>
                          )}
                          {latestJeonse && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              최근 전세 <strong className="text-primary">{latestJeonse}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto text-[12px] md:text-[13px] font-extrabold text-emerald-600 group-hover:translate-x-1 transition-transform">
                        <span>단지 가치분석</span>
                        <span>&rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🏡 주민자치센터 추천 교육/강좌 리스트 (104차 신설) */}
      {activeLectures.length > 0 && (
        <div className="mt-6 pt-8 border-t border-border/60 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                <Calendar size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-[17px] md:text-[18px] font-black text-primary tracking-tight">우리 동네 주민자치센터 추천 강좌</h4>
              <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 border border-emerald-100 dark:border-emerald-900/30">
                인기 혜택
              </span>
            </div>
            <p className="text-[12px] md:text-[13px] text-tertiary font-bold pl-8">
              동탄 3040 실수요 세대 및 자녀를 위한 선착순 무료/저렴 주민 강좌 정보입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-8">
            {activeLectures.map((lecture) => (
              <a
                key={lecture.id}
                href={`/api/bypass-notice?url=${encodeURIComponent((lecture.url || '').trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-body hover:bg-surface rounded-2xl p-4.5 border border-border hover:border-emerald-300 hover:shadow-[0_8px_20px_rgba(16,185,129,0.04)] cursor-pointer flex flex-col justify-between gap-3 transition-all duration-300 group text-left"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg text-[10.5px] font-black border border-emerald-100/30">
                      {lecture.dept} 주민센터
                    </span>
                    <span className="text-[11px] font-bold text-tertiary">
                      개강: {lecture.date}
                    </span>
                  </div>
                  <h5 className="text-[14px] font-bold text-primary leading-snug group-hover:text-emerald-600 transition-colors">
                    {lecture.title.replace(/\[강좌\]\s*/, '').replace(/\s*수강생\s*선착순\s*모집/, '')}
                  </h5>
                  <p className="text-[12px] text-tertiary leading-normal mt-1.5 font-medium">
                    수강료: 무료 ~ 3만원 선 (재료비 별도) | 화성시민 누구나 신청 가능
                  </p>
                </div>
                <div className="border-t border-border/20 pt-3 flex items-center justify-between mt-1">
                  <span className="text-[11px] text-emerald-600 font-extrabold">선착순 접수 중</span>
                  <div className="text-[11.5px] font-black text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    신청 사이트 이동 <ExternalLink size={11} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 실시간 동탄구정 소식통 */}
      <div className="mt-6 pt-8 border-t border-border/60 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 dark:bg-emerald-950/30 p-1.5 rounded-lg">
              <Building2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-[17px] md:text-[18px] font-black text-primary tracking-tight">실시간 동탄구정 소식통</h4>
            <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 animate-pulse">
              Live
            </span>
          </div>
          <p className="text-[12px] md:text-[13px] text-tertiary font-bold pl-8">
            화성시청 및 동탄구청에서 발표한 실시간 행정 소식과 주민 혜택 정보를 확인하세요.
          </p>
        </div>

        {/* 공지사항 목록 */}
        <div className="flex flex-col gap-3.5 pl-0 md:pl-8">
          {!noticesData && !noticesError ? (
            // Shimmer Loading Skeleton
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-border/20 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : noticesError || displayNotices.length === 0 ? (
            <div className="text-center py-6 text-[13px] font-medium text-tertiary bg-body rounded-2xl border border-border">
              현재 등록된 실시간 구청 소식이 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayNotices.map((notice: LocalNoticeItem) => (
                <a
                  key={notice.id}
                  href={`/api/bypass-notice?url=${encodeURIComponent((notice.url || '').trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-body hover:bg-surface rounded-2xl p-4 border border-border hover:border-emerald-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.03)] cursor-pointer flex items-center justify-between gap-4 transition-all duration-300 group w-full"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl text-[10.5px] md:text-[11px] font-black shrink-0">
                      {notice.dept}
                    </div>
                    <span className="text-[13.5px] md:text-[14px] font-bold text-primary truncate group-hover:text-emerald-600 transition-colors">
                      {notice.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] md:text-[12px] text-tertiary font-extrabold">{notice.date}</span>
                    <button
                      onClick={(e) => handleCopyNoticeLink(e, notice)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100/40 dark:border-emerald-900/30 transition-all active:scale-90"
                      title="공지 링크 복사"
                    >
                      <span className="text-[11.5px] font-black flex items-center justify-center">
                        {noticeCopiedId === notice.id ? '복사됨!' : <ExternalLink size={13} />}
                      </span>
                    </button>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

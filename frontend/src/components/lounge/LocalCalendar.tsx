'use client';

import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Share2, X, ChevronRight, ExternalLink } from 'lucide-react';
import { shareAptToKakao } from '@/lib/utils/kakaoShare';

export interface LocalEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  tip: string;
  link?: string;
}

interface LocalCalendarProps {
  events: LocalEvent[];
}

export function LocalCalendar({ events }: LocalCalendarProps) {
  const [selectedEvent, setSelectedEvent] = useState<LocalEvent | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // 날짜 기반 행사 분류: 오늘 이후의 일정 우선 정렬
  const sortedEvents = React.useMemo(() => {
    if (!events || events.length === 0) return [];
    const today = new Date().toISOString().split('T')[0];
    
    // 다가오는 일정
    const upcoming = events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
      
    // 이미 지난 일정
    const past = events
      .filter((e) => e.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));
      
    return [...upcoming, ...past];
  }, [events]);

  const handleShareKakao = async (e: React.MouseEvent, event: LocalEvent) => {
    e.stopPropagation();
    try {
      // 카카오 공유 브릿지 활용
      const encodedTitle = encodeURIComponent(`🏫 D-VIEW 로컬 소식: ${event.title}`);
      const encodedDesc = encodeURIComponent(`${event.date} (${event.time}) @ ${event.location}`);
      
      await shareAptToKakao({
        aptName: event.title,
        priceEok: 0,
        priceMan: 0,
        ratio: 0,
        imageUrl: `https://dongtanview.com/api/og?title=${encodedTitle}&subtitle=${encodedDesc}`,
        customTitle: `📣 동탄 로컬 소식: ${event.title}`,
        customDesc: `📍 장소: ${event.location}\n⏰ 일시: ${event.date} (${event.time})\n💡 꿀팁: ${event.tip.substring(0, 50)}...`
      });
    } catch (err) {
      console.error('Failed to share via Kakao Link:', err);
      // Fallback
      handleCopyLink(e, event);
    }
  };

  const handleCopyLink = (e: React.MouseEvent, event: LocalEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#lounge?notice=${event.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedEventId(event.id);
      setTimeout(() => setCopiedEventId(null), 2000);
    }).catch((err) => {
      console.error('Clipboard copy failed:', err);
      alert('링크 복사에 실패했습니다.');
    });
  };

  if (!sortedEvents || sortedEvents.length === 0) return null;

  return (
    <div className="w-full bg-surface border border-border rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-4 overflow-hidden select-none">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] md:text-[17px] font-black text-primary flex items-center gap-2">
          <Calendar size={18} className="text-[#0d9488]" />
          <span>오늘의 동탄 로컬 캘린더</span>
        </h3>
        <span className="text-[11.5px] font-bold text-tertiary">동탄 소식 & 루나쇼 일정</span>
      </div>

      {/* 가로 슬라이딩 카드 리스트 (Toss 스타일 터치 캐러셀) */}
      <div className="flex gap-3 overflow-x-auto pb-2 md:pb-4 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden custom-h-scrollbar w-full relative">
        {sortedEvents.map((event) => {
          const today = new Date().toISOString().split('T')[0];
          const isPast = event.date < today;
          const isToday = event.date === today;

          // 카테고리 컬러 스키마
          const categoryColors: Record<string, string> = {
            '공연/축제': 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]/40',
            '마켓/플리마켓': 'bg-[#fdf2f8] text-[#db2777] border-[#fbcfe8]/40',
            '체험/교육': 'bg-[#f0f9ff] text-[#0284c7] border-[#e0f2fe]/40'
          };
          const colorClass = categoryColors[event.category] || 'bg-body text-secondary border-border/40';

          return (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="w-[260px] sm:w-[280px] shrink-0 bg-body rounded-2xl p-4 border border-border flex flex-col justify-between hover:bg-surface hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full ${colorClass}`}>
                    {event.category}
                  </span>
                  
                  {isToday ? (
                    <span className="bg-[#f04452] text-white text-[9.5px] font-extrabold px-2 py-0.5 rounded-md animate-pulse">
                      TODAY
                    </span>
                  ) : isPast ? (
                    <span className="bg-[#b0b8c1]/15 text-tertiary text-[9.5px] font-bold px-2 py-0.5 rounded-md">
                      종료됨
                    </span>
                  ) : (
                    <span className="bg-[#0d9488]/10 text-[#0d9488] text-[9.5px] font-black px-2 py-0.5 rounded-md">
                      D-{Math.ceil((new Date(event.date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))}
                    </span>
                  )}
                </div>

                <h4 className="text-[14.5px] md:text-[15px] font-extrabold text-primary truncate leading-tight group-hover:text-[#0d9488] transition-colors">
                  {event.title}
                </h4>

                <div className="flex flex-col gap-1 text-[12px] text-secondary">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock size={13} className="text-tertiary shrink-0" />
                    <span className="truncate font-medium">{event.date} ({event.time})</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={13} className="text-tertiary shrink-0" />
                    <span className="truncate font-medium">{event.location}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 mt-4 pt-3 w-full">
                <span className="text-[11.5px] font-extrabold text-tertiary flex items-center gap-0.5 group-hover:text-primary transition-colors">
                  꿀팁 및 공유 <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleShareKakao(e, event)}
                    className="p-1.5 rounded-lg hover:bg-surface text-secondary hover:text-[#ffcd00] transition-colors border border-transparent active:scale-95"
                    title="카카오톡 공유"
                  >
                    <Share2 size={13} />
                  </button>
                  <button
                    onClick={(e) => handleCopyLink(e, event)}
                    className="text-[10px] font-black px-2 py-1.5 rounded-lg bg-surface border border-border text-secondary active:scale-95 transition-all"
                    title="일정 링크 복사"
                  >
                    {copiedEventId === event.id ? '복사됨!' : '링크'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 행사 꿀팁 상세 모달 (Toss Glassmorphism 모달 적용) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ position: 'fixed' }}>
          <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          
          <div className="relative bg-surface w-full max-w-[420px] rounded-3xl p-6 shadow-2xl border border-border slide-in-from-bottom flex flex-col gap-5 overflow-hidden">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-5 right-5 text-secondary hover:text-primary p-1.5 bg-body hover:bg-border/20 rounded-full transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col gap-1.5 pr-8">
              <span className="text-[11px] font-extrabold text-[#0d9488] bg-[#0d9488]/10 px-2.5 py-1 rounded-lg w-fit border border-[#0d9488]/15">
                {selectedEvent.category}
              </span>
              <h4 className="text-[18px] font-black text-primary leading-tight mt-1">
                {selectedEvent.title}
              </h4>
            </div>

            <div className="bg-body border border-border rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[13px] text-secondary">
                <Clock size={15} className="text-tertiary shrink-0" />
                <span className="font-bold">{selectedEvent.date}</span>
                <span className="text-tertiary">|</span>
                <span className="font-medium text-tertiary">{selectedEvent.time}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-secondary">
                <MapPin size={15} className="text-tertiary shrink-0" />
                <span className="font-bold">{selectedEvent.location}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h5 className="text-[12px] font-black text-primary">💡 D-VIEW 추천 현장 꿀팁</h5>
              <div className="bg-[#f0f9ff]/70 border border-[#0284c7]/15 rounded-2xl p-4 text-[13.5px] text-secondary leading-relaxed font-medium break-keep">
                {selectedEvent.tip}
              </div>
            </div>

            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={(e) => {
                  handleShareKakao(e, selectedEvent);
                  setSelectedEvent(null);
                }}
                className="flex-1 bg-[#FEE500] hover:bg-[#FEE500]/95 text-[#3A1D1D] font-extrabold text-[13.5px] py-3.5 rounded-2xl border-none cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition-all"
              >
                <Share2 size={16} />
                <span>카카오톡 일정 공유</span>
              </button>
              
              {selectedEvent.link ? (
                <a
                  href={selectedEvent.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-primary text-surface font-extrabold text-[13.5px] py-3.5 rounded-2xl flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <span>공식 안내 보기</span>
                  <ExternalLink size={14} />
                </a>
              ) : (
                <button
                  onClick={(e) => handleCopyLink(e, selectedEvent)}
                  className="flex-1 bg-body hover:bg-border/20 text-secondary font-extrabold text-[13.5px] py-3.5 rounded-2xl border border-border active:scale-98 transition-all cursor-pointer"
                >
                  {copiedEventId === selectedEvent.id ? '복사 완료!' : '일정 링크 복사'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

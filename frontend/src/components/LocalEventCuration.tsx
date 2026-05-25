'use client';

import { Sparkles, Calendar, Eye } from 'lucide-react';

interface LocalEventCurationProps {
  onSelectApt: (name: string) => void;
}

export default function LocalEventCuration({ onSelectApt }: LocalEventCurationProps) {
  const lunaShowApts = [
    {
      name: '동탄레이크자이더테라스',
      desc: '테라스에서 루나쇼 분수가 한눈에 펼쳐지는 호수공원 정남향 영구조망 대장 단지',
      badge: '조망권 A+'
    },
    {
      name: '동탄린스트라우스더레이크',
      desc: '호수공원 바로 앞에 위치해 루나쇼 쇼타임 시 거실과 안방에서 화려한 레이저쇼 감상 가능',
      badge: '초인접 랜드마크'
    },
    {
      name: '동탄더샵레이크에듀타운',
      desc: '고층 세대 한정 호수 조망이 탁월하며, 호수공원 산책로와 즉시 연결되는 입지',
      badge: '호수 조망 고층'
    }
  ];

  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm border border-border flex flex-col gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* 루나쇼 일정 및 행사 정보 카드 */}
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Calendar size={14} className="text-indigo-600" />
              <span className="text-[11px] md:text-[12px] font-extrabold text-indigo-700">2026 루나쇼 일정</span>
            </div>
            <h4 className="text-[15px] md:text-[17px] font-black text-primary tracking-tight leading-snug mb-2">
              동탄호수공원 루나 분수쇼
            </h4>
            <p className="text-[12px] md:text-[13px] text-secondary font-medium leading-relaxed mb-4">
              화려한 분수와 멀티미디어 레이저 융합쇼! 매월 격주 토요일 저녁 진행됩니다. 명당 단지는 집안에서도 감상이 가능하여 호재로 작용합니다.
            </p>
          </div>
          
          <div className="bg-white/80 dark:bg-surface/60 rounded-xl p-3 border border-indigo-100 flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] md:text-[12px]">
              <span className="font-bold text-tertiary">주요 일정:</span>
              <span className="font-extrabold text-indigo-600">5월~10월 매월 격주 토요일</span>
            </div>
            <div className="flex justify-between text-[11px] md:text-[12px]">
              <span className="font-bold text-tertiary">시작 시간:</span>
              <span className="font-extrabold text-indigo-600">20:00 ~ 20:50 (50분)</span>
            </div>
            <div className="flex justify-between text-[11px] md:text-[12px] border-t border-indigo-50 pt-1.5 mt-0.5">
              <span className="font-bold text-tertiary">진행 주관:</span>
              <span className="font-semibold text-secondary">화성시 푸른도시사업소</span>
            </div>
          </div>
        </div>

        {/* 명당 아파트 리스트 */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <Eye size={14} className="text-emerald-500" />
            <span className="text-[11px] md:text-[12px] font-extrabold text-secondary">루나쇼 분수 영구조망 & 명당 아파트 리스트</span>
          </div>

          <div className="flex flex-col gap-3">
            {lunaShowApts.map((apt) => (
              <div 
                key={apt.name}
                onClick={() => onSelectApt(apt.name)}
                className="bg-body hover:bg-surface rounded-2xl p-4 border border-border hover:border-emerald-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.03)] cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-300 group"
              >
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
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
                </div>
                
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto text-[12px] md:text-[13px] font-extrabold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  <span>단지 가치분석</span>
                  <span>&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

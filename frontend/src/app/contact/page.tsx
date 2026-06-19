import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Clock, Globe } from 'lucide-react';

export const metadata = {
  title: '문의하기 | D-VIEW 고객 지원',
  description: 'D-VIEW 부동산 분석 플랫폼에 대한 건의사항, 오류 제보, 광고 및 제휴 제안을 위한 고객 소통 및 이메일 문의 채널입니다.',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-body font-sans pb-20">
      {/* 상단 네비게이션 헤더 */}
      <div className="bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-[880px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-surface/5 text-secondary transition-colors"
              aria-label="홈으로 이동"
            >
              <ArrowLeft size={20} />
            </Link>
            <span className="font-extrabold text-primary text-[17px] sm:text-lg tracking-tight">문의하기</span>
          </div>
          <Link href="/" className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px] sm:text-sm hover:underline">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      {/* 본문 콘텐츠 */}
      <main className="max-w-[880px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* 좌측 1개 열: 고객 문의 안내 */}
          <div className="md:col-span-1 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">D-VIEW와 소통하세요</h2>
              <p className="mt-2 text-[12px] sm:text-[13px] text-secondary leading-relaxed font-medium">
                서비스 개선을 위한 다양한 아이디어, 아파트 인프라 정보 정정 요청, 광고 제안 및 비즈니스 제휴 문의를 환영합니다.
              </p>
            </div>

            <div className="space-y-4">
              {/* 이메일 */}
              <div className="flex items-start gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <h4 className="text-[12px] font-extrabold text-tertiary">대표 이메일</h4>
                  <p className="text-[13px] font-bold text-primary mt-0.5">ocs5672@gmail.com</p>
                </div>
              </div>

              {/* 영업시간 */}
              <div className="flex items-start gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="text-[12px] font-extrabold text-tertiary">답변 예상 시간</h4>
                  <p className="text-[13px] font-bold text-primary mt-0.5">평일 기준 24시간 이내</p>
                </div>
              </div>

              {/* 커뮤니티 라운지 제안 */}
              <div className="flex items-start gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h4 className="text-[12px] font-extrabold text-tertiary">일반 토크</h4>
                  <p className="text-[13px] font-bold text-primary mt-0.5">
                    <Link href="/lounge" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                      라운지 게시판 활용 가능
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 우측 2개 열: 문의 작성 폼 */}
          <div className="md:col-span-2 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-primary mb-6 tracking-tight flex items-center gap-2">
              <Globe size={18} className="text-emerald-500" />
              온라인 피드백 접수
            </h3>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label htmlFor="user-name" className="block text-[12px] font-extrabold text-secondary mb-1">
                  성함 / 닉네임
                </label>
                <input
                  type="text"
                  id="user-name"
                  placeholder="홍길동"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-body focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[13px] font-medium text-primary transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="user-email" className="block text-[12px] font-extrabold text-secondary mb-1">
                  이메일 주소 (답변 수신용)
                </label>
                <input
                  type="email"
                  id="user-email"
                  placeholder="example@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-body focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[13px] font-medium text-primary transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="inquiry-type" className="block text-[12px] font-extrabold text-secondary mb-1">
                  문의 분류
                </label>
                <select
                  id="inquiry-type"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-body focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[13px] font-medium text-primary transition-all cursor-pointer"
                >
                  <option value="report">데이터 오류 제보 (단지 인프라 등)</option>
                  <option value="idea">서비스 기능 제안 / 건의사항</option>
                  <option value="business">광고 문의 / 비즈니스 제휴</option>
                  <option value="other">기타 일반 문의</option>
                </select>
              </div>

              <div>
                <label htmlFor="user-message" className="block text-[12px] font-extrabold text-secondary mb-1">
                  상세 내용
                </label>
                <textarea
                  id="user-message"
                  rows={6}
                  placeholder="문의하실 내용을 구체적으로 적어주세요. 단지 정보 정정의 경우 단지 이름과 실측 정보(예: 초등학교 도보 7분 등)를 기재해 주시면 빠른 반영에 큰 도움이 됩니다."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-body focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[13px] font-medium text-primary transition-all resize-none"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => alert('피드백 접수 폼은 목업(Mockup)입니다. 실제 문의는 ocs5672@gmail.com 대표 메일로 직접 전송해 주시면 감사하겠습니다!')}
                  className="w-full py-3 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-extrabold text-[14px] transition-colors shadow-sm"
                >
                  보내기
                </button>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}

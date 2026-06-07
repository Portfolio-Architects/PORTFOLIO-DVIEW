"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBanner from './NotificationBanner';

export default function Footer() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return null;

  return (
    <footer className="w-full bg-transparent border-t border-border/40 relative z-30 py-8 sm:py-12 mt-0 pb-[calc(env(safe-area-inset-bottom)+80px)] sm:pb-12">
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 flex flex-col gap-8 sm:gap-10">
        
        {/* 알림 받기 배너 (푸터와 병합) */}
        {!isAdmin && (
          <div className="w-full">
            <NotificationBanner />
          </div>
        )}

        {/* 하단 면책 조항 및 정보 탭 */}
        <div className={`w-full flex flex-col lg:flex-row lg:justify-between lg:items-center items-start gap-8 lg:gap-12 ${!isAdmin ? 'pt-2' : ''}`}>
          
          {/* 좌측: 로고 및 링크 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8 lg:gap-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <img src="/d-view-icon.png" alt="D-VIEW Logo" className="w-[26px] h-[26px] rounded-[6px] grayscale opacity-70" />
              <span className="text-[15px] font-extrabold text-tertiary tracking-tight">D-VIEW</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              <Link href="/terms" className="text-[13px] font-bold text-secondary hover:text-primary transition-colors">
                서비스 이용약관
              </Link>
              <Link href="/privacy" className="text-[13px] font-bold text-secondary hover:text-primary transition-colors">
                개인정보처리방침
              </Link>
            </div>
          </div>

          {/* 우측: 정보 및 면책조항 */}
          <div className="flex flex-col items-start lg:items-end text-[12px] text-tertiary leading-relaxed font-medium w-full lg:max-w-[600px] xl:max-w-[700px]">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-2.5 lg:justify-end">
              <span>상호: D-VIEW</span>
              <span className="text-toss-gray">|</span>
              <span>이메일: ocs5672@gmail.com</span>
              <span className="hidden sm:inline text-toss-gray">|</span>
              <span className="w-full sm:w-auto">© {new Date().getFullYear()} D-VIEW. All rights reserved.</span>
            </div>
            
            {!isAdmin && (
              <p className="text-left lg:text-right w-full tracking-tight text-[11.5px]">
                <strong className="text-secondary font-bold mr-1">면책 조항:</strong>
                D-VIEW에서 제공하는 적정가 및 분석 지표는 공공데이터를 기반으로 한 통계/알고리즘적 추정치로, 실제 시장 가격과 다를 수 있습니다.<br />
                부동산 거래에 대한 최종 판단과 책임은 사용자 본인에게 있습니다.
              </p>
            )}
          </div>

        </div>

      </div>
    </footer>
  );
}

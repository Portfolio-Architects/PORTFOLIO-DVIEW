import React from 'react';
import type { FieldReportData, TransactionRecord } from '@/types';

export interface ApartmentModalKakaoCardProps {
  shareCardRef: React.RefObject<HTMLDivElement | null>;
  report: FieldReportData;
  displayAptName: string;
  transactions?: TransactionRecord[];
  valuation?: {
    status?: 'undervalued' | 'overvalued' | 'fair';
    amount?: string;
    ratio?: number;
    priceStr?: string;
  };
}

export const ApartmentModalKakaoCard = React.memo(function ApartmentModalKakaoCard({
  shareCardRef,
  report,
  displayAptName,
  transactions = [],
  valuation,
}: ApartmentModalKakaoCardProps) {
  return (
    <div
      ref={shareCardRef}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '1200px',
        height: '630px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '50px 60px',
        boxSizing: 'border-box',
        zIndex: -9999,
        pointerEvents: 'none',
      }}
      className="text-white font-sans overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ea6100] flex items-center justify-center shadow-lg shadow-[#ea6100]/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-[#ea6100] text-[20px] font-black tracking-wider uppercase block leading-none">D-VIEW</span>
            <span className="text-slate-400 text-[13px] font-bold block leading-none mt-1">동탄 부동산 가치분석 플랫폼</span>
          </div>
        </div>
        <div className="bg-[#1e293b] border border-slate-800/80 rounded-full px-5 py-2">
          <span className="text-slate-300 text-[14px] font-bold">실거래 가치분석 리포트</span>
        </div>
      </div>

      {/* Center Content */}
      <div className="grid grid-cols-12 gap-8 items-center my-6">
        {/* Left: Apt Name & Info */}
        <div className="col-span-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-[#ea6100]/15 text-[#ea6100] text-[14px] font-black px-3.5 py-1.5 rounded-full border border-[#ea6100]/30">
              {report.dong || '동탄'}
            </span>
            {report.metrics?.yearBuilt && (
              <span className="bg-slate-800 text-slate-400 text-[14px] font-bold px-3.5 py-1.5 rounded-full">
                {String(report.metrics.yearBuilt).substring(0, 4)}년 입주
              </span>
            )}
            {valuation?.status === 'undervalued' && (
              <span className="bg-emerald-500/20 text-[#ea6100] text-[14px] font-black px-3.5 py-1.5 rounded-full border border-emerald-500/30">
                저평가 메리트 🟢
              </span>
            )}
            {valuation?.status === 'overvalued' && (
              <span className="bg-rose-500/20 text-rose-400 text-[14px] font-black px-3.5 py-1.5 rounded-full border border-rose-500/30">
                시세 고평가 🚨
              </span>
            )}
            {valuation?.status === 'fair' && (
              <span className="bg-slate-800 text-slate-300 text-[14px] font-black px-3.5 py-1.5 rounded-full">
                적정 시세 ⚖️
              </span>
            )}
          </div>
          <h1 className="text-[44px] font-black leading-tight tracking-tight text-white drop-shadow-sm">
            {displayAptName}
          </h1>
          <div className="flex items-center gap-2 text-slate-400 text-[15px] font-semibold">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#ea6100]">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.08-.417-.507-.65-.913-.485a4.5 4.5 0 00-2.836 2.836c-.166.406.067.833.485.913a.75.75 0 01.614.93L9.61 16.57a.75.75 0 11-1.46-.388l1.378-5.182a.75.75 0 111.46.388L9.61 16.57a.75.75 0 11-1.46-.388l1.378-5.182z" clipRule="evenodd" />
            </svg>
            입지평점: {report.premiumScores?.totalPremiumScore ? `${report.premiumScores.totalPremiumScore.toFixed(1)} / 100` : '90.0 / 100'}
          </div>
        </div>

        {/* Right: Metrics Grid */}
        <div className="col-span-6 grid grid-cols-2 gap-4">
          {/* Metric 1: Sale Price */}
          <div className="bg-[#1e293b]/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-1.5">
            <span className="text-slate-400 text-[14px] font-bold">최근 실거래 매매가</span>
            <span className="text-[28px] font-black text-white tracking-tight">
              {(() => {
                const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
                if (saleTxs.length === 0) return '-';
                const p = saleTxs[0].price;
                const eok = Math.floor(p / 10000);
                const man = p % 10000;
                return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
              })()}
            </span>
          </div>

          {/* Metric 2: Jeonse Price */}
          <div className="bg-[#1e293b]/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-1.5">
            <span className="text-slate-400 text-[14px] font-bold">최근 실거래 전세가</span>
            <span className="text-[28px] font-black text-white tracking-tight">
              {(() => {
                const jeonseTxs = transactions.filter(t => t.dealType === '전세');
                if (jeonseTxs.length === 0) return '-';
                const p = jeonseTxs[0].deposit || 0;
                const eok = Math.floor(p / 10000);
                const man = p % 10000;
                return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
              })()}
            </span>
          </div>

          {/* Metric 3: Gap Investment */}
          <div className="bg-[#ea6100]/10 border border-[#ea6100]/20 rounded-3xl p-6 flex flex-col gap-1.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ea6100]/5 rounded-full blur-xl -mr-6 -mt-6"></div>
            <span className="text-[#ea6100] text-[14px] font-extrabold flex items-center gap-1">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
              </svg>
              실구매 필요자금
            </span>
            <span className="text-[30px] font-black text-[#ea6100] tracking-tight">
              {(() => {
                const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
                const jeonseTxs = transactions.filter(t => t.dealType === '전세');
                if (saleTxs.length === 0 || jeonseTxs.length === 0) return '-';
                const salePrice = saleTxs[0].price;
                const jeonsePrice = jeonseTxs[0].deposit || 0;
                const gap = salePrice - jeonsePrice;
                if (gap <= 0) return '갭 없음';
                const eok = Math.floor(gap / 10000);
                const man = gap % 10000;
                return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
              })()}
            </span>
          </div>

          {/* Metric 4: Jeonse Ratio */}
          <div className="bg-[#1e293b]/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-1.5">
            <span className="text-slate-400 text-[14px] font-bold">전세가율 (매매 대비 전세)</span>
            <span className="text-[28px] font-black text-white tracking-tight">
              {(() => {
                const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
                const jeonseTxs = transactions.filter(t => t.dealType === '전세');
                if (saleTxs.length === 0 || jeonseTxs.length === 0) return '-';
                const salePrice = saleTxs[0].price;
                const jeonsePrice = jeonseTxs[0].deposit || 0;
                const ratio = (jeonsePrice / salePrice) * 100;
                return `${ratio.toFixed(1)}%`;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="flex justify-between items-center w-full border-t border-slate-800/80 pt-6">
        <div className="flex items-center gap-2 text-slate-400 text-[14px] font-bold">
          <span>지금 D-VIEW 모바일 앱/웹에서 실시간 동탄 주거 안심 분석 지표를 확인하세요.</span>
        </div>
        <div className="text-[#ea6100] text-[16px] font-black tracking-wider uppercase">
          DONGTANVIEW.COM
        </div>
      </div>
    </div>
  );
});

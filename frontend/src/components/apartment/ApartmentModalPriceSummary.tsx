import React from 'react';
import type { FieldReportData } from '@/lib/types/report.types';
import type { AptTxSummary } from '@/lib/types/transaction';
import { normalize84Price } from '@/lib/utils/valuation';

export interface ApartmentModalPriceSummaryProps {
  report: FieldReportData;
  txSummary?: AptTxSummary;
  transactions?: any[];
  valuation?: {
    status?: 'undervalued' | 'overvalued' | 'fair';
    amount?: string;
    ratio?: number;
    priceStr?: string;
  };
}

export const ApartmentModalPriceSummary = React.memo(function ApartmentModalPriceSummary({
  report: _report,
  txSummary,
  transactions = [],
  valuation,
}: ApartmentModalPriceSummaryProps) {
  const saleTxs = transactions.filter(t => !t.dealType || (t.dealType !== '전세' && t.dealType !== '월세'));
  const jeonseTxs = transactions.filter(t => t.dealType === '전세');

  const latestSale = saleTxs[0];
  const latestJeonse = jeonseTxs[0];

  const salePrice = latestSale ? latestSale.price : (txSummary?.latestPrice || 0);
  const jeonsePrice = latestJeonse ? (latestJeonse.deposit || 0) : (txSummary?.latestRentDeposit || 0);

  const saleEok = Math.floor(salePrice / 10000);
  const saleMan = salePrice % 10000;
  const saleStr = salePrice > 0 ? (saleMan > 0 ? `${saleEok}억 ${saleMan.toLocaleString()}만` : `${saleEok}억`) : '-';

  const jeonseEok = Math.floor(jeonsePrice / 10000);
  const jeonseMan = jeonsePrice % 10000;
  const jeonseStr = jeonsePrice > 0 ? (jeonseMan > 0 ? `${jeonseEok}억 ${jeonseMan.toLocaleString()}만` : `${jeonseEok}억`) : '-';

  const gap = salePrice > 0 && jeonsePrice > 0 ? salePrice - jeonsePrice : 0;
  const gapEok = Math.floor(gap / 10000);
  const gapMan = gap % 10000;
  const gapStr = gap > 0 ? (gapMan > 0 ? `${gapEok}억 ${gapMan.toLocaleString()}만` : `${gapEok}억`) : '-';

  const ratio = salePrice > 0 && jeonsePrice > 0 ? (jeonsePrice / salePrice) * 100 : 0;

  // 84m2 normalized price
  const norm84 = latestSale ? normalize84Price(latestSale.price, latestSale.area) : 0;
  const norm84Eok = Math.floor(norm84 / 10000);
  const norm84Man = norm84 % 10000;
  const norm84Str = norm84 > 0 ? (norm84Man > 0 ? `${norm84Eok}억 ${norm84Man.toLocaleString()}만` : `${norm84Eok}억`) : '-';

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-surface/50 dark:bg-surface/30 rounded-2xl border border-border/40">
      <div className="flex flex-col gap-1 p-3 bg-body/50 rounded-xl border border-border/20">
        <span className="text-[11px] font-bold text-tertiary">최근 실거래가</span>
        <span className="text-[16px] font-extrabold text-primary">{saleStr}</span>
      </div>

      <div className="flex flex-col gap-1 p-3 bg-body/50 rounded-xl border border-border/20">
        <span className="text-[11px] font-bold text-tertiary">최근 전세가</span>
        <span className="text-[16px] font-extrabold text-[#ea6100]">{jeonseStr}</span>
      </div>

      <div className="flex flex-col gap-1 p-3 bg-body/50 rounded-xl border border-border/20">
        <span className="text-[11px] font-bold text-tertiary">실구매 갭</span>
        <div className="flex items-baseline gap-1">
          <span className="text-[16px] font-extrabold text-teal-600 dark:text-teal-400">{gapStr}</span>
          {ratio > 0 && <span className="text-[10.5px] font-bold text-secondary">({ratio.toFixed(1)}%)</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1 p-3 bg-body/50 rounded-xl border border-border/20">
        <span className="text-[11px] font-bold text-tertiary">국평(84㎡) 환산</span>
        <div className="flex items-baseline gap-1">
          <span className="text-[16px] font-extrabold text-primary">{norm84Str}</span>
          {valuation?.status === 'undervalued' && (
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">저평가</span>
          )}
        </div>
      </div>
    </div>
  );
});

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Database } from 'lucide-react';

export interface EditorialAuthorBoxProps {
  authorName: string;
  publishedDate: string;
  updatedDate?: string;
  className?: string;
}

export default function EditorialAuthorBox({
  authorName,
  publishedDate,
  updatedDate,
  className = '',
}: EditorialAuthorBoxProps) {
  const effectiveDate = updatedDate || publishedDate;

  return (
    <aside
      data-testid="editorial-author-box"
      aria-label="편집자 프로필 및 데이터 검증 기준"
      className={`rounded-2xl bg-elevated border border-border/60 p-4 sm:p-5 space-y-3 tabular-nums ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#eff1f5] dark:bg-[#1e2532] text-primary inline-flex items-center justify-center shrink-0">
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-black text-primary truncate">
            {authorName}
          </div>
          <div className="text-[11.5px] font-semibold text-tertiary">
            최초 작성 {publishedDate}
            {updatedDate && updatedDate !== publishedDate ? ` · 최종 실거래 검증 ${effectiveDate}` : ''}
          </div>
        </div>
      </div>

      <div className="pt-2.5 border-t border-border flex items-start gap-2 text-[12px] text-secondary leading-relaxed break-keep">
        <Database size={14} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          본 리포트는 국토교통부 실거래가 공개시스템, 한국산업단지공단, 화성시청 공개 자료를 매일 대조해 작성·갱신합니다. 자세한 검증 기준은{' '}
          <Link href="/about#about-editorial-standards" prefetch={false} className="font-bold text-primary underline underline-offset-2 hover:text-secondary">
            편집 원칙
          </Link>
          에서 확인하실 수 있으며, 정정이 필요한 항목은{' '}
          <Link href="/contact" prefetch={false} className="font-bold text-primary underline underline-offset-2 hover:text-secondary">
            오류 제보
          </Link>
          로 알려주시면 확인 즉시 반영합니다.
        </p>
      </div>
    </aside>
  );
}

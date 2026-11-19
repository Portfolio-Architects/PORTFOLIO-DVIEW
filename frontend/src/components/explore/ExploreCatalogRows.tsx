'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Compact numeric/dedup tuple serialized across the RSC boundary for `/explore` SSR semantic catalog rows.
 * Omits repeated `"정보 없음"`, `"만원"`, `"억원"`, `"세대"` strings and omits `slug` when equal to `name`,
 * reducing `/explore` `__next_f` catalog payload from ~345KB down to ~15KB while emitting 100% identical SSR HTML.
 *
 * Tuple order: [name, slugIfDifferent, dong, yearBuilt, householdStrOrNum, salesPriceManwon, rentPriceManwon, hasDetail]
 */
export type CompactExploreCatalogRow = readonly [
  name: string,
  slugIfDifferent: string,
  dong: string,
  yearBuilt: string,
  households: number | string,
  salesPrice: number,
  rentPrice: number,
  hasDetail: 0 | 1,
];

function formatPrice(val: number): string {
  if (!val || val === 0) return '정보 없음';
  const eok = Math.floor(val / 10000);
  const remainder = Math.round(val % 10000);
  if (eok === 0) return `${remainder.toLocaleString('ko-KR')}만원`;
  if (remainder === 0) return `${eok}억원`;
  return `${eok}억 ${remainder.toLocaleString('ko-KR')}만원`;
}

function formatHouseholds(val: number | string): string {
  if (typeof val === 'number') {
    return val > 0 ? `${val.toLocaleString('ko-KR')}세대` : '정보 없음';
  }
  return val && val !== '0' ? `${val}세대` : '정보 없음';
}

interface ExploreCatalogRowsProps {
  rows: readonly CompactExploreCatalogRow[];
}

export default function ExploreCatalogRows({ rows }: ExploreCatalogRowsProps) {
  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="py-4 text-center text-slate-500 dark:text-slate-400">
          등록된 실거래 내역이 없습니다.
        </td>
      </tr>
    );
  }

  return (
    <>
      {rows.map(([name, slugDiff, dong, yearBuilt, households, salesPrice, rentPrice, hasDetail]) => {
        const canonicalSlug = slugDiff || name;
        const ratio = salesPrice > 0 && rentPrice > 0 ? Math.round((rentPrice / salesPrice) * 100) : 0;
        return (
          <tr key={`${dong}-${name}`}>
            <td>
              {hasDetail === 1 ? (
                <Link href={`/apartment/${encodeURIComponent(canonicalSlug)}`} prefetch={false}>
                  {name}
                </Link>
              ) : (
                <span>{name}</span>
              )}
            </td>
            <td>{dong}</td>
            <td>{yearBuilt || '정보 없음'}</td>
            <td>{formatHouseholds(households)}</td>
            <td>{formatPrice(salesPrice)}</td>
            <td>{formatPrice(rentPrice)}</td>
            <td data-ratio={ratio > 0 ? '1' : '0'}>{ratio > 0 ? `${ratio}%` : '정보 없음'}</td>
          </tr>
        );
      })}
    </>
  );
}

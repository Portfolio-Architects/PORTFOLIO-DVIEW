'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/services/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('app.Error', 'Route error occurred', undefined, error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#fff0f1] flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-toss-red" />
        </div>
        <h2 className="text-xl font-extrabold text-primary mb-2">
          페이지를 불러올 수 없어요
        </h2>
        <p className="text-[14px] text-[#6b7684] leading-relaxed mb-8">
          데이터를 가져오는 중 문제가 발생했습니다.<br />
          네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-[#c44d00] dark:bg-[#ff8f00] text-surface rounded-xl font-bold text-[14px] hover:bg-[#9e3c00] dark:hover:bg-[#c44d00] transition-colors shadow-lg shadow-[#ea6100]/20"
          >
            <RefreshCw size={16} />
            다시 시도
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-body text-secondary rounded-xl font-bold text-[14px] hover:bg-[#e5e8eb] transition-colors"
          >
            <Home size={16} />
            홈으로
          </Link>
        </div>
        {error.message && (
          <details className="mt-8 text-left">
            <summary className="text-[12px] text-[#adb5bd] cursor-pointer hover:text-[#6b7684]">
              오류 상세 정보
            </summary>
            <pre className="mt-2 p-3 bg-[#f8f9fa] rounded-lg text-[11px] text-[#868e96] overflow-x-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

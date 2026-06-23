'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/services/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('app.GlobalError', 'Global error occurred', undefined, error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="antialiased">
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            background: 'white',
            borderRadius: '20px',
            padding: '3rem 2rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <div style={{
              width: '64px', height: '64px',
              borderRadius: '16px',
              background: '#fff0f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <AlertTriangle size={32} color="#f04452" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#191f28', margin: '0 0 0.5rem' }}>
              앗, 문제가 발생했어요
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#6b7684', lineHeight: 1.6, margin: '0 0 2rem' }}>
              예상치 못한 오류가 발생했습니다.<br />
              잠시 후 다시 시도하거나 새로고침 해주세요.
            </p>
            <button
              onClick={reset}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 28px',
                background: '#00d29d', color: 'white',
                border: 'none', borderRadius: '12px',
                fontSize: '0.95rem', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={18} />
              다시 시도
            </button>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#adb5bd', marginTop: '1.5rem' }}>
                오류 코드: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}

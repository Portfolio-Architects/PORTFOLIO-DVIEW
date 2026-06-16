'use client';

import React from 'react';
import { X, ArrowRight } from 'lucide-react';

interface LoginGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  onLogin: () => void;
}

export default function LoginGateModal({ isOpen, onClose, message, onLogin }: LoginGateModalProps) {
  const [isInApp, setIsInApp] = React.useState(false);
  const [copySuccess, setCopySuccess] = React.useState(false);
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;
    const userAgent = navigator.userAgent.toLowerCase();
    const isKakao = /kakaotalk/i.test(userAgent);
    const isNaver = /naver/i.test(userAgent);
    const isLine = /line/i.test(userAgent);
    const isInstagram = /instagram/i.test(userAgent);
    const isFacebook = /fb_iab|fb4a|fban|fbios/i.test(userAgent);
    const isTwitter = /twitter|twttr/i.test(userAgent);
    setIsInApp(isKakao || isNaver || isLine || isInstagram || isFacebook || isTwitter);
  }, [isOpen]);

  const handleCopyLink = async () => {
    const text = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (mountedRef.current) {
          setCopySuccess(true);
        }
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setCopySuccess(false);
          }
        }, 2000);
        return;
      }
    } catch (e) {
      console.warn('Clipboard write failed, falling back:', e);
    }
    
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        if (mountedRef.current) {
          setCopySuccess(true);
        }
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setCopySuccess(false);
          }
        }, 2000);
      }
    } catch (err) {
      alert('주소 복사에 실패했습니다. 직접 복사해주세요.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative bg-slate-900/95 dark:bg-slate-950/95 border border-emerald-500/30 max-w-md w-full p-6 sm:p-8 rounded-[32px] shadow-[0_20px_50px_rgba(16,185,129,0.15)] flex flex-col items-center text-center animate-in zoom-in-95 ease-[cubic-bezier(0.34,1.56,0.64,1)] duration-300 z-10 text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors border border-emerald-500/10"
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        {/* Standardized EMERALD Diamond Logo Specs */}
        <div className="mb-6 relative">
          <svg width="80" height="80" viewBox="0 0 200 200" className="text-emerald-500 fill-none drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            {/* Outer Frame */}
            <path d="M100 24 L176 100 L100 176 L24 100 Z" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            {/* Inner Frame */}
            <path d="M100 42 L158 100 L100 158 L42 100 Z" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            {/* Center Core */}
            <path d="M100 65 L135 100 L100 135 L65 100 Z" stroke="currentColor" strokeWidth="4" opacity="1" className="animate-pulse" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-[19px] sm:text-[21px] font-black leading-snug tracking-tight mb-3">
          {isInApp ? '외부 브라우저로 접속해 주세요' : '로그인이 필요한 기능입니다'}
        </h2>

        {/* Customized Message */}
        <p className="text-[13px] sm:text-[14px] text-slate-300 leading-relaxed break-keep mb-7">
          {isInApp 
            ? '구글 보안 정책으로 인해 카카오톡/네이버 등의 인앱 브라우저에서는 구글 로그인이 불가능합니다. 우측 상단의 메뉴(︙)에서 "다른 브라우저로 열기"를 선택하시거나, 아래 버튼을 눌러 주소를 복사한 후 Safari 또는 Chrome에서 실행해 주세요.' 
            : message}
        </p>

        {/* Action Button */}
        {isInApp ? (
          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-[14.5px] font-extrabold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] shadow-lg ${
              copySuccess 
                ? 'bg-emerald-600 border border-emerald-600 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <svg className="w-5 h-5 fill-none stroke-current" strokeWidth={2.5} viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copySuccess ? '링크 복사 완료!' : '주소(URL) 복사하기'}</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={() => {
              onLogin();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[14.5px] font-extrabold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] shadow-lg shadow-emerald-900/20"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.1 15.42 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.985 0-.74-.08-1.3-.176-1.855H12.24z"/>
            </svg>
            <span>Google 계정으로 로그인</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        )}
        
        {/* Secondary Dismiss Text Link */}
        <button 
          onClick={onClose}
          className="mt-4 text-[12px] font-bold text-slate-400 hover:text-slate-200 transition-colors hover:underline"
        >
          나중에 하기
        </button>
      </div>
    </div>
  );
}

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
          로그인이 필요한 기능입니다
        </h2>

        {/* Customized Message */}
        <p className="text-[13px] sm:text-[14px] text-slate-300 leading-relaxed break-keep mb-7">
          {message}
        </p>

        {/* Social Google Login Button (Toss-style layout) */}
        <button
          onClick={() => {
            onLogin();
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[14.5px] font-extrabold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] shadow-lg shadow-emerald-900/20"
        >
          {/* Simple Google Icon Simulation inside CSS */}
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.1 15.42 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.985 0-.74-.08-1.3-.176-1.855H12.24z"/>
          </svg>
          <span>Google 계정으로 로그인</span>
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
        
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

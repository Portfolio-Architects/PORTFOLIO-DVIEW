'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Mail, MessageSquare, Clock, Globe, Send } from 'lucide-react';
import { logger } from '@/lib/services/logger';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { throttle } from '@/lib/utils/firestoreThrottle';

export default function ContactClient() {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value || '';
    const email = emailRef.current?.value || '';
    const type = typeRef.current?.value || 'other';
    const message = messageRef.current?.value || '';

    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    
    // Map inquiry type value to a readable label
    const typeLabels: Record<string, string> = {
      report: '데이터 오류 제보',
      idea: '서비스 기능 제안',
      business: '광고 문의/제휴',
      other: '기타 일반 문의'
    };
    const typeLabel = typeLabels[type] || '기타 문의';

    try {
      await throttle(() => addDoc(collection(db, 'adInquiries'), {
        companyName: `[${typeLabel}] ${name.trim()}`,
        contactInfo: email.trim(),
        message: message.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      }));
      setIsSuccess(true);
      if (nameRef.current) nameRef.current.value = '';
      if (emailRef.current) emailRef.current.value = '';
      if (messageRef.current) messageRef.current.value = '';
    } catch (error) {
      logger.error('ContactClient.submit', 'Failed to submit feedback to Firestore', { name, email }, error as Error);
      alert('접수 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* 고객 문의 안내 */}
      <div className="md:col-span-1 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">D-VIEW와 소통하세요</h2>
          <p className="mt-2 text-[12px] sm:text-[13px] text-secondary leading-relaxed font-medium">
            서비스 개선을 위한 다양한 아이디어, 아파트 인프라 정보 정정 요청, 광고 제안 및 비즈니스 제휴 문의를 환영합니다.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <h4 className="text-[12px] font-extrabold text-tertiary">대표 이메일</h4>
              <p className="text-[13px] font-bold text-primary mt-0.5">ocs5672@gmail.com</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h4 className="text-[12px] font-extrabold text-tertiary">답변 예상 시간</h4>
              <p className="text-[13px] font-bold text-primary mt-0.5">평일 기준 24시간 이내</p>
            </div>
          </div>

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

      {/* 문의 작성 폼 */}
      <div className="md:col-span-2 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
        <h3 className="text-[16px] sm:text-[18px] font-extrabold text-primary mb-6 tracking-tight flex items-center gap-2">
          <Globe size={18} className="text-emerald-500" />
          온라인 피드백 접수
        </h3>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-[#e6f4f2] dark:bg-[#ea6100]/10 text-[#ea6100] dark:text-[#00d29d] rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Send size={28} className="ml-0.5 mt-0.5 text-[#ea6100] dark:text-[#00d29d]" />
            </div>
            <h3 className="text-[20px] font-extrabold text-primary mb-2">피드백이 성공적으로 접수되었습니다!</h3>
            <p className="text-[14px] text-secondary leading-relaxed mb-6">
              소중한 의견에 대단히 감사드립니다.<br />
              보내주신 피드백은 D-VIEW 데이터 랩스 담당자가 꼼꼼히 확인하고 검토하겠습니다.
            </p>
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="px-6 py-2.5 rounded-xl bg-body border border-border text-primary font-bold text-[13px] hover:bg-black/5 transition-colors cursor-pointer"
            >
              추가 문의 작성하기
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="user-name" className="block text-[12px] font-extrabold text-secondary mb-1">
                성함 / 닉네임 <span className="text-[#ff3b30]">*</span>
              </label>
              <input
                type="text"
                id="user-name"
                ref={nameRef}
                placeholder="홍길동"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-body focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[13px] font-medium text-primary transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="user-email" className="block text-[12px] font-extrabold text-secondary mb-1">
                이메일 주소 (답변 수신용) <span className="text-[#ff3b30]">*</span>
              </label>
              <input
                type="email"
                id="user-email"
                ref={emailRef}
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
                ref={typeRef}
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
                상세 내용 <span className="text-[#ff3b30]">*</span>
              </label>
              <textarea
                id="user-message"
                ref={messageRef}
                rows={6}
                placeholder="문의하실 내용을 구체적으로 적어주세요. 단지 정보 정정의 경우 단지 이름과 실측 정보(예: 초등학교 도보 7분 등)를 기재해 주시면 빠른 반영에 큰 도움이 됩니다."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-body focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-[13px] font-medium text-primary transition-all resize-none"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:bg-secondary/20 disabled:text-tertiary text-white font-extrabold text-[14px] transition-colors shadow-sm cursor-pointer border-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    보내기
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

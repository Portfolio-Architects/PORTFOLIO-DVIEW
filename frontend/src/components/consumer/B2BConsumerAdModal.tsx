'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, GraduationCap, Brush, Sparkles, Phone, MessageSquare, Calendar, Home, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { throttle } from '@/lib/utils/firestoreThrottle';

interface B2BConsumerAdModalProps {
  onClose: () => void;
  adType: 'insurance' | 'interior' | 'academy' | 'cleaning';
  adTitle: string;
  apartmentName: string;
  dong: string;
  yearBuilt?: string | number;
}

const B2BConsumerAdModal = React.memo(function B2BConsumerAdModal({
  onClose,
  adType,
  adTitle,
  apartmentName,
  dong,
  yearBuilt
}: B2BConsumerAdModalProps) {
  // 공통 필드
  const [clientName, setClientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');

  // 학원 관련 필드
  const [studentGrade, setStudentGrade] = useState('elementary_low');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // 인테리어 관련 필드
  const [interiorScope, setInteriorScope] = useState('full');
  const [interiorBudget, setInteriorBudget] = useState('budget_20_30');
  const [pyeong, setPyeong] = useState('34');

  // 이사/청소 관련 필드
  const [serviceDate, setServiceDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // 학원 과목 토글
  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !phoneNumber.trim()) {
      alert('이름과 연락처를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    // adType별 맞춤 데이터 구성
    const customData: Record<string, any> = {};
    if (adType === 'academy') {
      customData.studentGrade = studentGrade;
      customData.selectedSubjects = selectedSubjects;
    } else if (adType === 'interior') {
      customData.interiorScope = interiorScope;
      customData.interiorBudget = interiorBudget;
      customData.pyeong = pyeong;
    } else if (adType === 'cleaning') {
      customData.serviceDate = serviceDate;
    }

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    try {
      if (db) {
        await throttle(() => addDoc(collection(db, 'ad_inquiries'), {
          adType,
          adTitle,
          apartmentName,
          dong,
          yearBuilt: yearBuilt || '',
          clientName: clientName.trim(),
          phoneNumber: phoneNumber.trim(),
          message: message.trim(),
          customData,
          status: 'pending',
          createdAt: serverTimestamp()
        }));
      }
      if (!mountedRef.current) return;
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      setIsSuccess(true);
      successTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          onClose();
          successTimeoutRef.current = null;
        }
      }, 2500);
    } catch (error) {
      console.error('Error submitting B2B Lead:', error);
      alert('접수 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // UI 테마 색상 설정
  const getThemeStyles = () => {
    switch (adType) {
      case 'academy':
        return {
          icon: <GraduationCap className="text-indigo-500" size={22} />,
          badgeColor: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30',
          btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/10 focus:ring-indigo-500',
          title: '우수 학원가 매칭 신청',
          subtitle: '단지 인근 학원의 무료 레벨 테스트 및 맞춤 셔틀 노선 상담을 신청해 보세요.',
          themeColor: 'indigo'
        };
      case 'interior':
        return {
          icon: <Brush className="text-amber-500" size={22} />,
          badgeColor: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/10 focus:ring-amber-500',
          title: '우수 인테리어 비교 견적',
          subtitle: '우리 아파트 시공 실적이 있는 검증된 인테리어 파트너사의 최적 시안을 제안해 드립니다.',
          themeColor: 'amber'
        };
      case 'cleaning':
      default:
        return {
          icon: <Sparkles className="text-emerald-500" size={22} />,
          badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/10 focus:ring-emerald-500',
          title: '이사 / 입주 청소 신청',
          subtitle: '단지 맞춤형 프리미엄 청소 서비스 및 제휴 할인가 혜택을 드립니다.',
          themeColor: 'emerald'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-border/20 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-body">
          <div className="flex items-center gap-2">
            <div className="bg-white dark:bg-surface p-1.5 rounded-xl border border-border/40 shadow-sm">
              {theme.icon}
            </div>
            <div>
              <h2 className="text-[17px] font-black text-primary tracking-tight">
                {theme.title}
              </h2>
              <p className="text-[11.5px] text-tertiary font-bold tracking-tight">DVIEW 제휴 서비스</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-body rounded-full transition-colors cursor-pointer border-none bg-transparent">
            <X size={20} className="text-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5 custom-scrollbar">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="w-16 h-16 bg-[#e6f4f2] dark:bg-[#0d9488]/10 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-inner animate-pulse">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-[19px] font-black text-primary mb-2">무료 상담 신청 완료!</h3>
              <p className="text-[13.5px] text-secondary leading-relaxed">
                제휴 파트너사에 연락처가 안전하게 전달되었습니다.<br />
                남겨주신 번호로 담당자가 영업일 기준 24시간 내에<br />
                친절히 안내해 드릴 예정입니다.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-body to-body/50 border border-border/40">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${theme.badgeColor}`}>
                  {apartmentName} 제휴
                </span>
                <p className="text-[12.5px] text-secondary font-semibold leading-relaxed mt-2">
                  {theme.subtitle}
                </p>
              </div>

              {/* 기본 필수 필드 */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-extrabold text-primary flex items-center gap-1.5">
                  상담 고객명 <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예) 홍길동"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-body border border-border rounded-xl text-[13.5px] text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-extrabold text-primary flex items-center gap-1.5">
                  <Phone size={13} className="text-tertiary" />
                  연락처 <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="예) 010-1234-5678"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-body border border-border rounded-xl text-[13.5px] text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all font-medium"
                />
              </div>

              {/* 1. 학원 분기 필드 */}
              {adType === 'academy' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-extrabold text-primary">자녀 학년</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'elementary_low', label: '초등 저학년 (1-3학년)' },
                        { id: 'elementary_high', label: '초등 고학년 (4-6학년)' },
                        { id: 'middle', label: '중학생' },
                        { id: 'high', label: '고등학생' }
                      ].map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setStudentGrade(g.id)}
                          className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                            studentGrade === g.id
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-400'
                              : 'bg-body border-border text-secondary hover:bg-body/80'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-extrabold text-primary">관심 교육 과목 (중복 선택)</label>
                    <div className="flex flex-wrap gap-2">
                      {['영어', '수학', '국어/독서', '논술/토론', '과학/코딩', '음악/미술/체육'].map(sub => {
                        const isSelected = selectedSubjects.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => handleSubjectToggle(sub)}
                            className={`px-3 py-1.5 rounded-full text-[11.5px] font-black border transition-all ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-body border-border text-secondary hover:bg-body/80'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* 2. 인테리어 분기 필드 */}
              {adType === 'interior' && (
                <>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[12.5px] font-extrabold text-primary flex items-center gap-1">
                        <Home size={13} className="text-tertiary" />
                        분양 / 전용 면적
                      </label>
                      <input
                        type="text"
                        placeholder="예) 34평형"
                        value={pyeong}
                        onChange={e => setPyeong(e.target.value)}
                        className="w-full px-4 py-2.5 bg-body border border-border rounded-xl text-[13.5px] text-primary focus:outline-none focus:ring-2 focus:ring-[#0d9488] transition-all font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12.5px] font-extrabold text-primary">시공 희망 범위</label>
                      <select
                        value={interiorScope}
                        onChange={e => setInteriorScope(e.target.value)}
                        className="w-full px-3 py-2.5 bg-body border border-border rounded-xl text-[13.5px] text-primary focus:outline-none focus:ring-2 focus:ring-[#0d9488] transition-all font-semibold"
                      >
                        <option value="full">전체 인테리어</option>
                        <option value="partial">부분 시공 (주방/바스 등)</option>
                        <option value="stylist">도배/필름/조명 스타일링</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-extrabold text-primary">예상 예산 범위</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'under_15', label: '1,500만 이하' },
                        { id: 'budget_15_30', label: '1,500만 - 3,000만' },
                        { id: 'budget_30_50', label: '3,000만 - 5,000만' },
                        { id: 'budget_50_80', label: '5,000만 - 8,000만' },
                        { id: 'over_80', label: '8,000만 이상' },
                        { id: 'not_sure', label: '미정' }
                      ].map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setInteriorBudget(b.id)}
                          className={`px-2 py-2 rounded-xl text-[11px] font-black border transition-all truncate ${
                            interiorBudget === b.id
                              ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-400'
                              : 'bg-body border-border text-secondary hover:bg-body/80'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 3. 이사/청소 분기 필드 */}
              {adType === 'cleaning' && (
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-extrabold text-primary flex items-center gap-1.5">
                    <Calendar size={13} className="text-tertiary" />
                    시공 희망 예정일
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={e => setServiceDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-body border border-border rounded-xl text-[13.5px] text-primary focus:outline-none focus:ring-2 focus:ring-[#0d9488] transition-all font-semibold"
                  />
                </div>
              )}

              {/* 공통 상세 설명 입력 */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-extrabold text-primary flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-tertiary" />
                  기타 상담 요청사항 (선택)
                </label>
                <textarea
                  placeholder="예) 아파트 준공 연도에 맞춘 섀시 교체 여부 등 구체적인 고민을 알려주세요."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-body border border-border rounded-xl text-[13.5px] text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-[#0d9488] transition-all resize-none font-medium leading-relaxed"
                />
              </div>

              {/* 전송 버튼 */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !clientName.trim() || !phoneNumber.trim()}
                  className={`w-full ${theme.btnBg} disabled:bg-secondary/20 disabled:text-tertiary text-[14.5px] font-black py-3 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border-none`}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={15} />
                      무료 상담 신청서 제출
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});

B2BConsumerAdModal.displayName = 'B2BConsumerAdModal';
export default B2BConsumerAdModal;

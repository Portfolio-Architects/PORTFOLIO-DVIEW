'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Star, Camera, Send } from 'lucide-react';
import { useDashboardData, dashboardFacade } from '@/lib/DashboardFacade';
import { logger } from '@/lib/services/logger';

interface WriteReviewModalProps {
  onClose: () => void;
  userUid: string;
}

interface ReviewContentStepProps {
  selectedApt: string;
  userUid: string;
  isSubmitting: boolean;
  handleSubmit: (rating: number, content: string, imageFile: File | null) => Promise<void>;
  onPrev: () => void;
}

const ReviewContentStep = React.memo(function ReviewContentStep({
  selectedApt,
  isSubmitting,
  handleSubmit,
  onPrev,
}: ReviewContentStepProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus textarea on mount for better flow
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = () => {
    if (rating === 0 || !content.trim()) return;
    handleSubmit(rating, content, imageFile);
  };

  const RATING_EMOJIS = ['😡', '😟', '😐', '🙂', '🤩'];
  const RATING_LABELS = ['별로', '아쉬움', '보통', '좋음', '최고'];
  const RATING_COLORS = ['#f04452', '#ff6b35', '#ffc233', '#36b37e', '#00d29d'];

  return (
    <div>
      {/* Selected apt badge */}
      <div id="write-review-desc" className="bg-body rounded-xl px-4 py-2.5 mb-5 text-[13px] font-bold text-secondary truncate">
        📍 {selectedApt}
      </div>

      {/* Emoji Rating */}
      <div className="mb-5">
        <label className="block text-[13px] font-bold text-primary mb-3">별점을 매겨주세요</label>
        <div role="group" aria-label="별점 평가" className="flex items-center justify-center gap-3">
          {RATING_EMOJIS.map((emoji, idx) => {
            const r = idx + 1;
            const isSelected = rating === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRating(isSelected ? 0 : r)}
                aria-label={`${RATING_LABELS[idx]} 별점 ${r}점`}
                aria-pressed={isSelected}
                className="flex flex-col items-center gap-1 focus:outline-none"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-[24px] transition-all duration-200 will-change-transform ${
                    isSelected
                      ? 'scale-125 shadow-lg ring-2'
                      : rating > 0 && !isSelected
                        ? 'opacity-25 hover:opacity-60'
                        : 'opacity-50 hover:opacity-80 hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${RATING_COLORS[idx]}15` : 'transparent',
                    boxShadow: isSelected ? `0 0 0 2px ${RATING_COLORS[idx]}` : 'none',
                  }}
                >
                  {emoji}
                </div>
                <span
                  className={`text-[10px] font-bold transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                  style={{ color: RATING_COLORS[idx] }}
                >
                  {RATING_LABELS[idx]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <label htmlFor="review-content-input" className="block text-[13px] font-bold text-primary mb-2">한줄평</label>
        <textarea
          id="review-content-input"
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="이 단지에 대한 솔직한 한마디를 남겨주세요"
          rows={3}
          maxLength={200}
          className="w-full bg-body border border-toss-gray rounded-xl px-4 py-3 text-[14px] outline-none focus:border-toss-blue focus:bg-surface transition-colors resize-none focus:ring-4 focus:ring-toss-blue/10"
        />
        <div className="text-right text-[11px] text-tertiary mt-1">{content.length}/200</div>
      </div>

      {/* Optional Photo */}
      <div className="mb-5">
        <label className="block text-[13px] font-bold text-primary mb-2">사진 (선택)</label>
        {imagePreview ? (
          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              type="button"
              aria-label="선택한 사진 삭제"
              className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-surface"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 bg-body hover:bg-[#e5e8eb] rounded-xl text-[13px] font-bold text-secondary transition-colors"
          >
            <Camera size={16} className="text-toss-blue" />
            사진 추가
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onPrev}
          type="button"
          className="w-1/3 py-3.5 rounded-xl font-bold bg-body text-secondary active:bg-[#e5e8eb] transition-colors text-[14px]"
        >
          이전
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting || rating === 0 || !content.trim()}
          className={`flex-1 py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${
            rating > 0 && content.trim()
              ? 'bg-primary text-surface active:scale-[0.98]'
              : 'bg-body text-tertiary cursor-not-allowed'
          }`}
        >
          {isSubmitting ? '저장 중...' : <><Send size={14} /> 리뷰 등록</>}
        </button>
      </div>
    </div>
  );
});

ReviewContentStep.displayName = 'ReviewContentStep';

const WriteReviewModal = React.memo(function WriteReviewModal({ onClose, userUid }: WriteReviewModalProps) {
  const { dongtanApartments } = useDashboardData();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDong, setSelectedDong] = useState('');
  const [selectedApt, setSelectedApt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstChipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    mountedRef.current = true;

    // Auto focus first chip on step 1 mount
    if (step === 1 && firstChipRef.current) {
      firstChipRef.current.focus();
    }

    // Escape key handling
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, step]);

  // Focus Trap Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [role="button"]:not([disabled])'
      );
      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  const availableDongs = Array.from(
    new Set(dongtanApartments.map(apt => apt.match(/\[(.*?)\]/)?.[1]).filter(Boolean))
  ) as string[];
  const filteredApts = dongtanApartments.filter(apt => apt.includes(`[${selectedDong}]`));

  const handleSubmit = React.useCallback(async (rating: number, content: string, imageFile: File | null) => {
    if (!selectedApt || rating === 0 || !content.trim()) return;
    setIsSubmitting(true);
    try {
      await dashboardFacade.addUserReview(selectedApt, rating, content, userUid, imageFile || undefined);
      if (mountedRef.current) {
        onClose();
      }
    } catch (error) {
      logger.error('WriteReviewModal.handleSubmit', 'Review submission failed', undefined, error);
      alert("리뷰 저장에 실패했습니다. (" + (error instanceof Error ? error.message : String(error)) + ")");
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [selectedApt, userUid, onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" 
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="write-review-title"
        aria-describedby="write-review-desc"
        onKeyDown={handleKeyDown}
        className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 id="write-review-title" className="text-[18px] font-extrabold text-primary">
            {step === 1 ? '어떤 단지인가요?' : '리뷰 작성'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-body rounded-full transition-colors"
            aria-label="리뷰 작성 창 닫기"
          >
            <X size={20} className="text-tertiary" />
          </button>
        </div>

        {/* Step 1: Select Apartment */}
        {step === 1 && (
          <div>
            {/* Dong chips */}
            <div role="group" aria-label="행정동 선택" className="flex gap-2 overflow-x-auto pb-3 mb-3">
              {availableDongs.map((dong, idx) => (
                <button
                  key={dong}
                  ref={idx === 0 ? firstChipRef : undefined}
                  onClick={() => { setSelectedDong(dong); setSelectedApt(''); }}
                  aria-pressed={selectedDong === dong}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all border ${
                    selectedDong === dong
                      ? 'bg-primary text-surface border-[#191f28]'
                      : 'bg-surface text-secondary border-toss-gray hover:border-toss-blue'
                  }`}
                >
                  {dong}
                </button>
              ))}
            </div>

            {/* Apartment list */}
            {selectedDong ? (
              <div id="write-review-desc" role="group" aria-label="아파트 단지 목록" className="bg-body border border-toss-gray rounded-xl overflow-hidden max-h-52 overflow-y-auto p-2">
                {filteredApts.map(apt => (
                  <button
                    key={apt}
                    onClick={() => setSelectedApt(apt)}
                    aria-pressed={selectedApt === apt}
                    className={`w-full text-left px-4 py-2.5 text-[13px] font-medium rounded-lg transition-colors ${
                      selectedApt === apt
                        ? 'bg-toss-blue-light text-toss-blue font-bold'
                        : 'text-primary hover:bg-body'
                    }`}
                  >
                    {apt}
                  </button>
                ))}
              </div>
            ) : (
              <div id="write-review-desc" className="bg-body border border-dashed border-toss-gray rounded-xl p-8 text-center text-[13px] text-tertiary">
                위에서 <strong>동 이름</strong>을 선택해주세요
              </div>
            )}

            {/* Next */}
            <button
              onClick={() => selectedApt && setStep(2)}
              disabled={!selectedApt}
              className={`w-full mt-4 py-3.5 rounded-xl font-bold text-[14px] transition-all ${
                selectedApt
                  ? 'bg-toss-blue text-surface active:scale-[0.98]'
                  : 'bg-body text-tertiary cursor-not-allowed'
              }`}
            >
              다음
            </button>
          </div>
        )}

        {/* Step 2: Rating + Content */}
        {step === 2 && (
          <ReviewContentStep
            selectedApt={selectedApt}
            userUid={userUid}
            isSubmitting={isSubmitting}
            handleSubmit={handleSubmit}
            onPrev={() => setStep(1)}
          />
        )}
      </div>
    </div>
  );
});

WriteReviewModal.displayName = 'WriteReviewModal';
export default WriteReviewModal;

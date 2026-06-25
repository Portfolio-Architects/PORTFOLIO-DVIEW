import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Image as ImageIcon, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebaseConfig';
import { logger } from '@/lib/services/logger';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImage } from '@/lib/services/storage.service';
import { throttle } from '@/lib/utils/firestoreThrottle';

import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { useAuth } from '@/lib/contexts/AuthContext';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartmentId: string;
  apartmentName: string;
  user: User | null;
}

const CATEGORIES = [
  { id: 'gateImg', label: '정문' },
  { id: 'landscapeImg', label: '조경' },
  { id: 'parkingImg', label: '주차장' },
  { id: 'maintenanceImg', label: '공용부' },
  { id: 'communityImg', label: '커뮤니티' },
  { id: 'schoolImg', label: '통학로' },
  { id: 'commerceImg', label: '상권' },
  { id: '기타', label: '기타' },
];

export const PhotoUploadModal = React.memo(function PhotoUploadModal({ isOpen, onClose, apartmentId, apartmentName, user }: PhotoUploadModalProps) {
  const { handleLogin } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [category, setCategory] = useState<string>('gateImg');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Focus and Escape key management
  useEffect(() => {
    if (isOpen) {
      // Auto focus close button when modal opens
      const timer = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);

      // Escape key handling
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isUploading) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose, isUploading]);

  // Focus Trap Handler
  const handleFocusTrap = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  // Reset file, caption when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setCaption('');
    }
  }, [isOpen]);

  // Declarative Object URL lifecycle management to prevent memory leaks
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!isOpen || !mounted) return null;

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const selected = e.dataTransfer.files?.[0];
    if (selected && selected.type.startsWith('image/')) {
      if (selected.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하여야 합니다.');
        return;
      }
      setFile(selected);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith('image/')) {
      if (selected.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하여야 합니다.');
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    
    try {
      // 1. Upload to Storage
      const downloadUrl = await uploadImage(file, 'user_pending_photos');
      
      // 2. Save to Firestore pending queue
      const uploaderName = user?.displayName || user?.email?.split('@')[0] || '익명';
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
      await throttle(() => addDoc(collection(db, 'pending_photos'), {
        apartmentId,
        apartmentName,
        url: downloadUrl,
        locationTag: CATEGORIES.find(c => c.id === category)?.label || category,
        locationTagId: category,
        caption: caption.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        uploaderUid: user?.uid || 'anonymous',
        uploaderEmail: user?.email || 'anonymous',
        uploaderName,
      }));
      
      if (!mountedRef.current) return;
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      setIsSuccess(true);
      
      successTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          onClose();
          setIsSuccess(false);
          setFile(null);
          setPreviewUrl(null);
          setCaption('');
          successTimeoutRef.current = null;
        }
      }, 2000);
      
    } catch (error) {
      logger.error('PhotoUploadModal', 'Upload failed', { apartmentId, apartmentName }, error);
      alert('업로드 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      if (mountedRef.current) {
        setIsUploading(false);
      }
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="presentation"
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-upload-title"
        aria-describedby="photo-upload-desc"
        onKeyDown={handleFocusTrap}
        className="bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 id="photo-upload-title" className="text-[18px] font-bold text-primary flex items-center gap-2">
            <Camera className="text-toss-blue" size={20} aria-hidden="true" />
            우리 단지 사진 올리기
          </h2>
          <button 
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 -mr-2 text-tertiary hover:bg-body rounded-full transition-colors"
            disabled={isUploading}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div id="photo-upload-desc" className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 bg-toss-blue-light text-toss-blue rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-[20px] font-bold text-primary mb-2">등록이 완료되었습니다!</h3>
              <p className="text-[15px] text-secondary">관리자 검토 후 단지 갤러리에 반영됩니다.<br/>참여해 주셔서 감사합니다.</p>
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-body rounded-full flex items-center justify-center mb-5">
                <Camera size={32} className="text-tertiary" />
              </div>
              <h3 className="text-[18px] font-bold text-primary mb-2">로그인이 필요합니다</h3>
              <p className="text-[14px] text-secondary mb-6">
                단지 사진을 등록하려면<br />구글 로그인을 먼저 진행해 주세요.
              </p>
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-surface border border-border shadow-sm text-primary font-bold px-6 py-3 rounded-xl hover:bg-body transition-colors"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="구글 로그인 로고" className="w-5 h-5" />
                구글로 계속하기
              </button>
            </div>
          ) : (
            <>
              {/* Image Upload Area */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-bold text-secondary">사진 등록 (필수)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button 
                  type="button"
                  className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue
                    ${previewUrl 
                      ? 'border-transparent bg-black' 
                      : isDragging 
                        ? 'border-[#3182f6] bg-[#3182f6]/5' 
                        : 'border-border bg-body hover:bg-surface'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  aria-label={previewUrl ? '사진 변경하기' : '사진 등록하기 (드래그 앤 드롭 또는 클릭)'}
                >
                  {previewUrl ? (
                    <>
                      <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-bold flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
                          <Upload size={16} /> 변경하기
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-tertiary p-6 text-center">
                      <div className="w-12 h-12 bg-surface rounded-full shadow-sm flex items-center justify-center">
                        <ImageIcon size={24} className="text-toss-blue" />
                      </div>
                      <p className="text-[14px] font-medium">여기를 눌러 사진을 선택하세요<br/><span className="text-[12px] text-tertiary">(최대 10MB)</span></p>
                    </div>
                  )}
                </button>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-bold text-secondary">카테고리 (필수)</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`py-2 px-1 text-[13px] font-bold rounded-xl transition-colors
                        ${category === cat.id 
                          ? 'bg-toss-blue-light text-toss-blue border border-toss-blue/20' 
                          : 'bg-body text-secondary border border-transparent hover:bg-surface'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-bold text-secondary">간단한 설명 (선택)</label>
                <textarea
                  placeholder="예: 단지 내 메인 산책로 야경입니다."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-body border-none rounded-xl p-4 text-[15px] text-primary placeholder:text-tertiary focus:ring-2 focus:ring-toss-blue/30 focus:bg-surface transition-all resize-none h-24"
                  maxLength={100}
                />
                <div className="text-right text-[12px] text-tertiary font-medium">
                  {caption.length}/100
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {(!isSuccess && user) && (
          <div className="p-5 border-t border-border bg-surface">
            <button
              onClick={handleSubmit}
              disabled={!file || isUploading}
              className={`w-full py-4 rounded-xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all
                ${(!file || isUploading) ? 'bg-body text-tertiary cursor-not-allowed' : 'bg-toss-blue text-white hover:opacity-90 shadow-[0_4px_12px_rgba(49,130,246,0.2)]'}`}
            >
              {isUploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  업로드 중...
                </>
              ) : (
                '사진 등록하기'
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

PhotoUploadModal.displayName = 'PhotoUploadModal';

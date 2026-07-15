'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PenLine, X, ShieldCheck, Building2, ImagePlus, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { dashboardFacade } from '@/lib/DashboardFacade';
import * as UserRepo from '@/lib/repositories/user.repository';
import type { UserProfile } from '@/lib/types/user.types';
import { getDisplayName } from '@/lib/types/user.types';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/config/admin.config';
import { compressImage } from '@/lib/utils/imageCompression';
import { generateMamacafeNickname } from '@/lib/utils/nickname';
import { usePWA } from '@/components/pwa/PWAProvider';
import { enqueueOfflineRequest } from '@/lib/utils/offlineQueue';
import { useAuth } from '@/lib/contexts/AuthContext';
import { logger } from '@/lib/services/logger';


interface Props {
  currentTab: string;
  onRequestLogin?: (message: string) => void;
}

const MARKDOWN_TEMPLATE = `이웃 주민들과 나누고 싶은 실시간 동탄 소식을 알려주세요! 💚
(예: 동탄역 맛집, 아파트 셔틀 노선 변경, 학원가 라이딩 꿀팁 등)

## 💡 우리 아파트 단지의 매력/장점
(예: 동탄역 도보권이라 출퇴근이 정말 편해요, 초품아라 안심하고 키워요)

## 💬 실거주민만 아는 유용한 팁 & 주의점
(예: 금요일 저녁 주차장 꿀자리 위치, 인근 신규 마트 오픈 정보 등)

다른 이웃들의 동탄 살이에 도움이 되는 사소한 정보라면 무엇이든 대환영입니다!`;

const LoungeComposeClient = React.memo(function LoungeComposeClient({ currentTab, onRequestLogin }: Props) {
  const { user, userProfile, handleLogin } = useAuth();
  const router = useRouter();
  const { showToast } = usePWA();
  const submitLockRef = useRef(false);
  const [footerOffset, setFooterOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let activeFrame: number | null = null;
    
    const handleScroll = () => {
      if (activeFrame) return;
      activeFrame = window.requestAnimationFrame(() => {
        const footer = document.querySelector('footer');
        if (footer) {
          const footerRect = footer.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const offset = windowHeight - footerRect.top;
          setFooterOffset(offset > 0 ? offset : 0);
        }
        activeFrame = null;
      });
    };

    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setIsMobile(window.innerWidth < 640);
        
        // Also sync footer offset after resize settles
        const footer = document.querySelector('footer');
        if (footer) {
          const footerRect = footer.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const offset = windowHeight - footerRect.top;
          setFooterOffset(offset > 0 ? offset : 0);
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Initial sync
    setIsMobile(window.innerWidth < 640);
    const footer = document.querySelector('footer');
    if (footer) {
      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const offset = windowHeight - footerRect.top;
      setFooterOffset(offset > 0 ? offset : 0);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (activeFrame) window.cancelAnimationFrame(activeFrame);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);
  const isUserAdmin = isAdmin(user?.email);
  const isWritableCategory = 
    currentTab !== '동탄 부동산 뉴스' && 
    currentTab !== '동탄구 소식' && 
    (currentTab !== '매니저 임장기' || isUserAdmin);
  const [showCompose, setShowCompose] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const MARKDOWN_TEMPLATE = `이웃 주민들과 나누고 싶은 실시간 동탄 소식을 알려주세요! 💚
(예: 동탄역 맛집, 아파트 셔틀 노선 변경, 학원가 라이딩 꿀팁 등)

## 💡 우리 아파트 단지의 매력/장점
(예: 동탄역 도보권이라 출퇴근이 정말 편해요, 초품아라 안심하고 키워요)

## 💬 실거주민만 아는 유용한 팁 & 주의점
(예: 금요일 저녁 주차장 꿀자리 위치, 인근 신규 마트 오픈 정보 등)

다른 이웃들의 동탄 살이에 도움이 되는 사소한 정보라면 무엇이든 대환영입니다!`;

  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('우리동네 이야기');
  const [customNickname, setCustomNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const uploadFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rewardToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
      setMounted(false);
      if (uploadFocusTimeoutRef.current) {
        clearTimeout(uploadFocusTimeoutRef.current);
        uploadFocusTimeoutRef.current = null;
      }
      if (rewardToastTimeoutRef.current) {
        clearTimeout(rewardToastTimeoutRef.current);
        rewardToastTimeoutRef.current = null;
      }
    };
  }, []);

  // Generate initial mom-cafe nickname for non-admin users
  useEffect(() => {
    if (showCompose && !isUserAdmin && !customNickname) {
      setCustomNickname(generateMamacafeNickname());
    }
  }, [showCompose, isUserAdmin, customNickname]);

  const handleClose = useCallback(() => {
    const hasContent = postTitle.trim() !== '' || (postContent.trim() !== '' && postContent.trim() !== MARKDOWN_TEMPLATE.trim()) || customNickname.trim() !== '';
    if (hasContent) {
      if (confirm('작성 중인 내용이 있습니다. 정말 글쓰기 창을 닫으시겠습니까?')) {
        setShowCompose(false);
      }
    } else {
      setShowCompose(false);
    }
  }, [postTitle, postContent, customNickname]);

  // Prevent body scroll when compose modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!showCompose) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, [showCompose]);

  // Escape key handling with data loss prevention
  useEffect(() => {
    if (!showCompose) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const hasContent = postTitle.trim() !== '' || (postContent.trim() !== '' && postContent.trim() !== MARKDOWN_TEMPLATE.trim()) || customNickname.trim() !== '';
        if (hasContent) {
          if (confirm('작성 중인 내용이 있습니다. 정말 글쓰기 창을 닫으시겠습니까?')) {
            setShowCompose(false);
          }
        } else {
          setShowCompose(false);
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showCompose, postTitle, postContent, customNickname]);

  // Auto focus title input on mount
  useEffect(() => {
    if (showCompose) {
      const timer = setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showCompose]);

  // Focus trap keydown handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (mountedRef.current) {
      setIsUploadingImage(true);
    }
    try {
      const compressedFile = await compressImage(file);
      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `lounge_images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);

      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const mdImage = `\n![이미지](${url})\n`;
        const newText = postContent.substring(0, start) + mdImage + postContent.substring(end);
        if (mountedRef.current) {
          setPostContent(newText);
        }
        
        if (uploadFocusTimeoutRef.current) {
          clearTimeout(uploadFocusTimeoutRef.current);
          uploadFocusTimeoutRef.current = null;
        }
        uploadFocusTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && textarea) {
            textarea.focus();
            textarea.setSelectionRange(start + mdImage.length, start + mdImage.length);
          }
          uploadFocusTimeoutRef.current = null;
        }, 10);
      } else {
        if (mountedRef.current) {
          setPostContent(prev => prev + `\n![이미지](${url})\n`);
        }
      }
    } catch (error) {
      logger.error('LoungeComposeClient.handleImageUpload', 'Image upload failed', undefined, error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      if (mountedRef.current) {
        setIsUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  }, [postContent]);





  const displayAuthorName = isUserAdmin ? '매니저' : (userProfile ? getDisplayName(userProfile) : '익명');
  const displayApartment = isUserAdmin ? '마스터' : (userProfile?.verifiedApartment?.replace(/\[.*?\]\s*/, '') || '');

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current) return;
    
    const trimmedTitle = postTitle.trim();
    const trimmedContent = postContent.trim();
    
    if (!trimmedTitle) {
      alert('제목을 입력해 주세요.');
      return;
    }
    if (!trimmedContent) {
      alert('내용을 입력해 주세요.');
      return;
    }
    if (trimmedTitle.length > 200) {
      alert('제목은 최대 200자까지 작성할 수 있습니다.');
      return;
    }
    if (trimmedContent.length > 20000) {
      alert('내용은 최대 20,000자까지 작성할 수 있습니다.');
      return;
    }

    let activeUid = user?.uid;
    const activeEmail = user?.email || null;
    let activeAuthorName = displayAuthorName;
    let activeApartment = displayApartment;
    let activeVerificationLevel = isUserAdmin ? 'registry_verified' : (userProfile?.verificationLevel || '');

    if (!activeUid) {
      if (typeof window !== 'undefined') {
        let anonUid: string | null = null;
        try {
          anonUid = localStorage.getItem('dview-anon-uid');
          if (!anonUid) {
            anonUid = `anon-${Math.random().toString(36).substring(2, 12)}`;
            localStorage.setItem('dview-anon-uid', anonUid);
          }
        } catch (e) {
          logger.warn('LoungeComposeClient.submit', 'localStorage is unavailable', undefined, e as Error);
          anonUid = `anon-session-${Math.random().toString(36).substring(2, 12)}`;
        }
        activeUid = anonUid || 'anon-guest';
        
        let anonNickname = customNickname.trim();
        if (!anonNickname) {
          anonNickname = generateMamacafeNickname();
          setCustomNickname(anonNickname);
        }
        activeAuthorName = anonNickname;
      } else {
        activeUid = 'anon-guest';
        activeAuthorName = '익명';
      }
      activeApartment = '';
      activeVerificationLevel = '';
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        await enqueueOfflineRequest({
          url: '/api/posts',
          method: 'POST',
          body: {
            title: trimmedTitle,
            content: trimmedContent,
            category: postCategory,
            authorUid: activeUid,
            authorName: activeAuthorName,
            verifiedApartment: activeApartment,
            verificationLevel: activeVerificationLevel,
            imageUrl: null
          }
        });
        setPostTitle(''); setPostContent(''); setPostCategory('우리동네 이야기'); setCustomNickname(''); setShowCompose(false);
        showToast('네트워크가 연결되지 않아 글이 오프라인 큐에 저장되었습니다. 연결 시 자동으로 게시됩니다 💚');
        submitLockRef.current = false;
      } catch (err) {
        logger.error('LoungeComposeClient.onSubmit', 'Failed to enqueue post request', undefined, err);
        alert('글 작성에 실패했습니다.');
        submitLockRef.current = false;
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      await dashboardFacade.addPost(
        trimmedTitle, 
        trimmedContent, 
        postCategory, 
        activeUid, 
        undefined, 
        activeEmail,
        isUserAdmin ? undefined : activeAuthorName
      );
      if (mountedRef.current) {
        setPostTitle(''); setPostContent(''); setPostCategory('우리동네 이야기'); setCustomNickname(''); setShowCompose(false);
        showToast('글이 성공적으로 등록되었습니다! 이웃 주민의 피드백을 기대해 보세요 💚');
      }
      
      try {
        const apartments = dashboardFacade.getDongtanApartments ? dashboardFacade.getDongtanApartments() : [];
        if (apartments.length > 0) {
          const lockExpiry = Date.now() + 24 * 60 * 60 * 1000;
          apartments.forEach((aptName) => {
            localStorage.setItem(`dview-unlocked-apt-${aptName}`, lockExpiry.toString());
          });
          if (rewardToastTimeoutRef.current) {
            clearTimeout(rewardToastTimeoutRef.current);
            rewardToastTimeoutRef.current = null;
          }
          rewardToastTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              showToast('🎉 라운지 글 작성 감사 혜택! D-VIEW 모든 아파트 분석 리포트가 24시간 동안 즉시 해금되었습니다. 💚');
            }
            rewardToastTimeoutRef.current = null;
          }, 1000);
        }
      } catch (unlockErr) {
        logger.warn('LoungeComposeClient.onSubmit', 'Failed to set global unlock rewards', undefined, unlockErr);
      }

      router.refresh();
    } catch (error) {
      const isValidationError = error instanceof Error && (
        error.message.includes('유효하지 않습니다') || 
        error.message.includes('제목') || 
        error.message.includes('내용') || 
        error.message.includes('글 저장 실패')
      );
      if (isValidationError) {
        alert(error.message);
        submitLockRef.current = false;
      } else {
        logger.warn('LoungeComposeClient.onSubmit', 'Post creation failed online, attempting offline fallback', undefined, error);
        try {
          await enqueueOfflineRequest({
            url: '/api/posts',
            method: 'POST',
            body: {
              title: trimmedTitle,
              content: trimmedContent,
              category: postCategory,
              authorUid: activeUid,
              authorName: activeAuthorName,
              verifiedApartment: activeApartment,
              verificationLevel: activeVerificationLevel,
              imageUrl: null
            }
          });
          setPostTitle(''); setPostContent(''); setPostCategory('우리동네 이야기'); setCustomNickname(''); setShowCompose(false);
          showToast('네트워크 오류로 인해 글이 오프라인 큐에 저장되었습니다. 연결 시 자동으로 게시됩니다 💚');
        } catch (queueErr) {
          logger.error('LoungeComposeClient.onSubmit', 'Failed to enqueue post request', undefined, queueErr);
          alert('글 작성에 실패했습니다.');
        }
        submitLockRef.current = false;
      }
    }
    finally {
      setIsSubmitting(false);
    }
  }, [postTitle, postContent, postCategory, customNickname, user, isUserAdmin, displayAuthorName, displayApartment, showToast, router]);

  return (
    <>

      {isWritableCategory && (
        <button
          onClick={() => {
            setPostCategory('우리동네 이야기');
            setCustomNickname(''); // Reset to trigger auto-generation
            setShowCompose(true);
            if (isUserAdmin && !postContent) {
              setPostContent(MARKDOWN_TEMPLATE);
            }
          }}
          aria-label="글쓰기 모달 열기"
          className="fixed right-4 sm:right-6 w-14 h-14 bg-[#c44d00] hover:bg-[#006b50] text-surface rounded-full shadow-lg shadow-[#c44d00]/20 flex items-center justify-center transition-all active:scale-95 z-40"
          style={{ bottom: `${isMobile ? 96 + footerOffset : 24 + footerOffset}px` }}
        >
          <PenLine size={22} />
        </button>
      )}

      {showCompose && mounted && createPortal(
        <div 
          onKeyDown={handleKeyDown}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
        >
          <button 
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm border-none cursor-default" 
            onClick={handleClose} 
            aria-label="글쓰기 창 닫기"
          />
          <article 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lounge-compose-title"
            aria-describedby="lounge-compose-desc"
            className="relative w-full sm:max-w-3xl bg-surface/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border/40 dark:border-white/10 rounded-t-[20px] sm:rounded-[20px] p-6 pb-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col gap-1 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300"
          >
            {/* Screen Reader Only Description */}
            <p id="lounge-compose-desc" className="sr-only">주민 라운지에 새로운 소식과 정보를 작성하는 입력 창입니다.</p>

            <div className="flex items-center justify-between mb-5">
              <h2 id="lounge-compose-title" className="text-[18px] font-extrabold text-primary">커뮤니티 글쓰기</h2>
              <button 
                onClick={handleClose} 
                aria-label="글쓰기 창 닫기" 
                className="w-8 h-8 rounded-full bg-body flex items-center justify-center hover:bg-[#e5e8eb] hover:scale-105 active:scale-95 transition-all"
              >
                <X size={16} className="text-secondary" />
              </button>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto" role="tablist" aria-label="게시글 카테고리 선택">
              {['우리동네 이야기'].map((cat) => (
                <button key={cat} role="tab" aria-selected={postCategory === cat} onClick={() => setPostCategory(cat)} className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${postCategory === cat ? 'bg-[#c44d00] text-surface border-transparent shadow-sm' : 'bg-surface text-secondary border-toss-gray hover:border-[#c44d00]'}`}>{cat}</button>
              ))}
            </div>

            {/* Mom-cafe custom nickname entry */}
            {!isUserAdmin && (
              <div className="flex flex-col gap-1.5 mb-3 bg-body p-3.5 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-extrabold text-secondary">🎭 동탄맘카페 스타일 활동 가명</span>
                  <button 
                    type="button" 
                    onClick={() => setCustomNickname(generateMamacafeNickname())} 
                    aria-label="활동 가명 닉네임 새로 생성"
                    className="text-[11.5px] font-extrabold text-[#c44d00] hover:text-[#006b50] hover:underline flex items-center gap-1"
                  >
                    새로 만들기 🔄
                  </button>
                </div>
                <input 
                  value={customNickname} 
                  onChange={(e) => setCustomNickname(e.target.value)} 
                  placeholder="활동 가명을 입력해 주세요" 
                  aria-label="활동 가명 입력"
                  className="w-full bg-surface border border-toss-gray rounded-lg px-3 py-2 text-[14px] font-bold outline-none focus:border-[#c44d00] dark:focus:border-[#ea6100] transition-colors"
                />
              </div>
            )}

            <input 
              ref={titleInputRef}
              value={postTitle} 
              onChange={(e) => setPostTitle(e.target.value)} 
              placeholder="제목을 입력해 주세요 (예: 동탄역 롯데캐슬 주말 임장 후기)" 
              aria-label="게시글 제목 입력" 
              className="w-full bg-body border border-border/40 rounded-[14px] px-4 py-3.5 text-[15px] font-extrabold tracking-tight outline-none focus:ring-2 focus:ring-[#c44d00]/30 dark:focus:ring-[#ea6100]/30 focus:border-[#c44d00] dark:focus:border-[#ea6100] hover:border-border/80 dark:hover:border-white/20 focus:bg-surface transition-all duration-300 mb-2" 
              autoFocus 
            />
            <textarea 
              ref={textareaRef}
              value={postContent} 
              onChange={(e) => setPostContent(e.target.value)} 
              placeholder={isUserAdmin ? "동탄 이야기를 자유롭게 나누어 보세요. 줄바꿈을 활용해 자유롭게 내용을 작성할 수 있습니다." : "이웃들과 나누고 싶은 동탄 이야기를 자유롭게 들려주세요."} 
              aria-label="게시글 내용 입력"
              rows={12} 
              className="w-full bg-body border border-border/40 rounded-[16px] px-4 py-3.5 text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-[#c44d00]/30 dark:focus:ring-[#ea6100]/30 focus:border-[#c44d00] dark:focus:border-[#ea6100] hover:border-border/80 dark:hover:border-white/20 focus:bg-surface transition-all duration-300 resize-none mb-4" 
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-[12px] text-tertiary hidden sm:inline-block">🎭 {isUserAdmin ? '매니저' : (customNickname || '익명')}</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  aria-label="이미지 파일 첨부"
                  className="flex items-center gap-1.5 text-[13px] font-bold text-secondary hover:text-[#c44d00] dark:hover:text-[#ea6100] hover:bg-body transition-colors px-3 py-2 rounded-lg disabled:opacity-50 border border-border"
                  title="이미지 업로드"
                >
                  {isUploadingImage ? <Loader2 size={16} className="animate-spin text-[#c44d00] dark:text-[#ea6100]" /> : <ImagePlus size={16} />}
                  <span>사진 첨부</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !postTitle.trim() || !postContent.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-[#c44d00] hover:bg-[#006b50] hover:scale-[1.02] active:scale-[0.98] disabled:bg-toss-gray text-surface rounded-[14px] font-bold text-[14px] transition-all shadow-sm shadow-[#c44d00]/10"
              >
                {isSubmitting ? '작성 중...' : '작성 완료'}
              </button>
            </div>
          </article>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </>
  );
});

LoungeComposeClient.displayName = 'LoungeComposeClient';
export default LoungeComposeClient;

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { dashboardFacade } from '@/lib/DashboardFacade';
import { isAdmin } from '@/lib/config/admin.config';
import { Settings, UserCircle, X, Camera, Sun, Moon, Monitor, Scaling } from 'lucide-react';
import { uploadImage } from '@/lib/services/storage.service';
import { logger } from '@/lib/services/logger';

import { DEFAULT_AVATARS } from '@/lib/types/user.types';
import { useSettings } from '@/lib/contexts/SettingsContext';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';

const FloatingUserBar = React.memo(function FloatingUserBar() {
  const { setIsSettingsModalOpen, areaUnit, setAreaUnit } = useSettings();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user, anonProfile, updateLocalAnonProfile, handleLogin, handleLogout } = useAuth();

  // Component mount state to prevent hydration errors (mounted guard)
  const [mounted, setMounted] = useState(false);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const mountedRef = useRef(true);
  const profileModalRef = useRef<HTMLDivElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  // Scroll optimization state
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Scroll Listener with requestAnimationFrame for performance optimization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;
    const handleScroll = () => {
      if (scrollTimeoutRef.current) return;
      scrollTimeoutRef.current = window.requestAnimationFrame(() => {
        if (active) {
          setIsScrolled(window.scrollY > 80);
        }
        scrollTimeoutRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      active = false;
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        window.cancelAnimationFrame(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setProfilePhotoPreview(null);
    setProfilePhotoFile(null);
  };

  // Safe close handler to prevent data loss (DLP)
  const handleSafeClose = React.useCallback(() => {
    const isNicknameChanged = editNickname !== (anonProfile?.nickname || '매니저');
    const isPhotoChanged = profilePhotoFile !== null;

    if (isNicknameChanged || isPhotoChanged) {
      if (!window.confirm('수정한 프로필 내용이 저장되지 않았습니다. 정말 닫으시겠습니까?')) {
        return;
      }
    }
    closeProfileModal();
  }, [editNickname, profilePhotoFile, anonProfile]);

  // Declarative Object URL lifecycle management to prevent memory leaks
  useEffect(() => {
    if (!profilePhotoFile) return;

    const url = URL.createObjectURL(profilePhotoFile);
    setProfilePhotoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [profilePhotoFile]);

  // Manage mounted state to prevent state updates on unmounted component
  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
      setMounted(false);
    };
  }, []);

  // Prevent background scroll when profile edit modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!showProfileModal) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, [showProfileModal]);

  // Focus and Escape key management for Profile modal
  useEffect(() => {
    if (showProfileModal) {
      // Auto focus nickname input when modal opens
      const timer = setTimeout(() => {
        if (nicknameInputRef.current) {
          nicknameInputRef.current.focus();
        }
      }, 50);

      // Escape key handling
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleSafeClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showProfileModal, handleSafeClose]);

  // Focus Trap Handler for Profile modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && profileModalRef.current) {
      const focusableElements = profileModalRef.current.querySelectorAll(
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

  return (
    <>
      {/* User Bar — Embeddable */}
      <div className="animate-in fade-in duration-300 flex items-center gap-2">
        {user ? (
          <div className="relative">
            {/* Profile Avatar Button */}
            <button 
              onClick={() => {
                setEditNickname(anonProfile?.nickname || '매니저');
                setProfilePhotoPreview(anonProfile?.photoURL || null);
                setProfilePhotoFile(null);
                setShowProfileModal(true);
              }} 
              className="flex items-center hover:opacity-85 transition-opacity"
              aria-label="프로필 수정"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#e6f3f0] dark:bg-[#042820] flex items-center justify-center text-[#008262] dark:text-[#00d29d] overflow-hidden border border-[#008262]/20 shadow-sm relative transition-all duration-300 ${isScrolled ? 'ring-2 ring-[#008262]/30 scale-95 shadow-md' : ''}`}>
                {(anonProfile?.photoURL || user.photoURL) ? (
                  <Image src={anonProfile?.photoURL || user.photoURL || ''} alt="프로필" fill sizes="40px" className="object-cover" priority={true} />
                ) : (
                  <span className="text-[14px] md:text-[16px] font-extrabold">
                    {(anonProfile?.nickname || user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </button>

          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleLogin} className="flex items-center gap-1.5 bg-surface text-primary text-[11px] sm:text-[13px] font-bold py-1 sm:py-2 px-3 sm:px-5 rounded-full border border-border shadow-sm transition-colors hover:bg-body dark:hover:bg-gray-800">
              로그인
            </button>
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-surface rounded-full border border-border flex items-center justify-center text-secondary hover:text-[#008262] dark:hover:text-[#00d29d] hover:shadow-sm transition-all duration-200"
              aria-label="설정"
            >
              <Settings size={18} className="transition-transform duration-300 hover:rotate-45" />
            </button>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      {showProfileModal && user && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <button 
            type="button"
            className="absolute inset-0 bg-primary/50 backdrop-blur-sm cursor-default focus:outline-none border-none outline-none" 
            onClick={handleSafeClose} 
            aria-label="프로필 설정 모달 닫기"
          />
          <div 
            ref={profileModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
            aria-describedby="profile-desc"
            onKeyDown={handleKeyDown}
            className="relative bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-[640px] shadow-2xl max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col animate-in slide-in-from-bottom-8 duration-300"
          >
            {/* WAI-ARIA Screen reader descriptive text to replace duplicate/incoherent ID elements */}
            <p id="profile-desc" className="sr-only">
              사용자의 닉네임과 프로필 사진을 편집하고 화면 모드 및 면적 단위를 구성하는 설정 모달 창입니다.
            </p>

            <h2 id="profile-title" className="sr-only">프로필 및 소비자 설정</h2>
            <button 
              onClick={handleSafeClose} 
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 bg-surface/80 backdrop-blur-md border border-border text-secondary hover:text-primary hover:bg-body flex items-center justify-center rounded-full shadow-sm hover:shadow-md transition-all z-50"
              aria-label="프로필 설정 창 닫기"
            >
              <X size={22} strokeWidth={2.5} />
            </button>

            {/* Profile Header Card */}
            <div className="bg-body border border-border rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Profile Photo */}
              <button 
                type="button"
                className="relative group cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue rounded-full" 
                onClick={() => document.getElementById('floating-profile-photo-input')?.click()}
                aria-label="프로필 사진 변경"
              >
                <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center overflow-hidden ring-4 ring-[#008262]/10 dark:ring-[#00d29d]/10 shadow-sm">
                  {profilePhotoPreview ? (
                    <img src={profilePhotoPreview} alt="프로필" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={40} className="text-[#008262] dark:text-[#00d29d]" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-surface" />
                </div>
                <input
                  id="floating-profile-photo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProfilePhotoFile(file);
                    }
                  }}
                />
              </button>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left pt-1 flex flex-col justify-center h-20">
                <p className="text-[11px] text-tertiary font-bold mb-1">다른 사용자에게 보이는 이름</p>
                <p className="text-[24px] font-extrabold text-primary tracking-wide mb-1 leading-none">
                  {isAdmin(user.email) ? '매니저' : editNickname}
                </p>
                <p className="text-[12px] text-secondary font-medium">{user.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Nickname (2~10자) */}
              <div>
                <label htmlFor="profile-nickname-input" className="text-[12px] font-bold text-secondary mb-1.5 flex items-center justify-between">
                  <span>닉네임 (2~10글자)</span>
                  <span className={`text-[11px] ${isAdmin(user.email) || (editNickname.length >= 2 && editNickname.length <= 10) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isAdmin(user.email) ? '3/10 (고정)' : `${editNickname.length}/10`}
                  </span>
                </label>
                <input
                  id="profile-nickname-input"
                  ref={nicknameInputRef}
                  type="text"
                  value={isAdmin(user.email) ? '매니저' : editNickname}
                  onChange={(e) => { if (e.target.value.length <= 10) setEditNickname(e.target.value); }}
                  disabled={isAdmin(user.email)}
                  className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] font-bold text-primary focus:ring-2 focus:ring-[#008262]/20 focus:border-[#008262] dark:focus:ring-[#00d29d]/20 dark:focus:border-[#00d29d] outline-none text-center tracking-widest disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="매니저"
                  maxLength={10}
                />
              </div>

              {/* Default Avatar Selection */}
              <div>
                <label className="text-[12px] font-bold text-secondary mb-2 block">기본 프로필 선택</label>
                <div role="group" aria-label="기본 프로필 아바타 선택" className="flex gap-2 flex-wrap justify-center py-2">
                  {DEFAULT_AVATARS.map((avatar, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setProfilePhotoPreview(avatar);
                        setProfilePhotoFile(null);
                      }}
                      aria-pressed={profilePhotoPreview === avatar}
                      aria-label={`아바타 ${idx + 1}`}
                      className={`w-12 h-12 rounded-full shrink-0 border-2 transition-all ${
                        profilePhotoPreview === avatar ? 'border-[#008262] dark:border-[#00d29d] scale-110 shadow-md' : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={avatar} alt={`기본 프로필 ${idx + 1}`} className="w-full h-full rounded-full" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme & Area Unit Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {/* Theme Settings */}
                <div className="bg-body border border-border rounded-2xl p-4 flex flex-col justify-between gap-3">
                  <h3 className="text-[12px] font-bold text-secondary flex items-center gap-1.5">
                    <Sun size={14} /> 화면 모드
                  </h3>
                  <div role="group" aria-label="화면 모드 선택" className="grid grid-cols-3 gap-1 bg-surface p-1 rounded-xl border border-border h-full">
                    {[
                      { id: 'light', label: '라이트', icon: Sun },
                      { id: 'dark', label: '다크', icon: Moon },
                      { id: 'system', label: '시스템', icon: Monitor },
                    ].map(opt => {
                      const isActive = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          aria-pressed={isActive}
                          className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-[#008262] dark:bg-[#00d29d] text-white dark:text-[#191f28] shadow-sm font-bold' 
                              : 'text-tertiary hover:text-secondary font-medium'
                          }`}
                        >
                          <opt.icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                          <span className="text-[10px]">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Area Unit Settings */}
                <div className="bg-body border border-border rounded-2xl p-4 flex flex-col justify-between gap-3">
                  <h3 className="text-[12px] font-bold text-secondary flex items-center gap-1.5">
                    <Scaling size={14} /> 면적 표시 기준
                  </h3>
                  <div role="group" aria-label="면적 표시 기준 선택" className="grid grid-cols-2 gap-1 bg-surface p-1 rounded-xl border border-border h-full">
                    {[
                      { id: 'm2', label: '제곱미터 (m²)' },
                      { id: 'pyeong', label: '평' },
                    ].map(opt => {
                      const isActive = areaUnit === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setAreaUnit(opt.id as 'm2' | 'pyeong')}
                          aria-pressed={isActive}
                          className={`py-2 rounded-lg transition-all duration-200 text-[11px] h-full ${
                            isActive 
                              ? 'bg-[#008262] dark:bg-[#00d29d] text-white dark:text-[#191f28] shadow-sm font-bold' 
                              : 'text-tertiary hover:text-secondary font-medium'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={async () => {
                    if (editNickname.length < 2 || editNickname.length > 10) {
                      alert('닉네임은 2~10글자로 입력해주세요.');
                      return;
                    }
                    setIsSavingProfile(true);
                    try {
                      let photoURL: string = anonProfile?.photoURL || '';
                      if (profilePhotoFile) {
                        photoURL = await uploadImage(profilePhotoFile, `profiles/${user.uid}`);
                        await dashboardFacade.updatePhotoURL(user.uid, photoURL);
                      } else if (profilePhotoPreview && profilePhotoPreview !== anonProfile?.photoURL) {
                        photoURL = profilePhotoPreview;
                        await dashboardFacade.updatePhotoURL(user.uid, photoURL);
                      }

                      await dashboardFacade.updateNickname(user.uid, editNickname);
                      updateLocalAnonProfile({ nickname: editNickname, photoURL });
                      closeProfileModal();
                    } catch (err) {
                      logger.error('FloatingUserBar.profileUpdate', 'Profile update failed', undefined, err);
                      alert('프로필 수정에 실패했습니다.');
                    } finally {
                      if (mountedRef.current) {
                        setIsSavingProfile(false);
                      }
                    }
                  }}
                  disabled={isSavingProfile || editNickname.length < 2 || editNickname.length > 10}
                  className="flex-1 py-3 bg-[#008262] hover:bg-[#006b50] dark:bg-[#00d29d] dark:hover:bg-[#00b386] text-surface dark:text-[#191f28] font-bold text-[14px] rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '저장하기'
                  )}
                </button>
                {dashboardFacade.isAdmin(user.email) && (
                  <button 
                    onClick={() => { closeProfileModal(); router.push('/admin'); }}
                    className="flex-1 py-3 bg-primary hover:bg-black text-surface font-bold text-[14px] rounded-xl transition-colors"
                  >
                    관리자 설정
                  </button>
                )}
                <button 
                  onClick={() => { closeProfileModal(); handleLogout(); }}
                  className="flex-1 py-3 bg-[#ffebec] dark:bg-rose-950/20 hover:bg-rose-600 dark:hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-surface font-bold text-[14px] rounded-xl transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </>
  );
});

FloatingUserBar.displayName = 'FloatingUserBar';
export default FloatingUserBar;

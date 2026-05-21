'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebaseConfig';
import { dashboardFacade } from '@/lib/DashboardFacade';
import { isAdmin } from '@/lib/config/admin.config';
import { Settings, UserCircle, Edit3, X, Camera, Sun, Moon, Monitor, Scaling } from 'lucide-react';
import { uploadImage } from '@/lib/services/reportService';
import { DEFAULT_AVATARS } from '@/lib/types/user.types';
import { useSettings } from '@/lib/contexts/SettingsContext';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export default function FloatingUserBar() {
  const { setIsSettingsModalOpen, areaUnit, setAreaUnit } = useSettings();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [anonProfile, setAnonProfile] = useState<{nickname: string; frontName?: string; photoURL?: string} | null>(null);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await dashboardFacade.getUserProfile(currentUser.uid);
        if (profile) {
          if (isAdmin(currentUser.email)) {
            if (profile.nickname !== '매니저') {
              dashboardFacade.updateNickname(currentUser.uid, '매니저');
            }
            profile.nickname = '매니저';
          }
          if (profile.photoURL && profile.photoURL.includes('api.dicebear.com')) {
            profile.photoURL = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
            // Optionally update it in backend right away
            dashboardFacade.updatePhotoURL(currentUser.uid, profile.photoURL);
          }
          setAnonProfile(profile);
        }
        if (isAdmin(currentUser.email)) {
          localStorage.setItem('dview_is_admin', 'true');
        } else {
          localStorage.removeItem('dview_is_admin');
        }
      } else {
        setAnonProfile(null);
        localStorage.removeItem('dview_is_admin');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (err) { console.error('Login failed:', err); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error('Logout failed:', err); }
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
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-toss-blue-light dark:bg-toss-blue-light/20 flex items-center justify-center text-toss-blue overflow-hidden border border-toss-blue/20 shadow-sm relative">
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
              className="w-8 h-8 sm:w-10 sm:h-10 bg-surface rounded-full border border-border flex items-center justify-center text-secondary hover:text-toss-blue hover:shadow-sm transition-all duration-200"
              aria-label="설정"
            >
              <Settings size={18} className="transition-transform duration-300 hover:rotate-45" />
            </button>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      {showProfileModal && user && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
          <div className="relative bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-[640px] shadow-2xl max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col">
            <button 
              onClick={() => setShowProfileModal(false)} 
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 bg-surface/80 backdrop-blur-md border border-border text-secondary hover:text-primary hover:bg-body flex items-center justify-center rounded-full shadow-sm hover:shadow-md transition-all z-50"
              aria-label="닫기"
            >
              <X size={22} strokeWidth={2.5} />
            </button>

            {/* Profile Header Card */}
            <div className="bg-body border border-border rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Profile Photo */}
              <div className="relative group cursor-pointer shrink-0" onClick={() => document.getElementById('floating-profile-photo-input')?.click()}>
                <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center overflow-hidden ring-4 ring-toss-blue/10 shadow-sm">
                  {profilePhotoPreview ? (
                    <img src={profilePhotoPreview} alt="프로필" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={40} className="text-toss-blue" />
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
                      setProfilePhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>

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
                <label className="text-[12px] font-bold text-secondary mb-1.5 flex items-center justify-between">
                  <span>닉네임 (2~10글자)</span>
                  <span className={`text-[11px] ${isAdmin(user.email) || (editNickname.length >= 2 && editNickname.length <= 10) ? 'text-toss-green' : 'text-toss-red'}`}>
                    {isAdmin(user.email) ? '3/10 (고정)' : `${editNickname.length}/10`}
                  </span>
                </label>
                <input
                  type="text"
                  value={isAdmin(user.email) ? '매니저' : editNickname}
                  onChange={(e) => { if (e.target.value.length <= 10) setEditNickname(e.target.value); }}
                  disabled={isAdmin(user.email)}
                  className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] font-bold text-primary focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue outline-none text-center tracking-widest disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="매니저"
                  maxLength={10}
                />
              </div>

              {/* Default Avatar Selection */}
              <div>
                <label className="text-[12px] font-bold text-secondary mb-2 block">기본 프로필 선택</label>
                <div className="flex gap-2 flex-wrap justify-center py-2">
                  {DEFAULT_AVATARS.map((avatar, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setProfilePhotoPreview(avatar);
                        setProfilePhotoFile(null);
                      }}
                      className={`w-12 h-12 rounded-full shrink-0 border-2 transition-all ${
                        profilePhotoPreview === avatar ? 'border-toss-blue scale-110 shadow-md' : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
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
                  <div className="grid grid-cols-3 gap-1 bg-surface p-1 rounded-xl border border-border h-full">
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
                          className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-toss-blue text-white shadow-sm font-bold' 
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
                  <div className="grid grid-cols-2 gap-1 bg-surface p-1 rounded-xl border border-border h-full">
                    {[
                      { id: 'm2', label: '제곱미터 (m²)' },
                      { id: 'pyeong', label: '평' },
                    ].map(opt => {
                      const isActive = areaUnit === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setAreaUnit(opt.id as 'm2' | 'pyeong')}
                          className={`py-2 rounded-lg transition-all duration-200 text-[11px] h-full ${
                            isActive 
                              ? 'bg-toss-blue text-white shadow-sm font-bold' 
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
                      let photoURL = anonProfile?.photoURL;
                      if (profilePhotoFile) {
                        photoURL = await uploadImage(profilePhotoFile, `profiles/${user.uid}`);
                        await dashboardFacade.updatePhotoURL(user.uid, photoURL);
                      } else if (profilePhotoPreview && profilePhotoPreview !== anonProfile?.photoURL) {
                        photoURL = profilePhotoPreview;
                        await dashboardFacade.updatePhotoURL(user.uid, photoURL);
                      }
                      await dashboardFacade.updateNickname(user.uid, editNickname);
                      setAnonProfile({ nickname: editNickname, photoURL });
                      setShowProfileModal(false);
                    } catch (err) {
                      console.error('Profile update failed:', err);
                      alert('프로필 수정에 실패했습니다.');
                    } finally {
                      setIsSavingProfile(false);
                    }
                  }}
                  disabled={isSavingProfile || editNickname.length < 2 || editNickname.length > 10}
                  className="flex-1 py-3 bg-toss-blue hover:bg-[#2b72d6] text-surface font-bold text-[14px] rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '저장하기'
                  )}
                </button>
                {dashboardFacade.isAdmin(user.email) && (
                  <button 
                    onClick={() => { setShowProfileModal(false); router.push('/admin'); }}
                    className="flex-1 py-3 bg-primary hover:bg-black text-surface font-bold text-[14px] rounded-xl transition-colors"
                  >
                    관리자 설정
                  </button>
                )}
                <button 
                  onClick={() => { setShowProfileModal(false); handleLogout(); }}
                  className="flex-1 py-3 bg-[#ffebec] hover:bg-toss-red text-toss-red hover:text-surface font-bold text-[14px] rounded-xl transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

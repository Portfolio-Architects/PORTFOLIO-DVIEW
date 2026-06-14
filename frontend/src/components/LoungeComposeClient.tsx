'use client';

import { useState, useEffect, useRef } from 'react';
import { PenLine, X, ShieldCheck, Building2, ImagePlus, Loader2 } from 'lucide-react';
import { auth, googleProvider, storage } from '@/lib/firebaseConfig';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
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


interface Props {
  currentTab: string;
  onRequestLogin?: (message: string) => void;
}

export default function LoungeComposeClient({ currentTab, onRequestLogin }: Props) {
  const router = useRouter();
  const { showToast } = usePWA();
  const submitLockRef = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [footerOffset, setFooterOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector('footer');
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const offset = windowHeight - footerRect.top;
        if (offset > 0) {
          setFooterOffset(offset);
        } else {
          setFooterOffset(0);
        }
      }
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);
  const isUserAdmin = isAdmin(user?.email);
  const isWritableCategory = 
    currentTab !== '동탄 부동산 뉴스' && 
    currentTab !== '동탄구 소식' && 
    (currentTab !== '매니저 임장기' || isUserAdmin);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate initial mom-cafe nickname for non-admin users
  useEffect(() => {
    if (showCompose && !isUserAdmin && !customNickname) {
      setCustomNickname(generateMamacafeNickname());
    }
  }, [showCompose, isUserAdmin, customNickname]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const compressedFile = await compressImage(file);
      // 1. Storage Reference with unique name
      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `lounge_images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const storageRef = ref(storage, fileName);

      // 2. Upload
      await uploadBytes(storageRef, compressedFile);

      // 3. Get URL
      const url = await getDownloadURL(storageRef);

      // 4. Inject Markdown into textarea at cursor position
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const mdImage = `\n![이미지](${url})\n`;
        const newText = postContent.substring(0, start) + mdImage + postContent.substring(end);
        setPostContent(newText);
        
        // Timeout to set focus back to textarea
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + mdImage.length, start + mdImage.length);
        }, 10);
      } else {
        setPostContent(prev => prev + `\n![이미지](${url})\n`);
      }
    } catch (error) {
      console.error('Image upload failed', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await UserRepo.getOrCreateProfile(currentUser.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const displayAuthorName = isUserAdmin ? '매니저' : (userProfile ? getDisplayName(userProfile) : '익명');
  const displayApartment = isUserAdmin ? '마스터' : (userProfile?.verifiedApartment?.replace(/\[.*?\]\s*/, '') || '');

  return (
    <>

      {isWritableCategory && (
        user ? (
          <button
            onClick={() => {
              const defaultCategory = (currentTab === '동탄 부동산 뉴스' || currentTab === '동탄구 소식')
                ? '우리동네 이야기'
                : currentTab;
              setPostCategory(defaultCategory);
              setCustomNickname(''); // Reset to trigger auto-generation
              setShowCompose(true);
              if (isUserAdmin && !postContent) {
                setPostContent(MARKDOWN_TEMPLATE);
              }
            }}
            className="fixed right-4 sm:right-6 w-14 h-14 bg-[#008262] hover:bg-[#006b50] text-surface rounded-full shadow-lg shadow-[#008262]/20 flex items-center justify-center transition-all active:scale-95 z-40"
            style={{ bottom: `${isMobile ? 96 + footerOffset : 24 + footerOffset}px` }}
          >
            <PenLine size={22} />
          </button>
        ) : (
          <button
            onClick={() => onRequestLogin?.('라운지에 글을 작성하여 유용한 부동산 정보를 나눠보세요.')}
            className="fixed right-4 sm:right-6 w-14 h-14 bg-primary hover:bg-[#333d4b] text-surface rounded-full shadow-lg shadow-[#191f28]/30 flex items-center justify-center transition-all active:scale-95 z-40"
            style={{ bottom: `${isMobile ? 96 + footerOffset : 24 + footerOffset}px` }}
          >
            <PenLine size={22} />
          </button>
        )
      )}

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCompose(false)} />
          <div className="relative w-full sm:max-w-3xl bg-surface rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-primary">커뮤니티 글쓰기</h2>
              <button onClick={() => setShowCompose(false)} className="w-8 h-8 rounded-full bg-body flex items-center justify-center hover:bg-[#e5e8eb] transition-colors">
                <X size={16} className="text-secondary" />
              </button>
            </div>
            
            <div className="mb-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm select-none">
              <div className="flex items-center gap-3">
                <span className="text-[20px] animate-bounce shrink-0">🎁</span>
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-black text-emerald-800 dark:text-emerald-300">
                    지금 글 쓰고 프리미엄 리포트 무료 해금!
                  </span>
                  <span className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400/80 mt-0.5">
                    동네 이야기나 아파트 리뷰를 작성하시면 24시간 동안 D-VIEW 모든 분석 리포트가 무료 패스됩니다.
                  </span>
                </div>
              </div>
              <span className="shrink-0 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse shadow-sm">
                100% 해금
              </span>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto">
              {(isUserAdmin 
                ? ['매니저 임장기', '동탄 육아/교육', '실시간 오픈런/정보', '우리동네 이야기', '동탄 벼룩/나눔'] 
                : ['동탄 육아/교육', '실시간 오픈런/정보', '우리동네 이야기', '동탄 벼룩/나눔']
              ).map((cat) => (
                <button key={cat} onClick={() => setPostCategory(cat)} className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${postCategory === cat ? 'bg-[#008262] text-surface border-transparent shadow-sm' : 'bg-surface text-secondary border-toss-gray hover:border-[#008262]'}`}>{cat}</button>
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
                    className="text-[11.5px] font-extrabold text-[#008262] hover:text-[#006b50] hover:underline flex items-center gap-1"
                  >
                    새로 만들기 🔄
                  </button>
                </div>
                <input 
                  value={customNickname} 
                  onChange={(e) => setCustomNickname(e.target.value)} 
                  placeholder="활동 가명을 입력해 주세요" 
                  className="w-full bg-surface border border-toss-gray rounded-lg px-3 py-2 text-[14px] font-bold outline-none focus:border-[#008262] dark:focus:border-[#00d29d] transition-colors"
                />
              </div>
            )}

            <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="제목을 입력해 주세요 (예: 동탄역 롯데캐슬 주말 임장 후기)" className="w-full bg-body border border-toss-gray rounded-xl px-4 py-3.5 text-[15px] font-bold outline-none focus:border-[#008262] dark:focus:border-[#00d29d] focus:bg-surface transition-colors mb-2" autoFocus />
            <textarea 
              ref={textareaRef}
              value={postContent} 
              onChange={(e) => setPostContent(e.target.value)} 
              placeholder={isUserAdmin ? "동탄 이야기를 자유롭게 나누어 보세요. 줄바꿈을 활용해 자유롭게 내용을 작성할 수 있습니다." : "이웃들과 나누고 싶은 동탄 이야기를 자유롭게 들려주세요."} 
              rows={12} 
              className="w-full bg-body border border-toss-gray rounded-2xl px-4 py-3.5 text-[15px] outline-none focus:border-[#008262] dark:focus:border-[#00d29d] focus:bg-surface transition-colors resize-none focus:ring-4 focus:ring-[#008262]/10 dark:focus:ring-[#00d29d]/10 mb-4" 
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-[12px] text-tertiary hidden sm:inline-block">🎭 {isUserAdmin ? '매니저' : (customNickname || '익명')}</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex items-center gap-1.5 text-[13px] font-bold text-secondary hover:text-[#008262] dark:hover:text-[#00d29d] hover:bg-body transition-colors px-3 py-2 rounded-lg disabled:opacity-50 border border-border"
                  title="이미지 업로드"
                >
                  {isUploadingImage ? <Loader2 size={16} className="animate-spin text-[#008262] dark:text-[#00d29d]" /> : <ImagePlus size={16} />}
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
                onClick={async () => {
                  if (submitLockRef.current) return;
                  if (!user || !postTitle.trim()) return;
                  submitLockRef.current = true;
                  setIsSubmitting(true);

                  if (typeof window !== 'undefined' && !navigator.onLine) {
                    try {
                      await enqueueOfflineRequest({
                        url: '/api/posts',
                        method: 'POST',
                        body: {
                          title: postTitle.trim(),
                          content: postContent.trim(),
                          category: postCategory,
                          authorUid: user.uid,
                          authorName: displayAuthorName,
                          verifiedApartment: displayApartment,
                          verificationLevel: isUserAdmin ? 'registry_verified' : (userProfile?.verificationLevel || ''),
                          imageUrl: null
                        }
                      });
                      setPostTitle(''); setPostContent(''); setPostCategory('우리동네 이야기'); setCustomNickname(''); setShowCompose(false);
                      showToast('네트워크가 연결되지 않아 글이 오프라인 큐에 저장되었습니다. 연결 시 자동으로 게시됩니다 💚');
                      submitLockRef.current = false;
                    } catch (err) {
                      console.error('Failed to enqueue post request', err);
                      alert('글 작성에 실패했습니다.');
                      submitLockRef.current = false;
                    } finally {
                      setIsSubmitting(false);
                    }
                    return;
                  }

                  try {
                    await dashboardFacade.addPost(
                      postTitle.trim(), 
                      postContent.trim(), 
                      postCategory, 
                      user.uid, 
                      undefined, 
                      user.email,
                      isUserAdmin ? undefined : customNickname.trim()
                    );
                    setPostTitle(''); setPostContent(''); setPostCategory('우리동네 이야기'); setCustomNickname(''); setShowCompose(false);
                    showToast('글이 성공적으로 등록되었습니다! 이웃 주민의 피드백을 기대해 보세요 💚');
                    
                    // Reward global unlocked privilege for 24h as a leverage for UGC creation
                    try {
                      const apartments = dashboardFacade.getDongtanApartments ? dashboardFacade.getDongtanApartments() : [];
                      if (apartments.length > 0) {
                        const lockExpiry = Date.now() + 24 * 60 * 60 * 1000;
                        apartments.forEach((aptName) => {
                          localStorage.setItem(`dview-unlocked-apt-${aptName}`, lockExpiry.toString());
                        });
                        setTimeout(() => {
                          showToast('🎉 라운지 글 작성 감사 혜택! D-VIEW 모든 아파트 분석 리포트가 24시간 동안 즉시 해금되었습니다. 💚');
                        }, 1000);
                      }
                    } catch (unlockErr) {
                      console.warn('Failed to set global unlock rewards:', unlockErr);
                    }

                    // Refresh the route to show the new post from the server component
                    router.refresh();
                  } catch (error) {
                    console.warn('Post creation failed online, attempting offline fallback', error);
                    try {
                      await enqueueOfflineRequest({
                        url: '/api/posts',
                        method: 'POST',
                        body: {
                          title: postTitle.trim(),
                          content: postContent.trim(),
                          category: postCategory,
                          authorUid: user.uid,
                          authorName: displayAuthorName,
                          verifiedApartment: displayApartment,
                          verificationLevel: isUserAdmin ? 'registry_verified' : (userProfile?.verificationLevel || ''),
                          imageUrl: null
                        }
                      });
                      setPostTitle(''); setPostContent(''); setPostCategory('우리동네 이야기'); setCustomNickname(''); setShowCompose(false);
                      showToast('네트워크 오류로 인해 글이 오프라인 큐에 저장되었습니다. 연결 시 자동으로 게시됩니다 💚');
                    } catch (queueErr) {
                      console.error('Failed to enqueue post request', queueErr);
                      alert('글 작성에 실패했습니다.');
                    }
                    submitLockRef.current = false;
                  }
                  finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting || !postTitle.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-[#008262] hover:bg-[#006b50] disabled:bg-toss-gray text-surface rounded-xl font-bold text-[14px] transition-all active:scale-95 shadow-sm shadow-[#008262]/10"
              >
                {isSubmitting ? '작성 중...' : '작성 완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

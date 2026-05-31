'use client';

import { useState, useEffect, useRef } from 'react';
import { PenLine, X, ShieldCheck, Building2, ImagePlus, Loader2 } from 'lucide-react';
import { auth, googleProvider, storage } from '@/lib/firebaseConfig';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { dashboardFacade, UserReview } from '@/lib/DashboardFacade';
import * as UserRepo from '@/lib/repositories/user.repository';
import type { UserProfile } from '@/lib/types/user.types';
import { getDisplayName } from '@/lib/types/user.types';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/config/admin.config';
import { compressImage } from '@/lib/utils/imageCompression';
import { generateMamacafeNickname } from '@/lib/utils/nickname';

interface Props {
  currentTab: string;
}

export default function LoungeComposeClient({ currentTab }: Props) {
  const router = useRouter();
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
  const MARKDOWN_TEMPLATE = `자유롭게 단지에 대한 생각이나 정보를 나누어주세요!

## 💡 현장에서 느낀 장점이나 특징
(예: 동탄역 접근성이 예상보다 훨씬 좋았어요, 초등학교가 가까워서 안심이 돼요 등)

## 💬 아쉬웠던 점이나 참고할 만한 팁
(예: 주말에는 주변 교통이 조금 혼잡할 수 있어요, 주차장 진입로를 미리 확인하세요 등)

- 다른 이웃들에게 도움이 될 만한 사소한 정보도 언제나 환영입니다.
- 하단의 '사진 첨부' 버튼을 통해 생생한 현장 사진을 공유해 보세요!`;

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
            className="fixed right-4 sm:right-6 w-14 h-14 bg-toss-blue hover:bg-[#00b386] text-surface rounded-full shadow-lg shadow-[#00d29d]/30 flex items-center justify-center transition-all active:scale-95 z-40"
            style={{ bottom: `${isMobile ? 96 + footerOffset : 24 + footerOffset}px` }}
          >
            <PenLine size={22} />
          </button>
        ) : (
          <button
            onClick={handleLogin}
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
            

            <div className="flex gap-2 mb-4 overflow-x-auto">
              {(isUserAdmin 
                ? ['매니저 임장기', '동탄 육아/교육', '실시간 오픈런/정보', '우리동네 이야기', '동탄 벼룩/나눔'] 
                : ['동탄 육아/교육', '실시간 오픈런/정보', '우리동네 이야기', '동탄 벼룩/나눔']
              ).map((cat) => (
                <button key={cat} onClick={() => setPostCategory(cat)} className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${postCategory === cat ? 'bg-primary text-surface border-[#191f28]' : 'bg-surface text-secondary border-toss-gray hover:border-toss-blue'}`}>{cat}</button>
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
                    className="text-[11.5px] font-extrabold text-toss-blue hover:underline flex items-center gap-1"
                  >
                    새로 만들기 🔄
                  </button>
                </div>
                <input 
                  value={customNickname} 
                  onChange={(e) => setCustomNickname(e.target.value)} 
                  placeholder="활동 가명을 입력해 주세요" 
                  className="w-full bg-surface border border-toss-gray rounded-lg px-3 py-2 text-[14px] font-bold outline-none focus:border-toss-blue transition-colors"
                />
              </div>
            )}

            <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="제목을 입력해 주세요 (예: 동탄역 롯데캐슬 주말 임장 후기)" className="w-full bg-body border border-toss-gray rounded-xl px-4 py-3.5 text-[15px] font-bold outline-none focus:border-toss-blue focus:bg-surface transition-colors mb-2" autoFocus />
            <textarea 
              ref={textareaRef}
              value={postContent} 
              onChange={(e) => setPostContent(e.target.value)} 
              placeholder={isUserAdmin ? "동탄 이야기를 자유롭게 나누어 보세요. 마크다운 문법을 사용해 깔끔하게 정돈된 글을 작성할 수 있습니다." : "이웃들과 나누고 싶은 동탄 이야기를 자유롭게 들려주세요."} 
              rows={12} 
              className="w-full bg-body border border-toss-gray rounded-2xl px-4 py-3.5 text-[15px] outline-none focus:border-toss-blue focus:bg-surface transition-colors resize-none focus:ring-4 focus:ring-toss-blue/10 mb-4" 
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-[12px] text-tertiary hidden sm:inline-block">🎭 {isUserAdmin ? '매니저' : (customNickname || '익명')}</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex items-center gap-1.5 text-[13px] font-bold text-secondary hover:text-toss-blue hover:bg-body transition-colors px-3 py-2 rounded-lg disabled:opacity-50 border border-border"
                  title="이미지 업로드"
                >
                  {isUploadingImage ? <Loader2 size={16} className="animate-spin text-toss-blue" /> : <ImagePlus size={16} />}
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
                  if (!user || !postTitle.trim()) return;
                  setIsSubmitting(true);
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
                    // Refresh the route to show the new post from the server component
                    router.refresh();
                  } catch { alert('글 작성에 실패했습니다.'); }
                  finally { setIsSubmitting(false); }
                }}
                disabled={isSubmitting || !postTitle.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-toss-blue hover:bg-[#00b386] disabled:bg-toss-gray text-surface rounded-xl font-bold text-[14px] transition-all active:scale-95"
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

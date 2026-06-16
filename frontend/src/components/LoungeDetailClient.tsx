'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Send, Shield, ShieldCheck, MessageSquare, Trash2, Eye, Edit2, ImagePlus, Loader2, X, Building2, ChevronRight, Share2 } from 'lucide-react';
import { db, auth, storage } from '@/lib/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, collection, onSnapshot, addDoc, updateDoc, increment, deleteDoc, query, orderBy, serverTimestamp, where, limit, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import * as UserRepo from '@/lib/repositories/user.repository';
import { postConverter, commentConverter } from '@/lib/utils/firestoreConverters';
import type { UserProfile } from '@/lib/types/user.types';
import { getDisplayName } from '@/lib/types/user.types';
import { isAdmin as checkAdmin } from '@/lib/config/admin.config';
import { compressImage } from '@/lib/utils/imageCompression';
import { dashboardFacade } from '@/lib/DashboardFacade';
import { syncManagerPostToScoutingReport } from '@/lib/services/post.service';
import { generateMamacafeNickname } from '@/lib/utils/nickname';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { usePWA } from '@/components/pwa/PWAProvider';
import { enqueueOfflineRequest } from '@/lib/utils/offlineQueue';
import { NativeAdPlaceholder } from '@/components/ui/NativeAdPlaceholder';

import { sharePostToKakao } from '@/lib/utils/kakaoShare';

// Memory backups for anonymous session in case localStorage is blocked in sandboxed frames
let sessionAnonNickname: string | null = null;
let sessionAnonUid: string | null = null;

interface PostComment {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

// Memory caches to eliminate blank screen flickers on modal transition
const postLocalCache: Record<string, Record<string, unknown>> = {};
const commentsLocalCache: Record<string, PostComment[]> = {};

/** Verification badge */
const VerificationBadge = memo(({ apartment, level }: { apartment?: string; level?: string }) => {
  if (!apartment || !level) return null;
  const shortName = apartment.replace(/\[.*?\]\s*/, '').trim();
  if (level === 'registry_verified') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-toss-blue-light text-toss-blue px-2 py-0.5 rounded-md">
        <ShieldCheck size={11} /> {shortName}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-body text-tertiary px-2 py-0.5 rounded-md">
      <Shield size={11} /> {shortName}
    </span>
  );
});
VerificationBadge.displayName = 'VerificationBadge';

export default function LoungeDetailClient({ postId, initialPost, isModal = false }: { postId: string, initialPost?: Record<string, unknown>, isModal?: boolean }) {
  const router = useRouter();
  const { triggerCustomA2HSModal, showToast } = usePWA();
  useSwipeNavigation({ onBack: () => isModal ? router.back() : router.back() });

  const lastCommentTimeRef = useRef<number>(0);
  const commentLockRef = useRef<boolean>(false);
  const uploadFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (uploadFocusTimeoutRef.current) clearTimeout(uploadFocusTimeoutRef.current);
    };
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [post, setPost] = useState<Record<string, unknown> | null>(() => {
    if (postId && postLocalCache[postId]) {
      return postLocalCache[postId];
    }
    if (initialPost) {
      const formatted = {
        ...initialPost,
        createdAt: initialPost.createdAt ? new Date(initialPost.createdAt as string | number | Date).toLocaleDateString('ko-KR') : '방금 전'
      };
      postLocalCache[postId] = formatted;
      return formatted;
    }
    return null;
  });
  const [comments, setComments] = useState<PostComment[]>(() => {
    return postId ? (commentsLocalCache[postId] || []) : [];
  });
  const [recommendedPosts, setRecommendedPosts] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (postId && postLocalCache[postId]) return false;
    return !initialPost;
  });

  const [dongtanApartments, setDongtanApartments] = useState<string[]>([]);
  
  useEffect(() => {
    setDongtanApartments(dashboardFacade.getDongtanApartments());
    const unsub = dashboardFacade.subscribeTo('dongtanApartments', () => {
      setDongtanApartments(dashboardFacade.getDongtanApartments());
    });
    return unsub;
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth
  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!active) return;
      setUser(u);
      if (u) {
        const profile = await UserRepo.getOrCreateProfile(u.uid);
        if (active) {
          setUserProfile(profile);
        }
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!postId) return;
    let active = true;
    try {
      const liked = localStorage.getItem(`post_liked_${postId}`);
      if (active && liked) setIsLiked(true);
    } catch (e) {
      console.warn('localStorage is unavailable:', e);
    }
    
    // View Tracking
    let viewIncremented = false;

    const fetchPost = async () => {
      const snap = await getDoc(doc(db, 'posts', postId).withConverter(postConverter));
      if (!active) return;
      if (snap.exists()) {
        const data = snap.data();
        const formatted = {
          id: snap.id,
          title: data.title,
          category: data.category,
          content: data.content || '',
          author: data.authorName || '익명',
          likes: data.likes || 0,
          views: data.views || 0,
          authorUid: data.authorUid || null,
          verifiedApartment: data.verifiedApartment,
          verificationLevel: data.verificationLevel,
          createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('ko-KR') : '방금 전',
        };
        postLocalCache[postId] = formatted;
        setPost(formatted);
        
        // Track View Server side once
        if (!viewIncremented) {
          viewIncremented = true;
          try {
            let isAdminUser = false;
            try {
              isAdminUser = localStorage.getItem('dview_is_admin') === 'true';
            } catch (err) {
              console.warn('localStorage is unavailable:', err);
            }
            if (!isAdminUser) {
              await dashboardFacade.incrementPostView(postId, data.title);
            }
            if (!active) return;
            // Optionally update UI view count locally immediately
            setPost((p) => {
              const updated = p ? { ...p, views: (Number(p.views) || 0) + 1 } : p;
              if (updated) postLocalCache[postId] = updated;
              return updated;
            });
          } catch (e) {
            console.error('View tracking failed', e);
          }
        }
      }
      setLoading(false);
    };
    fetchPost();
    return () => {
      active = false;
    };
  }, [postId]);

  // Fetch recommended posts (Lounge Popular Talks)
  useEffect(() => {
    if (!postId) return;
    let active = true;
    const fetchRecommended = async () => {
      try {
        const q = query(
          collection(db, 'posts').withConverter(postConverter),
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        if (!active) return;
        const list: any[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (docSnap.id !== postId) {
            list.push({
              id: docSnap.id,
              title: data.title,
              category: data.category,
              authorName: data.authorName || '익명',
              views: data.views || 0,
              likes: data.likes || 0,
              createdAt: data.createdAt,
            });
          }
        });
        const sorted = list
          .sort((a, b) => (b.views + b.likes * 5) - (a.views + a.likes * 5))
          .slice(0, 3);
        setRecommendedPosts(sorted);
      } catch (err) {
        if (active) {
          console.warn('Failed to fetch recommended posts:', err);
        }
      }
    };
    fetchRecommended();
    return () => {
      active = false;
    };
  }, [postId]);

  // Listen to comments
  useEffect(() => {
    if (!postId) return;
    const q = query(collection(db, `posts/${postId}/comments`).withConverter(commentConverter), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: PostComment[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          text: data.text,
          authorName: data.authorName || '익명',
          createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('ko-KR') : '방금 전',
        });
      });
      commentsLocalCache[postId] = list;
      setComments(list);
    });
    return () => unsub();
  }, [postId]);

  const handleLike = useCallback(async () => {
    if (!postId || isLiked) return;
    try {
      setIsLiked(true);
      try {
        localStorage.setItem(`post_liked_${postId}`, 'true');
      } catch (err) {
        console.warn('localStorage is unavailable:', err);
      }
      await updateDoc(doc(db, 'posts', postId).withConverter(postConverter), { likes: increment(1) });
      setPost((prev) => prev ? { ...prev, likes: (Number(prev.likes) || 0) + 1 } : prev);
      showToast("이 글에 공감(좋아요)을 보냈습니다. ❤️");
      triggerCustomA2HSModal();
    } catch(e) {
      setIsLiked(false);
      try {
        localStorage.removeItem(`post_liked_${postId}`);
      } catch (err) {
        console.warn('localStorage is unavailable:', err);
      }
      showToast("공감 처리에 실패했습니다.");
    }
  }, [postId, isLiked, triggerCustomA2HSModal, showToast]);

  const handleShare = useCallback(async () => {
    if (!post || !postId) return;
    
    // Extract first image from markdown content if exists, to use as custom thumbnail
    const mdImageRegex = /!\[.*?\]\((.*?)\)/;
    const content = (post.content as string) || "";
    const match = content.match(mdImageRegex);
    const firstImageUrl = match ? match[1] : undefined;

    try {
      await sharePostToKakao({
        postId,
        title: (post.title as string) || "DVIEW 라운지 소식",
        category: (post.category as string) || "자유",
        contentSummary: content,
        imageUrl: firstImageUrl
      });
      showToast("카카오톡 공유 창을 열었습니다. 💬");
    } catch (err) {
      console.warn("Kakao SDK share failed, falling back to clipboard copy:", err);
      const shareUrl = `${window.location.origin}/lounge/${postId}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("게시글 주소가 복사되었습니다. 이웃에게 공유해 보세요! 🔗");
      } catch (clipErr) {
        showToast("주소 복사에 실패하여, 브라우저 주소창의 링크를 사용해 주세요.");
      }
    }
  }, [post, postId, showToast]);

  const getAnonymousNickname = () => {
    if (typeof window === 'undefined') return '익명이웃';
    try {
      let anonName = localStorage.getItem('dview_anon_nickname');
      if (!anonName) {
        if (sessionAnonNickname) {
          anonName = sessionAnonNickname;
        } else {
          anonName = generateMamacafeNickname();
          sessionAnonNickname = anonName;
        }
        localStorage.setItem('dview_anon_nickname', anonName);
      }
      return anonName;
    } catch (e) {
      if (!sessionAnonNickname) {
        sessionAnonNickname = generateMamacafeNickname();
      }
      return sessionAnonNickname;
    }
  };

  const getAnonymousUid = () => {
    if (typeof window === 'undefined') return 'guest';
    try {
      let anonUid = localStorage.getItem('dview_anon_uid');
      if (!anonUid) {
        if (sessionAnonUid) {
          anonUid = sessionAnonUid;
        } else {
          anonUid = 'anon_' + Math.random().toString(36).substring(2, 10);
          sessionAnonUid = anonUid;
        }
        localStorage.setItem('dview_anon_uid', anonUid);
      }
      return anonUid;
    } catch (e) {
      if (!sessionAnonUid) {
        sessionAnonUid = 'anon_' + Math.random().toString(36).substring(2, 10);
      }
      return sessionAnonUid;
    }
  };

  const handleComment = useCallback(async () => {
    if (commentLockRef.current) return;
    if (!commentText.trim()) return;
    
    // 글자수 제한 방어
    if (commentText.trim().length > 300) {
      alert('댓글은 최대 300자까지 작성할 수 있습니다.');
      return;
    }
    
    // 도배 방지 (3초 락)
    const now = Date.now();
    if (now - lastCommentTimeRef.current < 3000) {
      alert('댓글을 너무 빠르게 작성하고 있습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    commentLockRef.current = true;
    setIsSending(true);

    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        let displayName = '익명이웃';
        let authorUid = null;
        if (user && userProfile) {
          displayName = getDisplayName(userProfile);
          authorUid = user.uid;
        } else {
          displayName = getAnonymousNickname();
          authorUid = getAnonymousUid();
        }

        await enqueueOfflineRequest({
          url: '/api/comments',
          method: 'POST',
          body: {
            text: commentText.trim(),
            authorName: displayName,
            authorUid: authorUid || '',
            postId: postId
          }
        });
        setCommentText('');
        showToast('네트워크가 연결되지 않아 댓글이 오프라인 큐에 저장되었습니다. 연결 시 자동으로 게시됩니다 💚');
        lastCommentTimeRef.current = Date.now();
        triggerCustomA2HSModal();
      } catch (err) {
        console.error('Failed to enqueue comment request', err);
        alert('댓글 작성에 실패했습니다.');
      } finally {
        setIsSending(false);
        commentLockRef.current = false;
      }
      return;
    }

    try {
      let displayName = '익명이웃';
      let authorUid = null;
      
      if (user && userProfile) {
        displayName = getDisplayName(userProfile);
        authorUid = user.uid;
      } else {
        displayName = getAnonymousNickname();
        authorUid = getAnonymousUid();
      }

      await addDoc(collection(db, `posts/${postId}/comments`).withConverter(commentConverter), {
        text: commentText.trim(),
        authorName: displayName,
        authorUid: authorUid || '',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'posts', postId).withConverter(postConverter), { commentCount: increment(1) });
      setCommentText('');
      lastCommentTimeRef.current = Date.now();
      triggerCustomA2HSModal();
    } catch (error) {
      console.warn('Comment creation failed online, attempting offline fallback', error);
      try {
        let displayName = '익명이웃';
        let authorUid = null;
        if (user && userProfile) {
          displayName = getDisplayName(userProfile);
          authorUid = user.uid;
        } else {
          displayName = getAnonymousNickname();
          authorUid = getAnonymousUid();
        }

        await enqueueOfflineRequest({
          url: '/api/comments',
          method: 'POST',
          body: {
            text: commentText.trim(),
            authorName: displayName,
            authorUid: authorUid || '',
            postId: postId
          }
        });
        setCommentText('');
        showToast('네트워크 오류로 댓글이 오프라인 큐에 저장되었습니다. 연결 시 자동으로 게시됩니다 💚');
        lastCommentTimeRef.current = Date.now();
        triggerCustomA2HSModal();
      } catch (queueErr) {
        console.error('Failed to enqueue comment request', queueErr);
        alert('댓글 작성에 실패했습니다.');
      }
    } finally {
      setIsSending(false);
      commentLockRef.current = false;
    }
  }, [commentText, user, userProfile, postId, triggerCustomA2HSModal, showToast]);

  const handleSaveEdit = useCallback(async () => {
    if (!postId || !editTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'posts', postId).withConverter(postConverter), {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
        updatedAt: serverTimestamp(),
      });

      // Sync edited manager report to scoutingReports.premiumContent using the shared service helper
      await syncManagerPostToScoutingReport(editTitle, editContent, editCategory, user?.email, dongtanApartments);

      setPost((prev) => {
        const updated = prev ? { ...prev, title: editTitle.trim(), content: editContent.trim(), category: editCategory } : prev;
        if (updated) postLocalCache[postId] = updated;
        return updated;
      });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('수정에 실패했습니다.');
    }
  }, [postId, editTitle, editContent, editCategory, user?.email, dongtanApartments]);

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
        const newText = editContent.substring(0, start) + mdImage + editContent.substring(end);
        if (mountedRef.current) {
          setEditContent(newText);
        }
        if (uploadFocusTimeoutRef.current) clearTimeout(uploadFocusTimeoutRef.current);
        uploadFocusTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && textarea) {
            textarea.focus();
            textarea.setSelectionRange(start + mdImage.length, start + mdImage.length);
          }
        }, 10);
      } else {
        if (mountedRef.current) {
          setEditContent(prev => prev + `\n![이미지](${url})\n`);
        }
      }
    } catch (error) {
      console.error('Image upload failed', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      if (mountedRef.current) {
        setIsUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  }, [editContent]);



  if (loading) {
    return (
      <div className="min-h-screen bg-body flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-toss-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-body flex flex-col items-center justify-center gap-4">
        <p className="text-[16px] font-bold text-secondary">글을 찾을 수 없습니다</p>
        <button onClick={() => router.push('/lounge')} className="text-toss-blue font-bold">← 라운지로 돌아가기</button>
      </div>
    );
  }

  return (
    <>
      <div className={`w-full ${isModal ? 'h-full bg-surface relative' : 'min-h-screen bg-body pb-[100px]'} font-sans`}>
        {/* Modal Controls */}
        {isModal && (
          <button 
            onClick={() => {
              if (window.location.hash.includes('post=')) {
                // If it was a hash-based modal (LoungeFeedClient)
                window.history.back(); // Standard way to pop the hash
              } else {
                router.back();
              }
            }} 
            className="absolute top-4 right-4 z-50 p-2 bg-body text-tertiary rounded-full hover:bg-[#e5e8eb] hover:text-primary transition-colors shadow-sm border border-border/50"
            title="닫기"
          >
            <X size={20} />
          </button>
        )}
        {/* Header - Only render if not modal, Modal has its own header */}
        {!isModal && (
          <header className="bg-surface sticky top-0 z-10 border-b border-border px-4 py-3.5 flex items-center gap-3">
        <button onClick={() => window.history.length > 2 ? router.back() : router.push('/#lounge')} className="text-primary hover:bg-body p-1.5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-[17px] font-bold text-primary flex-1 line-clamp-1">
          {post?.category === '임장기' ? '동탄 임장/분석' : 
           post?.category === '부동산 기초' ? '부동산 고민상담' :
           post?.category === '정책자금 대출' ? '동탄 청약/대출' :
           post?.category === '인프라' ? '동탄 교통/상권' : 
           String(post?.category || "라운지")}
        </h2>
        {(user?.uid === post?.authorUid || checkAdmin(user?.email)) && (
          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                onClick={() => {
                  setEditTitle((post?.title as string) || '');
                  setEditContent((post?.content as string) || '');
                  setEditCategory((post?.category as string) || '동탄 임장/분석');
                  setIsEditing(true);
                }}
                className="p-2 rounded-full hover:bg-body text-[#adb5bd] hover:text-[#008262] dark:hover:text-[#00d29d] transition-colors"
                title="수정"
              >
                <Edit2 size={18} />
              </button>
            )}
            <button
              onClick={async () => {
                if (!confirm('이 글을 삭제하시겠습니까?')) return;
                try {
                  await deleteDoc(doc(db, 'posts', postId).withConverter(postConverter));
                  router.push('/lounge');
                } catch {
                  alert('삭제에 실패했습니다.');
                }
              }}
              className="p-2 rounded-full hover:bg-[#fff0f0] text-[#ff6b6b] transition-colors"
              title="삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </header>
        )}

      <main className={`max-w-4xl mx-auto w-full ${isModal ? 'pb-12 pt-14 px-4 sm:px-6' : 'pb-12 sm:pb-16 pt-4 sm:pt-6'} flex flex-col gap-4 px-4 animate-in fade-in duration-500`}>
        <div className="bg-surface rounded-2xl border border-border p-6 mb-6 shadow-sm">
          {isEditing ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2 mb-2 overflow-x-auto">
                {(() => {
                  const defaultCats = checkAdmin(user?.email)
                    ? ['매니저 임장기', '동탄 임장/분석', '동탄 육아/교육', '실시간 오픈런/정보', '우리동네 이야기', '동탄 벼룩/나눔', '부동산 고민상담', '동탄 청약/대출', '동탄 교통/상권']
                    : ['동탄 육아/교육', '실시간 오픈런/정보', '우리동네 이야기', '동탄 벼룩/나눔', '동탄 임장/분석', '부동산 고민상담', '동탄 청약/대출', '동탄 교통/상권'];
                  const cats = defaultCats.includes(editCategory) ? defaultCats : [...defaultCats, editCategory];
                  return cats.map((cat) => (
                    <button key={cat} onClick={() => setEditCategory(cat)} className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all ${editCategory === cat ? 'bg-primary text-surface border-[#191f28]' : 'bg-surface text-secondary border-toss-gray hover:border-toss-blue'}`}>{cat}</button>
                  ));
                })()}
              </div>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-body border border-toss-gray rounded-xl px-4 py-3 text-[16px] font-bold outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all duration-300"
                placeholder="제목"
              />
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="w-full bg-body border border-toss-gray rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all duration-300 resize-none whitespace-pre-wrap"
                placeholder="내용"
              />
              <div className="flex items-center justify-between mt-2">
                <div>
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
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 bg-body hover:bg-[#e5e8eb] text-secondary rounded-xl text-[14px] font-bold transition-colors">취소</button>
                  <button onClick={handleSaveEdit} className="px-5 py-2.5 bg-toss-blue hover:bg-[#00b386] text-surface rounded-xl text-[14px] font-bold transition-colors shadow-md shadow-[#00d29d]/20">저장</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-md ${
                  (post?.category === '동탄 임장/분석' || post?.category === '임장기') ? 'bg-[#e8f8f0] text-[#00a06c]' :
                  (post?.category === '부동산 고민상담' || post?.category === '부동산 기초' || post?.category === '부동산') ? 'bg-[#ffe8e8] text-toss-red' :
                  (post?.category === '동탄 청약/대출' || post?.category === '정책자금 대출') ? 'bg-toss-blue-light text-toss-blue' :
                  (post?.category === '동탄 교통/상권' || post?.category === '인프라' || post?.category === '교통') ? 'bg-[#f4e8ff] text-[#9b51e0]' :
                  'bg-body text-secondary'
                }`}>
                  {post?.category === '임장기' ? '동탄 임장/분석' : 
                   post?.category === '부동산 기초' ? '부동산 고민상담' :
                   post?.category === '정책자금 대출' ? '동탄 청약/대출' :
                   post?.category === '인프라' ? '동탄 교통/상권' : 
                   String(post?.category || "자유")}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[13px] text-tertiary">{String(post?.createdAt || "")}</span>
                  {isModal && (user?.uid === post?.authorUid || checkAdmin(user?.email)) && !isEditing && (
                    <div className="flex items-center gap-2 border-l border-border pl-3">
                      <button
                        onClick={() => {
                          setEditTitle((post?.title as string) || '');
                          setEditContent((post?.content as string) || '');
                          setEditCategory((post?.category as string) || '동탄 임장/분석');
                          setIsEditing(true);
                        }}
                        className="flex items-center gap-1 text-[13px] font-semibold text-tertiary hover:text-toss-blue transition-colors"
                        title="수정"
                      >
                        <Edit2 size={13} /> 수정
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('이 글을 삭제하시겠습니까?')) return;
                          try {
                            await deleteDoc(doc(db, 'posts', postId).withConverter(postConverter));
                            router.back();
                          } catch {
                            alert('삭제에 실패했습니다.');
                          }
                        }}
                        className="flex items-center gap-1 text-[13px] font-semibold text-tertiary hover:text-toss-red transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={13} /> 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <h1 className="text-[20px] font-extrabold text-primary leading-snug mt-2 mb-4">{String(post?.title || "")}</h1>

              {(() => {
                const cleanTitle = String(post?.title || '');
                const cleanContent = String(post?.content || '');
                
                const scoredApts = dongtanApartments.map(apt => {
                  const shortName = apt.replace(/\[.*?\]\s*/, '');
                  if (!shortName) return { apt, shortName, score: 0 };
                  
                  const titleMatches = cleanTitle.split(shortName).length - 1;
                  const contentMatches = cleanContent.split(shortName).length - 1;
                  const score = (titleMatches * 10) + contentMatches;
                  
                  return { apt, shortName, score };
                }).filter(a => a.score > 0)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5);

                if (scoredApts.length === 0) return null;

                return (
                  <div className="mb-6">
                    <span className="text-[13px] font-bold text-tertiary mb-2.5 block px-1">이 글에서 언급된 아파트</span>
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                      {scoredApts.map(({ shortName }) => (
                        <button
                          key={shortName}
                          onClick={() => {
                            // Bypass Next.js router for instant hash update and modal rendering
                            window.location.hash = `post=${postId}&apt=${encodeURIComponent(shortName)}`;
                          }}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 bg-body hover:bg-[#e5e8eb] rounded-xl shrink-0 transition-colors group border border-transparent hover:border-[#008262]/20 dark:hover:border-[#00d29d]/20"
                        >
                          <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0 shadow-sm border border-border">
                            <Building2 size={15} className="text-[#008262] dark:text-[#00d29d]" />
                          </div>
                          <span className="text-[14px] font-bold text-primary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors whitespace-nowrap">{shortName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              {post?.content && (
                <article className="text-secondary text-[15px] leading-[1.65] break-keep [&>h2]:text-[18px] [&>h2]:font-extrabold [&>h2]:text-primary [&>h2]:mt-7 [&>h2]:mb-2.5 [&>h3]:text-[16px] [&>h3]:font-bold [&>h3]:text-primary [&>h3]:mt-5 [&>h3]:mb-1.5 [&>p]:mb-1 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2 [&_li]:pl-1 [&_li]:mb-0.5 [&_li>p]:inline [&_p]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap marker:text-tertiary [&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_img]:my-3 [&_hr]:my-10 [&_hr]:border-0 [&_hr]:h-[1px] [&_hr]:bg-border">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({node, ...props}) => {
                        const href = props.href || '';
                        // Block dangerous protocols like javascript:, data:, vbscript: to prevent XSS
                        const isSafe = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/') || href.startsWith('#');
                        if (!isSafe) {
                          return <span className="text-secondary underline break-all">{props.children}</span>;
                        }
                        return <a {...props} className="text-toss-blue hover:underline break-all" target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>{props.children}</a>;
                      },
                      img: ({node, ...props}) => {
                        if (!props.src || typeof props.src !== 'string') return null;
                        const src = props.src as string;
                        const isSafe = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/');
                        if (!isSafe) return null;
                        
                        const isManagerReport = post?.category === '동탄 임장/분석' || post?.category === '임장기' || String(post?.title || '').includes('매니저') || String(post?.title || '').includes('임장기') || String(post?.content || '').includes('매니저 임장기') || String(post?.author || '').includes('매니저') || String(post?.author || '').includes('D-VIEW') || String(post?.author || '').toLowerCase().includes('admin');
                        
                        return (
                          <span className="block relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-border my-3 bg-body flex items-center justify-center min-h-[250px] group">
                            <Image 
                              src={props.src} 
                              alt={props.alt || '첨부 이미지'} 
                              width={800}
                              height={500}
                              sizes="(max-width: 768px) 100vw, 800px"
                              className="w-full h-auto object-contain max-h-[70vh]"
                              loading="lazy"
                            />
                            {/* 매니저 임장기 워터마크 & 촬영 날짜 */}
                            {isManagerReport && (
                              <span className="absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center gap-2 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity z-10">
                                <span className="font-extrabold text-white/70 text-[14px] md:text-[16px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none tracking-tighter">
                                  D-VIEW
                                </span>
                              </span>
                            )}
                          </span>
                        );
                      }
                    }}
                  >
                    {autoLinkApartments(String(post.content).replace(/\n{3,}/g, '\n\n'), dongtanApartments)}
                  </ReactMarkdown>
                </article>
              )}
            </>
          )}

          <div className="flex items-center justify-between border-t border-body pt-4 mt-8">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold text-secondary">{String(post?.author || "")}</span>
              <VerificationBadge apartment={String(post?.verifiedApartment || "")} level={String(post?.verificationLevel || "")} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-tertiary">
                <Eye size={16} />
                <span className="text-[13px] font-bold">{Number(post?.views || 0)}</span>
              </div>
              <button 
                onClick={handleLike} 
                disabled={isLiked}
                className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-toss-red' : 'text-tertiary hover:text-toss-red'}`}
              >
                <Heart size={16} fill={isLiked ? "#f04452" : "none"} />
                <span className="text-[13px] font-bold">{Number(post?.likes || 0)}</span>
              </button>
              <button 
                onClick={handleShare}
                className="flex items-center gap-1.5 text-tertiary hover:text-toss-blue transition-colors"
                title="카카오톡으로 공유하기"
              >
                <Share2 size={16} />
                <span className="text-[13px] font-bold">공유</span>
              </button>
            </div>
          </div>
        </div>

        {/* AdSense Placement in Lounge Details */}
        <div className="my-2">
          <NativeAdPlaceholder 
            location="라운지 게시글 상세 하단" 
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOUNGE_DETAIL || "test-lounge-detail-slot"} 
          />
        </div>

        {/* Comments Section */}
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-body flex items-center gap-2">
            <MessageSquare size={18} className="text-[#008262] dark:text-[#00d29d]" />
            <span className="text-[16px] font-bold text-primary">댓글 {comments.length}</span>
          </div>

          {/* Integrated Comment Input */}
          <div className="px-5 py-4 bg-body border-b border-border flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={300}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                placeholder={user ? "댓글을 남겨 이웃과 소통해보세요..." : "로그인 없이 자유롭게 댓글을 남겨보세요... (익명)"}
                className="flex-1 bg-surface border border-toss-gray rounded-xl px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#008262]/20 focus:border-[#008262] dark:focus:ring-[#00d29d]/20 dark:focus:border-[#00d29d] transition-all duration-300"
              />
              <button
                onClick={handleComment}
                disabled={isSending || !commentText.trim()}
                className="w-[46px] h-[46px] bg-[#008262] hover:bg-[#006b50] dark:bg-[#00d29d] dark:hover:bg-[#00b386] dark:text-[#191f28] disabled:bg-toss-gray disabled:dark:text-tertiary rounded-xl flex items-center justify-center text-surface transition-all active:scale-95 shadow-md shadow-[#008262]/10"
              >
                <Send size={18} className="ml-1" />
              </button>
            </div>
            <div className="flex justify-end px-1">
              <span className="text-[11.5px] font-medium text-tertiary">{commentText.length}/300자</span>
            </div>
          </div>

          {comments.length === 0 ? (
            <div className="px-5 py-12 text-center bg-surface">
              <p className="text-[14px] text-tertiary">가장 먼저 댓글을 남겨보세요!</p>
            </div>
          ) : (
            <ul className="divide-y divide-body">
              {comments.map((c) => (
                <li key={c.id} className="px-5 py-5 hover:bg-body transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[14px] font-bold text-primary">{c.authorName}</span>
                    <span className="text-[12px] text-tertiary">{c.createdAt}</span>
                  </div>
                  <p className="text-[14px] text-secondary leading-relaxed">{c.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recommended Posts (이 시간 인기 토크) */}
        {recommendedPosts.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border p-5 mt-4 shadow-sm">
            <h3 className="text-[14.5px] font-extrabold text-primary flex items-center gap-1.5 mb-4 px-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>이 시간 동탄 라운지 인기 토크</span>
            </h3>
            <div className="flex flex-col gap-3">
              {recommendedPosts.map((recPost) => (
                <div
                  key={recPost.id}
                  onClick={() => {
                    if (isModal) {
                      window.location.hash = `post=${recPost.id}`;
                    } else {
                      router.push(`/lounge/${recPost.id}`);
                    }
                  }}
                  className="flex items-center justify-between p-3.5 bg-body hover:bg-body/70 border border-border/50 hover:border-[#008262]/20 dark:hover:border-[#00d29d]/20 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        (recPost.category === '동탄 임장/분석' || recPost.category === '임장기') ? 'bg-[#e8f8f0] text-[#00a06c]' :
                        (recPost.category === '부동산 고민상담' || recPost.category === '부동산 기초') ? 'bg-[#ffe8e8] text-toss-red' :
                        (recPost.category === '동탄 청약/대출' || recPost.category === '정책자금 대출') ? 'bg-toss-blue-light text-toss-blue' :
                        'bg-surface border border-border text-secondary'
                      }`}>
                        {recPost.category === '임장기' ? '동탄 임장/분석' : 
                         recPost.category === '부동산 기초' ? '부동산 고민상담' :
                         recPost.category === '정책자금 대출' ? '동탄 청약/대출' :
                         recPost.category}
                      </span>
                      <span className="text-[11.5px] font-semibold text-tertiary truncate">
                        {recPost.authorName}
                      </span>
                    </div>
                    <h4 className="text-[14px] font-bold text-primary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors truncate">
                      {recPost.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] font-bold text-tertiary shrink-0">
                    <span className="flex items-center gap-0.5"><Eye size={12}/> {recPost.views}</span>
                    <span className="flex items-center gap-0.5 text-rose-500"><Heart size={12} className="fill-current"/> {recPost.likes}</span>
                    <ChevronRight size={14} className="text-tertiary group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      </div>
    </>
  );
}

/**
 * Automatically parses text, finding any mention of dongtan apartments,
 * and wraps them in clean markdown links pointing to the apartment page,
 * while safely ignoring existing markdown links and images.
 */
const autoLinkApartments = (content: string, apartments: string[]): string => {
  if (!content || !apartments || apartments.length === 0) return content;

  // 1. Extract and sort unique short names by length descending to match longest first
  const shortNames = Array.from(
    new Set(
      apartments
        .map(apt => apt.replace(/\[.*?\]\s*/, '').trim())
        .filter(name => name.length >= 2)
    )
  ).sort((a, b) => b.length - a.length);

  // 2. Temporarily hide existing markdown links, images, and code blocks to prevent inner replacement
  const placeholders: string[] = [];
  const protectionRegex = /(!?\[.*?\]\(.*?\)|`.*?`)/g;
  
  let protectedContent = content.replace(protectionRegex, (match) => {
    const placeholder = `___LINK_PROTECT_${placeholders.length}___`;
    placeholders.push(match);
    return placeholder;
  });

  // 3. Perform apartment name replacement on the protected content
  const newLinkPlaceholders: string[] = [];

  shortNames.forEach((name) => {
    const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedName, 'g');
    
    protectedContent = protectedContent.replace(regex, (match) => {
      const placeholder = `___NEW_APT_LINK_${newLinkPlaceholders.length}___`;
      const url = `/#apt=${encodeURIComponent(name)}&utm_source=lounge&utm_medium=internal_link&utm_campaign=lounge_mention`;
      newLinkPlaceholders.push(`[${match}](${url})`);
      return placeholder;
    });
  });

  // 4. Restore new apartment links
  let finalContent = protectedContent;
  for (let i = 0; i < newLinkPlaceholders.length; i++) {
    finalContent = finalContent.replace(`___NEW_APT_LINK_${i}___`, newLinkPlaceholders[i]);
  }

  // 5. Restore original protected blocks (links, images, code)
  for (let i = 0; i < placeholders.length; i++) {
    finalContent = finalContent.replace(`___LINK_PROTECT_${i}___`, placeholders[i]);
  }

  return finalContent;
};


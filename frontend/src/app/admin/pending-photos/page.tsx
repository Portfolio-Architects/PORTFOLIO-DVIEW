'use client';

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebaseConfig';
import { logger } from '@/lib/services/logger';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, orderBy, Timestamp, setDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Camera, Check, X, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

import { userProfileConverter } from '@/lib/utils/firestoreConverters';

interface PendingPhoto {
  id: string;
  apartmentId: string;
  apartmentName: string;
  url: string;
  locationTag: string;
  locationTagId: string;
  caption: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp | null;
  uploaderName?: string;
  uploaderUid?: string;
}

const PendingPhotosPage = React.memo(function PendingPhotosPage() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const mountedRef = React.useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPendingPhotos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'pending_photos'),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      if (!mountedRef.current) return;
      const fetched: PendingPhoto[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as PendingPhoto);
      });
      // Sort by createdAt descending (client-side to avoid composite index requirement for MVP)
      fetched.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPhotos(fetched);
    } catch (error) {
      if (mountedRef.current) {
        logger.error('PendingPhotosPage', 'Error fetching pending photos', undefined, error);
        alert('데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPendingPhotos();
  }, []);

  const handleApprove = async (photo: PendingPhoto) => {
    if (!window.confirm('이 사진을 승인하시겠습니까? (즉시 서비스에 노출됩니다)')) return;
    setProcessingId(photo.id);

    try {
      // 1. Get the target apartment report
      const reportRef = doc(db, 'scoutingReports', photo.apartmentId);
      const reportSnap = await getDoc(reportRef);
      if (!mountedRef.current) return;
      
      if (!reportSnap.exists()) {
        alert('연결된 아파트 정보를 찾을 수 없습니다.');
        setProcessingId(null);
        return;
      }

      const reportData = reportSnap.data();
      const currentImages = reportData.images || [];

      // 2. Fetch and update uploader profile points
      let uploaderPoints = 0;
      let uploaderTier = '초보 임장러';

      if (photo.uploaderUid && photo.uploaderUid !== 'anonymous') {
        const userRef = doc(db, 'users', photo.uploaderUid).withConverter(userProfileConverter);
        const userSnap = await getDoc(userRef);
        if (!mountedRef.current) return;
        if (userSnap.exists()) {
          const userData = userSnap.data();
          uploaderPoints = (userData.uploaderPoints || 0) + 20;
          
          if (uploaderPoints >= 150) {
            uploaderTier = '임장 마스터';
          } else if (uploaderPoints >= 55) {
            uploaderTier = '프로 임장러';
          } else {
            uploaderTier = '초보 임장러';
          }
          
          await setDoc(userRef, {
            uploaderPoints,
            uploaderTier
          }, { merge: true });
        }
      }

      if (!mountedRef.current) return;

      // 3. Add new image with uploader points and tier tags
      const newImage = {
        url: photo.url,
        caption: photo.caption,
        locationTag: photo.locationTagId, // Need ID for mappings
        isPremium: false,
        uploaderName: photo.uploaderName || '익명',
        uploaderPoints,
        uploaderTier
      };

      await updateDoc(reportRef, {
        images: [...currentImages, newImage]
      });

      if (!mountedRef.current) return;

      // 4. Update pending status
      await updateDoc(doc(db, 'pending_photos', photo.id), {
        status: 'approved',
        processedAt: new Date()
      });

      if (!mountedRef.current) return;

      // 5. Remove from list
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      
    } catch (error) {
      if (mountedRef.current) {
        logger.error('PendingPhotosPage', 'Approval failed', { photoId: photo.id }, error);
        alert('승인 처리 중 오류가 발생했습니다.');
      }
    } finally {
      if (mountedRef.current) {
        setProcessingId(null);
      }
    }
  };

  const handleReject = async (photo: PendingPhoto) => {
    if (!window.confirm('이 사진을 거절하시겠습니까? (영구 삭제됩니다)')) return;
    setProcessingId(photo.id);

    try {
      // 1. Update status
      await updateDoc(doc(db, 'pending_photos', photo.id), {
        status: 'rejected',
        processedAt: new Date()
      });

      if (!mountedRef.current) return;

      // 2. Try to delete from storage to save space (optional, but good practice)
      try {
        const imageRef = ref(storage, photo.url);
        await deleteObject(imageRef);
      } catch (e) {
        logger.warn('PendingPhotosPage', 'Could not delete image from storage', { url: photo.url }, e);
      }

      if (!mountedRef.current) return;

      // 3. Remove from list
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (error) {
      if (mountedRef.current) {
        logger.error('PendingPhotosPage', 'Rejection failed', { photoId: photo.id }, error);
        alert('거절 처리 중 오류가 발생했습니다.');
      }
    } finally {
      if (mountedRef.current) {
        setProcessingId(null);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-primary flex items-center gap-2">
            <Camera className="text-toss-blue" /> 사진 등록 관리 (대기열)
          </h1>
          <p className="text-[15px] text-secondary mt-1">
            입주민이 등록한 단지 사진을 검토하고 승인/거절합니다.
          </p>
        </div>
        <div className="bg-body px-4 py-2 rounded-xl text-[14px] font-bold text-secondary">
          대기 중: <span className="text-toss-blue">{photos.length}</span>건
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-tertiary">
          <Loader2 size={32} className="animate-spin mb-4" />
          <p>업로드 내역을 불러오는 중...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-body rounded-full flex items-center justify-center mb-4">
            <Check size={32} className="text-tertiary" />
          </div>
          <h3 className="text-[18px] font-bold text-primary mb-1">대기 중인 사진이 없습니다</h3>
          <p className="text-[14px] text-tertiary">모든 등록 사진 처리가 완료되었습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {photos.map(photo => (
            <div key={photo.id} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row group">
              {/* Image Preview Area - Large Left Panel */}
              <button 
                type="button"
                className="relative w-full md:w-[400px] lg:w-[480px] shrink-0 bg-body cursor-pointer overflow-hidden aspect-[4/3] md:aspect-auto md:min-h-[320px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue"
                onClick={() => window.open(photo.url, '_blank', 'noopener,noreferrer')}
                title="클릭하여 원본 보기"
                aria-label="클릭하여 업로드된 사진 원본 보기"
              >
                <Image 
                  src={photo.url} 
                  alt="" 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  sizes="(max-width: 768px) 100vw, 480px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90" />
                
                <div className="absolute top-4 right-4">
                  <span className="text-white/90 text-[12px] font-bold px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg shadow-sm">
                    {photo.createdAt?.toDate ? new Date(photo.createdAt.toDate()).toLocaleDateString() : '최근 등록'}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1.5">
                  <span className="w-fit bg-toss-blue text-white text-[12px] font-extrabold px-2.5 py-1 rounded shadow-sm uppercase tracking-wide">
                    {photo.locationTag}
                  </span>
                  <h3 className="text-[20px] font-black text-white drop-shadow-md truncate">
                    {photo.apartmentName}
                  </h3>
                </div>
              </button>

              {/* Card Body - Right Panel */}
              <div className="p-6 md:p-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[16px] font-extrabold text-primary">사진 설명 및 업로더 정보</h4>
                  <div className="flex items-center gap-2 text-[13px] text-tertiary font-medium bg-body px-3 py-1.5 rounded-full">
                    <div className="w-6 h-6 rounded-full bg-toss-blue/10 flex items-center justify-center text-toss-blue font-extrabold text-[11px]">
                      {photo.uploaderName ? photo.uploaderName.charAt(0) : '익'}
                    </div>
                    {photo.uploaderName || '익명 사용자'}
                  </div>
                </div>

                {/* Caption / Description Box */}
                <div className="bg-body rounded-xl p-5 mb-6 flex-1 border border-border/50 shadow-inner">
                  <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">
                    {photo.caption ? `"${photo.caption}"` : <span className="text-tertiary italic">작성된 설명이 없습니다.</span>}
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
                  <button 
                    onClick={() => handleReject(photo)}
                    disabled={processingId === photo.id}
                    className="flex items-center justify-center gap-2 py-4 rounded-xl text-[15px] font-bold text-toss-red bg-toss-red/10 hover:bg-toss-red/20 transition-colors disabled:opacity-50"
                  >
                    {processingId === photo.id ? <Loader2 size={18} className="animate-spin" /> : <X size={18} strokeWidth={3} />}
                    거절 및 삭제
                  </button>
                  <button 
                    onClick={() => handleApprove(photo)}
                    disabled={processingId === photo.id}
                    className="flex items-center justify-center gap-2 py-4 rounded-xl text-[15px] font-bold text-white bg-toss-blue hover:opacity-90 shadow-sm hover:shadow transition-all disabled:opacity-50"
                  >
                    {processingId === photo.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                    승인 (즉시 노출)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PendingPhotosPage.displayName = 'PendingPhotosPage';

export default PendingPhotosPage;

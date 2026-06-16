import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Image as ImageIcon, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImage } from '@/lib/services/storage.service';

import Image from 'next/image';
import type { User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';

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

export function PhotoUploadModal({ isOpen, onClose, apartmentId, apartmentName, user }: PhotoUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('gateImg');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset file, caption, and revoke object URL when modal is closed
  useEffect(() => {
    if (!isOpen) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
      }
      setPreviewUrl(null);
      setFile(null);
      setCaption('');
    }
  }, [isOpen, previewUrl]);

  // Revoke object URL to prevent memory leaks when preview URL changes or component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
      }
    };
  }, [previewUrl]);

  if (!isOpen || !mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith('image/')) {
      if (selected.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하여야 합니다.');
        return;
      }
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
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
      await addDoc(collection(db, 'pending_photos'), {
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
      });
      
      setIsSuccess(true);
      successTimeoutRef.current = setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFile(null);
        setPreviewUrl(null);
        setCaption('');
      }, 2000);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('업로드 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-[18px] font-bold text-primary flex items-center gap-2">
            <Camera className="text-toss-blue" size={20} />
            우리 단지 사진 올리기
          </h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-tertiary hover:bg-body rounded-full transition-colors"
            disabled={isUploading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
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
                onClick={() => signInWithPopup(auth, googleProvider)}
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
                <div 
                  className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden
                    ${previewUrl ? 'border-transparent bg-black' : 'border-border bg-body hover:bg-surface'}`}
                  onClick={() => fileInputRef.current?.click()}
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
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
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
}

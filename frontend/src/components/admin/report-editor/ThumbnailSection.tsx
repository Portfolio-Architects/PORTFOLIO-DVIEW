import React, { useRef } from 'react';
import { ImagePlus } from 'lucide-react';

interface ThumbnailSectionProps {
  thumbnailPreview: string;
  setThumbnailPreview: (url: string) => void;
  setThumbnailFile: (file: File | null) => void;
}

export const ThumbnailSection = React.memo(function ThumbnailSection({
  thumbnailPreview,
  setThumbnailPreview,
  setThumbnailFile
}: ThumbnailSectionProps) {
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="mb-12">
      <h3 className="text-[18px] font-bold text-primary mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-body text-secondary flex items-center justify-center text-[12px]">📷</span>
        대표 썸네일
      </h3>
      <div className="flex items-start gap-5">
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setThumbnailFile(file);
              setThumbnailPreview(URL.createObjectURL(file));
            }
            e.target.value = '';
          }}
        />
        <div
          onClick={() => thumbnailInputRef.current?.click()}
          className="w-[200px] h-[130px] bg-body border-2 border-dashed border-toss-gray rounded-2xl flex flex-col items-center justify-center text-tertiary cursor-pointer hover:bg-body hover:text-toss-blue transition-colors overflow-hidden group relative shrink-0"
        >
          {thumbnailPreview ? (
            <>
              <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-surface text-[11px] font-bold">변경하기</span>
              </div>
            </>
          ) : (
            <>
              <ImagePlus size={28} className="mb-1" />
              <span className="text-[12px] font-semibold">썸네일 등록</span>
            </>
          )}
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-secondary font-medium mb-2">
            메인 피드에 표시될 대표 이미지입니다.
          </p>
          <p className="text-[12px] text-tertiary">
            미등록 시 첫 번째 현장 사진이 자동 적용됩니다.
          </p>
          {thumbnailPreview && (
            <button
              type="button"
              onClick={() => { setThumbnailFile(null); setThumbnailPreview(''); }}
              className="mt-3 text-[12px] text-toss-red font-bold hover:underline"
            >
              썸네일 삭제
            </button>
          )}
        </div>
      </div>
    </section>
  );
});

ThumbnailSection.displayName = 'ThumbnailSection';

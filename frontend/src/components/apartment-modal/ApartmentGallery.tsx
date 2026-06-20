import React, { useRef, useEffect } from 'react';
import Image from 'next/image';

const GalleryRow = React.memo(function GalleryRow({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
    };

    const handleMouseUp = () => {
      isDown = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    // Touch event handlers with passive: true
    let touchStartX = 0;
    let touchScrollLeft = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].pageX - el.offsetLeft;
      touchScrollLeft = el.scrollLeft;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const x = e.touches[0].pageX - el.offsetLeft;
      const walk = (x - touchStartX) * 1.2;
      el.scrollLeft = touchScrollLeft - walk;
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);

      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div ref={rowRef} className={className}>
      {children}
    </div>
  );
});

export const ApartmentGallery = React.memo(function ApartmentGallery({ images, tags, tagLabels, onImageClick, aptName }: {
  images: {url: string; caption?: string; locationTag?: string; isPremium?: boolean; capturedAt?: string; uploaderName?: string}[];
  tags: string[];
  tagLabels: Record<string, string>;
  onImageClick: (url: string) => void;
  aptName?: string;
}) {
  const categories = tags.filter(t => t !== '전체');
  
  const groupedImages: Record<string, typeof images> = {};
  categories.forEach(tag => {
    groupedImages[tag] = images.filter(img => (img.locationTag || '기타') === tag);
  });

  return (
    <div className="flex flex-col gap-8 mt-2">
      {categories.map(tag => {
        const categoryImages = groupedImages[tag];
        if (!categoryImages || categoryImages.length === 0) return null;
        
        const label = tagLabels[tag] || tag;
        
        return (
          <div key={tag} className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-toss-blue rounded-full inline-block"></span>
                {label}
              </h3>
              <span className="text-[12px] font-bold text-tertiary bg-body px-2 py-0.5 rounded-md">
                {categoryImages.length}장
              </span>
            </div>
            
            <GalleryRow className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x shrink-0 w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categoryImages.map((img, i) => {
                const altText = aptName 
                  ? `동탄 ${aptName} ${img.caption ? img.caption : `${label} 전경 및 임장 사진`} - D-VIEW`
                  : (img.caption || img.locationTag || `Photo ${i + 1}`);
                  
                return (
                  <div
                    key={i}
                    className="relative shrink-0 w-[240px] md:w-[280px] aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group border border-border shadow-sm snap-start"
                    onClick={() => onImageClick(img.url)}
                  >
                    <Image
                      src={img.url}
                      alt={altText}
                      fill
                      quality={60}
                      priority={i < 2}
                      sizes="(max-width: 768px) 240px, 280px"
                      className="object-cover bg-body"
                    />
                  {/* Subtle Corner Watermark */}
                  <div className="absolute right-2 bottom-2 pointer-events-none z-20">
                    <span className="text-surface/60 font-bold text-[9px] tracking-wide select-none drop-shadow-md bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      {img.uploaderName ? `D-VIEW x ${img.uploaderName}` : 'D-VIEW'}
                    </span>
                  </div>
                  {(img.caption || img.isPremium || img.capturedAt) && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-3.5 pt-8">
                      <div className="flex flex-col gap-1.5">
                        {img.isPremium && (
                          <span className="w-fit text-[9px] font-bold bg-[#ffc107] text-primary px-1.5 py-0.5 rounded-md">★ PRO</span>
                        )}
                        {img.caption && (
                          <p className="text-[12px] font-medium text-surface line-clamp-2 leading-snug">{img.caption}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {img.capturedAt && (
                    <span className="absolute top-2 right-2 bg-black/60 text-surface text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                      {img.capturedAt}
                    </span>
                  )}
                </div>
                );
              })}
            </GalleryRow>
          </div>
        );
      })}

      {categories.length === 0 && (
        <div className="text-center py-8 text-tertiary text-[13px]">등록된 갤러리 사진이 없습니다.</div>
      )}
    </div>
  );
});

ApartmentGallery.displayName = 'ApartmentGallery';

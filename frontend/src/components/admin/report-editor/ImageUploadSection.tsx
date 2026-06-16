import React, { useRef, useState, useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { ImagePlus, Trash2, ArrowUpDown } from 'lucide-react';
import { FormValues } from './types';
import { IMAGE_CATEGORY_GROUPS, CAPTION_TEMPLATES } from './constants';
import { extractCapturedDate } from '@/lib/utils/exif';

export const ImageUploadSection = React.memo(function ImageUploadSection() {
  const { control, getValues, register } = useFormContext<FormValues>();

  const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage, replace: replaceImages } = useFieldArray({
    control,
    name: "images"
  });

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const uploadedFileKeys = useRef<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  // Auto-populate uploadedFileKeys based on existing images to track duplicates
  useEffect(() => {
    const images = getValues('images') || [];
    for (const img of images) {
      if (img.url) {
        try {
          const decoded = decodeURIComponent(img.url);
          const match = decoded.match(/\/([^/?]+)\?/);
          if (match) uploadedFileKeys.current.add(match[1]);
        } catch { /* ignore */ }
      }
      if (img.file) {
        uploadedFileKeys.current.add(img.file.name);
      }
    }
  }, [getValues, imageFields.length]); // Re-evaluate when field length changes (e.g., initialData load)

  const fieldsRef = useRef<any[]>([]);

  useEffect(() => {
    fieldsRef.current = imageFields;
  }, [imageFields]);

  useEffect(() => {
    return () => {
      // Clean up all blob preview URLs when the component unmounts
      fieldsRef.current.forEach(field => {
        if (field.previewUrl && field.previewUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(field.previewUrl); } catch { /* ignore */ }
        }
      });
    };
  }, []);

  const sortByCategory = () => {
    const currentImages = getValues('images');
    const categoryOrder = IMAGE_CATEGORY_GROUPS.flatMap(g => g.items);
    const sorted = [...currentImages].sort((a, b) => {
      const ai = categoryOrder.indexOf(a.locationTag);
      const bi = categoryOrder.indexOf(b.locationTag);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    replaceImages(sorted);
  };

  const handleImageSelect = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (uploadedFileKeys.current.has(file.name)) {
        alert('이미 업로드된 사진입니다.');
        e.target.value = '';
        return;
      }
      uploadedFileKeys.current.add(file.name);

      // Revoke the old preview URL if it was a blob URL
      const oldField = imageFields[index];
      if (oldField && oldField.previewUrl && oldField.previewUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(oldField.previewUrl); } catch { /* ignore */ }
      }

      const previewUrl = URL.createObjectURL(file);
      const capturedAt = await extractCapturedDate(file) || undefined;
      const currentVal = imageFields[index];
      updateImage(index, { ...currentVal, file, previewUrl, capturedAt });
    }
    e.target.value = '';
  };

  const handleBatchFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArr.length === 0) return;

    const unique: File[] = [];
    let dupCount = 0;
    for (const f of fileArr) {
      if (uploadedFileKeys.current.has(f.name)) {
        dupCount++;
      } else {
        uploadedFileKeys.current.add(f.name);
        unique.push(f);
      }
    }
    if (dupCount > 0) alert(`중복 사진 ${dupCount}장이 제외되었습니다.`);
    if (unique.length === 0) return;

    const withDates = await Promise.all(
      unique.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        const capturedAt = await extractCapturedDate(file) || undefined;
        return { file, previewUrl, url: '', caption: '', locationTag: '', isPremium: false, capturedAt };
      })
    );
    withDates.forEach(item => appendImage(item));
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleBatchFiles(e.dataTransfer.files);
  };

  return (
    <section className="mb-12">
      <h3 className="text-[18px] font-bold text-primary mb-6 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-body text-secondary flex items-center justify-center text-[12px]">3</span>
        현장 사진 데이터베이스
        <span className="text-[12px] font-medium text-tertiary ml-auto">{imageFields.length}장</span>
        {imageFields.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`사진 ${imageFields.length}장을 전부 삭제합니다. 계속할까요?`)) {
                imageFields.forEach(field => {
                  if (field.previewUrl && field.previewUrl.startsWith('blob:')) {
                    try { URL.revokeObjectURL(field.previewUrl); } catch { /* ignore */ }
                  }
                });
                replaceImages([]);
                uploadedFileKeys.current.clear();
              }
            }}
            className="px-3 py-1.5 bg-[#ffebec] text-toss-red rounded-lg text-[11px] font-bold hover:bg-toss-red hover:text-surface transition-colors"
          >
            전체 삭제
          </button>
        )}
      </h3>

      {/* Batch Drop Zone */}
      <div
        className={`mb-6 border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-toss-blue bg-toss-blue-light scale-[1.01]'
            : 'border-toss-gray bg-body hover:bg-body hover:border-toss-blue'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDropZone}
        onClick={() => batchInputRef.current?.click()}
      >
        <input ref={batchInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleBatchFiles(e.target.files); e.target.value = ''; }} />
        <div className="w-12 h-12 bg-surface rounded-full shadow-sm flex items-center justify-center mx-auto mb-3">
          <ImagePlus size={22} className="text-toss-blue" />
        </div>
        <p className="text-[15px] font-bold text-primary mb-1">
          {isDragging ? '여기에 놓으세요!' : '사진을 한번에 여러 장 추가'}
        </p>
        <p className="text-[12px] text-tertiary">드래그하거나 클릭하여 여러 사진을 선택한 후 카테고리를 직접 지정해주세요</p>
      </div>

      {/* Sort Button */}
      {imageFields.length >= 2 && (
        <button
          type="button"
          onClick={sortByCategory}
          className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-[13px] font-bold text-secondary hover:bg-body hover:border-toss-blue hover:text-toss-blue transition-all shadow-sm"
        >
          <ArrowUpDown size={14} />
          카테고리별 자동 정렬
          <span className="text-[11px] text-tertiary font-medium">({imageFields.length}장)</span>
        </button>
      )}

      <div className="space-y-4 mb-6">
        {imageFields.map((field, index) => (
          <div key={field.id} className="flex flex-col md:flex-row gap-4 p-4 border border-border rounded-2xl bg-surface shadow-sm hover:border-toss-blue transition-colors group relative">

            <input 
              type="file" 
              accept="image/*"
              className="hidden"
              ref={(el) => {
                fileInputRefs.current[index] = el;
              }}
              onChange={(e) => handleImageSelect(index, e)}
            />

            <div 
              className="w-full md:w-[150px] h-[100px] bg-body border-2 border-dashed border-toss-gray rounded-xl flex flex-col items-center justify-center text-tertiary cursor-pointer hover:bg-body hover:text-toss-blue transition-colors overflow-hidden group/img relative"
              onClick={() => fileInputRefs.current[index]?.click()}
            >
              {(field.previewUrl || field.url) ? (
                <>
                  <img src={field.previewUrl || field.url} alt="Preview" className="w-full h-full object-cover" />
                  {field.capturedAt && (
                    <span className="absolute bottom-1 left-1 bg-black/60 text-surface text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                      {field.capturedAt}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <span className="text-surface text-[11px] font-bold">변경하기</span>
                  </div>
                </>
              ) : (
                <>
                  <ImagePlus size={24} className="mb-1" />
                  <span className="text-[11px] font-semibold">이미지 추가</span>
                </>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex gap-3">
                {/* Category Picker */}
                {(() => {
                  const currentTag = field.locationTag;
                  const currentGroup = IMAGE_CATEGORY_GROUPS.find(g => g.items.includes(currentTag));
                  return (
                    <div className="relative w-[220px]">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`cat-popover-${index}`);
                          if (el) el.classList.toggle('hidden');
                        }}
                        className="w-full px-3 py-2 bg-body border border-border rounded-lg text-[13px] font-bold text-left cursor-pointer hover:border-toss-blue focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue outline-none transition-colors text-primary flex items-center justify-between"
                      >
                        <span className="truncate">{currentTag || '카테고리 선택'}</span>
                        <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 ml-1 text-tertiary"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                      </button>
                      <div
                        id={`cat-popover-${index}`}
                        className="hidden absolute top-full left-0 mt-1 z-50 bg-surface rounded-xl shadow-xl border border-border w-[380px] md:w-[560px] max-h-[280px] overflow-hidden"
                      >
                        {/* Group tabs */}
                        <div className="flex gap-1 p-2 overflow-x-auto border-b border-body bg-[#fafbfc]">
                          {IMAGE_CATEGORY_GROUPS.map((g, gIdx) => (
                            <button
                              key={g.group}
                              type="button"
                              onClick={() => {
                                const container = document.getElementById(`cat-popover-${index}`);
                                if (!container) return;
                                container.querySelectorAll('[data-cat-group]').forEach(el => el.classList.add('hidden'));
                                container.querySelector(`[data-cat-group="${gIdx}"]`)?.classList.remove('hidden');
                                container.querySelectorAll('[data-cat-tab]').forEach(el => {
                                  el.classList.remove('bg-primary', 'text-surface');
                                  el.classList.add('bg-body', 'text-secondary');
                                });
                                container.querySelector(`[data-cat-tab="${gIdx}"]`)?.classList.remove('bg-body', 'text-secondary');
                                container.querySelector(`[data-cat-tab="${gIdx}"]`)?.classList.add('bg-primary', 'text-surface');
                              }}
                              data-cat-tab={gIdx}
                              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                (currentGroup === g || (!currentGroup && gIdx === 0))
                                  ? 'bg-primary text-surface'
                                  : 'bg-body text-secondary hover:bg-[#e5e8eb]'
                              }`}
                            >
                              {g.group.replace(/[^\w가-힣·\s]/g, '').trim()}
                            </button>
                          ))}
                        </div>
                        {/* Items */}
                        {IMAGE_CATEGORY_GROUPS.map((g, gIdx) => (
                          <div
                            key={g.group}
                            data-cat-group={gIdx}
                            className={`p-2 flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto ${
                              (currentGroup === g || (!currentGroup && gIdx === 0)) ? '' : 'hidden'
                            }`}
                          >
                            {g.items.map(item => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  const currentVal = imageFields[index];
                                  updateImage(index, { ...currentVal, locationTag: item });
                                  document.getElementById(`cat-popover-${index}`)?.classList.add('hidden');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                                  currentTag === item
                                    ? 'bg-toss-blue-light text-toss-blue border-toss-blue font-bold'
                                    : 'bg-surface text-secondary border-border hover:bg-body hover:border-toss-blue'
                                }`}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <input
                  {...register(`images.${index}.caption` as const)}
                  className="flex-1 px-3 py-2 bg-body border border-border rounded-lg text-[13px] focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue outline-none placeholder-[#b0b8c1]"
                  placeholder={CAPTION_TEMPLATES[field.locationTag]?.[0] || '사진 설명 캡션을 입력하세요'}
                />
              </div>
              {/* Caption Template Chips */}
              {CAPTION_TEMPLATES[field.locationTag] && (
                <div className="flex flex-wrap gap-1.5">
                  {CAPTION_TEMPLATES[field.locationTag].map((tmpl, tIdx) => (
                    <button
                      key={tIdx}
                      type="button"
                      onClick={() => {
                        const currentVal = imageFields[index];
                        updateImage(index, { ...currentVal, caption: tmpl });
                      }}
                      className="px-2.5 py-1 bg-body hover:bg-toss-blue-light hover:text-toss-blue border border-border hover:border-toss-blue rounded-lg text-[11px] text-secondary font-medium transition-all truncate max-w-[240px]"
                      title={tmpl}
                    >
                      📝 {tmpl}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 w-full">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register(`images.${index}.isPremium` as const)} className="w-4 h-4 rounded text-toss-blue focus:ring-toss-blue border-toss-gray" />
                  <span className="text-[13px] font-semibold text-secondary">유료(프리미엄) 멤버 전용 숨김 처리</span>
                </label>
                
                <button 
                  type="button" 
                  onClick={() => {
                    const field = imageFields[index];
                    if (field && field.previewUrl && field.previewUrl.startsWith('blob:')) {
                      try { URL.revokeObjectURL(field.previewUrl); } catch { /* ignore */ }
                    }
                    removeImage(index);
                  }}
                  className="ml-auto text-tertiary hover:text-toss-red p-2 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button 
        type="button" 
        onClick={() => appendImage({ url: '', caption: '', locationTag: '', isPremium: false })}
        className="w-full py-4 border-2 border-dashed border-toss-gray rounded-2xl text-secondary font-bold text-[14px] hover:bg-body hover:text-toss-blue hover:border-toss-blue transition-all flex items-center justify-center gap-2"
      >
        <ImagePlus size={18} /> 사진 블록(Block) 추가
      </button>
    </section>
  );
});

ImageUploadSection.displayName = 'ImageUploadSection';

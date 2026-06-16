import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';

const RATING_EMOJIS = ['😡', '😟', '😐', '🙂', '🤩'] as const;
const RATING_LABELS = ['매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'] as const;
const RATING_COLORS = ['#f04452', '#ff6b35', '#ffc233', '#36b37e', '#00d29d'] as const;

export interface EmojiRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export const EmojiRating: React.FC<EmojiRatingProps> = React.memo(({ label, value, onChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-bold text-secondary mb-2">{label}</label>
      <div className="flex items-center gap-1.5">
        {RATING_EMOJIS.map((emoji, idx) => {
          const rating = idx + 1;
          const isSelected = value === rating;
          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(isSelected ? 0 : rating)}
              className={`relative group flex flex-col items-center`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[22px] transition-all duration-200 ${
                isSelected 
                  ? 'scale-125 shadow-lg ring-2' 
                  : value > 0 && value !== rating 
                    ? 'opacity-30 hover:opacity-60 hover:scale-105' 
                    : 'opacity-50 hover:opacity-80 hover:scale-110'
              }`}
                style={{
                  backgroundColor: isSelected ? `${RATING_COLORS[idx]}15` : 'transparent',
                  boxShadow: isSelected ? `0 0 0 2px ${RATING_COLORS[idx]}` : 'none',
                }}
              >
                {emoji}
              </div>
              <span className={`text-[10px] font-bold mt-0.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                style={{ color: RATING_COLORS[idx] }}
              >
                {RATING_LABELS[idx]}
              </span>
            </button>
          );
        })}
        {value > 0 && (
          <div className="ml-2 px-2.5 py-1 rounded-full text-[12px] font-extrabold text-surface"
            style={{ backgroundColor: RATING_COLORS[value - 1] }}
          >
            {value}/5
          </div>
        )}
      </div>
    </div>
  );
});

EmojiRating.displayName = 'EmojiRating';

export interface MultiPhotoDropzoneProps {
  label: string;
  placeholder: string;
  previews: string[];
  onFilesAdded: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const MultiPhotoDropzone: React.FC<MultiPhotoDropzoneProps> = React.memo(({ 
  label, placeholder, previews, onFilesAdded, onRemove, onDrop 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onDrop(e);
  };

  return (
    <div className="mt-3">
      <label className="block text-[13px] font-bold text-secondary mb-2">{label}</label>

      {/* Grid of existing previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {previews.map((preview, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden border border-border shadow-sm aspect-square group">
              <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
              <button 
                onClick={() => onRemove(idx)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-toss-red backdrop-blur-sm rounded-full flex items-center justify-center text-surface transition-all opacity-0 group-hover:opacity-100"
                title="사진 삭제"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <span className="text-[10px] text-surface font-bold">{idx + 1}/{previews.length}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add more photos zone */}
      <div 
        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer group flex flex-col items-center justify-center py-5 px-4 text-center ${
          isDragging 
            ? 'border-[#008262] dark:border-[#00d29d] bg-[#008262]/10 dark:bg-[#00d29d]/10 scale-[1.02]' 
            : 'border-toss-gray bg-body hover:bg-body hover:border-[#008262] dark:hover:border-[#00d29d]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropInternal}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          multiple 
          capture="environment"
          onChange={onFilesAdded} 
          className="hidden" 
        />
        <div className="w-9 h-9 bg-surface rounded-full shadow-sm flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
          {isDragging ? <ImagePlus size={18} className="text-[#008262] dark:text-[#00d29d]" /> : <Camera size={18} className="text-[#008262] dark:text-[#00d29d]" />}
        </div>
        <p className="text-[13px] font-bold text-primary">
          {previews.length > 0 ? '사진 더 추가하기' : placeholder}
        </p>
        <p className="text-[11px] text-tertiary mt-0.5">터치하여 촬영 / 여러 장 선택 가능</p>
      </div>
    </div>
  );
});

MultiPhotoDropzone.displayName = 'MultiPhotoDropzone';

export interface TextInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isTextarea?: boolean;
}

export const TextInput: React.FC<TextInputProps> = React.memo(({ label, placeholder, value, onChange, isTextarea = false }) => {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-bold text-primary mb-1.5">{label}</label>
      {isTextarea ? (
        <textarea 
          placeholder={placeholder} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          rows={2}
          className="w-full bg-body border border-toss-gray rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[#008262] dark:focus:border-[#00d29d] focus:bg-surface transition-colors resize-none focus:ring-4 focus:ring-[#008262]/10 dark:focus:ring-[#00d29d]/10" 
        />
      ) : (
        <input 
          type="text" 
          placeholder={placeholder} 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-body border border-toss-gray rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[#008262] dark:focus:border-[#00d29d] focus:bg-surface transition-colors focus:ring-4 focus:ring-[#008262]/10 dark:focus:ring-[#00d29d]/10" 
        />
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

export interface SelectInputProps {
  label: string;
  options: {value: string, label: string}[];
  value: string;
  onChange: (value: string) => void;
}

export const SelectInput: React.FC<SelectInputProps> = React.memo(({ label, options, value, onChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-bold text-primary mb-1.5">{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-body border border-toss-gray rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[#008262] dark:focus:border-[#00d29d] focus:bg-surface transition-colors cursor-pointer appearance-none ${value ? 'text-primary font-medium' : 'text-tertiary'}`}
      >
        <option value="" disabled>선택해주세요</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="text-primary">{opt.label}</option>
        ))}
      </select>
    </div>
  );
});

SelectInput.displayName = 'SelectInput';

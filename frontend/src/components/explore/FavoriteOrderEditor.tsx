import React, { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';

interface FavoriteOrderEditorProps {
  favoritesArray: string[];
  updateFavoriteOrder?: (newOrder: string[]) => Promise<void>;
}

export function FavoriteOrderEditor({ favoritesArray, updateFavoriteOrder }: FavoriteOrderEditorProps) {
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const orderEditorRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    function handleClickOutside(event: MouseEvent) {
      if (orderEditorRef.current && !orderEditorRef.current.contains(event.target as Node)) {
        setShowOrderEditor(false);
      }
    }
    if (showOrderEditor) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOrderEditor]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const nextArray = [...favoritesArray];
    const targetItem = nextArray.splice(draggedIndex, 1)[0];
    nextArray.splice(index, 0, targetItem);

    setDraggedIndex(index);
    if (updateFavoriteOrder) {
      updateFavoriteOrder(nextArray);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="relative flex items-center" ref={orderEditorRef}>
      <button
        onClick={() => setShowOrderEditor(!showOrderEditor)}
        title="관심 단지 정렬 순서 편집"
        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-extrabold bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary hover:text-primary rounded-lg transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-[#00d29d] shadow-sm shrink-0"
      >
        <Settings size={12} className="text-secondary" />
        <span>순서 편집</span>
      </button>

      {/* Popover UI */}
      {showOrderEditor && (
        <div className="absolute left-0 top-[28px] z-[50] w-[260px] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] text-secondary font-extrabold mb-2 border-b border-border/60 pb-1.5 flex justify-between items-center">
            <span>⭐ 관심 단지 순서 편집</span>
            <span className="text-[9px] text-tertiary font-normal">드래그하여 순서 변경</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {favoritesArray.map((fav, index) => (
              <div
                key={fav}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex justify-between items-center px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-border/40 rounded-xl cursor-grab active:cursor-grabbing text-[11px] font-bold text-primary select-none transition-colors ${
                  draggedIndex === index ? "opacity-40 border-dashed border-[#00d29d]" : ""
                }`}
              >
                <span className="truncate pr-2">{getDisplayAptName(fav)}</span>
                <span className="text-tertiary text-[10px] shrink-0 font-normal">☰</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

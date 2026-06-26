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
  const [activeReorderIndex, setActiveReorderIndex] = useState<number | null>(null);
  const orderEditorRef = useRef<HTMLDivElement>(null);

  // Click outside and ESC key to close
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    function handleClickOutside(event: MouseEvent) {
      if (orderEditorRef.current && !orderEditorRef.current.contains(event.target as Node)) {
        setShowOrderEditor(false);
        setActiveReorderIndex(null);
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOrderEditor(false);
        setActiveReorderIndex(null);
      }
    };
    if (showOrderEditor) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
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

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (activeReorderIndex === index) {
        setActiveReorderIndex(null);
      } else {
        setActiveReorderIndex(index);
      }
    } else if (e.key === 'ArrowUp') {
      if (activeReorderIndex === index) {
        e.preventDefault();
        if (index > 0) {
          const nextArray = [...favoritesArray];
          const targetItem = nextArray.splice(index, 1)[0];
          nextArray.splice(index - 1, 0, targetItem);
          if (updateFavoriteOrder) {
            updateFavoriteOrder(nextArray);
          }
          setActiveReorderIndex(index - 1);
          setTimeout(() => {
            const items = orderEditorRef.current?.querySelectorAll('[role="listitem"]');
            if (items && items[index - 1]) {
              (items[index - 1] as HTMLElement).focus();
            }
          }, 10);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (activeReorderIndex === index) {
        e.preventDefault();
        if (index < favoritesArray.length - 1) {
          const nextArray = [...favoritesArray];
          const targetItem = nextArray.splice(index, 1)[0];
          nextArray.splice(index + 1, 0, targetItem);
          if (updateFavoriteOrder) {
            updateFavoriteOrder(nextArray);
          }
          setActiveReorderIndex(index + 1);
          setTimeout(() => {
            const items = orderEditorRef.current?.querySelectorAll('[role="listitem"]');
            if (items && items[index + 1]) {
              (items[index + 1] as HTMLElement).focus();
            }
          }, 10);
        }
      }
    }
  };

  return (
    <div className="relative flex items-center" ref={orderEditorRef}>
      <button
        onClick={() => setShowOrderEditor(!showOrderEditor)}
        title="관심 단지 정렬 순서 편집"
        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-extrabold bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary hover:text-primary rounded-lg transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-[#ea6100] shadow-sm shrink-0"
      >
        <Settings size={12} className="text-secondary" />
        <span>순서 편집</span>
      </button>

      {/* Popover UI */}
      {showOrderEditor && (
        <div className="absolute left-0 top-[28px] z-[50] w-[260px] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] text-secondary font-extrabold mb-2 border-b border-border/60 pb-1.5 flex justify-between items-center">
            <span>⭐ 관심 단지 순서 편집</span>
            <span className="text-[9px] text-tertiary font-normal">드래그 또는 방향키로 변경</span>
          </div>
          <div className="flex flex-col gap-1.5" role="list" aria-label="관심 단지 정렬 목록">
            {favoritesArray.map((fav, index) => {
              const isDragged = draggedIndex === index;
              const isKeyboardReordering = activeReorderIndex === index;
              return (
                <div
                  key={fav}
                  draggable
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${getDisplayAptName(fav)} 단지. 스페이스바 또는 엔터로 순서 이동 모드를 켜고 끌 수 있으며, 켠 상태에서 위아래 방향키로 순서를 변경할 수 있습니다.`}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`flex justify-between items-center px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border rounded-xl cursor-grab active:cursor-grabbing text-[11px] font-bold text-primary select-none transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                    isDragged ? "opacity-40 border-dashed border-emerald-500" : "border-border/40"
                  } ${
                    isKeyboardReordering ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5" : ""
                  }`}
                >
                  <span className="truncate pr-2">{getDisplayAptName(fav)}</span>
                  <span className="text-tertiary text-[10px] shrink-0 font-normal">
                    {isKeyboardReordering ? "⇅ (이동 모드)" : "☰"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

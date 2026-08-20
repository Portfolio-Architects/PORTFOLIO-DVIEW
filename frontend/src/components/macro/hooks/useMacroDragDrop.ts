import React, { useState, useEffect, useRef } from 'react';

export interface UseMacroDragDropProps {
  favoritesArray: string[];
  updateFavoriteOrder?: (newOrder: string[]) => Promise<void>;
}

export function useMacroDragDrop({ favoritesArray, updateFavoriteOrder }: UseMacroDragDropProps) {
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const orderEditorRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
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

  return {
    showOrderEditor,
    setShowOrderEditor,
    draggedIndex,
    orderEditorRef,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

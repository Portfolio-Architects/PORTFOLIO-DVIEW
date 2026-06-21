'use client';

import { useRouter } from 'next/navigation';
import React, { ReactNode, useEffect, useRef } from 'react';
import { usePreventElasticBounce } from '@/hooks/usePreventElasticBounce';

const LoungeModalBackdrop = React.memo(function LoungeModalBackdrop({ children, onClose }: { children: ReactNode, onClose?: () => void }) {
  const router = useRouter();
  const backdropRef = useRef<HTMLDivElement>(null);

  usePreventElasticBounce(backdropRef);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, onClose]);

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto w-full pt-6 pb-6 px-2 sm:pt-16 sm:pb-16 sm:px-4"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-[1040px] h-fit bg-surface rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
});

LoungeModalBackdrop.displayName = 'LoungeModalBackdrop';
export default LoungeModalBackdrop;

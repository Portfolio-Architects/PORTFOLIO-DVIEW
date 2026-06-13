import React from 'react';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface font-sans selection:bg-toss-blue/20">
      <a href="#main-content" className="sr-only focus:not-sr-only">내용으로 건너뛰기</a>
      <LoungeHeader activeTab="imjang" />
      {children}
      <MobileDock activeTab="imjang" />
    </div>
  );
}

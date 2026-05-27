'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Settings, Menu, X, ExternalLink, BarChart2, Camera, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import AdminGuard from '@/components/auth/AdminGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/admin', label: '아파트 대시보드', icon: LayoutDashboard, section: 'Reports' },
    { href: '/admin/reports', label: '리포트', icon: FileText, section: 'Reports' },
    { href: '/admin/inquiries', label: '광고/제휴 문의 관리', icon: MessageSquare, section: 'Reports' },
    { href: '/admin/pending-photos', label: '사진 등록 관리', icon: Camera, section: 'Photos' },
  ];

  const isActive = (href: string) => pathname === href;

  // Inject CSS for Firebase image thumbnails at runtime
  useEffect(() => {
    const styleId = 'admin-thumb-fix';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = 'img[src*="firebasestorage"]{width:80px!important;height:60px!important;min-width:80px!important;max-width:80px!important;max-height:60px!important;object-fit:cover!important;border-radius:8px;flex-shrink:0}';
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  const renderSidebarContent = () => (
    <>
      <div className="mb-10 flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-primary tracking-tight">Admin<span className="text-toss-blue"> CMS</span></h2>
        <span className="text-[10px] bg-toss-blue-light text-toss-blue px-1.5 py-0.5 rounded-sm font-bold">Beta</span>
      </div>
      <nav className="flex flex-col gap-1">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
              isActive(link.href) ? 'bg-toss-blue text-surface shadow-lg shadow-[#00d29d]/20' : 'text-secondary hover:bg-body'
            }`}>
            <link.icon size={18} />
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-6 border-t border-body">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold text-tertiary hover:bg-body hover:text-toss-blue transition-all">
          <ExternalLink size={16} /> 소비자 화면 보기
        </Link>
      </div>
    </>
  );

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-body">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-[240px] shrink-0 flex-col bg-surface p-6 border-r border-border fixed h-full overflow-y-auto z-30">
          {renderSidebarContent()}
        </aside>

        {/* Spacer for fixed sidebar */}
        <div className="hidden md:block w-[240px] shrink-0" />

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-primary">Admin<span className="text-toss-blue"> CMS</span></h2>
          <div className="flex items-center gap-1">
            <Link href="/" className="p-2 text-tertiary hover:text-toss-blue transition-colors" title="소비자 화면 보기">
              <ExternalLink size={20} />
            </Link>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-secondary">
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="md:hidden fixed top-0 left-0 z-50 w-[280px] h-full bg-surface flex flex-col p-6 overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex justify-end mb-2">
                <button onClick={() => setSidebarOpen(false)} className="p-1 text-tertiary">
                  <X size={20} />
                </button>
              </div>
              {renderSidebarContent()}
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 pt-16 md:p-8 md:pt-6 lg:p-12 lg:pt-8 overflow-y-auto w-full max-w-7xl mx-auto flex flex-col">
          <div className="hidden md:flex justify-end mb-4">
            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-tertiary hover:text-toss-blue hover:bg-surface hover:shadow-sm transition-all border border-transparent hover:border-border">
              <ExternalLink size={15} /> 소비자 화면으로 가기
            </Link>
          </div>
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}

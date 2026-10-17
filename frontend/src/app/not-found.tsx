import { Search, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-[100px] font-black text-[#e5e8eb] leading-none mb-4 select-none">
          404
        </div>
        <div className="w-14 h-14 rounded-2xl bg-[#057e77]/10 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <Search size={28} className="text-[#057e77] dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-extrabold text-primary mb-2">
          페이지를 찾을 수 없어요
        </h2>
        <p className="text-[14px] text-[#6b7684] leading-relaxed mb-8">
          요청하신 페이지가 존재하지 않거나<br />
          주소가 변경되었을 수 있습니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#057e77] dark:bg-[#057e77] text-white rounded-xl font-bold text-[14px] hover:bg-[#046660] dark:hover:bg-[#046660] transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Home size={16} />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

import React from "react";

interface LoungeTalkWidgetProps {
  postsData?: {
    posts: Array<{
      id: string | number;
      category?: string;
      title: string;
      summary?: string;
      commentCount: number;
      views: number;
    }>;
  };
}

export function LoungeTalkWidget({ postsData }: LoungeTalkWidgetProps) {
  return (
    <div className="w-full bg-surface rounded-2xl border border-border p-5 flex flex-col gap-4 shadow-sm min-h-[300px]">
      <div className="flex justify-between items-center border-b border-border/50 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0">
            실시간 라운지
          </span>
          <h4 className="text-[15px] font-black text-primary tracking-tight">
            동탄 커뮤니티
          </h4>
        </div>
        <button 
          onClick={() => {
            window.location.href = '/lounge';
          }}
          className="text-[11.5px] font-bold text-secondary hover:text-[#00d29d] transition-colors bg-transparent border-none cursor-pointer"
        >
          라운지 전체보기 ➔
        </button>
      </div>
      
      <div className="flex flex-grow flex-col gap-3">
        {(!postsData?.posts || postsData.posts.length === 0) ? (
          <div className="flex-grow flex items-center justify-center text-tertiary text-[12px] font-medium py-8 border border-dashed border-border/40 rounded-2xl">
            아직 라운지 이야기가 등록되지 않았습니다.
          </div>
        ) : (
          postsData.posts.slice(0, 4).map((post: any) => (
            <button 
              key={post.id}
              type="button"
              aria-label={`추천 토크: ${post.title}, 카테고리: ${post.category || '기타'} 상세 보기`}
              onClick={() => {
                if (window.location.pathname === '/' || window.location.pathname === '') {
                  window.location.hash = `post=${post.id}`;
                } else {
                  window.location.href = `/lounge#post=${post.id}`;
                }
              }}
              className="flex justify-between items-center p-3 hover:bg-body/50 dark:hover:bg-zinc-950/20 border border-transparent hover:border-border/30 rounded-xl transition-all cursor-pointer group active:scale-[0.995] w-full text-left bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#00d29d]/50"
            >
              <div className="flex flex-col gap-1 min-w-0 mr-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-bold text-[#00b386] dark:text-[#00d29d] bg-[#00d29d]/10 dark:bg-[#00d29d]/20 px-1.5 py-0.5 rounded shrink-0">
                    {post.category || '기타'}
                  </span>
                  <span className="text-[12.5px] font-bold text-primary truncate group-hover:text-[#00d29d] transition-colors">
                    {post.title}
                  </span>
                </div>
                <span className="text-[11px] text-tertiary font-medium line-clamp-1">
                  {post.summary || '내용 없음'}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[10.5px] text-tertiary font-semibold">
                <span className="flex items-center gap-1">
                  💬 {post.commentCount}
                </span>
                <span>
                  조회 {post.views}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

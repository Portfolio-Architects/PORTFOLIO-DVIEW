import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, UserCircle, Crown, ChevronRight } from 'lucide-react';
import type { CommentData } from '@/lib/types/report.types';
import type { User } from 'firebase/auth';
import { usePWA } from '@/components/pwa/PWAProvider';

interface CommentSectionProps {
  comments: CommentData[];
  commentInput: string;
  onCommentChange: (text: string) => void;
  onSubmitComment: () => void;
  user: User | null;
  isUnlocked: boolean;
  premiumContent?: string;
  apartmentName: string;
  onCloseAptModal: () => void;
  managerPostId: string | null;
  managerPostTitle: string;
}

export default function CommentSection({
  comments,
  commentInput,
  onCommentChange,
  onSubmitComment,
  user,
  isUnlocked,
  premiumContent,
  apartmentName,
  onCloseAptModal,
  managerPostId,
  managerPostTitle,
}: CommentSectionProps) {
  const { triggerCustomA2HSModal } = usePWA();
  const [activeSubTab, setActiveSubTab] = useState<'manager' | 'comments'>('manager');

  const parsedTitle = useMemo(() => {
    if (!premiumContent) return '';
    const match = premiumContent.match(/^#+\s+(.*)$/m);
    if (match) {
      return match[1].replace(/^[🏢👑]\s*/, '').trim();
    }
    return '';
  }, [premiumContent]);

  const handleAction = () => {
    onSubmitComment();
    // 댓글 달면 A2HS 모달 트리거 (조건은 Provider 내부에서 알아서 필터링됨)
    triggerCustomA2HSModal();
  };

  const handleGoToPost = () => {
    if (managerPostId) {
      window.location.hash = `#post=${managerPostId}`;
      onCloseAptModal();
    } else {
      window.location.hash = '#lounge';
      onCloseAptModal();
    }
  };

  const hasPremium = !!premiumContent;
  const currentSubTab = hasPremium ? activeSubTab : 'comments';

  return (
    <div id="sec-comments" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14">
      {hasPremium && (
        <div className="bg-[#f2f4f6] dark:bg-slate-900/50 p-1 rounded-2xl flex items-center shadow-inner border border-border/20 gap-1 w-fit mb-6">
          <button
            onClick={() => setActiveSubTab('manager')}
            className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
              activeSubTab === 'manager'
                ? 'bg-surface text-primary shadow-sm border-none'
                : 'text-tertiary hover:text-secondary'
            }`}
          >
            매니저 임장기
          </button>
          <button
            onClick={() => setActiveSubTab('comments')}
            className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
              activeSubTab === 'comments'
                ? 'bg-surface text-primary shadow-sm border-none'
                : 'text-tertiary hover:text-secondary'
            }`}
          >
            입주민 이야기 ({comments.length})
          </button>
        </div>
      )}

      {currentSubTab === 'manager' ? (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100 dark:border-emerald-900/50 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Crown size={15} className="text-emerald-500 fill-emerald-500" />
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">Premium Report</span>
            </div>
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-primary leading-snug break-keep">
              {managerPostTitle || parsedTitle || `${apartmentName} 매니저 임장기`}
            </h3>
            <p className="text-[12.5px] text-secondary mt-1.5 leading-relaxed font-medium">
              D-VIEW 매니저가 직접 발로 뛰며 입지, 호재, 인프라를 팩트체크한 심층 보고서 원본을 라운지에서 확인해보세요.
            </p>
          </div>
          <button
            onClick={handleGoToPost}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[13px] px-5 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-98 flex items-center gap-1.5 border-none cursor-pointer"
          >
            <span>전체 임장기 읽기</span>
            <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
            <MessageSquare size={20} className="text-toss-blue"/> 
            아파트 이야기 <span className="text-toss-blue text-[16px] ml-1">{comments.length}</span>
          </h2>
          
          <div className="flex flex-col gap-6">
            {/* Input Area */}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={user ? "임장기에 대한 생각이나 궁금한 점을 남겨주세요." : "로그인 후 댓글을 남길 수 있습니다."}
                disabled={!user}
                className="flex-1 border border-border rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue disabled:bg-body"
                value={commentInput}
                onChange={(e) => onCommentChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAction();
                }}
              />
              <button 
                onClick={handleAction}
                disabled={!user || !commentInput.trim()}
                className="bg-toss-blue text-surface px-5 rounded-xl font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                등록
              </button>
            </div>

            {/* Comment List */}
            <div className="flex flex-col gap-4 mt-2">
              {comments.length > 0 ? (
                <>
                  {/* 최신 1개 댓글은 무료 공개 */}
                  {comments.slice(0, 1).map(comment => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))}

                  {/* 나머지 댓글: 결제 사용자만 */}
                  {comments.length > 1 && (
                    isUnlocked ? (
                      comments.slice(1).map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                      ))
                    ) : (
                      <div className="relative">
                        <div className="blur-sm opacity-40 pointer-events-none">
                          {comments.slice(1, 3).map(comment => (
                            <div key={comment.id} className="flex gap-3 bg-body p-4 rounded-2xl border border-border mb-3">
                              <div className="w-8 h-8 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center shrink-0">
                                <UserCircle size={16} className="text-tertiary" />
                              </div>
                              <div className="flex-1">
                                <div className="h-3 bg-[#e5e8eb] rounded w-20 mb-2" />
                                <div className="h-3 bg-[#e5e8eb] rounded w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-surface border border-border rounded-2xl px-6 py-4 text-center shadow-lg">
                            <p className="text-[14px] font-bold text-primary mb-1">🔒 {comments.length - 1}개의 이야기가 더 있습니다</p>
                            <p className="text-[12px] text-tertiary">프리미엄 구독으로 모든 이야기를 확인하세요</p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-tertiary text-[14px]">
                  아직 작성된 댓글이 없습니다. 첫 댓글을 남겨보세요!
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Single comment item */
function CommentItem({ comment }: { comment: CommentData }) {
  return (
    <div className="flex gap-3 bg-body p-4 rounded-2xl border border-border">
      <div className="w-8 h-8 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center shrink-0">
        <UserCircle size={16} className="text-tertiary" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-bold text-[14px] text-primary">{comment.author}</span>
          <span className="text-[12px] text-tertiary">{String(comment.createdAt)}</span>
        </div>
        <p className="text-[14px] text-secondary leading-relaxed break-all whitespace-pre-wrap">{comment.text}</p>
      </div>
    </div>
  );
}

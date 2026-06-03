import { UserCircle, MessageSquare } from 'lucide-react';
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
  selectedCommentId?: string;
}

export default function CommentSection({
  comments,
  commentInput,
  onCommentChange,
  onSubmitComment,
  user,
  isUnlocked,
  selectedCommentId,
}: CommentSectionProps) {
  const { triggerCustomA2HSModal } = usePWA();

  const handleAction = () => {
    onSubmitComment();
    // 댓글 달면 A2HS 모달 트리거 (조건은 Provider 내부에서 알아서 필터링됨)
    triggerCustomA2HSModal();
  };

  return (
    <div id="sec-comments" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14">
      <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
        <MessageSquare size={20} className="text-toss-blue"/> 
        아파트 이야기 <span className="text-toss-blue text-[16px] ml-1">{comments.length}</span>
      </h2>
      
      <div className="flex flex-col gap-6">
        {/* Input Area */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder={user ? "임장기에 대한 생각이나 궁금한 점을 남겨주세요." : "로그인 후 댓글을 남길 수 있습니다."}
              disabled={!user}
              className="flex-1 border border-border rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 disabled:bg-body transition-shadow"
              value={commentInput}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAction();
              }}
            />
            <button 
              onClick={handleAction}
              disabled={!user || !commentInput.trim()}
              className="bg-toss-blue text-surface px-5 rounded-xl font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              등록
            </button>
          </div>
          {user && (
            <p className="text-[12px] text-tertiary flex items-center gap-1.5 pl-1 select-none">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
              댓글에 <strong className="text-teal-600 dark:text-teal-400 font-semibold">@작성자명</strong>을 입력하여 특정 유저를 멘션할 수 있습니다.
            </p>
          )}
        </div>

        {/* Comment List */}
        <div className="flex flex-col gap-4 mt-2">
          {comments.length > 0 ? (
            <>
              {/* 최신 1개 댓글은 무료 공개 */}
              {comments.slice(0, 1).map(comment => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  isHighlighted={comment.id === selectedCommentId} 
                />
              ))}

              {/* 나머지 댓글: 결제 사용자만 */}
              {comments.length > 1 && (
                isUnlocked ? (
                  comments.slice(1).map(comment => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      isHighlighted={comment.id === selectedCommentId} 
                    />
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
    </div>
  );
}

/** 멘션 하이라이트 파싱 헬퍼 함수 */
function renderCommentText(text: string) {
  if (!text) return '';
  const mentionRegex = /(@[a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣_]+)/g;
  const parts = text.split(mentionRegex);
  
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span 
          key={index} 
          className="text-teal-600 font-semibold bg-teal-50/80 px-1 py-0.5 rounded dark:text-teal-400 dark:bg-teal-950/40"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/** Single comment item */
function CommentItem({ comment, isHighlighted }: { comment: CommentData; isHighlighted?: boolean }) {
  return (
    <div 
      id={`comment-${comment.id}`}
      className={`flex gap-3 bg-body p-4 rounded-2xl border transition-all duration-300 ${
        isHighlighted 
          ? 'comment-highlight border-toss-blue' 
          : 'border-border'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center shrink-0">
        <UserCircle size={16} className="text-tertiary" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-bold text-[14px] text-primary">{comment.author}</span>
          <span className="text-[12px] text-tertiary">{String(comment.createdAt)}</span>
        </div>
        <p className="text-[14px] text-secondary leading-relaxed break-all whitespace-pre-wrap">
          {renderCommentText(comment.text)}
        </p>
      </div>
    </div>
  );
}

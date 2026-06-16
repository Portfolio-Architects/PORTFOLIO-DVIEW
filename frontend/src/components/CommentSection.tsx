import { UserCircle, MessageSquare } from 'lucide-react';
import type { CommentData } from '@/lib/types/report.types';
import type { User } from 'firebase/auth';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

interface CommentSectionProps {
  comments: CommentData[];
  commentInput: string;
  onCommentChange: (text: string) => void;
  onSubmitComment: () => void;
  user: User | null;
  isUnlocked: boolean;
  selectedCommentId?: string;
  onRequestLogin?: (message: string) => void;
}

export default function CommentSection({
  comments,
  commentInput,
  onCommentChange,
  onSubmitComment,
  user,
  isUnlocked,
  selectedCommentId,
  onRequestLogin,
}: CommentSectionProps) {
  const { triggerCustomA2HSModal } = usePWA();
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, []);
  
  // Suggestion states for autocomplete mentions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = () => {
    onSubmitComment();
    // 댓글 달면 A2HS 모달 트리거
    triggerCustomA2HSModal();
  };

  const handleMentionAuthor = (author: string) => {
    if (!user) return;
    const mentionText = `@${author} `;
    
    // Only append if it's not already in the input
    if (!commentInput.includes(mentionText)) {
      onCommentChange(commentInput + mentionText);
    }
    
    focusTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleInputChange = (text: string) => {
    onCommentChange(text);

    // Auto-suggest triggered by typing '@'
    const words = text.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1).toLowerCase();
      // Get unique authors from comments to suggest
      const authors = Array.from(new Set(comments.map(c => c.author)));
      const filtered = authors.filter(authName => 
        authName.toLowerCase().includes(query)
      );

      if (filtered.length > 0) {
        setSuggestions(filtered);
        setShowSuggestions(true);
        setSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (nickname: string) => {
    const words = commentInput.split(/\s+/);
    words[words.length - 1] = `@${nickname} `;
    onCommentChange(words.join(' '));
    setShowSuggestions(false);

    focusTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectSuggestion(suggestions[suggestionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
      }
    } else {
      if (e.key === 'Enter') {
        handleAction();
      }
    }
  };

  return (
    <div id="sec-comments" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14">
      <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
        <MessageSquare size={20} className="text-[#008262] dark:text-[#00d29d]"/> 
        아파트 이야기 <span className="text-[#008262] dark:text-[#00d29d] text-[16px] ml-1">{comments.length}</span>
      </h2>
      
      {/* 라운지 활성화 유도 배너 */}
      <div className="bg-[#e8f8f5] dark:bg-[#042820] border border-[#008262]/10 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
        <div className="flex flex-col">
          <span className="text-[13px] font-extrabold text-[#008262] dark:text-[#00d29d] flex items-center gap-1">
            💬 D-VIEW 동탄 라운지 오픈!
          </span>
          <span className="text-[12px] font-bold text-secondary mt-0.5 leading-relaxed">
            이웃 주민들과 실시간 동네 호재, 학군, 공동구매 및 유용한 꿀팁 정보를 나누어 보세요.
          </span>
        </div>
        <Link 
          href="/#lounge" 
          onClick={() => {
            const closeBtn = document.querySelector('button[title="닫기"]') as HTMLButtonElement || document.querySelector('[class*="ApartmentModal"] button') as HTMLButtonElement;
            if (closeBtn) {
              closeBtn.click();
            }
          }}
          className="shrink-0 text-[12px] font-black text-surface bg-[#008262] hover:bg-[#006b50] px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-center w-full sm:w-auto"
        >
          라운지 구경 가기 ➔
        </Link>
      </div>
      
      <div className="flex flex-col gap-6">
        {/* Input Area */}
        <div className="flex flex-col gap-2 relative">
          
          {/* Autocomplete Suggestion Popover */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={popoverRef}
              className="absolute bottom-full left-0 mb-2 w-full max-w-[280px] bg-white/95 dark:bg-zinc-950/95 border border-[#00d29d]/30 dark:border-emerald-500/30 rounded-2xl shadow-xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="text-[10px] font-extrabold text-[#00d29d] dark:text-emerald-400 px-3.5 py-2 border-b border-border/40 dark:border-zinc-800/40 uppercase tracking-widest bg-body/50 dark:bg-zinc-950/30">
                멘션할 대상을 선택하세요
              </div>
              <ul className="max-h-[160px] overflow-y-auto py-1 divide-y divide-border/20 dark:divide-zinc-800/20">
                {suggestions.map((nickname, idx) => (
                  <li 
                    key={nickname}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(nickname)}
                    className={`px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors flex items-center justify-between ${
                      suggestionIndex === idx 
                        ? 'bg-[#00d29d]/15 text-[#00a06c] dark:bg-emerald-500/20 dark:text-emerald-300' 
                        : 'text-secondary dark:text-zinc-300 hover:bg-body dark:hover:bg-zinc-900/50 hover:text-primary dark:hover:text-zinc-100'
                    }`}
                  >
                    <span>@{nickname}</span>
                    {suggestionIndex === idx && (
                      <span className="text-[9px] bg-[#00d29d]/20 dark:bg-emerald-500/30 text-[#00a06c] dark:text-emerald-300 px-1.5 py-0.5 rounded font-black tracking-wider">ENTER</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="임장기에 대한 생각이나 궁금한 점을 남겨주세요."
              className="flex-1 border border-border rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#008262]/20 focus:border-[#008262] dark:focus:ring-[#00d29d]/20 dark:focus:border-[#00d29d] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 transition-shadow"
              value={commentInput}
              onChange={(e) => {
                if (!user) {
                  onRequestLogin?.('댓글을 작성하여 이웃 주민들과 소통해 보세요.');
                  return;
                }
                handleInputChange(e.target.value);
              }}
              onFocus={(e) => {
                if (!user) {
                  e.target.blur();
                  onRequestLogin?.('댓글을 작성하여 이웃 주민들과 소통해 보세요.');
                }
              }}
              onClick={() => {
                if (!user) {
                  onRequestLogin?.('댓글을 작성하여 이웃 주민들과 소통해 보세요.');
                }
              }}
              onKeyDown={handleKeyDown}
            />
            <button 
              onClick={() => {
                if (!user) {
                  onRequestLogin?.('댓글을 작성하여 이웃 주민들과 소통해 보세요.');
                  return;
                }
                handleAction();
              }}
              disabled={!commentInput.trim()}
              className="bg-[#008262] hover:bg-[#006b50] dark:bg-[#00d29d] dark:hover:bg-[#00b386] text-surface dark:text-[#191f28] px-5 rounded-xl font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              등록
            </button>
          </div>
          {user && (
            <p className="text-[12px] text-tertiary flex items-center gap-1.5 pl-1 select-none">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
              댓글에 <strong className="text-teal-600 dark:text-teal-400 font-semibold">@작성자명</strong>을 입력하거나 작성자명을 눌러 멘션할 수 있습니다.
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
                  onClickAuthor={handleMentionAuthor}
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
                      onClickAuthor={handleMentionAuthor}
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
function CommentItem({ 
  comment, 
  isHighlighted, 
  onClickAuthor 
}: { 
  comment: CommentData; 
  isHighlighted?: boolean; 
  onClickAuthor?: (author: string) => void;
}) {
  return (
    <div 
      id={`comment-${comment.id}`}
      className={`flex gap-3 bg-body p-4 rounded-2xl border transition-all duration-300 ${
        isHighlighted 
          ? 'comment-highlight border-[#008262] dark:border-[#00d29d]' 
          : 'border-border'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center shrink-0">
        <UserCircle size={16} className="text-tertiary" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span 
            onClick={() => onClickAuthor && onClickAuthor(comment.author)}
            className="font-bold text-[14px] text-primary hover:text-teal-600 dark:hover:text-teal-400 hover:underline cursor-pointer transition-colors"
          >
            {comment.author}
          </span>
          <span className="text-[12px] text-tertiary">{String(comment.createdAt)}</span>
        </div>
        <p className="text-[14px] text-secondary leading-relaxed break-all whitespace-pre-wrap">
          {renderCommentText(comment.text)}
        </p>
      </div>
    </div>
  );
}

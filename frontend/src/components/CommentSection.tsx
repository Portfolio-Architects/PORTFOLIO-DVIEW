import { UserCircle, MessageSquare } from 'lucide-react';
import type { CommentData } from '@/lib/types/report.types';
import type { User } from 'firebase/auth';
import { usePWA } from '@/components/pwa/PWAProvider';
import React, { useRef, useState, useEffect } from 'react';
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

// Keep render-dependent regexes static at the module level to avoid recreation lag and react-hooks/refs lint errors
const MENTION_REGEX = /(@[a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣_]+)/g;

const CommentSection = React.memo(function CommentSection({
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
  
  // Cache event-only regexes in useRef to optimize input handling
  const spaceRegexRef = useRef(/\s+/);
  const isInvalidInputRef = useRef(/^\s*$/);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Suggestion states for autocomplete mentions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        popoverRef.current && 
        popoverRef.current.contains(event.target as Node) === false &&
        inputRef.current &&
        inputRef.current.contains(event.target as Node) === false
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleAction = () => {
    if (isInvalidInputRef.current.test(commentInput)) return;
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
    
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    focusTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && inputRef.current) {
        inputRef.current.focus();
      }
      focusTimeoutRef.current = null;
    }, 50);
  };

  const handleInputChange = (text: string) => {
    onCommentChange(text);

    // Auto-suggest triggered by typing '@'
    const words = text.split(spaceRegexRef.current);
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
    const words = commentInput.split(spaceRegexRef.current);
    words[words.length - 1] = `@${nickname} `;
    onCommentChange(words.join(' '));
    setShowSuggestions(false);

    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    focusTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && inputRef.current) {
        inputRef.current.focus();
      }
      focusTimeoutRef.current = null;
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

  // Generate JSON-LD structural data for CommentSection UGC (DiscussionForumPosting)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "name": "DVIEW 아파트 입주민 소통 라운지",
    "headline": "DVIEW 단지별 입주민 거주 후기 및 이야기",
    "description": "실제 입주민들이 작성한 단지 특징, 교통 편의성, 학군 및 거주 만족도 관련 소통 공간입니다.",
    "commentCount": comments.length,
    "comment": comments.map((c) => {
      let isoDate = new Date().toISOString();
      if (c.createdAt) {
        try {
          const timeVal = c.createdAt as unknown;
          if (timeVal && typeof timeVal === 'object') {
            if ('seconds' in timeVal && typeof (timeVal as { seconds: number }).seconds === 'number') {
              isoDate = new Date((timeVal as { seconds: number }).seconds * 1000).toISOString();
            } else if ('toDate' in timeVal && typeof (timeVal as { toDate: () => Date }).toDate === 'function') {
              isoDate = (timeVal as { toDate: () => Date }).toDate().toISOString();
            }
          } else if (typeof timeVal === 'string' || typeof timeVal === 'number') {
            const parsed = new Date(timeVal);
            if (!isNaN(parsed.getTime())) {
              isoDate = parsed.toISOString();
            }
          }
        } catch {}
      }
      return {
        "@type": "Comment",
        "text": c.text,
        "author": {
          "@type": "Person",
          "name": c.author
        },
        "dateCreated": isoDate
      };
    })
  };

  return (
    <div id="sec-comments" className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm scroll-mt-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="text-[19px] md:text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
        <MessageSquare size={20} className="text-[#c44d00] dark:text-[#ea6100]"/> 
        아파트 이야기
        <span className="bg-[#e8f8f5] dark:bg-[#042820] text-[#c44d00] dark:text-[#ea6100] text-[11.5px] font-bold px-2 py-0.5 rounded-full ml-1 shadow-sm border border-[#c44d00]/10 select-none">
          {comments.length}
        </span>
      </h2>
      
      {/* 라운지 활성화 유도 배너 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#e8f8f5] to-[#f4fcfb] dark:from-[#03231c] dark:to-[#042a22] border border-[#c44d00]/20 rounded-2xl p-4.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#ea6100]/10 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col relative z-10">
          <span className="text-[13px] font-extrabold text-[#c44d00] dark:text-[#ea6100] flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-[#c44d00]/15 dark:bg-[#ea6100]/15 text-[11px] animate-pulse">📢</span>
            D-VIEW 동탄 라운지 오픈!
          </span>
          <span className="text-[12px] font-bold text-secondary mt-1 leading-relaxed break-keep">
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
          className="relative z-10 shrink-0 text-[12px] font-black text-surface bg-[#c44d00] hover:bg-[#006b50] dark:bg-[#ea6100] dark:hover:bg-[#ff8f00] dark:text-[#191f28] px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-center w-full sm:w-auto hover:shadow-md cursor-pointer border-none"
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
              className="absolute bottom-full left-0 mb-2 w-full max-w-[280px] bg-white/95 dark:bg-zinc-950/95 border border-[#ea6100]/30 dark:border-emerald-500/30 rounded-2xl shadow-xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="text-[10px] font-extrabold text-[#ea6100] dark:text-emerald-400 px-3.5 py-2 border-b border-border/40 dark:border-zinc-800/40 uppercase tracking-widest bg-body/50 dark:bg-zinc-950/30">
                멘션할 대상을 선택하세요
              </div>
              <ul 
                id="mention-listbox"
                role="listbox"
                aria-label="멘션 자동완성 목록"
                className="max-h-[160px] overflow-y-auto py-1 divide-y divide-border/20 dark:divide-zinc-800/20"
              >
                {suggestions.map((nickname, idx) => (
                  <li 
                    key={nickname}
                    id={`mention-option-${idx}`}
                    role="option"
                    aria-selected={suggestionIndex === idx}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(nickname)}
                    className={`px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors flex items-center justify-between ${
                      suggestionIndex === idx 
                        ? 'bg-[#ea6100]/15 text-[#00a06c] dark:bg-emerald-500/20 dark:text-emerald-300' 
                        : 'text-secondary dark:text-zinc-300 hover:bg-body dark:hover:bg-zinc-900/50 hover:text-primary dark:hover:text-zinc-100'
                    }`}
                  >
                    <span>@{nickname}</span>
                    {suggestionIndex === idx && (
                      <span className="text-[9px] bg-[#ea6100]/20 dark:bg-emerald-500/30 text-[#00a06c] dark:text-emerald-300 px-1.5 py-0.5 rounded font-black tracking-wider">ENTER</span>
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
              role="combobox"
              placeholder="임장기에 대한 생각이나 궁금한 점을 남겨주세요."
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls={showSuggestions && suggestions.length > 0 ? "mention-listbox" : undefined}
              aria-activedescendant={showSuggestions && suggestions.length > 0 ? `mention-option-${suggestionIndex}` : undefined}
              className="flex-1 border border-border rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c44d00]/20 focus:border-[#c44d00] dark:focus:ring-[#ea6100]/20 dark:focus:border-[#ea6100] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 transition-shadow"
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
              className="bg-[#c44d00] hover:bg-[#006b50] dark:bg-[#ea6100] dark:hover:bg-[#ff8f00] text-surface dark:text-[#191f28] px-5 rounded-xl font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              등록
            </button>
          </div>
          {user && (
            <div className="bg-body/50 dark:bg-zinc-900/30 border border-border/30 rounded-xl p-3 flex items-start gap-2.5 select-none mt-1 animate-in fade-in duration-200">
              <span className="inline-flex items-center justify-center text-[10px] bg-[#c44d00]/10 dark:bg-[#ea6100]/15 text-[#c44d00] dark:text-[#ea6100] px-1.5 py-0.5 rounded font-black tracking-wider uppercase shrink-0">TIP</span>
              <p className="text-[11.5px] text-tertiary leading-relaxed break-keep font-semibold">
                댓글에 <strong className="text-[#c44d00] dark:text-[#ea6100] font-extrabold">@작성자명</strong>을 입력하거나 댓글의 작성자 닉네임을 클릭하여 즉시 멘션할 수 있습니다.
              </p>
            </div>
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
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/80 dark:border-zinc-800/80 rounded-2xl bg-body/30 dark:bg-zinc-900/10 mt-2 select-none animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-body dark:bg-zinc-900 border border-border/50 flex items-center justify-center mb-3.5 shadow-sm text-tertiary">
                <MessageSquare size={20} className="opacity-75 text-[#c44d00] dark:text-[#ea6100]" />
              </div>
              <p className="text-[13.5px] font-extrabold text-secondary mb-1">아직 등록된 이야기가 없습니다</p>
              <p className="text-[11.5px] text-tertiary break-keep max-w-[240px]">이 단지에 대한 첫 번째 주민 이야기를 나누어 소통해 보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
 
/** 멘션 하이라이트 파싱 헬퍼 함수 */
function renderCommentText(text: string) {
  if (!text) return '';
  const parts = text.split(MENTION_REGEX);
  
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
const CommentItem = React.memo(function CommentItem({ 
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
          ? 'comment-highlight border-[#c44d00] dark:border-[#ea6100]' 
          : 'border-border'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center shrink-0">
        <UserCircle size={16} className="text-tertiary" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <button 
            type="button"
            onClick={() => onClickAuthor && onClickAuthor(comment.author)}
            className="font-bold text-[14px] text-primary hover:text-teal-600 dark:hover:text-teal-400 hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
            aria-label={`@${comment.author} 멘션하기`}
          >
            {comment.author}
          </button>
          <span className="text-[12px] text-tertiary">{String(comment.createdAt)}</span>
        </div>
        <p className="text-[14px] text-secondary leading-relaxed break-all whitespace-pre-wrap">
          {renderCommentText(comment.text)}
        </p>
      </div>
    </div>
  );
});
 
CommentItem.displayName = 'CommentItem';
CommentSection.displayName = 'CommentSection';
export default CommentSection;

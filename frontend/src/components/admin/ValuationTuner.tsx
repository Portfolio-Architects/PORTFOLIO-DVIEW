/**
 * @file ValuationTuner.tsx
 * @description Admin panel component to review user vote sentiment and approve/apply valuation overrides.
 */

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Check, X, ShieldAlert, Award, TrendingUp, AlertTriangle, Play } from 'lucide-react';

interface VoteRecord {
  id: string;
  aptName: string;
  buyCount: number;
  waitCount: number;
}

interface Suggestion {
  aptName: string;
  normalizedId: string;
  buyCount: number;
  waitCount: number;
  suggestedAdjustment: number;
  reason: string;
}

export function ValuationTuner() {
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  // Load votes and overrides
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Votes
      const voteSnap = await getDocs(collection(db, 'apartmentVotes'));
      const fetchedVotes: VoteRecord[] = voteSnap.docs.map(doc => ({
        id: doc.id,
        aptName: doc.data().aptName || doc.id,
        buyCount: doc.data().buyCount || 0,
        waitCount: doc.data().waitCount || 0
      }));
      setVotes(fetchedVotes);

      // 2. Fetch Overrides
      const overrideDoc = await getDoc(doc(db, 'settings/valuation_overrides'));
      if (overrideDoc.exists()) {
        setOverrides(overrideDoc.data() as Record<string, number>);
      } else {
        setOverrides({});
      }

      // 3. Compute suggestions
      const computedSuggestions: Suggestion[] = [];
      fetchedVotes.forEach(v => {
        const total = v.buyCount + v.waitCount;
        if (total < 3) return; // Only suggest if there are at least 3 votes

        const buyRatio = v.buyCount / total;
        const currentOverride = (overrideDoc.exists() ? (overrideDoc.data()?.[v.id] || 0) : 0);

        if (buyRatio >= 0.75 && currentOverride !== 10) {
          computedSuggestions.push({
            aptName: v.aptName,
            normalizedId: v.id,
            buyCount: v.buyCount,
            waitCount: v.waitCount,
            suggestedAdjustment: 10,
            reason: `매수 심리 강력 (${Math.round(buyRatio * 100)}% 찬성) - 상품성 보정 +10점 권장`
          });
        } else if (buyRatio <= 0.25 && currentOverride !== -10) {
          computedSuggestions.push({
            aptName: v.aptName,
            normalizedId: v.id,
            buyCount: v.buyCount,
            waitCount: v.waitCount,
            suggestedAdjustment: -10,
            reason: `관망 심리 우세 (${Math.round((1 - buyRatio) * 100)}% 관망) - 상품성 보정 -10점 권장`
          });
        }
      });
      setSuggestions(computedSuggestions);
    } catch (error) {
      console.error('Failed to fetch valuation tuner data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (s: Suggestion) => {
    setActioning(s.normalizedId);
    try {
      const newOverrides = { ...overrides, [s.normalizedId]: s.suggestedAdjustment };
      await setDoc(doc(db, 'settings/valuation_overrides'), newOverrides);
      alert(`"${s.aptName}" 아파트에 ${s.suggestedAdjustment > 0 ? '+' : ''}${s.suggestedAdjustment}점 가치 보정이 반영되었습니다.`);
      await loadData();
    } catch (e: any) {
      alert('오류가 발생했습니다: ' + e.message);
    } finally {
      setActioning(null);
    }
  };

  const handleReset = async (normalizedId: string, aptName: string) => {
    if (!confirm(`"${aptName}"의 보정 값을 초기화하시겠습니까?`)) return;
    setActioning(normalizedId);
    try {
      const newOverrides = { ...overrides };
      delete newOverrides[normalizedId];
      await setDoc(doc(db, 'settings/valuation_overrides'), newOverrides);
      alert('초기화가 완료되었습니다.');
      await loadData();
    } catch (e: any) {
      alert('오류가 발생했습니다: ' + e.message);
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Left: Pending Tuning Suggestions */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-body">
          <ShieldAlert className="text-amber-500" size={20} />
          <h3 className="text-[16px] font-black text-primary">밸류에이션 점수 조정 권장 내역</h3>
          <span className="text-[11px] font-bold bg-amber-50 text-amber-500 px-2 py-0.5 rounded-full ml-auto">
            {suggestions.length}건
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="text-center py-10 text-tertiary text-[13.5px]">
            현재 실수요자 투표 기반 권장 조정 내역이 없습니다. (투표 수 3표 이상 기준)
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {suggestions.map((s) => (
              <div key={s.normalizedId} className="bg-body/40 border border-border/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-bold text-primary truncate">{s.aptName}</h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11.5px] font-semibold text-secondary">
                      매수 {s.buyCount}표 · 관망 {s.waitCount}표
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      {s.suggestedAdjustment > 0 ? '+' : ''}{s.suggestedAdjustment}점 보정
                    </span>
                  </div>
                  <p className="text-[11.5px] text-tertiary font-medium mt-2 leading-relaxed">
                    {s.reason}
                  </p>
                </div>
                
                <button
                  onClick={() => handleApprove(s)}
                  disabled={actioning !== null}
                  className="px-4 py-2.5 bg-toss-blue text-surface rounded-xl text-[12.5px] font-bold hover:bg-[#2b72d6] disabled:opacity-50 transition-colors shadow-sm shrink-0 flex items-center gap-1.5 active:scale-95"
                >
                  <Check size={14} />
                  최종 승인
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Active Valuation Overrides */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-body">
          <Award className="text-toss-green" size={20} />
          <h3 className="text-[16px] font-black text-primary">현재 적용 중인 밸류에이션 보정값</h3>
          <span className="text-[11px] font-bold bg-toss-green/10 text-toss-green px-2 py-0.5 rounded-full ml-auto">
            {Object.keys(overrides).length}건
          </span>
        </div>

        {Object.keys(overrides).length === 0 ? (
          <div className="text-center py-10 text-tertiary text-[13.5px]">
            현재 보정 값이 수동으로 적용된 단지가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {Object.entries(overrides).map(([id, val]) => (
              <div key={id} className="bg-body/40 border border-border/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-[14px] font-bold text-primary truncate">{id}</h4>
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded mt-1.5 ${
                    val > 0 ? 'bg-toss-green/10 text-toss-green' : 'bg-toss-red/10 text-toss-red'
                  }`}>
                    가치 점수 {val > 0 ? '+' : ''}{val}점 반영됨
                  </span>
                </div>
                
                <button
                  onClick={() => handleReset(id, id)}
                  disabled={actioning !== null}
                  className="p-2 hover:bg-red-50 text-tertiary hover:text-toss-red rounded-lg transition-colors active:scale-95 border border-border hover:border-red-100"
                  title="보정값 삭제"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

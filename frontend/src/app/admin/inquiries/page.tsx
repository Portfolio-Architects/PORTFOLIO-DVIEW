'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export interface AdInquiry {
  id: string;
  companyName: string;
  contactInfo: string;
  message: string;
  status: 'pending' | 'reviewed';
  createdAt: any;
}

export interface SubscriptionItem {
  id: string;
  email: string;
  realtime: boolean;
  weekly: boolean;
  status: 'active' | 'unsubscribed';
  createdAt: any;
  updatedAt: any;
}

const InquiriesPage = React.memo(function InquiriesPage() {
  const [inquiries, setInquiries] = useState<AdInquiry[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'inquiries' | 'subscriptions'>('inquiries');
  const [isPending, startTransition] = useTransition();

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // 1. 광고 제휴 문의 바인딩
    const qInq = query(collection(db, 'adInquiries'));
    const unsubInq = onSnapshot(qInq, snap => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdInquiry));
      fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      if (!mountedRef.current) return;
      startTransition(() => {
        setInquiries(fetched);
      });
    });

    // 2. 알림 구독자 리스트 바인딩
    const qSub = query(collection(db, 'subscriptions'));
    const unsubSub = onSnapshot(qSub, snap => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionItem));
      fetched.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      if (!mountedRef.current) return;
      startTransition(() => {
        setSubscriptions(fetched);
      });
    });

    return () => {
      unsubInq();
      unsubSub();
    };
  }, []);

  // 제휴 문의 상태 수정
  const toggleInquiryStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'adInquiries', id), { status: currentStatus === 'pending' ? 'reviewed' : 'pending' });
    } catch (e) {
      if (mountedRef.current) console.error(e);
    }
  };

  // 제휴 문의 삭제
  const deleteInquiry = async (id: string) => {
    if (!confirm('해당 문의를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return;
    try {
      await deleteDoc(doc(db, 'adInquiries', id));
    } catch (e) {
      if (mountedRef.current) console.error(e);
    }
  };

  // 구독자 알림 활성 상태 토글
  const toggleSubscriptionStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'subscriptions', id), { 
        status: currentStatus === 'active' ? 'unsubscribed' : 'active',
        updatedAt: new Date()
      });
    } catch (e) {
      if (mountedRef.current) console.error(e);
    }
  };

  // 구독 정보 강제 삭제
  const deleteSubscription = async (id: string) => {
    if (!confirm('해당 구독 정보를 정말로 삭제하시겠습니까? 데이터가 영구 삭제됩니다.')) return;
    try {
      await deleteDoc(doc(db, 'subscriptions', id));
    } catch (e) {
      if (mountedRef.current) console.error(e);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight mb-2">광고/제휴 및 구독 관리</h1>
          <p className="text-secondary text-[14px]">웹사이트에서 신청된 광고/제휴 문의 및 실거래 알림 구독자를 통합 관리합니다.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('inquiries')}
          className={`px-5 py-3 text-[14px] font-bold border-b-2 transition-all relative ${
            activeTab === 'inquiries' 
              ? 'border-toss-blue text-toss-blue' 
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          제휴 문의 내역
          {inquiries.filter(i => i.status === 'pending').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-toss-red text-white text-[10px] font-bold">
              {inquiries.filter(i => i.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-5 py-3 text-[14px] font-bold border-b-2 transition-all ${
            activeTab === 'subscriptions' 
              ? 'border-toss-blue text-toss-blue' 
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          알림 구독자 목록
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-body border border-border text-secondary text-[10px] font-bold">
            {subscriptions.length}
          </span>
        </button>
      </div>

      <div className={`transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {activeTab === 'inquiries' ? (
          /* 제휴 문의 탭 리스트 */
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col gap-0 divide-y divide-[#e5e8eb]">
            {inquiries.length === 0 ? (
              <div className="p-10 text-center text-tertiary text-[14px]">아직 접수된 광고/제휴 문의가 없습니다.</div>
            ) : (
              inquiries.map(inquiry => (
                <div key={inquiry.id} className={`p-5 sm:p-6 transition-colors ${inquiry.status === 'pending' ? 'bg-body' : 'bg-surface opacity-80'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        {inquiry.status === 'pending' ? (
                          <span className="px-2 py-0.5 rounded-md bg-[#fff0f1] text-toss-red text-[11px] font-bold flex items-center gap-1"><AlertCircle size={10} /> 확인 요망</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-[#e8fbf6] text-[#00d29d] text-[11px] font-bold flex items-center gap-1"><CheckCircle2 size={10} /> 확인 완료</span>
                        )}
                        <h3 className="text-[16px] font-extrabold text-primary">{inquiry.companyName}</h3>
                      </div>
                      <p className="text-[13px] text-secondary mb-1"><span className="font-bold text-tertiary mr-1">연락처/이메일:</span> {inquiry.contactInfo}</p>
                      <p className="text-[11px] text-tertiary">접수일: {inquiry.createdAt?.toDate ? inquiry.createdAt.toDate().toLocaleString('ko-KR') : '알 수 없음'}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => toggleInquiryStatus(inquiry.id, inquiry.status)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${inquiry.status === 'pending' ? 'bg-toss-blue text-surface shadow-sm' : 'bg-body text-secondary'}`}
                      >
                        {inquiry.status === 'pending' ? '읽음 처리' : '미확인으로 변경'}
                      </button>
                      <button 
                        onClick={() => deleteInquiry(inquiry.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#fff0f1] text-toss-red text-[12px] font-bold hover:bg-[#ffe6e6] transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} /> 삭제
                      </button>
                    </div>
                  </div>
                  <div className="bg-surface border border-border p-4 rounded-xl text-[14px] text-primary whitespace-pre-wrap leading-relaxed">
                    {inquiry.message}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* 알림 구독자 탭 리스트 */
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px] min-w-[600px]">
                <thead>
                  <tr className="bg-body border-b border-border text-secondary font-bold">
                    <th className="p-4 sm:p-5">이메일</th>
                    <th className="p-4 sm:p-5 text-center">실거래가 알림</th>
                    <th className="p-4 sm:p-5 text-center">주간 리포트</th>
                    <th className="p-4 sm:p-5 text-center">상태</th>
                    <th className="p-4 sm:p-5 text-center">신청일</th>
                    <th className="p-4 sm:p-5 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e8eb] text-primary">
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-tertiary text-[14px]">아직 등록된 알림 구독자가 없습니다.</td>
                    </tr>
                  ) : (
                    subscriptions.map(sub => (
                      <tr key={sub.id} className={`transition-opacity ${sub.status === 'unsubscribed' ? 'opacity-60 bg-body/30' : ''}`}>
                        <td className="p-4 sm:p-5 font-extrabold">{sub.email}</td>
                        <td className="p-4 sm:p-5 text-center">
                          {sub.realtime ? (
                            <span className="px-2 py-1 rounded-md bg-[#e8f3ff] text-toss-blue text-[11px] font-extrabold">알림 받음</span>
                          ) : (
                            <span className="px-2 py-1 rounded-md bg-[#f3f4f5] text-tertiary text-[11px] font-bold">미선택</span>
                          )}
                        </td>
                        <td className="p-4 sm:p-5 text-center">
                          {sub.weekly ? (
                            <span className="px-2 py-1 rounded-md bg-[#e8fbf6] text-[#00d29d] text-[11px] font-extrabold">알림 받음</span>
                          ) : (
                            <span className="px-2 py-1 rounded-md bg-[#f3f4f5] text-tertiary text-[11px] font-bold">미선택</span>
                          )}
                        </td>
                        <td className="p-4 sm:p-5 text-center">
                          {sub.status === 'active' ? (
                            <span className="px-2 py-1 rounded-md bg-toss-blue text-surface text-[11px] font-black shadow-sm shadow-toss-blue/10">구독 중</span>
                          ) : (
                            <span className="px-2 py-1 rounded-md bg-[#fff0f1] text-toss-red text-[11px] font-black">해지됨</span>
                          )}
                        </td>
                        <td className="p-4 sm:p-5 text-center text-secondary text-[12px]">
                          {sub.createdAt?.toDate ? sub.createdAt.toDate().toLocaleDateString('ko-KR') : '알 수 없음'}
                        </td>
                        <td className="p-4 sm:p-5 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => toggleSubscriptionStatus(sub.id, sub.status)}
                              className={`px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                                sub.status === 'active' ? 'bg-body hover:bg-border text-secondary' : 'bg-toss-blue hover:opacity-90 text-surface'
                              }`}
                            >
                              {sub.status === 'active' ? '수동 해지' : '다시 활성화'}
                            </button>
                            <button
                              onClick={() => deleteSubscription(sub.id)}
                              className="p-1.5 rounded-lg bg-[#fff0f1] text-toss-red hover:bg-[#ffe6e6] transition-all"
                              title="영구 삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

InquiriesPage.displayName = 'InquiriesPage';

export default InquiriesPage;

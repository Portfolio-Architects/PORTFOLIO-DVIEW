'use client';

import { useState, useEffect, useTransition } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Trash2 } from 'lucide-react';

export interface AdInquiry {
  id: string;
  companyName: string;
  contactInfo: string;
  message: string;
  status: 'pending' | 'reviewed';
  createdAt: any;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<AdInquiry[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const q = query(collection(db, 'adInquiries'));
    const unsub = onSnapshot(q, snap => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdInquiry));
      fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      startTransition(() => {
        setInquiries(fetched);
      });
    });
    return () => unsub();
  }, []);

  const toggleInquiryStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'adInquiries', id), { status: currentStatus === 'pending' ? 'reviewed' : 'pending' });
    } catch (e) { console.error(e); }
  };

  const deleteInquiry = async (id: string) => {
    if (!confirm('해당 문의를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return;
    try {
      await deleteDoc(doc(db, 'adInquiries', id));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight mb-2">광고/제휴 문의 관리</h1>
          <p className="text-secondary text-[14px]">웹사이트를 통해 접수된 광고 및 제휴 문의를 관리합니다.</p>
        </div>
      </div>

      <div className={`transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
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
                        <span className="px-2 py-0.5 rounded-md bg-[#ffe6e6] text-[#ff3b30] text-[11px] font-bold">확인 요망</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#e5e8eb] text-tertiary text-[11px] font-bold">확인 완료</span>
                      )}
                      <h3 className="text-[16px] font-extrabold text-primary">{inquiry.companyName}</h3>
                    </div>
                    <p className="text-[13px] text-secondary mb-1"><span className="font-bold text-tertiary mr-1">연락처/이메일:</span> {inquiry.contactInfo}</p>
                    <p className="text-[11px] text-tertiary">접수일: {inquiry.createdAt?.toDate ? inquiry.createdAt.toDate().toLocaleString('ko-KR') : '알 수 없음'}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => toggleInquiryStatus(inquiry.id, inquiry.status)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${inquiry.status === 'pending' ? 'bg-toss-blue text-surface' : 'bg-body text-secondary'}`}
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
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback, useTransition, useDeferredValue } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building, Save, Search, Check, AlertTriangle, ChevronDown, ChevronRight,
  Home, Link2, FileText, Plus, Trash2, MapPin, PlusCircle, Edit, RefreshCw
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, onSnapshot, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseConfig';
import { DONGS } from '@/lib/dongs';
import { FULL_DONG_DATA } from '@/lib/dong-apartments';
import { ScoutingReport } from '@/lib/types/scoutingReport';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { useTxData } from '@/hooks/useStaticData';

const FIRESTORE_DOC = 'settings/apartmentMeta';
const dongNames = DONGS.map(d => d.name).sort((a, b) => a.localeCompare(b, 'ko'));

// ── Auto-suggest TX key matching ──
function normalizeAptName(name: string): string {
  return name.replace(/\[.*?\]\s*/g, '').replace(/\s+/g, '').replace(/[()（）]/g, '').trim();
}
function autoSuggest(aptName: string, TX_SUMMARY: Record<string, any>): string | null {
  return findTxKey(aptName, TX_SUMMARY) || null;
}

// ── Types ──
export interface AptMeta {
  dong: string;
  txKey?: string;
  maxFloor?: number;
  isPublicRental?: boolean;
  householdCount?: number;
  yearBuilt?: string;
  brand?: string;
  ticker?: string; // Ticker from Google Sheets
}
type MetaMap = Record<string, AptMeta>;



export default function AdminDashboard() {
  const router = useRouter();
  // ── State ──
  const [meta, setMeta] = useState<MetaMap>({});
  const [initialMeta, setInitialMeta] = useState<MetaMap>({}); // To track changes for sync
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'unmatched'|'public'|'private'|'analyzed'|'verified'>('all');
  const [expandedDongs, setExpandedDongs] = useState<Set<string>>(new Set());
  const [expandedApts, setExpandedApts] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  
  // Scouting reports
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [reportsByApt, setReportsByApt] = useState<Record<string, ScoutingReport[]>>({});
  
  // Add apartment form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAptName, setNewAptName] = useState('');
  const [newAptDong, setNewAptDong] = useState(dongNames[0]);
  // Deletes tracking for sync
  const [deletedApts, setDeletedApts] = useState<Set<string>>(new Set());

  const { txSummary: TX_SUMMARY = {} } = useTxData();
  const txKeys = useMemo(() => Object.keys(TX_SUMMARY).sort(), [TX_SUMMARY]);



  // ── Load Scouting Reports ──
  useEffect(() => {
    const q = query(collection(db, 'scoutingReports'));
    const unsub = onSnapshot(q, snap => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScoutingReport));
      setReports(fetched);
      const byApt: Record<string, ScoutingReport[]> = {};
      fetched.forEach(r => {
        if (!byApt[r.apartmentName]) byApt[r.apartmentName] = [];
        byApt[r.apartmentName].push(r);
      });
      setReportsByApt(byApt);
    });
    return () => unsub();
  }, []);



  const [isPending, startTransition] = useTransition();

  // ── SWR Fetcher for Google Sheets (Single Source of Truth) ──
  const fetcher = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch from sheets');
      const data = await res.json();
      const sheetMap: MetaMap = {};
      
      if (data.byDong) {
        for (const [dong, apts] of Object.entries(data.byDong)) {
          (apts as Record<string, unknown>[]).forEach(apt => {
            sheetMap[apt.name as string] = {
              dong: (apt as Record<string, string>)?.dong,
              txKey: (apt as Record<string, string>)?.txKey || autoSuggest(apt.name as string, TX_SUMMARY) || undefined,
              maxFloor: (apt as Record<string, number>)?.maxFloor || 0,
              isPublicRental: (apt as Record<string, boolean>)?.isPublicRental || false,
              householdCount: (apt as Record<string, number>)?.householdCount,
              yearBuilt: (apt as Record<string, string>)?.yearBuilt,
              brand: (apt as Record<string, string>)?.brand,
              ticker: (apt as Record<string, string>)?.ticker,
            };
          });
        }
      }
      return sheetMap;
    } catch (e) {
      console.error('Failed to load sheets, trying Firestore fallback:', e);
      try {
        const metaDoc = await getDoc(doc(db, 'settings/apartmentMeta'));
        if (metaDoc.exists()) {
          const data = metaDoc.data() as Record<string, unknown>;
          const fbMap: MetaMap = {};
          for (const [name, m] of Object.entries(data)) {
            if (m && typeof m === 'object' && 'dong' in m) {
              const mapObj = m as Record<string, unknown>;
              fbMap[name] = {
                dong: mapObj.dong as string,
                txKey: (mapObj.txKey as string) || autoSuggest(name, TX_SUMMARY) || undefined,
                maxFloor: (mapObj.maxFloor as number) || 0,
                isPublicRental: (mapObj.isPublicRental as boolean) || false,
                householdCount: mapObj.householdCount as number | undefined,
                yearBuilt: mapObj.yearBuilt as string | undefined,
                brand: mapObj.brand as string | undefined,
                ticker: mapObj.ticker as string | undefined,
              };
            }
          }
          if (Object.keys(fbMap).length > 0) return fbMap;
        }
      } catch (fbErr) {
        console.error('Firestore fallback also failed:', fbErr);
      }
      const staticMap: MetaMap = {};
      for (const [dong, apts] of Object.entries(FULL_DONG_DATA)) {
        apts.forEach(aptName => {
          staticMap[aptName] = { dong, txKey: autoSuggest(aptName, TX_SUMMARY) || undefined, isPublicRental: false };
        });
      }
      return staticMap;
    }
  };

  const { data: swrMeta } = useSWR('/api/apartments-by-dong', fetcher, { 
    revalidateOnFocus: false,
    dedupingInterval: 60000 
  });

  useEffect(() => {
    if (swrMeta && !loaded) {
      setMeta(swrMeta);
      setInitialMeta(JSON.parse(JSON.stringify(swrMeta)));
      setLoaded(true);
    }
  }, [swrMeta, loaded]);

  // ── Actions ──

  const handleSync = async () => {
    if (!confirm('국토교통부 실거래가 최신 데이터를 수동으로 가져오시겠습니까?\n이 작업은 시간이 다소 소요될 수 있습니다.')) return;
    
    setIsSyncing(true);
    try {
      const res = await fetch('/api/cron/sync-transactions');
      const data = await res.json();
      
      if (res.ok) {
        alert(`동기화 완료!\n- 추가된 데이터: ${data.synced}건`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (e: any) {
      console.error('Sync error:', e);
      alert('동기화 중 오류가 발생했습니다: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Calculate diffs for Google Sheets
      const syncPayload: { updates: unknown[], adds: unknown[], deletes: string[] } = {
        updates: [],
        adds: [],
        deletes: Array.from(deletedApts)
      };

      for (const [name, currentM] of Object.entries(meta)) {
        const initialM = initialMeta[name];
        if (!initialM) {
          // This is a new apartment (added)
          syncPayload.adds.push({
            name,
            dong: currentM.dong,
            txKey: currentM.txKey,
          });
        } else {
          // Compare fields for updates
          const updates: Record<string, string|number|boolean> = {};
          if (currentM.dong !== initialM.dong) updates['동'] = currentM.dong;
          if (currentM.txKey !== initialM.txKey) updates['txKey'] = currentM.txKey || '';
          if (currentM.maxFloor !== initialM.maxFloor) updates['최고층'] = currentM.maxFloor || '';
          if (currentM.isPublicRental !== initialM.isPublicRental) updates['공공임대'] = currentM.isPublicRental ? 'Y' : 'N';
          // NOTE: renamed apartment checking via old name (since exact name match fails if renamed)
          // Actually, if we rename, the key changes. Wait, `name` is the key. 
          // Re-evaluate: rename function deletes old name and creates new name.
          // The old name will NOT be in `meta`, so it's not checked here. It was caught by initialMeta diff? No, the code below handles it.
          // Wait, if it's renamed, `targetRow` won't find it if it searches by name. BUT we have `ticker`!
          // Since `currentM.ticker` matches `initialM.ticker`, let's just use ticker.
          
          if (Object.keys(updates).length > 0) {
            syncPayload.updates.push({
              ticker: currentM.ticker,
              name: name,
              updates
            });
          }
        }
      }

      // Check for renames (apartments that exist in meta but the name key doesn't match initialMeta, AND they have a ticker)
      // Wait, the loop above already covered them as "adds" if the key (newName) isn't in initialMeta!
      // But if it's a rename, it's NOT an "add". It should be an "update" on the '아파트명' column identified by `ticker`.
      
      // Let's refine the diffing logic explicitly for renames:
      // Loop over current meta to find renames (where current `ticker` matches an initial, but `name` differs)
      const currentTickers = new Map<string, string>(); // ticker -> newName
      for (const [newName, m] of Object.entries(meta)) {
        if (m.ticker) currentTickers.set(m.ticker, newName);
      }

      // Re-build diffs perfectly using ticker as ID
      syncPayload.updates = [];
      syncPayload.adds = [];
      syncPayload.deletes = [];

      // Detect deletions and updates for existing items
      for (const [oldName, initialM] of Object.entries(initialMeta)) {
        if (initialM.ticker) {
          const newName = currentTickers.get(initialM.ticker);
          if (!newName) {
            // Deleted entirely
            syncPayload.deletes.push(oldName);
          } else {
            // Updated
            const currentM = meta[newName];
            const updates: Record<string, string|number|boolean> = {};
            if (newName !== oldName) updates['아파트명'] = newName;
            if (currentM.dong !== initialM.dong) updates['동'] = currentM.dong;
            if (currentM.txKey !== initialM.txKey) updates['txKey'] = currentM.txKey || '';
            if (currentM.maxFloor !== initialM.maxFloor) updates['최고층'] = currentM.maxFloor || '';
            if (currentM.isPublicRental !== initialM.isPublicRental) updates['공공임대'] = currentM.isPublicRental ? 'Y' : 'N';

            if (Object.keys(updates).length > 0) {
              syncPayload.updates.push({ ticker: initialM.ticker, updates });
            }
          }
        }
      }

      // Detect pure Adds (no ticker)
      for (const [newName, currentM] of Object.entries(meta)) {
        if (!currentM.ticker) {
          syncPayload.adds.push({
            name: newName,
            dong: currentM.dong,
            txKey: currentM.txKey || ''
          });
        }
      }

      // 2. Send to Google Sheets API
      if (syncPayload.updates.length > 0 || syncPayload.adds.length > 0 || syncPayload.deletes.length > 0) {
        const idToken = await auth.currentUser?.getIdToken();
        const syncRes = await fetch('/api/apartments-sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
          },
          body: JSON.stringify(syncPayload)
        });
        if (!syncRes.ok) {
          const errData = await syncRes.json();
          throw new Error('Google Sheets Sync Failed: ' + errData.error);
        }
      }

      // 3. Keep Firestore caching for fast dashboard loading? Yes.
      const clean: Record<string, Record<string, unknown>> = {};
      for (const [name, m] of Object.entries(meta)) {
        const entry: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(m)) {
          if (v !== undefined && v !== null && v !== '') entry[k] = v;
        }
        if (entry.dong) clean[name] = entry;
      }
      await setDoc(doc(db, FIRESTORE_DOC), clean);

      // Re-sync initial state to current state
      setInitialMeta(JSON.parse(JSON.stringify(meta)));
      setDeletedApts(new Set());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      console.error('Save failed:', e);
      alert('저장에 실패했습니다: ' + (e as Error).message);
    }
    setSaving(false);
  };

  const updateMeta = useCallback((aptName: string, patch: Partial<AptMeta>) => {
    setMeta(prev => ({
      ...prev,
      [aptName]: { ...(prev[aptName] || { dong: '' }), ...patch },
    }));
  }, []);

  const deleteApt = useCallback((aptName: string) => {
    if (!confirm(`"${aptName}" 아파트를 삭제하시겠습니까?`)) return;
    setDeletedApts(prev => { const next = new Set(prev); next.add(aptName); return next; });
    setMeta(prev => { const next = { ...prev }; delete next[aptName]; return next; });
  }, []);

  const addApartment = useCallback(() => {
    const name = newAptName.trim();
    if (!name) return alert('아파트 이름을 입력하세요.');
    if (meta[name]) return alert('이미 존재하는 아파트입니다.');
    setMeta(prev => ({
      ...prev,
      [name]: { dong: newAptDong, txKey: autoSuggest(name, TX_SUMMARY) || undefined },
    }));
    setNewAptName('');
    setShowAddForm(false);
  }, [newAptName, newAptDong, meta]);

  const toggleDong = useCallback((dong: string) => {
    setExpandedDongs(prev => {
      const next = new Set(prev); next.has(dong) ? next.delete(dong) : next.add(dong); return next;
    });
  }, []);

  // ── Computed Data ──
  const aptsByDong = useMemo(() => {
    const result: Record<string, { name: string; meta: AptMeta }[]> = {};
    for (const [name, m] of Object.entries(meta)) {
      const dong = m.dong || '미분류';
      if (!result[dong]) result[dong] = [];
      result[dong].push({ name, meta: m });
    }
    for (const dong of Object.keys(result)) {
      result[dong].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }
    return result;
  }, [meta]);

  const allAptNames = useMemo(() => Object.keys(meta), [meta]);

  const verifiedApts = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => {
      if (r.images && r.images.length > 0) {
        set.add(r.apartmentName);
      }
    });
    return set;
  }, [reports]);

  const stats = useMemo(() => {
    let mapped = 0, unmapped = 0, verified = 0;
    for (const name of allAptNames) {
      const m = meta[name];
      const resolvedTxKey = m?.txKey ? (findTxKey(m.txKey, TX_SUMMARY) || m.txKey) : null;
      if (resolvedTxKey && TX_SUMMARY[resolvedTxKey as keyof typeof TX_SUMMARY]) mapped++;
      else unmapped++;
      if (verifiedApts.has(name)) verified++;
    }
    const totalVerifiedReports = reports.filter(r => r.images && r.images.length > 0).length;
    return { total: allAptNames.length, mapped, unmapped, verified, totalVerifiedReports };
  }, [meta, allAptNames, verifiedApts, reports]);

  const deferredSearch = useDeferredValue(search);

  const filteredDongs = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return Object.entries(aptsByDong)
      .map(([dong, apts]) => {
        let f = apts;
        if (q) f = f.filter(a => a.name.toLowerCase().includes(q) || dong.toLowerCase().includes(q));
        if (filter === 'unmatched') f = f.filter(a => !a.meta.txKey);
        if (filter === 'verified') f = f.filter(a => verifiedApts.has(a.name));
        return [dong, f] as const;
      })
      .filter(([, a]) => a.length > 0)
      .sort(([a], [b]) => a.localeCompare(b, 'ko'));
  }, [deferredSearch, filter, aptsByDong, verifiedApts]);

  if (!loaded) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-4 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight mb-2">관리자 대시보드</h1>
          <p className="text-secondary text-[14px]">아파트 데이터를 통합 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-[#00b386] bg-toss-blue-light hover:bg-toss-blue hover:text-surface disabled:opacity-50 transition-all text-[13px]">
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> 
            {isSyncing ? '동기화 중...' : '실거래가 수동 동기화'}
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-toss-blue bg-toss-blue-light hover:bg-toss-blue hover:text-surface transition-all text-[13px]">
            <Plus size={16}/> 아파트 추가
          </button>
        </div>
      </div>

      <div className={`transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>

      {/* Add Apartment Form */}
      {showAddForm && (
        <div className="bg-toss-blue-light rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-3 items-end animate-in slide-in-from-top duration-200">
          <div className="flex-1 min-w-0">
            <label className="text-[12px] font-bold text-toss-blue mb-1 block">아파트 이름</label>
            <input type="text" value={newAptName} onChange={e => setNewAptName(e.target.value)}
              placeholder="예: 동탄역 힐스테이트 2차"
              className="w-full px-3 py-2.5 border border-toss-blue/30 rounded-xl text-[14px] outline-none focus:border-toss-blue bg-surface" />
          </div>
          <div className="shrink-0">
            <label className="text-[12px] font-bold text-toss-blue mb-1 block">동</label>
            <select value={newAptDong} onChange={e => setNewAptDong(e.target.value)}
              className="px-3 py-2.5 border border-toss-blue/30 rounded-xl text-[14px] bg-surface outline-none focus:border-toss-blue">
              {dongNames.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={addApartment} className="px-4 py-2.5 bg-toss-blue text-surface rounded-xl text-[13px] font-bold hover:bg-[#2b72d6] transition-colors">추가</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2.5 bg-surface text-tertiary rounded-xl text-[13px] font-bold hover:bg-body transition-colors">취소</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: '전체 단지', value: stats.total, color: '#00d29d', bg: '#e0fbf4', icon: Building, fk: 'all' as const },
          { label: '매핑 완료', value: stats.mapped, color: '#03c75a', bg: '#f0fdf4', icon: Check, fk: 'all' as const },
          { label: '미매핑', value: stats.unmapped, color: '#f04452', bg: '#ffebec', icon: AlertTriangle, fk: 'unmatched' as const },
          { label: '현장사진', value: stats.verified, color: '#ff8a3d', bg: '#fff4e6', icon: FileText, fk: 'verified' as const },
        ].map(s => (
          <div key={s.label} onClick={() => startTransition(() => setFilter(s.fk))}
            className={`bg-surface p-4 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all ${
              filter === s.fk && s.fk !== 'all' ? 'border-toss-blue ring-2 ring-toss-blue/10' : 'border-border'
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: s.bg, color: s.color }}><s.icon size={14}/></div>
              <span className="text-[11px] font-bold text-tertiary">{s.label}</span>
            </div>
            <div className="text-[26px] font-extrabold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="아파트명 또는 동 이름으로 검색..."
            className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-[14px] outline-none focus:border-toss-blue focus:ring-4 focus:ring-toss-blue/10 transition-all" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {([['all','전체'],['unmatched','미매핑'],['verified','현장사진']] as const).map(([key, label]) => (
            <button key={key} onClick={() => startTransition(() => setFilter(key))}
              className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
                filter === key ? 'bg-primary text-surface' : 'bg-surface border border-border text-secondary hover:bg-body'
              }`}>{label}</button>
          ))}
        </div>
      </div>


      {/* Apartment List by Dong */}
      <div className="flex flex-col gap-3">
        {filteredDongs.map(([dong, apts]) => {
          const isExpanded = expandedDongs.has(dong) || search.trim().length > 0 || filter !== 'all';
          const dongMapped = apts.filter(a => !!a.meta.txKey).length;
          const dongVerified = apts.filter(a => verifiedApts.has(a.name)).length;

          return (
            <div key={dong} className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
              <button onClick={() => toggleDong(dong)}
                className="w-full px-4 sm:px-6 py-4 flex items-center gap-3 hover:bg-body transition-colors">
                {isExpanded ? <ChevronDown size={18} className="text-tertiary shrink-0"/> : <ChevronRight size={18} className="text-tertiary shrink-0"/>}
                <h3 className="text-[15px] font-extrabold text-primary">{dong}</h3>
                <span className="text-[11px] font-bold text-tertiary bg-body px-2 py-0.5 rounded-full">{apts.length}개</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  dongMapped === apts.length ? 'bg-[#f0fdf4] text-toss-green' : dongMapped > 0 ? 'bg-[#fff4e6] text-[#ff8a3d]' : 'bg-body text-tertiary'
                }`}>TX {dongMapped}/{apts.length}</span>
                {dongVerified > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fff4e6] text-[#ff8a3d]">📸 {dongVerified}</span>}
              </button>

              {isExpanded && (
                <div className="border-t border-border divide-y divide-[#f2f4f6]">
                  {apts.map(({ name, meta: m }) => {
                    const resolvedTxKey = m.txKey ? (findTxKey(m.txKey, TX_SUMMARY) || m.txKey) : null;
                    const hasValidTx = resolvedTxKey && TX_SUMMARY[resolvedTxKey as keyof typeof TX_SUMMARY];
                    const suggested = !m.txKey ? autoSuggest(name, TX_SUMMARY) : null;
                    const aptReports = reportsByApt[name] || [];
                    const verifiedReportsCount = aptReports.filter(r => r.images && r.images.length > 0).length;
                    const isAptExpanded = expandedApts.has(name);

                    return (
                      <div key={name} className={`${!hasValidTx ? 'bg-[#fffbf5]' : ''}`}>
                        {/* Apartment Unit Header */}
                        <Link href={`/admin/apartments/${encodeURIComponent(name)}`} className="block px-4 sm:px-6 py-4 hover:bg-[#f6f8fa] transition-colors border-b border-body last:border-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasValidTx ? <Check size={14} className="text-toss-green shrink-0"/> : <AlertTriangle size={14} className="text-toss-red shrink-0"/>}
                            
                            <span className="text-[13px] sm:text-[14px] font-bold text-primary">{name}</span>

                            {/* Report badge */}
                            {verifiedReportsCount > 0 ? (
                              <span className="text-[11px] font-bold bg-[#fff4e6] text-[#ff8a3d] px-2 py-0.5 rounded-full mt-0.5">현장사진</span>
                            ) : null}

                            <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-[12px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors shadow-sm">
                              상세보기
                              <ChevronRight size={14}/>
                            </span>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>



      {/* Floating Save Bar */}
      <div className="fixed bottom-0 left-0 md:left-[240px] right-0 z-40 bg-surface/90 backdrop-blur-lg border-t border-border px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <span className="text-[13px] text-tertiary font-medium">{stats.total}개 단지 · {stats.mapped} 매핑 · 📸 {stats.totalVerifiedReports} 현장사진</span>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-[14px] ${
            saved ? 'bg-toss-green text-surface shadow-lg shadow-[#03c75a]/20' : 'bg-toss-blue hover:bg-[#2b72d6] text-surface shadow-lg shadow-[#00d29d]/20'
          } disabled:opacity-60`}>
          <Save size={16}/>
          {saving ? '저장 중...' : saved ? '저장 완료!' : '저장하기'}
        </button>
      </div>

      {/* Bottom padding for floating bar */}
      <div className="h-20" />

      </div>
    </div>
  );
}

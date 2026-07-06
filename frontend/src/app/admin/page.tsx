'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition, useDeferredValue, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { logger } from '@/lib/services/logger';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Building, Save, Search, Check, AlertTriangle, ChevronDown, ChevronRight,
  FileText, Plus, RefreshCw, ShieldAlert, Database, Building2, Briefcase, Camera
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseConfig';
import { DONGS } from '@/lib/dongs';
import { FULL_DONG_DATA } from '@/lib/dong-apartments';
import { ScoutingReport } from '@/lib/types/scoutingReport';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { useTxData } from '@/hooks/useStaticData';
import { safeReload } from '@/lib/utils/safeReload';

const ValuationTuner = dynamic(() => import('@/components/admin/ValuationTuner').then(m => m.ValuationTuner).catch(err => {
  logger.warn('AdminPage', 'ValuationTuner Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('ValuationTuner');
  return { default: () => null };
}), {
  ssr: false,
  loading: () => <div className="animate-pulse h-40 bg-body rounded-2xl animate-pulse border border-border" />
});

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

const defaultFetcher = (url: string) => fetch(url).then(res => res.json());

const AdminDashboard = React.memo(function AdminDashboard() {
  const router = useRouter();
  // ── State ──
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const [meta, setMeta] = useState<MetaMap>({});
  const [initialMeta, setInitialMeta] = useState<MetaMap>({}); // To track changes for sync
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isNoticeSyncing, setIsNoticeSyncing] = useState(false);
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const [isReportsSyncing, setIsReportsSyncing] = useState(false);
  const [isTechnoValleySyncing, setIsTechnoValleySyncing] = useState(false);
  
  const [reportsSyncProgress, setReportsSyncProgress] = useState({ current: 0, total: 0 });
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

  // ── SWR Fetchers for TechnoValley Stats ──
  const { data: industryData } = useSWR('/api/technovalley/industry-distribution', defaultFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120000
  });

  const { data: centerSpecsData } = useSWR('/api/technovalley/center-specs', defaultFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120000
  });

  // ── Load Scouting Reports ──
  useEffect(() => {
    let active = true;
    const loadReports = async () => {
      try {
        const q = query(collection(db, 'scoutingReports'));
        const snap = await getDocs(q);
        if (!active) return;
        const fetched = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            apartmentName: data.apartmentName,
            images: data.images || []
          } as ScoutingReport;
        });
        setReports(fetched);
        const byApt: Record<string, ScoutingReport[]> = {};
        fetched.forEach(r => {
          if (!byApt[r.apartmentName]) byApt[r.apartmentName] = [];
          byApt[r.apartmentName].push(r);
        });
        setReportsByApt(byApt);
      } catch (err) {
        logger.error('AdminPage', 'Failed to load scouting reports', undefined, err);
      }
    };
    loadReports();
    return () => { active = false; };
  }, []);

  // 🔧 Admin 동기화 중 탭 닫힘 방지 beforeunload 가드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isAnySyncing = isSyncing || isNoticeSyncing || isSheetsSyncing || isReportsSyncing || isTechnoValleySyncing || saving;
    if (!isAnySyncing) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "데이터 동기화가 진행 중입니다. 페이지를 벗어나면 데이터 유실 또는 정합성 문제가 발생할 수 있습니다.";
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSyncing, isNoticeSyncing, isSheetsSyncing, isReportsSyncing, isTechnoValleySyncing, saving]);

  const [isPending, startTransition] = useTransition();

  // ── SWR Fetcher for Firestore Cache (Fallback to Sheets) ──
  const fetcher = async (url: string) => {
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
      logger.error('AdminPage', 'Firestore cache read failed, falling back to API', undefined, fbErr);
    }

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
      logger.error('AdminPage', 'Failed to load sheets, trying static fallback', undefined, e);
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
      
      if (!mountedRef.current) return;
      if (res.ok) {
        alert(`동기화 완료!\n- 추가된 데이터: ${data.synced}건`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (e) {
      if (mountedRef.current) {
        logger.error('AdminPage', 'Sync error', undefined, e);
        alert('동기화 중 오류가 발생했습니다: ' + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      if (mountedRef.current) {
        setIsSyncing(false);
      }
    }
  };

  const handleNoticeSync = async () => {
    if (!confirm('화성시청/행정복지센터 최신 소식을 수동으로 가져오시겠습니까?\n이 작업은 약 5~10초 소요될 수 있습니다.')) return;
    
    setIsNoticeSyncing(true);
    try {
      const res = await fetch('/api/cron/sync-local-notices');
      const data = await res.json();
      
      if (!mountedRef.current) return;
      if (res.ok) {
        alert(`동기화 완료!\n- 수집된 소식: ${data.scrapedCount || 0}건\n- 저장된 소식: ${data.writtenCount || 0}건`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (e) {
      if (mountedRef.current) {
        logger.error('AdminPage', 'Notice sync error', undefined, e);
        alert('소식 동기화 중 오류가 발생했습니다: ' + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      if (mountedRef.current) {
        setIsNoticeSyncing(false);
      }
    }
  };

  const handleTechnoValleySync = async () => {
    if (!confirm('동탄테크노밸리 구글 스프레드시트(SSOT) 입주 기업 및 지식산업센터 API 데이터를 수동 강제 동기화하시겠습니까?\n캐시를 무효화하고 완전히 새로운 정보를 가져옵니다.')) return;

    setIsTechnoValleySyncing(true);
    try {
      const [distRes, specRes, trendRes] = await Promise.all([
        fetch('/api/technovalley/industry-distribution?bypassCache=true'),
        fetch('/api/technovalley/center-specs?bypassCache=true'),
        fetch('/api/technovalley/trend?bypassCache=true')
      ]);

      if (!mountedRef.current) return;

      if (distRes.ok && specRes.ok) {
        const distData = await distRes.json();
        alert(`테크노밸리 동기화 완료!\n- 활성 기업 마스터: ${distData.total || 0}개사 갱신 완료.`);
      } else {
        throw new Error('일부 API 동기화 응답 실패');
      }
    } catch (e) {
      if (mountedRef.current) {
        logger.error('AdminPage', 'TechnoValley sync error', undefined, e);
        alert('테크노밸리 동기화 중 오류가 발생했습니다: ' + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      if (mountedRef.current) {
        setIsTechnoValleySyncing(false);
      }
    }
  };

  const handleReportsSync = async () => {
    if (!confirm('현장 리포트 분석 데이터(점수 및 인프라 거리 등)를 청크 단위로 순차 동기화하시겠습니까?\n이 작업은 각 아파트별 네이버 지도 연산 및 평점 계산을 수반하므로 시간이 걸릴 수 있습니다.')) return;
    
    setIsReportsSyncing(true);
    setReportsSyncProgress({ current: 0, total: 0 });
    
    let offset = 0;
    const limit = 15;
    let hasMore = true;
    let totalUpdated = 0;
    
    try {
      while (hasMore) {
        const res = await fetch(`/api/admin/sync-reports?offset=${offset}&limit=${limit}`);
        if (!mountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP error ${res.status}`);
        }
        
        const data = await res.json();
        totalUpdated += data.updatedCount || 0;
        
        const total = data.totalCount || 0;
        const nextOffset = data.nextOffset || (offset + limit);
        setReportsSyncProgress({ current: Math.min(nextOffset, total), total });
        
        hasMore = data.hasMore;
        offset = nextOffset;
      }
      
      alert(`리포트 동기화 완료!\n- 동기화된 리포트: ${totalUpdated}건`);
    } catch (e) {
      if (mountedRef.current) {
        logger.error('AdminPage', 'Reports sync error', undefined, e);
        alert('리포트 동기화 중 오류가 발생했습니다: ' + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      if (mountedRef.current) {
        setIsReportsSyncing(false);
        setReportsSyncProgress({ current: 0, total: 0 });
      }
    }
  };

  const handleSheetsSync = async () => {
    if (!confirm('Google Sheets에서 최신 아파트 메타데이터를 직접 가져와 현재 화면에 반영하시겠습니까?\n가져온 후 하단의 "저장하기" 버튼을 눌러야 데이터가 저장됩니다.')) return;
    
    setIsSheetsSyncing(true);
    try {
      const res = await fetch('/api/apartments-by-dong?bypassCache=true');
      if (!res.ok) throw new Error('Google Sheets 데이터를 가져오는데 실패했습니다.');
      const data = await res.json();
      const sheetMap: MetaMap = {};
      
      if (!mountedRef.current) return;
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
      
      setMeta(prev => {
        const next = { ...prev };
        for (const [name, sheetApt] of Object.entries(sheetMap)) {
          next[name] = {
            ...(next[name] || {}),
            ...sheetApt
          };
        }
        return next;
      });
      alert('Google Sheets 데이터를 성공적으로 가져왔습니다!\n변경 사항을 저장하려면 하단의 "저장하기" 버튼을 눌러주세요.');
    } catch (e) {
      if (mountedRef.current) {
        logger.error('AdminPage', 'Sheets sync error', undefined, e);
        alert('동기화 중 오류가 발생했습니다: ' + (e instanceof Error ? e.message : String(e)));
      }
    } finally {
      if (mountedRef.current) {
        setIsSheetsSyncing(false);
      }
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

      // Detect renames (apartments that exist in meta but the name key doesn't match initialMeta, AND they have a ticker)
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

      // 3. Keep Firestore caching for fast dashboard loading
      const clean: Record<string, Record<string, unknown>> = {};
      for (const [name, m] of Object.entries(meta)) {
        const entry: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(m)) {
          if (v !== undefined && v !== null && v !== '') entry[k] = v;
        }
        if (entry.dong) clean[name] = entry;
      }
      await setDoc(doc(db, FIRESTORE_DOC), clean);

      if (!mountedRef.current) return;
      // Re-sync initial state to current state
      setInitialMeta(JSON.parse(JSON.stringify(meta)));
      setDeletedApts(new Set());
      if (mountedRef.current) {
        setSaved(true);
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) setSaved(false);
        }, 2000);
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        logger.error('AdminPage', 'Save failed', undefined, e);
        alert('저장에 실패했습니다: ' + (e as Error).message);
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
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
      const next = new Set(prev);
      if (next.has(dong)) {
        next.delete(dong);
      } else {
        next.add(dong);
      }
      return next;
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
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Header & Sync Actions */}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight mb-2">관리자 대시보드</h1>
          <p className="text-secondary text-[14px]">D-VIEW 주거 및 일터(테크노밸리) 데이터 마스터를 동합 관리합니다.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={handleSheetsSync} disabled={isSheetsSyncing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-600 hover:text-surface border border-emerald-500/10 disabled:opacity-50 transition-all text-[12.5px] cursor-pointer">
            <RefreshCw size={14} className={isSheetsSyncing ? "animate-spin" : ""} /> 
            {isSheetsSyncing ? '아파트 동기화 중...' : 'Google Sheets 동기화'}
          </button>
          <button onClick={handleSync} disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-600 hover:text-surface border border-emerald-500/10 disabled:opacity-50 transition-all text-[12.5px] cursor-pointer">
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> 
            {isSyncing ? '동기화 중...' : '실거래가 수동 동기화'}
          </button>
          <button onClick={handleNoticeSync} disabled={isNoticeSyncing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-600 hover:text-surface border border-emerald-500/10 disabled:opacity-50 transition-all text-[12.5px] cursor-pointer">
            <RefreshCw size={14} className={isNoticeSyncing ? "animate-spin" : ""} /> 
            {isNoticeSyncing ? '동기화 중...' : '소식 수동 동기화'}
          </button>
          <button onClick={handleTechnoValleySync} disabled={isTechnoValleySyncing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-600 hover:text-surface border border-emerald-500/10 disabled:opacity-50 transition-all text-[12.5px] cursor-pointer">
            <RefreshCw size={14} className={isTechnoValleySyncing ? "animate-spin" : ""} /> 
            {isTechnoValleySyncing ? '동기화 중...' : '테크노밸리 동기화'}
          </button>
          <button onClick={handleReportsSync} disabled={isReportsSyncing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-600 hover:text-surface border border-emerald-500/10 disabled:opacity-50 transition-all text-[12.5px] cursor-pointer">
            <RefreshCw size={14} className={isReportsSyncing ? "animate-spin" : ""} /> 
            {isReportsSyncing ? '동기화 중...' : '리포트 분석 동기화'}
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-emerald-600 bg-emerald-500/5 hover:bg-emerald-600 hover:text-surface border border-emerald-500/20 transition-all text-[12.5px] cursor-pointer">
            <Plus size={14}/> 아파트 추가
          </button>
        </div>
      </div>

      <div className={`transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>

      {/* Reports Sync Progress Bar */}
      {isReportsSyncing && (
        <div className="bg-surface border border-border rounded-2xl p-5 mb-6 shadow-sm animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-extrabold text-primary flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-emerald-600" />
              현장 리포트 분석 데이터 동기화 중...
            </span>
            <span className="text-[13px] font-bold text-emerald-600 font-mono">
              {reportsSyncProgress.current} / {reportsSyncProgress.total} 단지 
              ({reportsSyncProgress.total > 0 ? Math.round((reportsSyncProgress.current / reportsSyncProgress.total) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out" 
              style={{ width: `${reportsSyncProgress.total > 0 ? (reportsSyncProgress.current / reportsSyncProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Apartment Form */}
      {showAddForm && (
        <div className="bg-emerald-500/5 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-3 items-end border border-emerald-500/10 animate-in slide-in-from-top duration-200">
          <div className="flex-1 min-w-0">
            <label className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 block">아파트 이름</label>
            <input type="text" value={newAptName} onChange={e => setNewAptName(e.target.value)}
              placeholder="예: 동탄역 힐스테이트 2차"
              className="w-full px-3 py-2.5 border border-emerald-500/20 rounded-xl text-[14px] outline-none focus:border-emerald-500 bg-surface" />
          </div>
          <div className="shrink-0">
            <label className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 block">동</label>
            <select value={newAptDong} onChange={e => setNewAptDong(e.target.value)}
              className="px-3 py-2.5 border border-emerald-500/20 rounded-xl text-[14px] bg-surface outline-none focus:border-emerald-500">
              {dongNames.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={addApartment} className="px-4 py-2.5 bg-emerald-600 text-surface rounded-xl text-[13px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer">추가</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2.5 bg-surface text-tertiary rounded-xl text-[13px] font-bold hover:bg-body transition-colors cursor-pointer">취소</button>
          </div>
        </div>
      )}

      {/* Stats Dashboard Grid (Highly Expanded & Visualized) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        {[
          { label: '전체 단지', value: stats.total, color: '#0d9488', bg: '#f0fdf4', icon: Building, fk: 'all' as const },
          { label: '매핑 완료', value: stats.mapped, color: '#059669', bg: '#ecfdf5', icon: Check, fk: 'all' as const },
          { label: '미매핑 단지', value: stats.unmapped, color: '#ea580c', bg: '#fff7ed', icon: AlertTriangle, fk: 'unmatched' as const },
          { label: '현장 임장기', value: stats.verified, color: '#3b82f6', bg: '#eff6ff', icon: Camera, fk: 'verified' as const },
          { label: '지산 센터', value: centerSpecsData?.centers?.length || 10, color: '#8b5cf6', bg: '#f5f3ff', icon: Building2, fk: 'all' as const },
          { label: '테크노 기업', value: industryData?.total || 2044, color: '#d97706', bg: '#fef3c7', icon: Briefcase, fk: 'all' as const },
        ].map(s => (
          <button 
            type="button"
            key={s.label} 
            onClick={() => startTransition(() => setFilter(s.fk))}
            aria-label={`통계 필터: ${s.label}, 값: ${s.value}`}
            className={`w-full text-left bg-surface p-4 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              filter === s.fk && s.fk !== 'all' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: s.bg, color: s.color }}><s.icon size={14}/></div>
              <span className="text-[11px] font-bold text-tertiary truncate">{s.label}</span>
            </div>
            <div className="text-[24px] sm:text-[26px] font-extrabold tracking-tight" style={{ color: s.color }}>
              {s.value.toLocaleString()}
            </div>
          </button>
        ))}
      </div>

      {/* Valuation Tuning Control Panel */}
      <div className="mb-8">
        <h2 className="text-[18px] font-black text-primary mb-4 flex items-center gap-2">
          <ShieldAlert className="text-emerald-600 dark:text-emerald-400" size={20} />
          실수요자 투표 기반 가치평가 보정 시스템
        </h2>
        <ValuationTuner />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="아파트명 또는 동 이름으로 검색..."
            className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-[14px] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {([['all','전체'],['unmatched','미매핑'],['verified','현장사진']] as const).map(([key, label]) => (
            <button key={key} onClick={() => startTransition(() => setFilter(key))}
              className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
                filter === key ? 'bg-emerald-600 text-surface shadow-sm' : 'bg-surface border border-border text-secondary hover:bg-body'
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
                className="w-full px-4 sm:px-6 py-4 flex items-center gap-3 hover:bg-body transition-colors text-left cursor-pointer">
                {isExpanded ? <ChevronDown size={18} className="text-tertiary shrink-0"/> : <ChevronRight size={18} className="text-tertiary shrink-0"/>}
                <h3 className="text-[15px] font-extrabold text-primary">{dong}</h3>
                <span className="text-[11px] font-bold text-tertiary bg-body px-2 py-0.5 rounded-full">{apts.length}개</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  dongMapped === apts.length ? 'bg-[#f0fdf4] text-emerald-600' : dongMapped > 0 ? 'bg-[#fff7ed] text-orange-600' : 'bg-body text-tertiary'
                }`}>TX {dongMapped}/{apts.length}</span>
                {dongVerified > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#eff6ff] text-blue-600">📸 {dongVerified}</span>}
              </button>

              {isExpanded && (
                <div className="border-t border-border divide-y divide-[#f2f4f6] dark:divide-neutral-800">
                  {apts.map(({ name, meta: m }) => {
                    const resolvedTxKey = m.txKey ? (findTxKey(m.txKey, TX_SUMMARY) || m.txKey) : null;
                    const hasValidTx = resolvedTxKey && TX_SUMMARY[resolvedTxKey as keyof typeof TX_SUMMARY];
                    const suggested = !m.txKey ? autoSuggest(name, TX_SUMMARY) : null;
                    const aptReports = reportsByApt[name] || [];
                    const verifiedReportsCount = aptReports.filter(r => r.images && r.images.length > 0).length;

                    return (
                      <div key={name} className={`${!hasValidTx ? 'bg-orange-500/[0.01]' : ''}`}>
                        {/* Apartment Unit Header */}
                        <Link href={`/admin/apartments/${encodeURIComponent(name)}`} className="block px-4 sm:px-6 py-4 hover:bg-[#f6f8fa] dark:hover:bg-neutral-800/20 transition-colors">
                          <div className="flex items-center gap-2 flex-wrap w-full">
                            {hasValidTx ? (
                              <Check size={14} className="text-emerald-600 shrink-0"/>
                            ) : (
                              <AlertTriangle size={14} className="text-orange-500 shrink-0"/>
                            )}
                            
                            <span className="text-[13px] sm:text-[14px] font-bold text-primary">{name}</span>

                            {/* Report badge */}
                            {verifiedReportsCount > 0 ? (
                              <span className="text-[11px] font-bold bg-[#eff6ff] text-blue-600 px-2 py-0.5 rounded-full mt-0.5">현장사진</span>
                            ) : null}

                            <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-[12px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors shadow-sm cursor-pointer">
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
        <span className="text-[12px] sm:text-[13px] text-tertiary font-medium">{stats.total}개 단지 · {stats.mapped} 매핑 · 📸 {stats.totalVerifiedReports} 현장사진</span>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-[14px] cursor-pointer ${
            saved 
              ? 'bg-emerald-600 text-surface shadow-lg shadow-emerald-500/20' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-surface shadow-lg shadow-emerald-600/20'
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
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;

'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
import useSWR from 'swr';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, setDoc, query, collection, onSnapshot, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseConfig';
import type { AptTxSummary } from '@/lib/types/transaction';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { DONGS } from '@/lib/dongs';
import { Building, Save, Home, Link2, ChevronLeft, MapPin, Trash2 } from 'lucide-react';
import { ScoutingReport, ImageMeta, PhotoItem } from '@/lib/types/scoutingReport';
import { createScoutingReport, updateScoutingReport } from '@/lib/services/reportService';
import { uploadImage } from '@/lib/services/storage.service';

import { extractCapturedDate } from '@/lib/utils/exif';
import { getPremiumScoresAction } from '@/app/actions/scoring';
import { ImageUploader } from '@/components/admin/apartment-editor/ImageUploader';

const FIRESTORE_DOC = 'settings/apartmentMeta';
const dongNames = DONGS.map(d => d.name).sort((a, b) => a.localeCompare(b, 'ko'));


// ── Image Category Groups (from ReportEditorForm) ──
const IMAGE_CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  { group: '🏢 단지 전경', items: ['단지 전경 (메인)', '단지 전경 (항공/드론)', '단지 조감도', '기타'] },
  { group: '🚪 문주·출입구', items: ['정문 (메인게이트)', '후문/측문', '차량 출입구', '보행자 출입구', '보안실', '기타'] },
  { group: '🌿 조경·외부', items: ['중앙 조경', '산책로/보행로', '수경시설 (분수/연못)', '놀이터', '운동기구/트랙', '정원/화단', '야외 카페', '경로당', '단지 내 어린이집', '분리수거장/쓰레기', '단지 내 상가', '기타'] },
  { group: '🅿 주차장', items: ['지하주차장 입구', '지하주차장 내부', '주차장 바닥/도색', '지상 주차', 'EV 충전기', '기타'] },
  { group: '🏋️ 커뮤니티', items: ['커뮤니티 외관/입구', '피트니스센터 (헬스장)', '골프연습장', '실내 수영장', '키즈카페/놀이방', '독서실/스터디룸', '사우나/찜질방', '기타 커뮤니티'] },
  { group: '🏠 동별·세대', items: ['동 외관', '엘리베이터/로비', '복도/계단', '택배함/무인택배', '기타'] },
  { group: '🪟 실내', items: ['거실/리빙', '주방', '욕실/화장실', '발코니/베란다', '현관', '조망/뷰 (창문)', '채광/향 (일조량)', '기타'] },
  { group: '🏙️ 주변 환경', items: ['역세권/교통 접근성', '통학로/학교', '주변 상권', '공원', '소음 환경 (도로)', '어린이집', '유치원', '기타'] },
];

import { autoSuggest } from '@/lib/utils/autoSuggest';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { useTxData } from '@/hooks/useStaticData';
// ── Types ──
interface AptMeta {
  dong: string;
  txKey?: string;
  minFloor?: number;
  maxFloor?: number;
  isPublicRental?: boolean;
  householdCount?: number;
  yearBuilt?: string;
  brand?: string;
  ticker?: string;
  far?: number;
  bcr?: number;
  parkingCount?: number;
  parkingPerHousehold?: number;
  coordinates?: string;
  // 입지 분석
  distanceToElementary?: number;
  distanceToMiddle?: number;
  distanceToHigh?: number;
  distanceToSubway?: number;
  distanceToIndeokwon?: number;
  distanceToTram?: number;
  distanceToStarbucks?: number;
  starbucksName?: string;
  starbucksAddress?: string;
  starbucksCoordinates?: string;
  distanceToMcDonalds?: number;
  mcdonaldsName?: string;
  mcdonaldsAddress?: string;
  mcdonaldsCoordinates?: string;
  distanceToOliveYoung?: number;
  oliveYoungName?: string;
  oliveYoungAddress?: string;
  oliveYoungCoordinates?: string;
  distanceToDaiso?: number;
  daisoName?: string;
  daisoAddress?: string;
  daisoCoordinates?: string;
  distanceToSupermarket?: number;
  supermarketName?: string;
  supermarketAddress?: string;
  supermarketCoordinates?: string;
  academyDensity?: number;
  restaurantDensity?: number;
}

// ── Helper: Number input with unit ──
function NumField({ label, value, unit, placeholder, onChange }: {
  label: string; value: number | undefined; unit: string; placeholder: string;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <label className="text-[13px] font-bold text-secondary mb-1.5 block">{label}</label>
      <div className="relative">
        <input type="number" step="any" min={0} value={value ?? ''} placeholder={placeholder}
          onChange={e => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] outline-none focus:border-toss-blue focus:bg-surface transition-all" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary text-[13px]">{unit}</span>
      </div>
    </div>
  );
}

export default function ApartmentInfoPage() {
  const router = useRouter();
  const params = useParams();
  const originalName = decodeURIComponent(params.name as string);

  // ── State ──
  const [meta, setMeta] = useState<AptMeta | null>(null);
  const [initialMeta, setInitialMeta] = useState<AptMeta | null>(null);
  const [aptName, setAptName] = useState(originalName);
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Photos state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{done: number; total: number} | null>(null);
  const uploadedFileKeys = useRef<Set<string>>(new Set());
  const batchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // API category data (for Firestore save)
  const [apiCategories, setApiCategories] = useState<{
    academyCategories?: Record<string, number>;
    restaurantCategories?: Record<string, number>;
    nearestSchoolNames?: { elementary?: string; middle?: string; high?: string };
    nearestStationName?: string;
    nearestStationLine?: string;
    nearestIndeokwonStationName?: string;
    nearestIndeokwonLine?: string;
    nearestTramStationName?: string;
    nearestTramLine?: string;
    nearestStationCoords?: string;
    nearestIndeokwonCoords?: string;
    nearestTramCoords?: string;
  }>({});

  const { txSummary: TX_SUMMARY = {} } = useTxData();
  const txKeys = useMemo(() => Object.keys(TX_SUMMARY).sort(), [TX_SUMMARY]);

  const suggestedTxKey = useMemo(() => {
    return !meta?.txKey ? autoSuggest(originalName, TX_SUMMARY) : null;
  }, [meta?.txKey, originalName, TX_SUMMARY]);

  const existingReport = reports.length > 0 ? reports[0] : null;

  // ── SWR Fetcher for Meta (Firestore + Sheets Merge) ──
  const fetchMeta = async () => {
    let foundMeta: AptMeta | null = null;
    try {
      const metaDoc = await getDoc(doc(db, 'settings/apartmentMeta'));
      if (metaDoc.exists()) {
        const allMeta = metaDoc.data() as Record<string, unknown>;
        const m = allMeta[originalName] as Record<string, unknown> | undefined;
        if (m && typeof m === 'object' && m.dong) {
          foundMeta = {
            dong: m.dong as string, txKey: (m.txKey as string) || autoSuggest(originalName, TX_SUMMARY) || undefined,
            minFloor: m.minFloor as number | undefined, maxFloor: m.maxFloor as number | undefined, isPublicRental: (m.isPublicRental as boolean) || false,
            householdCount: m.householdCount as number | undefined, yearBuilt: m.yearBuilt as string | undefined,
            brand: m.brand as string | undefined, ticker: m.ticker as string | undefined,
            far: m.far as number | undefined, bcr: m.bcr as number | undefined, parkingCount: m.parkingCount as number | undefined,
            parkingPerHousehold: m.parkingPerHousehold as number | undefined, coordinates: m.coordinates as string | undefined,
            distanceToElementary: m.distanceToElementary as number | undefined, distanceToMiddle: m.distanceToMiddle as number | undefined,
            distanceToHigh: m.distanceToHigh as number | undefined, distanceToSubway: m.distanceToSubway as number | undefined,
            distanceToIndeokwon: m.distanceToIndeokwon as number | undefined, distanceToTram: m.distanceToTram as number | undefined,
            distanceToStarbucks: m.distanceToStarbucks as number | undefined, starbucksName: m.starbucksName as string | undefined,
            starbucksAddress: m.starbucksAddress as string | undefined, starbucksCoordinates: m.starbucksCoordinates as string | undefined,
            distanceToMcDonalds: m.distanceToMcDonalds as number | undefined, distanceToOliveYoung: m.distanceToOliveYoung as number | undefined,
            distanceToDaiso: m.distanceToDaiso as number | undefined, distanceToSupermarket: m.distanceToSupermarket as number | undefined,
            academyDensity: m.academyDensity as number | undefined, restaurantDensity: m.restaurantDensity as number | undefined,
          };
        }
      }
    } catch (e) {
      console.warn('Firestore load failed, trying Sheets:', e);
    }

    try {
      const res = await fetch(`/api/apartments-by-dong`);
      if (res.ok) {
        const data = await res.json();
        let sheetsMeta: AptMeta | null = null;
        if (data.byDong) {
          for (const [, apts] of Object.entries(data.byDong)) {
            const apt = (apts as { name: string; [key: string]: unknown }[]).find(a => a.name === originalName);
            if (apt) {
              sheetsMeta = {
                dong: (apt as Record<string, unknown>)?.dong as string, txKey: (apt as Record<string, unknown>)?.txKey as string | undefined, minFloor: (apt as Record<string, unknown>)?.minFloor as number | undefined, maxFloor: (apt as Record<string, unknown>)?.maxFloor as number | undefined, isPublicRental: ((apt as Record<string, unknown>)?.isPublicRental as boolean) || false, householdCount: (apt as Record<string, unknown>)?.householdCount as number | undefined,
                yearBuilt: (apt as Record<string, unknown>)?.yearBuilt as string | undefined, brand: (apt as Record<string, unknown>)?.brand as string | undefined, ticker: (apt as Record<string, unknown>)?.ticker as string | undefined,
                far: (apt as Record<string, unknown>)?.far as number | undefined, bcr: (apt as Record<string, unknown>)?.bcr as number | undefined, parkingCount: (apt as Record<string, unknown>)?.parkingCount as number | undefined,
                coordinates: (apt.lat && apt.lng) ? `${apt.lat}, ${apt.lng}` : undefined,
                starbucksName: (apt as Record<string, unknown>)?.starbucksName as string | undefined, starbucksAddress: (apt as Record<string, unknown>)?.starbucksAddress as string | undefined, starbucksCoordinates: (apt as Record<string, unknown>)?.starbucksCoordinates as string | undefined,
                oliveYoungName: (apt as Record<string, unknown>)?.oliveYoungName as string | undefined, oliveYoungAddress: (apt as Record<string, unknown>)?.oliveYoungAddress as string | undefined, oliveYoungCoordinates: (apt as Record<string, unknown>)?.oliveYoungCoordinates as string | undefined,
                daisoName: (apt as Record<string, unknown>)?.daisoName as string | undefined, daisoAddress: (apt as Record<string, unknown>)?.daisoAddress as string | undefined, daisoCoordinates: (apt as Record<string, unknown>)?.daisoCoordinates as string | undefined,
                mcdonaldsName: (apt as Record<string, unknown>)?.mcdonaldsName as string | undefined, mcdonaldsAddress: (apt as Record<string, unknown>)?.mcdonaldsAddress as string | undefined, mcdonaldsCoordinates: (apt as Record<string, unknown>)?.mcdonaldsCoordinates as string | undefined,
                supermarketName: (apt as Record<string, unknown>)?.supermarketName as string | undefined, supermarketAddress: (apt as Record<string, unknown>)?.supermarketAddress as string | undefined, supermarketCoordinates: (apt as Record<string, unknown>)?.supermarketCoordinates as string | undefined,
                distanceToStarbucks: (apt as Record<string, unknown>)?.distanceToStarbucks as number | undefined, distanceToOliveYoung: (apt as Record<string, unknown>)?.distanceToOliveYoung as number | undefined, distanceToDaiso: (apt as Record<string, unknown>)?.distanceToDaiso as number | undefined,
                distanceToMcDonalds: (apt as Record<string, unknown>)?.distanceToMcDonalds as number | undefined, distanceToSupermarket: (apt as Record<string, unknown>)?.distanceToSupermarket as number | undefined,
              };
              break;
            }
          }
        }
        if (sheetsMeta) {
          if (!foundMeta) return sheetsMeta;
          return { ...foundMeta, ...sheetsMeta, 
            distanceToElementary: foundMeta.distanceToElementary ?? sheetsMeta.distanceToElementary,
            distanceToMiddle: foundMeta.distanceToMiddle ?? sheetsMeta.distanceToMiddle,
            distanceToHigh: foundMeta.distanceToHigh ?? sheetsMeta.distanceToHigh,
            distanceToSubway: foundMeta.distanceToSubway ?? sheetsMeta.distanceToSubway,
            distanceToIndeokwon: foundMeta.distanceToIndeokwon ?? sheetsMeta.distanceToIndeokwon,
            distanceToTram: foundMeta.distanceToTram ?? sheetsMeta.distanceToTram,
            distanceToStarbucks: sheetsMeta.distanceToStarbucks ?? foundMeta.distanceToStarbucks,
            starbucksName: sheetsMeta.starbucksName || foundMeta.starbucksName,
            starbucksAddress: sheetsMeta.starbucksAddress || foundMeta.starbucksAddress,
            starbucksCoordinates: sheetsMeta.starbucksCoordinates || foundMeta.starbucksCoordinates,
            distanceToMcDonalds: sheetsMeta.distanceToMcDonalds ?? foundMeta.distanceToMcDonalds,
            mcdonaldsName: sheetsMeta.mcdonaldsName || foundMeta.mcdonaldsName,
            mcdonaldsAddress: sheetsMeta.mcdonaldsAddress || foundMeta.mcdonaldsAddress,
            mcdonaldsCoordinates: sheetsMeta.mcdonaldsCoordinates || foundMeta.mcdonaldsCoordinates,
            distanceToOliveYoung: sheetsMeta.distanceToOliveYoung ?? foundMeta.distanceToOliveYoung,
            oliveYoungName: sheetsMeta.oliveYoungName || foundMeta.oliveYoungName,
            oliveYoungAddress: sheetsMeta.oliveYoungAddress || foundMeta.oliveYoungAddress,
            oliveYoungCoordinates: sheetsMeta.oliveYoungCoordinates || foundMeta.oliveYoungCoordinates,
            distanceToDaiso: sheetsMeta.distanceToDaiso ?? foundMeta.distanceToDaiso,
            daisoName: sheetsMeta.daisoName || foundMeta.daisoName,
            daisoAddress: sheetsMeta.daisoAddress || foundMeta.daisoAddress,
            daisoCoordinates: sheetsMeta.daisoCoordinates || foundMeta.daisoCoordinates,
            distanceToSupermarket: sheetsMeta.distanceToSupermarket ?? foundMeta.distanceToSupermarket,
            supermarketName: sheetsMeta.supermarketName || foundMeta.supermarketName,
            supermarketAddress: sheetsMeta.supermarketAddress || foundMeta.supermarketAddress,
            supermarketCoordinates: sheetsMeta.supermarketCoordinates || foundMeta.supermarketCoordinates,
            academyDensity: foundMeta.academyDensity ?? sheetsMeta.academyDensity,
            restaurantDensity: foundMeta.restaurantDensity ?? sheetsMeta.restaurantDensity,
          };
        }
      }
    } catch (e) {
      // Ignore
    }
    return foundMeta || { dong: '기타', maxFloor: 0, isPublicRental: false };
  };

  const { data: swrMeta } = useSWR(['apartmentMeta', originalName], fetchMeta, {
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

  // ── Load Scouting Reports + populate metrics/photos from existing report ──
  useEffect(() => {
    if (!originalName) return;
    const q = query(collection(db, 'scoutingReports'), where('apartmentName', '==', originalName));
    const unsub = onSnapshot(q, snap => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScoutingReport));
      fetched.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setReports(fetched);

      // Populate photos from existing report safely (only initialize if empty)
      if (fetched.length > 0) {
        const r = fetched[0];
        if (r.images && r.images.length > 0) {
          setPhotos(prev => {
            if (prev.length > 0) return prev; // Prevent overwriting during active editing
            r.images.forEach(img => {
              try {
                const decoded = decodeURIComponent(img.url);
                const match = decoded.match(/\/([^/?]+)\?/);
                if (match) uploadedFileKeys.current.add(match[1]);
              } catch { /* ignore */ }
            });
            return r.images.map(img => ({
              url: img.url, caption: img.caption || '', locationTag: img.locationTag || '',
              isPremium: img.isPremium || false, capturedAt: img.capturedAt,
            }));
          });
        }
      }
    });
    return () => unsub();
  }, [originalName]);

  // ── Sync Scouting Report Metrics (Race Condition Fix) ──
  useEffect(() => {
    // Only attempt to merge after Google Sheets initial load is done to prevent complete overwrite
    if (!loaded || reports.length === 0) return;
    const r = reports[0];
    const m = r.metrics;
    if (m) {
      setMeta(prev => prev ? ({
        ...prev,
        distanceToElementary: prev.distanceToElementary ?? m.distanceToElementary,
        distanceToMiddle: prev.distanceToMiddle ?? m.distanceToMiddle,
        distanceToHigh: prev.distanceToHigh ?? m.distanceToHigh,
        distanceToSubway: prev.distanceToSubway ?? m.distanceToSubway,
        distanceToIndeokwon: prev.distanceToIndeokwon ?? m.distanceToIndeokwon,
        distanceToTram: prev.distanceToTram ?? m.distanceToTram,
        distanceToStarbucks: prev.distanceToStarbucks ?? m.distanceToStarbucks,
        starbucksName: prev.starbucksName ?? m.starbucksName,
        starbucksAddress: prev.starbucksAddress ?? m.starbucksAddress,
        starbucksCoordinates: prev.starbucksCoordinates ?? m.starbucksCoordinates,
        distanceToMcDonalds: prev.distanceToMcDonalds ?? m.distanceToMcDonalds,
        mcdonaldsName: prev.mcdonaldsName ?? m.mcdonaldsName,
        mcdonaldsAddress: prev.mcdonaldsAddress ?? m.mcdonaldsAddress,
        mcdonaldsCoordinates: prev.mcdonaldsCoordinates ?? m.mcdonaldsCoordinates,
        distanceToOliveYoung: prev.distanceToOliveYoung ?? m.distanceToOliveYoung,
        oliveYoungName: prev.oliveYoungName ?? m.oliveYoungName,
        oliveYoungAddress: prev.oliveYoungAddress ?? m.oliveYoungAddress,
        oliveYoungCoordinates: prev.oliveYoungCoordinates ?? m.oliveYoungCoordinates,
        distanceToDaiso: prev.distanceToDaiso ?? m.distanceToDaiso,
        daisoName: prev.daisoName ?? m.daisoName,
        daisoAddress: prev.daisoAddress ?? m.daisoAddress,
        daisoCoordinates: prev.daisoCoordinates ?? m.daisoCoordinates,
        distanceToSupermarket: prev.distanceToSupermarket ?? m.distanceToSupermarket,
        supermarketName: prev.supermarketName ?? m.supermarketName,
        supermarketAddress: prev.supermarketAddress ?? m.supermarketAddress,
        supermarketCoordinates: prev.supermarketCoordinates ?? m.supermarketCoordinates,
        academyDensity: prev.academyDensity ?? m.academyDensity,
        restaurantDensity: prev.restaurantDensity ?? (m as unknown as Record<string, number>).restaurantDensity,
        brand: prev.brand || m.brand,
        householdCount: prev.householdCount ?? m.householdCount,
        far: prev.far ?? m.far,
        bcr: prev.bcr ?? m.bcr,
        parkingPerHousehold: prev.parkingPerHousehold ?? m.parkingPerHousehold,
        minFloor: prev.minFloor ?? m.minFloor,
        yearBuilt: prev.yearBuilt || String(m.yearBuilt || ''),
      }) : prev);

      // Restore API categories
      if (typeof m === 'object' && m !== null) {
        setApiCategories(prev => {
          if (Object.keys(prev.academyCategories || {}).length > 0) return prev;
          return {
            ...prev,
            academyCategories: (m as unknown as Record<string, unknown>).academyCategories as Record<string, number> || {},
            restaurantCategories: (m as unknown as Record<string, unknown>).restaurantCategories as Record<string, number> || {},
            nearestSchoolNames: (m as unknown as Record<string, unknown>).nearestSchoolNames as Record<string, string> || {},
            nearestStationName: (m as unknown as Record<string, unknown>).nearestStationName as string | undefined,
            nearestStationLine: (m as unknown as Record<string, unknown>).nearestStationLine as string | undefined,
            nearestIndeokwonStationName: (m as unknown as Record<string, unknown>).nearestIndeokwonStationName as string | undefined,
            nearestIndeokwonLine: (m as unknown as Record<string, unknown>).nearestIndeokwonLine as string | undefined,
            nearestTramStationName: (m as unknown as Record<string, unknown>).nearestTramStationName as string | undefined,
            nearestTramLine: (m as unknown as Record<string, unknown>).nearestTramLine as string | undefined,
            nearestStationCoords: (m as unknown as Record<string, unknown>).nearestStationCoords as string | undefined,
            nearestIndeokwonCoords: (m as unknown as Record<string, unknown>).nearestIndeokwonCoords as string | undefined,
            nearestTramCoords: (m as unknown as Record<string, unknown>).nearestTramCoords as string | undefined,
          };
        });
      }
    }
  }, [loaded, reports]);

  // ── Photo handlers ──
  const handleBatchFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArr.length === 0) return;
    const unique: File[] = [];
    let dupCount = 0;
    for (const f of fileArr) {
      if (uploadedFileKeys.current.has(f.name)) { dupCount++; }
      else { uploadedFileKeys.current.add(f.name); unique.push(f); }
    }
    if (dupCount > 0) alert(`중복 사진 ${dupCount}장이 제외되었습니다.`);
    if (unique.length === 0) return;
    const withDates = await Promise.all(
      unique.map(async file => {
        const previewUrl = URL.createObjectURL(file);
        const capturedAt = await extractCapturedDate(file) || undefined;
        return { file, previewUrl, url: '', caption: '', locationTag: '', isPremium: false, capturedAt } as PhotoItem;
      })
    );
    setPhotos(prev => [...prev, ...withDates]);
  }, []);

  const sortByCategory = useCallback(() => {
    const order = IMAGE_CATEGORY_GROUPS.flatMap(g => g.items);
    setPhotos(prev => [...prev].sort((a, b) => {
      const ai = order.indexOf(a.locationTag);
      const bi = order.indexOf(b.locationTag);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }));
  }, []);

  // ── Auto-fetch location scores ──
  const handleAutoFetch = async () => {
    if (!meta) return;
    setIsCalculating(true);
    try {
      const res = await fetch(`/api/location-scores?apartment=${encodeURIComponent(originalName)}&refresh=1&t=${Date.now()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(`좌표 데이터를 찾을 수 없습니다.\n\n💡 ${errData.hint || ''}`);
        return;
      }
      const loc = await res.json();
      const bld = loc.buildingInfo;
      // Compute parkingCount from ratio if available
      const pph = bld?.parkingPerHousehold;
      const hh = bld?.householdCount;
      const computedParkingCount = (pph && hh) ? Math.round(pph * hh) : undefined;
      // Format coordinates from API response
      const coordStr = loc.coordinates ? `${loc.coordinates.lat}, ${loc.coordinates.lng}` : undefined;
      setMeta(prev => prev ? ({
        ...prev,
        distanceToElementary: loc.distanceToElementary ?? prev.distanceToElementary,
        distanceToMiddle: loc.distanceToMiddle ?? prev.distanceToMiddle,
        distanceToHigh: loc.distanceToHigh ?? prev.distanceToHigh,
        distanceToSubway: loc.distanceToSubway ?? prev.distanceToSubway,
        distanceToIndeokwon: loc.distanceToIndeokwon ?? prev.distanceToIndeokwon,
        distanceToTram: loc.distanceToTram ?? prev.distanceToTram,
        distanceToStarbucks: loc.distanceToStarbucks ?? prev.distanceToStarbucks,
        distanceToMcDonalds: loc.distanceToMcDonalds ?? prev.distanceToMcDonalds,
        distanceToOliveYoung: loc.distanceToOliveYoung ?? prev.distanceToOliveYoung,
        distanceToDaiso: loc.distanceToDaiso ?? prev.distanceToDaiso,
        distanceToSupermarket: loc.distanceToSupermarket ?? prev.distanceToSupermarket,
        academyDensity: loc.academyDensity ?? prev.academyDensity,
        restaurantDensity: loc.restaurantDensity ?? prev.restaurantDensity,
        brand: bld?.brand || prev.brand,
        householdCount: bld?.householdCount || prev.householdCount,
        yearBuilt: bld?.yearBuilt ? String(bld.yearBuilt) : prev.yearBuilt,
        far: bld?.far || prev.far,
        bcr: bld?.bcr || prev.bcr,
        parkingPerHousehold: pph || prev.parkingPerHousehold,
        parkingCount: computedParkingCount || prev.parkingCount,
        coordinates: coordStr || prev.coordinates,
      }) : prev);
      setApiCategories({
        academyCategories: loc.academyCategories || {},
        restaurantCategories: loc.restaurantCategories || {},
        nearestSchoolNames: {
          elementary: loc.nearestSchools?.elementary?.name,
          middle: loc.nearestSchools?.middle?.name,
          high: loc.nearestSchools?.high?.name,
        },
        nearestStationName: loc.nearestStation?.name,
        nearestStationLine: loc.nearestStation?.line,
        nearestIndeokwonStationName: loc.nearestIndeokwon?.name,
        nearestIndeokwonLine: loc.nearestIndeokwon?.line,
        nearestTramStationName: loc.nearestTram?.name,
        nearestTramLine: loc.nearestTram?.line,
        nearestStationCoords: loc.nearestStation?.lat ? `${loc.nearestStation.lat},${loc.nearestStation.lng}` : undefined,
        nearestIndeokwonCoords: loc.nearestIndeokwon?.lat ? `${loc.nearestIndeokwon.lat},${loc.nearestIndeokwon.lng}` : undefined,
        nearestTramCoords: loc.nearestTram?.lat ? `${loc.nearestTram.lat},${loc.nearestTram.lng}` : undefined,
      });
      alert('✅ 자동 출력 완료!');
    } catch (e) {
      alert('자동 출력 중 오류가 발생했습니다.');
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  };

  // ── Unified Save ──
  const handleSave = async () => {
    if (!meta || !initialMeta) return;
    setSaving(true);
    try {
      const newName = aptName.trim();
      if (!newName) throw new Error('아파트 이름을 입력해주세요.');

      // 1. Google Sheets sync
      const syncPayload: { updates: Record<string, unknown>[]; adds: Record<string, unknown>[]; deletes: string[] } = { updates: [], adds: [], deletes: [] };
      if (!initialMeta.ticker) {
        syncPayload.adds.push({ name: newName, dong: meta.dong, txKey: meta.txKey || '' });
      } else {
        const updates: Record<string, string | number | boolean> = {};
        if (newName !== originalName) updates['아파트명'] = newName;
        if (meta.dong !== initialMeta.dong) updates['동'] = meta.dong;
        if (meta.txKey !== initialMeta.txKey) updates['txKey'] = meta.txKey || '';
        if (meta.minFloor !== initialMeta.minFloor) updates['최저층'] = meta.minFloor || '';
        if (meta.maxFloor !== initialMeta.maxFloor) updates['최고층'] = meta.maxFloor || '';
        if (meta.isPublicRental !== initialMeta.isPublicRental) updates['공공임대'] = meta.isPublicRental ? 'Y' : 'N';
        if (meta.householdCount !== initialMeta.householdCount) updates['세대수'] = meta.householdCount || '';
        if (meta.brand !== initialMeta.brand) updates['시공사'] = meta.brand || '';
        if (meta.far !== initialMeta.far) updates['용적률'] = meta.far || '';
        if (meta.bcr !== initialMeta.bcr) updates['건폐율'] = meta.bcr || '';
        if (meta.parkingCount !== initialMeta.parkingCount) updates['주차대수'] = meta.parkingCount || '';
        if (meta.yearBuilt !== initialMeta.yearBuilt) updates['사용승인'] = meta.yearBuilt || '';
        if (meta.coordinates !== initialMeta.coordinates) updates['좌표'] = meta.coordinates || '';
        if (Object.keys(updates).length > 0) {
          syncPayload.updates.push({ ticker: initialMeta.ticker, updates });
        }
      }
      if (syncPayload.updates.length > 0 || syncPayload.adds.length > 0) {
        const idToken = await auth.currentUser?.getIdToken();
        const syncRes = await fetch('/api/apartments-sync', {
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
          },
          body: JSON.stringify(syncPayload),
        });
        if (!syncRes.ok) {
          const errData = await syncRes.json();
          throw new Error('Google Sheets Sync Failed: ' + errData.error);
        }
      }

      // 2. Update Firestore meta cache
      try {
        const resMeta = await fetch(`/api/apartments-by-dong?t=${Date.now()}`, { cache: 'no-store' });
        if (resMeta.ok) {
          const data = await resMeta.json();
          const clean: Record<string, Record<string, unknown>> = {};
          for (const [, apts] of Object.entries(data.byDong || {})) {
            (apts as Record<string, unknown>[]).forEach(a => {
              const entry: Record<string, unknown> = {};
              if (a.dong) entry['dong'] = a.dong;
              if (a.txKey) entry['txKey'] = a.txKey;
              if (a.maxFloor) entry['maxFloor'] = a.maxFloor;
              if (a.isPublicRental) entry['isPublicRental'] = a.isPublicRental;
              if (a.householdCount) entry['householdCount'] = a.householdCount;
              if (a.yearBuilt) entry['yearBuilt'] = a.yearBuilt;
              if (a.brand) entry['brand'] = a.brand;
              if (a.ticker) entry['ticker'] = a.ticker;
              clean[a.name as string] = entry;
            });
          }
          delete clean[originalName];
          // ★ Save ALL fields including distance metrics to Firestore cache
          const metaToSave: Record<string, unknown> = {
            dong: meta.dong, txKey: meta.txKey, minFloor: meta.minFloor, maxFloor: meta.maxFloor,
            isPublicRental: meta.isPublicRental, ticker: initialMeta.ticker,
            householdCount: meta.householdCount, yearBuilt: meta.yearBuilt,
            brand: meta.brand, far: meta.far, bcr: meta.bcr,
            parkingCount: meta.parkingCount, parkingPerHousehold: meta.parkingPerHousehold,
            coordinates: meta.coordinates,
            // Distance metrics (교통/학군/앵커테넌트)
            distanceToElementary: meta.distanceToElementary ?? null,
            distanceToMiddle: meta.distanceToMiddle ?? null,
            distanceToHigh: meta.distanceToHigh ?? null,
            distanceToSubway: meta.distanceToSubway ?? null,
            distanceToIndeokwon: meta.distanceToIndeokwon ?? null,
            distanceToTram: meta.distanceToTram ?? null,
            distanceToStarbucks: meta.distanceToStarbucks ?? null,
            starbucksName: meta.starbucksName ?? null,
            starbucksAddress: meta.starbucksAddress ?? null,
            starbucksCoordinates: meta.starbucksCoordinates ?? null,
            distanceToMcDonalds: meta.distanceToMcDonalds ?? null,
            mcdonaldsName: meta.mcdonaldsName ?? null,
            mcdonaldsAddress: meta.mcdonaldsAddress ?? null,
            mcdonaldsCoordinates: meta.mcdonaldsCoordinates ?? null,
            distanceToOliveYoung: meta.distanceToOliveYoung ?? null,
            oliveYoungName: meta.oliveYoungName ?? null,
            oliveYoungAddress: meta.oliveYoungAddress ?? null,
            oliveYoungCoordinates: meta.oliveYoungCoordinates ?? null,
            distanceToDaiso: meta.distanceToDaiso ?? null,
            daisoName: meta.daisoName ?? null,
            daisoAddress: meta.daisoAddress ?? null,
            daisoCoordinates: meta.daisoCoordinates ?? null,
            distanceToSupermarket: meta.distanceToSupermarket ?? null,
            supermarketName: meta.supermarketName ?? null,
            supermarketAddress: meta.supermarketAddress ?? null,
            supermarketCoordinates: meta.supermarketCoordinates ?? null,
            academyDensity: meta.academyDensity ?? null,
            restaurantDensity: meta.restaurantDensity ?? null,
          };
          // Remove undefined keys to prevent Firestore serialization error
          const safeMeta = JSON.parse(JSON.stringify(metaToSave));
          clean[newName] = safeMeta;
          await setDoc(doc(db, FIRESTORE_DOC), clean);
        }
      } catch { /* Firestore cache update non-critical */ }

      // 3. Upload photos & save scouting report to Firestore
      // 무조건 scoutingReport 문서를 업데이트/생성해야 메트릭이 저장됨
      if (true) {
        const uploadedImages: ImageMeta[] = [];
        const imagesToUpload = photos.filter(p => p.file || p.url);
        const total = imagesToUpload.length;
        let done = 0;
        setUploadProgress({ done: 0, total });

        // Parallel batch upload (3 at a time)
        const BATCH_SIZE = 3;
        for (let i = 0; i < imagesToUpload.length; i += BATCH_SIZE) {
          const batch = imagesToUpload.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async img => {
              let finalUrl = img.url;
              if (img.file) finalUrl = await uploadImage(img.file, 'report_images');
              return finalUrl ? {
                url: finalUrl, caption: img.caption || '', locationTag: img.locationTag || '',
                isPremium: img.isPremium, capturedAt: img.capturedAt,
              } as ImageMeta : null;
            })
          );
          results.forEach(r => { if (r) uploadedImages.push(r); });
          done += batch.length;
          setUploadProgress({ done, total });
        }

        const metricsPayload = {
          brand: meta.brand || '', householdCount: meta.householdCount || 0,
          far: meta.far || 0, bcr: meta.bcr || 0,
          parkingCount: meta.parkingCount, parkingPerHousehold: meta.parkingPerHousehold || 0,
          minFloor: meta.minFloor, maxFloor: meta.maxFloor, coordinates: meta.coordinates,
          yearBuilt: Number(meta.yearBuilt) || 0,
          distanceToElementary: meta.distanceToElementary || 0,
          distanceToMiddle: meta.distanceToMiddle || 0,
          distanceToHigh: meta.distanceToHigh || 0,
          distanceToSubway: meta.distanceToSubway || 0,
          distanceToIndeokwon: meta.distanceToIndeokwon ?? null,
          distanceToTram: meta.distanceToTram ?? null,
          distanceToStarbucks: meta.distanceToStarbucks ?? null,
          starbucksName: meta.starbucksName ?? null,
          starbucksAddress: meta.starbucksAddress ?? null,
          starbucksCoordinates: meta.starbucksCoordinates ?? null,
          distanceToMcDonalds: meta.distanceToMcDonalds ?? null,
          mcdonaldsName: meta.mcdonaldsName ?? null,
          mcdonaldsAddress: meta.mcdonaldsAddress ?? null,
          mcdonaldsCoordinates: meta.mcdonaldsCoordinates ?? null,
          distanceToOliveYoung: meta.distanceToOliveYoung ?? null,
          oliveYoungName: meta.oliveYoungName ?? null,
          oliveYoungAddress: meta.oliveYoungAddress ?? null,
          oliveYoungCoordinates: meta.oliveYoungCoordinates ?? null,
          distanceToDaiso: meta.distanceToDaiso ?? null,
          daisoName: meta.daisoName ?? null,
          daisoAddress: meta.daisoAddress ?? null,
          daisoCoordinates: meta.daisoCoordinates ?? null,
          distanceToSupermarket: meta.distanceToSupermarket ?? null,
          supermarketName: meta.supermarketName ?? null,
          supermarketAddress: meta.supermarketAddress ?? null,
          supermarketCoordinates: meta.supermarketCoordinates ?? null,
          academyDensity: meta.academyDensity || 0,
          ...(apiCategories.academyCategories ? { academyCategories: apiCategories.academyCategories } : {}),
          ...(meta.restaurantDensity ? { restaurantDensity: meta.restaurantDensity } : {}),
          ...(apiCategories.restaurantCategories ? { restaurantCategories: apiCategories.restaurantCategories } : {}),
          ...(apiCategories.nearestSchoolNames ? { nearestSchoolNames: apiCategories.nearestSchoolNames } : {}),
          ...(apiCategories.nearestStationName ? { nearestStationName: apiCategories.nearestStationName } : {}),
          ...(apiCategories.nearestStationLine ? { nearestStationLine: apiCategories.nearestStationLine } : {}),
          ...(apiCategories.nearestIndeokwonStationName ? { nearestIndeokwonStationName: apiCategories.nearestIndeokwonStationName } : {}),
          ...(apiCategories.nearestIndeokwonLine ? { nearestIndeokwonLine: apiCategories.nearestIndeokwonLine } : {}),
          ...(apiCategories.nearestTramStationName ? { nearestTramStationName: apiCategories.nearestTramStationName } : {}),
          ...(apiCategories.nearestTramLine ? { nearestTramLine: apiCategories.nearestTramLine } : {}),
          ...(apiCategories.nearestStationCoords ? { nearestStationCoords: apiCategories.nearestStationCoords } : {}),
          ...(apiCategories.nearestIndeokwonCoords ? { nearestIndeokwonCoords: apiCategories.nearestIndeokwonCoords } : {}),
          ...(apiCategories.nearestTramCoords ? { nearestTramCoords: apiCategories.nearestTramCoords } : {}),
        };

        const safeMetricsPayload = JSON.parse(JSON.stringify(metricsPayload));
        const premiumScores = await getPremiumScoresAction(safeMetricsPayload);

        const reportData = {
          dong: meta.dong,
          apartmentName: newName,
          scoutingDate: new Date().toLocaleDateString('en-CA'),
          thumbnailUrl: uploadedImages[0]?.url || existingReport?.thumbnailUrl || '',
          images: uploadedImages,
          metrics: safeMetricsPayload,
          premiumScores,
          isPremium: existingReport?.isPremium ?? true,
          premiumContent: existingReport?.premiumContent || '',
          authorUid: auth.currentUser?.uid || 'ADMIN',
        };

        if (existingReport?.id) {
          await updateScoutingReport(existingReport.id, reportData);
        } else {
          await createScoutingReport(reportData);
        }
        setUploadProgress(null);
      }

      // 4. Rename reports if needed
      if (newName !== originalName) {
        const q = query(collection(db, 'scoutingReports'), where('apartmentName', '==', originalName));
        const snap = await getDocs(q);
        if (snap.docs.length > 0) {
          await Promise.all(snap.docs.map(d => updateDoc(d.ref, { apartmentName: newName })));
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (newName !== originalName) {
        router.replace(`/admin/apartments/${encodeURIComponent(newName)}`);
      } else {
        setInitialMeta(JSON.parse(JSON.stringify(meta)));
      }
    } catch (e: unknown) {
      console.error('Save failed:', e);
      alert('저장에 실패했습니다: ' + (e as Error).message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`정말 '${originalName}' 단지를 삭제하시겠습니까?\n구글 시트 및 데이터베이스에서 완전히 삭제되며 복구할 수 없습니다.`)) return;
    
    setSaving(true);
    try {
      // 1. Delete from Google Sheets
      const syncPayload = { updates: [], adds: [], deletes: [originalName] };
      const idToken = await auth.currentUser?.getIdToken();
      const syncRes = await fetch('/api/apartments-sync', {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify(syncPayload),
      });
      if (!syncRes.ok) {
        const errData = await syncRes.json();
        throw new Error('Google Sheets Delete Failed: ' + errData.error);
      }

      // 2. Delete from Firestore cache
      const metaDoc = await getDoc(doc(db, FIRESTORE_DOC));
      if (metaDoc.exists()) {
        const allMeta = metaDoc.data();
        delete allMeta[originalName];
        await setDoc(doc(db, FIRESTORE_DOC), allMeta);
      }

      alert('성공적으로 삭제되었습니다.');
      router.replace('/admin');
    } catch (e: unknown) {
      console.error('Delete failed:', e);
      alert('삭제에 실패했습니다: ' + (e as Error).message);
      setSaving(false);
    }
  };

  // ── Render ──
  if (!loaded) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-4 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300 pb-20">
      {/* Back + Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/admin')} className="flex items-center gap-1 text-tertiary hover:text-toss-blue text-[14px] font-bold mb-4 transition-colors">
          <ChevronLeft size={16} /> 대시보드로 돌아가기
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">{originalName}</h1>
            <p className="text-secondary text-[14px] mt-2">단지 기본정보 · 현장 사진을 통합 관리합니다.</p>
          </div>
          <button onClick={handleAutoFetch} disabled={isCalculating}
            className="px-5 py-2.5 bg-toss-blue-light hover:bg-toss-blue/20 text-toss-blue font-bold text-[13px] rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shrink-0">
            {isCalculating ? (
              <><div className="w-4 h-4 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" /> 불러오는 중...</>
            ) : '📍 단지 정보 자동 출력'}
          </button>
        </div>
      </div>

      {meta && (
        <div className="space-y-8">
          {/* ─── Section 1: 기본 정보 ─── */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 md:p-8">
            <h2 className="text-[16px] font-bold text-primary mb-5 border-b border-body pb-3">① 기본 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-[13px] font-bold text-secondary mb-1.5 block">단지명 (이름 편집)</label>
                <input type="text" value={aptName} onChange={e => setAptName(e.target.value)}
                  className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] outline-none focus:border-toss-blue focus:bg-surface transition-all font-bold text-primary" />
              </div>
              <div>
                <label className="text-[13px] font-bold text-secondary mb-1.5 flex items-center gap-1"><MapPin size={14}/> 법정동</label>
                <select value={meta.dong} onChange={e => setMeta({ ...meta, dong: e.target.value })}
                  className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] outline-none focus:border-toss-blue focus:bg-surface popup-select">
                  {dongNames.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-bold text-secondary flex items-center gap-1"><Link2 size={14}/> TX 키</label>
                  {suggestedTxKey && !meta?.txKey && (
                    <button onClick={() => setMeta({ ...meta, txKey: suggestedTxKey })}
                      className="px-2 py-0.5 bg-toss-blue-light text-toss-blue hover:bg-toss-blue hover:text-surface rounded text-[11px] font-bold transition-colors">
                      자동 추천: {suggestedTxKey}
                    </button>
                  )}
                </div>
                <input type="text" value={meta.isPublicRental ? '' : (meta.txKey || '')} 
                  onChange={e => setMeta({ ...meta, txKey: e.target.value })}
                  list="tx-keys" 
                  placeholder={meta.isPublicRental ? "공공임대는 실거래가(TX) 매핑 불가" : "예: 동탄역호반써밋"}
                  disabled={meta.isPublicRental}
                  className={`w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] outline-none font-mono transition-all ${
                    meta.isPublicRental ? 'opacity-60 cursor-not-allowed text-tertiary' : 'focus:border-toss-blue focus:bg-surface'
                  }`} />
                {(() => {
                  const searchStr = (meta.txKey || '').trim().toLowerCase();
                  const filteredKeys = txKeys
                    .filter(k => searchStr ? k.toLowerCase().includes(searchStr) : (k.includes('동탄') || (meta.dong && k.includes(meta.dong))))
                    .slice(0, 100);
                  return <datalist id="tx-keys">{filteredKeys.map(k => <option key={k} value={k}/>)}</datalist>;
                })()}
              </div>
              <NumField label="최저층" value={meta.minFloor} unit="층" placeholder="15" onChange={v => setMeta({...meta, minFloor: v ? Math.round(v) : undefined})}/>
              <NumField label="최고층" value={meta.maxFloor} unit="층" placeholder="35" onChange={v => setMeta({...meta, maxFloor: v ? Math.round(v) : undefined})}/>
              <div className="flex flex-col justify-end pb-1">
                <button type="button" onClick={() => setMeta({ ...meta, isPublicRental: !meta.isPublicRental })}
                  className={`flex items-center justify-center gap-2 h-[48px] rounded-xl text-[14px] font-bold transition-all border ${
                    meta.isPublicRental ? 'bg-primary text-surface border-[#191f28]' : 'bg-surface border-border text-secondary hover:bg-body'
                  }`}>
                  <Home size={16}/> 공공임대 단지 설정
                </button>
              </div>
            </div>

            {/* Extended meta */}
            <div className="mt-6 pt-5 border-t border-body">
              <h3 className="text-[14px] font-bold text-tertiary mb-4">📋 건물 상세</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <NumField label="세대수" value={meta.householdCount} unit="세대" placeholder="1200" onChange={v => setMeta({...meta, householdCount: v ? Math.round(v) : undefined})}/>
                <div>
                  <label className="text-[13px] font-bold text-secondary mb-1.5 block">시공사 (브랜드)</label>
                  <input type="text" value={meta.brand || ''} onChange={e => setMeta({ ...meta, brand: e.target.value || undefined })}
                    placeholder="예: 현대건설" className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] outline-none focus:border-toss-blue focus:bg-surface" />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-secondary mb-1.5 block">사용승인 (준공)</label>
                  <input type="text" value={meta.yearBuilt || ''} onChange={e => setMeta({ ...meta, yearBuilt: e.target.value || undefined })}
                    placeholder="예: 202012" className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] outline-none focus:border-toss-blue focus:bg-surface" />
                </div>
                <NumField label="용적률" value={meta.far} unit="%" placeholder="249.8" onChange={v => setMeta({...meta, far: v})}/>
                <NumField label="건폐율" value={meta.bcr} unit="%" placeholder="18.5" onChange={v => setMeta({...meta, bcr: v})}/>
                <NumField label="주차대수" value={meta.parkingCount} unit="대" placeholder="1580" onChange={v => setMeta({...meta, parkingCount: v ? Math.round(v) : undefined})}/>
                <NumField label="세대당 주차" value={meta.parkingPerHousehold} unit="대" placeholder="1.45" onChange={v => setMeta({...meta, parkingPerHousehold: v})}/>
                <div className="md:col-span-2 lg:col-span-2">
                  <label className="text-[13px] font-bold text-secondary mb-1.5 flex items-center gap-1"><MapPin size={14}/> 좌표 (위도, 경도)</label>
                  <input type="text" value={meta.coordinates || ''} onChange={e => setMeta({ ...meta, coordinates: e.target.value || undefined })}
                    placeholder="예: 37.2005, 127.0985" className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] outline-none focus:border-toss-blue focus:bg-surface font-mono" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Section 2: 입지 분석 ─── */}
          <div className="bg-body rounded-2xl border border-border shadow-sm p-5 md:p-8">
            <h2 className="text-[16px] font-bold text-primary mb-5 border-b border-border pb-3">② 입지 분석</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <NumField label="초등학교 통학거리" value={meta.distanceToElementary} unit="m" placeholder="300" onChange={v => setMeta({...meta, distanceToElementary: v})}/>
              <NumField label="중학교 통학거리" value={meta.distanceToMiddle} unit="m" placeholder="800" onChange={v => setMeta({...meta, distanceToMiddle: v})}/>
              <NumField label="고등학교 통학거리" value={meta.distanceToHigh} unit="m" placeholder="1200" onChange={v => setMeta({...meta, distanceToHigh: v})}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <NumField label="GTX-A/SRT 거리" value={meta.distanceToSubway} unit="m" placeholder="500" onChange={v => setMeta({...meta, distanceToSubway: v})}/>
              <NumField label="동탄인덕원선 거리" value={meta.distanceToIndeokwon} unit="m" placeholder="800" onChange={v => setMeta({...meta, distanceToIndeokwon: v})}/>
              <NumField label="동탄트램 거리" value={meta.distanceToTram} unit="m" placeholder="300" onChange={v => setMeta({...meta, distanceToTram: v})}/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4]">
              <div>
                <label className="text-[13px] font-bold text-[#00704A] mb-1.5 flex items-center gap-1">스타벅스 지점명</label>
                <input type="text" value={meta.starbucksName || ''} onChange={e => setMeta({ ...meta, starbucksName: e.target.value || undefined })}
                  placeholder="예: 스타벅스 동탄역점" className="w-full px-4 py-3 bg-surface border border-[#bbf7d0] rounded-xl text-[15px] outline-none focus:border-[#00704A] transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[13px] font-bold text-[#00704A] mb-1.5 flex items-center gap-1">스타벅스 주소 / 구글 맵 좌표</label>
                <div className="flex gap-2">
                  <input type="text" value={meta.starbucksAddress || ''} onChange={e => setMeta({ ...meta, starbucksAddress: e.target.value || undefined })}
                    placeholder="상세 주소" className="flex-1 px-4 py-3 bg-surface border border-[#bbf7d0] rounded-xl text-[15px] outline-none focus:border-[#00704A] transition-all" />
                  <input type="text" value={meta.starbucksCoordinates || ''} onChange={e => setMeta({ ...meta, starbucksCoordinates: e.target.value || undefined })}
                    placeholder="좌표 (위도,경도)" className="w-44 px-4 py-3 bg-surface border border-[#bbf7d0] rounded-xl text-[15px] outline-none focus:border-[#00704A] transition-all font-mono" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 rounded-xl border border-[#03c75a]/30 bg-toss-green/5 text-toss-green">
              <div>
                <label className="text-[13px] font-bold mb-1.5 flex items-center gap-1">올리브영 지점명</label>
                <input type="text" value={meta.oliveYoungName || ''} onChange={e => setMeta({ ...meta, oliveYoungName: e.target.value || undefined })}
                  placeholder="예: 올리브영 동탄역점" className="w-full px-4 py-3 bg-surface border border-[#03c75a]/30 rounded-xl text-[15px] outline-none focus:border-[#03c75a] transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[13px] font-bold mb-1.5 flex items-center gap-1">올리브영 주소 / 좌표</label>
                <div className="flex gap-2">
                  <input type="text" value={meta.oliveYoungAddress || ''} onChange={e => setMeta({ ...meta, oliveYoungAddress: e.target.value || undefined })}
                    placeholder="상세 주소" className="flex-1 px-4 py-3 bg-surface border border-[#03c75a]/30 rounded-xl text-[15px] outline-none focus:border-[#03c75a] transition-all text-primary" />
                  <input type="text" value={meta.oliveYoungCoordinates || ''} onChange={e => setMeta({ ...meta, oliveYoungCoordinates: e.target.value || undefined })}
                    placeholder="위도,경도" className="w-44 px-4 py-3 bg-surface border border-[#03c75a]/30 rounded-xl text-[15px] outline-none focus:border-[#03c75a] transition-all font-mono text-primary" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 text-[#EF4444]">
              <div>
                <label className="text-[13px] font-bold mb-1.5 flex items-center gap-1">다이소 지점명</label>
                <input type="text" value={meta.daisoName || ''} onChange={e => setMeta({ ...meta, daisoName: e.target.value || undefined })}
                  placeholder="예: 다이소 동탄역점" className="w-full px-4 py-3 bg-surface border border-[#EF4444]/30 rounded-xl text-[15px] outline-none focus:border-[#EF4444] transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[13px] font-bold mb-1.5 flex items-center gap-1">다이소 주소 / 좌표</label>
                <div className="flex gap-2">
                  <input type="text" value={meta.daisoAddress || ''} onChange={e => setMeta({ ...meta, daisoAddress: e.target.value || undefined })}
                    placeholder="상세 주소" className="flex-1 px-4 py-3 bg-surface border border-[#EF4444]/30 rounded-xl text-[15px] outline-none focus:border-[#EF4444] transition-all text-primary" />
                  <input type="text" value={meta.daisoCoordinates || ''} onChange={e => setMeta({ ...meta, daisoCoordinates: e.target.value || undefined })}
                    placeholder="위도,경도" className="w-44 px-4 py-3 bg-surface border border-[#EF4444]/30 rounded-xl text-[15px] outline-none focus:border-[#EF4444] transition-all font-mono text-primary" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/5 text-[#d97706]">
              <div>
                <label className="text-[13px] font-bold mb-1.5 flex items-center gap-1">대형마트 지점명</label>
                <input type="text" value={meta.supermarketName || ''} onChange={e => setMeta({ ...meta, supermarketName: e.target.value || undefined })}
                  placeholder="예: 이마트 동탄점" className="w-full px-4 py-3 bg-surface border border-[#f59e0b]/40 rounded-xl text-[15px] outline-none focus:border-[#f59e0b] transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[13px] font-bold mb-1.5 flex items-center gap-1">대형마트 주소 / 좌표</label>
                <div className="flex gap-2">
                  <input type="text" value={meta.supermarketAddress || ''} onChange={e => setMeta({ ...meta, supermarketAddress: e.target.value || undefined })}
                    placeholder="상세 주소" className="flex-1 px-4 py-3 bg-surface border border-[#f59e0b]/40 rounded-xl text-[15px] outline-none focus:border-[#f59e0b] transition-all text-primary" />
                  <input type="text" value={meta.supermarketCoordinates || ''} onChange={e => setMeta({ ...meta, supermarketCoordinates: e.target.value || undefined })}
                    placeholder="위도,경도" className="w-44 px-4 py-3 bg-surface border border-[#f59e0b]/40 rounded-xl text-[15px] outline-none focus:border-[#f59e0b] transition-all font-mono text-primary" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 rounded-xl border border-[#FF6699]/30 bg-[#FF6699]/5 text-[#FF6699]">
              <div>
                <label className="text-[13px] font-bold mb-1.5 flex items-center gap-1">배스킨라빈스 지점명</label>
                <input type="text" value={meta.mcdonaldsName || ''} onChange={e => setMeta({ ...meta, mcdonaldsName: e.target.value || undefined })}
                  placeholder="예: 배스킨라빈스 동탄점" className="w-full px-4 py-3 bg-surface border border-[#FF6699]/30 rounded-xl text-[15px] outline-none focus:border-[#FF6699] transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[13px] font-bold mb-1.5 flex items-center gap-1">배스킨라빈스 주소 / 좌표</label>
                <div className="flex gap-2">
                  <input type="text" value={meta.mcdonaldsAddress || ''} onChange={e => setMeta({ ...meta, mcdonaldsAddress: e.target.value || undefined })}
                    placeholder="상세 주소" className="flex-1 px-4 py-3 bg-surface border border-[#FF6699]/30 rounded-xl text-[15px] outline-none focus:border-[#FF6699] transition-all text-primary" />
                  <input type="text" value={meta.mcdonaldsCoordinates || ''} onChange={e => setMeta({ ...meta, mcdonaldsCoordinates: e.target.value || undefined })}
                    placeholder="위도,경도" className="w-44 px-4 py-3 bg-surface border border-[#FF6699]/30 rounded-xl text-[15px] outline-none focus:border-[#FF6699] transition-all font-mono text-primary" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <NumField label="스타벅스" value={meta.distanceToStarbucks} unit="m" placeholder="250" onChange={v => setMeta({...meta, distanceToStarbucks: v})}/>
              <NumField label="올리브영" value={meta.distanceToOliveYoung} unit="m" placeholder="300" onChange={v => setMeta({...meta, distanceToOliveYoung: v})}/>
              <NumField label="다이소" value={meta.distanceToDaiso} unit="m" placeholder="400" onChange={v => setMeta({...meta, distanceToDaiso: v})}/>
              <NumField label="대형마트" value={meta.distanceToSupermarket} unit="m" placeholder="500" onChange={v => setMeta({...meta, distanceToSupermarket: v})}/>
              <NumField label="배스킨라빈스" value={meta.distanceToMcDonalds} unit="m" placeholder="600" onChange={v => setMeta({...meta, distanceToMcDonalds: v})}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumField label="학원 밀집도 (500m)" value={meta.academyDensity} unit="개" placeholder="120" onChange={v => setMeta({...meta, academyDensity: v})}/>
              <NumField label="음식점·카페 (500m)" value={meta.restaurantDensity} unit="개" placeholder="472" onChange={v => setMeta({...meta, restaurantDensity: v})}/>
            </div>

            {/* Category panels */}
            {(apiCategories.academyCategories || apiCategories.restaurantCategories) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {apiCategories.academyCategories && Object.keys(apiCategories.academyCategories).length > 0 && (
                  <div className="bg-[#f0fdf4] rounded-xl p-4 border border-[#bbf7d0]">
                    <div className="text-[13px] font-bold text-toss-green mb-2">학원 카테고리 ({Object.values(apiCategories.academyCategories).reduce((a,b) => a+b, 0)}개)</div>
                    {Object.entries(apiCategories.academyCategories).sort(([,a],[,b]) => b-a).map(([cat,cnt]) => (
                      <div key={cat} className="flex justify-between text-[12px] py-0.5 px-1">
                        <span className="text-secondary truncate mr-2">{cat}</span>
                        <span className="font-bold text-toss-green shrink-0">{cnt}개</span>
                      </div>
                    ))}
                  </div>
                )}
                {apiCategories.restaurantCategories && Object.keys(apiCategories.restaurantCategories).length > 0 && (
                  <div className="bg-[#fffbeb] rounded-xl p-4 border border-[#fde68a]">
                    <div className="text-[13px] font-bold text-[#f59e0b] mb-2">음식점·카페 ({Object.values(apiCategories.restaurantCategories).reduce((a,b) => a+b, 0)}개)</div>
                    {Object.entries(apiCategories.restaurantCategories).sort(([,a],[,b]) => b-a).map(([cat,cnt]) => (
                      <div key={cat} className="flex justify-between text-[12px] py-0.5 px-1">
                        <span className="text-secondary truncate mr-2">{cat}</span>
                        <span className="font-bold text-[#f59e0b] shrink-0">{cnt}개</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Section 3: 현장 사진 ─── */}
          <ImageUploader 
            photos={photos}
            setPhotos={setPhotos}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            batchInputRef={batchInputRef}
            handleBatchFiles={handleBatchFiles}
            sortByCategory={sortByCategory}
            clearPhotos={() => {
              setPhotos([]);
              uploadedFileKeys.current.clear();
            }}
          />

          {/* ─── Floating Save Bar ─── */}
          <div className="fixed bottom-0 left-0 md:left-[240px] right-0 z-40 bg-surface/90 backdrop-blur-lg border-t border-border px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <span className="text-[13px] text-tertiary font-medium">
              {uploadProgress ? `📤 업로드 중... ${uploadProgress.done}/${uploadProgress.total}장` : `📸 ${photos.length}장 · ${meta.dong}`}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={handleDelete} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-[14px] bg-surface border border-[#f04452] text-toss-red hover:bg-[#fff1f2] disabled:opacity-60">
                <Trash2 size={16}/> 삭제
              </button>
              <button onClick={handleSave} disabled={saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-[14px] ${
                  saved ? 'bg-toss-green text-surface shadow-lg shadow-[#03c75a]/20' : 'bg-toss-blue hover:bg-[#2b72d6] text-surface shadow-lg shadow-[#00d29d]/20'
                } disabled:opacity-60`}>
                <Save size={16}/>
                {saving ? '저장 중...' : saved ? '저장 완료!' : '통합 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

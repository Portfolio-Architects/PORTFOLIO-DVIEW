'use client';

import React, { useState, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { createScoutingReport, updateScoutingReport } from '@/lib/services/reportService';
import { uploadImage } from '@/lib/services/storage.service';

import { auth } from '@/lib/firebaseConfig';
import { useRouter } from 'next/navigation';
import { getPremiumScoresAction } from '@/app/actions/scoring';

// Modular Sections
import { FormValues, ApiCategories } from './report-editor/types';
import { BasicInfoSection } from './report-editor/BasicInfoSection';
import { ThumbnailSection } from './report-editor/ThumbnailSection';
import { MetricsSection } from './report-editor/MetricsSection';
import { ImageUploadSection } from './report-editor/ImageUploadSection';

interface ReportEditorFormProps {
  initialData?: FormValues | null;
  reportId?: string;
  lockedMeta?: { dong: string; apartmentName: string };
  onCancel?: () => void;
  onSuccess?: () => void;
}

const ReportEditorForm = React.memo(function ReportEditorForm({ initialData = null, reportId, lockedMeta, onCancel, onSuccess }: ReportEditorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [apiCategories, setApiCategories] = useState<ApiCategories>({});
  const router = useRouter();

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(initialData?.thumbnailUrl || '');
  const [uploadProgress, setUploadProgress] = useState<{done: number, total: number} | null>(null);

  // Clean up thumbnailPreview object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const methods = useForm<FormValues>({
    defaultValues: initialData || {
      dong: lockedMeta?.dong || '',
      apartmentName: lockedMeta?.apartmentName || '',
      scoutingDate: new Date().toLocaleDateString('en-CA'),
      metrics: {
        brand: '', householdCount: '', far: '', bcr: '', parkingPerHousehold: '', yearBuilt: '',
        distanceToElementary: '', distanceToMiddle: '', distanceToHigh: '', distanceToSubway: '', distanceToIndeokwon: '', distanceToTram: '', distanceToStarbucks: '', distanceToMcDonalds: '', distanceToOliveYoung: '', distanceToDaiso: '', distanceToSupermarket: '', starbucksName: '', starbucksAddress: '', starbucksCoordinates: '', mcdonaldsName: '', mcdonaldsAddress: '', mcdonaldsCoordinates: '', oliveYoungName: '', oliveYoungAddress: '', oliveYoungCoordinates: '', daisoName: '', daisoAddress: '', daisoCoordinates: '', supermarketName: '', supermarketAddress: '', supermarketCoordinates: '', academyDensity: '', restaurantDensity: ''
      },
      images: [],
      isPremium: true
    }
  });

  const { handleSubmit, reset, getValues, setValue } = methods;

  useEffect(() => {
    try {
      const key = `draft_report_${reportId || 'new'}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft._savedAt) return;
      const savedTime = new Date(draft._savedAt).toLocaleString('ko-KR');
      if (confirm(`💾 ${savedTime}에 임시 저장된 데이터가 있습니다.\n불러오시겠습니까?`)) {
        const { _savedAt, images, ...rest } = draft;
        reset({ ...rest, images: initialData?.images || [] });
      } else {
        localStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  }, [reportId, initialData, reset]);

  useEffect(() => {
    let active = true;
    if (initialData) {
      reset(initialData);
      const m = initialData.metrics as Record<string, unknown>;
      if (m) {
        setApiCategories(prev => {
          if (!active) return prev;
          return {
            ...prev,
            ...(m.academyCategories ? { academyCategories: m.academyCategories as Record<string, number> } : {}),
            ...(m.restaurantCategories ? { restaurantCategories: m.restaurantCategories as Record<string, number> } : {}),
            ...(m.restaurantDensity ? { restaurantDensity: m.restaurantDensity as number } : {}),
            ...(m.nearestSchoolNames ? { nearestSchoolNames: m.nearestSchoolNames as Record<string, string> } : {}),
            ...(m.nearestStationName ? { nearestStationName: m.nearestStationName as string } : {}),
            ...(m.nearestIndeokwonStationName ? { nearestIndeokwonStationName: m.nearestIndeokwonStationName as string } : {}),
            ...(m.nearestTramStationName ? { nearestTramStationName: m.nearestTramStationName as string } : {}),
          };
        });
      }

      const hasCategories = m?.academyCategories && Object.keys(m.academyCategories).length > 0;
      if (!hasCategories && initialData.apartmentName) {
        (async () => {
          try {
            const res = await fetch(`/api/location-scores?apartment=${encodeURIComponent(initialData.apartmentName)}`);
            if (!active || !res.ok) return;
            const loc = await res.json();
            if (!active) return;
            if (loc.distanceToElementary != null) setValue('metrics.distanceToElementary', String(loc.distanceToElementary));
            if (loc.distanceToMiddle != null) setValue('metrics.distanceToMiddle', String(loc.distanceToMiddle));
            if (loc.distanceToHigh != null) setValue('metrics.distanceToHigh', String(loc.distanceToHigh));
            if (loc.distanceToSubway != null) setValue('metrics.distanceToSubway', String(loc.distanceToSubway));
            if (loc.distanceToIndeokwon != null) setValue('metrics.distanceToIndeokwon', String(loc.distanceToIndeokwon));
            if (loc.distanceToTram != null) setValue('metrics.distanceToTram', String(loc.distanceToTram));
            if (loc.academyDensity != null) setValue('metrics.academyDensity', String(loc.academyDensity));
            if (loc.restaurantDensity != null) setValue('metrics.restaurantDensity', String(loc.restaurantDensity));
            const bld = loc.buildingInfo;
            if (bld) {
              if (bld.brand) setValue('metrics.brand', bld.brand);
              if (bld.householdCount) setValue('metrics.householdCount', String(bld.householdCount));
              if (bld.yearBuilt) setValue('metrics.yearBuilt', String(bld.yearBuilt));
              if (bld.far) setValue('metrics.far', String(bld.far));
              if (bld.bcr) setValue('metrics.bcr', String(bld.bcr));
              if (bld.parkingPerHousehold) setValue('metrics.parkingPerHousehold', String(bld.parkingPerHousehold));
            }
            setApiCategories({
              academyCategories: loc.academyCategories || {},
              restaurantDensity: loc.restaurantDensity,
              restaurantCategories: loc.restaurantCategories || {},
              nearestSchoolNames: {
                elementary: loc.nearestSchools?.elementary?.name,
                middle: loc.nearestSchools?.middle?.name,
                high: loc.nearestSchools?.high?.name,
              },
              nearestStationName: loc.nearestStation?.name,
              nearestIndeokwonStationName: loc.nearestIndeokwon?.name,
              nearestTramStationName: loc.nearestTram?.name,
            });
          } catch { /* silent fail */ }
        })();
      }
    }
    return () => {
      active = false;
    };
  }, [initialData, reset, setValue]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (!auth.currentUser) throw new Error("로그인이 필요합니다.");

      const uploadedImages: { url: string; caption: string; locationTag: string; isPremium: boolean; capturedAt?: string }[] = [];
      const imagesToProcess = data.images.filter((img) => img.file || img.url);
      const totalImages = imagesToProcess.length;
      let uploadedCount = 0;
      setUploadProgress({ done: 0, total: totalImages });

      const BATCH_SIZE = 3;
      for (let i = 0; i < imagesToProcess.length; i += BATCH_SIZE) {
        const batch = imagesToProcess.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (img) => {
            let finalUrl = img.url;
            if (img.file) finalUrl = await uploadImage(img.file, 'report_images');
            return finalUrl ? { url: finalUrl, caption: img.caption || '', locationTag: img.locationTag || '', isPremium: img.isPremium, capturedAt: img.capturedAt } : null;
          })
        );
        results.forEach(r => { if (r) uploadedImages.push(r); });
        uploadedCount += batch.length;
        setUploadProgress({ done: uploadedCount, total: totalImages });
      }

      if (uploadedImages.length === 0) throw new Error("최소 1개 이상의 현장 사진을 업로드해주세요.");

      const metricsPayload = {
        brand: data.metrics.brand,
        householdCount: Number(data.metrics.householdCount),
        far: Number(data.metrics.far),
        bcr: Number(data.metrics.bcr),
        parkingPerHousehold: Number(data.metrics.parkingPerHousehold),
        yearBuilt: Number(data.metrics.yearBuilt),
        distanceToElementary: Number(data.metrics.distanceToElementary),
        distanceToMiddle: Number(data.metrics.distanceToMiddle),
        distanceToHigh: Number(data.metrics.distanceToHigh),
        distanceToSubway: Number(data.metrics.distanceToSubway),
        distanceToIndeokwon: Number(data.metrics.distanceToIndeokwon),
        distanceToTram: Number(data.metrics.distanceToTram),
        distanceToStarbucks: Number(data.metrics.distanceToStarbucks),
        distanceToMcDonalds: Number(data.metrics.distanceToMcDonalds),
        distanceToOliveYoung: Number(data.metrics.distanceToOliveYoung),
        distanceToDaiso: Number(data.metrics.distanceToDaiso),
        distanceToSupermarket: Number(data.metrics.distanceToSupermarket),
        starbucksName: data.metrics.starbucksName || undefined,
        starbucksAddress: data.metrics.starbucksAddress || undefined,
        starbucksCoordinates: data.metrics.starbucksCoordinates || undefined,
        academyDensity: Number(data.metrics.academyDensity),
        ...(apiCategories.academyCategories ? { academyCategories: apiCategories.academyCategories } : {}),
        ...(Number(data.metrics.restaurantDensity) || apiCategories.restaurantDensity ? { restaurantDensity: Number(data.metrics.restaurantDensity) || apiCategories.restaurantDensity } : {}),
        ...(apiCategories.restaurantCategories ? { restaurantCategories: apiCategories.restaurantCategories } : {}),
        ...(apiCategories.nearestSchoolNames ? { nearestSchoolNames: apiCategories.nearestSchoolNames } : {}),
        ...(apiCategories.nearestStationName ? { nearestStationName: apiCategories.nearestStationName } : {}),
        ...(apiCategories.nearestIndeokwonStationName ? { nearestIndeokwonStationName: apiCategories.nearestIndeokwonStationName } : {}),
        ...(apiCategories.nearestTramStationName ? { nearestTramStationName: apiCategories.nearestTramStationName } : {}),
      };

      const safeMetricsPayload = JSON.parse(JSON.stringify(metricsPayload));
      const premiumScores = await getPremiumScoresAction(safeMetricsPayload);

      let finalThumbnailUrl = thumbnailPreview || '';
      if (thumbnailFile) {
        finalThumbnailUrl = await uploadImage(thumbnailFile, 'thumbnails');
      }

      const reportData = {
        dong: data.dong,
        apartmentName: data.apartmentName,
        scoutingDate: data.scoutingDate,
        thumbnailUrl: finalThumbnailUrl || uploadedImages[0]?.url || '',
        images: uploadedImages,
        metrics: safeMetricsPayload,
        premiumScores,
        isPremium: data.isPremium,
        premiumContent: data.premiumContent || '',
        authorUid: auth.currentUser.uid
      };

      if (reportId) {
        await updateScoutingReport(reportId, reportData);
        alert("데이터가 성공적으로 수정되었습니다!");
      } else {
        await createScoutingReport(reportData);
        alert("데이터가 성공적으로 발행 및 저장되었습니다!");
      }
      
      if (onSuccess) {
        onSuccess();
      } else if (onCancel) {
        onCancel();
        window.location.reload(); 
      } else {
        router.push('/admin'); 
      }
    } catch (error: unknown) {
      console.error(error);
      alert(`오류가 발생했습니다: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8">
        
        <BasicInfoSection lockedMeta={lockedMeta} />
        
        <ThumbnailSection 
          thumbnailPreview={thumbnailPreview} 
          setThumbnailPreview={setThumbnailPreview} 
          setThumbnailFile={setThumbnailFile} 
        />
        
        <MetricsSection 
          isCalculating={isCalculating} 
          setIsCalculating={setIsCalculating} 
          apiCategories={apiCategories} 
          setApiCategories={setApiCategories} 
        />

        <ImageUploadSection />

        {/* 4. Publishing & Save */}
        <div className="fixed bottom-0 left-0 right-0 md:left-[240px] bg-surface/90 backdrop-blur-md p-4 border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-end gap-3 z-50">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-6 py-3 font-bold text-tertiary bg-surface border border-border hover:bg-body rounded-xl transition-colors">
              취소
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              try {
                const data = getValues();
                const safeData = {
                  ...data,
                  images: (data.images || []).map((img) => ({
                    url: img.url || '',
                    previewUrl: img.previewUrl || '',
                    caption: img.caption || '',
                    locationTag: img.locationTag || '',
                  })),
                  _savedAt: new Date().toISOString(),
                };
                localStorage.setItem(`draft_report_${reportId || 'new'}`, JSON.stringify(safeData));
                alert('✅ 임시 저장되었습니다!');
              } catch (err) {
                console.error('Draft save error:', err);
                alert('임시 저장에 실패했습니다.');
              }
            }}
            className="px-6 py-3 font-bold text-secondary bg-body hover:bg-[#e5e8eb] rounded-xl transition-colors"
          >
            임시 저장
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-8 py-3 font-bold text-surface bg-toss-blue hover:bg-[#2b72d6] active:bg-[#00b386] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[180px] justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {uploadProgress ? (
                  <span className="text-[13px]">{uploadProgress.done}/{uploadProgress.total}장 업로드 중...</span>
                ) : (
                  <span className="text-[13px]">저장 중...</span>
                )}
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                {reportId ? '수정 완료하기' : '최종 발행하기'}
              </>
            )}
          </button>
        </div>

      </form>
    </FormProvider>
  );
});

ReportEditorForm.displayName = 'ReportEditorForm';
export default ReportEditorForm;

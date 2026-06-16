'use client';

import React, { useEffect, useState, useTransition } from 'react';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import ReportEditorForm from '@/components/admin/ReportEditorForm';
import { FormValues } from '@/components/admin/report-editor/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { ScoutingReport } from '@/lib/types/scoutingReport';
import { MapPin } from 'lucide-react';

const EditReportPage = React.memo(function EditReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [isPending, startTransition] = useTransition();

  const fetchReport = async () => {
    if (!id) throw new Error('No ID');
    const docRef = doc(db, 'scoutingReports', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const report = docSnap.data() as ScoutingReport;
      const formValues: FormValues = {
        dong: report.dong,
        apartmentName: report.apartmentName,
        metrics: report.metrics as unknown as FormValues['metrics'],
        premiumContent: report.premiumContent || '',
        images: (report.images || []).map(img => ({ ...img, locationTag: img.locationTag || '', isPremium: img.isPremium ?? false })),
        isPremium: report.isPremium ?? true,
        thumbnailUrl: report.thumbnailUrl || '',
        scoutingDate: '',
      };
      return formValues;
    } else {
      throw new Error('No such document!');
    }
  };

  const { data: initialData, error, isLoading } = useSWR(id ? ['scoutingReport', id] : null, fetchReport, {
    revalidateOnFocus: false,
    dedupingInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center p-16">
        <div className="w-10 h-10 border-4 border-toss-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-tertiary text-[15px] font-bold">임장기 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center p-16 text-primary">
        데이터를 불러오지 못했습니다. 목록으로 돌아가주세요.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8 border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-2 text-tertiary">
          <MapPin size={16} />
          <span className="text-[14px] font-bold">{initialData.dong}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
          임장기 수정: {initialData.apartmentName}
        </h1>
        <p className="mt-2 text-secondary text-[15px]">
          기존에 작성된 프리미엄 임장기 데이터를 수정합니다. 지표 수정 시 프리미엄 점수는 서버에서 자동으로 재계산됩니다.
        </p>
      </div>

      <div className="bg-surface rounded-3xl border border-border shadow-sm p-6 md:p-10 mb-20 overflow-visible relative z-10">
        {/* Pass initialData and reportId to the Form to activate Edit Mode */}
        <ReportEditorForm initialData={initialData} reportId={id} />
      </div>
    </div>
  );
});

EditReportPage.displayName = 'EditReportPage';

export default EditReportPage;

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, MapPin, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useDashboardData, dashboardFacade, FieldReportData, CommentData } from '@/lib/DashboardFacade';
import dynamic from 'next/dynamic';
import { getZoneById, dongToZoneId } from '@/lib/zones';
import { safeReload } from '@/lib/utils/safeReload';
import { logger } from '@/lib/services/logger';
import { useAuth } from '@/hooks/useAuth';
import ApartmentModalSkeleton from '@/components/ui/ApartmentModalSkeleton';

const FieldReportModal = dynamic(() => import('@/components/ApartmentModal').catch(err => {
  logger.warn('zone.[id].FieldReportModal', 'FieldReportModal Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('FieldReportModal');
  return { default: () => null };
}), { ssr: false, loading: () => <ApartmentModalSkeleton /> });

const ZoneDetailClient = React.memo(function ZoneDetailClient() {
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preload heavy chunks for ApartmentModal in the background during idle time
  useEffect(() => {
    let isMounted = true;
    let idleId: number | null = null;

    const preloadHeavyChunks = () => {
      if (!isMounted) return;
      import('@/components/ApartmentModal').catch(() => {});
      import('@/components/CommentSection').catch(() => {});
      import('@/components/apartment-modal/ViralPaywallGate').catch(() => {});
      import('@/components/apartment-modal/JeonseSafetyReport').catch(() => {});
      import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
      import('@/components/apartment-modal/PhotoUploadModal').catch(() => {});
      import('@/components/apartment-modal/BuyOrWaitVote').catch(() => {});
      import('@/components/apartment-modal/EducationAnalysisSection').catch(() => {});
      import('@/components/apartment-modal/InfraAnalysisSection').catch(() => {});
      import('@/components/apartment-modal/ScoutingReportDetailSection').catch(() => {});
      import('@/components/consumer/AdvancedValuationMetrics').catch(() => {});
      import('@/components/consumer/AnchorTenantCard').catch(() => {});
    };

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      if (window.requestIdleCallback) {
        idleId = window.requestIdleCallback(preloadHeavyChunks, { timeout: 3000 });
      } else {
        if (preloadTimeoutRef.current) {
          clearTimeout(preloadTimeoutRef.current);
          preloadTimeoutRef.current = null;
        }
        preloadTimeoutRef.current = setTimeout(() => {
          preloadHeavyChunks();
          preloadTimeoutRef.current = null;
        }, 2000);
      }
    }

    return () => {
      isMounted = false;
      if (idleId !== null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);
  const params = useParams();
  const router = useRouter();
  const zoneId = params.id as string;
  const zone = getZoneById(zoneId);

  const { fieldReports } = useDashboardData();
  const [selectedReport, setSelectedReport] = useState<FieldReportData | null>(null);
  const [fullReportData, setFullReportData] = useState<FieldReportData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const { user } = useAuth();

  // Comments state for modal
  const [commentsData, setCommentsData] = useState<Record<string, CommentData[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const handleSelectReport = (report: FieldReportData) => {
    setSelectedReport(report);
    setIsLoadingDetail(true);
    setFullReportData(null);
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
    setFullReportData(null);
    setIsLoadingDetail(false);
  };

  // Fetch full report detail data when modal opens (lazy loading)
  useEffect(() => {
    if (!selectedReport) return;
    
    let unmounted = false;
    dashboardFacade.getFullReport(selectedReport.id).then((data) => {
      if (unmounted) return;
      setFullReportData(data);
      setIsLoadingDetail(false);
    }).catch(() => {
      if (unmounted) return;
      setIsLoadingDetail(false);
    });

    return () => { unmounted = true; };
  }, [selectedReport]);

  // Listen to comments when a report is selected
  useEffect(() => {
    if (selectedReport && !commentsData[selectedReport.id]) {
      let unmounted = false;
      const unsubscribe = dashboardFacade.listenToComments(selectedReport.id, (comments) => {
        if (unmounted) return;
        setCommentsData(prev => ({ ...prev, [selectedReport.id]: comments }));
      });
      return () => {
        unmounted = true;
        unsubscribe();
      };
    }
  }, [selectedReport]);

  const handleSubmitComment = async (reportId: string) => {
    if (!user) return;
    const text = commentInput[reportId];
    if (!text?.trim()) return;
    const apartmentName = fullReportData?.apartmentName || selectedReport?.apartmentName || '';
    try {
      await dashboardFacade.addFieldReportComment(reportId, text, user.uid, apartmentName);
      setCommentInput(prev => ({ ...prev, [reportId]: '' }));
      
      // Trigger Google Indexing API for the apartment detail page
      if (apartmentName) {
        fetch('/api/indexing/apartment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apartmentName }),
        }).catch(err => {
          logger.warn('zone.[id].handleSubmitComment', 'Failed to trigger real-time Google Indexing API', { apartmentName }, err);
        });
      }
    } catch (error) {
      logger.error('zone.[id].handleSubmitComment', 'Comment submission failed', undefined, error);
      alert("댓글 저장에 실패했습니다. (" + (error instanceof Error ? error.message : String(error)) + ")");
    }
  };

  // Filter reports that belong to this zone
  const zoneReports = useMemo(() => {
    return fieldReports?.filter(report => dongToZoneId(report.dong) === zoneId) || [];
  }, [fieldReports, zoneId]);

  if (!zone) {
    return (
      <div className="min-h-screen bg-body flex items-center justify-center">
        <div className="text-center">
          <p className="text-tertiary text-[16px] mb-4">존재하지 않는 권역입니다.</p>
          <button onClick={() => router.push('/')} className="text-toss-blue font-bold">← 메인으로</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-body font-sans">
      {/* Header */}
      <header className="bg-surface/90 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 md:px-12 h-14 sm:h-16 flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors font-bold text-[14px]"
          >
            <ArrowLeft size={18} />
            전체 권역
          </button>
          <div className="w-px h-5 bg-[#e5e8eb]" />
          <h1 className="text-[16px] font-extrabold text-primary truncate">{zone.name}</h1>
        </div>
      </header>

      {/* Zone Hero Banner */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 md:px-12 pt-6 sm:pt-8 pb-4">
        <div className="bg-surface rounded-3xl border border-border p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[12px] font-bold px-3 py-1 rounded-lg text-surface" style={{ backgroundColor: zone.color }}>{zone.dongLabel}</span>
                <span className="bg-body text-secondary text-[13px] font-bold px-3 py-1 rounded-lg">{zoneReports.length}개 단지</span>
              </div>
              <h2 className="text-[28px] md:text-[32px] font-extrabold text-primary tracking-tight mb-2">{zone.name}</h2>
              <p className="text-[15px] text-secondary leading-relaxed">{zone.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Apartment Grid */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 md:px-12 py-6">
        {zoneReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {zoneReports.map((report) => {
              const coverImage = (report.images && report.images.length > 0) ? report.images[0].url : 
                                  report.thumbnail || 
                                  report.sections?.infra?.gateImg || 
                                  report.sections?.infra?.landscapeImg || 
                                  report.sections?.ecosystem?.communityImg;
              const rating = report.premiumScores?.totalPremiumScore ? Math.max(1, Math.round(report.premiumScores.totalPremiumScore / 20)) : 5;

              return (
                <button
                  type="button"
                  key={report.id}
                  onClick={() => handleSelectReport(report)}
                  className="w-full text-left bg-surface border shadow-sm border-border rounded-3xl overflow-hidden hover:border-toss-blue/50 hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col group focus:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue"
                  aria-label={`리포트: ${report.apartmentName}, 작성자: ${report.author}, 평점: ${rating}점`}
                >
                  {coverImage ? (
                    <div className="w-full h-[200px] shrink-0 bg-body relative overflow-hidden">
                      <Image src={coverImage} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="w-full h-[200px] shrink-0 bg-body flex items-center justify-center relative overflow-hidden">
                       <Camera size={32} className="text-toss-gray" />
                     </div>
                  )}
                  
                  <div className="p-5 flex flex-col justify-between flex-1 w-full">
                     <div>
                       <div className="flex justify-between items-start mb-2">
                         <h3 className="text-[18px] font-bold text-primary tracking-tight leading-snug line-clamp-1" title={report.apartmentName}>{report.apartmentName}</h3>
                         <div className="flex items-center text-[#ffc107] text-[12px] font-bold tracking-widest bg-black/5 dark:bg-surface/5 px-2 py-0.5 rounded-full shrink-0 ml-2">
                           평점 {rating}점
                         </div>
                       </div>
                       <p className="text-[14px] text-secondary line-clamp-2 leading-relaxed h-[42px] mb-4">
                         {report.premiumContent || report.sections?.assessment?.alphaDriver || '상세 리뷰가 접수되었습니다.'}
                       </p>
                     </div>
                     
                     <div className="flex justify-between items-center pt-4 border-t border-body w-full">
                        <span className="text-[12px] font-bold text-tertiary">{report.author}</span>
                        <div className="flex items-center gap-3 text-tertiary">
                           <span className="text-[12px] font-bold">좋아요 {report.likes || 0}</span>
                           <span className="text-[12px] font-bold">댓글 {report.commentCount || 0}</span>
                        </div>
                     </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MapPin size={48} className="text-toss-gray mb-4" />
            <h3 className="text-[18px] font-bold text-primary mb-2">아직 등록된 리뷰가 없습니다</h3>
            <p className="text-[14px] text-tertiary">이 권역의 첫 임장기를 작성해보세요!</p>
          </div>
        )}
      </div>


      {/* Report Detail Modal */}
      {selectedReport && (
        <FieldReportModal 
          report={fullReportData || selectedReport} 
          onClose={handleCloseModal} 
          comments={commentsData[selectedReport.id] || []}
          commentInput={commentInput[selectedReport.id] || ''}
          onCommentChange={(text) => setCommentInput(prev => ({ ...prev, [selectedReport.id]: text }))}
          onSubmitComment={() => handleSubmitComment(selectedReport.id)}
          user={user}
          transactions={[]}
          typeMap={{}}
          isLoadingDetail={isLoadingDetail}
        />
      )}
    </div>
  );
});

ZoneDetailClient.displayName = 'ZoneDetailClient';

export default ZoneDetailClient;

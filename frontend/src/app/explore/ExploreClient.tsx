'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import dynamic from 'next/dynamic';

import { MessageSquare } from 'lucide-react';

import LoginGateModal from '@/components/ui/LoginGateModal';
import PullToRefresh from '@/components/pwa/PullToRefresh';

import { useAuth } from '@/hooks/useAuth';
import { useDashboardMeta, type DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import { useFavorites } from '@/hooks/useFavorites';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useComments } from '@/hooks/useComments';
import { usePWA } from '@/components/pwa/PWAProvider';
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import { isSameApartment, normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import * as UserRepo from '@/lib/repositories/user.repository';
import { isValidNickname } from '@/lib/services/nickname.service';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const ModalSkeleton = () => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-pulse p-4">
    <div className="bg-surface w-full max-w-[1200px] h-[90vh] rounded-3xl shadow-2xl border border-border/80 p-6 flex flex-col gap-4">
      <div className="w-1/3 h-10 bg-body rounded-xl animate-pulse" />
      <div className="w-1/4 h-5 bg-body rounded-lg animate-pulse" />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="h-full bg-body rounded-2xl animate-pulse" />
        <div className="h-full bg-body rounded-2xl animate-pulse" />
      </div>
    </div>
  </div>
);

// Heavy components dynamic load
const TossApartmentExploreClient = dynamic(() => import('@/components/TossApartmentExploreClient').catch(err => {
  console.warn('TossApartmentExploreClient Chunk Load failure, page reload initiated', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const FieldReportModal = dynamic(() => import('@/components/ApartmentModal').catch(err => {
  console.warn('FieldReportModal Chunk Load failure, page reload initiated', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false, loading: () => <ModalSkeleton /> });

const AdInquiryModal = dynamic(() => import('@/components/AdInquiryModal').catch(err => {
  console.warn('AdInquiryModal Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const B2BConsumerAdModal = dynamic(() => import('@/components/consumer/B2BConsumerAdModal').catch(err => {
  console.warn('B2BConsumerAdModal Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const AptCompareModal = dynamic(() => import('@/components/consumer/AptCompareModal').catch(err => {
  console.warn('AptCompareModal Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const JeonseSafetyCalculator = dynamic(() => import('@/components/consumer/JeonseSafetyCalculator').catch(err => {
  console.warn('JeonseSafetyCalculator Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const MortgageCalculator = dynamic(() => import('@/components/consumer/MortgageCalculator').catch(err => {
  console.warn('MortgageCalculator Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const PropertyTaxCalculator = dynamic(() => import('@/components/consumer/PropertyTaxCalculator').catch(err => {
  console.warn('PropertyTaxCalculator Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const SellTimingCalculator = dynamic(() => import('@/components/consumer/SellTimingCalculator').catch(err => {
  console.warn('SellTimingCalculator Chunk Load failure', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}), { ssr: false });

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ExploreClient({ initialDashboardData }: { initialDashboardData?: DashboardInitialDataLocal }) {
  const fieldReports = initialDashboardData?.fieldReports || [];

  const { user, userProfile, handleLogin } = useAuth();
  const { sheetApartments, typeMap, nameMapping, publicRentalSet } = useDashboardMeta(initialDashboardData);
  const { userFavorites, favoriteCounts, handleToggleFavorite } = useFavorites(user, initialDashboardData?.favoriteCounts);

  const [mounted, setMounted] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isConsumerAdModalOpen, setIsConsumerAdModalOpen] = useState(false);
  const [consumerAdInfo, setConsumerAdInfo] = useState<{ adType: 'insurance' | 'interior' | 'academy' | 'cleaning'; adTitle: string } | null>(null);

  const handleOpenConsumerAdModal = useCallback((adType: 'insurance' | 'interior' | 'academy' | 'cleaning', adTitle: string) => {
    setConsumerAdInfo({ adType, adTitle });
    setIsConsumerAdModalOpen(true);
  }, []);

  const [showAdBlockBanner, setShowAdBlockBanner] = useState(false);
  const { isAdBlockActive } = useAdBlockDetector();

  useEffect(() => {
    if (!isAdBlockActive || !mounted) return;
    const dismissedTime = localStorage.getItem('dview-adblock-banner-dismissed');
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (now - parsedTime < sevenDays) return;
    }
    setShowAdBlockBanner(true);
  }, [isAdBlockActive, mounted]);

  const handleAdBlockBannerClose = () => {
    localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    setShowAdBlockBanner(false);
  };

  const [newNickname, setNewNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isSubmittingNickname, setIsSubmittingNickname] = useState(false);

  const showNicknameModal = mounted && !!user && !!userProfile && userProfile.hasSetNickname === false && !dashboardFacade.isAdmin(user.email);

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = newNickname.trim();
    if (!isValidNickname(trimmed)) {
      setNicknameError('닉네임은 공백 제외 한글, 영문, 숫자, _로만 2자에서 10자여야 합니다.');
      return;
    }
    setIsSubmittingNickname(true);
    setNicknameError('');
    try {
      await UserRepo.updateNickname(user.uid, trimmed);
      window.location.reload();
    } catch (error) {
      console.error('Failed to set nickname:', error);
      setNicknameError('닉네임 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmittingNickname(false);
    }
  };

  const [selectedReport, setSelectedReport] = useState<FieldReportData | null>(null);

  // Modals status
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareInitialApt, setCompareInitialApt] = useState<string | undefined>(undefined);

  const [isJeonseSafetyOpen, setIsJeonseSafetyOpen] = useState(false);
  const [jeonseSafetyInitialApt, setJeonseSafetyInitialApt] = useState<string | undefined>(undefined);

  const [isMortgageOpen, setIsMortgageOpen] = useState(false);
  const [mortgageInitialApt, setMortgageInitialApt] = useState<string | undefined>(undefined);

  const [isTaxCalcOpen, setIsTaxCalcOpen] = useState(false);
  const [taxCalcInitialApt, setTaxCalcInitialApt] = useState<string | undefined>(undefined);

  const [isSellTimingOpen, setIsSellTimingOpen] = useState(false);
  const [sellTimingInitialApt, setSellTimingInitialApt] = useState<string | undefined>(undefined);

  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const [loginGateMessage, setLoginGateMessage] = useState('');

  const handleRequestLogin = useCallback((message: string) => {
    setLoginGateMessage(message);
    setIsLoginGateOpen(true);
  }, []);

  const { txSummary = {} } = useTxData(
    initialDashboardData?.macroTrend,
    initialDashboardData?.txSummary,
    initialDashboardData?.recent7DaysVolume
  );
  const { locationScores = {} } = useLocationScores();

  const getLocScore = (aptName: string) => {
    if (!aptName || !locationScores) return {};
    const matchKey = findTxKey(aptName, locationScores, nameMapping);
    return matchKey ? locationScores[matchKey] : {};
  };

  const { txSummaryData, fullReportData, modalTransactions, isLoadingDetail, isTxLoading, resolvedReport, aptTxSummary, loadAllTransactions } = useApartmentDetails(
    selectedReport, sheetApartments, nameMapping, user, txSummary, locationScores
  );

  const { commentsData, commentInput, setCommentInput, handleSubmitComment } = useComments(
    selectedReport, fullReportData, user, handleLogin
  );

  const { triggerCustomA2HSModal } = usePWA();

  const fieldReportsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!fieldReports || !sheetApartments) return map;
    const allApts = Object.values(sheetApartments).flat();
    allApts.forEach(apt => {
      const report = fieldReports.find(r => isSameApartment(r.apartmentName, apt.name, nameMapping));
      if (report) map.set(apt.name, report);
    });
    return map;
  }, [fieldReports, sheetApartments, nameMapping]);

  useEffect(() => {
    setMounted(true);

    const preloadHeavyChunks = () => {
      import('@/components/TossApartmentExploreClient').catch(() => {});
      import('@/components/ApartmentModal').catch(() => {});
      import('@/components/consumer/AptCompareModal').catch(() => {});
      import('@/components/consumer/JeonseSafetyCalculator').catch(() => {});
      import('@/components/consumer/MortgageCalculator').catch(() => {});
      import('@/components/consumer/PropertyTaxCalculator').catch(() => {});
      import('@/components/consumer/SellTimingCalculator').catch(() => {});
    };

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(preloadHeavyChunks, { timeout: 3000 });
      } else {
        setTimeout(preloadHeavyChunks, 2000);
      }
    }
  }, []);

  // Handle #apt= hash to open modal automatically
  useEffect(() => {
    if (!mounted || !sheetApartments) return;

    const checkHashForApt = () => {
      const match = window.location.hash.match(/[#&]apt=([^&]+)/);
      if (match) {
        const aptName = decodeURIComponent(match[1]);
        const allApts = Object.values(sheetApartments).flat();
        const targetApt = allApts.find(a => isSameApartment(a.name, aptName, nameMapping));

        if (targetApt) {
          const report = fieldReportsMap.get(targetApt.name);
          if (report) {
            setSelectedReport(report);
          } else {
            setSelectedReport({
              id: `stub-${normalizeAptName(targetApt.name)}`,
              apartmentName: targetApt.name,
              dong: targetApt.dong,
              author: '',
              likes: 0,
              commentCount: 0,
              createdAt: null,
              metrics: { ...targetApt, ...(getLocScore(targetApt.name) || {}) } as any,
            });
          }
          setMobileModalOpen(true);
        }
      }
    };

    checkHashForApt();
    window.addEventListener('hashchange', checkHashForApt);
    return () => window.removeEventListener('hashchange', checkHashForApt);
  }, [mounted, sheetApartments, fieldReportsMap, nameMapping]);

  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (!window.location.hash && (window.location.pathname === '/explore')) {
        setSelectedReport(null);
        setMobileModalOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAptClick = useCallback((apt: { name: string; dong: string }) => {
    const report = fieldReportsMap.get(apt.name);
    if (report) {
      setSelectedReport(report);
    } else {
      setSelectedReport({
        id: `stub-${normalizeAptName(apt.name)}`,
        apartmentName: apt.name,
        dong: apt.dong,
        author: '',
        likes: 0,
        commentCount: 0,
        createdAt: null,
        metrics: { ...apt, ...(getLocScore(apt.name) || {}) } as any,
      });
    }

    if (typeof window !== 'undefined') {
      try {
        const history = JSON.parse(localStorage.getItem('dview_viewed_apts') || '[]');
        const updated = [apt.name, ...history.filter((h: string) => h !== apt.name)].slice(0, 10);
        localStorage.setItem('dview_viewed_apts', JSON.stringify(updated));
        window.dispatchEvent(new Event('dview_viewed_apts_changed'));
      } catch (e) {
        console.warn('LocalStorage write error:', e);
      }
    }

    History.prototype.pushState.call(window.history, null, '', window.location.pathname + window.location.search + `#apt=${encodeURIComponent(apt.name)}`);
    setMobileModalOpen(true);
  }, [fieldReportsMap]);

  const handleAptClickByName = useCallback((name: string) => {
    const allApts = Object.values(sheetApartments).flat();
    const targetApt = allApts.find(a => isSameApartment(a.name, name, nameMapping));
    if (targetApt) {
      handleAptClick(targetApt);
    } else {
      handleAptClick({ name, dong: '' });
    }
  }, [sheetApartments, nameMapping, handleAptClick]);

  const handleAptToggleFavorite = useCallback((aptName: string) => {
    handleToggleFavorite(aptName, () => handleRequestLogin('관심 단지를 등록하여 실거래가 변동 알림을 받아보세요.'));
    if (user && !userFavorites.has(aptName)) {
      triggerCustomA2HSModal();
    }
  }, [handleToggleFavorite, handleRequestLogin, user, userFavorites, triggerCustomA2HSModal]);

  return (
    <>
      <PullToRefresh
        scrollContainerId="apartment-list-scroll"
        disabled={mobileModalOpen || !!selectedReport}
      >
        <div className="flex flex-col min-h-[100dvh] bg-surface relative pb-[env(safe-area-inset-bottom)]">
          <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden animate-in fade-in duration-500">
            <section className="w-full bg-transparent">
              <TossApartmentExploreClient
                sheetApartments={sheetApartments}
                txSummaryData={txSummaryData}
                nameMapping={nameMapping || {}}
                fieldReportsMap={fieldReportsMap}
                publicRentalSet={publicRentalSet}
                userFavorites={userFavorites}
                favoriteCounts={favoriteCounts}
                typeMap={typeMap}
                handleSelectApt={handleAptClickByName}
                onToggleFavorite={handleAptToggleFavorite}
                onOpenCompare={() => {
                  setCompareInitialApt(undefined);
                  setIsCompareOpen(true);
                }}
                onOpenJeonseSafety={(aptName) => {
                  setJeonseSafetyInitialApt(aptName);
                  setIsJeonseSafetyOpen(true);
                }}
                onOpenMortgage={(aptName) => {
                  setMortgageInitialApt(aptName);
                  setIsMortgageOpen(true);
                }}
              />
            </section>

            {/* Apartment Detail Modal */}
            {resolvedReport && mobileModalOpen && (
              <FieldReportModal
                report={resolvedReport}
                onClose={() => {
                  setSelectedReport(null);
                  setMobileModalOpen(false);
                  window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }}
                comments={commentsData[resolvedReport.id] || []}
                commentInput={commentInput[resolvedReport.id] || ''}
                onCommentChange={(text) => setCommentInput(prev => ({ ...prev, [resolvedReport.id]: text }))}
                onSubmitComment={() => handleSubmitComment(resolvedReport.id)}
                user={user}
                transactions={modalTransactions}
                isTxLoading={isTxLoading}
                typeMap={typeMap}
                inline={false}
                isLoadingDetail={isLoadingDetail}
                loadAllTransactions={loadAllTransactions}
                isAdmin={dashboardFacade.isAdmin(user?.email)}
                txSummary={aptTxSummary}
                onOpenAdModal={() => setIsAdModalOpen(true)}
                onOpenConsumerAdModal={handleOpenConsumerAdModal}
                onRequestLogin={handleRequestLogin}
                onOpenCompare={(aptName) => {
                  setCompareInitialApt(aptName);
                  setIsCompareOpen(true);
                }}
                onOpenJeonseSafety={(aptName) => {
                  setJeonseSafetyInitialApt(aptName);
                  setIsJeonseSafetyOpen(true);
                }}
                onOpenMortgage={(aptName) => {
                  setMortgageInitialApt(aptName);
                  setIsMortgageOpen(true);
                }}
                onOpenTaxCalculator={(aptName) => {
                  setTaxCalcInitialApt(aptName);
                  setIsTaxCalcOpen(true);
                }}
                onOpenSellTimingCalculator={(aptName) => {
                  setSellTimingInitialApt(aptName);
                  setIsSellTimingOpen(true);
                }}
              />
            )}
          </main>
        </div>
      </PullToRefresh>

      {!mobileModalOpen && showAdBlockBanner && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[480px] bg-slate-900/95 dark:bg-slate-950/95 text-white border border-emerald-500/30 rounded-2xl px-4 py-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
          <div className="flex-1 flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-2 select-none" />
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-black tracking-tight text-emerald-400">
                광고 차단기를 사용 중이신가요?
              </p>
              <p className="text-[11.5px] text-slate-300 leading-normal font-medium">
                DVIEW는 독립적인 연구와 광고 수익으로 운영됩니다. 차단기 예외 등록(화이트리스트)을 해주시면 더 좋은 입지 분석 정보를 제공하는 데 큰 도움이 됩니다.
              </p>
            </div>
          </div>
          <div className="flex items-center shrink-0 ml-1">
            <button 
              onClick={handleAdBlockBannerClose}
              className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/20 hover:border-emerald-500/40 active:scale-95 transition-all focus:outline-none"
            >
              7일간 닫기
            </button>
          </div>
        </div>
      )}

      {isAdModalOpen && (
        <AdInquiryModal onClose={() => setIsAdModalOpen(false)} />
      )}

      {isConsumerAdModalOpen && consumerAdInfo && selectedReport && (
        <B2BConsumerAdModal
          onClose={() => {
            setIsConsumerAdModalOpen(false);
            setConsumerAdInfo(null);
          }}
          adType={consumerAdInfo.adType}
          adTitle={consumerAdInfo.adTitle}
          apartmentName={selectedReport.apartmentName}
          dong={selectedReport.dong || '오산동'}
          yearBuilt={selectedReport.metrics?.yearBuilt}
        />
      )}

      {showNicknameModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md bg-white/70 dark:bg-black/70 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surface text-primary rounded-[24px] shadow-2xl p-6 sm:p-8 border border-border transition-all animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#008262]/10 dark:bg-[#00d29d]/10 text-[#008262] dark:text-[#00d29d] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">반갑습니다! 닉네임을 설정해주세요</h2>
              <p className="text-sm text-tertiary">
                D-VIEW 서비스를 이용하기 위해 사용할 닉네임을 입력해주세요.
              </p>
            </div>

            <form onSubmit={handleNicknameSubmit} className="space-y-4">
              <div>
                <label htmlFor="nickname-input" className="block text-xs font-semibold text-secondary mb-1.5 ml-1">
                  닉네임
                </label>
                <input
                  id="nickname-input"
                  type="text"
                  placeholder="2~10자 한글, 영문, 숫자, _"
                  value={newNickname}
                  onChange={(e) => {
                    setNewNickname(e.target.value);
                    if (nicknameError) setNicknameError('');
                  }}
                  className="w-full bg-body text-primary border border-border focus:border-[#008262] dark:focus:border-[#00d29d] rounded-[14px] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008262]/20 dark:focus:ring-[#00d29d]/20 transition-all font-semibold"
                  autoComplete="off"
                  required
                  disabled={isSubmittingNickname}
                />
                {nicknameError && (
                  <p className="text-xs text-red-500 font-semibold mt-2 ml-1 animate-in slide-in-from-top-1 duration-200">
                    {nicknameError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmittingNickname || !newNickname.trim()}
                className="w-full bg-[#008262] hover:bg-[#006950] dark:bg-[#00b386] dark:hover:bg-[#008262] text-white rounded-[14px] py-3.5 text-sm font-bold shadow-lg shadow-[#008262]/10 dark:shadow-[#00b386]/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmittingNickname ? '설정 중...' : '시작하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      <LoginGateModal
        isOpen={isLoginGateOpen}
        onClose={() => setIsLoginGateOpen(false)}
        message={loginGateMessage}
        onLogin={handleLogin}
      />

      {isCompareOpen && (
        <ErrorBoundary
          name="아파트 비교 분석"
          fallback={(error, reset) => {
            if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in AptCompareModal. Reloading page...');
                window.location.reload();
              }
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">비교 분석기 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    비교 분석기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={() => setIsCompareOpen(false)}
                      className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        >
          <AptCompareModal
            isOpen={isCompareOpen}
            onClose={() => setIsCompareOpen(false)}
            initialAptName={compareInitialApt}
            sheetApartments={sheetApartments}
            txSummaryData={txSummary}
            nameMapping={nameMapping || {}}
            fieldReportsMap={fieldReportsMap}
            typeMap={typeMap}
            locationScores={locationScores}
          />
        </ErrorBoundary>
      )}

      {isJeonseSafetyOpen && (
        <ErrorBoundary
          name="전세 안전진단"
          fallback={(error, reset) => {
            if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in JeonseSafetyCalculator. Reloading page...');
                window.location.reload();
              }
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">전세 안전진단 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    전세 안전진단 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={() => setIsJeonseSafetyOpen(false)}
                      className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        >
          <JeonseSafetyCalculator
            isOpen={isJeonseSafetyOpen}
            onClose={() => setIsJeonseSafetyOpen(false)}
            initialAptName={jeonseSafetyInitialApt}
            sheetApartments={sheetApartments}
            txSummaryData={txSummary}
            nameMapping={nameMapping || {}}
            fieldReportsMap={fieldReportsMap}
          />
        </ErrorBoundary>
      )}

      {isMortgageOpen && (
        <ErrorBoundary
          name="대출 한도진단"
          fallback={(error, reset) => {
            if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in MortgageCalculator. Reloading page...');
                window.location.reload();
              }
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">대출 계산기 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    대출 한도진단 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={() => setIsMortgageOpen(false)}
                      className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        >
          <MortgageCalculator
            isOpen={isMortgageOpen}
            onClose={() => setIsMortgageOpen(false)}
            initialAptName={mortgageInitialApt}
            sheetApartments={sheetApartments}
            txSummaryData={txSummary}
            nameMapping={nameMapping || {}}
            fieldReportsMap={fieldReportsMap}
          />
        </ErrorBoundary>
      )}

      {isTaxCalcOpen && (
        <ErrorBoundary
          name="취득세 및 중개보수 계산기"
          fallback={(error, reset) => {
            if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in PropertyTaxCalculator. Reloading page...');
                window.location.reload();
              }
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">계산기 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    취득세 및 중개보수 계산기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={() => setIsTaxCalcOpen(false)}
                      className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        >
          <PropertyTaxCalculator
            isOpen={isTaxCalcOpen}
            onClose={() => setIsTaxCalcOpen(false)}
            initialAptName={taxCalcInitialApt}
            sheetApartments={sheetApartments}
            txSummaryData={txSummary}
            nameMapping={nameMapping || {}}
          />
        </ErrorBoundary>
      )}

      {isSellTimingOpen && (
        <ErrorBoundary
          name="AI 매도 타이밍 및 세무 진단기"
          fallback={(error, reset) => {
            if (error && (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported module'))) {
              if (typeof window !== 'undefined') {
                console.warn('ChunkLoadError caught in SellTimingCalculator. Reloading page...');
                window.location.reload();
              }
              return null;
            }
            return (
              <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-[400px] rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                    <span className="text-xl font-black">!</span>
                  </div>
                  <h3 className="text-[15px] font-black text-primary mb-1">진단기 로드 실패</h3>
                  <p className="text-[12px] font-medium text-tertiary mb-5 leading-normal">
                    AI 매도 타이밍 및 세무 진단기를 불러오는 도중 오류가 발생했습니다. 다시 시도해 주시기 바랍니다.
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={reset}
                      className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-[12px] rounded-xl transition-all cursor-pointer border-none"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={() => setIsSellTimingOpen(false)}
                      className="px-4 py-2.5 bg-body hover:bg-border/30 text-secondary font-bold text-[12px] rounded-xl border border-border/20 transition-all cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        >
          <SellTimingCalculator
            isOpen={isSellTimingOpen}
            onClose={() => setIsSellTimingOpen(false)}
            initialAptName={sellTimingInitialApt}
            sheetApartments={sheetApartments}
            txSummaryData={txSummary}
            nameMapping={nameMapping || {}}
            userId={user?.uid}
          />
        </ErrorBoundary>
      )}
    </>
  );
}

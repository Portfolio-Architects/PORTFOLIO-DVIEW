'use client';

import React, { useState } from 'react';
import {
  Navigation,
  BadgeCheck,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  isGeocodedComplex,
  isUnmappedComplex,
  VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
  getComplexData,
} from '@/lib/board/boardEngine';

export interface GpsVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComplex: string | null;
  isGpsVerified: boolean;
  gpsVerifiedComplex?: string | null;
  onVerify: (
    complexName: string,
    lat: number,
    lng: number
  ) => Promise<{
    verified: boolean;
    distanceMeters?: number;
    code?: string;
    message: string;
  }>;
}

export function GpsVerificationModal({
  isOpen,
  onClose,
  selectedComplex,
  isGpsVerified,
  gpsVerifiedComplex,
  onVerify,
}: GpsVerificationModalProps) {
  const [status, setStatus] = useState<'idle' | 'locating' | 'verifying' | 'success' | 'failure'>('idle');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  if (!isOpen) return null;

  const isVirtual = selectedComplex === VIRTUAL_PROSPECTIVE_RESIDENT_TITLE;
  const isUnmapped = selectedComplex ? isUnmappedComplex(selectedComplex) : false;
  const isSupported = selectedComplex ? isGeocodedComplex(selectedComplex) : false;
  const complexData = selectedComplex ? getComplexData(selectedComplex) : null;
  const isAlreadyVerified = Boolean(
    isGpsVerified && gpsVerifiedComplex === selectedComplex
  );

  const handleStartVerification = () => {
    if (!selectedComplex || !isSupported) return;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('failure');
      setResultMessage('사용 중인 브라우저에서 위치 정보를 지원하지 않습니다.');
      return;
    }

    setStatus('locating');
    setResultMessage('현재 단말기의 실시간 위치를 확인하고 있습니다...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setStatus('verifying');
          setResultMessage('단지 중심 좌표와의 거리를 검증하고 있습니다...');

          const { latitude, longitude } = pos.coords;
          const result = await onVerify(selectedComplex, latitude, longitude);

          if (result.verified) {
            setStatus('success');
            setDistanceMeters(result.distanceMeters ?? null);
            setResultMessage('인증 완료 (300m 이내)');
          } else {
            setStatus('failure');
            setDistanceMeters(result.distanceMeters ?? null);
            setResultMessage(
              result.message || '단지 반경 300m 이내에 위치하지 않습니다.'
            );
          }
        } catch (err: unknown) {
          setStatus('failure');
          const msg = err instanceof Error ? err.message : '위치 인증 통신 중 오류가 발생했습니다.';
          setResultMessage(msg);
        }
      },
      (geoError) => {
        setStatus('failure');
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setResultMessage('위치 권한이 차단되어 있습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.');
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setResultMessage('현재 위치 정보를 가져올 수 없습니다. GPS 신호를 확인해주세요.');
        } else if (geoError.code === geoError.TIMEOUT) {
          setResultMessage('위치 정보 수신 시간이 초과되었습니다. 다시 시도해 주세요.');
        } else {
          setResultMessage('위치 정보를 확인할 수 없습니다.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gps-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-surface dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 id="gps-modal-heading" className="text-base sm:text-lg font-black tracking-tight">
              입주민 GPS 위치 인증
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1 rounded-lg text-tertiary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Target Complex Information */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-tertiary block">인증 대상 단지</span>
              <span className="text-sm font-black text-primary">
                {selectedComplex || '단지가 선택되지 않았습니다'}
              </span>
              {complexData?.dong && (
                <span className="text-[11px] font-semibold text-secondary ml-1.5">
                  ({complexData.dong})
                </span>
              )}
            </div>

            {isAlreadyVerified && (
              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md">
                <BadgeCheck className="w-3.5 h-3.5" /> 이미 인증됨
              </span>
            )}
          </div>

          {/* Condition 1: Virtual Title '동탄 예비입주민' */}
          {isVirtual && (
            <div
              data-testid="gps-virtual-guidance"
              className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-blue-900 dark:text-blue-100 space-y-1.5 text-xs sm:text-sm font-medium"
            >
              <div className="flex items-center gap-2 font-black text-blue-700 dark:text-blue-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>위치 인증 비대상 타이틀</span>
              </div>
              <p className="text-[12px] leading-relaxed text-blue-800 dark:text-blue-200/90">
                동탄 예비입주민 타이틀은 특정 단지 위치 인증 대상이 아닙니다. 인증 뱃지 없이도 자유롭게 글과 댓글을 작성하실 수 있습니다.
              </p>
            </div>
          )}

          {/* Condition 2: Unmapped Complex (56 complexes without coords) */}
          {isUnmapped && (
            <div
              data-testid="gps-unmapped-guidance"
              className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 space-y-1.5 text-xs sm:text-sm font-medium"
            >
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-slate-100">
                <AlertCircle className="w-4 h-4 shrink-0 text-slate-500" />
                <span>위치 좌표 미등록 단지</span>
              </div>
              <p className="text-[12px] leading-relaxed text-secondary">
                해당 단지는 공식 위치 좌표가 등록되지 않아 GPS 인증이 지원되지 않습니다. 단지 타이틀은 정상 표출되니 안심하고 소통에 참여해 주세요.
              </p>
            </div>
          )}

          {/* Condition 3: Geocoded Complex (127 complexes with valid WGS84 coords) */}
          {isSupported && !isVirtual && (
            <div className="space-y-3">
              <div className="text-xs sm:text-sm text-secondary font-medium leading-relaxed">
                현재 위치가 <span className="font-extrabold text-primary">[{selectedComplex}]</span> 중심 반경 300m 이내에 있는지 확인합니다. 인증 통과 시 작성하시는 모든 글에 공인 에메랄드 인증 마크가 표시됩니다.
              </div>

              {/* Status Display Area */}
              {(status === 'locating' || status === 'verifying') && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-200">
                    {resultMessage}
                  </span>
                </div>
              )}

              {status === 'success' && (
                <div
                  data-testid="gps-success-banner"
                  className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 space-y-1 animate-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center gap-2 font-black text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>인증 완료 (300m 이내)</span>
                  </div>
                  {distanceMeters !== null && (
                    <p className="text-[12px] text-emerald-800 dark:text-emerald-200/90 tabular-nums">
                      단지 중심으로부터 약 {distanceMeters}m 위치 확인되었습니다.
                    </p>
                  )}
                </div>
              )}

              {status === 'failure' && (
                <div
                  data-testid="gps-failure-banner"
                  className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100 space-y-1 animate-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center gap-2 font-black text-red-700 dark:text-red-300">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{resultMessage}</span>
                  </div>
                  {distanceMeters !== null && distanceMeters > 300 && (
                    <p className="text-[12px] text-red-700 dark:text-red-300/90 tabular-nums">
                      현재 확인된 거리: 약 {distanceMeters}m (기준 300m 초과)
                    </p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleStartVerification}
                disabled={status === 'locating' || status === 'verifying'}
                className="w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {status === 'locating' || status === 'verifying' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>인증 진행 중...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>내 단지 위치 인증하기</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Privacy Guarantee Statement */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2 text-[11px] text-tertiary">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-secondary font-bold">개인정보 보호 수칙:</strong> 사용자의 실시간 GPS 좌표는 서버에 저장되지 않습니다. 300m 거리 판정 연산 즉시 메모리에서 영구 파기됩니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-200/80 dark:bg-slate-800 text-primary hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default GpsVerificationModal;

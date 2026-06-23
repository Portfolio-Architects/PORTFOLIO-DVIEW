import React, { useState, useEffect } from 'react';
import { useFormContext, useWatch, Path } from 'react-hook-form';
import { logger } from '@/lib/services/logger';
import { FormValues } from './types';
import { FALLBACK_DONG_DATA } from './constants';

interface BasicInfoSectionProps {
  lockedMeta?: { dong: string; apartmentName: string };
}

export const BasicInfoSection = React.memo(function BasicInfoSection({ lockedMeta }: BasicInfoSectionProps) {
  const { register, control } = useFormContext<FormValues>();
  
  const [dongData, setDongData] = useState<Record<string, string[]>>(FALLBACK_DONG_DATA);
  const [isLoadingApts, setIsLoadingApts] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchApartments = async () => {
      setIsLoadingApts(true);
      try {
        const url = `/api/apartments-by-dong`; 
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (active && data && Object.keys(data).length > 0) {
            setDongData({ ...FALLBACK_DONG_DATA, ...data });
          }
        }
      } catch (err) {
        if (active) {
          logger.warn('BasicInfoSection', 'Failed to fetch apartments by dong, falling back to local constants', undefined, err);
        }
      } finally {
        if (active) {
          setIsLoadingApts(false);
        }
      }
    };
    fetchApartments();
    return () => {
      active = false;
    };
  }, []);

  const selectedDong = useWatch({ control, name: 'dong' }) || Object.keys(dongData)[0];
  const availableApartments = dongData[selectedDong] || [];

  const SelectInput = ({ name, label, options }: { name: string, label: string, options: string[] }) => (
    <div className={label ? "mb-4" : ""}>
      {label && <label className="block text-[14px] font-bold text-secondary mb-2">{label}</label>}
      <select 
        {...register(name as Path<FormValues>, { required: true })}
        className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue outline-none transition-all appearance-none cursor-pointer"
      >
        <option value="" disabled>선택하세요</option>
        {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  return (
    <section className="mb-12">
      <h3 className="text-[18px] font-bold text-primary mb-6 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-body text-secondary flex items-center justify-center text-[12px]">1</span>
        기본 정보
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {lockedMeta ? (
          <div className="col-span-2 p-4 bg-body border border-border rounded-xl flex gap-3 items-center">
            <span className="text-[13px] font-bold text-tertiary bg-surface border border-border px-2 py-1 rounded shadow-sm">단지 고정됨</span>
            <span className="text-[14px] font-bold text-secondary">{lockedMeta.dong}</span>
            <span className="text-[14px] text-toss-gray">/</span>
            <span className="text-[15px] font-extrabold text-toss-blue">{lockedMeta.apartmentName}</span>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-[14px] font-bold text-secondary mb-2">법정동 선택 <span className="text-toss-red">*</span></label>
              <SelectInput 
                name="dong" 
                label="" 
                options={isLoadingApts ? ['불러오는 중...'] : Object.keys(dongData)} 
              />
            </div>
            <div>
              <label className="block text-[14px] font-bold text-secondary mb-2">물건(아파트) 이름 <span className="text-toss-red">*</span></label>
              {selectedDong === '기타' ? (
                <input 
                  {...register('apartmentName', { required: true })}
                  className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue outline-none transition-all placeholder-[#b0b8c1]"
                  placeholder="직접 단지명을 입력하세요"
                />
              ) : (
                <SelectInput 
                  name="apartmentName" 
                  label="" 
                  options={availableApartments} 
                />
              )}
              <p className="text-[12px] text-tertiary font-medium mt-2">* 동을 먼저 선택하면 해당 지역의 주요 아파트 목록이 연동됩니다.</p>
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label className="block text-[14px] font-bold text-secondary mb-2">현장 방문(촬영) 일자 <span className="text-toss-red">*</span></label>
          <input 
            type="date"
            {...register('scoutingDate', { required: true })}
            className="w-full md:w-1/2 px-4 py-3 bg-body border border-border rounded-xl text-[15px] focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue outline-none transition-all text-primary"
          />
          <p className="text-[12px] text-tertiary font-medium mt-2">* 현장 사진 갤러리에 '기준일자'로 자동 표시됩니다.</p>
        </div>
      </div>
    </section>
  );
});

BasicInfoSection.displayName = 'BasicInfoSection';

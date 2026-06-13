import React from 'react';
import { useFormContext, Path, useWatch } from 'react-hook-form';
import { FormValues } from './types';

// Export type to be used by parent
export interface ApiCategories {
  academyCategories?: Record<string, number>;
  restaurantDensity?: number;
  restaurantCategories?: Record<string, number>;
  nearestSchoolNames?: { elementary?: string; middle?: string; high?: string };
  nearestStationName?: string;
  nearestIndeokwonStationName?: string;
  nearestTramStationName?: string;
}

interface MetricsSectionProps {
  isCalculating: boolean;
  setIsCalculating: (val: boolean) => void;
  apiCategories: ApiCategories;
  setApiCategories: (val: ApiCategories) => void;
}

const NumberInput = ({ name, label, placeholder, unit }: { name: string, label: string, placeholder: string, unit: string }) => {
  const { register } = useFormContext<FormValues>();
  return (
    <div className="flex flex-col mb-4">
      <label className="text-[12px] font-bold text-secondary mb-1.5">{label}</label>
      <div className="relative">
        <input 
          type="number"
          step="0.01"
          {...register(name as Path<FormValues>, { required: false })}
          className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue outline-none transition-all placeholder-[#b0b8c1]"
          placeholder={placeholder}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary font-bold text-[14px]">{unit}</span>
      </div>
    </div>
  );
};

const TextInput = ({ name, label, placeholder }: { name: string, label: string, placeholder: string }) => {
  const { register } = useFormContext<FormValues>();
  return (
    <div className="flex flex-col mb-4">
      <label className="text-[12px] font-bold text-secondary mb-1.5">{label}</label>
      <input 
        type="text" 
        {...register(name as Path<FormValues>, { required: false })} 
        placeholder={placeholder} 
        className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[15px] focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue outline-none transition-all placeholder-[#b0b8c1]" 
      />
    </div>
  );
};

export function MetricsSection({
  isCalculating,
  setIsCalculating,
  apiCategories,
  setApiCategories
}: MetricsSectionProps) {
  const { getValues, setValue, register, control } = useFormContext<FormValues>();
  const apartmentName = useWatch({ control, name: 'apartmentName' });
  const [lastFetchedApt, setLastFetchedApt] = React.useState<string>('');

  const handleCalculate = async (silentParam: boolean | React.MouseEvent = false) => {
    const silent = silentParam === true;
    const aptName = getValues('apartmentName');
    if (!aptName) { 
      if (!silent) alert('먼저 아파트를 선택해주세요.'); 
      return; 
    }
    
    if (silent && aptName === lastFetchedApt) return;
    if (silent) setLastFetchedApt(aptName);

    setIsCalculating(true);
    try {
      const res = await fetch(`/api/location-scores?apartment=${encodeURIComponent(aptName)}&refresh=1`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const available = errData.availableApartments?.join(', ') || '없음';
        if (!silent) alert(`좌표 데이터를 찾을 수 없습니다.\n\n💡 ${errData.hint || ''}\n현재 좌표가 있는 아파트: ${available}`);
        return;
      }
      const loc = await res.json();

      // 위치 거리
      if (loc.distanceToElementary != null) setValue('metrics.distanceToElementary', String(loc.distanceToElementary));
      if (loc.distanceToMiddle != null) setValue('metrics.distanceToMiddle', String(loc.distanceToMiddle));
      if (loc.distanceToHigh != null) setValue('metrics.distanceToHigh', String(loc.distanceToHigh));
      if (loc.distanceToSubway != null) setValue('metrics.distanceToSubway', String(loc.distanceToSubway));
      if (loc.academyDensity != null) setValue('metrics.academyDensity', String(loc.academyDensity));
      if (loc.restaurantDensity != null) setValue('metrics.restaurantDensity', String(loc.restaurantDensity));

      // Save category data for Firestore
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

      // 건물 정보 (시트 C~H열)
      const bld = loc.buildingInfo;
      if (bld) {
        if (bld.brand) setValue('metrics.brand', bld.brand);
        if (bld.householdCount) setValue('metrics.householdCount', String(bld.householdCount));
        if (bld.yearBuilt) setValue('metrics.yearBuilt', String(bld.yearBuilt));
        if (bld.far) setValue('metrics.far', String(bld.far));
        if (bld.bcr) setValue('metrics.bcr', String(bld.bcr));
        if (bld.parkingPerHousehold) setValue('metrics.parkingPerHousehold', String(bld.parkingPerHousehold));
      }

      // 교통 (인덕원선, 트램)
      if (loc.distanceToIndeokwon != null) setValue('metrics.distanceToIndeokwon', String(loc.distanceToIndeokwon));
      if (loc.distanceToTram != null) setValue('metrics.distanceToTram', String(loc.distanceToTram));

      // 앵커 테넌트 (스타벅스 등)
      if (loc.distanceToStarbucks != null) setValue('metrics.distanceToStarbucks', String(loc.distanceToStarbucks));
      if (loc.starbucksName != null) setValue('metrics.starbucksName', String(loc.starbucksName));
      if (loc.starbucksAddress != null) setValue('metrics.starbucksAddress', String(loc.starbucksAddress));
      if (loc.starbucksCoordinates != null) setValue('metrics.starbucksCoordinates', String(loc.starbucksCoordinates));
      
      if (loc.distanceToMcDonalds != null) setValue('metrics.distanceToMcDonalds', String(loc.distanceToMcDonalds));
      if (loc.mcdonaldsName != null) setValue('metrics.mcdonaldsName', String(loc.mcdonaldsName));
      if (loc.mcdonaldsAddress != null) setValue('metrics.mcdonaldsAddress', String(loc.mcdonaldsAddress));
      if (loc.mcdonaldsCoordinates != null) setValue('metrics.mcdonaldsCoordinates', String(loc.mcdonaldsCoordinates));
      
      if (loc.distanceToOliveYoung != null) setValue('metrics.distanceToOliveYoung', String(loc.distanceToOliveYoung));
      if (loc.oliveYoungName != null) setValue('metrics.oliveYoungName', String(loc.oliveYoungName));
      if (loc.oliveYoungAddress != null) setValue('metrics.oliveYoungAddress', String(loc.oliveYoungAddress));
      if (loc.oliveYoungCoordinates != null) setValue('metrics.oliveYoungCoordinates', String(loc.oliveYoungCoordinates));
      
      if (loc.distanceToDaiso != null) setValue('metrics.distanceToDaiso', String(loc.distanceToDaiso));
      if (loc.daisoName != null) setValue('metrics.daisoName', String(loc.daisoName));
      if (loc.daisoAddress != null) setValue('metrics.daisoAddress', String(loc.daisoAddress));
      if (loc.daisoCoordinates != null) setValue('metrics.daisoCoordinates', String(loc.daisoCoordinates));
      
      if (loc.distanceToSupermarket != null) setValue('metrics.distanceToSupermarket', String(loc.distanceToSupermarket));
      if (loc.supermarketName != null) setValue('metrics.supermarketName', String(loc.supermarketName));
      if (loc.supermarketAddress != null) setValue('metrics.supermarketAddress', String(loc.supermarketAddress));
      if (loc.supermarketCoordinates != null) setValue('metrics.supermarketCoordinates', String(loc.supermarketCoordinates));

      const bldMsg = bld?.householdCount
        ? `\n\n🏢 건물\n시공사: ${bld.brand ?? '-'}\n세대수: ${bld.householdCount}\n준공: ${bld.yearBuilt ?? '-'}\n용적률: ${bld.far ?? '-'}%\n건폐율: ${bld.bcr ?? '-'}%\n주차: ${bld.parkingPerHousehold ?? '-'}대/세대`
        : '\n\n⚠️ 건물 정보 없음 (시트 C~H열 입력 필요)';
      const catEntries = Object.entries(loc.academyCategories || {}).sort(([,a], [,b]) => (b as number) - (a as number));
      const catMsg = catEntries.length > 0 ? `\n\n📚 학원 ${loc.academyDensity}개 (500m)\n${catEntries.map(([c, n]) => `  ${c}: ${n}개`).join('\n')}` : `\n\n📚 학원: ${loc.academyDensity}개`;
      const restEntries = Object.entries(loc.restaurantCategories || {}).sort(([,a], [,b]) => (b as number) - (a as number));
      const restMsg = restEntries.length > 0 ? `\n\n🍽️ 음식점·카페 ${loc.restaurantDensity}개 (500m)\n${restEntries.map(([c, n]) => `  ${c}: ${n}개`).join('\n')}` : '';
      const transitMsg = `\n\n🚇 교통\nGTX-A/SRT: ${loc.nearestStation?.name || '-'} (${loc.distanceToSubway ?? '-'}m)${loc.distanceToIndeokwon != null ? `\n인덕원선: ${loc.nearestIndeokwon?.name || '-'} (${loc.distanceToIndeokwon}m)` : ''}${loc.distanceToTram != null ? `\n트램: ${loc.nearestTram?.name || '-'} (${loc.distanceToTram}m)` : ''}`;
      const anchorMsg = `\n\n🎯 앵커 테넌트\n스타벅스: ${loc.distanceToStarbucks ?? '-'}\n올리브영: ${loc.distanceToOliveYoung ?? '-'}\n다이소: ${loc.distanceToDaiso ?? '-'}\n이마트/노브랜드: ${loc.distanceToSupermarket ?? '-'}\n배스킨라빈스: ${loc.distanceToMcDonalds ?? '-'}`;
      if (!silent) alert(`✅ 자동 출력 완료!\n📍 학교\n초등: ${loc.nearestSchools?.elementary?.name || '-'} (${loc.distanceToElementary ?? '-'}m)\n중학: ${loc.nearestSchools?.middle?.name || '-'} (${loc.distanceToMiddle ?? '-'}m)\n고등: ${loc.nearestSchools?.high?.name || '-'} (${loc.distanceToHigh ?? '-'}m)${transitMsg}${catMsg}${restMsg}${bldMsg}${anchorMsg}`);
    } catch (e) {
      if (!silent) alert('자동 출력 중 오류가 발생했습니다.');
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  };

  React.useEffect(() => {
    if (apartmentName && apartmentName !== lastFetchedApt) {
      handleCalculate(true);
    }
  }, [apartmentName, lastFetchedApt]);

  return (
    <section className="mb-12 bg-body -mx-6 md:-mx-8 px-6 md:px-8 py-8 border-y border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[18px] font-bold text-primary flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-surface text-secondary shadow-sm flex items-center justify-center text-[12px]">2</span>
          객관적 지표 통계
        </h3>
        <button
          type="button"
          disabled={isCalculating}
          onClick={handleCalculate}
          className="px-5 py-2.5 bg-toss-blue-light hover:bg-toss-blue/20 text-toss-blue font-bold text-[13px] rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isCalculating ? (
            <><div className="w-4 h-4 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" /> 불러오는 중...</>
          ) : (
            <>📍 단지 정보 자동 출력</>
          )}
        </button>
      </div>
      <p className="text-[14px] text-secondary mb-6">입력하신 실제 데이터는 소비자 대상 팩트 프리미엄 지표로 자동 가공되어 표시됩니다.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2 mb-4">
        <div>
          <label className="block text-[13px] font-bold text-secondary mb-1 pl-0.5">대표 시공사 (브랜드)</label>
          <input
            {...register('metrics.brand')}
            placeholder="예: 현대건설"
            className="w-full bg-body border border-border rounded-xl px-4 py-3 text-[15px] outline-none focus:border-toss-blue focus:bg-surface transition-colors"
          />
        </div>
        <NumberInput name="metrics.householdCount" label="총 세대수 (단지 규모)" placeholder="예: 1200" unit="세대" />
        <NumberInput name="metrics.yearBuilt" label="준공 연월 (연식 계산용)" placeholder="예: 2018" unit="년" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2 mb-4">
        <NumberInput name="metrics.far" label="용적률 (단지가 얼마나 밀집되어 있는지)" placeholder="예: 215" unit="%" />
        <NumberInput name="metrics.bcr" label="건폐율 (동간 거리가 얼마나 쾌적한지)" placeholder="예: 15" unit="%" />
        <NumberInput name="metrics.parkingPerHousehold" label="세대당 주차대수" placeholder="예: 1.45" unit="대" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2 mb-4">
        <NumberInput name="metrics.distanceToElementary" label="초등학교 통학거리 (초품아 여부)" placeholder="예: 300" unit="m" />
        <NumberInput name="metrics.distanceToMiddle" label="중학교 통학거리" placeholder="예: 800" unit="m" />
        <NumberInput name="metrics.distanceToHigh" label="고등학교 통학거리" placeholder="예: 1200" unit="m" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2 mb-4">
        <NumberInput name="metrics.distanceToSubway" label="GTX-A/SRT 거리" placeholder="예: 500" unit="m" />
        <NumberInput name="metrics.distanceToIndeokwon" label="동탄인덕원선 거리" placeholder="예: 800" unit="m" />
        <NumberInput name="metrics.distanceToTram" label="동탄트램 거리" placeholder="예: 300" unit="m" />
      </div>

      <div className="border-t border-body pt-4 mt-6 mb-6">
        <h3 className="text-[14px] font-bold text-primary flex gap-2 mb-3 items-center">
          앵커 테넌트 (주요 편의시설)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-4">
          <div className="bg-body p-4 rounded-xl border border-border flex flex-col gap-3">
            <span className="text-[13px] font-bold text-[#00704A] flex items-center gap-1.5 border-b border-border pb-2">☕ 스타벅스</span>
            <NumberInput name="metrics.distanceToStarbucks" label="반경 거리" placeholder="예: 250" unit="m" />
            <TextInput name="metrics.starbucksName" label="지점명" placeholder="예: 스타벅스 동탄역점" />
            <TextInput name="metrics.starbucksAddress" label="상세 주소" placeholder="예: 경기도 화성시 동탄역로 123" />
            <TextInput name="metrics.starbucksCoordinates" label="지도 좌표 (위도, 경도)" placeholder="예: 37.1982, 127.0984" />
          </div>
          
          <div className="bg-body p-4 rounded-xl border border-border grid grid-cols-2 gap-x-4 gap-y-3 content-start">
            <div className="col-span-2 border-b border-border pb-2 mb-1">
               <span className="text-[13px] font-bold text-primary">기타 주요 시설 거리</span>
            </div>
            <NumberInput name="metrics.distanceToOliveYoung" label="올리브영 거리" placeholder="예: 300" unit="m" />
            <NumberInput name="metrics.distanceToDaiso" label="다이소 거리" placeholder="예: 400" unit="m" />
            <NumberInput name="metrics.distanceToSupermarket" label="대형마트(이마트 등)" placeholder="예: 500" unit="m" />
            <NumberInput name="metrics.distanceToMcDonalds" label="배스킨라빈스 거리" placeholder="예: 600" unit="m" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <NumberInput name="metrics.academyDensity" label="반경 500m(도보권) 이내 학원 개수 (학군 밀집도)" placeholder="예: 120" unit="개" />
        <NumberInput name="metrics.restaurantDensity" label="반경 500m(도보권) 이내 음식점·카페 개수" placeholder="예: 472" unit="개" />
      </div>

      {/* Category Breakdown Panels — always visible */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Academy Categories */}
        <div className="bg-[#f0fdf4] rounded-xl p-4 border border-[#bbf7d0]">
          <div className="text-[13px] font-bold text-toss-green mb-2">학원 카테고리 ({apiCategories.academyCategories ? Object.values(apiCategories.academyCategories).reduce((a, b) => a + b, 0) : 0}개)</div>
          <div className="space-y-1">
            {apiCategories.academyCategories && Object.keys(apiCategories.academyCategories).length > 0 ? (
              Object.entries(apiCategories.academyCategories)
                .sort(([,a], [,b]) => b - a)
                .map(([cat, cnt]) => (
                  <div key={cat} className="flex justify-between text-[12px] py-0.5 px-1">
                    <span className="text-secondary truncate mr-2">{cat}</span>
                    <span className="font-bold text-toss-green shrink-0">{cnt}개</span>
                  </div>
                ))
            ) : (
              <p className="text-[11px] text-tertiary italic">단지 정보 불러오기 후 자동 표시됩니다</p>
            )}
          </div>
        </div>
        {/* Restaurant Categories */}
        <div className="bg-[#fffbeb] rounded-xl p-4 border border-[#fde68a]">
          <div className="text-[13px] font-bold text-[#f59e0b] mb-2">음식점·카페 ({apiCategories.restaurantCategories ? Object.values(apiCategories.restaurantCategories).reduce((a, b) => a + b, 0) : 0}개)</div>
          <div className="space-y-1">
            {apiCategories.restaurantCategories && Object.keys(apiCategories.restaurantCategories).length > 0 ? (
              Object.entries(apiCategories.restaurantCategories)
                .sort(([,a], [,b]) => b - a)
                .map(([cat, cnt]) => (
                  <div key={cat} className="flex justify-between text-[12px] py-0.5 px-1">
                    <span className="text-secondary truncate mr-2">{cat}</span>
                    <span className="font-bold text-[#f59e0b] shrink-0">{cnt}개</span>
                  </div>
                ))
            ) : (
              <p className="text-[11px] text-tertiary italic">단지 정보 불러오기 후 자동 표시됩니다</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

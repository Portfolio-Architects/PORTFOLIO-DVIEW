import React, { useMemo } from 'react';
import { Building } from 'lucide-react';

interface ApartmentSpecsSectionProps {
  report: any;
  inline?: boolean;
  displayAptName: string;
}

const ApartmentSpecsSection = React.memo(function ApartmentSpecsSection({
  report,
  inline = false,
  displayAptName,
}: ApartmentSpecsSectionProps) {
  const jsonLd = useMemo(() => {
    if (!report || !report.metrics) return null;
    
    const amenityFeature = [];
    if (report.metrics.brand) {
      amenityFeature.push({
        "@type": "LocationFeatureSpecification",
        "name": "시공사",
        "value": report.metrics.brand
      });
    }
    if (report.metrics.yearBuilt) {
      amenityFeature.push({
        "@type": "LocationFeatureSpecification",
        "name": "사용승인일",
        "value": String(report.metrics.yearBuilt)
      });
    }
    if (report.metrics.far) {
      amenityFeature.push({
        "@type": "LocationFeatureSpecification",
        "name": "용적률",
        "value": `${report.metrics.far}%`
      });
    }
    if (report.metrics.bcr) {
      amenityFeature.push({
        "@type": "LocationFeatureSpecification",
        "name": "건폐율",
        "value": `${report.metrics.bcr}%`
      });
    }
    if (report.metrics.parkingCount || report.metrics.parkingPerHousehold) {
      amenityFeature.push({
        "@type": "LocationFeatureSpecification",
        "name": "주차대수",
        "value": `${report.metrics.parkingCount ? report.metrics.parkingCount + '대' : ''} ${report.metrics.parkingPerHousehold ? '(세대당 ' + report.metrics.parkingPerHousehold + '대)' : ''}`.trim()
      });
    }

    return {
      "@context": "https://schema.org",
      "@type": "ApartmentComplex",
      "name": displayAptName,
      "description": `${displayAptName} 단지의 기본 스펙 정보(세대수, 사용승인일, 주차대수, 용적률, 건폐율, 건설사 등)입니다.`,
      "numberOfAccommodationUnits": report.metrics.householdCount || undefined,
      "amenityFeature": amenityFeature
    };
  }, [report, displayAptName]);

  if (!report || !report.metrics) return null;

  return (
    <section 
      id="sec-specs" 
      className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border`}
    >
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <h2 className="text-title-lg font-bold text-primary flex items-center gap-2 mb-5 border-b border-border pb-3">
        <Building size={18} className="text-toss-blue"/> 단지 기본정보
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          {
            key: 'name-brand',
            label: '단지명 / 시공사',
            value: (
              <span className="break-keep">
                {displayAptName} {report.metrics.brand && <span className="block text-body-sm text-secondary font-medium mt-0.5 apt-spec-label">({report.metrics.brand})</span>}
              </span>
            ),
            className: ''
          },
          {
            key: 'year-built',
            label: '사용승인일 (연차)',
            value: report.metrics.yearBuilt ? (() => {
              const ybStr = String(report.metrics.yearBuilt);
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth() + 1;
              
              if (ybStr.length >= 6) {
                const year = parseInt(ybStr.substring(0, 4));
                const month = parseInt(ybStr.substring(4, 6));
                const elapsedMonths = (currentYear - year) * 12 + (currentMonth - month);
                
                let ageStr = '';
                if (elapsedMonths < 0) {
                  ageStr = '입주 전';
                } else if (elapsedMonths === 0) {
                  ageStr = '신축 1개월 미만';
                } else {
                  const y = Math.floor(elapsedMonths / 12);
                  const m = elapsedMonths % 12;
                  if (y > 0 && m > 0) ageStr = `${y}년 ${m}개월차`;
                  else if (y > 0) ageStr = `${y}년차`;
                  else ageStr = `${m}개월차`;
                }
                return <>{year}년 {month}월 <span className="block text-body-sm text-toss-blue font-medium mt-0.5 apt-spec-label">({ageStr})</span></>;
              }
              
              const year = parseInt(ybStr);
              const age = currentYear - year + 1;
              return <>{year}년 <span className="block text-body-sm text-toss-blue font-medium mt-0.5 apt-spec-label">({age}년차)</span></>;
            })() : '-',
            className: ''
          },
          {
            key: 'household-scale',
            label: '규모 (세대/층)',
            value: (
              <>
                {report.metrics.householdCount ? `${report.metrics.householdCount}세대` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.maxFloor ? `최고 ${report.metrics.maxFloor}층` : '-'}</span>
              </>
            ),
            className: ''
          },
          {
            key: 'far-bcr',
            label: '용적률 / 건폐율',
            value: (
              <>
                {report.metrics.far ? `${report.metrics.far}%` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.bcr ? `${report.metrics.bcr}%` : '-'}</span>
              </>
            ),
            className: ''
          },
          {
            key: 'parking-info',
            label: '주차대수 (세대당)',
            value: (
              <>
                {report.metrics.parkingCount ? `${report.metrics.parkingCount}대` : '-'} <span className="block text-tertiary text-body-sm font-medium mt-0.5 apt-spec-label">/ {report.metrics.parkingPerHousehold ? `${report.metrics.parkingPerHousehold}대` : '-'}</span>
              </>
            ),
            className: 'col-span-2 sm:col-span-1'
          }
        ].map((spec) => (
          <div 
            key={`apt-spec-card-${spec.key}`} 
            className={`bg-body p-3.5 sm:p-4 rounded-xl border border-border ${spec.className}`}
          >
            <p className="text-body-sm text-tertiary font-bold mb-1 whitespace-nowrap apt-spec-label">{spec.label}</p>
            <div className="text-body-normal text-primary font-bold apt-spec-value">
              {spec.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

ApartmentSpecsSection.displayName = 'ApartmentSpecsSection';
export default ApartmentSpecsSection;

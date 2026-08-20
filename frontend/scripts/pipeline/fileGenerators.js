/**
 * 💾 File Generators Module
 * 
 * - writeSummaryFiles: writes tx-summary.json, recent-transactions.json, macro-trend.json
 * - writeApartmentChunks: writes public/tx-data/${aptName}.json, ${aptName}-recent.json, _index.json
 */

const fs = require('fs');
const path = require('path');
const { applyIqrOutlierDetection } = require('./outlierFilters');
const { formatPriceEok, normalizeAptName } = require('./apartmentSummarizer');

/**
 * 전역 요약 및 트렌드 JSON 파일들을 저장
 * @param {Object} paths - 파일 경로 맵
 * @param {Object} data - 생성할 데이터 객체
 */
function writeSummaryFiles(paths, data) {
  const { summaryPath, recentTxPath, macroTrendPath } = paths;
  const { summary, recent7DaysVolume, recentTransactions, dongtanMacroTrend } = data;

  if (summaryPath) {
    const summaryDir = path.dirname(summaryPath);
    if (!fs.existsSync(summaryDir)) {
      fs.mkdirSync(summaryDir, { recursive: true });
    }
    const outputData = {
      summary,
      recent7DaysVolume
    };
    fs.writeFileSync(summaryPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`📁 파일 생성: ${summaryPath}`);
  }

  if (recentTxPath) {
    const recentTxDir = path.dirname(recentTxPath);
    if (!fs.existsSync(recentTxDir)) {
      fs.mkdirSync(recentTxDir, { recursive: true });
    }
    fs.writeFileSync(recentTxPath, JSON.stringify(recentTransactions, null, 2), 'utf-8');
    console.log(`📁 파일 생성: ${recentTxPath}`);
  }

  if (macroTrendPath) {
    const macroTrendDir = path.dirname(macroTrendPath);
    if (!fs.existsSync(macroTrendDir)) {
      fs.mkdirSync(macroTrendDir, { recursive: true });
    }
    fs.writeFileSync(macroTrendPath, JSON.stringify(dongtanMacroTrend, null, 2), 'utf-8');
    console.log(`📁 파일 생성: ${macroTrendPath}`);
  }
}

/**
 * 아파트별 개별 JSON 청크 파일들 및 인덱스 파일 저장
 * @param {string} txDataDir - public/tx-data 디렉토리 경로
 * @param {string[]} targetApts - 대상 아파트 키 목록
 * @param {Object} byApt - 아파트별 원시 거래 맵
 * @param {boolean} isFullSync - 풀 싱크 여부 (디렉토리 초기화용)
 * @returns {{ chunkCount: number, totalRecords: number, totalSizeKB: number }}
 */
function writeApartmentChunks(txDataDir, targetApts, byApt, isFullSync = false) {
  // 디렉토리 초기화 (Full Sync 시에만)
  if (isFullSync && fs.existsSync(txDataDir)) {
    fs.rmSync(txDataDir, { recursive: true });
  }
  if (!fs.existsSync(txDataDir)) {
    fs.mkdirSync(txDataDir, { recursive: true });
  }

  let totalRecords = 0;
  let totalSizeKB = 0;
  let chunkCount = 0;

  for (const aptName of targetApts) {
    const txs = byApt[aptName] || byApt[normalizeAptName(aptName)] || [];
    const records = txs.map(t => ({
      contractYm: t.contractYm,
      contractDay: t.contractDay,
      price: t.price,
      priceEok: (t.dealType === '전세' || t.dealType === '월세') 
        ? formatPriceEok(t.deposit || 0) + (t.monthlyRent ? ` / ${t.monthlyRent}만` : '')
        : formatPriceEok(t.price || 0),
      deposit: t.deposit || 0,
      monthlyRent: t.monthlyRent || 0,
      reqGb: t.reqGb || '',
      rnuYn: t.rnuYn || '',
      area: t.area,
      areaPyeong: t.areaPyeong,
      floor: t.floor,
      dealType: t.dealType || '',
      cancelDate: t.cancelDate || '',
    }));

    // Deduplicate records to prevent duplicate rows in the UI
    const seen = new Map();
    for (const r of records) {
      let normalizedDealType = r.dealType ? r.dealType.trim() : '';
      if (normalizedDealType !== '전세' && normalizedDealType !== '월세') {
        normalizedDealType = '매매';
      }

      const isRent = normalizedDealType === '전세' || normalizedDealType === '월세';
      const cleanPrice = isRent ? 0 : (Number(r.price) || 0);
      const cleanDeposit = isRent ? (Number(r.deposit) || 0) : 0;
      const cleanRent = isRent ? (Number(r.monthlyRent) || 0) : 0;

      const cleanDay = String(r.contractDay || '').trim().padStart(2, '0');
      const cleanFloor = Number(r.floor) || 0;

      const key = `${r.contractYm}_${cleanDay}_${cleanPrice}_${cleanDeposit}_${cleanRent}_${Math.round(r.area * 100) / 100}_${cleanFloor}_${normalizedDealType}`;
      
      if (!seen.has(key)) {
        seen.set(key, r);
      } else {
        const existing = seen.get(key);

        const getRichnessScore = (item) => {
          let score = 0;
          const dt = item.dealType ? item.dealType.trim() : '';
          if (dt && dt !== '' && dt !== '매매' && dt !== '전세' && dt !== '월세') {
            score += 2;
          }
          if (item.reqGb && item.reqGb.trim() && item.reqGb.trim() !== '-') {
            score += 1;
          }
          if (item.rnuYn && item.rnuYn.trim() && item.rnuYn.trim() !== '-') {
            score += 1;
          }
          if (isRent && Number(item.price) > 0) {
            score += 1;
          }
          return score;
        };

        const existingScore = getRichnessScore(existing);
        const newScore = getRichnessScore(r);

        if (newScore > existingScore) {
          seen.set(key, r);
        }
      }
    }
    const uniqueRecords = Array.from(seen.values());

    // IQR 아웃라이어 필터링 적용
    applyIqrOutlierDetection(uniqueRecords);

    // Sort unique records by contract date descending (newest first)
    uniqueRecords.sort((a, b) => {
      const dateA = `${a.contractYm || ''}${String(a.contractDay || '').padStart(2, '0')}`;
      const dateB = `${b.contractYm || ''}${String(b.contractDay || '').padStart(2, '0')}`;
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const getVal = (x) => (x.dealType === '전세' || x.dealType === '월세') ? (x.deposit || 0) : (x.price || 0);
      return getVal(b) - getVal(a);
    });

    // 파일명: 아파트명
    const filename = `${aptName}.json`;
    const filepath = path.join(txDataDir, filename);
    const json = JSON.stringify(uniqueRecords);
    
    fs.writeFileSync(filepath, json, 'utf-8');

    // 최근 거래 내역만 포함하는 경량 JSON 파일 생성 (최근 15건)
    const filenameRecent = `${aptName}-recent.json`;
    const filepathRecent = path.join(txDataDir, filenameRecent);
    const jsonRecent = JSON.stringify(uniqueRecords.slice(0, 15));
    fs.writeFileSync(filepathRecent, jsonRecent, 'utf-8');
    
    totalRecords += uniqueRecords.length;
    totalSizeKB += (json.length + jsonRecent.length) / 1024;
    chunkCount++;
  }

  // 인덱스 파일 생성
  fs.writeFileSync(
    path.join(txDataDir, '_index.json'),
    JSON.stringify(targetApts),
    'utf-8'
  );

  return { chunkCount, totalRecords, totalSizeKB };
}

module.exports = {
  writeSummaryFiles,
  writeApartmentChunks
};

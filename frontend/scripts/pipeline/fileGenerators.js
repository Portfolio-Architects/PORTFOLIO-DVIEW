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

function safeWriteFileSync(filepath, content) {
  let attempts = 0;
  while (attempts < 5) {
    try {
      fs.writeFileSync(filepath, content, 'utf-8');
      return;
    } catch (e) {
      attempts++;
      if (attempts >= 5) throw e;
      const start = Date.now();
      while (Date.now() - start < 100) {}
    }
  }
}

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

  const { period1yPath, period3yPath, periodAllPath } = paths;
  const { transactions1y, transactions3y, transactionsAll } = data;

  if (period1yPath && transactions1y) {
    const dir = path.dirname(period1yPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(period1yPath, JSON.stringify(transactions1y), 'utf-8');
    console.log(`📁 파일 생성: ${period1yPath}`);
  }

  if (period3yPath && transactions3y) {
    const dir = path.dirname(period3yPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(period3yPath, JSON.stringify(transactions3y), 'utf-8');
    console.log(`📁 파일 생성: ${period3yPath}`);
  }

  if (periodAllPath && transactionsAll) {
    const dir = path.dirname(periodAllPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(periodAllPath, JSON.stringify(transactionsAll), 'utf-8');
    console.log(`📁 파일 생성: ${periodAllPath}`);
  }
}

/**
 * public/tx-data 내 공백이 포함된 레거시 파일명 정리 및 정규화 마이그레이션
 * @param {string} txDataDir 
 */
function migrateLegacySpaceFiles(txDataDir) {
  if (!fs.existsSync(txDataDir)) return;
  try {
    const files = fs.readdirSync(txDataDir);
    for (const file of files) {
      if (!file.includes(' ') || !file.endsWith('.json')) continue;
      const oldPath = path.join(txDataDir, file);
      const isRecent = file.endsWith('-recent.json');
      const rawName = isRecent ? file.slice(0, -12) : file.slice(0, -5);
      let normName = normalizeAptName(rawName);
      if (!normName) continue;
      if (normName === '금호어울림레이크1차') {
        normName = '금호어울림레이크';
      }
      const newFileName = isRecent ? `${normName}-recent.json` : `${normName}.json`;
      const newPath = path.join(txDataDir, newFileName);

      if (fs.existsSync(newPath)) {
        try {
          const oldContent = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
          const newContent = JSON.parse(fs.readFileSync(newPath, 'utf8'));
          if (Array.isArray(oldContent) && Array.isArray(newContent) && oldContent.length > newContent.length) {
            fs.writeFileSync(newPath, JSON.stringify(oldContent), 'utf8');
          }
        } catch (e) {
          // ignore parse error
        }
        try { fs.unlinkSync(oldPath); } catch (e) {}
      } else {
        try { fs.renameSync(oldPath, newPath); } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('⚠️ 레거시 공백 파일 마이그레이션 중 경고:', err.message);
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
  } else if (!isFullSync) {
    // 증분 동기화 시 공백 포함 레거시 파일 정리 및 마이그레이션
    migrateLegacySpaceFiles(txDataDir);
  }

  let totalRecords = 0;
  let totalSizeKB = 0;
  let chunkCount = 0;

  // 대상 아파트 키를 공백 없는 정규화 키로 단일화 및 중복 제거
  const seenNormKeys = new Set();
  const normalizedTargetApts = [];
  for (const rawApt of targetApts) {
    let norm = normalizeAptName(rawApt);
    if (norm === '금호어울림레이크1차') norm = '금호어울림레이크';
    if (norm && !seenNormKeys.has(norm)) {
      seenNormKeys.add(norm);
      normalizedTargetApts.push(norm);
    }
  }

  for (const aptKey of normalizedTargetApts) {
    let txs = [];
    if (byApt[aptKey]) {
      txs.push(...byApt[aptKey]);
    }
    for (const [k, records] of Object.entries(byApt)) {
      if (k !== aptKey && Array.isArray(records)) {
        let normK = normalizeAptName(k);
        if (normK === '금호어울림레이크1차' || normK === '장지동금호어울림레이크1차') normK = '금호어울림레이크';
        if (normK === aptKey) {
          txs.push(...records);
        }
      }
    }

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

    // 파일명: 정규화된 아파트 키 사용 (${aptKey}.json)
    const filename = `${aptKey}.json`;
    const filepath = path.join(txDataDir, filename);
    const json = JSON.stringify(uniqueRecords);
    
    safeWriteFileSync(filepath, json);

    // 최근 거래 내역만 포함하는 경량 JSON 파일 생성 (최근 15건)
    const filenameRecent = `${aptKey}-recent.json`;
    const filepathRecent = path.join(txDataDir, filenameRecent);
    const jsonRecent = JSON.stringify(uniqueRecords.slice(0, 15));
    safeWriteFileSync(filepathRecent, jsonRecent);
    
    totalRecords += uniqueRecords.length;
    totalSizeKB += (json.length + jsonRecent.length) / 1024;
    chunkCount++;
  }

  // 인덱스 파일 생성: 공백 없는 정규화 키 목록을 저장
  safeWriteFileSync(
    path.join(txDataDir, '_index.json'),
    JSON.stringify(normalizedTargetApts)
  );

  return { chunkCount, totalRecords, totalSizeKB };
}

module.exports = {
  writeSummaryFiles,
  writeApartmentChunks
};

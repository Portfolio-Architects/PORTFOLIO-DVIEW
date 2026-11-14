import type {
  TechnoValleyJisan,
  JisanOfficeTransactionItem,
} from '@/lib/services/apartmentPageService';

export interface TechnoValleyPeerJisanItem {
  readonly jisan: TechnoValleyJisan;
  readonly slug: string;
  readonly displayLabel: string;
  readonly dong: string | null;
  readonly totalFloorAreaSqm: number;
  readonly totalFloorAreaLabel: string;
  readonly unitCount: number;
  readonly unitCountLabel: string;
  readonly statusLabel: string;
  readonly industryLabel: string;
  readonly latestSalePrice: string | null;
  readonly latestSaleDate: string | null;
  readonly latestSaleSizeSqM: number | null;
  readonly latestSalePriceRaw: number;
  readonly saleTxCount: number;
  readonly hasRealSaleTx: boolean;
}

export interface JisanQuickTaxPreviewResult {
  readonly purchasePriceManwon: number;
  readonly standardAcquisitionTaxManwon: number;
  readonly savedAcquisitionTaxManwon: number;
  readonly reducedAcquisitionTaxManwon: number;
  readonly estimatedFiveYearPropertyTaxSavedManwon: number;
  readonly sixYearCorporateTaxSavedManwon: number;
  readonly totalEstimatedSavedManwon: number;
}

function parsePositiveNum(val?: number | string | null): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function formatAreaLabel(sqm: number): string {
  if (sqm <= 0) return '면적 확인중';
  return `${sqm.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}㎡`;
}

function formatUnitsLabel(units: number): string {
  if (units <= 0) return '호실 미정';
  return `${units.toLocaleString('ko-KR')}실`;
}

function normalizeRoman(input: string): string {
  return input
    .replace(/[\u2162\u2172]/g, '3')
    .replace(/[\u2161\u2171]/g, '2')
    .replace(/[\u2160\u2170]/g, '1');
}

function normalizePhoneticKey(input: string): string {
  return normalizeRoman(input)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/지식산업센터/g, '')
    .replace(/주식회사|\(주\)/g, '')
    .replace(/타임스퀘어/g, 'timesquare')
    .replace(/스퀘어/g, 'square')
    .replace(/타워/g, 'tower')
    .replace(/센터/g, 'center')
    .replace(/아이티/g, 'it')
    .replace(/쓰리/g, '3')
    .replace(/투$/g, '2')
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/iii$/g, '3')
    .replace(/ii$/g, '2')
    .replace(/(square|tower|center)i$/g, '$11');
}

function normalizeCoreAliasKey(input: string): string {
  const phonetic = normalizePhoneticKey(input);
  if (!phonetic) return '';
  return phonetic
    .replace(/^(?:신동탄|동탄역|동탄2|동탄)/, '')
    .replace(/동탄$/, '')
    .replace(/center$/, '');
}

function parseJibunAddress(rawAddress?: string | null): {
  dong: string | null;
  lot: string | null;
} {
  if (!rawAddress) return { dong: null, lot: null };
  const dongAndLot = rawAddress.match(
    /([가-힣]+(?:동|리))\s+((?:산\s*)?\d+(?:-\d+)?)(?=번지|외|\s|$|,|\()/
  );
  if (dongAndLot) {
    return {
      dong: dongAndLot[1],
      lot: dongAndLot[2].replace(/\s+/g, ''),
    };
  }
  const dongOnly = rawAddress.match(/([가-힣]+(?:동|리))(?=\s|$|,|\()/);
  const bareLot = rawAddress.trim().match(/^((?:산\s*)?\d+(?:-\d+)?)(?:번지|외)?$/);
  if (bareLot) {
    return {
      dong: dongOnly ? dongOnly[1] : null,
      lot: bareLot[1].replace(/\s+/g, ''),
    };
  }
  return { dong: dongOnly ? dongOnly[1] : null, lot: null };
}

export function formatPeerJisanSlug(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, '-');
}

/**
 * Pure client/server-safe matcher for MOLIT verified commercial sale transactions (`RTMSDataSvcNrgTrade`).
 * Enforces DVIEW Strict Real Data Only: strictly excludes non-sale ('임대') records and zero/empty prices.
 */
export function matchJisanSaleTransactionsPure(
  jisan?: TechnoValleyJisan | null,
  transactions?: readonly JisanOfficeTransactionItem[] | null
): JisanOfficeTransactionItem[] {
  if (!jisan || !Array.isArray(transactions) || transactions.length === 0) return [];

  const targetPhonetic = normalizePhoneticKey(jisan.name);
  const targetCore = normalizeCoreAliasKey(jisan.name);
  const { dong: targetDong, lot: targetLot } = parseJibunAddress(jisan.jibunAddress);
  const dongBlockMatch = jisan.name.match(/([A-Ca-c])동/);
  const targetDongBlock = dongBlockMatch ? dongBlockMatch[1].toUpperCase() : null;
  const targetCoreWithoutBlock = targetDongBlock ? targetCore.replace(/[a-c]동$/, '') : targetCore;
  const isLegalOrBlockCenterName = /\(주\)|주식회사|블럭|BL/i.test(jisan.name);

  return transactions
    .filter((tx) => {
      if (!tx || tx.type === '임대') return false;
      if (!tx.price || tx.price === '0원') return false;

      const { dong: txDong, lot: txLot } = parseJibunAddress(tx.jibun);
      if (targetDong && txDong && targetDong !== txDong) return false;

      const txBuilding = (tx.buildingName || '').trim();
      if (targetDongBlock) {
        if (txBuilding) {
          const txDongMatch = txBuilding.match(/([A-Ca-c])동/);
          if (txDongMatch && txDongMatch[1].toUpperCase() !== targetDongBlock) return false;
        }
        if (targetLot && txLot && txLot !== targetLot) return false;
      }

      const isGenericBuildingName =
        !txBuilding ||
        txBuilding === '미상 건물' ||
        txBuilding === '지식산업센터' ||
        txBuilding === '-';

      if (!isGenericBuildingName) {
        const txPhonetic = normalizePhoneticKey(txBuilding);
        if (txPhonetic && targetPhonetic && txPhonetic === targetPhonetic) return true;

        const txCore = normalizeCoreAliasKey(txBuilding);
        if (txCore.length >= 3 && targetCore.length >= 3 && txCore === targetCore) return true;

        if (
          (targetCore === '금강펜테리움ixtower' && txCore === '금강ixtower') ||
          (targetCore === '현대실리콘앨리' && txCore === '실리콘앨리') ||
          (targetCore === 'shtimesquare1' && txCore === 'shtimesquare')
        ) {
          return true;
        }

        if (
          targetDongBlock &&
          txCore.length >= 3 &&
          txCore === targetCoreWithoutBlock &&
          targetLot &&
          txLot === targetLot
        ) {
          return true;
        }

        if (isLegalOrBlockCenterName && targetLot && txLot && txLot === targetLot) {
          return true;
        }

        return false;
      }

      return Boolean(targetLot && txLot && txLot === targetLot);
    })
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
}

/**
 * Deterministically selects comparable nearby/similar Knowledge Industry Centers for `/technovalley` bounce defense.
 * Prioritizes centers with verified MOLIT sale records, same legal dong, comparable floor-area scale, and completed status.
 * Never fabricates or estimates commercial sale/rent figures.
 */
export function selectPeerTechnoValleyJisans(
  targetJisan: TechnoValleyJisan | null | undefined,
  jisanList: readonly TechnoValleyJisan[] | null | undefined,
  allTransactions?: readonly JisanOfficeTransactionItem[] | null,
  maxCount: number = 4
): TechnoValleyPeerJisanItem[] {
  if (!Array.isArray(jisanList) || jisanList.length === 0 || maxCount <= 0) return [];

  const targetNameNorm = targetJisan?.name ? normalizePhoneticKey(targetJisan.name) : '';
  const targetSeq = targetJisan?.seq;
  const targetDong =
    parseJibunAddress(targetJisan?.jibunAddress).dong ||
    parseJibunAddress(targetJisan?.roadAddress).dong;
  const targetArea = parsePositiveNum(targetJisan?.totalFloorArea);

  const scored = jisanList
    .filter((item) => {
      if (!item || !item.name?.trim()) return false;
      if (targetSeq !== undefined && item.seq !== undefined && item.seq === targetSeq) {
        return false;
      }
      if (targetNameNorm && normalizePhoneticKey(item.name) === targetNameNorm) {
        return false;
      }
      return true;
    })
    .map((candidate) => {
      const matchedTxs = matchJisanSaleTransactionsPure(candidate, allTransactions);
      const latestTx = matchedTxs.length > 0 ? matchedTxs[0] : null;
      const candArea = parsePositiveNum(candidate.totalFloorArea);
      const candUnits = Math.floor(parsePositiveNum(candidate.unitCount));
      const candDong =
        parseJibunAddress(candidate.jibunAddress).dong ||
        parseJibunAddress(candidate.roadAddress).dong;
      const statusRaw = (candidate.buildingStatus || candidate.status || '승인').trim();
      const isCompleted = /준공|완료/.test(statusRaw);

      let score = 0;
      if (matchedTxs.length > 0) {
        score += 400 + Math.min(80, matchedTxs.length * 8);
      }
      if (targetDong && candDong && targetDong === candDong) {
        score += 240;
      }
      if (targetArea > 0 && candArea > 0) {
        const diffRatio = Math.abs(candArea - targetArea) / Math.max(targetArea, candArea);
        score += Math.round(150 * (1 - Math.min(1, diffRatio)));
      } else if (candArea > 0) {
        score += Math.min(120, Math.round(candArea / 1500));
      }
      if (isCompleted) {
        score += 90;
      }
      if (candUnits > 0) {
        score += Math.min(60, Math.round(candUnits / 25));
      }

      const trimmedName = candidate.name.trim();
      const displayLabel = trimmedName.replace(/\s*지식산업센터$/, '');
      const latestPriceRaw =
        latestTx?.priceRaw && Number.isFinite(latestTx.priceRaw) && latestTx.priceRaw > 0
          ? latestTx.priceRaw
          : 0;

      const peerItem: TechnoValleyPeerJisanItem = {
        jisan: candidate,
        slug: formatPeerJisanSlug(trimmedName),
        displayLabel,
        dong: candDong,
        totalFloorAreaSqm: candArea,
        totalFloorAreaLabel: formatAreaLabel(candArea),
        unitCount: candUnits,
        unitCountLabel: formatUnitsLabel(candUnits),
        statusLabel: statusRaw,
        industryLabel: candidate.representativeBusiness?.trim() || '제조·IT',
        latestSalePrice: latestTx?.price || null,
        latestSaleDate: latestTx?.date || null,
        latestSaleSizeSqM:
          typeof latestTx?.sizeSqM === 'number' && latestTx.sizeSqM > 0
            ? latestTx.sizeSqM
            : null,
        latestSalePriceRaw: latestPriceRaw,
        saleTxCount: matchedTxs.length,
        hasRealSaleTx: matchedTxs.length > 0,
      };

      return { peerItem, score };
    });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.peerItem.totalFloorAreaSqm !== a.peerItem.totalFloorAreaSqm) {
      return b.peerItem.totalFloorAreaSqm - a.peerItem.totalFloorAreaSqm;
    }
    return a.peerItem.slug.localeCompare(b.peerItem.slug, 'ko');
  });

  return scored.slice(0, maxCount).map((entry) => entry.peerItem);
}

/**
 * Pure statutory tax reduction calculator for Knowledge Industry Center acquisition & relocation.
 * - Acquisition Tax (지방세특례제한법 제58조의2): 35% reduction off standard 4.6% rate
 * - Property Tax (지방세특례제한법 제58조의2): 35% reduction for 5 years
 * - Corporate/Income Tax (조세특례제한법 제63조): 4 years 100% + 2 years 50% (= 5x annual tax) when relocating from overconcentrated capital zone
 */
export function computeJisanQuickTaxSummary(
  purchasePriceManwon: number,
  existingLocation: 'overconcentrated' | 'other' = 'overconcentrated',
  annualCorpTaxManwon: number = 5000
): JisanQuickTaxPreviewResult {
  const safePrice =
    Number.isFinite(purchasePriceManwon) && purchasePriceManwon > 0
      ? Math.round(purchasePriceManwon)
      : 30000;
  const safeCorpTax =
    Number.isFinite(annualCorpTaxManwon) && annualCorpTaxManwon > 0
      ? Math.round(annualCorpTaxManwon)
      : 0;

  const standardAcquisitionTaxManwon = Math.round(safePrice * 0.046);
  const savedAcquisitionTaxManwon = Math.round(standardAcquisitionTaxManwon * 0.35);
  const reducedAcquisitionTaxManwon = Math.max(
    0,
    standardAcquisitionTaxManwon - savedAcquisitionTaxManwon
  );

  // Statutory property tax approximation (~0.25% effective annual tax on purchase price -> 35% saved for 5 years)
  const estimatedAnnualPropTaxManwon = Math.max(20, Math.round(safePrice * 0.0025));
  const estimatedFiveYearPropertyTaxSavedManwon = Math.round(
    estimatedAnnualPropTaxManwon * 0.35 * 5
  );

  const sixYearCorporateTaxSavedManwon =
    existingLocation === 'overconcentrated' ? safeCorpTax * 5 : 0;

  const totalEstimatedSavedManwon =
    savedAcquisitionTaxManwon +
    estimatedFiveYearPropertyTaxSavedManwon +
    sixYearCorporateTaxSavedManwon;

  return {
    purchasePriceManwon: safePrice,
    standardAcquisitionTaxManwon,
    savedAcquisitionTaxManwon,
    reducedAcquisitionTaxManwon,
    estimatedFiveYearPropertyTaxSavedManwon,
    sixYearCorporateTaxSavedManwon,
    totalEstimatedSavedManwon,
  };
}

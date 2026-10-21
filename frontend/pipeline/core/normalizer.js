/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * CommonJS export of normalizer for Node.js scripts
 */
const typeMapDataJson = require('../../public/data/type-map.json');

function normalizeAptName(name) {
  if (name === null || name === undefined) return '';
  const parsed = typeof name === 'string' ? name : String(name || '');
  if (!parsed) return '';

  return parsed
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/\.{2,}/g, '')
    .replace(/\.+$/, '')
    .trim();
}

function isCancelledTransaction(t) {
  if (!t || typeof t !== 'object') return false;
  if (t.isCanceled === true) return true;
  if (t.cdealType === 'O' || t.cdealType === '해제') return true;

  const isInvalidDate = (v) => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim().toLowerCase();
    return !s || s === '-' || s === 'null' || s === 'undefined' || s === 'nan';
  };

  if (!isInvalidDate(t.cancelDate)) return true;
  if (!isInvalidDate(t.cdealDay)) return true;
  if (!isInvalidDate(t.cancelDealDay)) return true;

  return false;
}

function generateCanonicalTxKey(tx) {
  if (!tx || typeof tx !== 'object') return '';

  const normApt = normalizeAptName(tx.aptName);
  const rawDate = String(tx.dealDate || '').replace(/\D/g, '');
  const cleanDate = rawDate.padEnd(8, '0').slice(0, 8);
  const numArea = Number(tx.area) || 0;
  const cleanArea = numArea.toFixed(2);
  const cleanFloor = Number(tx.floor) || 0;
  const cleanPrice = Number(tx.price) || 0;
  const rawDealType = typeof tx.dealType === 'string' ? tx.dealType.trim() : '';
  const cleanDealType = (rawDealType === '전세' || rawDealType === '월세') ? rawDealType : '매매';

  return `TX_${normApt}_${cleanDate}_${cleanArea}_${cleanFloor}_${cleanPrice}_${cleanDealType}`;
}

const HARDCODED_MAPPING = {
  '능동숲속마을광명메이루즈': '동탄숲속마을광명메이루즈',
  '능동숲속마을모아미래도1단지': '동탄숲속마을모아미래도1단지',
  '능동숲속마을모아미래도2단지': '동탄숲속마을모아미래도2단지',
  '능동숲속마을자연앤데시앙': '자연앤데시앙',
  '능동푸른마을두산위브': '푸른마을두산위브',
  '능동푸른마을모아미래도': '푸른마을모아미래도',
  '능동푸른마을신일해피트리': '동탄푸른마을신일해피트리',
  '능동푸른마을포스코더샵2차': '포스코더샵2차',
  '능동역경남아너스빌': '동탄숲속마을자연앤경남아너스빌1124-0',
  '능동역센트럴경남아너스빌': '동탄숲속마을자연앤경남아너스빌1115-0',
  '능동역숲속마을리체더포레스트': '동탄숲속마을능동역리체더포레스트',
  '능동역이지더원': '능동마을이지더원',
  '동탄역롯데캐슬알바트로스': '롯데캐슬알바트로스',
  '동탄역시범금강펜테리움센트럴파크Ⅲ': '동탄역시범금강펜테리움센트럴파크3',
  '동탄역시범대원칸타빌': '동탄역시범대원칸타빌아파트',
  '동탄역시범더샵센트럴시티': '더샵센트럴시티',
  '동탄역시범리슈빌': '동탄역시범리슈빌아파트',
  '동탄역시범반도유보라아이비파크4.0': '시범반도유보라아이비파크4.0',
  '동탄역시범예미지': '동탄역시범예미지아파트',
  '동탄역시범우남퍼스트빌': '동탄역시범우남퍼스트빌아파트',
  '동탄역KCC스위첸': 'KCC스위첸아파트',
  '송동린스트라우스더레이크': '동탄린스트라우스더레이크',
  '송동하우스디더레이크': '동탄2하우스디더레이크',
  '동탄역삼정그린코아더베스트': '동탄역삼정그린코아',
  '여울동금강펜테리움센트럴파크': '동탄2신도시금강펜테리움센트럴파크1',
  '동탄2신도시금강펜테리움센트럴파크Ⅰ': '동탄2신도시금강펜테리움센트럴파크1',
  '여울동반도유보라아이비파크3.0': '반도유보라아이비파크3',
  '여울동센트럴힐즈': '화성동탄2센트럴힐즈동탄아파트',
  '장지동금호어울림레이크': '금호어울림레이크',
  '장지동금호어울림레이크2차': '금호어울림레이크2차',
  '장지동아이파크1단지': '동탄2아이파크1단지',
  '장지동아이파크2단지': '동탄2아이파크2단지',
  '장지동제일풍경채에듀앤파크': '제일풍경채에듀앤파크',
  '장지동호반베르디움': '동탄2신도시호반베르디움33단지',
  '신동디에트르포레': '동탄2디에트르포레',
  '목동금강펜테리움센트럴파크4차': '동탄금강펜테리움센트럴파크4',
  '동탄금강펜테리움센트럴파크Ⅳ': '동탄금강펜테리움센트럴파크4',
  '목동동원로얄듀크2차': '동탄동원로얄듀크2차',
  '목동르파비스': '르파비스',
  '목동베라체': '동탄2신도시베라체',
  '목동한신더휴': '한신더휴',
  '목동호반베르디움2차': '동탄2신도시호반베르디움22단지',
  '목동호반베르디움센트럴포레': '호반베르디움센트럴포레',
  '목동힐스테이트': '힐스테이트동탄',
  '목동e편한세상': '이편한세상동탄',
  '산척동그린힐반도유보라아이비파크10': '그린힐반도유보라아이비파크101단지',
  '산척동더레이크파크뷰': '더레이크시티부영1단지',
  '산척동더레이크팰리스': '동탄더레이크팰리스',
  '산척동더레이크시티부영2단지': '더레이크시티부영2단지',
  '산척동더샵레이크에듀타운': '동탄더샵레이크에듀타운',
  '산척동레이크힐반도유보라아이비파크10.2': '레이크힐반도유보라아이비파크10.2',
  '산척동서희스타힐스엔에이치에프': '서희스타힐스엔에이치에프',
  '산척동중흥에스클래스에듀하이': '중흥에스클래스에듀하이',
  '호수공원금강펜테리움센트럴파크Ⅱ': '산척동동탄호수공원금강펜테리움센트럴파크2',
  '호수공원금강펜테리움센트럴파크2': '산척동동탄호수공원금강펜테리움센트럴파크2',
  '산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ': '산척동동탄호수공원금강펜테리움센트럴파크2',
  '동탄호수공원자연&자이': '동탄호수공원자연앤자이',
  '호수공원역레이크시티': '더레이크시티부영6단지',
  '호수공원역센트리체': '더레이크시티부영5단지',
  '동탄역센트럴자이': '동탄역센트럴자이A-10',
  '동탄역힐스테이트': '힐스테이트동탄역',
  '영천동동원로얄듀크포레4차': '동탄2신도시4차동원로얄듀크포레',
  '영천동파크자이': '동탄파크자이',
  '영천동파크푸르지오': '동탄파크푸르지오',
  '나루마을동탄역유보라여울숲1.0': '동탄나루마을동탄역U.BORA여울숲1.0',
  '나루마을동탄역유보라여울숲2.0': '나루마을월드메르디앙반도유보라',
  '반송동나루마을신도브래뉴': '나루마을신도브래뉴',
  '반송동나루마을한화꿈에그린': '나루마을한화꿈에그린',
  '반송동나루마을한화꿈에그린우림필유': '나루마을한화꿈에그린우림필유',
  '반송동메타폴리스': 'METAPOLIS',
  '반송동센트럴포레스트': '동탄센트럴포레스트',
  '반송동솔빛마을경남아너스빌': '솔빛마을경남아너스빌',
  '반송동솔빛마을서해그랑블': '솔빛마을서해그랑블',
  '반송동솔빛마을신도브래뉴': '솔빛마을신도브래뉴',
  '반송동솔빛마을쌍용예가': '솔빛마을쌍용예가',
  '반송동시범다은마을동탄포스코더샵': '시범다은마을포스코더샵',
  '반송동시범다은마을메타역롯데캐슬': '동탄시범다은마을메타역롯데캐슬',
  '반송동시범다은마을삼성래미안': '시범다은마을삼성래미안',
  '반송동시범다은마을센트럴파크뷰': '동탄시범다은마을센트럴파크뷰',
  '반송동시범다은마을우남퍼스트빌': '시범다은마을우남퍼스트빌',
  '반송동시범다은마을월드메르디앙': '동탄시범다은마을월드메르디앙반도유보라',
  '반송동시범한빛마을금호어울림': '시범한빛마을금호어울림',
  '반송동시범한빛마을삼부르네상스': '시범한빛마을삼부르네상스',
  '반송동시범한빛마을아이파크': '시범한빛마을동탄아이파크',
  '반송동시범한빛마을한화꿈에그린': '시범한빛마을한화꿈에그린',
  '반송동시범한빛마을KCC스위첸': '시범한빛마을케이씨씨스위첸',
  '석우동예당마을롯데캐슬': '롯데캐슬',
  '석우동예당마을신일유토빌': '신일유토빌',
  '석우동예당마을우미린제일풍경채': '우미린제일풍경채',
  '예당마을푸르지오': '푸르지오',
  '그린힐반도유보라아이비파크10.0': '그린힐반도유보라아이비파크101단지',
  '레이크힐반도유보라아이비파크10.0': '레이크힐반도유보라아이비파크10.2',
  '동탄풍성신미주': '동탄역신미주',
  '금호어울림레이크1차': '금호어울림레이크',
  '장지동금호어울림레이크1차': '금호어울림레이크',
  '금호어울림 레이크 1차': '금호어울림레이크',
  '동탄호수공원금호어울림레이크1차': '금호어울림레이크',
  '동탄역동원로얄듀크비스타': '동탄역동원로얄듀크비스타3차',
  '동탄2LH26단지': '동탄2엘에이치26단지아파트에이65블록',
  '동탄2신도시동탄역디에트르': '동탄2신도시동탄역디에트르퍼스티지',
  '센트럴SE타운': '센트럴S타운',
  '동탄신도시금강펜테리움6차': '금강펜테리움6차센트럴파크',
  '동탄신도시금강펜테리움7차': '동탄신도시금강펜테리움7차센트럴파크',
  '화성동탄2제일풍경채퍼스트': '제일풍경채퍼스티어',
  '동탄역금강펜테리움더시티': '동탄역금강펜테리움더시글로',
  '동탄호수공원계룡리슈빌': '동탄호수공원리슈빌',
  '동탄스카이뷰': '동탄스카이뷰빌딩',
  '동탄현대하이페리온': '동탄하이페리온',
  '에스원센트로벨': '동탄에스원센트로빌',
  '동탄파크릭스A51-1BL': '동탄파크릭스A51-1BL아파트',
  '동탄파크릭스A51-2BL': '동탄파크릭스A51-2BL아파트',
  '동탄파크릭스A52BL': '동탄파크릭스A52BL아파트',
  '동탄파크릭스A55BL': '동탄파크릭스A55BL아파트',
  '숨마데시앙': '동탄숨마데시앙',
  '아테라파밀리에': '동탄아테라파밀리에',
  '새강마을휴먼시아5단지2': '새강마을휴먼시아5단지',
  '서해더블루': '서해더블루106-7',
  '서해더블루90-2번지': '서해더블루90-2',
  '서해더블루93-8번지': '서해더블루93-8',
  '동탄2신도시동원로얄듀크': '동탄역동원로얄듀크1차',
  '동탄시범다은마을메타역세권': '동탄시범다은마을메타역롯데캐슬',
  '동탄시범다은마을센트럴힐': '동탄시범다은마을센트럴파크뷰',
  '시범나루마을동탄역UBO': '동탄나루마을동탄역U.BORA여울숲1.0',
};

const typeMapLookup = {};
for (const item of typeMapDataJson) {
  if (!item.aptName || !item.area) continue;
  const normApt = normalizeAptName(item.aptName);
  const sanApt = sanitizeAptKey(item.aptName);
  if (!typeMapLookup[normApt]) {
    typeMapLookup[normApt] = {};
  }
  if (sanApt && !typeMapLookup[sanApt]) {
    typeMapLookup[sanApt] = {};
  }

  let pyeong = null;
  if (item.typeM2) {
    const match = item.typeM2.match(/\d+(\.\d+)?/);
    if (match) {
      pyeong = Math.round(parseFloat(match[0]) * 0.3025 * 10) / 10;
    }
  }
  if (pyeong === null && item.typePyeong) {
    const match = item.typePyeong.match(/\d+(\.\d+)?/);
    if (match) {
      pyeong = Math.round(parseFloat(match[0]) * 10) / 10;
    }
  }
  if (pyeong !== null) {
    typeMapLookup[normApt][item.area] = pyeong;
    if (sanApt) {
      typeMapLookup[sanApt][item.area] = pyeong;
    }
  }
}

for (const [aliasKey, targetVal] of Object.entries(HARDCODED_MAPPING)) {
  const normAlias = normalizeAptName(aliasKey);
  const sanAlias = sanitizeAptKey(aliasKey);
  const normTarget = normalizeAptName(targetVal);
  const sanTarget = sanitizeAptKey(targetVal);
  const targetEntry = typeMapLookup[normTarget] || (sanTarget ? typeMapLookup[sanTarget] : undefined);
  const aliasEntry = typeMapLookup[normAlias] || (sanAlias ? typeMapLookup[sanAlias] : undefined);

  if (targetEntry && !aliasEntry) {
    if (normAlias) typeMapLookup[normAlias] = targetEntry;
    if (sanAlias) typeMapLookup[sanAlias] = targetEntry;
  } else if (aliasEntry && !targetEntry) {
    if (normTarget) typeMapLookup[normTarget] = aliasEntry;
    if (sanTarget) typeMapLookup[sanTarget] = aliasEntry;
  }
}

function getSupplyPyeong(aptName, area, externalTypeMap) {
  if (!area || isNaN(area)) return 0;

  const normApt = normalizeAptName(aptName);
  const sanApt = sanitizeAptKey(aptName);
  const mappedApt =
    HARDCODED_MAPPING[normApt] ||
    (sanApt ? HARDCODED_MAPPING[sanApt] : undefined) ||
    (aptName ? HARDCODED_MAPPING[aptName] : undefined);
  const sanMappedApt = mappedApt ? sanitizeAptKey(mappedApt) : undefined;

  if (externalTypeMap && typeof externalTypeMap === 'object') {
    const extEntry =
      externalTypeMap[normApt] ||
      (sanApt ? externalTypeMap[sanApt] : undefined) ||
      (mappedApt ? externalTypeMap[mappedApt] : undefined) ||
      (sanMappedApt ? externalTypeMap[sanMappedApt] : undefined) ||
      (aptName ? externalTypeMap[aptName] : undefined);
    if (extEntry) {
      const exactKey = String(area);
      if (extEntry[exactKey] !== undefined) {
        return extEntry[exactKey];
      }
      for (const [keyStr, val] of Object.entries(extEntry)) {
        const keyNum = parseFloat(keyStr);
        if (!isNaN(keyNum) && Math.abs(keyNum - area) < 0.11) {
          return val;
        }
      }
    }
  }

  const aptEntry =
    typeMapLookup[normApt] ||
    (sanApt ? typeMapLookup[sanApt] : undefined) ||
    (mappedApt ? typeMapLookup[mappedApt] : undefined) ||
    (sanMappedApt ? typeMapLookup[sanMappedApt] : undefined) ||
    (aptName ? typeMapLookup[aptName] : undefined);

  if (aptEntry) {
    const exactKey = String(area);
    if (aptEntry[exactKey] !== undefined) {
      return aptEntry[exactKey];
    }

    for (const [keyStr, val] of Object.entries(aptEntry)) {
      const keyNum = parseFloat(keyStr);
      if (!isNaN(keyNum) && Math.abs(keyNum - area) < 0.11) {
        return val;
      }
    }
  }

  return Math.round(area * 0.3025 * 1.33 * 10) / 10;
}

function sanitizeAptKey(name) {
  if (!name) return '';
  const normalized = normalizeAptName(name);

  return normalized
    .replace(/Ⅰ/g, '1')
    .replace(/Ⅱ/g, '2')
    .replace(/Ⅲ/g, '3')
    .replace(/Ⅳ/g, '4')
    .replace(/&/g, '앤')
    .replace(/,/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\.{2,}/g, '')
    .replace(/\.+$/, '')
    .trim();
}

function sanitizeAptChunkFileName(rawFileName) {
  if (!rawFileName) return '';
  const isRecent = rawFileName.endsWith('-recent.json');
  const baseName = isRecent
    ? rawFileName.slice(0, -12)
    : (rawFileName.endsWith('.json') ? rawFileName.slice(0, -5) : rawFileName);

  const cleanBase = sanitizeAptKey(baseName);
  if (!cleanBase) return '';

  return isRecent ? `${cleanBase}-recent.json` : `${cleanBase}.json`;
}

module.exports = {
  HARDCODED_MAPPING,
  normalizeAptName,
  isCancelledTransaction,
  generateCanonicalTxKey,
  getSupplyPyeong,
  sanitizeAptKey,
  sanitizeAptChunkFileName,
};

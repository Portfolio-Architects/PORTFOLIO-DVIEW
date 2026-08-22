# 🌐 [D-VIEW] Dongtan Hyperlocal All-in-One Super-App Architectural Survey & Engineering Analysis

> **Target**: Comprehensive Analysis of the 5 Core Domains for D-VIEW Super-App Transformation  
> **Date**: 2026-08-22 | **Author**: Explorer 1 (Architecture & Engineering Report Explorer)  
> **Status**: Comprehensive Forensic Survey Complete  

---

## 1. Executive Summary & Strategic Mission

### 1.1. Transformation of Service Objective Function
The D-VIEW (디뷰) platform is officially advancing from its original formulation as a **"Real Estate & Techno-Valley Vacancy Intelligence Hub"** into the **"Dongtan Hyperlocal All-in-One Super-App (동탄 올인원 하이퍼로컬 슈퍼앱)"**.

- **Core User Persona**:
  1. **Dongtan 3040 Families**: Residents with young children demanding high-clarity data on elementary school walking safety (초품아), academy clusters, park/trail facilities, cultural festivals (루나쇼), and family-friendly dining.
  2. **K-Semiconductor Cluster Tech Workers & Executives**: Engineers, researchers, and suppliers working across Samsung Electronics (Giheung, Hwaseong, Pyeongtaek Campuses) and the Dongtan Techno Valley (56 Knowledge Industry Centers, 2,500+ tech enterprises).
  3. **Real Estate Seekers & Investors**: End-users seeking zero-jank, factual real estate valuations (Utility Score, Real PER, Gap Investment radar, Jeonse safety score).

### 1.2. The 5 Core Domain Vectors
```
                                 ┌────────────────────────────────────────────────────────┐
                                 │     D-VIEW Dongtan Hyperlocal All-in-One Super-App     │
                                 └───────────────────────────┬────────────────────────────┘
                                                             │
        ┌──────────────────┬──────────────────┬──────────────┴─────┬──────────────────┬──────────────────┐
        ▼                  ▼                  ▼                    ▼                  ▼                  ▼
  ┌───────────┐      ┌───────────┐      ┌───────────┐        ┌───────────┐      ┌───────────┐      ┌───────────┐
  │ 1. Real   │      │ 2. Stocks │      │ 3. Running│        │ 4. Events │      │ 5. Dining │      │ 6. Monet- │
  │   Estate  │      │ & Semi Ind│      │ & Trails  │        │ & Culture │      │ & Hotplace│      │  ization  │
  └───────────┘      └───────────┘      └───────────┘        └───────────┘      └───────────┘      └───────────┘
   - 179 Complexes    - Samsung Elec     - Lake Park 4.5km    - Luna Show D-Day  - Yeongcheon 11-ja  - AdSense
   - MOLIT API        - K-Semiconductor  - Chidongcheon 6.2km - HCF Art Festivals- Lake Como Terrace - B2B CPA
   - PER / Utility    - Global Anchors   - Sinricheon 5.8km   - Dong 1~9 Classes - Karilm Avenue     - Local Ads
   - 초품아 300m       - DART / Quotes    - Banseoksan Trek    - Push Alerts      - Family / Kids     - Career/Relo
```

---

## 2. Deep-Dive Domain Architecture & Data Pipelines

### 2.1. Domain 1: Real Estate (부동산 인텔리전스)

#### Current Status & Strengths
- **Dataset Coverage**: 179 apartment complexes across Dongtan 1 & 2 New Towns.
- **Data Pipelines**:
  - `fetch-transactions.js` & `fetch-rent.js`: MOLIT OpenAPI (`RTMSDataSvcAptTradeDev`, `RTMSDataSvcAptRent`) with XML/JSON hybrid parsers and exponential backoff retry.
  - `sync-transactions.js`: Outlier filtering, macro trend calculation, and static JSON synthesis (`public/tx-data/*.json`, `recent-transactions.json`, `macro-trend.json`).
  - Google Sheets SSOT (`location-scores.json`, `apartments-by-dong.json`) synchronized via incremental update algorithms.
- **Valuation & Analytics Algorithms**:
  - **Utility Score**: Formula based on 500m exact walking distance to infra (Elementary School 300m weight 35%, SRT/GTX Station weight 25%, Commercial Anchor weight 20%, Park/Green weight 20%).
  - **Real Estate PER & Relative Value**: Ratio of purchase price to actual living utility yield.
  - **Chopooma Curation (`ChopoomaCuration.tsx`)**: 300m walking radius filter, crosswalk count, and pedestrian safety index.
  - **Gap Investment Explorer (`GapInvestmentExplorer.tsx`)**: Real-time Jeonse ratio ranking and risk assessment.

#### Super-App High-Density Expansion
- **Neighborhood Lifestyle Cross-Linking**: Inject nearest trail access points, Luna show visibility rating, and local dining hubs directly into the Apartment Modal (`ApartmentModal.tsx`) and SSR detail page (`/apartment/[aptName]`).
- **AI Morning Briefing**: Daily Cron summary of yesterday's new contract highs/lows and price trajectory.

---

### 2.2. Domain 2: Stocks & Industry (반도체 클러스터 주식 및 산업)

#### Strategic Context
Dongtan is the geopolitical center of South Korea's Mega Semiconductor Cluster, surrounded by:
- **Samsung Electronics**: Giheung Campus (R&D, Foundry), Hwaseong Campus (Memory, EUV V1 line), Pyeongtaek Campus (Fab 1~4).
- **Dongtan Techno Valley (56 Jisan Buildings, 2,500+ Tech Firms)**: Houses Asia/Korea headquarters and R&D centers of global semiconductor leaders (ASML, ASM Korea, Applied Materials, Tokyo Electron) alongside key domestic 소부장 (Materials, Parts, Equipment) market leaders.

#### Core Entity Matrix & Stock Ticker Mapping
| 분류 | 기업명 | 종목코드 / 구분 | 동탄/인근 거점 위치 | 사업 분야 및 밸류체인 핵심 |
|:---|:---|:---:|:---|:---|
| **소자/파운드리** | **삼성전자** | `005930.KS` | 화성/기흥/평택 캠퍼스 | 글로벌 1위 메모리(DRAM/NAND) & 첨단 파운드리 |
| **글로벌 장비 4대장** | **ASML 코리아** | Global / NASDAQ | 동탄2 화성 뉴캠퍼스 (자사빌딩) | 첨단 EUV / DUV 노광 장비 독점 공급 |
| **글로벌 장비 4대장** | **ASM 코리아** | Global / Euronext | 동탄기흥로 자사 연구제조빌딩 | 원자층증착(ALD) 및 첨단 에피택시 장비 |
| **글로벌 장비 4대장** | **어플라이드 머티리얼즈** | Global / NASDAQ | 동탄기흥로 R&D 센터 | 글로벌 1위 반도체 종합 전공정 장비 (증착/식각) |
| **글로벌 장비 4대장** | **도쿄일렉트론코리아** | Global / TYO | 금강펜테리움 IX타워 | 트랙, 식각, 세정 및 가스 화학 증착 장비 |
| **국내 소부장 챔피언** | **케이씨텍 (KC Tech)** | `029460.KS` | 동탄기흥로 자사빌딩 | CMP(평탄화) 장비 및 반도체/디스플레이 세정 장비 |
| **국내 소부장 챔피언** | **에스앤에스텍** | `101490.KQ` | 금강펜테리움 IX타워 / 화성 | 블랭크마스크 및 EUV 펠리클 선도 개발 |
| **국내 소부장 챔피언** | **원익IPS** | `240810.KQ` | 기흥/동탄 권역 | ALD, CVD 증착 장비 및 열처리 솔루션 |
| **국내 소부장 챔피언** | **동진쎄미켐** | `005290.KQ` | 화성 발안/동탄 밸류체인 | 극자외선(EUV) 및 ArF 포토레지스트(감광액) 국산화 |
| **국내 소부장 챔피언** | **HPSP** | `403870.KQ` | 화성/동탄 테크노밸리 | 고압 수소 어닐링(High-Pressure Annealing) 독점 |
| **국내 소부장 챔피언** | **주성엔지니어링** | `036930.KQ` | 광주/용인/동탄 권역 | 차세대 원자층증착(ALD) 장비 |
| **중고장비/유통** | **서플러스글로벌** | `140070.KQ` | 동탄대로 자사빌딩 / 용인 | 반도체 레거시 중고 장비 유통 및 클러스터 |
| **바이오/신약** | **한미약품 연구센터** | `128940.KS` | 동탄대로 자사연구센터 | 신약 개발 R&D 및 바이오의약품 플랫폼 |
| **바이오/비임상** | **우정바이오** | `215380.KQ` | 동탄기흥로 신약클러스터 | 신약 개발 비임상 CRO 및 바이오 인큐베이팅 |

#### Technical Data Pipeline Design
1. **Financial Quotes Pipeline**:
   - Source: KIS (한국투자증권) OpenAPI / KRX / Yahoo Finance RSS.
   - Cache Architecture: SWR Stale-While-Revalidate with 60-second TTL during KST market hours (09:00~15:30), static L2 cache outside trading hours.
2. **DART Open API (전자공시)**:
   - Automated ingestion of quarterly filings, CAPEX facility investments, and dividend disclosures.
3. **NPS & Industrial Dynamics**:
   - `nps_stats.json` integration tracking monthly employee hiring/departure net changes for Dongtan Techno Valley.
4. **Relocation Tax Simulator & SOHO Matching**:
   - Complete municipal tax reduction calculator (Acquisition Tax -50%, Property Tax -37.5%, Corporate Tax -100% for 5 years) for businesses moving from Seoul Over-Concentration Control Zones.

---

### 2.3. Domain 3: Running & Trails (러닝 및 산책 코스)

#### The 5 Signature Theme Trails of Dongtan
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        동탄 대표 5대 테마 러닝 & 산책 코스 메트릭스                      │
├────────────────────────┬─────────┬────────┬────────┬────────────────┬─────────────────┤
│ 코스명                  │ 실측거리 │ 난이도 │ 노면   │ 주요 랜드마크   │ 편의시설        │
├────────────────────────┼─────────┼────────┼────────┼────────────────┼─────────────────┤
│ 1. 동탄호수공원 순환     │ 4.5 km  │ ★☆☆☆☆  │ 우레탄 │ 루나쇼 수변무대 │ 화장실 3, 음수대 │
│    (Lake Park Loop)    │         │ (초급)  │ 데크로드│ 레이크꼬모      │ 주차장 3개소    │
├────────────────────────┼─────────┼────────┼────────┼────────────────┼─────────────────┤
│ 2. 치동천 힐링 수변트랙  │ 6.2 km  │ ★★☆☆☆  │ 친환경 │ 테크노밸리 연계 │ 화장실 4, 쉼터  │
│    (Chidongcheon Trail)│         │ (초중급)│ 탄성포장│ 11자 상가 수변  │ 자전거 거치대   │
├────────────────────────┼─────────┼────────┼────────┼────────────────┼─────────────────┤
│ 3. 신리천 자연생태길    │ 5.8 km  │ ★★☆☆☆  │ 마사토 │ 신리천 물놀이장 │ 화장실 3, 벤치  │
│    (Sinricheon Trail)  │         │ (초중급)│ 아스콘 │ 카페거리 수변   │ 어린이 놀이시설 │
├────────────────────────┼─────────┼────────┼────────┼────────────────┼─────────────────┤
│ 4. 반석산 숲속 트레킹   │ 3.7 km  │ ★★★☆☆  │ 흙길   │ 반석산 에코스쿨 │ 화장실 2, 쉼터  │
│    (Banseoksan Forest) │ (+85m)  │ (중급)  │ 목재계단│ 노작홍사용문학관│ 흙먼지 털이기   │
├────────────────────────┼─────────┼────────┼────────┼────────────────┼─────────────────┤
│ 5. 여울공원 인터벌 트랙 │ 3.2 km  │ ★☆☆☆☆  │ 정규   │ 세계작가정원    │ 화장실 2, 음수대 │
│    (Yeoul Park Track)  │         │ (초급)  │ 우레탄 │ 반려견 놀이터   │ 지하주차장      │
└────────────────────────┴─────────┴────────┴────────┴────────────────┴─────────────────┘
```

#### Technical Pipeline & Spatial Architecture
- **GeoJSON Coordinate Engine**: Precise latitude/longitude waypoints with elevation profiles.
- **Micro-Climate Sensor Data**:
  - AirKorea OpenAPI: Real-time PM10 / PM2.5 AQI scores at Dongtan / Osan monitoring stations.
  - KMA Weather API: Temperature, humidity, wind velocity, and outdoor running condition index.
- **Interactive UI Component (`TrailCourseViewer.tsx`)**:
  - SVG elevation profile chart, distance marker overlays, and toggleable amenity pins (Restrooms, Fountains, AEDs, Night Light Poles).

---

### 2.4. Domain 4: Festivals & Events (축제, 루나쇼, 로컬 문화/주민자치)

#### Core Cultural Ingestion Scope
1. **동탄호수공원 루나분수쇼 (Luna Fountain Show)**:
   - Schedule: May ~ October, bi-weekly Saturday nights (20:00 ~ 20:50).
   - Features: Multi-media laser fountain timetable, optimal viewing spots (Lake Como terrace, Songbangcheongyo deck, south grass slope), real-time D-Day badge calculation, parking congestion advisory.
2. **화성시 문화재단 (Hwaseong Cultural Foundation - hcf.or.kr) & 거리예술축제**:
   - Open-air concerts, street busking, Dongtan Art Space gallery exhibitions.
3. **동탄 1~9동 주민자치센터 평생학습/문화강좌**:
   - Real-time indexing of free & low-cost sports, arts, and kids classes across all 9 administrative dong centers (`동탄1동` ~ `동탄9동`).
   - Anti-WAF bypass proxy (`/api/bypass-notice`) enabling instant 1-click external enrollment.

#### Technical Architecture
- **Batch Scraper & Cron Synchronizer**: `fetch-local-notices.js` & `/api/cron/sync-local-notices` scraping Hwaseong BBS 1019, BD_notice, BBS 1131, BBS 1154, BBS 1049.
- **Schema.org SEO Markup**: Automated JSON-LD `Event` and `ItemList` rich snippets injected for search engine crawlability.
- **Push Notification Pipeline**: Web Push via Service Worker (`sw.js`) alerting users on Luna Show D-Day and lecture registration openings.

---

### 2.5. Domain 5: Dining & Hotplaces (맛집 및 로컬 상권 인텔리전스)

#### The 4 Premier Commercial Hubs in Dongtan
```
1. 영천동 상권 (11자 상가 & 테크노밸리 푸드존)
   - 타겟: 테크노밸리 IT/반도체 직장인 점심 & 저녁 회식, 로컬 베이커리
   - 주요 테마: 숙성 삼겹살/한우, 가성비 직장인 백반, 스페셜티 로스터리 카페, 수제버거

2. 동탄호수공원 상권 (레이크꼬모, 그랑파사쥬, 루나갤러리, 산척동 카페거리)
   - 타겟: 3040 패밀리 주말 외식, 호수뷰 데이트, 브런치, 키즈 프렌들리
   - 주요 테마: 호수 조망 이탈리안 레스토랑, 베이커리 카페, 유모차 진입 가능 브런치, 반려견 동반 카페

3. 카림애비뉴 상권 (청계동 시범단지 중심상가)
   - 타겟: 시범단지 학부모, 학원가 학생, 주부 모임
   - 주요 테마: 프리미엄 키즈카페, 유기농 샐러드/포케, 패밀리 분식, 학원가 간식 및 서양식

4. 반송동 중심상권 (남광장, 북광장 & 센트럴파크 카페거리)
   - 타겟: 2040 직장인 모임, 전통 맛집 탐방, 심야 펍 & 이자카야
   - 주요 테마: 전통 노포 맛집, 활어회/양꼬치, 수제 맥주 펍, 센트럴파크 연계 브런치
```

#### Technical Data Pipeline & Quality Verification
- **Ingestion Source**: `extract_restaurants.py` parsing official Small Enterprise & Market Service (소상공인시장진흥공단 상가(상권)정보 경기) dataset combined with Google Sheets SSOT (`restaurants` tab).
- **Metadata Filters**:
  - `kidsFriendly`: Highchair equipped, stroller ramp accessible, non-spicy kids menu available.
  - `parkingGrade`: On-site parking spots, affiliated public parking voucher available.
  - `corkageFree`: Free wine/whiskey corkage for corporate dining.
- **User Review Integrity**: Firestore subcollections with rate-limited anti-spam validation and Firebase Storage image hosting.

---

## 3. Unified Technical Architecture & Data Schemas

### 3.1. Full System Topology
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Client Layer (Next.js 16)                              │
│  - Pastel Cute & Urban Emerald Hybrid Design System                                   │
│  - Zero-Jank 120fps Transitions, Sub-100ms Navigation, CLS < 0.01                      │
│  - MobileDock (5 Tabs) & Desktop LoungeHeader 100% State Synchronized                 │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              State & Service Facade Layer                              │
│  - DashboardFacade (Singleton)                                                         │
│  - Specialized Facades: RealEstateFacade, IndustryFacade, TrailFacade, EventFacade      │
│  - React 19 SWR / Hooks / Background Prefetching                                       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             Next.js Route Handlers (API Layer)                         │
│  - /api/apartments-by-dong, /api/transaction-summary, /api/valuation                   │
│  - /api/technovalley/industry-distribution, /api/technovalley/jisan-status             │
│  - /api/stocks/semiconductor, /api/trails, /api/local-notices, /api/dining/hotplaces   │
│  - Rate Limiter (Token Bucket) & Structured Error Responses (apiSuccess/apiError)      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                      ┌─────────────────────┼─────────────────────┐
                      ▼                     ▼                     ▼
          ┌──────────────────────┐┌──────────────────┐┌───────────────────────┐
          │ L2 Cache (Redis)     ││ Firestore DB     ││ External Data SSOT   │
          │ Upstash Edge Cache   ││ - transactions   ││ - Google Sheets SSOT │
          │ Namespace DTDLS:*    ││ - local_notices  ││ - MOLIT Public APIs  │
          │ TTL: 60s ~ 86400s    ││ - user_reviews   ││ - KIS / DART OpenAPI │
          └──────────────────────┘└──────────────────┘└───────────────────────┘
```

### 3.2. Canonical TypeScript Domain Models

```typescript
// --- Domain 2: Semiconductor & Stocks ---
export interface SemiconductorStock {
  ticker: string; // e.g. "005930.KS", "029460.KS"
  name: string; // "삼성전자", "케이씨텍"
  category: 'FOUNDRY' | 'EQUIPMENT' | 'MATERIALS' | 'PARTS' | 'GLOBAL_ANCHOR' | 'BIO';
  marketCapEok: number; // 시가총액 (억원)
  currentPrice: number; // 현재가 (원)
  changeRate: number; // 등락률 (%)
  changeAmount: number; // 전일대비
  dongtanHub: string; // "동탄기흥로 자사빌딩", "금강펜테리움 IX타워"
  techKeyword: string[]; // ["CMP", "세정", "EUV", "ALD"]
  summary: string;
  updatedAt: string;
}

// --- Domain 3: Running & Trails ---
export interface TrailCourse {
  id: string; // "lake-park-loop", "chidongcheon-track"
  name: string; // "동탄호수공원 순환 코스"
  distanceKm: number; // 4.5
  estimatedMinutes: number; // 30 (Running) / 60 (Walking)
  elevationGainM: number; // 12
  difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING';
  surfaceType: 'URETHANE' | 'WOOD_DECK' | 'DIRT' | 'ASPHALT';
  amenities: {
    restrooms: number;
    waterFountains: number;
    parkingLots: string[];
    dustCleaners: boolean;
  };
  airQualityStatus?: {
    pm10: number;
    pm25: number;
    grade: 'GOOD' | 'NORMAL' | 'BAD';
  };
  geoJsonCoordinates: [number, number][]; // [ [lng, lat], ... ]
  highlights: string[];
}

// --- Domain 4: Festivals & Events ---
export interface LocalEventItem {
  id: string; // "luna-2026-08-29"
  title: string; // "동탄호수공원 8월 정기 루나분수쇼"
  category: 'LUNA_SHOW' | 'CIVIC_FESTIVAL' | 'LECTURE' | 'EXHIBITION';
  targetDate: string; // "2026-08-29"
  timeRange: string; // "20:00 ~ 20:50"
  location: string; // "동탄호수공원 수변무대"
  dept: string; // "화성시 푸른도시사업소"
  dDayText: string; // "D-7", "D-Day", "종료됨"
  primeSpots: { spotName: string; tip: string }[];
  bypassUrl?: string;
  isDongtan: boolean;
}

// --- Domain 5: Dining & Hotplaces ---
export interface DiningHotplace {
  id: string;
  name: string; // "포레스트 동탄호수공원점"
  hub: 'YEONGCHEON_11JA' | 'LAKE_PARK' | 'KARILM_AVENUE' | 'SOUTH_NORTH_GWANGJANG';
  cuisineType: 'KOREAN' | 'WESTERN' | 'ASIAN' | 'CAFE_BAKERY' | 'BAR_PUB';
  address: string;
  coordinates: [number, number]; // [lat, lng]
  rating: number; // 4.8
  reviewCount: number;
  tags: string[]; // ["쌀국수맛집", "웨이팅필수", "키즈존"]
  kidsFriendly: boolean;
  parkingAvailable: boolean;
  corkageFree: boolean;
  signatureMenu: { name: string; price: number }[];
}
```

---

## 4. Engineering Quality, Verification & System Health

### 4.1. Static Code Analysis & Test Integrity
- **TypeScript Static Verification**: `npx tsc --noEmit` executing across 174 source files with **0 compilation errors (100% strict type safety)**.
- **Unit & Integration Test Suite**: **86 test suites, 846 unit/integration assertions passing with 100% GREEN rate (`npm test`)**.
- **Edge Runtime & Zero-Jank UX**:
  - Memory leak protection: LRU timestamp caches preventing memory accumulation across continuous chart renders.
  - Layout Shift Guard: CLS < 0.01 maintained across dynamic tab switching and viewport resizing.
  - Service Worker Cache: Stale-While-Revalidate caching policy serving critical JSON datasets instantly (0ms) upon warm load.

---

## 5. Monetization Strategy & Growth Vector

### 5.1. Dual-Track Revenue Engine
1. **Contextual Google AdSense Placement**:
   - Zero-clutter non-intrusive ad slots placed between data analysis sections.
   - High-yield keywords: Semiconductor relocation, local mortgage rates, kids academy tuition, Dongtan new complex pre-sale.
2. **Hyperlocal B2B CPA & Local Merchant Sponsorships**:
   - 1:1 matching of commercial dining coupons, relocation tax consultations, and interior design quotes to specific apartment and tech building profiles.

---

## 6. Super-App Phased Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        D-VIEW Super-App Phased Implementation                          │
├─────────────────┬───────────────────────────────────┬──────────────────────────────────┤
│ Phase           │ Key Deliverables                  │ Verification Target              │
├─────────────────┼───────────────────────────────────┼──────────────────────────────────┤
│ Phase 1 (SSOT)  │ - Update Engineering Report.md    │ - Documentation SSOT Parity      │
│                 │ - Synchronize AGENT.md & PROJECT  │ - 0 Broken References            │
│                 │ - Record in Patch History.md      │                                  │
├─────────────────┼───────────────────────────────────┼──────────────────────────────────┤
│ Phase 2 (Data)  │ - Semiconductor Ticker Pipeline   │ - API Routes 200 OK              │
│                 │ - Trail GeoJSON & AQI Ingestor    │ - SWR L2 Cache Validation        │
│                 │ - Dining Hotplaces Extractor      │ - Fallback Resilience Check      │
├─────────────────┼───────────────────────────────────┼──────────────────────────────────┤
│ Phase 3 (UI/UX) │ - 5-Domain MobileDock Sync        │ - Sub-100ms Tab Switching        │
│                 │ - Trail & Stocks Interactive UI   │ - CLS < 0.01 Zero-Jank           │
│                 │ - Dining & Luna Show Widgets      │ - 60fps Animation on Mobile      │
├─────────────────┼───────────────────────────────────┼──────────────────────────────────┤
│ Phase 4 (Audit) │ - Full E2E Test Suite Expansion   │ - 100% Jest & Playwright Pass    │
│                 │ - Monetization Ad Placement Audit │ - Vercel Production Build Pass   │
└─────────────────┴───────────────────────────────────┴──────────────────────────────────┘
```

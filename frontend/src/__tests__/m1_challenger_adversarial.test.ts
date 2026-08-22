/**
 * @file m1_challenger_adversarial.test.ts
 * @description Empirical Challenger 1 Adversarial Test Suite for Milestone 1 (Domain & Types Layer Refactoring)
 * Tests:
 * 1. Boundary conditions, type coercion, and malformed inputs against Zod schemas in facade.schemas.ts
 * 2. Edge cases in userUtils.ts (empty inputs, unicode, special chars, boundary strings, distributions)
 * 3. Static type equivalence and runtime export identity between @/types and @/lib/types
 * 4. Architectural layer isolation and zero-runtime invariants for src/types/
 */

import { z } from 'zod';
import {
  POISchema,
  SchoolPOISchema,
  StationPOISchema,
  AcademyPOISchema,
  RestaurantPOISchema,
  ApartmentPOISchema,
  SheetApartmentSchema,
  JisanStatusItemSchema,
  JisanStatusResponseSchema,
  NicknameSchema,
  KPIDataSchema,
  FakePriceDataSchema,
  SearchConsoleStatusSchema,
  googleNewsItemSchema,
  noticeSchema,
  ImageMetaSchema,
  ObjectiveMetricsSchema,
  AdSlotSchema,
  ReportSpecsSchema,
  ReportInfraSchema,
  ReportEcosystemSchema,
  ReportLocationSchema,
  ReportAssessmentSchema,
  ReportSectionsSchema,
  ScoutingReportInputSchema,
  CreateFieldReportInputSchema,
  AddPostInputSchema,
  AddFieldReportInputSchema,
  AddFieldReportCommentInputSchema,
  DeleteFieldReportCommentInputSchema,
  AddUserReviewInputSchema,
  UpdateNicknameInputSchema,
  UpdatePhotoURLInputSchema,
  TransactionRecordSchema,
  TransactionListSchema,
  QuizAnswerSchema,
  ViewedAptsSchema,
  PostDataSchema,
  CreatePostSchema,
  SyncManagerPostSchema,
  TypeMapItemSchema,
  ApartmentMetaItemSchema,
  ApartmentMetaSchema,
  DongApartmentSchema,
  Recent7DaysVolumeSchema,
  RecentTransactionSchema,
  RecentTxSchema,
  AptTxSummarySchema,
  FieldReportImageSchema,
  FieldReportSchema,
  DongtanMacroTrendPointSchema,
  InitialPageDataSchema,
  FieldReportDataSchema,
  HwaseongEnterpriseSchema,
  MolTransactionXmlSchema,
  RedisCacheEnvelopeSchema,
  IsomorphicFileSchema,
} from '@/lib/validation/facade.schemas';

import {
  getDisplayName,
  createEmojiAvatar,
  DEFAULT_AVATARS,
  getRandomDefaultAvatar,
} from '@/lib/utils/userUtils';

// Import from canonical @/types
import type {
  DongApartment as CanonicalDongApartment,
  StaticApartment as CanonicalStaticApartment,
  SheetApartment as CanonicalSheetApartment,
  ApartmentMetaItem as CanonicalApartmentMetaItem,
  ApartmentMeta as CanonicalApartmentMeta,
  TypeMapItem as CanonicalTypeMapItem,
  POIData as CanonicalPOIData,
  SchoolPOI as CanonicalSchoolPOI,
  StationPOI as CanonicalStationPOI,
  AcademyPOI as CanonicalAcademyPOI,
  RestaurantPOI as CanonicalRestaurantPOI,
  ApartmentPOI as CanonicalApartmentPOI,
  LocationScoreItem as CanonicalLocationScoreItem,
} from '@/types/apartment';

import type {
  TransactionRecord as CanonicalTransactionRecord,
  RawTransactionRecord as CanonicalRawTransactionRecord,
  RecentTx as CanonicalRecentTx,
  RecentTransaction as CanonicalRecentTransaction,
  AptTxSummary as CanonicalAptTxSummary,
  Recent7DaysVolume as CanonicalRecent7DaysVolume,
  DongtanMacroTrendPoint as CanonicalDongtanMacroTrendPoint,
  MolTransactionXml as CanonicalMolTransactionXml,
} from '@/types/transaction';

import type {
  ImageMeta as CanonicalImageMeta,
  PhotoItem as CanonicalPhotoItem,
  FieldReportImage as CanonicalFieldReportImage,
  ObjectiveMetrics as CanonicalObjectiveMetrics,
  AdSlot as CanonicalAdSlot,
  ReportSpecs as CanonicalReportSpecs,
  ReportInfra as CanonicalReportInfra,
  ReportEcosystem as CanonicalReportEcosystem,
  ReportLocation as CanonicalReportLocation,
  ReportAssessment as CanonicalReportAssessment,
  ReportSections as CanonicalReportSections,
  CommentData as CanonicalCommentData,
  ScoutingReport as CanonicalScoutingReport,
  FieldReportData as CanonicalFieldReportData,
} from '@/types/report';

import type {
  LoungePost as CanonicalLoungePost,
  PostDetail as CanonicalPostDetail,
  RecentLoungeItem as CanonicalRecentLoungeItem,
  PostComment as CanonicalPostComment,
  AptStory as CanonicalAptStory,
  CombinedPostItem as CanonicalCombinedPostItem,
  KPIData as CanonicalKPIData,
  NewsItemData as CanonicalNewsItemData,
  AdBannerData as CanonicalAdBannerData,
} from '@/types/lounge';

import type {
  UserReview as CanonicalUserReview,
  ReviewInput as CanonicalReviewInput,
} from '@/types/review';

import type {
  VerificationLevel as CanonicalVerificationLevel,
  UserProfile as CanonicalUserProfile,
  UserRole as CanonicalUserRole,
  AuthUser as CanonicalAuthUser,
} from '@/types/user';

import type {
  MacroEnvironment as CanonicalMacroEnvironment,
  SupplyPipeline as CanonicalSupplyPipeline,
  MacroDataConfig as CanonicalMacroDataConfig,
} from '@/types/macro';

import type {
  ApiSuccessResponse as CanonicalApiSuccessResponse,
  ApiErrorResponse as CanonicalApiErrorResponse,
  ApiResponse as CanonicalApiResponse,
  RateLimitConfig as CanonicalRateLimitConfig,
  RateLimitResult as CanonicalRateLimitResult,
  RedisCacheEnvelope as CanonicalRedisCacheEnvelope,
} from '@/types/api';

// Import from legacy re-export barrels @/lib/types/*
import type {
  KPIData as LegacyKPIData,
  NewsItemData as LegacyNewsItemData,
  AdBannerData as LegacyAdBannerData,
} from '@/lib/types/dashboard.types';

import type {
  MacroEnvironment as LegacyMacroEnvironment,
  SupplyPipeline as LegacySupplyPipeline,
  MacroDataConfig as LegacyMacroDataConfig,
} from '@/lib/types/macro.types';

import type {
  ReportSpecs as LegacyReportSpecs,
  ReportInfra as LegacyReportInfra,
  ReportEcosystem as LegacyReportEcosystem,
  ReportLocation as LegacyReportLocation,
  ReportAssessment as LegacyReportAssessment,
  ReportSections as LegacyReportSections,
  CommentData as LegacyCommentData,
  FieldReportData as LegacyFieldReportData,
  FieldReportImage as LegacyFieldReportImage,
} from '@/lib/types/report.types';

import type {
  UserReview as LegacyUserReview,
  ReviewInput as LegacyReviewInput,
} from '@/lib/types/review.types';

import type {
  ImageMeta as LegacyImageMeta,
  PhotoItem as LegacyPhotoItem,
  ObjectiveMetrics as LegacyObjectiveMetrics,
  AdSlot as LegacyAdSlot,
  ScoutingReport as LegacyScoutingReport,
} from '@/lib/types/scoutingReport';

import type {
  TransactionRecord as LegacyTransactionRecord,
  RawTransactionRecord as LegacyRawTransactionRecord,
  RecentTx as LegacyRecentTx,
  RecentTransaction as LegacyRecentTransaction,
  AptTxSummary as LegacyAptTxSummary,
  Recent7DaysVolume as LegacyRecent7DaysVolume,
  DongtanMacroTrendPoint as LegacyDongtanMacroTrendPoint,
  MolTransactionXml as LegacyMolTransactionXml,
  LocationScoreItem as LegacyLocationScoreItem,
} from '@/lib/types/transaction';

import {
  getDisplayName as legacyGetDisplayName,
  createEmojiAvatar as legacyCreateEmojiAvatar,
  DEFAULT_AVATARS as legacyDEFAULT_AVATARS,
  getRandomDefaultAvatar as legacyGetRandomDefaultAvatar,
} from '@/lib/types/user.types';

import type {
  VerificationLevel as LegacyVerificationLevel,
  UserProfile as LegacyUserProfile,
  UserRole as LegacyUserRole,
  AuthUser as LegacyAuthUser,
} from '@/lib/types/user.types';

// Helper type-check assertions at compile time
type ExpectTrue<T extends true> = T;
type TypeEquals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

describe('M1 Empirical Challenger Adversarial Test Suite', () => {

  // =========================================================================
  // Section 1: Zod Schemas Boundary Conditions & Malformed Data
  // =========================================================================
  describe('1. Zod Schemas Boundary Conditions & Stress Testing', () => {

    describe('NicknameSchema', () => {
      it('rejects empty, whitespace-only, and single character inputs', () => {
        expect(NicknameSchema.safeParse('').success).toBe(false);
        expect(NicknameSchema.safeParse('   ').success).toBe(false);
        expect(NicknameSchema.safeParse('a').success).toBe(false);
        expect(NicknameSchema.safeParse('가').success).toBe(false);
        expect(NicknameSchema.safeParse('1').success).toBe(false);
        expect(NicknameSchema.safeParse('_').success).toBe(false);
      });

      it('accepts valid 2-to-10 character alphanumeric, Korean, and underscore nicknames', () => {
        expect(NicknameSchema.safeParse('동탄').success).toBe(true);
        expect(NicknameSchema.safeParse('ab').success).toBe(true);
        expect(NicknameSchema.safeParse('12').success).toBe(true);
        expect(NicknameSchema.safeParse('__').success).toBe(true);
        expect(NicknameSchema.safeParse('동탄_러12').success).toBe(true);
        expect(NicknameSchema.safeParse('ㅋㅋ_ㅎㅎ').success).toBe(true);
        // Exactly 10 Korean characters
        expect(NicknameSchema.safeParse('동탄역더샵센트럴시티').success).toBe(true);
      });

      it('trims leading/trailing whitespace before length and format checks', () => {
        const res = NicknameSchema.safeParse('   동탄역   ');
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data).toBe('동탄역');
        }
      });

      it('rejects nicknames longer than 10 characters', () => {
        // 11 characters
        expect(NicknameSchema.safeParse('동탄역더샵센트럴시티1').success).toBe(false);
        expect(NicknameSchema.safeParse('12345678901').success).toBe(false);
        expect(NicknameSchema.safeParse('abcdefghijk').success).toBe(false);
      });

      it('rejects special characters, HTML/SQL injection strings, and emojis', () => {
        expect(NicknameSchema.safeParse('동탄<script>').success).toBe(false);
        expect(NicknameSchema.safeParse('user@email').success).toBe(false);
        expect(NicknameSchema.safeParse('admin;--').success).toBe(false);
        expect(NicknameSchema.safeParse('동탄 러').success).toBe(false); // internal space
        expect(NicknameSchema.safeParse('🔥동탄🔥').success).toBe(false);
        expect(NicknameSchema.safeParse('👨‍👩‍👧‍👦').success).toBe(false);
      });
    });

    describe('SheetApartmentSchema', () => {
      it('validates canonical full data and coerces string numbers properly', () => {
        const input = {
          ticker: 'DTT001',
          name: '동탄역시범우남퍼스트빌',
          dong: '청계동',
          lat: '37.2005',
          lng: '127.1005',
          householdCount: '1442',
          yearBuilt: '2015',
          far: '219.5',
          bcr: '14.8',
          parkingCount: '1800',
          parkingPerHousehold: '1.25',
          brand: '우남퍼스트빌',
          maxFloor: '37',
          minFloor: '15',
          txKey: '4159013100-12345',
          isPublicRental: false,
          starbucksName: '스타벅스 동탄역점',
          starbucksAddress: '경기도 화성시 동탄대로 500',
          starbucksCoordinates: '37.2000,127.1000',
          distanceToStarbucks: '150',
          mcdonaldsName: null,
          distanceToMcDonalds: null,
          oliveYoungName: '올리브영 동탄역',
          distanceToOliveYoung: '200',
          daisoName: '다이소 동탄점',
          distanceToDaiso: '300',
          supermarketName: '롯데마트 동탄점',
          distanceToSupermarket: '450',
        };

        const res = SheetApartmentSchema.safeParse(input);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.lat).toBe(37.2005);
          expect(res.data.lng).toBe(127.1005);
          expect(res.data.householdCount).toBe(1442);
          expect(res.data.far).toBe(219.5);
          expect(res.data.bcr).toBe(14.8);
          expect(res.data.parkingCount).toBe(1800);
          expect(res.data.parkingPerHousehold).toBe(1.25);
          expect(res.data.maxFloor).toBe(37);
          expect(res.data.minFloor).toBe(15);
          expect(res.data.distanceToStarbucks).toBe(150);
          expect(res.data.mcdonaldsName).toBeNull();
          expect(res.data.distanceToMcDonalds).toBeNull();
        }
      });

      it('handles null and undefined optional values without crashing', () => {
        const minimal = {
          name: '동탄역 유보라',
          dong: '오산동',
          lat: 37.199,
          lng: 127.098,
        };
        const res = SheetApartmentSchema.safeParse(minimal);
        expect(res.success).toBe(true);
      });

      it('rejects missing mandatory fields name or dong or invalid coordinate strings', () => {
        expect(SheetApartmentSchema.safeParse({ dong: '청계동', lat: 37.2, lng: 127.1 }).success).toBe(false);
        expect(SheetApartmentSchema.safeParse({ name: '아파트', lat: 37.2, lng: 127.1 }).success).toBe(false);
        // Non-numeric coordinate string coerces to NaN and fails Zod number schema
        expect(SheetApartmentSchema.safeParse({ name: '아파트', dong: '동', lat: 'invalid_lat', lng: 127.1 }).success).toBe(false);
      });
    });

    describe('ObjectiveMetricsSchema', () => {
      it('transforms missing and null fields into standard defaults', () => {
        const raw = {
          brand: null,
          householdCount: null,
          far: null,
          bcr: null,
          yearBuilt: null,
          distanceToElementary: null,
          distanceToMiddle: null,
          distanceToHigh: null,
          distanceToSubway: null,
          nearestSchoolNames: null,
        };

        const res = ObjectiveMetricsSchema.safeParse(raw);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.brand).toBe('');
          expect(res.data.householdCount).toBe(0);
          expect(res.data.far).toBe(0);
          expect(res.data.bcr).toBe(0);
          expect(res.data.yearBuilt).toBe(0);
          expect(res.data.distanceToElementary).toBe(9999);
          expect(res.data.distanceToMiddle).toBe(9999);
          expect(res.data.distanceToHigh).toBe(9999);
          expect(res.data.distanceToSubway).toBe(9999);
          expect(res.data.nearestSchoolNames).toEqual({ elementary: '', middle: '', high: '' });
        }
      });

      it('preprocesses dirty string yearBuilt values into integers', () => {
        const cases = [
          { input: '2015년', expected: 2015 },
          { input: '2020.08', expected: 202008 },
          { input: 2018, expected: 2018 },
          { input: '신축 미정', expected: 0 }, // no digits -> null -> default 0
        ];

        for (const c of cases) {
          const res = ObjectiveMetricsSchema.safeParse({ yearBuilt: c.input });
          expect(res.success).toBe(true);
          if (res.success) {
            expect(res.data.yearBuilt).toBe(c.expected);
          }
        }
      });

      it('rejects negative numbers for strictly nonnegative metrics', () => {
        expect(ObjectiveMetricsSchema.safeParse({ householdCount: -1 }).success).toBe(false);
        expect(ObjectiveMetricsSchema.safeParse({ far: -10 }).success).toBe(false);
        expect(ObjectiveMetricsSchema.safeParse({ bcr: -5 }).success).toBe(false);
        expect(ObjectiveMetricsSchema.safeParse({ distanceToElementary: -50 }).success).toBe(false);
      });
    });

    describe('ReportSectionsSchema and Sub-schemas', () => {
      it('applies default empty strings and allows passthrough properties', () => {
        const emptySections = {};
        const res = ReportSectionsSchema.safeParse(emptySections);
        expect(res.success).toBe(true);

        const partialSpecs = {
          specs: {
            builtYear: '2021',
            customExtraProperty: 'extra_value',
          },
          infra: {
            gateText: '정문 문주 웅장함',
            legacyExtraRating: 4.5,
          },
        };
        const resPartial = ReportSectionsSchema.safeParse(partialSpecs);
        expect(resPartial.success).toBe(true);
        if (resPartial.success) {
          expect(resPartial.data.specs?.builtYear).toBe('2021');
          expect((resPartial.data.specs as any)?.customExtraProperty).toBe('extra_value');
          expect(resPartial.data.infra?.gateText).toBe('정문 문주 웅장함');
          expect((resPartial.data.infra as any)?.legacyExtraRating).toBe(4.5);
        }
      });
    });

    describe('KPIDataSchema (Presentation Leak Isolation)', () => {
      it('validates string icon names and styling string properties', () => {
        const validKPI = {
          id: 'kpi_tx_vol',
          title: '거래량 급증',
          subtitle: '최근 7일 기준',
          badgeText: 'HOT',
          badgeStyle: 'bg-red-500 text-white',
          mainValue: '128건',
          subValue: '+24%',
          description: '전주 대비 거래량 대폭 상승',
          icon: 'TrendingUp',
          gradientBackground: 'from-blue-500 to-indigo-600',
          borderColor: 'border-blue-200',
          titleColor: 'text-blue-900',
        };

        const res = KPIDataSchema.safeParse(validKPI);
        expect(res.success).toBe(true);
      });

      it('rejects ReactNode or non-string icon types', () => {
        const invalidKPIWithJSX = {
          id: 'kpi_invalid',
          title: '제목',
          subtitle: '부제목',
          mainValue: '100',
          subValue: '+10',
          description: '설명',
          icon: { $$typeof: Symbol.for('react.element'), type: 'div', props: {} },
        };

        expect(KPIDataSchema.safeParse(invalidKPIWithJSX).success).toBe(false);
      });
    });

    describe('TransactionRecordSchema', () => {
      it('applies default values for missing optional fields and coerces strings to numbers', () => {
        const raw = {
          dong: '청계동',
          aptName: '동탄역 시범우남퍼스트빌',
          price: '115000',
          area: '84.94',
          areaPyeong: '25.7',
          floor: '12',
          buildYear: '2015',
          contractYm: '202608',
          contractDay: '15',
        };

        const res = TransactionRecordSchema.safeParse(raw);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.price).toBe(115000);
          expect(res.data.area).toBe(84.94);
          expect(res.data.areaPyeong).toBe(25.7);
          expect(res.data.floor).toBe(12);
          expect(res.data.buildYear).toBe(2015);
          expect(res.data.dealType).toBe('매매'); // default
          expect(res.data.priceEok).toBe(''); // default
        }
      });
    });

    describe('IsomorphicFileSchema', () => {
      it('handles undefined and null gracefully', () => {
        expect(IsomorphicFileSchema.safeParse(undefined).success).toBe(true);
      });

      it('validates File instance when File is defined in environment or passes in SSR', () => {
        if (typeof File !== 'undefined') {
          const dummyFile = new File(['content'], 'test.png', { type: 'image/png' });
          expect(IsomorphicFileSchema.safeParse(dummyFile).success).toBe(true);
          expect(IsomorphicFileSchema.safeParse('not-a-file').success).toBe(false);
        } else {
          expect(IsomorphicFileSchema.safeParse({}).success).toBe(true);
        }
      });
    });

    describe('InitialPageDataSchema (Aggregate Contract)', () => {
      it('validates a complete initial page data envelope', () => {
        const pageData = {
          favoriteCounts: { '동탄역더샵': 42, '시범우남': 19 },
          apartmentMeta: {
            '동탄역더샵': { dong: '오산동', txKey: 'tx-1', isPublicRental: false },
          },
          fieldReports: [
            {
              id: 'fr-1',
              dong: '오산동',
              apartmentName: '동탄역더샵센트럴시티',
              author: '전문임장러',
              likes: 12,
              commentCount: 3,
            },
          ],
        };

        const res = InitialPageDataSchema.safeParse(pageData);
        expect(res.success).toBe(true);
      });

      it('rejects negative counts in favoriteCounts', () => {
        const invalidData = {
          favoriteCounts: { '동탄역더샵': -5 },
          apartmentMeta: {},
          fieldReports: [],
        };
        expect(InitialPageDataSchema.safeParse(invalidData).success).toBe(false);
      });
    });
  });

  // =========================================================================
  // Section 2: userUtils.ts Edge Cases & Stress Testing
  // =========================================================================
  describe('2. userUtils.ts Edge Cases & Stress Testing', () => {

    describe('getDisplayName', () => {
      it('returns fallback default for null, undefined, empty string, and empty object', () => {
        expect(getDisplayName(null)).toBe('임시_임장러');
        expect(getDisplayName(undefined)).toBe('임시_임장러');
        expect(getDisplayName({})).toBe('임시_임장러');
        expect(getDisplayName({ nickname: '' })).toBe('임시_임장러');
        expect(getDisplayName({ nickname: undefined })).toBe('임시_임장러');
      });

      it('returns provided nickname accurately for valid strings', () => {
        expect(getDisplayName({ nickname: '동탄임장왕' })).toBe('동탄임장왕');
        expect(getDisplayName({ nickname: 'User123' })).toBe('User123');
      });

      it('handles unicode, emojis, and special characters safely', () => {
        expect(getDisplayName({ nickname: '🔥동탄러🔥' })).toBe('🔥동탄러🔥');
        expect(getDisplayName({ nickname: '🚀_Admin_99' })).toBe('🚀_Admin_99');
        expect(getDisplayName({ nickname: '<script>alert(1)</script>' })).toBe('<script>alert(1)</script>');
      });

      it('handles extreme length nicknames without truncation or memory issues', () => {
        const longNick = '동탄'.repeat(500);
        expect(getDisplayName({ nickname: longNick })).toBe(longNick);
      });
    });

    describe('createEmojiAvatar', () => {
      it('generates valid SVG data URI containing escaped emoji and gradient colors', () => {
        const emoji = '🦊';
        const start = '#FFE6E6';
        const end = '#E6E6FF';
        const uri = createEmojiAvatar(emoji, start, end);

        expect(uri.startsWith('data:image/svg+xml;utf8,')).toBe(true);

        const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
        expect(decoded).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">');
        expect(decoded).toContain(`<stop offset="0%" stop-color="${start}" />`);
        expect(decoded).toContain(`<stop offset="100%" stop-color="${end}" />`);
        expect(decoded).toContain(emoji);
        expect(decoded).toContain('</svg>');
      });

      it('handles complex composite multi-byte emojis and unicode grapheme clusters', () => {
        const compositeEmojis = ['👨‍👩‍👧‍👦', '🏳️‍🌈', '🧑🏽‍💻', '🧟‍♀️', '🧗‍♂️'];
        for (const emoji of compositeEmojis) {
          const uri = createEmojiAvatar(emoji, '#000000', '#FFFFFF');
          const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
          expect(decoded).toContain(emoji);
        }
      });

      it('handles unusual color strings (rgba, hsl, named CSS colors)', () => {
        const uri = createEmojiAvatar('⭐', 'rgba(255,215,0,0.8)', 'hsl(45, 100%, 50%)');
        const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
        expect(decoded).toContain('stop-color="rgba(255,215,0,0.8)"');
        expect(decoded).toContain('stop-color="hsl(45, 100%, 50%)"');
      });
    });

    describe('DEFAULT_AVATARS and getRandomDefaultAvatar', () => {
      it('contains exactly 10 distinct, valid avatar URIs', () => {
        expect(DEFAULT_AVATARS).toHaveLength(10);
        const uniqueSet = new Set(DEFAULT_AVATARS);
        expect(uniqueSet.size).toBe(10);

        for (const avatar of DEFAULT_AVATARS) {
          expect(avatar.startsWith('data:image/svg+xml;utf8,')).toBe(true);
          const decoded = decodeURIComponent(avatar.replace('data:image/svg+xml;utf8,', ''));
          expect(decoded).toContain('<svg');
          expect(decoded).toContain('</svg>');
        }
      });

      it('empirical distribution test: getRandomDefaultAvatar samples every default avatar across 1000 trials', () => {
        const sampledSet = new Set<string>();
        const TRIALS = 1000;

        for (let i = 0; i < TRIALS; i++) {
          const avatar = getRandomDefaultAvatar();
          expect(DEFAULT_AVATARS).toContain(avatar);
          sampledSet.add(avatar);
        }

        // With 1000 trials and 10 items, the probability of any item having 0 hits is (9/10)^1000 ≈ 1.74e-46
        expect(sampledSet.size).toBe(10);
      });
    });
  });

  // =========================================================================
  // Section 3: Static & Runtime Type Equivalence (@/types vs @/lib/types)
  // =========================================================================
  describe('3. Static & Runtime Type Equivalence (@/types vs @/lib/types)', () => {

    it('validates static compile-time assignability between canonical and legacy type exports', () => {
      // Static Type Equivalence Checks (Compile-time verification)
      type _T1 = ExpectTrue<TypeEquals<CanonicalKPIData, LegacyKPIData>>;
      type _T2 = ExpectTrue<TypeEquals<CanonicalNewsItemData, LegacyNewsItemData>>;
      type _T3 = ExpectTrue<TypeEquals<CanonicalAdBannerData, LegacyAdBannerData>>;
      type _T4 = ExpectTrue<TypeEquals<CanonicalMacroEnvironment, LegacyMacroEnvironment>>;
      type _T5 = ExpectTrue<TypeEquals<CanonicalSupplyPipeline, LegacySupplyPipeline>>;
      type _T6 = ExpectTrue<TypeEquals<CanonicalMacroDataConfig, LegacyMacroDataConfig>>;
      type _T7 = ExpectTrue<TypeEquals<CanonicalReportSpecs, LegacyReportSpecs>>;
      type _T8 = ExpectTrue<TypeEquals<CanonicalReportInfra, LegacyReportInfra>>;
      type _T9 = ExpectTrue<TypeEquals<CanonicalReportEcosystem, LegacyReportEcosystem>>;
      type _T10 = ExpectTrue<TypeEquals<CanonicalReportLocation, LegacyReportLocation>>;
      type _T11 = ExpectTrue<TypeEquals<CanonicalReportAssessment, LegacyReportAssessment>>;
      type _T12 = ExpectTrue<TypeEquals<CanonicalReportSections, LegacyReportSections>>;
      type _T13 = ExpectTrue<TypeEquals<CanonicalCommentData, LegacyCommentData>>;
      type _T14 = ExpectTrue<TypeEquals<CanonicalFieldReportData, LegacyFieldReportData>>;
      type _T15 = ExpectTrue<TypeEquals<CanonicalFieldReportImage, LegacyFieldReportImage>>;
      type _T16 = ExpectTrue<TypeEquals<CanonicalUserReview, LegacyUserReview>>;
      type _T17 = ExpectTrue<TypeEquals<CanonicalReviewInput, LegacyReviewInput>>;
      type _T18 = ExpectTrue<TypeEquals<CanonicalImageMeta, LegacyImageMeta>>;
      type _T19 = ExpectTrue<TypeEquals<CanonicalPhotoItem, LegacyPhotoItem>>;
      type _T20 = ExpectTrue<TypeEquals<CanonicalObjectiveMetrics, LegacyObjectiveMetrics>>;
      type _T21 = ExpectTrue<TypeEquals<CanonicalAdSlot, LegacyAdSlot>>;
      type _T22 = ExpectTrue<TypeEquals<CanonicalScoutingReport, LegacyScoutingReport>>;
      type _T23 = ExpectTrue<TypeEquals<CanonicalTransactionRecord, LegacyTransactionRecord>>;
      type _T24 = ExpectTrue<TypeEquals<CanonicalRawTransactionRecord, LegacyRawTransactionRecord>>;
      type _T25 = ExpectTrue<TypeEquals<CanonicalRecentTx, LegacyRecentTx>>;
      type _T26 = ExpectTrue<TypeEquals<CanonicalRecentTransaction, LegacyRecentTransaction>>;
      type _T27 = ExpectTrue<TypeEquals<CanonicalAptTxSummary, LegacyAptTxSummary>>;
      type _T28 = ExpectTrue<TypeEquals<CanonicalRecent7DaysVolume, LegacyRecent7DaysVolume>>;
      type _T29 = ExpectTrue<TypeEquals<CanonicalDongtanMacroTrendPoint, LegacyDongtanMacroTrendPoint>>;
      type _T30 = ExpectTrue<TypeEquals<CanonicalMolTransactionXml, LegacyMolTransactionXml>>;
      type _T31 = ExpectTrue<TypeEquals<CanonicalLocationScoreItem, LegacyLocationScoreItem>>;
      type _T32 = ExpectTrue<TypeEquals<CanonicalVerificationLevel, LegacyVerificationLevel>>;
      type _T33 = ExpectTrue<TypeEquals<CanonicalUserProfile, LegacyUserProfile>>;
      type _T34 = ExpectTrue<TypeEquals<CanonicalUserRole, LegacyUserRole>>;
      type _T35 = ExpectTrue<TypeEquals<CanonicalAuthUser, LegacyAuthUser>>;

      // Assertion to verify test execution in Jest
      expect(true).toBe(true);
    });

    it('verifies exact reference identity for runtime helpers re-exported through @/lib/types/user.types', () => {
      expect(legacyGetDisplayName).toBe(getDisplayName);
      expect(legacyCreateEmojiAvatar).toBe(createEmojiAvatar);
      expect(legacyDEFAULT_AVATARS).toBe(DEFAULT_AVATARS);
      expect(legacyGetRandomDefaultAvatar).toBe(getRandomDefaultAvatar);
    });
  });

  // =========================================================================
  // Section 4: Architectural Boundary & Presentation Decoupling
  // =========================================================================
  describe('4. Architectural Layer Isolation & Presentation Decoupling', () => {

    it('ensures KPIData and NewsItemData accept pure serializable primitives only', () => {
      const pureKPI: CanonicalKPIData = {
        id: 'kpi_1',
        title: '신고가 갱신',
        subtitle: '동탄역 롯데캐슬 84㎡',
        badgeText: 'NEW HIGH',
        badgeStyle: 'bg-red-50 text-red-600',
        mainValue: '16.5억',
        subValue: '+1.5억 (10.0%)',
        description: '직전 최고가 대비 1.5억 상승 거래',
        icon: 'Flame', // String name instead of JSX Element
        gradientBackground: 'from-amber-500 to-orange-600',
        borderColor: 'border-orange-200',
        titleColor: 'text-orange-900',
      };

      expect(JSON.stringify(pureKPI)).toBeTruthy();
      const parsedKPI = JSON.parse(JSON.stringify(pureKPI));
      expect(parsedKPI.icon).toBe('Flame');
      expect(parsedKPI.title).toBe('신고가 갱신');

      const pureNews: CanonicalNewsItemData = {
        id: 'news_1',
        title: '동탄 인덕원선 착공 소식',
        meta: '2026.08.21 · 화성시청',
        content: '동탄 인동선 복선전철 공사 순항 중',
        author: '운영자',
        tagClass: 'bg-blue-50 text-blue-700',
        icon: 'Train', // String name instead of JSX Element
      };

      expect(JSON.stringify(pureNews)).toBeTruthy();
      const parsedNews = JSON.parse(JSON.stringify(pureNews));
      expect(parsedNews.icon).toBe('Train');
    });
  });
});

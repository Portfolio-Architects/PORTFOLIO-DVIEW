import {
  SheetApartmentSchema,
  TransactionRecordSchema,
  HwaseongEnterpriseSchema,
  MolTransactionXmlSchema,
  RedisCacheEnvelopeSchema,
  QuizAnswerSchema,
} from './facade.schemas';
import {
  UserProfileSchema,
  CommentDocumentSchema,
  PostDocumentSchema,
} from '@/lib/utils/firestoreConverters';

describe('Zod Validation Schemas Integrity', () => {
  describe('SheetApartmentSchema (Google Sheets SSOT)', () => {
    it('validates a correct apartment object with numbers', () => {
      const input = {
        name: '동탄역더샵센트럴시티',
        dong: '청계동',
        lat: 37.2001,
        lng: 127.1001,
        householdCount: 1416,
        yearBuilt: '2015',
      };
      const parsed = SheetApartmentSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('coerces string numbers for numeric fields without failing validation', () => {
      const input = {
        name: '동탄역시범우남퍼스트빌',
        dong: '청계동',
        lat: '37.2005',
        lng: '127.1005',
        householdCount: '1442',
        far: '219.5',
      };
      const parsed = SheetApartmentSchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.lat).toBe(37.2005);
        expect(parsed.data.lng).toBe(127.1005);
        expect(parsed.data.householdCount).toBe(1442);
        expect(parsed.data.far).toBe(219.5);
      }
    });

    it('fails when mandatory fields name or dong are missing', () => {
      const input = {
        lat: 37.2,
        lng: 127.1,
      };
      const parsed = SheetApartmentSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });
  });

  describe('TransactionRecordSchema (Ministry of Land XML)', () => {
    it('validates and applies defaults for transaction records', () => {
      const input = {
        dong: '청계동',
        aptName: '시범우남퍼스트빌',
        price: '110000',
        area: '84.98',
      };
      const parsed = TransactionRecordSchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.price).toBe(110000);
        expect(parsed.data.area).toBe(84.98);
        expect(parsed.data.dealType).toBe('매매');
      }
    });
  });

  describe('HwaseongEnterpriseSchema', () => {
    it('validates Hwaseong enterprise and NPS macro stats data', () => {
      const input = {
        id: 'yeongcheon',
        stats: {
          yeongcheonDong: {
            totalEmployees: 28500,
            companiesCount: 2150,
            newHires: 1200,
            departures: 850,
          },
        },
      };
      const parsed = HwaseongEnterpriseSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });
  });

  describe('MolTransactionXmlSchema', () => {
    it('validates raw parsed XML fields with defaults', () => {
      const input = {
        buildingName: '금강IX타워',
        type: '매매',
        priceRaw: '45000',
        sizeSqM: '48.5',
      };
      const parsed = MolTransactionXmlSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });
  });

  describe('RedisCacheEnvelopeSchema & QuizAnswerSchema', () => {
    it('validates Redis L2 cache envelopes', () => {
      const envelope = {
        data: { test: true },
        timestamp: Date.now(),
        source: 'redis-l2',
      };
      expect(RedisCacheEnvelopeSchema.safeParse(envelope).success).toBe(true);
    });

    it('validates drive quiz answer defaults', () => {
      const answers = {
        budget: '8eok',
        family: 'elementary',
      };
      const parsed = QuizAnswerSchema.safeParse(answers);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.transit).toBe('');
      }
    });
  });

  describe('Firestore Converters Schemas', () => {
    it('validates UserProfileSchema with catch fallbacks', () => {
      const rawUser = {
        nickname: '',
        uploaderPoints: 'invalid',
      };
      const parsed = UserProfileSchema.safeParse(rawUser);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.nickname).toBe('임시_임장러');
        expect(parsed.data.uploaderPoints).toBe(0);
      }
    });

    it('validates CommentDocumentSchema and PostDocumentSchema', () => {
      const comment = {
        text: 'Clean comment text',
        authorUid: 'user123',
        createdAt: null,
      };
      expect(CommentDocumentSchema.safeParse(comment).success).toBe(true);

      const post = {
        title: 'Title',
        category: '자유',
        authorUid: 'user123',
        createdAt: null,
      };
      expect(PostDocumentSchema.safeParse(post).success).toBe(true);
    });
  });
});

jest.mock('@/lib/redis', () => ({
  redis: null
}));

import { fetchSheetJisanStatus } from '@/lib/services/googleSheets';
import { JisanStatusItemSchema, JisanStatusResponseSchema } from '@/lib/validation/facade.schemas';

describe('지식산업센터_현황 Google Sheet Integration Test Suite', () => {
  it('should load and validate jisan status static cache successfully', async () => {
    const list = await fetchSheetJisanStatus(false);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(50);

    // Verify first item schema
    const firstItem = list[0];
    const parsed = JisanStatusItemSchema.safeParse(firstItem);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBeTruthy();
    }
  });

  it('should validate complete response structure with JisanStatusResponseSchema', async () => {
    const list = await fetchSheetJisanStatus(false);
    const completedCount = list.filter(item => item.buildingStatus === '건축완료').length;
    const underConstructionCount = list.filter(item => item.buildingStatus === '건축중').length;
    const notStartedCount = list.filter(item => item.buildingStatus === '미착공').length;

    const mockResponsePayload = {
      success: true,
      total: list.length,
      completedCount,
      underConstructionCount,
      notStartedCount,
      centers: list,
      message: 'OK'
    };

    const validatedPayload = JisanStatusResponseSchema.safeParse(mockResponsePayload);
    expect(validatedPayload.success).toBe(true);
  });
});

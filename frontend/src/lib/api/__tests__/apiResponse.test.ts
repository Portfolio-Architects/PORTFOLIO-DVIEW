import { apiSuccess, apiError } from '../apiResponse';

describe('API Response Helpers', () => {
  describe('apiSuccess', () => {
    it('should create a standard success response with data', async () => {
      const data = { id: 'apt-1', name: '시범우남퍼스트빌', price: 95000 };
      const response = apiSuccess(data);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should attach meta fields correctly', async () => {
      const data = [1, 2, 3];
      const response = apiSuccess(data, {
        source: 'cache',
        totalCount: 3,
        message: 'Loaded successfully'
      }, {
        status: 201,
        headers: { 'X-Custom-Header': 'TestVal' }
      });

      expect(response.status).toBe(201);
      expect(response.headers.get('X-Custom-Header')).toBe('TestVal');

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(json.source).toBe('cache');
      expect(json.totalCount).toBe(3);
      expect(json.message).toBe('Loaded successfully');
    });
  });

  describe('apiError', () => {
    it('should create a standard error response with default status 400', async () => {
      const response = apiError('INVALID_PARAMETER', 'Parameter aptName is required');

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('INVALID_PARAMETER');
      expect(json.code).toBe('INVALID_PARAMETER');
      expect(json.message).toBe('Parameter aptName is required');
    });

    it('should support custom status and details', async () => {
      const details = { field: 'email', reason: 'malformed format' };
      const response = apiError('VALIDATION_FAILED', 'Validation Error', 422, details);

      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('VALIDATION_FAILED');
      expect(json.details).toEqual(details);
    });
  });
});

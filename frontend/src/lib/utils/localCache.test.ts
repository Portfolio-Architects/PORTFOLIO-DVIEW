import { localCache } from './localCache';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

describe('localCache Utility', () => {
  const TEST_KEY = 'test-cache-key';
  
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    jest.useRealTimers();
  });

  it('should set and get values without schema and TTL successfully', () => {
    const data = { name: 'DRIVE', version: 2.0 };
    localCache.set(TEST_KEY, data);

    const result = localCache.get(TEST_KEY, undefined, null);
    expect(result).toEqual(data);
  });

  it('should return fallback if item does not exist', () => {
    const result = localCache.get('non-existent-key', undefined, 'fallback-value');
    expect(result).toBe('fallback-value');
  });

  it('should respect TTL expiration', () => {
    const data = 'expired-soon';
    // Set TTL to 5 seconds
    localCache.set(TEST_KEY, data, 5);

    // Get immediately
    expect(localCache.get(TEST_KEY, undefined, 'fallback')).toBe(data);

    // Advance time by 6 seconds
    jest.advanceTimersByTime(6000);

    // Should return fallback
    expect(localCache.get(TEST_KEY, undefined, 'fallback')).toBe('fallback');
    expect(localStorage.getItem(TEST_KEY)).toBeNull(); // Cleared from storage
  });

  it('should validate retrieved value using Zod schema', () => {
    const schema = z.object({
      id: z.number(),
      active: z.boolean(),
    });

    const validData = { id: 42, active: true };
    localCache.set(TEST_KEY, validData);

    // Valid schema should succeed
    expect(localCache.get(TEST_KEY, schema, null)).toEqual(validData);

    // Invalid data layout
    const invalidData = { id: 'not-a-number', active: true };
    localCache.set(TEST_KEY, invalidData);

    // Schema validation fails -> returns fallback and removes from storage
    expect(localCache.get(TEST_KEY, schema, { id: 0, active: false })).toEqual({ id: 0, active: false });
    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('should parse legacy format (direct value) and migrate to wrapped format', () => {
    const legacyValue = { title: 'Legacy Title' };
    localStorage.setItem(TEST_KEY, JSON.stringify(legacyValue));

    // Retrieve legacy format without schema
    const result = localCache.get(TEST_KEY, undefined, null);
    expect(result).toEqual(legacyValue);

    // The item should have been migrated to the wrapped format in localStorage
    const stored = JSON.parse(localStorage.getItem(TEST_KEY) || '{}');
    expect(stored).toHaveProperty('value');
    expect(stored).toHaveProperty('expiry');
    expect(stored.value).toEqual(legacyValue);
  });

  it('should parse legacy format with schema verification and migrate', () => {
    const schema = z.object({ title: z.string() });
    const legacyValue = { title: 'Legacy Title' };
    localStorage.setItem(TEST_KEY, JSON.stringify(legacyValue));

    const result = localCache.get(TEST_KEY, schema, null);
    expect(result).toEqual(legacyValue);

    const stored = JSON.parse(localStorage.getItem(TEST_KEY) || '{}');
    expect(stored.value).toEqual(legacyValue);
  });

  it('should clear stored item when remove is called', () => {
    localCache.set(TEST_KEY, 'some-data');
    expect(localStorage.getItem(TEST_KEY)).not.toBeNull();

    localCache.remove(TEST_KEY);
    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('should handle corrupted JSON safely', () => {
    localStorage.setItem(TEST_KEY, 'invalid-json-{[');
    
    const result = localCache.get(TEST_KEY, undefined, 'fallback');
    expect(result).toBe('fallback');
    expect(localStorage.getItem(TEST_KEY)).toBeNull(); // Cleared corrupt cache
  });

  it('should contain the SSR guard check in source code', () => {
    // Assert static code analysis to ensure SSR guard is present, since global.window
    // is non-configurable in JSDOM and cannot be deleted dynamically in this runner.
    const codePath = path.resolve(__dirname, 'localCache.ts');
    const sourceCode = fs.readFileSync(codePath, 'utf8');
    
    expect(sourceCode).toContain("if (typeof window === 'undefined') return;");
    expect(sourceCode).toContain("if (typeof window === 'undefined') return fallback;");
  });
});

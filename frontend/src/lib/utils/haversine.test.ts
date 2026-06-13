import { haversineDistance, findNearest, countWithinRadius, parseCoordString, Coord } from './haversine';

describe('Haversine Utilities', () => {
  describe('haversineDistance()', () => {
    it('should return 0 for same point', () => {
      const p: Coord = { lat: 37.2005, lng: 127.0985 };
      expect(haversineDistance(p, p)).toBe(0);
    });

    it('should calculate known distance (동탄역 → 삼성전자)', () => {
      const dongtan: Coord = { lat: 37.2005, lng: 127.0985 };
      const samsung: Coord = { lat: 37.2100, lng: 127.0700 };
      const dist = haversineDistance(dongtan, samsung);
      // ~2.7km — should be in 2500~3000m range
      expect(dist).toBeGreaterThan(2500);
      expect(dist).toBeLessThan(3000);
    });

    it('should be symmetric (a→b === b→a)', () => {
      const a: Coord = { lat: 37.5665, lng: 126.9780 }; // 서울시청
      const b: Coord = { lat: 37.2005, lng: 127.0985 }; // 동탄
      expect(haversineDistance(a, b)).toBe(haversineDistance(b, a));
    });
  });

  describe('findNearest()', () => {
    it('should return null for empty POI list', () => {
      expect(findNearest({ lat: 37.2, lng: 127.0 }, [])).toBeNull();
    });

    it('should find the nearest POI', () => {
      const origin: Coord = { lat: 37.2000, lng: 127.1000 };
      const pois = [
        { name: 'Far', lat: 37.3000, lng: 127.2000 },
        { name: 'Near', lat: 37.2010, lng: 127.1010 },
        { name: 'Mid', lat: 37.2200, lng: 127.1200 },
      ];
      const result = findNearest(origin, pois);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Near');
      expect(result!.distance).toBeLessThan(200); // ~150m
    });
  });

  describe('countWithinRadius()', () => {
    it('should count POIs within radius', () => {
      const origin: Coord = { lat: 37.2000, lng: 127.1000 };
      const pois: Coord[] = [
        { lat: 37.2001, lng: 127.1001 }, // ~15m — inside
        { lat: 37.2010, lng: 127.1010 }, // ~150m — inside
        { lat: 37.2100, lng: 127.1100 }, // ~1.5km — outside
      ];
      expect(countWithinRadius(origin, pois, 500)).toBe(2);
      expect(countWithinRadius(origin, pois, 50)).toBe(1);
      expect(countWithinRadius(origin, pois, 5000)).toBe(3);
    });
  });

  describe('parseCoordString()', () => {
    it('should parse valid coordinate string', () => {
      const coord = parseCoordString('37.2005, 127.0985');
      expect(coord).not.toBeNull();
      expect(coord!.lat).toBeCloseTo(37.2005);
      expect(coord!.lng).toBeCloseTo(127.0985);
    });

    it('should parse coordinate strings with brackets, parentheses, or braces', () => {
      const coordBrackets = parseCoordString('[37.2005, 127.0985]');
      expect(coordBrackets).not.toBeNull();
      expect(coordBrackets!.lat).toBeCloseTo(37.2005);

      const coordParens = parseCoordString('(37.2005, 127.0985)');
      expect(coordParens).not.toBeNull();
      expect(coordParens!.lat).toBeCloseTo(37.2005);
    });

    it('should return null for out-of-bounds coordinates', () => {
      expect(parseCoordString('95.0, 127.0')).toBeNull(); // lat > 90
      expect(parseCoordString('37.0, -190.0')).toBeNull(); // lng < -180
    });

    it('should return null for invalid input', () => {
      expect(parseCoordString('abc, def')).toBeNull();
      expect(parseCoordString('')).toBeNull();
    });
  });
});

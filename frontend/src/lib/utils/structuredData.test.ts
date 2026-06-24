import {
  safeJsonLd,
  getMainPageSchema,
  getApartmentSchema,
  getLoungeMainSchema,
  getLoungePostSchema,
  getNewsMainSchema,
  getExploreSchema,
} from './structuredData';

describe('structuredData Utility', () => {
  const baseUrl = 'https://dview-test.com';

  describe('safeJsonLd XSS Defense', () => {
    it('should sanitize special HTML characters to prevent XSS injection in script blocks', () => {
      const dirtyData = {
        title: 'User Input & <script>alert("XSS")</script>',
      };

      const result = safeJsonLd(dirtyData);
      
      // The output __html property must contain escaped unicode notation instead of raw tags
      expect(result.__html).toContain('\\u0026');
      expect(result.__html).toContain('\\u003cscript\\u003e');
      expect(result.__html).toContain('\\u003c/script\\u003e');
      
      // Ensure it is still valid JSON after parsing back
      const parsed = JSON.parse(result.__html.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => 
        String.fromCharCode(parseInt(grp, 16))
      ));
      expect(parsed).toEqual(dirtyData);
    });
  });

  describe('getMainPageSchema', () => {
    it('should generate organization and website graph correctly', () => {
      const schema = getMainPageSchema(baseUrl);
      expect(schema['@context']).toBe('https://schema.org');
      const graph = schema['@graph'];
      expect(graph).toHaveLength(2);

      const website = graph.find(item => item['@type'] === 'WebSite');
      const organization = graph.find(item => item['@type'] === 'Organization');

      expect(website?.url).toBe(baseUrl);
      expect(website?.name).toContain('D-VIEW');
      expect(organization?.url).toBe(baseUrl);
      expect(organization?.logo?.url).toBe(`${baseUrl}/d-view-icon.png`);
    });
  });

  describe('getApartmentSchema', () => {
    it('should generate structured schemas for apartment complexes, places, and real estate agents', () => {
      const params = {
        name: '동탄역 롯데캐슬',
        dong: '오산동',
        address: '경기도 화성시 동탄역로 150',
        description: '동탄역 초역세권 대단지 랜드마크 아파트',
        imageUrl: 'https://dview-test.com/lotte.jpg',
        geo: { latitude: 37.2, longitude: 127.1 },
        pyeongs: [
          {
            pyeong: 34,
            areaM2: 84,
            latestPriceStr: '16.5억',
            maxPriceStr: '22억',
            jeonseRatio: 52,
          },
        ],
      };

      const schema = getApartmentSchema(params, baseUrl);
      expect(schema['@context']).toBe('https://schema.org');
      const graph = schema['@graph'];
      expect(graph).toHaveLength(3);

      const complex = graph.find(item => item['@type'] === 'ApartmentComplex') as any;
      const place = graph.find(item => item['@type'] === 'Place') as any;
      const agent = graph.find(item => item['@type'] === 'RealEstateAgent') as any;

      expect(complex?.name).toBe('동탄역 롯데캐슬');
      expect(complex?.url).toBe(`${baseUrl}/apartment/%EB%8F%99%ED%83%84%EC%97%AD%20%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC`);
      expect(complex?.image).toBe(params.imageUrl);
      expect(complex?.geo?.latitude).toBe(37.2);
      expect(complex?.offers).toHaveLength(1);
      expect(complex?.offers?.[0]?.name).toBe('동탄역 롯데캐슬 34평형');

      expect(place?.containedInPlace?.['@id']).toBe(complex?.['@id']);
      expect(agent?.name).toBe('D-VIEW 부동산 데이터 랩스');
    });

    it('should omit geo coordinates and offers if not provided or empty', () => {
      const params = {
        name: '미지의 단지',
        dong: '청계동',
        address: '경기도 화성시 동탄대로 100',
        description: '단지 정보',
        pyeongs: [],
      };

      const schema = getApartmentSchema(params, baseUrl);
      const complex = schema['@graph'].find(item => item['@type'] === 'ApartmentComplex') as any;

      expect(complex?.geo).toBeUndefined();
      expect(complex?.offers).toBeUndefined();
    });
  });

  describe('getLoungeMainSchema', () => {
    it('should generate Lounge main CollectionPage and BreadcrumbList', () => {
      const schema = getLoungeMainSchema(baseUrl);
      expect(schema['@type']).toBe('CollectionPage');
      expect(schema.url).toBe(`${baseUrl}/lounge`);
      expect(schema.breadcrumb.itemListElement).toHaveLength(2);
      expect(schema.breadcrumb.itemListElement[0].name).toBe('홈');
      expect(schema.breadcrumb.itemListElement[1].item).toBe(`${baseUrl}/lounge`);
    });
  });

  describe('getLoungePostSchema', () => {
    it('should generate DiscussionForumPosting schema with parsed dates and interaction statistics', () => {
      const post = {
        id: 'post-1234',
        title: '동탄 트램 타당성 평가 완료 소식',
        content: '드디어 동탄 트램 타당성 통과했네요! 모두 축하드립니다.',
        author: '동탄지킴이',
        createdAt: '2026-06-24T12:00:00Z',
        commentsCount: 15,
      };

      const schema = getLoungePostSchema(post, baseUrl);
      expect(schema['@type']).toBe('DiscussionForumPosting');
      expect(schema.headline).toBe(post.title);
      expect(schema.articleBody).toBe(post.content);
      expect(schema.author.name).toBe(post.author);
      expect(schema.datePublished).toBe(new Date(post.createdAt).toISOString());
      expect(schema.interactionStatistic.userInteractionCount).toBe(15);
      expect(schema.publisher['@id']).toBe(`${baseUrl}/#organization`);
    });

    it('should default commentsCount to 0 if not provided', () => {
      const post = {
        id: 'post-5678',
        title: '새로운 단지 임장기',
        content: '인프라가 너무 좋네요.',
        author: '임장러',
        createdAt: '2026-06-24T15:30:00Z',
      };

      const schema = getLoungePostSchema(post, baseUrl);
      expect(schema.interactionStatistic.userInteractionCount).toBe(0);
    });
  });

  describe('getNewsMainSchema', () => {
    it('should generate news main CollectionPage and BreadcrumbList', () => {
      const schema = getNewsMainSchema(baseUrl);
      expect(schema['@type']).toBe('CollectionPage');
      expect(schema.url).toBe(`${baseUrl}/news`);
      expect(schema.breadcrumb.itemListElement[1].name).toBe('동탄 소식');
    });
  });

  describe('getExploreSchema', () => {
    it('should generate explore CollectionPage and BreadcrumbList', () => {
      const schema = getExploreSchema(baseUrl);
      expect(schema['@type']).toBe('CollectionPage');
      expect(schema.url).toBe(`${baseUrl}/explore`);
      expect(schema.breadcrumb.itemListElement[1].name).toBe('단지 탐색');
    });
  });
});

/**
 * @jest-environment node
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import PreGaCanonicalSync from '@/components/common/PreGaCanonicalSync';

describe('PreGaCanonicalSync True Node SSR Output', () => {
  it('emits an executable <script> without data-block type when rendered on the server (typeof window === "undefined")', () => {
    expect(typeof window).toBe('undefined');

    const canonicalPath = `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`;
    const ssrHtml = renderToString(<PreGaCanonicalSync canonicalPath={canonicalPath} />);

    expect(ssrHtml).toContain('<script id="dview-pre-ga-canonical-sync">');
    expect(ssrHtml).not.toContain('type="application/json"');
    expect(ssrHtml).toContain('window.history.replaceState');
  });
});

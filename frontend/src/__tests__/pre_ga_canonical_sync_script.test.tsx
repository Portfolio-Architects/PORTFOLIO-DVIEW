import React from 'react';
import { render, act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import '@testing-library/jest-dom';

jest.mock('@/components/DashboardClient', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-dashboard-client" />,
}));

jest.mock('@/components/ads/AdSlot', () => ({
  __esModule: true,
  AdSlot: () => <div data-testid="mock-ad-slot" />,
}));

jest.mock('@/components/common/ReportShareBar', () => ({
  __esModule: true,
  default: ({ canonicalPath }: { canonicalPath: string }) => (
    <div data-testid="mock-report-share-bar" data-canonical-path={canonicalPath} />
  ),
}));

describe('ApartmentPage Pre-GA4 Canonical Sync React 19 Script Safety (Client & Hydration)', () => {
  it('does not trigger React 19 "Encountered a script tag" console error during client rendering while normalizing window.location', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const ApartmentPage = (await import('@/app/apartment/[aptName]/page')).default;

      window.history.replaceState(
        { idx: 1 },
        '',
        `/apartment/${encodeURIComponent('동탄역 시범 리슈빌')}?utm_source=naver#chapter-02`
      );

      const pageJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역 시범 리슈빌') }),
      });

      const { container, unmount } = render(pageJsx);

      const scriptEl = container.querySelector('#dview-pre-ga-canonical-sync');
      expect(scriptEl).not.toBeNull();
      expect(scriptEl?.getAttribute('type')).toBe('application/json');

      const scriptTagErrors = errorSpy.mock.calls
        .map((args) => args.map(String).join(' '))
        .filter((msg) => msg.includes('Encountered a script tag while rendering React component'));

      expect(scriptTagErrors).toEqual([]);
      expect(window.location.pathname).toBe(
        `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );
      expect(window.location.search).toBe('?utm_source=naver');
      expect(window.location.hash).toBe('#chapter-02');

      unmount();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('hydrates executable SSR <script> HTML cleanly without hydration mismatch or script warnings', async () => {
    const PreGaCanonicalSync = (await import('@/components/common/PreGaCanonicalSync')).default;
    const canonicalPath = `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`;
    const safeCanonicalPathJson = JSON.stringify(canonicalPath).replace(/</g, '\\u003c');
    const expectedInlineCode = `(function(){try{var p=${safeCanonicalPathJson};if(typeof window!=='undefined'&&window.location&&window.history&&typeof window.history.replaceState==='function'&&window.location.pathname!==p){window.history.replaceState(window.history.state,'',p+(window.location.search||'')+(window.location.hash||''));}}catch(_){}})();`;
    const ssrHtml = `<script id="dview-pre-ga-canonical-sync">${expectedInlineCode}</script>`;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    container.innerHTML = ssrHtml;
    document.body.appendChild(container);

    let root: ReturnType<typeof hydrateRoot> | null = null;
    try {
      await act(async () => {
        root = hydrateRoot(container, <PreGaCanonicalSync canonicalPath={canonicalPath} />);
      });

      const consoleErrors = errorSpy.mock.calls.map((args) => args.map(String).join(' '));
      expect(consoleErrors).toEqual([]);
    } finally {
      if (root) {
        await act(async () => {
          root!.unmount();
        });
      }
      container.remove();
      errorSpy.mockRestore();
    }
  });
});

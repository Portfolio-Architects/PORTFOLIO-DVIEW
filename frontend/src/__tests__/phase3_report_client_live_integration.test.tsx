import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReportClient from '@/components/ReportClient';
import EngineeringReportClient, {
  isRepoWorkspaceFileHref,
} from '@/components/EngineeringReportClient';
import { getEngineeringReport } from '@/app/actions/getEngineeringReport';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({
    children,
    components,
  }: {
    children: React.ReactNode;
    components?: {
      a?: React.ComponentType<{ href?: string; children?: React.ReactNode }>;
    };
  }) => {
    const raw = typeof children === 'string' ? children : '';
    const linkMatches = Array.from(
      raw.matchAll(/(?<!`)\[(?:`([^`\n]+)`|([^\]\n]+))\]\(([^)\n]+)\)/g)
    );
    const AnchorRenderer = components?.a;

    return (
      <div data-testid="live-react-markdown">
        <div data-testid="raw-markdown-stream">{children}</div>
        <div data-testid="rendered-markdown-links">
          {AnchorRenderer &&
            linkMatches.map((m, idx) => {
              const label = m[1] ?? m[2] ?? '';
              const href = m[3]?.trim() ?? '';
              return (
                <AnchorRenderer key={`${href}-${idx}`} href={href}>
                  {label}
                </AnchorRenderer>
              );
            })}
        </div>
      </div>
    );
  },
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

describe('DVIEW Phase 3 — Live getEngineeringReport -> ReportClient -> EngineeringReportClient Integration', () => {
  it('renders live metadata badges, neutralizes 43 workspace-relative file links against 404 dead anchors, and copies live Markdown', async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const { container } = render(<ReportClient fetchReport={getEngineeringReport} />);

    await waitFor(() => {
      expect(screen.getByText('GRADE S+')).toBeInTheDocument();
      expect(screen.getByText('MASTER')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE PRODUCTION')).toBeInTheDocument();
      expect(screen.getByText('2026-11-14')).toBeInTheDocument();
    });

    expect(screen.getByText('SECTION 1: ENGINEERING REPORT')).toBeInTheDocument();
    const mdNode = screen.getByTestId('raw-markdown-stream');
    expect(mdNode.textContent).toContain('Ad Money v5.1');
    expect(mdNode.textContent).toContain('아파트 183개 단지');
    expect(mdNode.textContent).not.toContain('# PORTFOLIO DVIEW — Engineering Report');

    // Every workspace file link in the live report must render as a safe <span data-repo-doc-ref="...">
    // and ZERO dead <a href="./..."> or <a href="../..."> 404 anchors may exist in the DOM
    const renderedLinksBox = screen.getByTestId('rendered-markdown-links');
    const docRefSpans = renderedLinksBox.querySelectorAll('span[data-repo-doc-ref]');
    expect(docRefSpans.length).toBeGreaterThanOrEqual(40);

    const renderedAnchors = Array.from(container.querySelectorAll('a'));
    const deadRelativeAnchors = renderedAnchors.filter((a) => {
      const href = a.getAttribute('href') ?? '';
      return href.startsWith('./') || href.startsWith('../') || href.endsWith('.md');
    });
    expect(deadRelativeAnchors).toEqual([]);

    fireEvent.click(screen.getByText('Copy MD'));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('preserves navigable anchors for external URLs, in-page #anchors, and valid Next.js routes while blocking workspace file paths', () => {
    expect(isRepoWorkspaceFileHref('./DVIEW_DESIGN.md')).toBe(true);
    expect(isRepoWorkspaceFileHref('../../../docs/adsense-approval-report.md')).toBe(true);
    expect(isRepoWorkspaceFileHref('./frontend/src/app/actions/getEngineeringReport.ts')).toBe(true);
    expect(isRepoWorkspaceFileHref('/DVIEW_AGENT.md')).toBe(true);
    expect(isRepoWorkspaceFileHref('docs/firebase-custom-auth-domain.md')).toBe(true);

    expect(isRepoWorkspaceFileHref('https://dongtanview.com')).toBe(false);
    expect(isRepoWorkspaceFileHref('#13-appendix')).toBe(false);
    expect(isRepoWorkspaceFileHref('/explore')).toBe(false);
    expect(isRepoWorkspaceFileHref('/guide/stress-dsr-valuation-guide')).toBe(false);

    const mixedMarkdown = [
      'External [DongtanView](https://dongtanview.com)',
      'Route [Explore](/explore)',
      'Anchor [Jump](#section-1)',
      'RepoDoc [`DVIEW_DESIGN.md`](../../../DVIEW_DESIGN.md)',
    ].join('\n');

    const { container } = render(
      <EngineeringReportClient
        metadata={{ date: '2026-11-14', grade: 'S+', branch: 'master', status: 'Active Production' }}
        markdownContent={mixedMarkdown}
      />
    );

    const extAnchor = container.querySelector('a[href="https://dongtanview.com"]');
    expect(extAnchor).not.toBeNull();
    expect(extAnchor).toHaveAttribute('target', '_blank');
    expect(extAnchor).toHaveAttribute('rel', 'noopener noreferrer');

    expect(container.querySelector('a[href="/explore"]')).not.toBeNull();
    expect(container.querySelector('a[href="#section-1"]')).not.toBeNull();
    expect(container.querySelector('a[href*="DVIEW_DESIGN.md"]')).toBeNull();
    expect(container.querySelector('span[data-repo-doc-ref="./DVIEW_DESIGN.md"]')).not.toBeNull();
  });
});

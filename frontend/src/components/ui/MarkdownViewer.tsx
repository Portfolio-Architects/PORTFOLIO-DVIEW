import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

interface MarkdownViewerProps {
  content: string;
  components?: Components;
}

const defaultComponents: Components = {
  a: ({ href, children, ...props }) => {
    if (!href) return <span {...props}>{children}</span>;
    
    const isExternal = href.startsWith('http://') || href.startsWith('https://');
    const isInternalDomain = href.includes('dongtanview.com');
    
    // External link: add target="_blank", nofollow, and security headers
    if (isExternal && !isInternalDomain) {
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="nofollow noopener noreferrer" 
          className="text-toss-blue hover:underline font-medium break-all"
        >
          {children}
        </a>
      );
    }
    
    // Internal link: wrap in Next.js Link for fast SPA transition
    return (
      <Link 
        href={href} 
        className="text-toss-blue hover:underline font-medium break-all"
      >
        {children}
      </Link>
    );
  },
  img: ({ src, alt }) => {
    if (!src) return null;
    return (
      // Lazy loading for layout stabilization and performance under slow networks
      <img 
        src={src} 
        alt={alt || '게시글 이미지'} 
        loading="lazy" 
        className="max-w-full rounded-2xl shadow-sm border border-border/40 my-3.5 block object-contain mx-auto"
      />
    );
  }
};

const MarkdownViewer = React.memo(function MarkdownViewer({
  content,
  components
}: MarkdownViewerProps) {
  const mergedComponents = React.useMemo(() => ({
    ...defaultComponents,
    ...components
  }), [components]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mergedComponents}>
      {content}
    </ReactMarkdown>
  );
});

MarkdownViewer.displayName = 'MarkdownViewer';

export default MarkdownViewer;

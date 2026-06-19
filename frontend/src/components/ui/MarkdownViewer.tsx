import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  components?: Components;
}

const MarkdownViewer = React.memo(function MarkdownViewer({
  content,
  className = "prose prose-sm dark:prose-invert max-w-none text-[14px] leading-relaxed text-secondary",
  components
}: MarkdownViewerProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} className={className} components={components}>
      {content}
    </ReactMarkdown>
  );
});

MarkdownViewer.displayName = 'MarkdownViewer';

export default MarkdownViewer;

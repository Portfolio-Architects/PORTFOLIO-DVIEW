import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  components?: Components;
}

const MarkdownViewer = React.memo(function MarkdownViewer({
  content,
  components
}: MarkdownViewerProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
});

MarkdownViewer.displayName = 'MarkdownViewer';

export default MarkdownViewer;

import { useRef, useLayoutEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);

  // Preserve scroll position on content update (Pitfall 4 from RESEARCH.md)
  useLayoutEffect(() => {
    if (containerRef.current) {
      // Capture scroll position before re-render
      scrollTopRef.current = containerRef.current.scrollTop;
    }
  });

  useLayoutEffect(() => {
    if (containerRef.current) {
      // Restore scroll position after content render
      containerRef.current.scrollTop = scrollTopRef.current;
    }
  }, [content]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="prose prose-sm prose-zinc max-w-none px-6 py-6">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {content}
        </Markdown>
      </div>
    </div>
  );
}

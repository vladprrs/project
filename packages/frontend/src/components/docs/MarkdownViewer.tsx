import { useRef, useLayoutEffect } from 'react';

interface MarkdownViewerProps {
  content: string;
}

/**
 * Temporary stub replacing react-markdown viewer.
 * Will be fully replaced by TipTapEditor in plan 02.1-02.
 */
export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);

  // Preserve scroll position on content update
  useLayoutEffect(() => {
    if (containerRef.current) {
      scrollTopRef.current = containerRef.current.scrollTop;
    }
  });

  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollTopRef.current;
    }
  }, [content]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="prose prose-sm prose-zinc max-w-none px-6 py-6">
        <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
      </div>
    </div>
  );
}

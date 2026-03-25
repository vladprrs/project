import { useRef, useEffect, useCallback, useState } from 'react';
import { ChatMessage } from './ChatMessage.js';
import { ActivityIndicator } from './ActivityIndicator.js';

interface UIMessageLike {
  id: string;
  role: 'user' | 'assistant' | string;
  parts: Array<{ type: string; text?: string; [key: string]: any }>;
}

interface ChatHistoryProps {
  messages: UIMessageLike[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
}

export function ChatHistory({
  messages,
  status,
}: ChatHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isNearBottomRef = useRef(true);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }, []);

  // Auto-scroll on new messages if user is near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, status]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }, []);

  const isStreaming = status === 'submitted' || status === 'streaming';

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-4 py-8"
        onScroll={handleScroll}
      >
        {/* Messages */}
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              id={msg.id}
              role={msg.role}
              parts={msg.parts}
            />
          ))}
        </div>

        {/* Activity indicator during streaming */}
        {isStreaming && (
          <ActivityIndicator status={status as 'submitted' | 'streaming'} />
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-white border border-zinc-200 rounded-full p-2 shadow-md hover:bg-zinc-50"
          title="Scroll to bottom"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-600"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}

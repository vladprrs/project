import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useAppStore } from '../store/index.js';
import { useEffect, useCallback, useMemo, useState } from 'react';

export function useChatStream() {
  const activeFeature = useAppStore((s) => s.activeFeature);
  const [input, setInput] = useState('');

  // TextStreamChatTransport for text SSE protocol (per D-01/D-03)
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/chat',
        body: { featureId: activeFeature?.id },
      }),
    [activeFeature?.id]
  );

  const chat = useChat({
    transport,
    onError: (error) => {
      console.error('[chat] Stream error:', error.message);
    },
  });

  // AI SDK v6: status replaces isLoading
  // status: 'submitted' | 'streaming' | 'ready' | 'error'
  const isProcessing = chat.status === 'submitted' || chat.status === 'streaming';
  const isError = chat.status === 'error';

  // Load persisted messages when feature changes
  useEffect(() => {
    if (!activeFeature?.id) {
      chat.setMessages([]);
      return;
    }

    // Stop any in-progress stream before switching features
    chat.stop();

    fetch(`/api/chat/messages?featureId=${activeFeature.id}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        // Messages come newest-first from API, reverse for chronological display
        const uiMessages = data.messages.reverse().map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: msg.content }],
          createdAt: new Date(msg.createdAt),
        }));
        chat.setMessages(uiMessages);
      })
      .catch((err) => console.error('[chat] Failed to load history:', err));
  }, [activeFeature?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist messages after completion
  const persistMessage = useCallback(
    async (role: 'user' | 'assistant', content: string) => {
      if (!activeFeature?.id || !content.trim()) return;
      try {
        await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featureId: activeFeature.id,
            role,
            content,
          }),
        });
      } catch (err) {
        console.error('[chat] Failed to persist message:', err);
      }
    },
    [activeFeature?.id]
  );

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    isProcessing,
    isError,
    input,
    setInput,
    sendMessage: chat.sendMessage,
    regenerate: chat.regenerate,
    stop: chat.stop,
    setMessages: chat.setMessages,
    persistMessage,
  };
}

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useAppStore } from '../store/index.js';
import { useEffect, useCallback, useMemo, useRef, useState } from 'react';

export function useChatStream() {
  const activeFeature = useAppStore((s) => s.activeFeature);
  const [input, setInput] = useState('');

  // Use a ref to track activeFeature so onFinish always has the current value.
  // Without this, if the user switches features mid-stream, the onFinish
  // callback would capture the stale activeFeature from when useChat was
  // configured, persisting the message under the wrong featureId.
  const activeFeatureRef = useRef(activeFeature);
  useEffect(() => {
    activeFeatureRef.current = activeFeature;
  }, [activeFeature]);

  // TextStreamChatTransport for text SSE protocol (per D-01/D-03)
  // Use a function for body so featureId is resolved fresh on each request
  // via the ref. This avoids stale closures when useChat caches the transport.
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/chat',
        body: () => ({ featureId: activeFeatureRef.current?.id }),
      }),
    [] // singleton — body function reads from ref
  );

  const chat = useChat({
    transport,
    onError: (error) => {
      console.error('[chat] Stream error:', error.message);
    },
    onFinish: ({ message }) => {
      // Persist completed assistant message per D-08
      // Use activeFeatureRef.current to avoid stale closure if user
      // switched features during streaming
      const textContent = message.parts
        .filter((p) => p.type === 'text' && 'text' in p)
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join('');
      if (textContent && activeFeatureRef.current?.id) {
        fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featureId: activeFeatureRef.current.id,
            role: 'assistant',
            content: textContent,
          }),
        }).catch((err) => console.error('[chat] Failed to persist assistant message:', err));
      }
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

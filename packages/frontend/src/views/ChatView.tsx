import { useState, useCallback } from 'react';
import { useChatStream } from '../hooks/useChatStream.js';
import { useAppStore } from '../store/index.js';
import { ChatHistory } from '../components/chat/ChatHistory.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import { ErrorBanner } from '../components/chat/ErrorBanner.js';

export function ChatView() {
  const activeFeature = useAppStore((s) => s.activeFeature);
  const {
    messages,
    status,
    error,
    isProcessing,
    isError,
    input,
    setInput,
    sendMessage,
    regenerate,
    persistMessage,
  } = useChatStream();

  const [errorDismissed, setErrorDismissed] = useState(false);

  // Reset error dismissed state when a new error occurs
  if (isError && errorDismissed) {
    setErrorDismissed(false);
  }

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isProcessing) return;

    // Clear input immediately
    setInput('');

    // Persist user message
    persistMessage('user', text);

    // Send via AI SDK v6 -- sendMessage takes { text: string } for text protocol
    sendMessage({ text });
  }, [input, isProcessing, sendMessage, setInput, persistMessage]);

  const handleRetry = useCallback(() => {
    setErrorDismissed(false);
    regenerate();
  }, [regenerate]);

  // No feature selected empty state
  if (!activeFeature) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white">
        <h2 className="text-lg font-semibold text-zinc-400 mb-2">No feature selected</h2>
        <p className="text-sm text-zinc-400 max-w-sm text-center">
          Activate a feature to start chatting. Features are loaded from the specs/ directory.
        </p>
      </div>
    );
  }

  // Empty chat state (feature selected but no messages)
  if (messages.length === 0 && status === 'ready') {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">Start a conversation</h2>
          <p className="text-sm text-zinc-400 max-w-sm text-center">
            Type a command to invoke a workflow stage. Try asking to generate a spec or build a plan.
          </p>
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          disabled={isProcessing}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Message history */}
      <ChatHistory
        messages={messages}
        status={status}
      />

      {/* Error banner (conditional) */}
      {isError && !errorDismissed && error && (
        <ErrorBanner
          message={error.message || 'Unknown error'}
          onRetry={handleRetry}
          onDismiss={() => setErrorDismissed(true)}
        />
      )}

      {/* Chat input */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        disabled={isProcessing}
      />
    </div>
  );
}

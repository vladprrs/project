import { useRef, type KeyboardEvent } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export function ChatInput({ input, setInput, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !disabled) {
        onSend();
      }
    }
    // Shift+Enter inserts newline (default behavior)
  };

  // Auto-resize textarea up to 4 lines
  const handleInput = (value: string) => {
    setInput(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 4 * 21; // 4 lines * 21px line height
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
  };

  return (
    <div className="border-t border-zinc-200 bg-zinc-100 px-4 py-3 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a command..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
      />
      <button
        onClick={onSend}
        disabled={!input.trim() || disabled}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        Send Message
      </button>
    </div>
  );
}

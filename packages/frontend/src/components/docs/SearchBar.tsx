import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { findNext, findPrev } from 'prosemirror-search';

interface SearchBarProps {
  editor: Editor;
  onClose: () => void;
}

export function SearchBar({ editor, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    editor.commands.setSearchQuery(value);
  };

  const handleNext = () => {
    findNext(editor.view.state, editor.view.dispatch, editor.view);
  };

  const handlePrev = () => {
    findPrev(editor.view.state, editor.view.dispatch, editor.view);
  };

  const handleClose = () => {
    editor.commands.clearSearch();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <div className="absolute top-2 right-4 z-10 flex items-center gap-1 bg-white border border-zinc-300 rounded-lg shadow-md px-2 py-1">
      <Search size={14} className="text-zinc-400 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleQueryChange}
        onKeyDown={handleKeyDown}
        placeholder="Find in document..."
        className="text-xs outline-none w-44 placeholder:text-zinc-400"
      />
      <button
        onClick={handlePrev}
        className="p-0.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded"
        title="Previous match (Shift+Enter)"
      >
        <ChevronUp size={14} />
      </button>
      <button
        onClick={handleNext}
        className="p-0.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded"
        title="Next match (Enter)"
      >
        <ChevronDown size={14} />
      </button>
      <button
        onClick={handleClose}
        className="p-0.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded"
        title="Close search (Esc)"
      >
        <X size={14} />
      </button>
    </div>
  );
}

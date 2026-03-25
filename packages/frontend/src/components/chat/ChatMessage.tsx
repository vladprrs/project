import { useAppStore } from '../../store/index.js';
import { useCallback } from 'react';
import type { ReactNode } from 'react';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant' | string;
  parts: Array<{ type: string; text?: string; [key: string]: any }>;
}

// Matches artifact filenames like spec.md, plan.md, tasks.md, contracts/api.md
// Also matches full paths like specs/feature-name/spec.md
const ARTIFACT_PATTERN =
  /\b(?:specs\/[\w-]+\/)?(spec|plan|tasks|research|data-model|quickstart|clarifications|contracts\/api)\.md\b/g;

export function ChatMessage({ id, role, parts }: ChatMessageProps) {
  const activeFeature = useAppStore((s) => s.activeFeature);
  const openTab = useAppStore((s) => s.openTab);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const handleArtifactClick = useCallback(
    (filename: string) => {
      if (!activeFeature) return;
      // Resolve to full path if it's just a filename
      const fullPath = filename.startsWith('specs/')
        ? filename
        : `specs/${activeFeature.directory}/${filename}`;

      // Fetch file content and open tab
      fetch(`/api/files/read?path=${encodeURIComponent(fullPath)}`)
        .then((r) => {
          if (!r.ok) throw new Error('File not found');
          return r.json();
        })
        .then((data) => {
          openTab(fullPath, data.content);
          setActiveView('docs');
        })
        .catch((err) => {
          console.error('[chat] Failed to open artifact:', err);
        });
    },
    [activeFeature, openTab, setActiveView]
  );

  // Extract text from parts (AI SDK v6 UIMessage format)
  const textContent = parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join('');

  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-50 text-zinc-900'
            : 'bg-white text-zinc-900'
        }`}
      >
        {renderTextWithArtifactLinks(textContent, handleArtifactClick)}
      </div>
    </div>
  );
}

function renderTextWithArtifactLinks(
  text: string,
  onArtifactClick: (path: string) => void
): ReactNode[] {
  const result: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(ARTIFACT_PATTERN)) {
    const matchIndex = match.index!;
    if (matchIndex > lastIndex) {
      result.push(text.slice(lastIndex, matchIndex));
    }
    const filename = match[0];
    result.push(
      <button
        key={`artifact-${matchIndex}`}
        onClick={() => onArtifactClick(filename)}
        className="text-blue-600 hover:underline font-semibold cursor-pointer"
      >
        {filename}
      </button>
    );
    lastIndex = matchIndex + filename.length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  // If no artifact links found, return the raw text preserving whitespace
  if (result.length === 0) {
    result.push(text);
  }

  return result;
}

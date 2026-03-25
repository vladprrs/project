import { X, FileText } from 'lucide-react';
import type { DiffHunk } from '../../lib/diff-compute.js';

interface DiffOverlayProps {
  hunks: DiffHunk[];
  onDismiss: () => void;
}

export function DiffOverlay({ hunks, onDismiss }: DiffOverlayProps) {
  const addedCount = hunks.filter((h) => h.type === 'added').length;
  const removedLines = hunks
    .filter((h) => h.type === 'removed')
    .reduce((sum, h) => sum + h.lineCount, 0);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b border-green-200 text-xs text-green-800">
      <FileText size={14} />
      <span>
        Document changed &mdash; showing {addedCount} addition{addedCount !== 1 ? 's' : ''}
        {removedLines > 0 && (
          <>, {removedLines} line{removedLines !== 1 ? 's' : ''} removed</>
        )}
      </span>
      <button
        onClick={onDismiss}
        className="ml-auto p-0.5 rounded hover:bg-green-100 transition-colors"
        title="Dismiss diff view"
      >
        <X size={14} />
      </button>
    </div>
  );
}

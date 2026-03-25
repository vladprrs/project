import { Lock, Pencil, Save } from 'lucide-react';

interface EditorToolbarProps {
  mode: 'read' | 'edit';
  isDirty: boolean;
  onToggleMode: () => void;
  onSave: () => void;
}

export function EditorToolbar({ mode, isDirty, onToggleMode, onSave }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-200 bg-zinc-50 text-xs shrink-0">
      <button
        onClick={onToggleMode}
        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
          mode === 'read'
            ? 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
        }`}
        title={mode === 'read' ? 'Switch to edit mode' : 'Switch to read-only mode'}
      >
        {mode === 'read' ? (
          <>
            <Lock size={14} />
            <span>Read-only</span>
          </>
        ) : (
          <>
            <Pencil size={14} />
            <span>Editing</span>
          </>
        )}
      </button>
      {mode === 'edit' && (
        <button
          onClick={onSave}
          disabled={!isDirty}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
            isDirty
              ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer'
              : 'text-zinc-400 cursor-default'
          }`}
          title={isDirty ? 'Save document (Ctrl+S)' : 'No unsaved changes'}
        >
          <Save size={14} />
          <span>{isDirty ? 'Save' : 'Saved'}</span>
        </button>
      )}
    </div>
  );
}

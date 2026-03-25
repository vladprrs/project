import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useEffect, useRef, useCallback } from 'react';

const lowlight = createLowlight(common);

interface TipTapEditorProps {
  content: string;
  editable: boolean;
  onUpdate?: (markdown: string) => void;
  onEditorReady?: (editor: Editor) => void;
}

export function TipTapEditor({ content, editable, onUpdate, onEditorReady }: TipTapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      if (onUpdate) {
        onUpdate(editor.getMarkdown());
      }
    },
    [onUpdate],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Empty document' }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    contentType: 'markdown',
    editable,
    shouldRerenderOnTransaction: false,
    onUpdate: handleUpdate,
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Toggle editable state when prop changes (do NOT rely on useEditor option for runtime reactivity)
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Update content from live-reload (read-only mode) with scroll preservation
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    // Skip if in edit mode -- don't overwrite user edits
    // (conflict warning handled by Plan 05)
    if (editable) return;

    // Capture scroll position before content update
    const container = containerRef.current;
    const scrollTop = container ? container.scrollTop : 0;

    editor.commands.setContent(content, { contentType: 'markdown' });

    // Restore scroll position after ProseMirror re-renders
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = scrollTop;
      });
    }
  }, [content, editor, editable]);

  if (!editor) return null;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="prose prose-sm prose-zinc max-w-none px-6 py-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

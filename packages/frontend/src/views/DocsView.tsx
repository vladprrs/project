import { useAppStore } from '../store/index.js';
import { TabBar } from '../components/docs/TabBar.js';
import { TipTapEditor } from '../components/docs/TipTapEditor.js';
import { EditorToolbar } from '../components/docs/EditorToolbar.js';
import { EmptyDocs } from '../components/docs/EmptyDocs.js';
import { DiffOverlay } from '../components/docs/DiffOverlay.js';
import { useCallback, useRef, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { SearchBar } from '../components/docs/SearchBar.js';

export function DocsView() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const setTabMode = useAppStore((s) => s.setTabMode);
  const setTabDirty = useAppStore((s) => s.setTabDirty);
  const updateTabContent = useAppStore((s) => s.updateTabContent);
  const diffData = useAppStore((s) => s.diffData);
  const clearDiffData = useAppStore((s) => s.clearDiffData);

  // Conflict state (Plan 05)
  const conflictFilePath = useAppStore((s) => s.conflictFilePath);
  const conflictContent = useAppStore((s) => s.conflictContent);
  const clearConflict = useAppStore((s) => s.clearConflict);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useRef<Editor | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeDiff = activeTab ? diffData.get(activeTab.filePath) : undefined;
  const activeDiffRef = useRef(activeDiff);
  activeDiffRef.current = activeDiff;

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
    // Apply pending diff decorations after editor is fully initialized
    const pendingDiff = activeDiffRef.current;
    if (pendingDiff && pendingDiff.length > 0) {
      requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          editor.commands.setDiffDecorations(pendingDiff);
        }
      });
    }
  }, []);

  const handleUpdate = useCallback(
    (markdown: string) => {
      if (!activeTab) return;
      // Update content and mark dirty atomically (don't use updateTabContent
      // which resets isDirty -- that's for live-reload)
      useAppStore.setState((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === activeTab.id ? { ...t, content: markdown, isDirty: true } : t
        ),
      }));
    },
    [activeTab],
  );

  const handleSave = useCallback(async () => {
    if (!activeTab || !activeTab.isDirty) return;
    const editor = editorRef.current;
    if (!editor) return;

    const markdown = editor.getMarkdown();

    try {
      const res = await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: activeTab.filePath, content: markdown }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        console.error('[save] Failed:', err.error);
        return;
      }
      // Update store: save the serialized content and reset dirty flag
      updateTabContent(activeTab.id, markdown);
      setTabDirty(activeTab.id, false);
      console.log('[save] Saved:', activeTab.filePath);
    } catch (err) {
      console.error('[save] Network error:', err);
    }
  }, [activeTab, updateTabContent, setTabDirty]);

  const handleToggleMode = useCallback(() => {
    if (!activeTab) return;

    if (activeTab.mode === 'edit' && activeTab.isDirty) {
      // Prompt: save or discard before switching to read mode
      const shouldSave = window.confirm(
        'You have unsaved changes. Click OK to save before switching to read-only, or Cancel to discard changes.'
      );
      if (shouldSave) {
        // Save first, then switch mode
        handleSave().then(() => {
          setTabMode(activeTab.id, 'read');
        });
        return;
      } else {
        // Discard: reset dirty and switch mode
        setTabDirty(activeTab.id, false);
      }
    }

    const newMode = activeTab.mode === 'read' ? 'edit' : 'read';
    setTabMode(activeTab.id, newMode);
  }, [activeTab, handleSave, setTabMode, setTabDirty]);

  // Conflict resolution handlers (Plan 05)
  const handleReloadFromDisk = useCallback(() => {
    if (!activeTab || !conflictContent) return;
    // Accept disk version: update content, reset dirty, switch to read mode
    updateTabContent(activeTab.id, conflictContent);
    setTabDirty(activeTab.id, false);
    setTabMode(activeTab.id, 'read');
    clearConflict();
  }, [activeTab, conflictContent, updateTabContent, setTabDirty, setTabMode, clearConflict]);

  const handleKeepMyChanges = useCallback(() => {
    // Dismiss the warning, keep editing
    clearConflict();
  }, [clearConflict]);

  // Apply or clear diff decorations when activeDiff changes while editor is mounted
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;

    if (activeDiff && activeDiff.length > 0) {
      editor.commands.setDiffDecorations(activeDiff);
    } else {
      editor.commands.clearDiffDecorations();
    }
  }, [activeDiff]);

  const handleDismissDiff = useCallback(() => {
    if (!activeTab) return;
    editorRef.current?.commands.clearDiffDecorations();
    clearDiffData(activeTab.filePath);
  }, [activeTab, clearDiffData]);

  // Ctrl+S / Cmd+S to save, Cmd+F / Ctrl+F to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchVisible(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Live-reload during search: re-run search query when content updates
  useEffect(() => {
    if (searchVisible && editorRef.current && searchQuery) {
      editorRef.current.commands.setSearchQuery(searchQuery);
    }
  }, [activeTab?.content, searchVisible, searchQuery]);

  // Empty state: no tabs open
  if (tabs.length === 0) {
    return <EmptyDocs />;
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <TabBar
        tabs={tabs.map((t) => ({ id: t.id, displayName: t.displayName, isDirty: t.isDirty }))}
        activeTabId={activeTabId}
        onTabClick={setActiveTab}
        onTabClose={closeTab}
      />
      {activeTab ? (
        <>
          <EditorToolbar
            mode={activeTab.mode}
            isDirty={activeTab.isDirty}
            onToggleMode={handleToggleMode}
            onSave={handleSave}
          />
          {conflictFilePath && activeTab && conflictFilePath === activeTab.filePath && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
              <span className="font-medium">File changed on disk.</span>
              <span>This document was modified externally while you have unsaved changes.</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleReloadFromDisk}
                  className="px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded text-amber-900 font-medium"
                >
                  Reload from disk
                </button>
                <button
                  onClick={handleKeepMyChanges}
                  className="px-2 py-1 hover:bg-amber-100 rounded"
                >
                  Keep my changes
                </button>
              </div>
            </div>
          )}
          {activeDiff && activeDiff.length > 0 && (
            <DiffOverlay hunks={activeDiff} onDismiss={handleDismissDiff} />
          )}
          <div className="relative flex-1 flex flex-col overflow-hidden">
            {searchVisible && editorRef.current && (
              <SearchBar
                editor={editorRef.current}
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onClose={() => {
                  setSearchVisible(false);
                  setSearchQuery('');
                  editorRef.current?.commands.clearSearch();
                }}
              />
            )}
            <TipTapEditor
              key={activeTab.id}
              content={activeTab.content}
              editable={activeTab.mode === 'edit'}
              onUpdate={handleUpdate}
              onEditorReady={handleEditorReady}
            />
          </div>
        </>
      ) : (
        <EmptyDocs />
      )}
    </div>
  );
}

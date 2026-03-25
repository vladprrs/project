import { useAppStore } from '../store/index.js';
import { TabBar } from '../components/docs/TabBar.js';
import { TipTapEditor } from '../components/docs/TipTapEditor.js';
import { EditorToolbar } from '../components/docs/EditorToolbar.js';
import { EmptyDocs } from '../components/docs/EmptyDocs.js';
import { useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';

export function DocsView() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const setTabMode = useAppStore((s) => s.setTabMode);
  const setTabDirty = useAppStore((s) => s.setTabDirty);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useRef<Editor | null>(null);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleToggleMode = useCallback(() => {
    if (!activeTab) return;
    if (activeTab.mode === 'read') {
      setTabMode(activeTab.id, 'edit');
    } else {
      // Switch back to read-only (conflict/unsaved prompts added in Plan 05)
      setTabMode(activeTab.id, 'read');
      setTabDirty(activeTab.id, false);
    }
  }, [activeTab, setTabMode, setTabDirty]);

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
          />
          <TipTapEditor
            key={activeTab.id}
            content={activeTab.content}
            editable={activeTab.mode === 'edit'}
            onUpdate={handleUpdate}
            onEditorReady={handleEditorReady}
          />
        </>
      ) : (
        <EmptyDocs />
      )}
    </div>
  );
}

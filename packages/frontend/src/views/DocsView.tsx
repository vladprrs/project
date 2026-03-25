import { useAppStore } from '../store/index.js';
import { TabBar } from '../components/docs/TabBar.js';
import { MarkdownViewer } from '../components/docs/MarkdownViewer.js';
import { EmptyDocs } from '../components/docs/EmptyDocs.js';

export function DocsView() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Empty state: no tabs open
  if (tabs.length === 0) {
    return <EmptyDocs />;
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <TabBar
        tabs={tabs.map((t) => ({ id: t.id, displayName: t.displayName }))}
        activeTabId={activeTabId}
        onTabClick={setActiveTab}
        onTabClose={closeTab}
      />
      {activeTab ? (
        <MarkdownViewer content={activeTab.content} />
      ) : (
        <EmptyDocs />
      )}
    </div>
  );
}

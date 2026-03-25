interface Tab {
  id: string;
  displayName: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabClick, onTabClose }: TabBarProps) {
  return (
    <div className="flex items-center gap-0 border-b border-zinc-200 bg-zinc-50 h-12 px-2 overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-1 px-3 h-12 text-xs font-semibold cursor-pointer select-none ${
              isActive
                ? 'text-zinc-900 border-b-2 border-zinc-900 bg-white'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            }`}
            onClick={() => onTabClick(tab.id)}
          >
            <span>{tab.displayName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="ml-1 text-zinc-400 hover:text-zinc-600 rounded p-0.5"
              title={`Close ${tab.displayName}`}
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}

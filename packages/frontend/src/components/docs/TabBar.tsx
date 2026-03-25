import { useRef, useState, useEffect, useCallback } from 'react';

interface Tab {
  id: string;
  displayName: string;
  isDirty?: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabClick, onTabClose }: TabBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollIndicators();

    el.addEventListener('scroll', updateScrollIndicators, { passive: true });

    const observer = new ResizeObserver(updateScrollIndicators);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollIndicators);
      observer.disconnect();
    };
  }, [updateScrollIndicators, tabs.length]);

  return (
    <div className="relative shrink-0">
      <div
        ref={containerRef}
        className="flex items-center gap-0 border-b border-zinc-200 bg-zinc-50 h-12 px-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-3 h-12 text-xs font-semibold cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? 'text-zinc-900 border-b-2 border-zinc-900 bg-white'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
              }`}
              onClick={() => onTabClick(tab.id)}
            >
              <span>{tab.displayName}</span>
              {tab.isDirty && (
                <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" title="Unsaved changes" />
              )}
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
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-zinc-50 to-transparent pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-zinc-50 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

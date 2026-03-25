import type { ReactNode } from 'react';
import { IconRail } from './components/IconRail.js';
import { ChatView } from './views/ChatView.js';
import { DocsView } from './views/DocsView.js';
import { KanbanView } from './views/KanbanView.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useAppStore, type View } from './store/index.js';

const VIEWS: Record<View, () => ReactNode> = {
  chat: ChatView,
  docs: DocsView,
  kanban: KanbanView,
};

export function App() {
  useWebSocket();
  const activeView = useAppStore((s) => s.activeView);
  const ActiveComponent = VIEWS[activeView];

  return (
    <div className="flex h-screen bg-white">
      <IconRail />
      <ActiveComponent />
    </div>
  );
}

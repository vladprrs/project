import { MessageSquare, FileText, LayoutDashboard } from 'lucide-react';
import { useAppStore, type View } from '../store/index.js';
import { ConnectionDot } from './ConnectionDot.js';

const NAV_ITEMS: { id: View; icon: typeof MessageSquare; label: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'docs', icon: FileText, label: 'Docs' },
  { id: 'kanban', icon: LayoutDashboard, label: 'Kanban' },
];

export function IconRail() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <nav className="flex flex-col items-center w-12 border-r border-zinc-200 bg-white">
      <div className="flex-1 flex flex-col items-center gap-1 pt-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              activeView === id
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
            title={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
      <ConnectionDot />
    </nav>
  );
}

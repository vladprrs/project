import { useAppStore } from '../store/index.js';

const STATUS_CONFIG = {
  connected: { color: 'bg-green-500', label: 'Connected' },
  reconnecting: { color: 'bg-amber-500', label: 'Reconnecting...' },
  disconnected: { color: 'bg-red-500', label: 'Disconnected' },
} as const;

export function ConnectionDot() {
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const { color, label } = STATUS_CONFIG[connectionStatus];

  return (
    <div className="pb-3 flex justify-center" title={label}>
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
    </div>
  );
}

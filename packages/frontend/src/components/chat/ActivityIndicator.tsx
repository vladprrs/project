interface ActivityIndicatorProps {
  status: 'submitted' | 'streaming';
}

export function ActivityIndicator({ status }: ActivityIndicatorProps) {
  const text = status === 'submitted' ? 'Thinking...' : 'Generating response...';

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
      </span>
      <span className="text-xs font-semibold text-zinc-500">{text}</span>
    </div>
  );
}

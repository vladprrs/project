export function EmptyDocs() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white">
      <h2 className="text-lg font-semibold text-zinc-400 mb-2">No documents open</h2>
      <p className="text-sm text-zinc-400 max-w-sm text-center">
        Open a document from a chat artifact link, or documents will appear here automatically as agents create them.
      </p>
    </div>
  );
}

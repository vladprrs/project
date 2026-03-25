export interface EditorTab {
  id: string;        // filePath used as unique key
  filePath: string;  // e.g. "specs/002-chat-doc-editor/spec.md"
  displayName: string; // e.g. "spec.md" or "contracts/api.md"
  content: string;
  lastLoadedAt: number; // Date.now() timestamp
  mode: 'read' | 'edit';    // current editor mode
  isDirty: boolean;          // unsaved changes flag
}

export interface ArtifactLink {
  filename: string;  // matched artifact name e.g. "spec.md"
  fullPath: string;  // resolved path e.g. "specs/002-chat-doc-editor/spec.md"
}

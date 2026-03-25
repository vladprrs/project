export interface EditorTab {
  id: string;
  filePath: string;
  displayName: string;
  content: string;
  lastLoadedAt: number;
}

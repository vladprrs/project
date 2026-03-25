import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Feature } from '@specflow/shared';
import type { EditorTab } from '@specflow/shared';
import type { DiffHunk } from '../lib/diff-compute.js';

export type View = 'chat' | 'docs' | 'kanban';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface AppStore {
  // Navigation (from Phase 1)
  activeView: View;
  connectionStatus: ConnectionStatus;
  activeFeature: Feature | null;
  setActiveView: (view: View) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveFeature: (feature: Feature | null) => void;

  // Editor tabs (Phase 2 - ephemeral, NOT persisted per D-10)
  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (filePath: string, content: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;

  // Mode and dirty state (Phase 02.1 - edit mode toggle)
  setTabMode: (tabId: string, mode: 'read' | 'edit') => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;

  // Snapshot support for diff view (used by Plan 04)
  snapshotTabs: Map<string, string>;
  captureSnapshot: () => void;
  getSnapshot: (filePath: string) => string | undefined;
  clearSnapshot: (filePath?: string) => void;

  // Diff state per tab (Plan 04)
  diffData: Map<string, DiffHunk[]>;
  setDiffData: (filePath: string, hunks: DiffHunk[]) => void;
  clearDiffData: (filePath?: string) => void;
}

function getDisplayName(filePath: string): string {
  // specs/{feature}/spec.md -> spec.md
  // specs/{feature}/contracts/api.md -> contracts/api.md
  const parts = filePath.split('/');
  if (parts.length >= 3 && parts[0] === 'specs') {
    // Remove "specs/{feature}/" prefix, keep the rest
    return parts.slice(2).join('/');
  }
  // Fallback: last two segments
  return parts.slice(-2).join('/');
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Navigation (from Phase 1)
      activeView: 'chat',
      connectionStatus: 'disconnected',
      activeFeature: null,
      setActiveView: (view) => set({ activeView: view }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setActiveFeature: (feature) => set({ activeFeature: feature }),

      // Editor tabs (Phase 2)
      tabs: [],
      activeTabId: null,

      openTab: (filePath, content) => {
        const state = get();
        // Dedup: if tab already exists, just activate it
        const existing = state.tabs.find((t) => t.filePath === filePath);
        if (existing) {
          set({ activeTabId: existing.id });
          return;
        }
        const newTab: EditorTab = {
          id: filePath, // filePath IS the unique ID
          filePath,
          displayName: getDisplayName(filePath),
          content,
          lastLoadedAt: Date.now(),
          mode: 'read',    // default to read-only mode
          isDirty: false,   // no unsaved changes on open
        };
        set({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        });
      },

      closeTab: (tabId) => {
        const state = get();
        const idx = state.tabs.findIndex((t) => t.id === tabId);
        if (idx === -1) return;

        const newTabs = state.tabs.filter((t) => t.id !== tabId);
        let newActiveId = state.activeTabId;

        // If closing the active tab, activate adjacent (prefer right, then left)
        if (state.activeTabId === tabId) {
          if (newTabs.length === 0) {
            newActiveId = null;
          } else if (idx < newTabs.length) {
            newActiveId = newTabs[idx]!.id; // right neighbor
          } else {
            newActiveId = newTabs[newTabs.length - 1]!.id; // left neighbor
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveId });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      updateTabContent: (tabId, content) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, content, lastLoadedAt: Date.now(), isDirty: false }
              : t
          ),
        }));
      },

      // Mode toggle (Phase 02.1)
      setTabMode: (tabId, mode) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, mode } : t
          ),
        }));
      },

      setTabDirty: (tabId, isDirty) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, isDirty } : t
          ),
        }));
      },

      // Snapshot support (Phase 02.1 - for diff view in Plan 04)
      snapshotTabs: new Map(),

      captureSnapshot: () => {
        const state = get();
        const snapshot = new Map<string, string>();
        for (const tab of state.tabs) {
          snapshot.set(tab.filePath, tab.content);
        }
        set({ snapshotTabs: snapshot });
      },

      getSnapshot: (filePath) => {
        return get().snapshotTabs.get(filePath);
      },

      clearSnapshot: (filePath) => {
        set((state) => {
          if (filePath) {
            const newMap = new Map(state.snapshotTabs);
            newMap.delete(filePath);
            return { snapshotTabs: newMap };
          }
          return { snapshotTabs: new Map() };
        });
      },

      // Diff data (Plan 04)
      diffData: new Map(),

      setDiffData: (filePath, hunks) => {
        set((state) => {
          const newMap = new Map(state.diffData);
          newMap.set(filePath, hunks);
          return { diffData: newMap };
        });
      },

      clearDiffData: (filePath) => {
        set((state) => {
          if (filePath) {
            const newMap = new Map(state.diffData);
            newMap.delete(filePath);
            return { diffData: newMap };
          }
          return { diffData: new Map() };
        });
      },
    }),
    {
      name: 'specflow-app',
      // Per D-10: ONLY persist activeView. Tabs, snapshots, and diff data are ephemeral.
      partialize: (state) => ({ activeView: state.activeView }),
    }
  )
);

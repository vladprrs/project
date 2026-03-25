import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Feature } from '@specflow/shared';

export type View = 'chat' | 'docs' | 'kanban';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface AppStore {
  activeView: View;
  connectionStatus: ConnectionStatus;
  activeFeature: Feature | null;
  setActiveView: (view: View) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveFeature: (feature: Feature | null) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeView: 'chat',
      connectionStatus: 'disconnected',
      activeFeature: null,
      setActiveView: (view) => set({ activeView: view }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setActiveFeature: (feature) => set({ activeFeature: feature }),
    }),
    {
      name: 'specflow-app',
      partialize: (state) => ({ activeView: state.activeView }),
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type View = 'chat' | 'docs' | 'kanban';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface AppStore {
  activeView: View;
  connectionStatus: ConnectionStatus;
  setActiveView: (view: View) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeView: 'chat',
      connectionStatus: 'disconnected',
      setActiveView: (view) => set({ activeView: view }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
    }),
    {
      name: 'specflow-app',
      partialize: (state) => ({ activeView: state.activeView }),
    }
  )
);

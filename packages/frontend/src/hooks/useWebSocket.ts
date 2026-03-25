import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/index.js';
import type { MessageEnvelope } from '@specflow/shared';

const MAX_RETRIES = 10;
const BASE_DELAY = 1000;

export function useWebSocket() {
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const setActiveFeature = useAppStore((s) => s.setActiveFeature);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      if (disposed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;
      setConnectionStatus('reconnecting');

      ws.onopen = () => {
        if (disposed) { ws.close(); return; }
        retriesRef.current = 0;
        setConnectionStatus('connected');
        console.log('[ws] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as MessageEnvelope;
          if (message.channel === 'snapshot') {
            setActiveFeature(message.payload.activeFeature);
            console.log('[ws] Snapshot received:', message.payload.activeFeature?.name ?? 'no active feature');
          } else if (message.channel === 'filesystem') {
            const payload = message.payload;
            const store = useAppStore.getState();

            if (payload.type === 'changed' && 'content' in payload) {
              // Update tab content if this file is open (EDIT-02: live-reload)
              const tab = store.tabs.find((t) => t.filePath === payload.path);
              if (tab) {
                // Guard: do not overwrite dirty edits (conflict handled in Plan 05)
                if (tab.mode === 'edit' && tab.isDirty) {
                  console.log(`[ws] Skipping live-reload for dirty tab: ${payload.path}`);
                } else {
                  store.updateTabContent(tab.id, payload.content);
                }
              }
            }

            if (payload.type === 'created' && 'content' in payload) {
              // Auto-open tab for new artifact in active feature directory (EDIT-04)
              const feature = store.activeFeature;
              if (feature && payload.path.startsWith(`specs/${feature.directory}/`)) {
                // CRITICAL: Capture the current activeTabId BEFORE calling openTab,
                // because openTab mutates activeTabId to the new tab.
                // For auto-opened tabs (filesystem:created), we do NOT want to steal
                // focus from the tab the user is currently viewing.
                const previousActiveTabId = store.activeTabId;
                store.openTab(payload.path, payload.content);
                // Restore previous active tab if one was already active
                if (previousActiveTabId && store.tabs.find((t) => t.id === previousActiveTabId)) {
                  store.setActiveTab(previousActiveTabId);
                }
              }
            }

            if (payload.type === 'deleted') {
              // Close tab if file was deleted (UI-SPEC: tab removed, adjacent tab activated)
              const tab = store.tabs.find((t) => t.filePath === payload.path);
              if (tab) {
                store.closeTab(tab.id);
              }
            }

            console.log('[ws] Filesystem:', payload.type, payload.path);
          }
        } catch (err) {
          console.error('[ws] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setConnectionStatus('disconnected');
        if (retriesRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retriesRef.current) + Math.random() * 1000;
          retriesRef.current++;
          setConnectionStatus('reconnecting');
          console.log(`[ws] Reconnecting in ${Math.round(delay)}ms (attempt ${retriesRef.current}/${MAX_RETRIES})`);
          reconnectTimeout = setTimeout(connect, delay);
        } else {
          console.log('[ws] Max retries reached, staying disconnected');
          setConnectionStatus('disconnected');
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror, so we handle reconnection there
        ws.close();
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [setConnectionStatus, setActiveFeature]);
}

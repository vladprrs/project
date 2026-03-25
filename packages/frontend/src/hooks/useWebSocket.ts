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
          } else {
            console.log('[ws] Received:', message.channel, message.payload.type, (message.payload as any).path);
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

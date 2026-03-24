import { WebSocket, WebSocketServer } from 'ws';
import type { MessageEnvelope, SnapshotMessage, Feature } from '@specflow/shared';

export class WsHub {
  private clients = new Set<WebSocket>();
  private getSnapshot: (() => Feature | null) | null = null;

  constructor(private wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      this.sendSnapshot(ws);
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });
  }

  setSnapshotProvider(fn: () => Feature | null): void {
    this.getSnapshot = fn;
  }

  private sendSnapshot(ws: WebSocket): void {
    if (!this.getSnapshot) return;
    const activeFeature = this.getSnapshot();
    const message: SnapshotMessage = {
      channel: 'snapshot',
      payload: { type: 'snapshot', activeFeature },
    };
    ws.send(JSON.stringify(message));
  }

  broadcast(message: MessageEnvelope): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

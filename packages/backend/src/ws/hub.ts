import { WebSocket, WebSocketServer } from 'ws';
import type { MessageEnvelope } from '@specflow/shared';

export class WsHub {
  private clients = new Set<WebSocket>();

  constructor(private wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });
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

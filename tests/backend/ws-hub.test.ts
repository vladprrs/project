import { describe, it, expect, afterEach } from 'vitest';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type Server } from 'node:http';
import { WsHub } from '../../packages/backend/src/ws/hub';
import type { MessageEnvelope } from '../../packages/shared/src/messages/envelope';

let server: Server | undefined;
let clients: WebSocket[] = [];

function setupHub(): { hub: WsHub; port: number; server: Server } {
  return new Promise((resolve) => {
    const httpServer = createServer();
    const wss = new WebSocketServer({ noServer: true });
    const hub = new WsHub(wss);

    httpServer.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server = httpServer;
      resolve({ hub, port, server: httpServer });
    });
  }) as any;
}

function connectClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on('open', () => {
      clients.push(ws);
      resolve(ws);
    });
    ws.on('error', reject);
  });
}

afterEach(async () => {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  }
  clients = [];

  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  }
});

describe('WsHub', () => {
  it('broadcasts MessageEnvelope to connected client', async () => {
    const { hub, port } = await setupHub();
    const client = await connectClient(port);

    // Drain any initial messages (like snapshot)
    await new Promise((r) => setTimeout(r, 100));

    const messagePromise = new Promise<MessageEnvelope>((resolve) => {
      client.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    const fsMessage: MessageEnvelope = {
      channel: 'filesystem',
      payload: { type: 'created', path: 'specs/test.md', content: '# Test' },
    };

    hub.broadcast(fsMessage);

    const received = await messagePromise;
    expect(received.channel).toBe('filesystem');
    expect(received.payload.type).toBe('created');
    if (received.channel === 'filesystem' && received.payload.type === 'created') {
      expect(received.payload.path).toBe('specs/test.md');
      expect(received.payload.content).toBe('# Test');
    }
  });

  it('sends snapshot on connect when provider is set', async () => {
    const { hub, port } = await setupHub();

    hub.setSnapshotProvider(() => ({
      id: '1',
      name: 'test',
      directory: '/test',
      isActive: true,
      createdAt: '2024-01-01',
      activatedAt: '2024-01-01',
    }));

    // Set up message listener before connecting so we don't miss the snapshot
    const ws = new WebSocket(`ws://localhost:${port}`);
    clients.push(ws);

    const firstMessage = await new Promise<MessageEnvelope>((resolve, reject) => {
      ws.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Timed out waiting for snapshot')), 5000);
    });

    expect(firstMessage.channel).toBe('snapshot');
    if (firstMessage.channel === 'snapshot') {
      expect(firstMessage.payload.type).toBe('snapshot');
      expect(firstMessage.payload.activeFeature).toEqual({
        id: '1',
        name: 'test',
        directory: '/test',
        isActive: true,
        createdAt: '2024-01-01',
        activatedAt: '2024-01-01',
      });
    }
  });

  it('tracks client count correctly', async () => {
    const { hub, port } = await setupHub();

    expect(hub.clientCount).toBe(0);

    const client1 = await connectClient(port);
    const client2 = await connectClient(port);

    // Give WebSocket server time to register connections
    await new Promise((r) => setTimeout(r, 100));

    expect(hub.clientCount).toBe(2);

    client1.close();

    // Wait for close event to propagate
    await new Promise((r) => setTimeout(r, 200));

    expect(hub.clientCount).toBe(1);
  });
});

import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { resolve } from 'node:path';
import { WsHub } from './ws/hub.js';
import { createFileWatcher } from './watcher/file-watcher.js';
import { createDb } from './db/client.js';
import { FeatureService } from './services/feature.js';
import { ChatService } from './services/chat.js';
import { createFeaturesRouter } from './api/features.js';
import { createChatRouter } from './api/chat.js';
import { createFilesRouter } from './api/files.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const hub = new WsHub(wss);

  // Database
  const db = createDb();
  const featureService = new FeatureService(db);
  const chatService = new ChatService(db);

  // Wire snapshot provider so new WS clients receive current state
  hub.setSnapshotProvider(() => featureService.getActive());

  // REST routes
  app.use('/api/features', createFeaturesRouter(featureService));
  app.use('/api/chat', createChatRouter(chatService));
  app.use('/api/files', createFilesRouter());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', connections: hub.clientCount });
  });

  // WebSocket upgrade on /ws path only
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url!, `http://${request.headers.host}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // File watcher -- resolve specs/ relative to monorepo root (2 levels up from this file)
  const monorepoRoot = resolve(import.meta.dirname, '..', '..', '..');
  const specsDir = resolve(monorepoRoot, 'specs');
  createFileWatcher(specsDir, (message) => hub.broadcast(message));

  return { app, server, hub, db, chatService };
}

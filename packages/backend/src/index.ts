import { createApp } from './server.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const { server } = createApp();

server.listen(PORT, () => {
  console.log(`[backend] Server listening on http://localhost:${PORT}`);
  console.log(`[backend] WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`[backend] Watching specs/ for file changes`);
});

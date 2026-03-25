import { createApp } from './server.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const { server } = createApp();

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[backend] ERROR: Port ${PORT} is already in use.`);
    console.error(`[backend] Another instance may be running. Try:`);
    console.error(`[backend]   1. Stop the other process using port ${PORT}`);
    console.error(`[backend]   2. Or use a different port: PORT=${PORT + 1} npm start\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`[backend] Server listening on http://localhost:${PORT}`);
  console.log(`[backend] WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`[backend] Watching specs/ for file changes`);
});

import chokidar from 'chokidar';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import type { MessageEnvelope } from '@specflow/shared';

export function createFileWatcher(
  specsDir: string,
  onEvent: (message: MessageEnvelope) => void
) {
  // Edge case: create specs/ if it doesn't exist
  mkdirSync(specsDir, { recursive: true });

  const projectRoot = resolve(specsDir, '..');

  const watcher = chokidar.watch(specsDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher
    .on('add', async (filePath: string) => {
      try {
        const content = await readFile(filePath, 'utf-8');
        const relPath = relative(projectRoot, filePath);
        onEvent({
          channel: 'filesystem',
          payload: { type: 'created', path: relPath, content },
        });
      } catch (err) {
        console.error(`[watcher] Error reading new file ${filePath}:`, err);
      }
    })
    .on('change', async (filePath: string) => {
      try {
        const content = await readFile(filePath, 'utf-8');
        const relPath = relative(projectRoot, filePath);
        onEvent({
          channel: 'filesystem',
          payload: { type: 'changed', path: relPath, content },
        });
      } catch (err) {
        console.error(`[watcher] Error reading changed file ${filePath}:`, err);
      }
    })
    .on('unlink', (filePath: string) => {
      const relPath = relative(projectRoot, filePath);
      onEvent({
        channel: 'filesystem',
        payload: { type: 'deleted', path: relPath },
      });
    });

  return watcher;
}

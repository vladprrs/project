import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFileWatcher } from '../../packages/backend/src/watcher/file-watcher';
import type { MessageEnvelope } from '../../packages/shared/src/messages/envelope';
import type { FSWatcher } from 'chokidar';

let watcher: FSWatcher | undefined;

afterEach(async () => {
  if (watcher) {
    await watcher.close();
    watcher = undefined;
  }
});

function waitForEvent(
  specsDir: string,
  predicate: (msg: MessageEnvelope) => boolean,
  timeout = 5000,
): Promise<MessageEnvelope> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for event after ${timeout}ms`)),
      timeout,
    );

    watcher = createFileWatcher(specsDir, (message) => {
      if (predicate(message)) {
        clearTimeout(timer);
        resolve(message);
      }
    });
  });
}

describe('file watcher', () => {
  it('emits created event with correct path and content when file is written', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'watcher-test-'));
    const specsDir = join(tempDir, 'specs');
    mkdirSync(specsDir, { recursive: true });

    const eventPromise = waitForEvent(
      specsDir,
      (msg) => msg.channel === 'filesystem' && msg.payload.type === 'created',
    );

    // Small delay to let chokidar initialize
    await new Promise((r) => setTimeout(r, 200));

    writeFileSync(join(specsDir, 'test.txt'), 'hello world');

    const message = await eventPromise;
    expect(message.channel).toBe('filesystem');
    expect(message.payload.type).toBe('created');
    if (message.channel === 'filesystem' && message.payload.type === 'created') {
      expect(message.payload.path).toBe(join('specs', 'test.txt'));
      expect(message.payload.content).toBe('hello world');
    }
  }, 10000);

  it('emits changed event when existing file is modified', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'watcher-test-'));
    const specsDir = join(tempDir, 'specs');
    mkdirSync(specsDir, { recursive: true });

    // Write initial file before starting watcher
    const filePath = join(specsDir, 'existing.txt');
    writeFileSync(filePath, 'initial content');

    // Start watcher and wait for it to initialize
    let resolveEvent: (msg: MessageEnvelope) => void;
    const events: MessageEnvelope[] = [];

    watcher = createFileWatcher(specsDir, (message) => {
      events.push(message);
      if (
        message.channel === 'filesystem' &&
        message.payload.type === 'changed'
      ) {
        resolveEvent(message);
      }
    });

    // Wait for watcher initialization and any initial scan events
    await new Promise((r) => setTimeout(r, 800));

    const changedPromise = new Promise<MessageEnvelope>((resolve, reject) => {
      resolveEvent = resolve;
      setTimeout(() => reject(new Error('Timed out waiting for changed event')), 5000);
    });

    writeFileSync(filePath, 'updated content');

    const message = await changedPromise;
    expect(message.channel).toBe('filesystem');
    expect(message.payload.type).toBe('changed');
    if (message.channel === 'filesystem' && message.payload.type === 'changed') {
      expect(message.payload.content).toBe('updated content');
    }
  }, 10000);

  it('emits deleted event when file is removed', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'watcher-test-'));
    const specsDir = join(tempDir, 'specs');
    mkdirSync(specsDir, { recursive: true });

    const filePath = join(specsDir, 'to-delete.txt');

    // Create watcher and collect events
    let resolveDeleted: (msg: MessageEnvelope) => void;

    watcher = createFileWatcher(specsDir, (message) => {
      if (
        message.channel === 'filesystem' &&
        message.payload.type === 'deleted'
      ) {
        resolveDeleted(message);
      }
    });

    // Wait for watcher to initialize
    await new Promise((r) => setTimeout(r, 200));

    // Write file, wait for it to be tracked
    writeFileSync(filePath, 'will be deleted');
    await new Promise((r) => setTimeout(r, 800));

    const deletedPromise = new Promise<MessageEnvelope>((resolve, reject) => {
      resolveDeleted = resolve;
      setTimeout(() => reject(new Error('Timed out waiting for deleted event')), 5000);
    });

    unlinkSync(filePath);

    const message = await deletedPromise;
    expect(message.channel).toBe('filesystem');
    expect(message.payload.type).toBe('deleted');
    if (message.channel === 'filesystem' && message.payload.type === 'deleted') {
      expect(message.payload.path).toBe(join('specs', 'to-delete.txt'));
    }
  }, 10000);
});

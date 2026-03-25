import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ReadFileResponse, SaveFileResponse, ApiError } from '@specflow/shared';
import { recentlySaved } from '../watcher/file-watcher.js';

export function createFilesRouter(): Router {
  const router = Router();
  // Resolve monorepo root (4 levels up from this file: api/ -> src/ -> backend/ -> packages/ -> project/)
  const monorepoRoot = resolve(import.meta.dirname, '..', '..', '..', '..');

  // GET /api/files/read?path=specs/feature/spec.md
  router.get('/read', async (req: Request, res: Response) => {
    const filePath = req.query.path as string;

    if (!filePath) {
      const error: ApiError = { error: 'path query parameter is required' };
      res.status(400).json(error);
      return;
    }

    // Security: only allow reading from specs/ directory
    if (!filePath.startsWith('specs/')) {
      const error: ApiError = { error: 'Only files within specs/ directory can be read' };
      res.status(403).json(error);
      return;
    }

    // Prevent path traversal
    const resolvedPath = resolve(monorepoRoot, filePath);
    const specsRoot = resolve(monorepoRoot, 'specs');
    if (!resolvedPath.startsWith(specsRoot)) {
      const error: ApiError = { error: 'Path traversal not allowed' };
      res.status(403).json(error);
      return;
    }

    try {
      const content = await readFile(resolvedPath, 'utf-8');
      const response: ReadFileResponse = { path: filePath, content };
      res.json(response);
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        const error: ApiError = { error: `File not found: ${filePath}` };
        res.status(404).json(error);
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const error: ApiError = { error: `Failed to read file: ${message}` };
        res.status(500).json(error);
      }
    }
  });

  // POST /api/files/save -- write file content to disk
  router.post('/save', async (req: Request, res: Response) => {
    const { filePath, content } = req.body as { filePath?: string; content?: string };

    if (!filePath || typeof filePath !== 'string') {
      const error: ApiError = { error: 'filePath is required' };
      res.status(400).json(error);
      return;
    }
    if (content === undefined || content === null) {
      const error: ApiError = { error: 'content is required' };
      res.status(400).json(error);
      return;
    }
    if (!filePath.startsWith('specs/')) {
      const error: ApiError = { error: 'Only files within specs/ directory can be saved' };
      res.status(403).json(error);
      return;
    }

    // Prevent path traversal
    const resolvedPath = resolve(monorepoRoot, filePath);
    const specsRoot = resolve(monorepoRoot, 'specs');
    if (!resolvedPath.startsWith(specsRoot)) {
      const error: ApiError = { error: 'Path traversal not allowed' };
      res.status(403).json(error);
      return;
    }

    try {
      // Suppress file watcher event for this save
      recentlySaved.add(filePath);
      await writeFile(resolvedPath, content, 'utf-8');
      setTimeout(() => recentlySaved.delete(filePath), 500);

      const response: SaveFileResponse = { saved: true, path: filePath };
      res.json(response);
    } catch (err: unknown) {
      recentlySaved.delete(filePath);
      const message = err instanceof Error ? err.message : 'Unknown error';
      const error: ApiError = { error: `Failed to write file: ${message}` };
      res.status(500).json(error);
    }
  });

  return router;
}

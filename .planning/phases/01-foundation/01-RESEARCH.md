# Phase 1: Foundation - Research

**Researched:** 2026-03-24
**Domain:** ESM monorepo infrastructure (Node.js + Express backend, React + Vite frontend, SQLite, WebSocket, file watching)
**Confidence:** HIGH

## Summary

Phase 1 builds the foundational infrastructure for SpecFlow IDE: a three-package npm workspaces monorepo (shared types, backend, frontend), all ESM-only. The backend runs Express 5 with ws for WebSocket, chokidar 5 for file watching, and better-sqlite3 + drizzle-orm for SQLite persistence. The frontend is React 19 + Vite 8 + Tailwind CSS 4, with Zustand for client state. The nav shell uses a left icon rail (VS Code activity bar style) with lucide-react icons.

All core packages are verified as current on npm. Express 5 is now stable (5.2.1) with important syntax changes from v4. Chokidar has jumped to v5 (ESM-only, Node 20+). Tailwind CSS 4 is stable with a first-party Vite plugin. Drizzle ORM 0.45+ works directly with better-sqlite3 via `drizzle-orm/better-sqlite3`.

**Primary recommendation:** Use the verified latest versions (Express 5.2.1, Chokidar 5.0.0, Tailwind 4.2.2, Drizzle 0.45.1) with ESM throughout. The monorepo uses npm workspaces with TypeScript project references for the shared package. The shared package needs no build step in dev -- frontend and backend consume it via TypeScript path mapping.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Left icon rail layout (VS Code activity bar style) -- narrow vertical bar with icons for Chat, Docs, and Kanban views
- **D-02:** Subtle border separation between rail and content area -- same background color, thin border divider (not dark sidebar)
- **D-03:** Icon-only rail with tooltips on hover for view names -- no expanded text labels
- **D-04:** Use `concurrently` package for `npm run dev` -- runs backend (tsx watch) and frontend (vite dev) in parallel from a single terminal with color-coded output
- **D-05:** Shared types package consumed via TypeScript paths during development -- no build step for shared in dev mode. Both backend and frontend reference `../shared/src/*` directly. Only build shared for production.
- **D-06:** WebSocket connection status shown as colored dot icon in the icon rail footer -- green = connected, amber = reconnecting, red = disconnected. Always visible, tooltip on hover for details.
- **D-07:** Empty Chat/Docs/Kanban views show just the view name centered -- minimal, no icons or hint text. Content comes in Phase 2+.

### Claude's Discretion
- Exact icon choices for Chat, Docs, Kanban nav items (Lucide or similar icon library)
- Rail width and spacing
- Tooltip implementation approach
- Tailwind color palette selections within the border-separation constraint
- Connection status dot size and exact positioning

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Monorepo with shared TypeScript types package used by both frontend and backend | npm workspaces + TypeScript project references pattern; shared package with `exports` field |
| INFRA-02 | Backend is Node.js + TypeScript + Express with ESM modules from day one | Express 5.2.1 (stable), `"type": "module"` in all package.json files, tsx for dev execution |
| INFRA-03 | Backend watches spec artifact files via chokidar with awaitWriteFinish debouncing | Chokidar 5.0.0 (ESM-only), awaitWriteFinish option with stabilityThreshold + pollInterval |
| INFRA-04 | Backend pushes file change events to frontend via WebSocket (ws library, channel-multiplexed protocol) | ws 8.20.0, noServer pattern with Express upgrade handler, broadcast to all clients |
| INFRA-05 | SQLite stores IDE operational state: pipeline stage, approvals, task card cache, chat history | better-sqlite3 12.8.0 + drizzle-orm 0.45.1, schema-as-code with drizzle-kit migrations |
| INFRA-06 | Spec artifacts stored on filesystem as single source of truth -- SQLite is disposable cache | File watcher reads content from disk; DB stores operational metadata only |
| INFRA-07 | WebSocket reconnection with full state snapshot on reconnect | Client-side reconnection with exponential backoff; on reconnect, fetch current state via REST |
| INFRA-08 | Single active feature at a time enforced by backend state | Feature service with transactional check-then-set in SQLite; POST returns 409 if another active |
| UX-01 | Navigation bar with view switching between Chat, Docs, and Kanban views | Zustand store for activeView; icon rail component with lucide-react icons |
| UX-02 | Active view persists to localStorage across sessions | Zustand persist middleware with localStorage adapter |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack locked**: React + TypeScript + Vite frontend, Node.js + TypeScript + Express backend, TipTap editor, Tailwind CSS, SQLite, WebSocket
- **Orchestration only**: Never vendor or reimplement spec-kit/GSD tool logic
- **File-system truth**: UI state MUST derive from spec artifacts on disk. No divergent UI state
- **Document-centric**: Primary panels show spec artifacts, not source code
- **Single feature**: One active feature at a time. No parallel feature workflows
- **AI SDK streaming**: Chat uses Vercel AI SDK with custom providers (Phase 2+, not Phase 1)
- **ESM-only enforced**: chokidar 5 and execa 9 require ESM
- **npm workspaces**: 3 packages (shared, backend, frontend)
- **Zustand**: For frontend state management

## Standard Stack

### Core (Verified against npm registry 2026-03-24)

| Library | Verified Version | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| React | 19.2.4 | UI framework | Project requirement. Stable with React 19 improvements. |
| react-dom | 19.2.4 | React DOM renderer | Required companion to React |
| TypeScript | 6.0.2 | Type safety | Latest stable. Monorepo-wide type checking. |
| Vite | 8.0.2 | Build tool / dev server | Project requirement. Native ESM, sub-second HMR. |
| @vitejs/plugin-react | 6.0.1 | Vite React plugin | Required for JSX transform with Vite |
| Express | 5.2.1 | HTTP server | Now stable. Native async error handling, no express-async-errors needed. |
| Tailwind CSS | 4.2.2 | Styling | Stable. CSS-first config, no tailwind.config.js needed. |
| @tailwindcss/vite | 4.2.2 | Tailwind Vite plugin | First-party Vite integration. Zero PostCSS config. |
| better-sqlite3 | 12.8.0 | SQLite driver | Synchronous C++ binding, ideal for single-user localhost. |
| drizzle-orm | 0.45.1 | Type-safe SQL | Schema-as-code with better-sqlite3 driver. |
| drizzle-kit | 0.31.10 | Migration tooling | Generate + push SQL migrations from schema. |
| ws | 8.20.0 | WebSocket server | Zero-dependency, use with Express upgrade handler. |
| chokidar | 5.0.0 | File watching | ESM-only (v5), Node 20+ required. Cross-platform fs.watch wrapper. |
| Zustand | 5.0.12 | Frontend state | Minimal hook-based state management, React 19 compatible. |

### Supporting

| Library | Verified Version | Purpose | When to Use |
|---------|-----------------|---------|-------------|
| zod | 4.3.6 | Runtime validation | WebSocket message validation, API request/response contracts |
| nanoid | 5.1.7 | ID generation | Feature IDs, message IDs. ESM-only. |
| lucide-react | 1.0.1 | Icon library | Nav rail icons for Chat, Docs, Kanban views |
| concurrently | 9.2.1 | Dev script runner | `npm run dev` runs backend + frontend in parallel (D-04) |
| tsx | 4.21.0 | TS execution | Run backend directly without compilation. ESM-compatible. |
| date-fns | 4.1.0 | Date formatting | Timestamp formatting for transition history |
| @types/better-sqlite3 | 7.6.13 | TypeScript types | Type definitions for better-sqlite3 |
| @types/ws | 8.18.1 | TypeScript types | Type definitions for ws |
| @types/express | 5.0.6 | TypeScript types | Type definitions for Express 5 |
| vitest | 4.1.1 | Testing | Unit + integration tests, native Vite integration |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Express 5 | Express 4.21 | Express 4 is more documented but lacks native async error handling. Express 5 is now stable; use it. |
| Chokidar 5 | Chokidar 4 | Chokidar 4 also ESM-only but v5 is latest; no reason to pin to 4. |
| Zustand | React Context | Context causes re-renders of all consumers; Zustand is selective. Worth the dependency for a multi-panel SPA. |
| lucide-react | heroicons, react-icons | Lucide is tree-shakeable, consistent style, actively maintained. Good fit for icon-only rail. |

### Installation

```bash
# Root package.json workspaces setup first, then:

# Shared package (no dependencies beyond TypeScript)
# Backend
npm install -w packages/backend express ws chokidar better-sqlite3 drizzle-orm zod nanoid date-fns
npm install -w packages/backend -D @types/express @types/ws @types/better-sqlite3 drizzle-kit tsx

# Frontend
npm install -w packages/frontend react react-dom zustand lucide-react
npm install -w packages/frontend -D @vitejs/plugin-react tailwindcss @tailwindcss/vite @types/react @types/react-dom

# Root dev dependencies
npm install -D typescript concurrently vitest
```

## Architecture Patterns

### Recommended Project Structure

```
packages/
  shared/
    package.json             # "type": "module", "exports" field
    tsconfig.json            # composite: true for project references
    src/
      index.ts               # Re-exports all types
      messages/
        envelope.ts           # MessageEnvelope discriminated union
        filesystem.ts         # FileSystemEvent types
      types/
        feature.ts            # Feature, PipelineStage types
        api.ts                # API request/response shapes

  backend/
    package.json             # "type": "module"
    tsconfig.json            # references shared
    drizzle.config.ts        # drizzle-kit config
    src/
      index.ts               # Entry point: create server, start listening
      server.ts              # Express app + HTTP server + WS upgrade
      watcher/
        file-watcher.ts      # Chokidar setup, awaitWriteFinish, event emission
      ws/
        hub.ts               # WebSocket client tracking + broadcast
      db/
        client.ts            # better-sqlite3 + drizzle init, auto-create DB
        schema.ts            # Drizzle schema definitions (all tables)
        migrate.ts           # Run migrations on startup
      api/
        features.ts          # GET/POST/DELETE active feature routes
      services/
        feature.ts           # Single-feature enforcement logic

  frontend/
    package.json             # "type": "module"
    tsconfig.json            # references shared
    vite.config.ts           # React plugin, Tailwind plugin, proxy config
    index.html
    src/
      main.tsx               # React root mount
      App.tsx                 # Layout: icon rail + content area
      index.css              # @import "tailwindcss"; @source directives
      components/
        IconRail.tsx          # Left nav rail with icons (D-01, D-02, D-03)
        ConnectionDot.tsx     # WS status indicator in rail footer (D-06)
      views/
        ChatView.tsx          # Placeholder: centered "Chat" text (D-07)
        DocsView.tsx          # Placeholder: centered "Docs" text (D-07)
        KanbanView.tsx        # Placeholder: centered "Kanban" text (D-07)
      hooks/
        useWebSocket.ts       # WS connection, reconnect, message dispatch
      store/
        index.ts              # Zustand store: activeView, connectionStatus

tests/
  backend/
    watcher.test.ts
    features-api.test.ts
    ws-hub.test.ts
  frontend/
    nav.test.tsx

package.json                 # Root: workspaces, scripts
tsconfig.base.json           # Shared TS config extended by all packages
```

### Pattern 1: Express 5 + ws WebSocket Server

**What:** Express 5 app wrapped in `http.createServer`, ws attached via `noServer` mode with upgrade handler.
**When to use:** Always for this project. Express handles HTTP routes, ws handles WebSocket on the same port.

```typescript
// Source: Express 5 docs + ws GitHub README
import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Express 5: async error handling is automatic
app.get('/api/features/active', async (req, res) => {
  const feature = await getActiveFeature();
  res.json({ feature });
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

// Express 5: app.listen callback receives error
server.listen(3001, (error) => {
  if (error) throw error;
  console.log('Server listening on port 3001');
});
```

### Pattern 2: Chokidar 5 File Watcher with awaitWriteFinish

**What:** Watch `specs/` directory recursively, debounce per-file, read full content on add/change.
**When to use:** Backend file watcher initialization.

```typescript
// Source: Chokidar 5 README (github.com/paulmillr/chokidar)
import chokidar from 'chokidar';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SPECS_DIR = resolve(process.cwd(), 'specs');

const watcher = chokidar.watch(SPECS_DIR, {
  persistent: true,
  ignoreInitial: true,           // Don't emit for existing files on startup
  awaitWriteFinish: {
    stabilityThreshold: 300,     // Wait 300ms of no size change
    pollInterval: 100,           // Check every 100ms
  },
});

watcher
  .on('add', async (filePath) => {
    const content = await readFile(filePath, 'utf-8');
    const relativePath = filePath.replace(process.cwd() + '/', '');
    broadcast({ channel: 'filesystem', payload: { type: 'created', path: relativePath, content } });
  })
  .on('change', async (filePath) => {
    const content = await readFile(filePath, 'utf-8');
    const relativePath = filePath.replace(process.cwd() + '/', '');
    broadcast({ channel: 'filesystem', payload: { type: 'changed', path: relativePath, content } });
  })
  .on('unlink', (filePath) => {
    const relativePath = filePath.replace(process.cwd() + '/', '');
    broadcast({ channel: 'filesystem', payload: { type: 'deleted', path: relativePath } });
  });
```

### Pattern 3: Drizzle ORM with better-sqlite3

**What:** Schema-as-code with type-safe queries, auto-create DB on first run.
**When to use:** Backend database initialization.

```typescript
// Source: Drizzle docs (orm.drizzle.team) + better-sqlite3
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { eq } from 'drizzle-orm';

// Schema definition
export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  directory: text('directory').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  activatedAt: text('activated_at'),
});

// Database initialization
const sqlite = new Database('data/specflow.db');
sqlite.pragma('journal_mode = WAL');  // Better concurrent read performance
const db = drizzle(sqlite);

// drizzle.config.ts for migrations
// export default defineConfig({
//   schema: './src/db/schema.ts',
//   out: './drizzle',
//   dialect: 'sqlite',
//   dbCredentials: { url: 'data/specflow.db' },
// });
```

### Pattern 4: Zustand Store with localStorage Persistence

**What:** Client state for active view and connection status, persisted to localStorage.
**When to use:** Frontend state management (UX-01, UX-02).

```typescript
// Source: Zustand 5 docs (github.com/pmndrs/zustand)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type View = 'chat' | 'docs' | 'kanban';
type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface AppStore {
  activeView: View;
  connectionStatus: ConnectionStatus;
  setActiveView: (view: View) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeView: 'chat',
      connectionStatus: 'disconnected',
      setActiveView: (view) => set({ activeView: view }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
    }),
    {
      name: 'specflow-app',
      partialize: (state) => ({ activeView: state.activeView }),
      // Only persist activeView, not connectionStatus
    }
  )
);
```

### Pattern 5: Vite Proxy + WebSocket Config

**What:** Vite dev server proxies /api and /ws to Express backend.
**When to use:** Frontend vite.config.ts.

```typescript
// Source: Vite docs (vite.dev/config/server-options)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
```

### Pattern 6: npm Workspaces + TypeScript Project References

**What:** Three-package monorepo with shared types consumed without build step in dev.
**When to use:** Monorepo tsconfig setup.

```jsonc
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}

// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}

// packages/backend/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@specflow/shared/*": ["../shared/src/*"],
      "@specflow/shared": ["../shared/src/index.ts"]
    }
  },
  "references": [{ "path": "../shared" }],
  "include": ["src"]
}
```

```jsonc
// packages/shared/package.json
{
  "name": "@specflow/shared",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*.ts"
  }
}
```

### Pattern 7: Tailwind 4 in Monorepo with @source

**What:** Tailwind 4 CSS-first config needs @source directives to scan shared packages.
**When to use:** Frontend CSS entry point.

```css
/* packages/frontend/src/index.css */
@import "tailwindcss";

/* Scan shared package for any Tailwind classes used in type definitions
   (unlikely but covers future shared UI components) */
@source "../../shared/src";
```

### Anti-Patterns to Avoid

- **CJS imports in ESM packages:** Never use `require()`. All packages are `"type": "module"`. Use `import` everywhere, including for JSON files (`import pkg from './package.json' with { type: 'json' }`).
- **Async SQLite driver:** Do NOT use `node-sqlite3` (callback-based) or `sql.js` (WASM). better-sqlite3 is synchronous and 10-50x faster for single-user.
- **Express 4 patterns in Express 5:** Do NOT use `app.param(fn)`, `req.param()`, `res.redirect('back')`, or optional route syntax with `?`. See pitfalls section.
- **Socket.io instead of ws:** Socket.io adds 100KB+ client bundle and protocol overhead irrelevant for single-user localhost.
- **Inline type definitions for WebSocket messages:** Both frontend and backend MUST import from `@specflow/shared`. No duplicated type definitions (FR-017).
- **Building shared package in dev:** Per D-05, shared package is consumed via TypeScript paths. No build step needed in dev.
- **tailwind.config.js:** Tailwind 4 uses CSS-first configuration. No JavaScript config file needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File watching | Custom fs.watch wrapper | chokidar 5 | Handles OS-specific edge cases (duplicate events, rename ambiguity, macOS quirks) |
| File write debouncing | Custom debounce timer | chokidar awaitWriteFinish | Polls file size stability; handles multi-flush writes correctly |
| WebSocket reconnection | Custom retry logic from scratch | Thin wrapper with exponential backoff | Only 5-10 lines of code needed; but use a structured approach with max retries and jitter |
| SQLite migrations | Raw SQL files executed manually | drizzle-kit generate + push | Type-safe schema evolution, auto-generates migration SQL |
| State persistence to localStorage | Custom serialization | Zustand persist middleware | Built-in, handles serialization/deserialization, partialize for selective persistence |
| Express async error handling | express-async-errors wrapper | Express 5 native | Express 5 automatically forwards rejected promises to error handlers |
| CSS utility classes | Custom CSS | Tailwind 4 | Zero-config with Vite plugin, huge utility class library |

**Key insight:** This phase is pure infrastructure. Every component has a well-tested library solution. The value is in correct wiring, not custom logic.

## Common Pitfalls

### Pitfall 1: ESM/CJS Module Mismatch

**What goes wrong:** `require is not defined in ES module scope` or `ERR_REQUIRE_ESM` errors at startup.
**Why it happens:** Missing `"type": "module"` in any package.json, or importing a CJS-only dependency without proper interop.
**How to avoid:** Set `"type": "module"` in ALL package.json files (root + all 3 packages). Use `import` everywhere. Verify all dependencies support ESM (better-sqlite3 does via default export).
**Warning signs:** Any `require()` call, any `.cjs` extension in project code, missing `"type": "module"`.

### Pitfall 2: Express 5 Route Syntax Breaking Changes

**What goes wrong:** Routes with `:param?` optional syntax or `/*` wildcards throw errors in Express 5.
**Why it happens:** Express 5 uses a new path matching engine. Optional params use `{/:param}` syntax, wildcards need names `/*splat`.
**How to avoid:** Use Express 5 syntax from the start. For this phase, routes are simple (`/api/features/active`, `/api/features/activate`) with no optional params needed. Wildcard only needed for ws upgrade path check.
**Warning signs:** `Missing parameter name at position X` errors at startup.

### Pitfall 3: better-sqlite3 Native Module Build Failure

**What goes wrong:** `npm install` fails with node-gyp errors building better-sqlite3.
**Why it happens:** Missing C++ compiler or Python on the build machine. better-sqlite3 compiles a native SQLite binding.
**How to avoid:** Ensure g++ and make are available (verified: g++ 13.3.0 and make 4.3 are installed on this machine). If CI fails, use `--build-from-source` flag or prebuild binaries.
**Warning signs:** `gyp ERR!` in npm install output.

### Pitfall 4: Shared Package Not Resolving in TypeScript

**What goes wrong:** `Cannot find module '@specflow/shared'` in backend or frontend.
**Why it happens:** TypeScript path mapping not configured, or npm workspace linking not set up correctly.
**How to avoid:** Configure `paths` in each consumer's tsconfig.json pointing to shared/src. Set `exports` field in shared's package.json. Ensure root package.json has `"workspaces": ["packages/*"]`. Run `npm install` from root to create symlinks.
**Warning signs:** TypeScript red squiggles on shared imports but code still runs (tsx resolves differently than tsc).

### Pitfall 5: Chokidar Emitting Events Before File Write Completes

**What goes wrong:** File content is truncated or empty in WebSocket events.
**Why it happens:** Without `awaitWriteFinish`, chokidar fires `change` events as soon as the first bytes are written. Large files written in multiple flushes trigger multiple partial events.
**How to avoid:** Always use `awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }`. This waits until file size is stable for 300ms before emitting.
**Warning signs:** Empty content in file events, multiple events for a single file save.

### Pitfall 6: WebSocket Messages Sent to Closed Connections

**What goes wrong:** `WebSocket is not open: readyState 2` errors when broadcasting.
**Why it happens:** Client disconnected but server still has reference in broadcast list.
**How to avoid:** Check `ws.readyState === WebSocket.OPEN` before sending. Remove clients from the broadcast set on `close` event.
**Warning signs:** Unhandled errors in ws broadcast loop, memory leaks from accumulated dead connections.

### Pitfall 7: Vite Proxy Not Forwarding WebSocket Upgrade

**What goes wrong:** WebSocket connection fails in the browser with 404 or connection refused.
**Why it happens:** Vite proxy config missing `ws: true` for the WebSocket endpoint.
**How to avoid:** Configure proxy with `'/ws': { target: 'ws://localhost:3001', ws: true }` in vite.config.ts.
**Warning signs:** WebSocket works when connecting directly to backend port (3001) but not through Vite dev server (5173).

### Pitfall 8: Drizzle Schema Push vs Generate Confusion

**What goes wrong:** Schema changes not reflected in database, or migration files generated but not applied.
**Why it happens:** `drizzle-kit push` applies changes directly; `drizzle-kit generate` creates SQL files that must be applied separately with `drizzle-kit migrate`.
**How to avoid:** For development, use `drizzle-kit push` for simplicity. For production, use `generate` + `migrate`. For this phase, `push` is sufficient since the DB is disposable.
**Warning signs:** Schema mismatch between TypeScript definitions and actual SQLite tables.

### Pitfall 9: Tailwind 4 Missing Styles from Shared Packages

**What goes wrong:** Tailwind utility classes used in components render as unstyled.
**Why it happens:** Tailwind 4 only scans the app package by default. Components in `packages/shared/` or classes referenced in shared types are not scanned.
**How to avoid:** Add `@source` directives in the frontend CSS entry point for any package directories that might contain Tailwind classes.
**Warning signs:** Styles work in the frontend package but not for any reusable components from shared packages.

### Pitfall 10: Express 5 app.listen Error Handling

**What goes wrong:** Port-in-use errors crash the process silently.
**Why it happens:** Express 5 changed `app.listen` callback to receive an error argument instead of throwing.
**How to avoid:** Use `server.listen(port, (error) => { if (error) throw error; })` pattern. Check the error argument.
**Warning signs:** Server appears to start but is not actually listening.

## Code Examples

### WebSocket Hub (Broadcast Manager)

```typescript
// Source: ws library patterns (github.com/websockets/ws)
import { WebSocket, WebSocketServer } from 'ws';
import type { MessageEnvelope } from '@specflow/shared';

export class WsHub {
  private clients = new Set<WebSocket>();

  constructor(private wss: WebSocketServer) {
    wss.on('connection', (ws) => {
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
}
```

### Feature Service (Single-Feature Enforcement)

```typescript
// Source: Spec data model + API contracts
import { eq } from 'drizzle-orm';
import { features } from './schema.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export class FeatureService {
  constructor(private db: BetterSQLite3Database) {}

  getActive() {
    return this.db.select().from(features).where(eq(features.isActive, true)).get();
  }

  activate(name: string, directory: string) {
    const active = this.getActive();
    if (active) {
      throw new ConflictError(
        `Cannot activate '${name}': feature '${active.name}' is already active. Deactivate it first.`
      );
    }
    // Insert or update feature, set isActive = true
  }

  deactivate() {
    const active = this.getActive();
    if (!active) {
      throw new NotFoundError('No active feature to deactivate');
    }
    this.db.update(features).set({ isActive: false, activatedAt: null }).where(eq(features.id, active.id)).run();
    return active.name;
  }
}
```

### Client-Side WebSocket with Reconnection

```typescript
// Source: Native WebSocket API + exponential backoff pattern
const WS_URL = `ws://${window.location.host}/ws`;
const MAX_RETRIES = 10;
const BASE_DELAY = 1000;

function createWebSocket(
  onMessage: (data: MessageEnvelope) => void,
  onStatusChange: (status: ConnectionStatus) => void
) {
  let retries = 0;
  let ws: WebSocket;

  function connect() {
    ws = new WebSocket(WS_URL);
    onStatusChange('reconnecting');

    ws.onopen = () => {
      retries = 0;
      onStatusChange('connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as MessageEnvelope;
      onMessage(message);
    };

    ws.onclose = () => {
      onStatusChange('disconnected');
      if (retries < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retries) + Math.random() * 1000;
        retries++;
        onStatusChange('reconnecting');
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => ws.close();
  }

  connect();
  return () => ws.close();
}
```

### Icon Rail Component

```tsx
// Source: Lucide React docs + Zustand store
import { MessageSquare, FileText, LayoutDashboard } from 'lucide-react';
import { useAppStore } from '../store';

const NAV_ITEMS = [
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  { id: 'docs' as const, icon: FileText, label: 'Docs' },
  { id: 'kanban' as const, icon: LayoutDashboard, label: 'Kanban' },
];

export function IconRail() {
  const { activeView, setActiveView, connectionStatus } = useAppStore();

  return (
    <nav className="flex flex-col items-center w-12 border-r border-zinc-200 bg-white">
      <div className="flex-1 flex flex-col items-center gap-1 pt-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`p-2 rounded-md transition-colors ${
              activeView === id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
            }`}
            title={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
      {/* Connection status dot (D-06) */}
      <div className="pb-3" title={`WebSocket: ${connectionStatus}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' :
          connectionStatus === 'reconnecting' ? 'bg-amber-500' :
          'bg-red-500'
        }`} />
      </div>
    </nav>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express 4 with express-async-errors | Express 5 native async error handling | Express 5 stable (late 2024) | No wrapper needed; async/await errors auto-forwarded to error handlers |
| Chokidar 3/4 (CJS/ESM dual) | Chokidar 5 (ESM-only, Node 20+) | Nov 2025 | Must use ESM; simpler API |
| Tailwind 3 (JS config + PostCSS) | Tailwind 4 (CSS-first + Vite plugin) | Early 2025 | No tailwind.config.js; `@import "tailwindcss"` in CSS; `@tailwindcss/vite` plugin |
| drizzle-orm 0.3x | drizzle-orm 0.45 | Ongoing | Better SQLite dialect support; simplified connection API |
| Zustand 4 | Zustand 5 | 2025 | React 19 compatibility; same API surface |
| TypeScript 5.x | TypeScript 6.0 | 2025-2026 | Improved bundler module resolution |

**Deprecated/outdated:**
- **Express 4.x**: Still works but Express 5 is now stable. Use 5 for new projects.
- **tailwind.config.js**: Tailwind 4 uses CSS-first configuration. JS config is legacy.
- **PostCSS for Tailwind**: Not needed with `@tailwindcss/vite` plugin.
- **ts-node**: Replaced by tsx for faster startup and better ESM compatibility.

## Open Questions

1. **Drizzle push vs migrate for auto-schema setup**
   - What we know: `drizzle-kit push` applies schema directly; `drizzle-kit generate + migrate` uses migration files. For a disposable SQLite cache, push is simpler.
   - What's unclear: Whether to use push during dev and generate+migrate for production, or just push for everything since the DB is a disposable cache.
   - Recommendation: Use `drizzle-kit push` for development. Since the SQLite DB is explicitly a disposable cache (INFRA-06), this is acceptable. Add `generate + migrate` in a later phase if needed for upgrade paths.

2. **specs/ directory auto-creation on startup**
   - What we know: Edge case from spec says "file watcher MUST create specs/ directory if it doesn't exist and begin watching without errors."
   - What's unclear: Whether to create at server startup or lazily when first feature is activated.
   - Recommendation: Create at server startup unconditionally. Use `mkdirSync(specsDir, { recursive: true })` before initializing chokidar.

3. **Database file location**
   - What we know: better-sqlite3 needs a file path. Plan shows `data/specflow.db` but no explicit decision made.
   - What's unclear: Whether to put the DB in `packages/backend/data/` or in the project root `data/`.
   - Recommendation: Project root `data/specflow.db` so the DB is accessible regardless of working directory. Add `data/` to `.gitignore`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 20.20.0 | -- |
| npm | Package management | Yes | 11.12.0 | -- |
| g++ (C++ compiler) | better-sqlite3 native build | Yes | 13.3.0 | Use prebuilt binaries |
| make | better-sqlite3 native build | Yes | 4.3 | -- |
| SQLite (system) | better-sqlite3 bundles its own | Yes (system: 3.45.1) | N/A | better-sqlite3 bundles SQLite statically |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None. All required build tools and runtimes are available.

## Sources

### Primary (HIGH confidence)
- npm registry -- all package versions verified via `npm view` on 2026-03-24
- [Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html) -- path syntax changes, removed methods, async error handling
- [Chokidar GitHub README](https://github.com/paulmillr/chokidar) -- v5 API, awaitWriteFinish options
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite) -- better-sqlite3 driver setup
- [Tailwind CSS Installation with Vite](https://tailwindcss.com/docs) -- v4 setup with @tailwindcss/vite
- [ws GitHub](https://github.com/websockets/ws) -- noServer pattern, upgrade handler
- [Vite Server Options](https://vite.dev/config/server-options) -- proxy configuration for API and WebSocket

### Secondary (MEDIUM confidence)
- [Nx Blog: Tailwind 4 in NPM Workspace](https://nx.dev/blog/setup-tailwind-4-npm-workspace) -- @source directive for monorepo scanning
- [Zustand GitHub](https://github.com/pmndrs/zustand) -- v5 persist middleware, React 19 compat
- [Drizzle Config Reference](https://orm.drizzle.team/kit-docs/config-reference) -- drizzle.config.ts structure

### Tertiary (LOW confidence)
- None. All findings verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry, all libraries are production-stable
- Architecture: HIGH -- patterns sourced from official documentation of each library; project structure defined in spec plan.md
- Pitfalls: HIGH -- based on documented breaking changes (Express 5) and known library behaviors (chokidar, ws)
- Express 5 syntax details: HIGH -- verified against official migration guide

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (30 days -- stable ecosystem, no fast-moving targets)

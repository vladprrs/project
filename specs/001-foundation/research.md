# Research: SpecFlow IDE Foundation

## Decisions

### 1. ESM-Only Backend

**Decision**: All packages use `"type": "module"` with ESM imports/exports
**Rationale**: chokidar 4.x and execa 9.x (needed in Phase 2) are ESM-only. Mixing CJS and ESM mid-project causes painful refactoring. Committing to ESM from day one eliminates this risk.
**Alternatives considered**:
- CJS with dynamic imports for ESM deps — brittle, loses type inference at import boundaries
- Dual CJS/ESM build — unnecessary complexity for a single-target app

### 2. ws Over socket.io

**Decision**: Use the `ws` library for WebSocket
**Rationale**: socket.io's value (rooms, namespaces, transport fallback) is irrelevant for a single-user localhost tool. ws is zero-dependency, 2-3x faster, and the reconnection logic socket.io provides is ~20 lines of custom code on the frontend.
**Alternatives considered**:
- socket.io — too heavy; auto-reconnect and rooms unnecessary for single-user
- Server-Sent Events (SSE) — unidirectional; we need bidirectional messaging for future chat commands

### 3. better-sqlite3 + drizzle-orm

**Decision**: better-sqlite3 as the synchronous SQLite driver, drizzle-orm for type-safe queries
**Rationale**: They are complementary (driver + query builder). Drizzle has first-class better-sqlite3 adapter, giving type-safe queries without ORM overhead. Synchronous API simplifies server code (no async DB calls for simple state reads).
**Alternatives considered**:
- sql.js (WASM-based) — slower, more complex setup, no benefit for server-side Node.js
- Prisma — too heavy for a cache/state DB; schema migrations are overkill for 3-4 tables
- Raw better-sqlite3 without ORM — loses type safety; hand-writing SQL for every query

### 4. chokidar 4.x for File Watching

**Decision**: Use chokidar with `awaitWriteFinish` for debounced file watching
**Rationale**: chokidar is the de facto standard for Node.js file watching. Version 4 is ESM-only (matches our constraint). `awaitWriteFinish` with `stabilityThreshold: 300ms` and `pollInterval: 50ms` handles the rapid-write problem from CLI tools.
**Alternatives considered**:
- Native `fs.watch` — unreliable cross-platform, no debounce, no `awaitWriteFinish`
- `fs.watch` recursive (Node 19.1+) — lacks debounce and write-complete detection
- Parcel watcher (@parcel/watcher) — faster but lower-level, no `awaitWriteFinish` equivalent

### 5. Vitest for Testing

**Decision**: Use Vitest for all tests (unit + integration)
**Rationale**: Native ESM support (matches our stack), Vite-powered fast execution, compatible with both Node.js (backend tests) and jsdom/happy-dom (frontend tests). Single test runner across the monorepo.
**Alternatives considered**:
- Jest — requires CJS transforms or experimental ESM flags; friction with ESM-only stack
- Node.js built-in test runner — too minimal for frontend component tests

### 6. Zustand for Frontend State

**Decision**: Use Zustand for client-side state management
**Rationale**: Minimal API surface, no boilerplate, works naturally with React 19. Stores activeView, connectionStatus, and file events. Small bundle size, no providers/wrappers needed.
**Alternatives considered**:
- Redux Toolkit — too heavy for 2-3 slices of state in a single-user app
- React Context + useReducer — sufficient but loses devtools and middleware; Zustand adds negligible weight
- Jotai/Valtio — viable but less ecosystem support than Zustand

### 7. npm Workspaces for Monorepo

**Decision**: npm workspaces (no Turborepo, no Nx)
**Rationale**: Built into npm, zero additional dependencies. Three packages with simple dependency graph (shared → backend, shared → frontend). No build caching or task orchestration needed at this scale.
**Alternatives considered**:
- Turborepo — adds dependency and config for a 3-package monorepo; premature
- pnpm workspaces — viable but adds another package manager; npm is sufficient
- Nx — vastly over-engineered for this scope

### 8. WebSocket Message Envelope Design

**Decision**: Channel-discriminated envelope with extensible union type. Phase 1 defines filesystem channel only.
**Rationale**: A single envelope type `{ channel: "filesystem", payload: FileEvent }` provides a consistent parsing pattern. New channels (pipeline, cli) are added as union members in later phases. The discriminant (`channel`) enables exhaustive switch statements with compile-time safety.
**Alternatives considered**:
- Flat message types without channel grouping — harder to route, no logical grouping
- Separate WebSocket connections per channel — unnecessary complexity
- JSON-RPC protocol — over-engineered for push-only events

### 9. Per-File Debouncing Strategy

**Decision**: Each watched file path gets its own debounce timer (300ms stability threshold). Backend also implements a "known write" registry for CLI-initiated writes.
**Rationale**: Global debounce would merge events from different files. Per-file debounce ensures simultaneous changes to spec.md and plan.md produce separate events. The known-write registry (populated before spawning a CLI tool) applies a longer debounce for files the IDE itself triggered, reducing spurious intermediate events.
**Alternatives considered**:
- Global debounce — loses per-file event granularity
- No debounce (raw events) — causes partial-read issues on large file writes
- Content hash comparison — adds CPU overhead; `awaitWriteFinish` is sufficient

### 10. Pipeline State with Bidirectional Transitions

**Decision**: Pipeline state table stores current stage per feature. A separate transition history table logs every stage change with timestamp, direction (forward/backward), and optional reason.
**Rationale**: The constitution describes rejection-feedback loops (e.g., reject plan → re-plan). A linear-only model cannot represent these flows. History logging enables audit trails and time-tracking in Phase 3.
**Alternatives considered**:
- Linear-only state machine — cannot model rejection loops from constitution
- Event-sourced pipeline — over-engineered; simple table + history is sufficient

# Implementation Plan: SpecFlow IDE Foundation

**Branch**: `001-foundation` | **Date**: 2026-03-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-foundation/spec.md`

## Summary

Build the foundational infrastructure for SpecFlow IDE: an ESM monorepo with three packages (shared types, Node.js+Express backend, React+Vite frontend), a WebSocket-based file watcher that pushes spec artifact changes to the browser with full content, a SQLite database for IDE operational state with bidirectional pipeline stage tracking, and a navigation shell with view switching between Chat, Docs, and Kanban.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (LTS)
**Primary Dependencies**: Express 4.x (backend HTTP), ws 8.x (WebSocket), React 19 (frontend), Vite 6.x (bundler), chokidar 4.x (file watching), better-sqlite3 (SQLite driver), drizzle-orm (type-safe queries), Tailwind CSS (styling)
**Storage**: SQLite via better-sqlite3 + drizzle-orm for IDE state; filesystem for spec artifacts (`specs/`)
**Testing**: Vitest (unit + integration, works with ESM natively)
**Target Platform**: localhost web app (Linux/macOS/Windows)
**Project Type**: web-application (monorepo with 3 packages)
**Performance Goals**: File events delivered to browser within 2 seconds; nav view switch under 100ms
**Constraints**: ESM-only (no CommonJS) — chokidar 4 and execa 9 are ESM-only modules; single active feature at a time
**Scale/Scope**: Single-user localhost tool; 1 active feature, ~10 spec artifact files per feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Spec-First Data Flow
- ✅ **File watcher pushes artifact changes to browser** — UI will derive state from filesystem events, not independent state
- ✅ **SQLite is a cache of filesystem truth** — pipeline state and task cache are derived/operational; spec artifacts live on disk
- ✅ **File events include full content** — frontend receives authoritative content directly from disk via backend

### Principle II: Document-Centric, Not Code-Centric
- ✅ **Nav shell shows Chat/Docs/Kanban views** — all three are spec artifact views, not code views
- ✅ **No code editor or file browser** — foundation phase does not introduce source code viewing

### Principle III: Orchestration, Not Reimplementation
- ✅ **No spec-kit/GSD logic reimplemented** — foundation only provides infrastructure (server, watcher, DB, shell)
- ✅ **Message protocol is extensible** — filesystem channel defined now; pipeline and CLI channels added when needed

### Development Workflow
- ✅ **Simplicity-first** — minimal viable infrastructure, no premature abstractions
- ✅ **Test coverage** — Vitest for integration tests of watcher pipeline and API endpoints
- ✅ **Incremental delivery** — 4 user stories independently testable

**Gate result: PASS** — No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/                    # Shared types package
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # Re-exports
│       └── messages/
│           ├── envelope.ts    # Message envelope discriminated union
│           └── filesystem.ts  # File event types (create/change/delete)
│
├── backend/                   # Express + WebSocket server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # Server entry point
│       ├── server.ts          # Express app + WebSocket upgrade
│       ├── watcher/
│       │   └── file-watcher.ts  # chokidar setup + debounce + event emission
│       ├── ws/
│       │   └── hub.ts         # WebSocket client management + broadcast
│       ├── db/
│       │   ├── schema.ts      # drizzle schema (pipeline, tasks, chat)
│       │   ├── client.ts      # DB connection + auto-create
│       │   └── migrations/    # Schema migrations
│       ├── api/
│       │   └── features.ts    # GET/POST/DELETE active feature
│       └── services/
│           └── feature.ts     # Single-feature enforcement logic
│
└── frontend/                  # React + Vite SPA
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx           # App entry
        ├── App.tsx            # Layout + router
        ├── components/
        │   ├── NavBar.tsx     # Chat/Docs/Kanban nav
        │   └── ConnectionStatus.tsx  # WS connection indicator
        ├── views/
        │   ├── ChatView.tsx   # Placeholder
        │   ├── DocsView.tsx   # Placeholder
        │   └── KanbanView.tsx # Placeholder
        ├── hooks/
        │   └── useWebSocket.ts  # WS connection + reconnect + message dispatch
        └── store/
            └── index.ts       # Zustand store (activeView, connectionStatus)

tests/
├── backend/
│   ├── watcher.test.ts        # File watcher integration tests
│   ├── features-api.test.ts   # Feature activation API tests
│   └── ws-hub.test.ts         # WebSocket broadcast tests
└── frontend/
    └── nav.test.tsx           # Nav bar rendering + view switching

package.json                   # Root workspace config
tsconfig.base.json             # Shared TS config
```

**Structure Decision**: Monorepo with npm workspaces. Three packages under `packages/` (shared, backend, frontend). Shared types imported by both backend and frontend. Tests co-located under a root `tests/` directory with backend/frontend subdirectories.

## Complexity Tracking

No constitution violations to justify. Structure uses the minimum necessary packages (shared types are required by FR-001 and FR-016/FR-017 to prevent protocol drift).

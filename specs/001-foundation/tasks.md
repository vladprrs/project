# Tasks: SpecFlow IDE Foundation

**Input**: Design documents from `/specs/001-foundation/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/api.md, research.md, quickstart.md

**Tests**: Tests included — constitution requires test coverage for every feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/shared/`, `packages/backend/`, `packages/frontend/`
- **Tests**: `tests/backend/`, `tests/frontend/`
- **Root**: `package.json`, `tsconfig.base.json`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Monorepo scaffolding with ESM configuration, TypeScript, dev scripts

- [x] T001 Create root package.json with npm workspaces config pointing to packages/* and "type": "module" in package.json
- [x] T002 Create tsconfig.base.json with shared TypeScript settings (strict, ESM, path aliases) in tsconfig.base.json
- [x] T003 [P] Create packages/shared/package.json with "type": "module", name "@specflow/shared", and tsconfig.json extending base in packages/shared/
- [x] T004 [P] Create packages/backend/package.json with "type": "module", name "@specflow/backend", dependency on @specflow/shared, and tsconfig.json extending base in packages/backend/
- [x] T005 [P] Create packages/frontend/package.json with "type": "module", name "@specflow/frontend", dependency on @specflow/shared, Vite config, and tsconfig.json extending base in packages/frontend/
- [x] T006 [P] Configure Tailwind CSS 4 with CSS-first config (@import "tailwindcss") in packages/frontend/src/index.css
- [x] T007 [P] Create packages/frontend/index.html and packages/frontend/src/main.tsx as Vite entry point with React root mount
- [x] T008 Add root dev script in package.json that starts both backend and frontend concurrently (npm run dev + npm start)
- [x] T009 Verify `npm install && npm run dev` starts both servers with zero ESM errors from a clean state

**Checkpoint**: Monorepo builds and both servers start. No UI yet, just the skeleton.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and server skeleton that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 Create message envelope discriminated union type with filesystem channel in packages/shared/src/messages/envelope.ts
- [x] T011 [P] Create FileSystemEvent types (created, changed, deleted) with path and content fields in packages/shared/src/messages/filesystem.ts
- [x] T012 [P] Create re-export barrel file in packages/shared/src/index.ts exporting all message types
- [x] T013 Create Express app with CORS and JSON middleware in packages/backend/src/server.ts
- [x] T014 Create HTTP server with WebSocket upgrade handling using ws library in packages/backend/src/server.ts
- [x] T015 Create server entry point that starts Express on configurable port (default 3001) in packages/backend/src/index.ts
- [x] T016 Create Zustand store with activeView and connectionStatus slices in packages/frontend/src/store/index.ts
- [x] T017 Create root App.tsx with basic layout structure (header area + main content area) in packages/frontend/src/App.tsx

**Checkpoint**: Foundation ready — shared types importable, server running with WS upgrade, frontend rendering empty shell.

---

## Phase 3: User Story 1 - Developer Starts the IDE (Priority: P1) 🎯 MVP

**Goal**: Developer clones repo, runs install + start, sees navigable shell with Chat/Docs/Kanban views

**Independent Test**: Run `npm install && npm run dev`, open browser, click each nav item — views switch instantly, selection persists across refresh

### Tests for User Story 1 ⚠️

- [x] T018 [P] [US1] Write nav bar rendering and view switching test in tests/frontend/nav.test.tsx — verify all three nav items render, clicking switches active view, active item has visual indicator

### Implementation for User Story 1

- [x] T019 [P] [US1] Create IconRail component with Chat/Docs/Kanban items (Lucide icons), active indicator, and onClick handler that updates Zustand activeView in packages/frontend/src/components/IconRail.tsx
- [x] T020 [P] [US1] Create ChatView placeholder component in packages/frontend/src/views/ChatView.tsx
- [x] T021 [P] [US1] Create DocsView placeholder component in packages/frontend/src/views/DocsView.tsx
- [x] T022 [P] [US1] Create KanbanView placeholder component in packages/frontend/src/views/KanbanView.tsx
- [x] T023 [US1] Wire App.tsx to render IconRail and conditionally render the active view based on Zustand store in packages/frontend/src/App.tsx
- [x] T024 [US1] Add localStorage persistence to Zustand activeView slice via Zustand persist middleware in packages/frontend/src/store/index.ts

**Checkpoint**: At this point, User Story 1 should be fully functional — nav switches views, selection persists across browser refresh.

---

## Phase 4: User Story 2 - File Changes Push to Browser (Priority: P2)

**Goal**: File edits in specs/ trigger WebSocket events that arrive in the browser within 2 seconds with full content

**Independent Test**: Edit a file in specs/, observe the event in the browser (placeholder notification or console log)

### Tests for User Story 2 ⚠️

- [x] T025 [P] [US2] Write file watcher integration test in tests/backend/watcher.test.ts — create temp dir, write file, verify watcher emits event with correct path and full content; write large file (50KB+), verify single event; write two files simultaneously, verify separate events
- [x] T026 [P] [US2] Write WebSocket hub broadcast test in tests/backend/ws-hub.test.ts — connect mock WS client, broadcast message, verify client receives typed MessageEnvelope

### Implementation for User Story 2

- [x] T027 [US2] Create file watcher service using chokidar with awaitWriteFinish config (stabilityThreshold: 300), recursive watch on specs/, auto-create specs/ if missing in packages/backend/src/watcher/file-watcher.ts
- [x] T028 [US2] Create WebSocket hub that tracks connected clients, broadcasts typed MessageEnvelope messages, and sends state snapshot on connect in packages/backend/src/ws/hub.ts
- [x] T029 [US2] Wire file watcher events to WebSocket hub — on file create/change/delete, read full content, construct FileSystemEvent, broadcast via hub in packages/backend/src/server.ts
- [x] T030 [US2] Create useWebSocket hook with connection management, exponential backoff reconnection (max 10 retries), message parsing into typed events, and connectionStatus updates to Zustand in packages/frontend/src/hooks/useWebSocket.ts
- [x] T031 [US2] Create ConnectionDot component showing connected (green) / reconnecting (amber) / disconnected (red) indicator in packages/frontend/src/components/ConnectionDot.tsx
- [x] T032 [US2] Wire useWebSocket into App.tsx — connect on mount, display ConnectionDot in icon rail, log received file events to console in packages/frontend/src/App.tsx

**Checkpoint**: At this point, editing files in specs/ produces visible events in the browser. File watcher pipeline works end-to-end.

---

## Phase 5: User Story 3 - IDE State Persists Across Restarts (Priority: P3)

**Goal**: Active feature, pipeline stage, and all operational state survives server restarts via SQLite

**Independent Test**: Activate a feature via API, restart the server, verify it's still active via API

### Tests for User Story 3 ⚠️

- [x] T033 [P] [US3] Write feature activation API tests in tests/backend/features-api.test.ts — GET returns null when no active feature, POST activates feature, POST returns 409 when feature already active, DELETE deactivates, GET returns feature after activation, feature persists after DB reconnect

### Implementation for User Story 3

- [x] T034 [US3] Create drizzle schema with tables: features, pipeline_states, pipeline_transition_history, task_card_cache, chat_messages in packages/backend/src/db/schema.ts per data-model.md
- [x] T035 [US3] Create DB client that auto-creates SQLite database file and runs raw SQL CREATE TABLE IF NOT EXISTS on startup in packages/backend/src/db/client.ts
- [x] T036 [US3] Create FeatureService with activate, deactivate, getActive methods enforcing single-active-feature constraint in packages/backend/src/services/feature.ts
- [x] T037 [US3] Create feature API routes (GET /api/features/active, POST /api/features/activate, DELETE /api/features/active) using FeatureService in packages/backend/src/api/features.ts
- [x] T038 [US3] Mount feature API routes on Express app in packages/backend/src/server.ts

**Checkpoint**: At this point, feature activation persists across restarts. Database schema is in place for all future state needs.

---

## Phase 6: User Story 4 - Shared Types Prevent Drift (Priority: P4)

**Goal**: Changing a shared type causes compile errors in both frontend and backend

**Independent Test**: Rename a field in shared types, run type-check, see errors in both packages

### Implementation for User Story 4

- [x] T039 [US4] Import and use shared FileSystemEvent type in WebSocket hub broadcast code in packages/backend/src/ws/hub.ts (verify backend depends on shared types)
- [x] T040 [US4] Import and use shared MessageEnvelope type in useWebSocket hook message parsing in packages/frontend/src/hooks/useWebSocket.ts (verify frontend depends on shared types)
- [x] T041 [US4] Add root typecheck script in package.json that runs tsc --noEmit across all workspaces, verify it passes
- [x] T042 [US4] Verify type safety: temporarily rename a field in packages/shared/src/messages/filesystem.ts, run root typecheck, confirm both backend and frontend report compile errors, then revert the change

**Checkpoint**: All packages share types. Protocol drift is impossible without compile errors.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases and hardening

- [x] T043 [P] Handle specs/ directory auto-creation in file watcher startup — create if not exists, start watching in packages/backend/src/watcher/file-watcher.ts (done in T027)
- [x] T044 [P] Handle file deletion events — emit FileSystemEvent with type "deleted" and no content in packages/backend/src/watcher/file-watcher.ts
- [x] T045 [P] Handle port-in-use error — catch EADDRINUSE, display clear error with port number and suggestion in packages/backend/src/index.ts
- [x] T046 [P] Handle database file missing on startup — auto-recreate DB and tables without errors in packages/backend/src/db/client.ts (done in T035)
- [x] T047 Run quickstart.md validation — follow all steps in specs/001-foundation/quickstart.md from scratch, verify every command and expected outcome (UAT 8/8 passed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (nav shell) can start after Foundational
  - US2 (file watcher) can start after Foundational
  - US3 (DB state) can start after Foundational
  - US4 (type safety) depends on US2 (uses shared types in watcher) and needs types already imported
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational — Independent from US1 and US3
- **User Story 3 (P3)**: Can start after Foundational — Independent from US1 and US2
- **User Story 4 (P4)**: Depends on US2 completing (shared types must be imported in real code)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Schema/types before services
- Services before API routes
- Backend before frontend integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003, T004, T005, T006, T007 can all run in parallel (different packages)
- T010, T011, T012 can run in parallel (different files in shared)
- T019, T020, T021, T022 can all run in parallel (different component files)
- T025, T026 can run in parallel (different test files)
- US1, US2, US3 can run in parallel after Foundational phase
- All Polish tasks (T043-T046) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Open browser, click nav items, refresh — works?
5. Continue to Phase 4-6 for remaining stories

### Incremental Delivery

1. Setup + Foundational → Monorepo builds, servers start
2. US1 (nav shell) → Browser shows navigable IDE shell (MVP!)
3. US2 (file watcher) → Edit file, see event in browser
4. US3 (DB state) → Activate feature via API, restart, still active
5. US4 (type safety) → Rename shared field, see compile errors
6. Polish → Edge cases handled, quickstart validated

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- ESM-only: every package.json must have "type": "module"

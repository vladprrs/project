---
phase: 01-foundation
plan: 02
subsystem: backend
tags: [express, websocket, sqlite, drizzle-orm, chokidar, better-sqlite3, ws, file-watcher]

# Dependency graph
requires:
  - phase: 01-01
    provides: "@specflow/shared types (MessageEnvelope, Feature, API contracts)"
provides:
  - "Express 5 backend server on port 3001 with health check"
  - "WebSocket server on /ws path with broadcast hub"
  - "Chokidar file watcher on specs/ with awaitWriteFinish debouncing"
  - "SQLite database with 5 tables (features, pipeline_states, transition_history, task_card_cache, chat_messages)"
  - "Feature management API (GET /active, POST /activate, DELETE /active)"
  - "Single active feature enforcement (409 conflict, 404 not found)"
  - "FeatureService with pipeline state initialization on activation"
affects: [01-03, 02-pipeline, 02-chat, 03-kanban]

# Tech tracking
tech-stack:
  added: [express-5.2.1, ws-8.20.0, chokidar-5.0.0, better-sqlite3-12.8.0, drizzle-orm-0.45.1, nanoid-5.1.7]
  patterns: [noserver-websocket-upgrade, chokidar-awaitWriteFinish, drizzle-schema-with-raw-sql-init, feature-service-single-active, express-createServer-pattern]

key-files:
  created:
    - packages/backend/src/db/schema.ts
    - packages/backend/src/db/client.ts
    - packages/backend/src/services/feature.ts
    - packages/backend/src/ws/hub.ts
    - packages/backend/src/watcher/file-watcher.ts
    - packages/backend/src/api/features.ts
    - packages/backend/src/server.ts
    - packages/backend/src/index.ts
  modified: []

key-decisions:
  - "Raw SQL for table creation at startup instead of drizzle-kit push -- simpler, no CLI dependency at runtime"
  - "WebSocket noServer mode with upgrade handler filtering on /ws path only"
  - "File watcher creates specs/ directory if missing -- defensive initialization"

patterns-established:
  - "Express 5 pattern: createServer(app) wraps Express, ws uses noServer mode with upgrade handler"
  - "Database initialization: raw SQL CREATE TABLE IF NOT EXISTS for all tables at startup"
  - "Service layer pattern: FeatureService class injected with AppDatabase, business logic separated from routes"
  - "File watcher broadcasts MessageEnvelope through WsHub callback -- clean separation of concerns"
  - "API error pattern: throw errors with .status property, catch in route handlers"

requirements-completed: [INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-08]

# Metrics
duration: 3min
completed: 2026-03-24
---

# Phase 01 Plan 02: Backend Server Summary

**Express 5 backend with WebSocket hub, chokidar file watcher, SQLite database (5 tables via drizzle-orm), and single-active-feature API enforcement**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T16:48:28Z
- **Completed:** 2026-03-24T16:52:25Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built Express 5 server on port 3001 with HTTP and WebSocket support (noServer upgrade on /ws path)
- Created SQLite database layer with drizzle-orm schema and auto-creation of all 5 tables (features, pipeline_states, transition_history, task_card_cache, chat_messages) using WAL mode
- Implemented FeatureService with single-active-feature enforcement: activate returns 409 on conflict, deactivate returns 404 when none active, reactivation of existing features by name
- Integrated chokidar 5 file watcher on specs/ with awaitWriteFinish debouncing (300ms threshold) broadcasting FileSystemEvent messages via WebSocket
- Feature API routes matching contracts/api.md: GET /active, POST /activate, DELETE /active

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SQLite database layer and feature service** - `a57385b` (feat)
2. **Task 2: Create Express server, WebSocket hub, file watcher, and feature API routes** - `3486282` (feat)

## Files Created/Modified
- `packages/backend/src/db/schema.ts` - Drizzle ORM schema for all 5 tables
- `packages/backend/src/db/client.ts` - Database initialization with WAL mode and raw SQL table creation
- `packages/backend/src/services/feature.ts` - FeatureService with single-active-feature enforcement
- `packages/backend/src/ws/hub.ts` - WebSocket broadcast hub managing connected clients
- `packages/backend/src/watcher/file-watcher.ts` - Chokidar file watcher with awaitWriteFinish and MessageEnvelope output
- `packages/backend/src/api/features.ts` - Express router for feature CRUD (GET/POST/DELETE)
- `packages/backend/src/server.ts` - Express app creation with WebSocket upgrade, DB init, watcher wiring
- `packages/backend/src/index.ts` - Server entry point, listens on PORT env var or 3001

## Decisions Made
- Used raw SQL CREATE TABLE IF NOT EXISTS at startup instead of drizzle-kit push -- avoids CLI dependency at runtime, tables auto-created on first run
- WebSocket uses noServer mode with upgrade handler filtering on /ws path -- prevents WebSocket connections on other paths
- File watcher defensively creates specs/ if missing -- prevents startup error on fresh clone
- FeatureService reactivates existing features by name rather than creating duplicates -- supports deactivate/reactivate workflows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend server fully operational: starts on port 3001, serves REST API, accepts WebSocket connections
- SQLite database auto-created with all 5 tables on first startup
- File watcher broadcasts events to connected WebSocket clients
- Ready for Plan 03: Frontend shell (React + Vite + Tailwind CSS with nav rail connecting to this backend)

## Self-Check: PASSED

- All 8 created files verified on disk
- All 2 commit hashes verified in git log (a57385b, 3486282)

---
*Phase: 01-foundation*
*Completed: 2026-03-24*

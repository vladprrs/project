---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [typescript, esm, npm-workspaces, monorepo, shared-types, websocket-protocol]

# Dependency graph
requires: []
provides:
  - "ESM monorepo with npm workspaces (shared, backend, frontend)"
  - "@specflow/shared types package with MessageEnvelope, FileSystemEvent, Feature, PipelineStage, API contracts"
  - "TypeScript project references linking consumers to shared source"
  - "Root typecheck and dev scripts"
affects: [01-02, 01-03, all-future-phases]

# Tech tracking
tech-stack:
  added: [typescript-6.0, express-5.2, ws-8.20, chokidar-5.0, better-sqlite3-12.8, drizzle-orm-0.45, react-19.2, vite-8.0, tailwindcss-4.2, zustand-5.0, concurrently-9.2, tsx-4.21, vitest-4.1, zod-4.3, nanoid-5.1, lucide-react-1.0, date-fns-4.1]
  patterns: [esm-only-monorepo, typescript-project-references, shared-types-no-build-in-dev, discriminated-union-messages]

key-files:
  created:
    - package.json
    - tsconfig.base.json
    - .gitignore
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/src/index.ts
    - packages/shared/src/messages/envelope.ts
    - packages/shared/src/messages/filesystem.ts
    - packages/shared/src/types/feature.ts
    - packages/shared/src/types/api.ts
    - packages/backend/package.json
    - packages/backend/tsconfig.json
    - packages/backend/drizzle.config.ts
    - packages/frontend/package.json
    - packages/frontend/tsconfig.json
  modified: []

key-decisions:
  - "Shared package exports .ts source directly (no build in dev) -- consumers use TypeScript paths per D-05"
  - "MessageEnvelope is a discriminated union on channel field, extensible for Phase 2+ pipeline/CLI channels"
  - "All packages ESM-only (type: module) -- required by chokidar 5, nanoid 5, and project architecture"

patterns-established:
  - "ESM monorepo: all packages use type: module, .js extensions in TypeScript imports"
  - "Shared types: @specflow/shared consumed via TypeScript paths, not compiled output"
  - "Discriminated unions: message protocol uses channel field for type narrowing"
  - "Const arrays with derived types: PIPELINE_STAGES as const + typeof for runtime + compile-time safety"

requirements-completed: [INFRA-01, INFRA-02]

# Metrics
duration: 3min
completed: 2026-03-24
---

# Phase 01 Plan 01: Monorepo + Shared Types Summary

**ESM monorepo with npm workspaces, TypeScript project references, and @specflow/shared types package defining MessageEnvelope, FileSystemEvent, Feature entities, and REST API contracts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T16:41:09Z
- **Completed:** 2026-03-24T16:44:44Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Created npm workspaces monorepo with three packages (shared, backend, frontend) all ESM-only
- Built @specflow/shared types package with discriminated union MessageEnvelope, FileSystemEvent types, all entity interfaces (Feature, PipelineState, TransitionHistory, TaskCardCache, ChatMessage), and complete REST API contracts
- Configured TypeScript project references so both backend and frontend import from @specflow/shared without a build step
- Installed all dependencies (236 packages) with verified versions from research phase

## Task Commits

Each task was committed atomically:

1. **Task 1: Create monorepo root config and all package.json files** - `4080bf9` (chore)
2. **Task 2: Create shared types package (messages, entities, API contracts)** - `aabca35` (feat)

Additional: `5b61827` - chore: add tsbuildinfo to gitignore (deviation Rule 3)

## Files Created/Modified
- `package.json` - Root workspace config with npm workspaces, dev/typecheck/test scripts
- `tsconfig.base.json` - Shared TypeScript config: ES2022 target, bundler resolution, strict mode
- `.gitignore` - Ignores node_modules, dist, data, SQLite files, Vite cache, tsbuildinfo
- `packages/shared/package.json` - @specflow/shared with direct .ts exports
- `packages/shared/tsconfig.json` - Composite config for project references
- `packages/shared/src/index.ts` - Barrel re-exports for all shared types
- `packages/shared/src/messages/envelope.ts` - MessageEnvelope discriminated union (filesystem channel)
- `packages/shared/src/messages/filesystem.ts` - FileSystemEvent union (created/changed/deleted)
- `packages/shared/src/types/feature.ts` - Feature, PipelineState, TransitionHistory, TaskCardCache, ChatMessage interfaces + const arrays
- `packages/shared/src/types/api.ts` - REST API request/response contracts (activate, deactivate, get active feature)
- `packages/backend/package.json` - Express 5, ws, chokidar 5, better-sqlite3, drizzle-orm, zod, nanoid, date-fns
- `packages/backend/tsconfig.json` - TypeScript paths to @specflow/shared + project references
- `packages/backend/drizzle.config.ts` - Drizzle kit config for SQLite migrations
- `packages/frontend/package.json` - React 19, Zustand, Lucide React, Vite, Tailwind CSS 4
- `packages/frontend/tsconfig.json` - JSX react-jsx + TypeScript paths to @specflow/shared + project references

## Decisions Made
- Shared package exports .ts source directly (no build in dev) -- both consumers use TypeScript path mapping per D-05
- MessageEnvelope uses discriminated union on `channel` field, starting with `'filesystem'` only -- extensible for pipeline and CLI channels in Phase 2+
- All packages enforce ESM-only (`"type": "module"`) as required by chokidar 5 and the project's ESM-first architecture
- TypeScript 6.0.2 used (latest stable) rather than 5.x from original CLAUDE.md stack recommendation -- research verified this as current

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added tsbuildinfo to .gitignore**
- **Found during:** Task 2 verification (typecheck generated tsbuildinfo)
- **Issue:** `tsc -b packages/shared` generates `tsconfig.tsbuildinfo` which was untracked
- **Fix:** Added `*.tsbuildinfo` to .gitignore
- **Files modified:** .gitignore
- **Verification:** `git status --short | grep '^??'` returns no untracked files
- **Committed in:** 5b61827

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Trivial -- standard gitignore entry for TypeScript build info. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monorepo foundation complete with all dependencies installed
- Shared types package ready for consumption by backend (Plan 02) and frontend (Plan 03)
- TypeScript project references configured -- both consumers can import from @specflow/shared
- Ready for Plan 02: Backend server (Express + WebSocket + file watcher + SQLite)

## Self-Check: PASSED

- All 15 created files verified on disk
- All 3 commit hashes verified in git log (4080bf9, aabca35, 5b61827)

---
*Phase: 01-foundation*
*Completed: 2026-03-24*

# Feature Specification: SpecFlow IDE Foundation

**Feature Branch**: `001-foundation`
**Created**: 2026-03-24
**Status**: Clarified
**Input**: User description:

## Clarifications

### Session 2026-03-24

- Q: Should file change events include full file content or just metadata (path + event type)? → A: Always include full file content in the event payload
- Q: Can pipeline stages move backward (e.g., from "tasks" back to "plan" after rejection)? → A: Yes, stages can move forward and backward; a history table logs every transition with timestamps
- Q: Should the shared types package predefine all three message channels or only filesystem? → A: Define only the filesystem channel now; add pipeline and CLI channels in their respective phases "Phase 1 (Foundation) — ESM monorepo, Express+WebSocket server, chokidar file watcher, SQLite schema, shared TypeScript types, and navigation shell with view switching"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Starts the IDE (Priority: P1)

A developer clones the SpecFlow IDE repository and runs the standard install-and-start commands. Both the backend server and frontend dev server launch without errors. The developer opens their browser and sees the SpecFlow IDE shell with a navigation bar offering three views: Chat, Docs, and Kanban. Clicking each nav item switches the active view area. The IDE is ready to receive future functionality in each view.

**Why this priority**: Without a working dev environment and app shell, no subsequent feature can be built or tested. This is the skeleton everything mounts into.

**Independent Test**: Can be fully tested by running install and start commands from a fresh checkout, then verifying the browser shows a navigable shell with three view placeholders.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository, **When** the developer runs the install command followed by the start command, **Then** both backend and frontend launch in dev mode with zero errors in the terminal
2. **Given** the IDE is running in the browser, **When** the developer clicks "Chat" in the navigation bar, **Then** the active view switches to the Chat placeholder
3. **Given** the IDE is running in the browser, **When** the developer clicks "Docs" in the navigation bar, **Then** the active view switches to the Docs placeholder
4. **Given** the IDE is running in the browser, **When** the developer clicks "Kanban" in the navigation bar, **Then** the active view switches to the Kanban placeholder
5. **Given** the developer is on the Docs view, **When** they close the browser and reopen the IDE, **Then** the Docs view is still the active view (persisted selection)

---

### User Story 2 - File Changes Push to Browser (Priority: P2)

A developer (or an external CLI tool) creates or modifies a file inside a watched spec artifacts directory. The backend detects the change and pushes a notification to the browser over a persistent connection within a short time window. The browser displays evidence that the event was received. This proves the real-time pipeline from filesystem to frontend works end-to-end.

**Why this priority**: Every subsequent feature (live doc reload, kanban updates, pipeline state) depends on reliable file-change-to-browser delivery. If this does not work, the editor and kanban cannot live-reload.

**Independent Test**: Can be tested by editing a file in the specs directory and observing a message arrive in the browser (visible notification in a placeholder area or developer console).

**Acceptance Scenarios**:

1. **Given** the IDE is running and the browser is connected, **When** a new file is created in `specs/test-feature/spec.md`, **Then** the browser receives a file-created event within 2 seconds
2. **Given** the IDE is running and the browser is connected, **When** an existing spec file is modified, **Then** the browser receives a file-changed event with the file path and full file content within 2 seconds
3. **Given** a CLI tool writes a large file (50KB+) to the specs directory in multiple flushes, **When** the write completes, **Then** the browser receives exactly one file-changed event with complete content (no partial reads)
4. **Given** two spec files are modified within 100ms of each other, **When** both writes complete, **Then** the browser receives separate events for each file (per-file debouncing, not global)

---

### User Story 3 - IDE State Persists Across Restarts (Priority: P3)

The IDE stores operational state (which feature is active, pipeline stage, chat history, task card cache) in a local database. When the IDE restarts, this state is preserved. The developer does not lose their workflow context between sessions.

**Why this priority**: Without persistent state, every restart resets the user's context. The database schema must be in place before chat history, pipeline tracking, or kanban caching can be built in later phases.

**Independent Test**: Can be tested by setting an active feature via the backend, restarting the server, and verifying the active feature is still set.

**Acceptance Scenarios**:

1. **Given** the IDE backend starts for the first time, **When** it initializes, **Then** the database is created automatically with tables for pipeline state, task cache, and chat history
2. **Given** a feature "user-auth" is set as the active feature, **When** the backend restarts, **Then** "user-auth" is still the active feature
3. **Given** "user-auth" is the active feature, **When** another feature is set as active without deactivating the first, **Then** the system rejects the request with a clear error explaining only one feature can be active at a time
4. **Given** "user-auth" is the active feature, **When** the user explicitly deactivates it, **Then** a different feature can be activated

---

### User Story 4 - Shared Types Prevent Drift (Priority: P4)

The frontend and backend share type definitions for real-time messages and API contracts through a common types package. When a developer changes a message type in the shared package, both the frontend and backend fail to compile if they use the old shape. This prevents silent protocol drift between client and server.

**Why this priority**: Without shared types, the message protocol between frontend and backend can drift silently, causing runtime errors that are hard to diagnose. This must be established before any real messages are defined in Phase 2.

**Independent Test**: Can be tested by changing a field name in a shared type definition and verifying that both frontend and backend report compile errors referencing the old name.

**Acceptance Scenarios**:

1. **Given** a message type is defined in the shared types package, **When** the frontend imports and uses it, **Then** the frontend compiles successfully with type checking
2. **Given** a message type is defined in the shared types package, **When** a field is renamed in the shared definition, **Then** both frontend and backend report compile-time errors for the old field name
3. **Given** the monorepo is set up, **When** the developer runs the type-check command from the root, **Then** all three packages (shared, backend, frontend) are type-checked together

---

### Edge Cases

- What happens when the specs directory does not exist at startup? The file watcher MUST create it and begin watching without errors.
- What happens when a file is deleted in the specs directory? The browser MUST receive a file-deleted event.
- What happens when the real-time connection drops? The frontend MUST attempt reconnection with exponential backoff.
- What happens when the database file is deleted while the server is stopped? The server MUST recreate the database and tables on next startup without errors.
- What happens when the developer runs the start command on a port that is already in use? The system MUST display a clear error message with the port number.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a monorepo structure with three packages: shared types, backend, and frontend
- **FR-002**: All packages MUST use ESM modules — no CommonJS
- **FR-003**: Backend MUST run an HTTP server that serves API endpoints and upgrades connections for real-time messaging
- **FR-004**: Backend MUST watch the `specs/` directory (and subdirectories recursively) for file create, change, and delete events
- **FR-005**: Backend MUST debounce file watch events per file path, delivering only complete content after writes stabilize
- **FR-006**: Backend MUST push file change events to all connected clients using a typed message protocol defined in the shared types package
- **FR-007**: Backend MUST create and manage a local database for IDE operational state on first startup
- **FR-008**: Database MUST include tables for: pipeline state (feature, current stage), pipeline transition history (stage changes with timestamps, direction, and reason), task card cache (parsed from tasks.md), and chat message history (per feature)
- **FR-009**: Backend MUST enforce single active feature — attempting to activate a second feature while one is active MUST return an error
- **FR-010**: Backend MUST expose an API to set, get, and clear the active feature
- **FR-011**: Frontend MUST display a navigation bar with three items: Chat, Docs, Kanban
- **FR-012**: Clicking a navigation item MUST switch the visible view area to that view's content (single active view at a time)
- **FR-013**: Frontend MUST persist the active navigation view to local storage and restore it on page load
- **FR-014**: Frontend MUST establish a real-time connection to the backend on load and display connection status
- **FR-015**: Frontend MUST attempt reconnection with exponential backoff when the connection drops
- **FR-016**: Shared types package MUST define a discriminated union message envelope with an extensible channel design. Phase 1 defines the filesystem channel only; pipeline and CLI channels are added in their respective phases
- **FR-017**: Both frontend and backend MUST import message types from the shared package — no inline type definitions for protocol messages
- **FR-018**: Two commands from the repository root (`npm install` + `npm start`) MUST install all dependencies and start both backend and frontend in development mode

### Key Entities

- **Feature**: The currently active spec-first feature being worked on. Has a name, directory path under `specs/`, and activation status. Only one can be active at a time.
- **Pipeline State**: Tracks which workflow stage a feature is currently in (specify, clarify, plan, tasks, implement, verify, ship). Stages can move forward and backward (e.g., regression from "tasks" to "plan" after rejection). A separate transition history logs every stage change with timestamps, direction (forward/backward), and optional reason.
- **File Event**: A notification that a spec artifact file was created, changed, or deleted. Contains the file path, event type, and the full file content (always included for create and change events; omitted for delete events).
- **Message Envelope**: A typed wrapper with a channel (filesystem, pipeline, cli) and a payload matching the channel's schema. Defined in shared types.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from fresh clone to running IDE in under 3 minutes with two commands (install + start)
- **SC-002**: File changes in the specs directory are reflected in the browser within 2 seconds of write completion
- **SC-003**: Large file writes (50KB+) result in exactly one event delivery with complete content (zero partial reads)
- **SC-004**: The navigation bar switches views in under 100ms with no visible flicker
- **SC-005**: IDE state (active feature, view selection) survives server and browser restarts with zero data loss
- **SC-006**: Changing a shared type definition causes compile-time errors in both frontend and backend within the same build cycle

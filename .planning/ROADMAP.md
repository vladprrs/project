# Roadmap: SpecFlow IDE

## Overview

SpecFlow IDE delivers a web-based document-centric interface for spec-first AI development in four phases. We start with the load-bearing infrastructure (ESM monorepo, WebSocket server, file watcher, SQLite), then build the two primary interaction surfaces (chat with AI SDK streaming + TipTap document editor), then add workflow automation (pipeline bar with approval gates + kanban board from tasks.md), and finish by hardening cross-panel coordination and MVP packaging.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - ESM monorepo, Express+WebSocket server, file watcher, SQLite schema, shared types, nav shell
- [ ] **Phase 2: Chat + Document Editor** - AI SDK chat with streaming agent responses, TipTap markdown editor with live reload and tabs
- [ ] **Phase 3: Pipeline + Kanban** - Workflow stage bar with approval gates, kanban board parsed from tasks.md with real-time updates
- [ ] **Phase 4: Integration + Polish** - WebSocket reconnection with reconciliation, cross-panel hardening, MVP packaging

## Phase Details

### Phase 1: Foundation
**Goal**: A running monorepo with ESM backend that serves a React shell, watches files, pushes WebSocket events, and persists state to SQLite -- the infrastructure every panel depends on
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Running `npm install && npm start` from the repo root launches both backend and frontend in dev mode with no CJS/ESM errors
  2. The browser shows a navigation bar where clicking Chat, Docs, or Kanban switches the active view (empty placeholder content is fine)
  3. Editing a file in `specs/<feature>/` triggers a WebSocket message that arrives in the browser console within 2 seconds
  4. SQLite database is created on first run with tables for pipeline state, task cache, and chat history (verified via schema query)
  5. Backend enforces single active feature -- setting a feature via API rejects if another is already active
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md -- Monorepo structure, shared types package
- [ ] 01-02-PLAN.md -- Backend: Express server, WebSocket, file watcher, SQLite, feature API
- [ ] 01-03-PLAN.md -- Frontend: Vite, Tailwind, icon rail, placeholder views, WebSocket client
**UI hint**: yes

### Phase 2: Chat + Document Editor
**Goal**: Users can type commands in the chat panel to invoke coding agents via AI SDK, see structured streaming responses, and view the resulting spec artifacts rendered in a tabbed TipTap editor that live-reloads on file changes
**Depends on**: Phase 1
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08
**Success Criteria** (what must be TRUE):
  1. User types a natural language command in the chat panel and sees a streaming response from an AI SDK provider with activity indicators and structured output (not raw stdout)
  2. Chat messages containing artifact references (spec.md, plan.md) render as clickable links that switch to the Docs view and open that artifact in a new editor tab
  3. TipTap editor renders markdown documents with headings, lists, code blocks, tables, and checkboxes -- and the document live-reloads when the underlying file changes on disk
  4. Editor opens in read-only mode by default with an explicit toggle to enable editing, and supports undo/redo plus in-document search (Cmd+F) when in edit mode
  5. After a rejection (user provides feedback in chat), the editor shows inline diff markers highlighting what changed in the revised artifact
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
**UI hint**: yes

### Phase 3: Pipeline + Kanban
**Goal**: Users can see where they are in the spec-first lifecycle via a pipeline bar with approval gates, and view task progress on a kanban board that updates in real-time as agents execute
**Depends on**: Phase 2
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, KANB-01, KANB-02, KANB-03, KANB-04, KANB-05
**Success Criteria** (what must be TRUE):
  1. Pipeline bar displays all workflow stages (specify through ship) with visual distinction between completed, current, and future stages -- and the current stage updates after agent commands complete
  2. At blocking stages, an "Approve" button appears in the pipeline bar; clicking it records the approval (timestamp + stage) and automatically triggers the next agent command via chat
  3. Rejection loops work end-to-end: user types feedback in chat, agent re-invokes the current stage, pipeline gate reappears for re-approval
  4. Kanban board parses tasks.md into visual cards grouped by phase, showing task ID, parallelizable flag, user story label, and file paths on each card
  5. Kanban cards update status in real-time via WebSocket when tasks.md changes on disk, and show GSD agent activity overlay (task started, attempt N/M, blocked, done)
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
**UI hint**: yes

### Phase 4: Integration + Polish
**Goal**: The application handles disconnection gracefully and ships as a self-contained MVP that anyone can clone and run
**Depends on**: Phase 3
**Requirements**: UX-03, INFRA-09
**Success Criteria** (what must be TRUE):
  1. After a WebSocket disconnect and reconnect, the browser performs a one-time filesystem reconciliation that brings all views (chat, editor, kanban) back to current state without manual refresh
  2. A fresh clone of the repo followed by `npm install` then `npm start` launches a fully working IDE that connects to the user's own coding agent setup with zero additional configuration
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Planning complete | - |
| 2. Chat + Document Editor | 0/0 | Not started | - |
| 3. Pipeline + Kanban | 0/0 | Not started | - |
| 4. Integration + Polish | 0/0 | Not started | - |

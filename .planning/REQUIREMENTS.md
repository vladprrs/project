# Requirements: SpecFlow IDE

**Defined:** 2026-03-24
**Core Value:** The IDE maps human decisions (approve, reject, refine) to automated spec-first AI execution, making the workflow accessible without memorizing CLI commands.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Chat & Command Panel

- [ ] **CHAT-01**: User can type natural language commands in chat panel to invoke spec-first workflow stages (specify, clarify, plan, tasks, implement, verify)
- [ ] **CHAT-02**: Chat uses Vercel AI SDK (useChat) with streaming responses from coding agents
- [ ] **CHAT-03**: Backend exposes /api/chat endpoint with custom AI SDK providers per agent (ai-sdk-provider-claude-code, ai-sdk-provider-codex-app-server, ai-sdk-provider-opencode-sdk)
- [ ] **CHAT-04**: Chat displays structured streaming output with stage transitions, progress messages, and result summaries — not raw CLI stdout
- [ ] **CHAT-05**: Chat messages include clickable artifact references (spec.md, plan.md, tasks.md) that open the document in the editor panel
- [ ] **CHAT-06**: Chat persists conversation history per feature in SQLite
- [ ] **CHAT-07**: Chat displays clear activity indicators during agent execution ("Generating spec...", "Building plan...")
- [ ] **CHAT-08**: Chat displays errors with actionable context (human-readable message + retry/edit action), not stack traces
- [ ] **CHAT-09**: User can type feedback after rejection to re-invoke the current stage with updated context (rejection-feedback-retry loop)

### Document Editor

- [ ] **EDIT-01**: User can view spec.md, plan.md, and tasks.md rendered in TipTap with markdown support (headings, lists, code blocks, tables, checkboxes)
- [ ] **EDIT-02**: Document editor live-reloads when artifact files change on disk via backend filesystem watch + WebSocket push
- [ ] **EDIT-03**: Editor supports multiple document tabs with tab bar navigation
- [ ] **EDIT-04**: Editor tabs open automatically when a new artifact is created by an agent command
- [ ] **EDIT-05**: Editor has read-only mode by default for generated artifacts, with explicit toggle to edit mode
- [ ] **EDIT-06**: Editor supports basic in-document search (Cmd+F)
- [ ] **EDIT-07**: Editor supports undo/redo within edit sessions
- [ ] **EDIT-08**: Editor shows artifact diff view when reviewing post-rejection revisions (inline diff markers showing what changed)

### Pipeline & Workflow

- [ ] **PIPE-01**: Pipeline bar displays the current workflow stage across the full lifecycle (specify → clarify → plan → tasks → implement → verify → ship)
- [ ] **PIPE-02**: Pipeline bar visually distinguishes completed stages, current stage, and future stages
- [ ] **PIPE-03**: Pipeline bar shows explicit approval gate buttons (e.g., "Approve Plan") at blocking stages
- [ ] **PIPE-04**: Clicking Approve records IDE state (timestamp, stage: approved) and automatically triggers the next agent command
- [ ] **PIPE-05**: Rejection is handled through chat: user types feedback, agent re-invokes current stage with context, pipeline gate reappears
- [ ] **PIPE-06**: Pipeline maintains stage history with timestamps for audit trail

### Kanban Board

- [ ] **KANB-01**: Kanban board parses tasks.md checkbox format into visual task cards grouped by phase
- [ ] **KANB-02**: Task cards display metadata: task ID, parallelizable flag [P], user story label [US], file paths
- [ ] **KANB-03**: Kanban cards update status in real-time via WebSocket when tasks.md changes on disk
- [ ] **KANB-04**: Cards show GSD agent activity overlay: task started, attempt N/M, running tests, blocked, done
- [ ] **KANB-05**: Phase grouping displayed as columns or swimlanes matching tasks.md phase headers

### Infrastructure & Backend

- [ ] **INFRA-01**: Monorepo with shared TypeScript types package (WebSocket message types, API contracts) used by both frontend and backend
- [ ] **INFRA-02**: Backend is Node.js + TypeScript + Express with ESM modules (`"type": "module"`) from day one
- [ ] **INFRA-03**: Backend watches spec artifact files (specs/<feature>/) via chokidar with awaitWriteFinish debouncing
- [ ] **INFRA-04**: Backend pushes file change events to frontend via WebSocket (ws library, channel-multiplexed protocol)
- [ ] **INFRA-05**: SQLite (better-sqlite3 + drizzle-orm) stores IDE operational state: pipeline stage, approvals, task card cache, chat history
- [ ] **INFRA-06**: Spec artifacts stored on filesystem (specs/<feature>/) as the single source of truth — SQLite is a disposable cache
- [ ] **INFRA-07**: WebSocket reconnection with full state snapshot on reconnect (no incremental catch-up needed for single-user tool)
- [ ] **INFRA-08**: Single active feature at a time enforced by backend state
- [ ] **INFRA-09**: Shareable MVP packaging: clone repo, npm install, npm start — works with user's own agent setup

### General UX

- [ ] **UX-01**: Navigation bar with view switching between Chat, Docs, and Kanban views (single active view at a time)
- [ ] **UX-02**: Active view persists to localStorage across sessions
- [ ] **UX-03**: WebSocket reconnection with one-time filesystem reconciliation as fallback

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### General UX

- **UX-V2-01**: Keyboard shortcuts for panel focus (Cmd+1/2/3), command palette (Cmd+K), trigger approval (Cmd+Enter)
- **UX-V2-02**: Feature selector/switcher (dropdown listing specs/ subdirectories)
- **UX-V2-03**: React error boundaries per panel with "reload panel" fallback
- **UX-V2-04**: Pipeline stage time tracking (how long each stage took)

### Document Editor

- **EDIT-V2-01**: Cross-artifact navigation (click requirement ID in spec.md → jump to plan.md section)
- **EDIT-V2-02**: Syntax highlighting for code blocks in markdown

### Chat

- **CHAT-V2-01**: Agent selector dropdown to switch between Claude Code, Codex, OpenCode providers

## Out of Scope

| Feature | Reason |
|---------|--------|
| Desktop packaging (Electron/Tauri) | Web on localhost first; desktop is a future concern |
| Multi-feature concurrency | One active feature keeps state simple for v1 |
| Code editor / diff viewer as primary panel | Violates Constitution Principle II (document-centric) |
| User authentication | Localhost tool, no login needed |
| Custom theme system | Tailwind defaults sufficient for MVP |
| Mobile responsive layout | Desktop-only SPA |
| Inline AI in document editor | Violates Constitution Principle III (orchestration, not reimplementation) |
| Drag-and-drop kanban reordering | Violates Constitution Principle I (tasks.md is source of truth) |
| Monaco code editor in main panels | Violates Constitution Principle II (document-centric, not code-centric) |
| Collaborative/multi-user editing | Single-user localhost tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| *(populated by roadmapper)* | | |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 0
- Unmapped: 34

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after initial definition*

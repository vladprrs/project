# Phase 2: Chat + Document Editor - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the two primary interaction surfaces of SpecFlow IDE: a chat panel where users type natural language commands that invoke coding agents via streaming responses, and a document viewer that renders spec artifacts (spec.md, plan.md, tasks.md) in a tabbed read-only markdown view with live-reload from filesystem changes. Chat messages persist per feature. Artifact references in chat are clickable links to the document viewer. Editing documents is deferred to a future phase.

</domain>

<decisions>
## Implementation Decisions

### Backend Streaming Approach
- **D-01:** Use manual SSE on the backend (`res.write()` + `text/event-stream` headers) — NOT the AI SDK's `streamText()` server-side helpers. The AI SDK returns Web API `Response` objects, Express 5 uses Node `res` — known mismatch, not a risk worth taking for v1.
- **D-02:** Manual SSE is ~30 lines of code with zero dependency risk. We only need to stream chat completions and CLI output, not tool-calling chains.
- **D-03:** AI SDK is frontend-only (`useChat` with a custom fetch adapter) if it simplifies state management. Backend is NOT coupled to the `ai` package.

### Document Viewer (Read-Only Only)
- **D-04:** Phase 2 editor is **read-only rendering only** — no edit mode, no save, no undo/redo, no in-document search. Phase 2 is about viewing and approving documents, not editing them.
- **D-05:** Editing deferred to a future phase with proper round-trip tests per artifact type. Spec-kit artifacts use specific patterns (`[NEEDS CLARIFICATION]` markers, `- [ ] [TASK-003] [P] Description [→ REQ-ID]`, priority tags `P1/P2/P3`) that would be silently mangled by `tiptap-markdown` on save round-trips — corrupting the source of truth.
- **D-06:** Consider `react-markdown` with `remark-gfm` instead of TipTap for read-only rendering — lighter weight, no serialization concerns. TipTap may still be used if its rendering quality is materially better, but do not pull in TipTap's editing infrastructure.
- **D-07:** Document viewer still supports: tabbed interface, live-reload via WebSocket, auto-open on file creation, clickable artifact links from chat, scroll position preservation.

### Chat Persistence Scope
- **D-08:** Only persist the human↔AI conversation thread (role: `user` and `assistant`). Do NOT persist system event messages (agent started, task done, commit made) — these are ephemeral and reconstructible from filesystem state.
- **D-09:** Use the existing `chat_messages` table as-is with no schema migration. Only add a pagination index. AI SDK metadata stored in the `metadata` JSON column.

### Editor Tab State
- **D-10:** Editor tab state (open tabs, active tab) lives in Zustand as ephemeral frontend state. Not persisted to SQLite. Content sourced from filesystem events.

### Claude's Discretion
- Exact SSE message format and framing on the backend
- Whether to use `useChat` from AI SDK or a lighter custom hook for chat state
- `react-markdown` vs TipTap read-only — evaluate rendering quality for spec artifacts and choose
- Chat message rendering styling (bubbles, flat, cards)
- Loading/empty state designs
- Pagination page size for chat history

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Feature specification
- `specs/002-chat-doc-editor/spec.md` — Full spec with 7 user stories, 23 functional requirements, 5 clarifications, edge cases. **NOTE:** US6 (Edit Mode) and US7 (Diff View) are DEFERRED per D-04/D-05 — do not plan implementation for them.
- `specs/002-chat-doc-editor/plan.md` — Project structure, constitution check, file layout. **NOTE:** Needs update to reflect read-only-only scope.

### Data model and contracts
- `specs/002-chat-doc-editor/data-model.md` — Entity definitions (ChatMessage, EditorTab, DiffSnapshot, ArtifactLink). **NOTE:** DiffSnapshot entity is deferred (no diff view in Phase 2).
- `specs/002-chat-doc-editor/contracts/api.md` — REST endpoints (`POST /api/chat`, `GET/POST /api/chat/messages`, `GET /api/files/read`). **NOTE:** `POST /api/files/save` is deferred (no editing in Phase 2).

### Research and design
- `specs/002-chat-doc-editor/research.md` — 8 research decisions. **NOTE:** R2 (TipTap), R6 (Diff View), R7 (Input Lock) need re-evaluation against read-only scope.
- `specs/002-chat-doc-editor/quickstart.md` — Dependencies, file map, dev workflow.

### Prior phase
- `specs/001-foundation/spec.md` — Phase 1 foundation spec (WebSocket, file watcher, SQLite, nav shell)
- `specs/001-foundation/contracts/api.md` — Existing REST and WebSocket contracts

### Project governance
- `.specify/memory/constitution.md` — Core principles: Spec-First Data Flow (I), Document-Centric (II), Orchestration Not Reimplementation (III)
- `.planning/REQUIREMENTS.md` — Full requirements list with traceability matrix

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/backend/src/ws/hub.ts` — WebSocket broadcast hub (filesystem events). Used as-is for live-reload. Do NOT extend for chat (use HTTP SSE instead).
- `packages/backend/src/watcher/file-watcher.ts` — Chokidar file watcher with full content in events. Feeds live-reload directly.
- `packages/backend/src/db/schema.ts` — `chat_messages` table already exists with all needed fields (id, feature_id, role, content, metadata, created_at).
- `packages/backend/src/db/client.ts` — SQLite setup with `CREATE TABLE IF NOT EXISTS`. Add index here.
- `packages/backend/src/services/feature.ts` — FeatureService with activate/deactivate. Chat scopes to active feature.
- `packages/frontend/src/store/index.ts` — Zustand store with `persist` middleware (only `activeView`). Extend with tab state.
- `packages/frontend/src/hooks/useWebSocket.ts` — WebSocket hook with reconnection. Extend to dispatch file events to editor tabs.
- `packages/shared/src/types/feature.ts` — `ChatMessage` type, `CHAT_ROLES` const. Already exported.
- `packages/shared/src/types/api.ts` — API contract types. Extend with chat + file read contracts.

### Established Patterns
- ESM-only throughout (chokidar 5, nanoid 5 require it)
- Express 5 with typed route handlers and centralized error pattern
- Zustand with `persist` middleware and `partialize` for selective storage
- WebSocket message envelope with discriminated union by channel (`filesystem`, `snapshot`)
- Vite proxy for `/api` and `/ws` routes to backend during development

### Integration Points
- Chat endpoint (`POST /api/chat`) is a new Express route — mount alongside existing `/api/features`
- File read endpoint (`GET /api/files/read`) serves spec artifact content for initial tab load
- WebSocket filesystem events drive live-reload — frontend hooks dispatch to editor tab state
- Active feature from Zustand store scopes chat messages and determines which `specs/` subdirectory to watch

</code_context>

<specifics>
## Specific Ideas

- Manual SSE over AI SDK backend: "Manual SSE is ~30 lines and has zero dependency risk. Use AI SDK on the frontend only."
- Read-only first: "Phase 2 is about viewing and approving documents, not editing them. Editing comes later with proper round-trip tests per artifact type."
- Markdown fidelity concern: "spec-kit artifacts use specific markdown patterns like [NEEDS CLARIFICATION] markers, task syntax with [P] flags, priority tags — tiptap-markdown would silently mangle these."
- Persistence scope: "Don't persist the event log. Only persist the human↔AI conversation thread."

</specifics>

<deferred>
## Deferred Ideas

- **US6: Edit Mode with Undo/Redo and Search** — deferred until round-trip markdown serialization is validated per artifact type
- **US7: Rejection Feedback with Diff View** — deferred (depends on edit mode and content comparison)
- **POST /api/files/save endpoint** — deferred (no editing in Phase 2)
- **DiffSnapshot entity and diff-compute utility** — deferred (no diff view)
- **In-document search (Cmd+F)** — deferred (no edit mode)
- **TipTap search extension evaluation** — deferred
- **Conflict warning on live-reload during editing** — deferred (no editing)
- **Unsaved changes prompt on mode toggle** — deferred (no mode toggle)

</deferred>

---

*Phase: 02-chat-document-editor*
*Context gathered: 2026-03-25*

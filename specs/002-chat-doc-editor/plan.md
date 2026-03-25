# Implementation Plan: Chat + Document Editor

**Branch**: `002-chat-doc-editor` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-chat-doc-editor/spec.md`

## Summary

Build the chat panel and document editor — the two primary interaction surfaces of SpecFlow IDE. The chat panel uses Vercel AI SDK (`useChat()` + streaming `POST /api/chat`) to send user commands to coding agents and display structured streaming responses with activity indicators, artifact links, and error handling. Chat history persists per feature in the existing SQLite `chat_messages` table with cursor-based pagination. The document editor uses TipTap with `tiptap-markdown` for bidirectional markdown rendering, supports multiple tabs, live-reloads via the Phase 1 WebSocket filesystem channel, opens in read-only mode by default with manual save in edit mode, and displays inline diff markers after rejection-feedback cycles.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (LTS)
**Primary Dependencies**: React 19, Vite 6, Express 5, Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`), TipTap 2.x (`@tiptap/react`, `@tiptap/starter-kit`, `tiptap-markdown`), `diff` (text diffing), Zustand 5 (state), ws 8 (WebSocket), better-sqlite3 + drizzle-orm (database)
**Storage**: SQLite (existing `chat_messages` table) + filesystem (`specs/` directory)
**Testing**: Vitest + Testing Library (React) + happy-dom
**Target Platform**: Web app on localhost (desktop browser)
**Project Type**: Web application (monorepo: frontend + backend + shared)
**Performance Goals**: First streaming token < 3s, live-reload < 2s, mode toggle < 200ms, artifact link navigation < 500ms
**Constraints**: Single active feature, single user, orchestration only (no agent logic reimplementation)
**Scale/Scope**: Single user, ~10 open tabs max, ~1000+ chat messages per feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Spec-First Data Flow | PASS | Editor content derives from files on disk via filesystem watcher events. Editor tabs reflect file state. Live-reload updates UI from file changes. Manual save writes back to disk. No independent UI state that diverges from filesystem. |
| II. Document-Centric | PASS | Primary panels show spec artifacts (spec.md, plan.md, tasks.md) in TipTap editor. No source code displayed in main viewport. Artifact links in chat navigate to documents, not code. |
| III. Orchestration Only | PASS | Chat invokes coding agents via AI SDK custom providers. No spec generation, planning, or tool logic reimplemented in the IDE. The IDE is a thin streaming relay between user input and agent output. |

### Post-Design Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Spec-First Data Flow | PASS | Data model shows all editor content sourced from filesystem events. Save endpoint writes to disk; file watcher pushes update back. DiffSnapshot compares file content snapshots. Chat messages persisted to SQLite (operational state, not spec artifacts). |
| II. Document-Centric | PASS | API contracts define only spec file read/save endpoints (within `specs/` directory). No code file endpoints. TipTap renders markdown documents. |
| III. Orchestration Only | PASS | AI SDK provider wraps coding agent — no spec/plan generation logic in the IDE. Agent handles all Spec Kit / GSD invocations. The streaming endpoint is a pass-through relay. |

No violations. Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-chat-doc-editor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output — HTTP + WebSocket contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   └── src/
│       ├── types/
│       │   ├── api.ts           # Extended with chat + file API types
│       │   └── feature.ts       # Unchanged (ChatMessage type already defined)
│       ├── messages/
│       │   ├── envelope.ts      # Unchanged (filesystem channel sufficient)
│       │   ├── filesystem.ts    # Unchanged
│       │   └── snapshot.ts      # Unchanged
│       └── index.ts             # Extended exports
│
├── backend/
│   └── src/
│       ├── api/
│       │   ├── features.ts      # Unchanged
│       │   ├── chat.ts          # NEW — chat streaming + message CRUD endpoints
│       │   └── files.ts         # NEW — file read/save with path validation
│       ├── services/
│       │   ├── feature.ts       # Unchanged
│       │   ├── chat.ts          # NEW — ChatService (message CRUD, pagination)
│       │   └── agent-provider.ts # NEW — AI SDK custom provider wrapping coding agent
│       ├── db/
│       │   ├── schema.ts        # Unchanged
│       │   └── client.ts        # Modified — add pagination index
│       ├── ws/
│       │   └── hub.ts           # Unchanged
│       ├── watcher/
│       │   └── file-watcher.ts  # Unchanged
│       ├── server.ts            # Modified — mount chat + files routers
│       └── index.ts             # Unchanged
│
└── frontend/
    └── src/
        ├── views/
        │   ├── ChatView.tsx     # Rewritten — full chat UI
        │   ├── DocsView.tsx     # Rewritten — tabbed TipTap editor
        │   └── KanbanView.tsx   # Unchanged
        ├── components/
        │   ├── IconRail.tsx     # Unchanged
        │   ├── ConnectionDot.tsx # Unchanged
        │   ├── chat/
        │   │   ├── MessageList.tsx    # NEW — scrollable message list with pagination
        │   │   ├── ChatInput.tsx      # NEW — input with disabled state
        │   │   └── ArtifactLink.tsx   # NEW — clickable artifact reference
        │   └── editor/
        │       ├── EditorTabs.tsx     # NEW — tab bar with overflow scroll
        │       ├── MarkdownEditor.tsx # NEW — TipTap instance with extensions
        │       ├── EditorToolbar.tsx  # NEW — mode toggle, save, search
        │       └── DiffOverlay.tsx    # NEW — inline diff decorations
        ├── store/
        │   └── index.ts         # Modified — add editor tab state + actions
        ├── hooks/
        │   ├── useWebSocket.ts  # Modified — dispatch file events to editor
        │   └── useEditorTabs.ts # NEW — tab management logic
        └── lib/
            ├── artifact-links.ts # NEW — regex detection of artifact refs
            └── diff-compute.ts   # NEW — wrapper around diff library
```

**Structure Decision**: Extends the existing Phase 1 monorepo structure. New files are organized into `chat/` and `editor/` component subdirectories within the frontend, and `chat.ts` / `files.ts` API modules in the backend. No new packages or structural changes — this is additive to the existing layout.

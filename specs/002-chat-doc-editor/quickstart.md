# Quickstart: Chat + Document Editor

**Feature**: 002-chat-doc-editor
**Date**: 2026-03-25

## Prerequisites

- Phase 1 foundation running (`npm install && npm start` from monorepo root)
- Node.js 20+ with ESM support
- An API key for at least one supported coding agent (e.g., `ANTHROPIC_API_KEY`)

## New Dependencies

### Frontend (`packages/frontend`)

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm tiptap-markdown \
  @tiptap/extension-task-list @tiptap/extension-task-item \
  @tiptap/extension-placeholder @tiptap/extension-code-block-lowlight \
  lowlight ai @ai-sdk/react diff
```

### Backend (`packages/backend`)

```bash
npm install ai @ai-sdk/anthropic
```

### Shared (`packages/shared`)

No new dependencies — only type additions.

## Key Files to Create/Modify

### Backend

| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/src/api/chat.ts` | Create | Chat streaming endpoint (`POST /api/chat`) and message persistence endpoints |
| `packages/backend/src/api/files.ts` | Create | File read/save endpoints with path validation |
| `packages/backend/src/services/chat.ts` | Create | ChatService — message CRUD, cursor pagination queries |
| `packages/backend/src/services/agent-provider.ts` | Create | AI SDK custom provider wrapping coding agent |
| `packages/backend/src/db/client.ts` | Modify | Add pagination index for chat_messages |
| `packages/backend/src/server.ts` | Modify | Mount new routers (`/api/chat`, `/api/files`) |

### Frontend

| File | Action | Purpose |
|------|--------|---------|
| `packages/frontend/src/views/ChatView.tsx` | Rewrite | Full chat UI with useChat(), message list, input, activity indicators |
| `packages/frontend/src/views/DocsView.tsx` | Rewrite | Tabbed TipTap editor with live-reload, read-only toggle, diff view |
| `packages/frontend/src/components/chat/MessageList.tsx` | Create | Renders chat messages with artifact links, scroll-up pagination |
| `packages/frontend/src/components/chat/ChatInput.tsx` | Create | Input field with submit, disabled state during processing |
| `packages/frontend/src/components/chat/ArtifactLink.tsx` | Create | Clickable artifact reference that navigates to Docs view |
| `packages/frontend/src/components/editor/EditorTabs.tsx` | Create | Tab bar with scrollable overflow |
| `packages/frontend/src/components/editor/MarkdownEditor.tsx` | Create | TipTap editor instance with extensions |
| `packages/frontend/src/components/editor/DiffOverlay.tsx` | Create | Inline diff markers using ProseMirror decorations |
| `packages/frontend/src/components/editor/EditorToolbar.tsx` | Create | Read-only toggle, save button, search trigger |
| `packages/frontend/src/store/index.ts` | Modify | Add editor tab state and actions |
| `packages/frontend/src/hooks/useWebSocket.ts` | Modify | Dispatch filesystem events to editor tab state |

### Shared

| File | Action | Purpose |
|------|--------|---------|
| `packages/shared/src/types/api.ts` | Modify | Add chat and file API contract types |

## Development Workflow

1. **Start with backend chat service** — message persistence and pagination endpoints first (testable independently)
2. **Add AI SDK provider** — streaming endpoint with a mock/echo provider for development, swap in real agent later
3. **Build TipTap editor** — markdown rendering, tabs, read-only mode (testable with static files)
4. **Wire live-reload** — connect filesystem WebSocket events to editor content updates
5. **Build chat UI** — connect to streaming endpoint, render messages with artifact links
6. **Add edit mode** — toggle, save, undo/redo, search
7. **Add diff view** — snapshot capture, diff computation, inline decorations
8. **Integration** — artifact links navigate to docs, auto-open tabs on file creation

## Testing Approach

- **Backend unit tests**: ChatService CRUD, pagination cursor logic, path validation for file save
- **Backend integration tests**: Chat streaming endpoint with mock provider, message persistence round-trip
- **Frontend component tests**: TipTap editor rendering, tab management, artifact link detection
- **E2E smoke test**: Type in chat → see response → click artifact link → editor opens with content

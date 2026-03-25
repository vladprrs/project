# Research: Chat + Document Editor

**Feature**: 002-chat-doc-editor
**Date**: 2026-03-25

## R1: Vercel AI SDK Integration for Chat Streaming

**Decision**: Use Vercel AI SDK (`ai` package) with `useChat()` on the frontend and a streaming POST endpoint on the backend. Custom AI SDK provider wraps the coding agent.

**Rationale**: The AI SDK provides a standardized streaming protocol (Server-Sent Events / ReadableStream) that handles progressive token rendering, error propagation, and message history management out of the box. `useChat()` gives the frontend a React hook with built-in state for messages, loading, error, and input. The backend uses `streamText()` or a custom provider adapter to stream from the coding agent.

**Alternatives considered**:
- **Raw WebSocket streaming**: Would require implementing a custom message protocol for chat (separate from the existing filesystem channel), handling backpressure, message ordering, and reconnection. More work for no benefit since AI SDK already solves this.
- **HTTP polling**: Non-starter for streaming UX — the spec requires progressive token display.
- **Server-Sent Events (manual)**: AI SDK uses SSE under the hood, so using the SDK gives us SSE plus structured message parsing, error handling, and React integration for free.

**Key implementation details**:
- Backend: `POST /api/chat` endpoint using `streamText()` from `ai` package with a custom provider
- Frontend: `useChat({ api: '/api/chat' })` — the hook manages messages array, input state, `isLoading`, `error`
- Custom provider: Wraps coding agent execution (e.g., Claude Code CLI spawn) and converts output to AI SDK streaming format
- The AI SDK handles the HTTP streaming transport — this is separate from the existing WebSocket connection used for filesystem events

## R2: TipTap Editor for Markdown Document Rendering

**Decision**: Use TipTap v2 with `@tiptap/react`, `@tiptap/starter-kit`, and `tiptap-markdown` for bidirectional markdown serialization.

**Rationale**: TipTap is specified in the project constitution. It provides headless, ProseMirror-based rich text editing with first-class React bindings. The `tiptap-markdown` extension handles converting markdown strings to ProseMirror documents and back, which is the critical path for loading `.md` files and saving edits.

**Alternatives considered**:
- **Monaco/CodeMirror**: Explicitly excluded by constitution — these are code editors, not document editors.
- **BlockNote**: Built on TipTap but adds opinionated UI that conflicts with custom Tailwind styling.

**Key implementation details**:
- Extensions: StarterKit (base editing), tiptap-markdown (md ↔ ProseMirror), TaskList + TaskItem (checkboxes), CodeBlockLowlight (syntax highlighting), Placeholder
- Read-only mode: `editor.setEditable(false)` — built-in TipTap API
- Undo/redo: Built into StarterKit's History extension
- Search: `@tiptap/extension-search-and-replace` or a custom command using ProseMirror's `TextSelection` — evaluate available extensions at install time
- Content update: `editor.commands.setContent(markdownString)` via the tiptap-markdown serializer

## R3: Chat Message Persistence and Cursor-Based Pagination

**Decision**: Persist chat messages in the existing `chat_messages` SQLite table (already created in Phase 1). Load the most recent N messages on feature activation, paginate older messages on scroll-up using cursor-based queries.

**Rationale**: The `chat_messages` table already exists with the right schema (id, featureId, role, content, metadata, createdAt). Cursor-based pagination using `createdAt` + `id` as the cursor is simple, stateless, and efficient for chronological data. No additional schema migration is needed.

**Alternatives considered**:
- **Offset-based pagination**: Breaks when new messages are inserted (offsets shift). Cursor-based is strictly better for append-only chat data.
- **Load all**: Doesn't scale beyond a few hundred messages — spec explicitly requires pagination for 1000+.

**Key implementation details**:
- Backend API: `GET /api/chat/messages?featureId=X&before=CURSOR&limit=50`
- Cursor: `createdAt` timestamp + `id` for tie-breaking (both already in schema)
- Frontend: Load initial page on mount. On scroll to top, fetch next page and prepend. Track `hasMore` flag.
- Messages saved on send (user) and on stream completion (assistant)
- The `metadata` JSON field stores structured data: `{ stage?: string, status?: string, artifactPaths?: string[] }`

## R4: Artifact Reference Detection and Linking

**Decision**: Use regex pattern matching on chat message content to detect spec artifact filenames (spec.md, plan.md, tasks.md, research.md, data-model.md) and render them as clickable links.

**Rationale**: Artifact filenames follow a fixed, known set of patterns. A simple regex match is sufficient — no NLP or complex parsing needed. The linking behavior (switch to Docs view, open tab) is a frontend-only navigation action using the existing Zustand store.

**Alternatives considered**:
- **Structured metadata from agent**: The agent could explicitly list created artifacts in metadata. This is complementary (use metadata when available, fallback to regex), but regex handles all cases including manually typed references.
- **Markdown link parsing**: Agents might format references as `[spec.md](path)`. Support both bare filenames and markdown links.

**Key implementation details**:
- Pattern: `/\b(spec|plan|tasks|research|data-model|quickstart)\.md\b/g` — matches known artifact names
- Also match relative paths like `specs/002-feature/spec.md`
- Render matched text as `<button>` elements in the chat message that dispatch: `store.setActiveView('docs')` + open/focus tab action
- If the file doesn't exist on disk, clicking shows a toast notification

## R5: Live-Reload Integration with Existing File Watcher

**Decision**: Reuse the Phase 1 WebSocket filesystem channel. The frontend editor subscribes to `filesystem` messages and updates the active document when the event's path matches an open tab.

**Rationale**: Phase 1 already broadcasts file create/change/delete events with full file content over WebSocket. The editor just needs to listen and react — no new backend infrastructure required.

**Key implementation details**:
- Frontend hooks into `ws.onmessage` handler (extend existing `useWebSocket` hook or create a new `useFileEvents` hook)
- On `changed` event for a file matching an open tab: if read-only mode, replace editor content; if edit mode, show conflict warning
- On `created` event for a file in the active feature's directory: auto-open a new tab
- On `deleted` event: close the tab and show notification
- Scroll position preservation: Save scroll position before content update, restore after (using ProseMirror's `scrollIntoView` or manual DOM scroll restoration)

## R6: Diff View for Rejection-Feedback Cycle

**Decision**: Use `diff-match-patch` (Google's diff library) or `diff` (npm) to compute line-level differences between the snapshot and the current file content. Render diffs as inline decorations in TipTap using ProseMirror's decoration system.

**Rationale**: The spec requires inline diff markers (green for additions, red for deletions) overlaid on the document. ProseMirror decorations are the correct mechanism for this — they overlay styling without modifying the document content. The diff is computed from two plain-text strings: the snapshot (captured when the chat command was submitted) and the updated file content.

**Alternatives considered**:
- **Git diff**: Overkill — requires git operations for single-file comparison. Text diff is simpler and faster.
- **Side-by-side diff view**: The spec says "inline diff markers," not side-by-side. Inline is more compact and matches the single-document editing paradigm.

**Key implementation details**:
- Snapshot capture: When a chat message is submitted, store the current content of all open artifact files in memory (keyed by file path)
- Diff computation: After the agent completes and the file updates, diff the snapshot against the new content
- Rendering: Map diff hunks to ProseMirror `Decoration.inline()` or `Decoration.node()` with CSS classes for added/removed/modified
- Dismiss: Clear the decoration set and remove the snapshot from memory
- Library choice: `diff` (npm package `diff`) is lightweight (~10KB), well-maintained, and provides `diffLines()` which maps cleanly to document structure

## R7: Input Lock During Agent Processing

**Decision**: Disable the chat input and submit button while `isLoading` is true (from the AI SDK `useChat` hook). Display "Agent is working..." overlay on the input.

**Rationale**: The AI SDK's `useChat()` hook exposes an `isLoading` boolean that is true while a response is streaming. This maps directly to the spec requirement to disable input during processing.

**Key implementation details**:
- `useChat()` provides `isLoading` — bind to input `disabled` prop
- Visual treatment: gray out input, show spinner + "Agent is working..." text
- The submit button is also disabled
- Re-enabled automatically when streaming completes or errors

## R8: Streaming Interruption and Retry

**Decision**: On connection loss during streaming, keep the partial response visible in the chat, append an "interrupted" marker and a retry button. Retry resends the original user message for a fresh response.

**Rationale**: Per clarification Q5, partial responses are preserved for context. The AI SDK's `useChat()` provides an `error` state and a `reload()` function that resends the last message — this maps directly to the retry behavior.

**Key implementation details**:
- AI SDK `useChat()` provides `error` and `reload()` — `reload()` resubmits the last user message
- On error during streaming: the partial assistant message remains in the messages array
- Render an "interrupted" badge and "Retry" button after the partial message
- Clicking retry calls `reload()` which starts a fresh response (the partial stays visible, marked as interrupted; the new response appends below)

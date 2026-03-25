# Phase 2: Chat + Document Editor - Research

**Researched:** 2026-03-25
**Domain:** Chat streaming (SSE + AI SDK), read-only markdown rendering, tabbed document viewer, WebSocket live-reload
**Confidence:** HIGH

## Summary

Phase 2 builds two primary interaction surfaces on top of the Phase 1 foundation: a chat panel with streaming AI responses and a read-only document viewer with tabbed navigation and live-reload. The backend adds three new endpoints (POST /api/chat for SSE streaming, GET /api/chat/messages for paginated history, POST /api/chat/messages for persistence, and GET /api/files/read for file content). The frontend adds `@ai-sdk/react` for chat state management, `react-markdown` for rendering spec artifacts, and extends the Zustand store with editor tab state.

Key finding: AI SDK is now at v6.0.138 (major version jump from the v4 referenced in earlier spec research). The v6 API has significant breaking changes: `isLoading` replaced by `status` field, messages are `UIMessage[]` with `parts` array instead of flat `content` strings, `sendMessage()` replaces `handleSubmit()`, and `regenerate()` replaces `reload()`. The backend decision (D-01: manual SSE) remains valid -- the `streamProtocol: 'text'` option in `useChat` allows the frontend to consume plain text streams from a manual SSE endpoint without requiring AI SDK server-side helpers.

**Primary recommendation:** Use `@ai-sdk/react` v3 with `useChat({ streamProtocol: 'text' })` on the frontend consuming a manual Express SSE endpoint. Use `react-markdown` + `remark-gfm` + `rehype-highlight` for the read-only document viewer (not TipTap). Extend the existing Zustand store with editor tab slice. Reuse Phase 1's WebSocket filesystem channel for live-reload.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use manual SSE on the backend (`res.write()` + `text/event-stream` headers) -- NOT the AI SDK's `streamText()` server-side helpers. The AI SDK returns Web API `Response` objects, Express 5 uses Node `res` -- known mismatch, not a risk worth taking for v1.
- **D-02:** Manual SSE is ~30 lines of code with zero dependency risk. We only need to stream chat completions and CLI output, not tool-calling chains.
- **D-03:** AI SDK is frontend-only (`useChat` with a custom fetch adapter) if it simplifies state management. Backend is NOT coupled to the `ai` package.
- **D-04:** Phase 2 editor is **read-only rendering only** -- no edit mode, no save, no undo/redo, no in-document search. Phase 2 is about viewing and approving documents, not editing them.
- **D-05:** Editing deferred to a future phase with proper round-trip tests per artifact type. Spec-kit artifacts use specific patterns (`[NEEDS CLARIFICATION]` markers, `- [ ] [TASK-003] [P] Description [-> REQ-ID]`, priority tags `P1/P2/P3`) that would be silently mangled by `tiptap-markdown` on save round-trips -- corrupting the source of truth.
- **D-06:** Consider `react-markdown` with `remark-gfm` instead of TipTap for read-only rendering -- lighter weight, no serialization concerns. TipTap may still be used if its rendering quality is materially better, but do not pull in TipTap's editing infrastructure.
- **D-07:** Document viewer still supports: tabbed interface, live-reload via WebSocket, auto-open on file creation, clickable artifact links from chat, scroll position preservation.
- **D-08:** Only persist the human<->AI conversation thread (role: `user` and `assistant`). Do NOT persist system event messages (agent started, task done, commit made) -- these are ephemeral and reconstructible from filesystem state.
- **D-09:** Use the existing `chat_messages` table as-is with no schema migration. Only add a pagination index. AI SDK metadata stored in the `metadata` JSON column.
- **D-10:** Editor tab state (open tabs, active tab) lives in Zustand as ephemeral frontend state. Not persisted to SQLite. Content sourced from filesystem events.

### Claude's Discretion
- Exact SSE message format and framing on the backend
- Whether to use `useChat` from AI SDK or a lighter custom hook for chat state
- `react-markdown` vs TipTap read-only -- evaluate rendering quality for spec artifacts and choose
- Chat message rendering styling (bubbles, flat, cards)
- Loading/empty state designs
- Pagination page size for chat history

### Deferred Ideas (OUT OF SCOPE)
- **US6: Edit Mode with Undo/Redo and Search** -- deferred until round-trip markdown serialization is validated per artifact type
- **US7: Rejection Feedback with Diff View** -- deferred (depends on edit mode and content comparison)
- **POST /api/files/save endpoint** -- deferred (no editing in Phase 2)
- **DiffSnapshot entity and diff-compute utility** -- deferred (no diff view)
- **In-document search (Cmd+F)** -- deferred (no edit mode)
- **TipTap search extension evaluation** -- deferred
- **Conflict warning on live-reload during editing** -- deferred (no editing)
- **Unsaved changes prompt on mode toggle** -- deferred (no mode toggle)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | User can type commands in chat panel to invoke workflow stages | Manual SSE endpoint + `useChat` text stream protocol; chat input component with submit |
| CHAT-02 | Chat uses Vercel AI SDK (useChat) with streaming responses | `@ai-sdk/react` v3 with `useChat({ streamProtocol: 'text' })` -- confirmed works with Express manual SSE |
| CHAT-03 | Backend exposes /api/chat with custom AI SDK providers | Manual SSE endpoint per D-01; placeholder agent that echoes/simulates responses for v1 wiring |
| CHAT-04 | Chat displays structured streaming output | `useChat` status field (`submitted`/`streaming`/`ready`/`error`) drives activity indicators; message parts render progressively |
| CHAT-05 | Chat messages include clickable artifact references | Regex pattern matching on message content; artifact links dispatch Zustand actions to switch view and open tab |
| CHAT-06 | Chat persists conversation history per feature | Existing `chat_messages` table + pagination index; GET/POST /api/chat/messages endpoints |
| CHAT-07 | Chat displays activity indicators during agent execution | `useChat` `status === 'submitted' \|\| status === 'streaming'` drives indicator rendering |
| CHAT-08 | Chat displays errors with actionable context | `useChat` `status === 'error'` + `error` object; render human-readable messages with retry button |
| CHAT-09 | User can type feedback after rejection for retry loop | `useChat` `regenerate()` method resends; feedback appended as new user message before re-invoke |
| EDIT-01 | View spec.md/plan.md/tasks.md with headings, lists, code, tables, checkboxes | `react-markdown` + `remark-gfm` + `rehype-highlight` -- full GFM support including tables and task lists |
| EDIT-02 | Editor live-reloads on file changes via WebSocket | Extend `useWebSocket` to dispatch filesystem events to editor tab store; content replacement on `changed` events |
| EDIT-03 | Editor supports multiple tabs with tab bar navigation | Zustand `EditorTab[]` slice with `activeTabId`; `TabBar` component with click-to-switch |
| EDIT-04 | Tabs auto-open when new artifact created | WebSocket `created` event for files in active feature directory triggers tab open |
| EDIT-05 | Editor has read-only mode by default | Per D-04, Phase 2 is read-only only. No toggle needed -- always read-only |
| EDIT-06 | Editor supports in-document search (Cmd+F) | DEFERRED per D-04/D-05 -- not in Phase 2 scope |
| EDIT-07 | Editor supports undo/redo | DEFERRED per D-04/D-05 -- not in Phase 2 scope |
| EDIT-08 | Editor shows artifact diff view | DEFERRED per D-04/D-05 -- not in Phase 2 scope |
</phase_requirements>

## Standard Stack

### Core (New for Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @ai-sdk/react | ^3.0.140 | Frontend chat hook (useChat) | Official Vercel AI SDK React bindings. Provides useChat with streaming state management, message history, error handling, and abort control. Works with React 19. |
| react-markdown | ^10.1.0 | Read-only markdown rendering | Renders markdown to React components without dangerouslySetInnerHTML. Lightweight, composable via plugins, zero serialization concerns. Ideal for D-06 read-only requirement. |
| remark-gfm | ^4.0.1 | GFM support (tables, task lists, strikethrough) | Adds GitHub Flavored Markdown to react-markdown. Required for rendering spec artifacts with tables and checkboxes. |
| rehype-highlight | ^7.0.2 | Code block syntax highlighting | Adds highlight.js-based syntax highlighting to code blocks in react-markdown. Lightweight, CSS theme-based. |
| @tailwindcss/typography | ^0.5.19 | Prose styling for markdown content | Adds `prose` class that restores heading, list, table, and code block styles removed by Tailwind preflight. Compatible with Tailwind 4. |

### Supporting (New for Phase 2)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| highlight.js | (peer of rehype-highlight) | Language definitions for syntax highlighting | Auto-installed with rehype-highlight. Import individual language grammars for tree-shaking. |

### Already Installed (from Phase 1)

| Library | Version | Purpose |
|---------|---------|---------|
| zustand | ^5.0.12 | Frontend state management -- extend with editor tab slice |
| nanoid | ^5.1.7 | ID generation for chat messages |
| zod | ^4.3.6 | Request/response validation |
| better-sqlite3 | ^12.8.0 | SQLite driver for chat persistence |
| drizzle-orm | ^0.45.1 | Type-safe queries for chat_messages table |
| ws | ^8.20.0 | WebSocket server (reuse for live-reload) |
| express | ^5.2.1 | HTTP server (add SSE streaming route) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | TipTap (read-only) | TipTap requires @tiptap/core, @tiptap/react, @tiptap/starter-kit, @tiptap/pm, tiptap-markdown (5+ packages, ~200KB+). For read-only rendering only, this is massive overkill. react-markdown + remark-gfm is ~40KB and renders GFM perfectly. TipTap should be evaluated only when edit mode arrives. |
| @ai-sdk/react useChat | Custom fetch + useState | useChat provides streaming state (status field), message management, abort, regenerate, error handling out of the box. Reimplementing this correctly takes 200+ lines. The hook works standalone without AI SDK server-side dependencies. |
| Manual SSE (backend) | AI SDK streamText + pipeUIMessageStreamToResponse | AI SDK v6 now has `pipeUIMessageStreamToResponse(res)` that works directly with Express. However, per D-01, the user locked manual SSE. Manual SSE is ~30 lines and avoids coupling the backend to the `ai` package. |
| streamProtocol: 'text' | streamProtocol: 'data' (default) | The data stream protocol requires the server to send structured SSE events with specific JSON types (start, text-delta, finish, etc.) and header `x-vercel-ai-ui-message-stream: v1`. Much more complex to implement manually. Text protocol just sends plain text chunks -- trivial to implement with `res.write()`. |

### Installation

```bash
# Frontend (packages/frontend)
npm install @ai-sdk/react react-markdown remark-gfm rehype-highlight @tailwindcss/typography

# No new backend dependencies needed -- manual SSE uses only Express built-ins
```

**Version verification:** All versions confirmed via `npm view` on 2026-03-25.

## Architecture Patterns

### Recommended Project Structure (New files for Phase 2)

```
packages/
  backend/
    src/
      api/
        features.ts          # (existing)
        chat.ts              # NEW: POST /api/chat (SSE), GET/POST /api/chat/messages
        files.ts             # NEW: GET /api/files/read
      services/
        feature.ts           # (existing)
        chat.ts              # NEW: ChatService (persistence, pagination)
      db/
        schema.ts            # (existing -- add index)
        client.ts            # (existing -- add index creation)
  frontend/
    src/
      store/
        index.ts             # (existing -- extend with editor tab slice)
      hooks/
        useWebSocket.ts      # (existing -- extend to dispatch file events)
        useChatStream.ts     # NEW: wrapper around useChat with project-specific config
      views/
        ChatView.tsx         # REPLACE: full chat implementation
        DocsView.tsx         # REPLACE: full document viewer
      components/
        chat/
          ChatInput.tsx      # NEW: input with submit, disabled during streaming
          ChatMessage.tsx    # NEW: message bubble with artifact links
          ChatHistory.tsx    # NEW: scrollable message list with pagination
          ActivityIndicator.tsx # NEW: streaming/loading state display
        docs/
          TabBar.tsx         # NEW: document tabs
          MarkdownViewer.tsx # NEW: react-markdown renderer
          EmptyDocs.tsx      # NEW: empty state
  shared/
    src/
      types/
        api.ts              # EXTEND: add chat + file API contracts
        editor.ts           # NEW: EditorTab, ArtifactLink types
```

### Pattern 1: Manual SSE Streaming Endpoint

**What:** Express endpoint that streams text via Server-Sent Events
**When to use:** POST /api/chat endpoint per D-01/D-02

```typescript
// packages/backend/src/api/chat.ts
import { Router, type Request, type Response } from 'express';

export function createChatRouter(chatService: ChatService): Router {
  const router = Router();

  // POST /api/chat -- SSE streaming response
  router.post('/', async (req: Request, res: Response) => {
    const { messages, featureId } = req.body;

    // Validate request
    if (!featureId || !messages?.length) {
      res.status(400).json({ error: 'featureId and messages are required' });
      return;
    }

    // Set SSE headers for text streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    try {
      // Placeholder: invoke coding agent and stream response
      // In production, this spawns the agent and streams its output
      for await (const chunk of agentStream(messages)) {
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      // If headers already sent, write error inline
      if (res.headersSent) {
        res.write('\n\n[Error: Agent connection failed]');
        res.end();
      } else {
        res.status(500).json({ error: 'Agent connection failed' });
      }
    }
  });

  return router;
}
```

### Pattern 2: useChat with Text Stream Protocol

**What:** Frontend chat hook consuming manual SSE backend
**When to use:** Chat panel with streaming state management

```typescript
// packages/frontend/src/hooks/useChatStream.ts
import { useChat } from '@ai-sdk/react';
import { useAppStore } from '../store/index.js';

export function useChatStream() {
  const activeFeature = useAppStore((s) => s.activeFeature);

  const chat = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    body: { featureId: activeFeature?.id },
    onError: (error) => {
      console.error('[chat] Stream error:', error);
    },
    onFinish: (options) => {
      // Persist completed assistant message to backend
      // options contains the completed message
    },
  });

  // v6 API: status replaces isLoading
  // status: 'submitted' | 'streaming' | 'ready' | 'error'
  const isProcessing = chat.status === 'submitted' || chat.status === 'streaming';

  return {
    ...chat,
    isProcessing,
  };
}
```

### Pattern 3: Zustand Editor Tab Slice

**What:** Ephemeral frontend state for document tabs
**When to use:** Per D-10, editor tab state in Zustand only

```typescript
// Extension to packages/frontend/src/store/index.ts
interface EditorTab {
  id: string;        // filePath as unique key
  filePath: string;
  displayName: string;
  content: string;
  lastLoadedAt: number;
}

interface EditorSlice {
  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (filePath: string, content: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
}
```

### Pattern 4: WebSocket File Event Dispatch to Editor Tabs

**What:** Extending existing useWebSocket to drive editor live-reload
**When to use:** Connecting Phase 1 filesystem events to Phase 2 document viewer

```typescript
// In useWebSocket.ts onmessage handler
if (message.channel === 'filesystem') {
  const { type, path } = message.payload;
  const store = useAppStore.getState();

  if (type === 'changed' && 'content' in message.payload) {
    // Update tab content if this file is open
    const tab = store.tabs.find(t => t.filePath === path);
    if (tab) {
      store.updateTabContent(tab.id, message.payload.content);
    }
  }

  if (type === 'created' && 'content' in message.payload) {
    // Auto-open tab for new artifact in active feature directory
    const feature = store.activeFeature;
    if (feature && path.startsWith(`specs/${feature.directory}/`)) {
      store.openTab(path, message.payload.content);
    }
  }

  if (type === 'deleted') {
    // Close tab if file was deleted
    const tab = store.tabs.find(t => t.filePath === path);
    if (tab) {
      store.closeTab(tab.id);
    }
  }
}
```

### Pattern 5: Artifact Link Detection in Chat Messages

**What:** Regex-based detection of spec artifact references in message text
**When to use:** Rendering chat messages with clickable file links

```typescript
// packages/frontend/src/components/chat/ChatMessage.tsx
const ARTIFACT_PATTERN = /\b(?:specs\/[\w-]+\/)?(spec|plan|tasks|research|data-model|quickstart|clarifications|contracts\/api)\.md\b/g;

function renderMessageWithLinks(text: string, onArtifactClick: (path: string) => void) {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(ARTIFACT_PATTERN)) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const filename = match[0];
    parts.push(
      <button
        key={match.index}
        onClick={() => onArtifactClick(filename)}
        className="text-blue-600 hover:underline font-medium"
      >
        {filename}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
```

### Pattern 6: react-markdown Document Renderer

**What:** Read-only markdown rendering with GFM support
**When to use:** Document viewer tab content

```typescript
// packages/frontend/src/components/docs/MarkdownViewer.tsx
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="prose prose-zinc max-w-none p-6">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </Markdown>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Do NOT import `ai` package on the backend:** Per D-01/D-03, backend has zero AI SDK dependencies. Manual SSE only.
- **Do NOT use TipTap for Phase 2:** Per D-04/D-06, the document viewer is read-only. TipTap's ProseMirror infrastructure is unnecessary overhead. Use react-markdown.
- **Do NOT persist tab state to SQLite:** Per D-10, tab state is ephemeral Zustand. Tabs are reconstructed from filesystem state on reconnect.
- **Do NOT persist system/event messages:** Per D-08, only user and assistant role messages are persisted.
- **Do NOT use the `data` stream protocol:** Per D-01, use `streamProtocol: 'text'` which expects plain text chunks, not structured SSE JSON events.
- **Do NOT use `isLoading` from useChat:** AI SDK v6 removed `isLoading`. Use `status` field instead (`submitted`, `streaming`, `ready`, `error`).
- **Do NOT use `handleSubmit()` or `reload()`:** AI SDK v6 uses `sendMessage()` and `regenerate()`.
- **Do NOT send full conversation history from frontend on every request:** The text stream protocol with manual SSE is stateless per-request. The backend should receive the latest user message and feature context. Chat history reconstruction for agent context happens server-side from the database.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat streaming state | Custom useState + EventSource + manual status tracking | `@ai-sdk/react` useChat | useChat handles message list, streaming status, abort, regenerate, error recovery. Reimplementing takes 200+ lines and gets edge cases wrong (partial messages, abort races, status transitions). |
| Markdown rendering | Custom parser or TipTap for read-only | `react-markdown` + `remark-gfm` | react-markdown converts markdown to React components using unified/remark pipeline. Supports custom components for every node type. Zero XSS risk (no dangerouslySetInnerHTML). |
| GFM tables/checkboxes | Custom table HTML or checkbox rendering | `remark-gfm` plugin | Adds table, task list, strikethrough, autolink support in one plugin import. Battle-tested against the GFM spec. |
| Code syntax highlighting | Custom tokenizer or highlight.js integration | `rehype-highlight` | Plugs into react-markdown's rehype pipeline. Uses highlight.js under the hood with auto-language detection. Just add a CSS theme. |
| Cursor-based pagination | Custom cursor encoding/decoding | Composite cursor `createdAt\|id` | Simple string cursor with timestamp + ID for tie-breaking. Stateless -- each request carries its own position. |

**Key insight:** Phase 2 is primarily an integration phase -- wiring proven libraries to the Phase 1 infrastructure. The value is in correct integration, not custom implementations.

## Common Pitfalls

### Pitfall 1: AI SDK v6 API Mismatch

**What goes wrong:** Code uses v4/v5 API (isLoading, handleSubmit, reload, content string) and fails at runtime.
**Why it happens:** The spec's research.md was written referencing older AI SDK versions. AI SDK v6 shipped a completely new API.
**How to avoid:** Use v6 API exclusively: `status` instead of `isLoading`, `sendMessage()` instead of `handleSubmit()`, `regenerate()` instead of `reload()`, `message.parts` instead of `message.content`.
**Warning signs:** TypeScript errors about missing `isLoading` property; messages rendering as `undefined` instead of text.

### Pitfall 2: Text Stream Protocol Message Format

**What goes wrong:** useChat creates messages but the text content appears in the wrong place or messages have empty parts.
**Why it happens:** With `streamProtocol: 'text'`, the frontend receives raw text chunks. AI SDK v6 converts these into UIMessage objects with `parts: [{ type: 'text', text: '...' }]`. If the backend sends structured JSON instead of plain text, the text appears as literal JSON strings.
**How to avoid:** Backend MUST send plain text only via `res.write(textChunk)`. No JSON wrapping, no SSE `data:` prefix when using text protocol. Set `Content-Type: text/plain; charset=utf-8`.
**Warning signs:** Chat messages show `{"type":"text","content":"..."}` as literal text instead of rendered content.

### Pitfall 3: SSE Proxy Buffering

**What goes wrong:** Streaming appears to work in development but chunks arrive in batches instead of progressively.
**Why it happens:** Vite's proxy (or nginx in production) buffers the response body.
**How to avoid:** Set `X-Accel-Buffering: no` header on SSE responses. In Vite proxy config, the existing `/api` proxy should pass through streaming responses naturally, but test this explicitly.
**Warning signs:** All text appears at once instead of streaming progressively.

### Pitfall 4: Scroll Position Loss on Live-Reload

**What goes wrong:** When a document updates via WebSocket, the viewer jumps to the top.
**Why it happens:** Replacing the content prop in react-markdown causes a full re-render, losing scroll position.
**How to avoid:** Capture `scrollTop` of the container before content update, restore it after the React render cycle completes (using `useLayoutEffect` or `requestAnimationFrame`).
**Warning signs:** Document jumps to top every time an agent modifies the file.

### Pitfall 5: Race Between Tab Open and Content Load

**What goes wrong:** A tab opens from a WebSocket `created` event but shows empty content, or the same tab opens twice.
**Why it happens:** The `created` event arrives before the file content is fully flushed, or the event fires twice due to chokidar's debounce behavior.
**How to avoid:** Use the `content` field already included in `created` events (Phase 1 watcher reads file content). For deduplication, always check if a tab with the same `filePath` already exists before opening.
**Warning signs:** Empty tabs, duplicate tabs for the same file.

### Pitfall 6: Chat History Load Order

**What goes wrong:** Messages appear in reverse chronological order in the UI after loading from backend.
**Why it happens:** The pagination API returns newest-first (for cursor efficiency) but the UI needs oldest-first display.
**How to avoid:** Reverse the messages array after fetching from the backend before setting into useChat's state via `setMessages()`.
**Warning signs:** Most recent messages appear at the top instead of the bottom.

### Pitfall 7: useChat + Custom Persistence Conflict

**What goes wrong:** Messages are duplicated or lost when combining useChat's internal state with backend persistence.
**Why it happens:** useChat manages its own message array internally. If you persist messages to the backend AND load them back on page reload, you need to seed useChat's initial state correctly.
**How to avoid:** On mount, load messages from backend via GET /api/chat/messages, convert to UIMessage format, and pass as `messages` option to useChat (or use `setMessages()` after initialization). On message completion, persist to backend via POST /api/chat/messages.
**Warning signs:** Messages appear twice after refresh; messages disappear on refresh.

### Pitfall 8: Tailwind Prose Styling Conflicts

**What goes wrong:** react-markdown output looks unstyled or has conflicting styles with Tailwind's reset.
**Why it happens:** Tailwind's preflight reset removes default heading/list/table styles. The `prose` class from `@tailwindcss/typography` restores them, but it must be applied.
**How to avoid:** Install `@tailwindcss/typography` plugin and wrap markdown content in a `prose` class container. Use `max-w-none` to prevent width constraints.
**Warning signs:** Headings look like plain text, lists have no bullets, tables have no borders.

## Code Examples

### Express SSE Endpoint (Manual, per D-01)

```typescript
// Source: AI SDK docs + Express SSE pattern
// packages/backend/src/api/chat.ts

router.post('/', async (req: Request, res: Response) => {
  const { messages, featureId } = req.body;

  // Headers for text streaming (compatible with useChat streamProtocol: 'text')
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    // Phase 2 placeholder: echo agent that simulates streaming
    // In future phases, this invokes a real coding agent
    const userMessage = messages[messages.length - 1]?.content ?? '';
    const response = `I received your message: "${userMessage}"\n\nThis is a placeholder response. Agent integration will be completed in a future phase.`;

    // Simulate streaming by chunking the response
    for (const char of response) {
      res.write(char);
      // Small delay to demonstrate streaming (remove in production)
    }
    res.end();
  } catch (err: any) {
    if (res.headersSent) {
      res.write('\n\n[Error: ' + (err.message || 'Unknown error') + ']');
      res.end();
    } else {
      res.status(500).json({ error: err.message || 'Agent error' });
    }
  }
});
```

### Chat Persistence Service

```typescript
// packages/backend/src/services/chat.ts
import { desc, eq, and, lt, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { chatMessages } from '../db/schema.js';
import type { AppDatabase } from '../db/client.js';
import type { ChatMessage } from '@specflow/shared';

export class ChatService {
  constructor(private db: AppDatabase) {}

  getMessages(featureId: string, before?: string, limit = 50): {
    messages: ChatMessage[];
    nextCursor: string | null;
    hasMore: boolean;
  } {
    const safeLimit = Math.min(limit, 100);

    let query = this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.featureId, featureId))
      .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
      .limit(safeLimit + 1); // Fetch one extra to check hasMore

    // Apply cursor if provided
    if (before) {
      const [cursorTime, cursorId] = before.split('|');
      query = this.db
        .select()
        .from(chatMessages)
        .where(and(
          eq(chatMessages.featureId, featureId),
          or(
            lt(chatMessages.createdAt, cursorTime),
            and(eq(chatMessages.createdAt, cursorTime), lt(chatMessages.id, cursorId))
          )
        ))
        .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
        .limit(safeLimit + 1);
    }

    const rows = query.all();
    const hasMore = rows.length > safeLimit;
    const messages = rows.slice(0, safeLimit);
    const nextCursor = hasMore && messages.length > 0
      ? `${messages[messages.length - 1].createdAt}|${messages[messages.length - 1].id}`
      : null;

    return { messages, nextCursor, hasMore };
  }

  saveMessage(featureId: string, role: string, content: string, metadata?: string | null): ChatMessage {
    const id = nanoid();
    const createdAt = new Date().toISOString();
    this.db.insert(chatMessages).values({
      id, featureId, role, content, metadata: metadata ?? null, createdAt,
    }).run();
    return { id, featureId, role, content, metadata: metadata ?? null, createdAt };
  }
}
```

### useChat Integration (v6 API)

```typescript
// packages/frontend/src/hooks/useChatStream.ts
import { useChat } from '@ai-sdk/react';
import { useAppStore } from '../store/index.js';
import { useCallback, useEffect } from 'react';

export function useChatStream() {
  const activeFeature = useAppStore((s) => s.activeFeature);

  const chat = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    body: { featureId: activeFeature?.id },
    onError: (error) => {
      console.error('[chat] Error:', error.message);
    },
  });

  // v6: status replaces isLoading
  const isProcessing = chat.status === 'submitted' || chat.status === 'streaming';
  const isError = chat.status === 'error';

  // Load persisted messages on feature change
  useEffect(() => {
    if (!activeFeature?.id) {
      chat.setMessages([]);
      return;
    }
    fetch(`/api/chat/messages?featureId=${activeFeature.id}&limit=50`)
      .then(r => r.json())
      .then(data => {
        // Convert backend messages to UIMessage format
        // Messages come newest-first, reverse for display
        const uiMessages = data.messages.reverse().map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          parts: [{ type: 'text' as const, text: msg.content }],
        }));
        chat.setMessages(uiMessages);
      })
      .catch(err => console.error('[chat] Failed to load history:', err));
  }, [activeFeature?.id]);

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    isProcessing,
    isError,
    sendMessage: chat.sendMessage,
    regenerate: chat.regenerate,
    stop: chat.stop,
    setMessages: chat.setMessages,
  };
}
```

### Pagination Index SQL

```sql
-- Add to packages/backend/src/db/client.ts in the sqlite.exec() block
CREATE INDEX IF NOT EXISTS idx_chat_messages_feature_cursor
  ON chat_messages(feature_id, created_at DESC, id DESC);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI SDK v4 `isLoading` boolean | AI SDK v6 `status` field with 4 states | AI SDK v5->v6 (2025-2026) | Must use `status === 'submitted' \|\| status === 'streaming'` instead of `isLoading` |
| AI SDK v4 `messages[].content` string | AI SDK v6 `messages[].parts[]` array | AI SDK v5->v6 | Must iterate `.parts` to extract text: `part.type === 'text' ? part.text : null` |
| AI SDK v4 `handleSubmit()` | AI SDK v6 `sendMessage()` | AI SDK v5->v6 | Different API signature: `sendMessage({ text: 'msg' })` |
| AI SDK v4 `reload()` | AI SDK v6 `regenerate()` | AI SDK v5->v6 | Same behavior, renamed method |
| Manual EventSource | useChat with streamProtocol: 'text' | AI SDK v5+ | useChat handles the SSE/text stream parsing internally |
| TipTap 2.x | TipTap 3.x (now at 3.20.5) | 2025 | Major version bump -- peer deps changed. NOT needed for Phase 2 (read-only uses react-markdown). |

**Deprecated/outdated from spec research.md:**
- R2 (TipTap for editor): Deferred per D-04. Phase 2 uses react-markdown for read-only.
- R6 (Diff View): Deferred per D-04/D-05. No diff in Phase 2.
- R7 (Input Lock using isLoading): `isLoading` no longer exists in AI SDK v6. Use `status` field.
- R8 (Retry using reload()): `reload()` renamed to `regenerate()` in v6.

## Open Questions

1. **Tailwind Typography Plugin** (RESOLVED)
   - @tailwindcss/typography v0.5.19 explicitly supports Tailwind 4 (peerDep: `>=4.0.0-beta.1`).
   - Install via `npm install @tailwindcss/typography` in frontend package.
   - In Tailwind 4 CSS-first config, add `@plugin "@tailwindcss/typography"` to index.css after `@import "tailwindcss"`.
   - Wrap react-markdown output in `<div className="prose prose-zinc max-w-none">`.

2. **useChat v6 Message Seeding**
   - What we know: `setMessages()` can update the message array. Initial `messages` option in useChat config sets starting state.
   - What's unclear: Whether `setMessages()` called in useEffect properly reconciles with useChat's internal state when a stream is already in progress.
   - Recommendation: Seed messages via the `messages` config option on first render. Use `setMessages()` only when the active feature changes. Ensure feature change cancels any in-progress stream first via `stop()`.

3. **Text Stream Protocol + Message Persistence Timing**
   - What we know: With `streamProtocol: 'text'`, the completed message is available in `onFinish`. User messages should be persisted on send.
   - What's unclear: Exact timing of `onFinish` callback relative to the last text chunk -- is the full assembled text available?
   - Recommendation: Persist user messages immediately on `sendMessage()`. Persist assistant messages in `onFinish` callback. If `onFinish` does not provide full text, reconstruct from the messages array.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | Yes | 20+ (LTS) | -- |
| npm | Package management | Yes | 10+ | -- |
| SQLite (better-sqlite3) | Chat persistence | Yes | Already installed | -- |
| WebSocket (ws) | Live-reload | Yes | Already installed | -- |
| Express | HTTP + SSE | Yes | Already installed (^5.2.1) | -- |

**Missing dependencies with no fallback:** None -- all infrastructure from Phase 1 is available.

**Missing dependencies with fallback:** None.

## Project Constraints (from CLAUDE.md)

- **Tech stack**: React + TypeScript + Vite frontend, Node.js + TypeScript + Express backend, TipTap editor, Tailwind CSS, SQLite, WebSocket
  - NOTE: CLAUDE.md lists TipTap, but CONTEXT.md D-04/D-06 defer TipTap to a future editing phase. react-markdown is used for Phase 2 read-only rendering.
- **Orchestration only**: MUST call coding agents via AI SDK providers. Phase 2 wires the chat endpoint with a placeholder agent. Real agent integration is part of the streaming infrastructure but the actual agent provider is a later concern.
- **File-system truth**: Document viewer content sourced from filesystem via WebSocket events + GET /api/files/read. Tab state not persisted.
- **Document-centric**: Docs view renders spec artifacts, not source code.
- **Single feature**: Chat scoped to active feature. One agent session at a time.
- **AI SDK streaming**: Frontend uses `useChat()` from `@ai-sdk/react`. Backend uses manual SSE per D-01.
- **Express 5 patterns**: Use `{id}` path params (not `:id`). Async error handling built-in.
- **ESM-only**: All packages use `"type": "module"` and ESM imports.
- **Zustand with persist**: Only `activeView` persisted to localStorage. Tab state NOT persisted.
- **WebSocket envelope pattern**: Discriminated union by `channel` field. Reuse `filesystem` channel for live-reload.

## Sources

### Primary (HIGH confidence)
- [AI SDK v6 useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - v6 API: status, sendMessage, regenerate, UIMessage parts
- [AI SDK Stream Protocols](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) - Text stream protocol spec, data stream SSE format
- [AI SDK Express cookbook](https://ai-sdk.dev/cookbook/api-servers/express) - pipeUIMessageStreamToResponse, pipeTextStreamToResponse patterns
- [AI SDK Transport docs](https://ai-sdk.dev/docs/ai-sdk-ui/transport) - Custom transport, DefaultChatTransport
- [AI SDK Chatbot guide](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) - useChat v6 usage patterns, UIMessage format
- npm registry (`npm view`) - Verified versions: ai@6.0.138, @ai-sdk/react@3.0.140, react-markdown@10.1.0, remark-gfm@4.0.1, rehype-highlight@7.0.2
- Existing codebase (Phase 1) - All files read directly from packages/backend/src/, packages/frontend/src/, packages/shared/src/

### Secondary (MEDIUM confidence)
- [GitHub Discussion #492](https://github.com/vercel/ai/discussions/492) - Express + useChat integration patterns, streamProtocol: 'text' workaround
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) - Component props, remark-gfm integration
- [Strapi React Markdown Guide](https://strapi.io/blog/react-markdown-complete-guide-security-styling) - Styling with Tailwind, rehype-highlight setup

### Tertiary (LOW confidence)
- @tailwindcss/typography v0.5.19 - Verified compatible with Tailwind 4 (peerDep includes >=4.0.0-beta.1). Promoted to MEDIUM confidence.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All package versions verified via npm registry. AI SDK v6 API confirmed via official docs. react-markdown + remark-gfm well-established.
- Architecture: HIGH - Patterns follow existing Phase 1 conventions (Express routes, Zustand store, WebSocket dispatch). Integration points clearly defined.
- Pitfalls: HIGH - AI SDK v6 breaking changes confirmed via official docs. SSE buffering, scroll preservation, and message ordering are well-known issues.
- Discretion choices: MEDIUM - react-markdown recommendation over TipTap is well-reasoned (lighter, no serialization concerns, future TipTap for editing) but rendering quality comparison not empirically tested.

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (AI SDK iterates fast but v6 API is stable)

# Phase 2: Chat + Document Editor - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-03-25
**Phase:** 02-chat-document-editor
**Mode:** assumptions
**Areas analyzed:** AI SDK Integration, TipTap Markdown Serialization, Editor State Management, Chat Persistence

## Assumptions Presented

### AI SDK Integration Approach
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Use AI SDK on both frontend (useChat) and backend (streamText) over HTTP SSE, separate from WebSocket | Likely | packages/backend/src/ws/hub.ts is broadcast-only, vite.config.ts proxies /api |

### TipTap Markdown Serialization
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Use tiptap-markdown for bidirectional md↔ProseMirror conversion, content updates via existing WebSocket filesystem channel | Likely | packages/backend/src/watcher/file-watcher.ts sends full content, useWebSocket.ts receives events |

### Editor State Management
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Editor tabs in Zustand as ephemeral state, not persisted to SQLite | Confident | packages/frontend/src/store/index.ts uses persist with partialize, data-model.md marks EditorTab as Zustand-only |

### Chat Persistence
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Use existing chat_messages table as-is, only add pagination index | Likely | packages/backend/src/db/schema.ts lines 43-50 have all fields, data-model.md says no migration |

## Corrections Made

### AI SDK Integration Approach
- **Original assumption:** Use AI SDK on both frontend and backend (streamText + useChat)
- **User correction:** Manual SSE on backend (~30 lines, zero dependency risk). AI SDK frontend-only if it simplifies state management. Don't couple backend to AI SDK. Express 5 and AI SDK's Web API Response are a known mismatch.
- **Reason:** "The AI SDK's streamText() returns a Web API Response object. Express 5 still uses Node res. This isn't a 'likely compatible' situation — it's a known mismatch."

### TipTap Markdown Serialization
- **Original assumption:** Use tiptap-markdown for bidirectional serialization
- **User correction:** Phase 2 is read-only only. No editing, no save, no round-trip risk. Consider react-markdown instead of TipTap for read-only rendering. Editing deferred to future phase with proper round-trip tests.
- **Reason:** "spec-kit artifacts use specific markdown patterns like [NEEDS CLARIFICATION] markers, task syntax, priority tags. If tiptap-markdown silently mangles these on a save round-trip, we corrupt the source of truth."

### Chat Persistence
- **Original assumption:** Persist all messages including system events
- **User correction:** Only persist human↔AI conversation thread (user + assistant roles). Don't persist system event messages (agent started, task done, commit) — ephemeral and reconstructible.
- **Reason:** "Don't persist the event log. Only persist the human↔AI conversation thread."

## External Research

### Resolved by corrections
- AI SDK + Express 5 compatibility → resolved: manual SSE, no AI SDK backend dependency
- tiptap-markdown round-trip fidelity → resolved: read-only renderer, no serialization risk

### Still needed
- AI SDK useChat() hydration with persisted messages (initialMessages format)

### Deferred
- TipTap search extension availability → deferred to future editing phase

---

*Phase: 02-chat-document-editor*
*Discussion logged: 2026-03-25*

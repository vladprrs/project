# Data Model: Chat + Document Editor

**Feature**: 002-chat-doc-editor
**Date**: 2026-03-25

## Existing Entities (from Phase 1 — no changes needed)

### chat_messages (SQLite table — already exists)

| Field      | Type    | Constraints                          | Notes                                      |
|------------|---------|--------------------------------------|--------------------------------------------|
| id         | TEXT    | PRIMARY KEY                          | nanoid generated                           |
| feature_id | TEXT    | NOT NULL, FK → features(id)          | Scopes messages to a feature               |
| role       | TEXT    | NOT NULL                             | 'user' \| 'assistant' \| 'system'         |
| content    | TEXT    | NOT NULL                             | Message text (may contain artifact refs)   |
| metadata   | TEXT    | nullable                             | JSON string for structured data            |
| created_at | TEXT    | NOT NULL                             | ISO 8601 timestamp, used as cursor basis   |

**No schema migration required.** The table was created in Phase 1 with exactly the fields needed for Phase 2 chat persistence.

### features (SQLite table — no changes)

Used to scope chat messages and resolve the active feature for the chat endpoint.

## New Entities (frontend-only state — not persisted to database)

### EditorTab (Zustand store)

| Field         | Type                       | Notes                                                |
|---------------|----------------------------|------------------------------------------------------|
| id            | string                     | File path serves as unique ID (one tab per file)     |
| filePath      | string                     | Relative path from project root (e.g., `specs/002-chat-doc-editor/spec.md`) |
| displayName   | string                     | Derived from filename (e.g., `spec.md`)              |
| content       | string                     | Current markdown content (from file or local edits)  |
| mode          | 'readonly' \| 'edit'       | Default: 'readonly'                                  |
| isDirty       | boolean                    | True when local edits differ from last saved/loaded   |
| lastLoadedAt  | number                     | Timestamp of last content load from filesystem event  |

**Identity**: `filePath` is the unique key. Opening the same file twice focuses the existing tab.

**Lifecycle**: Created on file open (manual or auto-open from file creation event). Destroyed on tab close. Content updates on filesystem `changed` events (if read-only) or manual save (if edit mode).

### DiffSnapshot (in-memory, per chat command)

| Field       | Type                        | Notes                                                |
|-------------|-----------------------------|------------------------------------------------------|
| commandId   | string                      | ID of the chat message that triggered the command    |
| snapshots   | Map<string, string>         | filePath → content at time of command submission     |
| capturedAt  | number                      | Timestamp when snapshots were taken                  |

**Identity**: `commandId` — one snapshot set per chat command submission.

**Lifecycle**: Created when user submits a chat message. Consumed when the agent completes and a diff is requested. Discarded when the user dismisses the diff view or submits a new command.

### ArtifactLink (derived, not stored)

| Field       | Type    | Notes                                              |
|-------------|---------|----------------------------------------------------|
| text        | string  | Matched text in the chat message (e.g., "spec.md") |
| filePath    | string  | Resolved path relative to active feature directory  |
| startIndex  | number  | Character offset in message content                 |
| endIndex    | number  | Character offset end                                |

**Identity**: Derived per message render via regex. Not stored — computed on each render from message content.

## Metadata JSON Schema

The `metadata` column in `chat_messages` stores a JSON string. For assistant messages, the structure is:

```json
{
  "stage": "specify",
  "status": "complete",
  "artifactPaths": ["specs/002-chat-doc-editor/spec.md"],
  "isPartial": false,
  "error": null
}
```

| Field          | Type             | Required | Notes                                    |
|----------------|------------------|----------|------------------------------------------|
| stage          | string \| null   | No       | Pipeline stage this message relates to   |
| status         | string \| null   | No       | 'streaming' \| 'complete' \| 'error' \| 'interrupted' |
| artifactPaths  | string[] \| null | No       | Paths to artifacts created/modified      |
| isPartial      | boolean          | No       | True if response was interrupted         |
| error          | string \| null   | No       | Error message if status is 'error'       |

## State Transitions

### Editor Tab Mode

```
[tab opened] → readonly
                   ↓ (user clicks edit toggle)
                 edit
                   ↓ (user clicks edit toggle with no unsaved changes)
                 readonly
                   ↓ (user clicks edit toggle with unsaved changes)
                 [prompt: save or discard] → readonly (after user choice)
```

### Chat Message Status (assistant messages)

```
[message created] → streaming
                       ↓ (all tokens received)
                     complete
                       ↓ (connection lost mid-stream)
                     interrupted (partial content preserved, retry available)
                       ↓ (agent returns error)
                     error (error message displayed)
```

### Diff View Lifecycle

```
[user submits chat command] → snapshot captured (pre-command file content)
                                 ↓ (agent completes, file updated)
                               diff computed (snapshot vs new content)
                                 ↓ (diff decorations rendered in editor)
                               diff visible
                                 ↓ (user dismisses or new command submitted)
                               diff cleared, snapshot discarded
```

## Relationships

```
Feature (1) ──< (many) ChatMessage     [scoped by feature_id]
Feature (1) ──< (many) EditorTab       [scoped by active feature's directory]
ChatMessage (1) ──< (1) DiffSnapshot   [linked by commandId = message.id]
EditorTab (1) ──< (many) ArtifactLink  [derived from chat messages referencing tab's file]
```

## Indexes (existing — no new indexes needed)

The `chat_messages` table would benefit from a composite index on `(feature_id, created_at)` for cursor-based pagination queries. This should be added as a `CREATE INDEX IF NOT EXISTS` alongside the existing table creation:

```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_feature_cursor
  ON chat_messages(feature_id, created_at DESC, id DESC);
```

This supports the query pattern: `SELECT * FROM chat_messages WHERE feature_id = ? AND (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?`

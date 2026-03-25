# API Contracts: Chat + Document Editor

**Feature**: 002-chat-doc-editor
**Date**: 2026-03-25

## HTTP Endpoints

### POST /api/chat

Chat streaming endpoint. Accepts a user message and streams an AI response using the AI SDK streaming protocol.

**Request**:
```json
{
  "messages": [
    { "role": "user", "content": "specify a user authentication feature" },
    { "role": "assistant", "content": "..." }
  ],
  "featureId": "abc123"
}
```

| Field     | Type            | Required | Notes                                          |
|-----------|-----------------|----------|-------------------------------------------------|
| messages  | ChatMessage[]   | Yes      | Full conversation history (AI SDK format)       |
| featureId | string          | Yes      | Active feature ID for scoping                   |

**Response**: AI SDK streaming response (ReadableStream with Server-Sent Events).

The response follows the Vercel AI SDK Data Stream Protocol. Each SSE event contains a type prefix:
- `0:` — text token
- `e:` — error
- `d:` — done signal with metadata

**Error Responses**:

| Status | Body                                                    | When                                      |
|--------|--------------------------------------------------------|-------------------------------------------|
| 400    | `{ "error": "featureId is required" }`                 | Missing featureId                          |
| 400    | `{ "error": "messages array is required" }`            | Missing or empty messages                  |
| 404    | `{ "error": "Feature not found or not active" }`       | featureId doesn't match active feature     |
| 500    | `{ "error": "Agent connection failed: <detail>" }`     | Agent provider cannot be reached           |

---

### GET /api/chat/messages

Retrieve persisted chat messages for a feature with cursor-based pagination.

**Query Parameters**:

| Param     | Type   | Required | Default | Notes                                            |
|-----------|--------|----------|---------|--------------------------------------------------|
| featureId | string | Yes      | —       | Feature to load messages for                     |
| before    | string | No       | —       | Cursor: `createdAt|id` (e.g., `2026-03-25T10:00:00.000Z|abc123`) |
| limit     | number | No       | 50      | Max messages to return (capped at 100)           |

**Response**:
```json
{
  "messages": [
    {
      "id": "msg_abc123",
      "featureId": "feat_xyz",
      "role": "user",
      "content": "specify a user auth feature",
      "metadata": null,
      "createdAt": "2026-03-25T10:00:00.000Z"
    },
    {
      "id": "msg_def456",
      "featureId": "feat_xyz",
      "role": "assistant",
      "content": "I'll generate a spec for user authentication...",
      "metadata": "{\"stage\":\"specify\",\"status\":\"complete\",\"artifactPaths\":[\"specs/002-chat-doc-editor/spec.md\"]}",
      "createdAt": "2026-03-25T10:00:01.000Z"
    }
  ],
  "nextCursor": "2026-03-25T09:55:00.000Z|msg_prev789",
  "hasMore": true
}
```

| Field      | Type           | Notes                                                      |
|------------|----------------|------------------------------------------------------------|
| messages   | ChatMessage[]  | Ordered newest-first (caller reverses for display)          |
| nextCursor | string \| null | Cursor for the next page, null if no more messages          |
| hasMore    | boolean        | Whether more messages exist before the cursor               |

**Error Responses**:

| Status | Body                                    | When                 |
|--------|----------------------------------------|----------------------|
| 400    | `{ "error": "featureId is required" }` | Missing featureId    |

---

### POST /api/chat/messages

Persist a single chat message (used to save user messages and completed assistant messages).

**Request**:
```json
{
  "featureId": "feat_xyz",
  "role": "user",
  "content": "specify a user auth feature",
  "metadata": null
}
```

**Response**:
```json
{
  "message": {
    "id": "msg_abc123",
    "featureId": "feat_xyz",
    "role": "user",
    "content": "specify a user auth feature",
    "metadata": null,
    "createdAt": "2026-03-25T10:00:00.000Z"
  }
}
```

**Error Responses**:

| Status | Body                                        | When                     |
|--------|---------------------------------------------|--------------------------|
| 400    | `{ "error": "featureId is required" }`      | Missing required fields  |
| 400    | `{ "error": "content is required" }`        | Missing content          |
| 400    | `{ "error": "role must be user, assistant, or system" }` | Invalid role |

---

### POST /api/files/save

Save editor content back to a file on disk (manual save from edit mode).

**Request**:
```json
{
  "filePath": "specs/002-chat-doc-editor/spec.md",
  "content": "# Feature Specification: ...\n\n..."
}
```

| Field    | Type   | Required | Notes                                            |
|----------|--------|----------|--------------------------------------------------|
| filePath | string | Yes      | Relative path from project root                  |
| content  | string | Yes      | Full file content to write                       |

**Response**:
```json
{
  "saved": true,
  "path": "specs/002-chat-doc-editor/spec.md"
}
```

**Error Responses**:

| Status | Body                                          | When                              |
|--------|----------------------------------------------|-----------------------------------|
| 400    | `{ "error": "filePath is required" }`        | Missing filePath                  |
| 400    | `{ "error": "Path must be within specs/" }`  | Attempting to write outside specs |
| 500    | `{ "error": "Failed to write file: <msg>" }` | Filesystem error                  |

**Security**: The endpoint MUST validate that `filePath` resolves to within the `specs/` directory. Path traversal attacks (e.g., `../../../etc/passwd`) MUST be rejected.

---

### GET /api/files/read

Read a spec artifact file from disk.

**Query Parameters**:

| Param    | Type   | Required | Notes                              |
|----------|--------|----------|------------------------------------|
| filePath | string | Yes      | Relative path from project root    |

**Response**:
```json
{
  "content": "# Feature Specification: ...\n\n...",
  "path": "specs/002-chat-doc-editor/spec.md"
}
```

**Error Responses**:

| Status | Body                                          | When                              |
|--------|----------------------------------------------|-----------------------------------|
| 400    | `{ "error": "filePath is required" }`        | Missing filePath                  |
| 400    | `{ "error": "Path must be within specs/" }`  | Attempting to read outside specs  |
| 404    | `{ "error": "File not found" }`              | File doesn't exist                |

---

## WebSocket Messages (extensions to existing Phase 1 protocol)

No new WebSocket channels are needed for Phase 2. The existing `filesystem` channel provides all the events the editor needs for live-reload:

- `{ channel: 'filesystem', payload: { type: 'created', path: '...', content: '...' } }` → auto-open tab
- `{ channel: 'filesystem', payload: { type: 'changed', path: '...', content: '...' } }` → live-reload content
- `{ channel: 'filesystem', payload: { type: 'deleted', path: '...' } }` → close tab + notify

The `snapshot` channel continues to provide active feature state on reconnection.

## Shared Types (additions to @specflow/shared)

### New types to add:

```typescript
// Chat API contracts
export interface ChatStreamRequest {
  messages: { role: ChatRole; content: string }[];
  featureId: string;
}

export interface GetChatMessagesRequest {
  featureId: string;
  before?: string;  // cursor
  limit?: number;
}

export interface GetChatMessagesResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SaveChatMessageRequest {
  featureId: string;
  role: ChatRole;
  content: string;
  metadata?: string | null;
}

export interface SaveChatMessageResponse {
  message: ChatMessage;
}

// File API contracts
export interface SaveFileRequest {
  filePath: string;
  content: string;
}

export interface SaveFileResponse {
  saved: boolean;
  path: string;
}

export interface ReadFileRequest {
  filePath: string;
}

export interface ReadFileResponse {
  content: string;
  path: string;
}
```

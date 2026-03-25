# API Contracts: SpecFlow IDE Foundation

## REST Endpoints

### Features

#### GET /api/features/active

Returns the currently active feature, or null if none.

**Response 200**:
```json
{
  "feature": {
    "id": "uuid",
    "name": "user-auth",
    "directory": "001-user-auth",
    "isActive": true,
    "createdAt": "2026-03-24T10:00:00Z",
    "activatedAt": "2026-03-24T10:05:00Z"
  }
}
```

**Response 200 (no active feature)**:
```json
{
  "feature": null
}
```

#### POST /api/features/activate

Set a feature as active. Fails if another feature is already active.

**Request**:
```json
{
  "name": "user-auth",
  "directory": "001-user-auth"
}
```

**Response 200**:
```json
{
  "feature": {
    "id": "uuid",
    "name": "user-auth",
    "directory": "001-user-auth",
    "isActive": true,
    "createdAt": "2026-03-24T10:00:00Z",
    "activatedAt": "2026-03-24T10:05:00Z"
  }
}
```

**Response 409 (conflict — another feature active)**:
```json
{
  "error": "Cannot activate 'user-auth': feature 'payments' is already active. Deactivate it first.",
  "activeFeature": "payments"
}
```

#### DELETE /api/features/active

Deactivate the currently active feature.

**Response 200**:
```json
{
  "deactivated": "user-auth"
}
```

**Response 404 (no active feature)**:
```json
{
  "error": "No active feature to deactivate"
}
```

## WebSocket Protocol

### Connection

- Endpoint: `ws://localhost:{PORT}/ws`
- Single connection per browser tab
- Server sends messages; client listens (Phase 1 is push-only)

### Message Envelope

Every message is a JSON object with a `channel` discriminant:

```json
{
  "channel": "filesystem",
  "payload": { ... }
}
```

### Filesystem Channel Events

#### File Created

```json
{
  "channel": "filesystem",
  "payload": {
    "type": "created",
    "path": "specs/001-user-auth/spec.md",
    "content": "# Feature Specification: User Auth\n..."
  }
}
```

#### File Changed

```json
{
  "channel": "filesystem",
  "payload": {
    "type": "changed",
    "path": "specs/001-user-auth/plan.md",
    "content": "# Implementation Plan: User Auth\n..."
  }
}
```

#### File Deleted

```json
{
  "channel": "filesystem",
  "payload": {
    "type": "deleted",
    "path": "specs/001-user-auth/old-file.md"
  }
}
```

### Connection Lifecycle

1. Client opens WebSocket to `/ws`
2. Server adds client to broadcast list
3. Server pushes filesystem events as they occur
4. On client disconnect: server removes from broadcast list
5. On client reconnect: client should request current state via REST (full reconciliation deferred to Phase 4)

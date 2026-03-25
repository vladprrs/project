# Data Model: SpecFlow IDE Foundation

## Entities

### Feature

The currently active spec-first feature being worked on.

| Field | Type | Constraints |
|-------|------|-------------|
| id | string (UUID) | Primary key |
| name | string | Unique, not null, e.g. "user-auth" |
| directory | string | Relative path under `specs/`, e.g. "001-user-auth" |
| is_active | boolean | Only one feature can be active at a time |
| created_at | datetime | Auto-set on creation |
| activated_at | datetime | Nullable, set when activated |

**Uniqueness**: Only one row may have `is_active = true` at any time. Enforced at the application layer (check-then-set with transaction).

### Pipeline State

Tracks the current workflow stage for a feature.

| Field | Type | Constraints |
|-------|------|-------------|
| id | string (UUID) | Primary key |
| feature_id | string | Foreign key → Feature.id, unique (one state per feature) |
| current_stage | enum | One of: specify, clarify, plan, tasks, implement, verify, ship |
| updated_at | datetime | Auto-updated on stage change |

**Stages**: specify → clarify → plan → tasks → implement → verify → ship
**Transitions**: Bidirectional — stages can move forward or backward (e.g., plan → clarify after rejection).

### Pipeline Transition History

Audit log of every stage change.

| Field | Type | Constraints |
|-------|------|-------------|
| id | string (UUID) | Primary key |
| feature_id | string | Foreign key → Feature.id |
| from_stage | enum | Stage before transition (nullable for initial) |
| to_stage | enum | Stage after transition |
| direction | enum | forward, backward |
| reason | string | Nullable, e.g. "User approved plan", "Rejected: change search approach" |
| created_at | datetime | Timestamp of transition |

### Task Card Cache

Parsed representation of tasks.md for quick querying by the kanban view.

| Field | Type | Constraints |
|-------|------|-------------|
| id | string (UUID) | Primary key |
| feature_id | string | Foreign key → Feature.id |
| task_id | string | Task ID from tasks.md, e.g. "T001" |
| phase | string | Phase name from tasks.md header |
| description | string | Task description text |
| status | enum | pending, in_progress, done |
| is_parallel | boolean | True if marked [P] in tasks.md |
| user_story | string | Nullable, e.g. "US1" from [US1] tag |
| file_paths | string | Nullable, comma-separated file paths mentioned |
| sort_order | integer | Order within phase for display |
| updated_at | datetime | Last sync from tasks.md |

**Lifecycle**: Entire table is rebuilt when tasks.md changes on disk. This is a cache — tasks.md is the source of truth.

### Chat Message

Per-feature chat conversation history.

| Field | Type | Constraints |
|-------|------|-------------|
| id | string (UUID) | Primary key |
| feature_id | string | Foreign key → Feature.id |
| role | enum | user, assistant, system |
| content | string | Message text content |
| metadata | string | Nullable JSON string for structured data (artifact refs, stage info) |
| created_at | datetime | Timestamp of message |

## Relationships

```
Feature 1──1 Pipeline State
Feature 1──* Pipeline Transition History
Feature 1──* Task Card Cache
Feature 1──* Chat Message
```

## WebSocket Message Types (Shared Package)

### Message Envelope

```
MessageEnvelope = { channel: "filesystem", payload: FileSystemEvent }
```

Phase 2 adds: `| { channel: "pipeline", payload: PipelineEvent }`
Phase 3 adds: `| { channel: "cli", payload: CliEvent }`

### FileSystemEvent

```
FileSystemEvent =
  | { type: "created", path: string, content: string }
  | { type: "changed", path: string, content: string }
  | { type: "deleted", path: string }
```

- `path` is relative to the project root (e.g., "specs/001-user-auth/spec.md")
- `content` is the full UTF-8 file content (always present for created/changed, omitted for deleted)

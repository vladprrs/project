# Architecture Research

**Domain:** Document-centric web IDE orchestrating external CLI tools
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```
                         SpecFlow IDE Architecture

 ┌──────────────────────── Browser (SPA) ──────────────────────────┐
 │                                                                  │
 │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
 │  │  Chat Panel   │  │  Doc Editor   │  │ Kanban Board  │          │
 │  │  (Messages +  │  │  (TipTap +    │  │ (tasks.md     │          │
 │  │   Commands)   │  │   Tabs)       │  │  parsed)      │          │
 │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
 │         │                 │                  │                   │
 │  ┌──────┴─────────────────┴──────────────────┴───────────────┐  │
 │  │                  Panel Layout Manager                      │  │
 │  │          (allotment / user-driven resize)                  │  │
 │  └──────────────────────┬────────────────────────────────────┘  │
 │                         │                                        │
 │  ┌──────────────────────┴────────────────────────────────────┐  │
 │  │              Zustand Store (Client State)                  │  │
 │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐           │  │
 │  │  │Pipeline│ │ Chat   │ │ Editor │ │  Kanban  │           │  │
 │  │  │ Stage  │ │Messages│ │ Tabs   │ │  Cards   │           │  │
 │  │  └────────┘ └────────┘ └────────┘ └──────────┘           │  │
 │  └──────────────────────┬────────────────────────────────────┘  │
 │                         │                                        │
 │  ┌──────────────────────┴────────────────────────────────────┐  │
 │  │            WebSocket Client + REST Client                  │  │
 │  └──────────────────────┬────────────────────────────────────┘  │
 └─────────────────────────┼────────────────────────────────────────┘
                           │ ws:// + http://
 ┌─────────────────────────┼────────────────────────────────────────┐
 │                    Express Server                                 │
 │                                                                   │
 │  ┌──────────────────────┴────────────────────────────────────┐   │
 │  │              WebSocket Hub (ws library)                    │   │
 │  │       Multiplexed channels: cli, fs, pipeline              │   │
 │  └────┬──────────────────┬──────────────────┬────────────────┘   │
 │       │                  │                  │                     │
 │  ┌────┴──────┐   ┌──────┴───────┐  ┌──────┴───────┐            │
 │  │ Process   │   │  File Watch  │  │  Pipeline    │            │
 │  │ Manager   │   │  Service     │  │  Controller  │            │
 │  │           │   │  (chokidar)  │  │              │            │
 │  │ spawn()   │   │              │  │  stage gate  │            │
 │  │ kill()    │   │  watch dirs  │  │  transitions │            │
 │  │ parse()   │   │  debounce    │  │  approvals   │            │
 │  └────┬──────┘   └──────┬───────┘  └──────┬───────┘            │
 │       │                 │                  │                     │
 │  ┌────┴──────────────────┴──────────────────┴────────────────┐   │
 │  │                  Service Layer                             │   │
 │  │  ┌──────────┐  ┌───────────┐  ┌──────────────┐           │   │
 │  │  │ Artifact │  │  Task     │  │  Feature     │           │   │
 │  │  │ Service  │  │  Service  │  │  Service     │           │   │
 │  │  │ (parse   │  │ (SQLite   │  │ (active      │           │   │
 │  │  │  md)     │  │  CRUD)    │  │  feature)    │           │   │
 │  │  └─────┬────┘  └─────┬────┘  └──────┬───────┘           │   │
 │  │        │              │              │                    │   │
 │  └────────┼──────────────┼──────────────┼────────────────────┘   │
 │           │              │              │                         │
 │  ┌────────┴──────┐ ┌────┴────┐  ┌──────┴───────┐                │
 │  │  Filesystem   │ │ SQLite  │  │ specs/<feat>/ │                │
 │  │  (artifacts)  │ │ (state) │  │ (source of   │                │
 │  │               │ │         │  │  truth)       │                │
 │  └───────────────┘ └─────────┘  └──────────────┘                │
 └──────────────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  CLI Tools  │
                    │  spec-kit   │
                    │  gsd        │
                    └─────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Chat Panel** | Display messages, accept commands, show structured CLI events | React component with message list + input, renders event types differently |
| **Doc Editor** | Render/edit spec artifacts in tabs, live-reload on changes | TipTap editor with markdown serialization, tab container |
| **Kanban Board** | Display tasks.md as cards grouped by phase/status | React component consuming parsed task state from store |
| **Panel Layout Manager** | User-driven resizable panel arrangement | allotment library for split panes |
| **Zustand Store** | Client-side state: pipeline stage, messages, tabs, kanban cards | Zustand with slices pattern |
| **WebSocket Hub** | Multiplex server events to client over single connection | ws library with channel-based message routing |
| **Process Manager** | Spawn CLI tools, parse output, emit structured events | Node.js child_process with line-by-line output parsing |
| **File Watch Service** | Detect artifact changes, notify clients | chokidar watching specs/<feature>/ directory |
| **Pipeline Controller** | Track workflow stage, enforce gates, trigger next stage | State machine with approval gate checks |
| **Artifact Service** | Parse markdown files into structured data | unified/remark for markdown AST, custom extractors |
| **Task Service** | CRUD for kanban task state derived from tasks.md | better-sqlite3 with simple queries |
| **Feature Service** | Track active feature, manage feature lifecycle | Single-feature state, feature directory resolution |

## Recommended Project Structure

```
specflow-ide/
├── packages/
│   └── shared/                    # Shared types between frontend and backend
│       ├── src/
│       │   ├── events.ts          # WebSocket event type definitions
│       │   ├── pipeline.ts        # Pipeline stage enum, gate definitions
│       │   └── models.ts          # Shared data models (Task, Artifact, etc.)
│       ├── package.json
│       └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── panels/                # Top-level panel components
│   │   │   ├── ChatPanel/
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── CommandInput.tsx
│   │   │   │   └── renderers/     # Per-event-type message renderers
│   │   │   ├── EditorPanel/
│   │   │   │   ├── EditorPanel.tsx
│   │   │   │   ├── EditorTabs.tsx
│   │   │   │   └── TipTapEditor.tsx
│   │   │   └── KanbanPanel/
│   │   │       ├── KanbanPanel.tsx
│   │   │       ├── KanbanColumn.tsx
│   │   │       └── TaskCard.tsx
│   │   ├── layout/                # Panel layout system
│   │   │   ├── PanelLayout.tsx
│   │   │   └── PipelineBar.tsx
│   │   ├── store/                 # Zustand state management
│   │   │   ├── index.ts           # Combined store
│   │   │   ├── chatSlice.ts
│   │   │   ├── editorSlice.ts
│   │   │   ├── kanbanSlice.ts
│   │   │   └── pipelineSlice.ts
│   │   ├── ws/                    # WebSocket client
│   │   │   ├── client.ts          # Connection management + reconnect
│   │   │   └── handlers.ts        # Route events to store actions
│   │   ├── api/                   # REST client for non-realtime ops
│   │   │   └── client.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express app + WebSocket setup
│   │   ├── ws/                    # WebSocket hub
│   │   │   ├── hub.ts             # Connection registry, broadcast
│   │   │   └── protocol.ts        # Message serialization, channels
│   │   ├── process/               # CLI process management
│   │   │   ├── manager.ts         # Spawn, track, kill processes
│   │   │   ├── parser.ts          # stdout/stderr line parser
│   │   │   └── commands.ts        # Command definitions (spec-kit, gsd)
│   │   ├── watch/                 # File watching
│   │   │   └── watcher.ts         # chokidar setup, debounce, events
│   │   ├── services/              # Business logic
│   │   │   ├── artifact.ts        # Read/parse spec artifacts
│   │   │   ├── task.ts            # Task CRUD (SQLite)
│   │   │   ├── pipeline.ts        # Stage management, gate logic
│   │   │   └── feature.ts         # Active feature tracking
│   │   ├── db/                    # Database
│   │   │   ├── connection.ts      # better-sqlite3 setup
│   │   │   ├── schema.ts          # Table definitions
│   │   │   └── migrations.ts      # Schema evolution
│   │   ├── routes/                # REST API routes
│   │   │   ├── artifacts.ts       # GET/PUT artifact content
│   │   │   ├── features.ts        # Feature lifecycle endpoints
│   │   │   └── pipeline.ts        # Stage transitions, approvals
│   │   └── config.ts              # Server configuration
│   ├── tsconfig.json
│   └── package.json
├── package.json                   # Workspace root (npm workspaces)
└── tsconfig.base.json             # Shared TS config
```

### Structure Rationale

- **packages/shared/:** WebSocket event types and pipeline stages are the contract between frontend and backend. Sharing them via a workspace package eliminates drift. This is the single most important structural decision -- typed events prevent the #1 class of bugs in WebSocket-based systems.
- **frontend/panels/:** Each panel is a self-contained feature folder. Panels own their sub-components but read from the shared Zustand store. This mirrors how users think about the app (three panels) and keeps boundaries clean.
- **frontend/store/:** Zustand slices pattern keeps store modular without the ceremony of Redux. Each slice maps to a panel's data needs, plus a pipeline slice for cross-cutting stage state.
- **backend/process/:** Process management is the most critical backend concern. Isolating it from the WebSocket layer lets you test CLI spawning independently and swap parsing logic per CLI tool.
- **backend/watch/:** File watching is a separate concern from process management. A CLI command finishing and a file changing are two different events that happen to correlate. Keeping them separate avoids coupling.
- **backend/services/:** Pure business logic, no transport concerns. Services don't know about WebSocket or Express -- they're called by route handlers and WebSocket message handlers.
- **npm workspaces:** Monorepo via npm workspaces (not Turborepo or Nx). For a 3-package project this is sufficient. Avoid build tool complexity.

## Architectural Patterns

### Pattern 1: Process Manager with Structured Event Emission

**What:** A centralized process manager spawns CLI tools as child processes, attaches line-by-line parsers to stdout/stderr, and emits typed events. Each CLI command has a registered parser that transforms raw output into domain events.

**When to use:** Always -- this is the core backend pattern. Every CLI invocation flows through the process manager.

**Trade-offs:**
- (+) Single place to handle process lifecycle (spawn, exit, error, kill)
- (+) Testable: mock child_process, verify emitted events
- (+) Extensible: add new CLI tools by registering a new command + parser
- (-) Parser maintenance: CLI output format changes break parsers
- (-) Cannot handle interactive CLI prompts (not needed for spec-kit/gsd)

**Example:**
```typescript
// backend/src/process/manager.ts
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from '@specflow/shared';

interface ManagedProcess {
  id: string;
  proc: ChildProcess;
  command: string;
  startedAt: number;
  featureId: string;
}

export class ProcessManager extends EventEmitter {
  private active: Map<string, ManagedProcess> = new Map();

  async execute(opts: {
    id: string;
    command: string;
    args: string[];
    cwd: string;
    featureId: string;
    parser: OutputParser;
  }): Promise<void> {
    // Enforce single active process (single feature constraint)
    if (this.active.size > 0) {
      throw new Error('A process is already running');
    }

    const proc = spawn(opts.command, opts.args, {
      cwd: opts.cwd,
      env: { ...process.env, FORCE_COLOR: '0' }, // disable ANSI
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const managed: ManagedProcess = {
      id: opts.id,
      proc,
      command: opts.command,
      startedAt: Date.now(),
      featureId: opts.featureId,
    };
    this.active.set(opts.id, managed);

    // Line-by-line parsing
    const rl = readline.createInterface({ input: proc.stdout! });
    rl.on('line', (line) => {
      const event = opts.parser.parseLine(line);
      if (event) this.emit('cli:event', event);
    });

    proc.stderr!.on('data', (chunk) => {
      this.emit('cli:event', {
        type: 'cli:error',
        processId: opts.id,
        data: chunk.toString(),
      });
    });

    proc.on('exit', (code) => {
      this.active.delete(opts.id);
      this.emit('cli:event', {
        type: 'cli:exit',
        processId: opts.id,
        exitCode: code,
      });
    });
  }

  kill(id: string): boolean {
    const managed = this.active.get(id);
    if (!managed) return false;
    managed.proc.kill('SIGTERM');
    // Force kill after 5s
    setTimeout(() => {
      if (this.active.has(id)) {
        managed.proc.kill('SIGKILL');
        this.active.delete(id);
      }
    }, 5000);
    return true;
  }
}
```

### Pattern 2: Channel-Multiplexed WebSocket Protocol

**What:** A single WebSocket connection carries all event types. Each message has a `channel` field (cli, fs, pipeline) and a `type` field for the specific event. The client routes messages to the appropriate store slice based on channel.

**When to use:** Always for this project. Multiple WebSocket connections add complexity without benefit for a single-user localhost tool.

**Trade-offs:**
- (+) Single connection to manage (reconnect logic in one place)
- (+) Natural ordering of events across channels
- (+) Simple server: one broadcast function
- (-) No per-channel backpressure (irrelevant at localhost scale)
- (-) Client needs a router to dispatch by channel

**Example:**
```typescript
// packages/shared/src/events.ts

// Every WebSocket message follows this envelope
interface WsEnvelope<T extends string = string, D = unknown> {
  channel: 'cli' | 'fs' | 'pipeline' | 'system';
  type: T;
  timestamp: number;
  data: D;
}

// CLI channel events
type CliEvent =
  | WsEnvelope<'cli:started', { processId: string; command: string }>
  | WsEnvelope<'cli:output', { processId: string; text: string; kind: 'info' | 'progress' | 'artifact' }>
  | WsEnvelope<'cli:artifact-created', { processId: string; path: string; artifactType: string }>
  | WsEnvelope<'cli:stage-transition', { processId: string; from: string; to: string }>
  | WsEnvelope<'cli:error', { processId: string; text: string }>
  | WsEnvelope<'cli:exit', { processId: string; exitCode: number | null }>;

// Filesystem channel events
type FsEvent =
  | WsEnvelope<'fs:changed', { path: string; changeType: 'create' | 'modify' | 'delete' }>
  | WsEnvelope<'fs:content', { path: string; content: string }>;

// Pipeline channel events
type PipelineEvent =
  | WsEnvelope<'pipeline:stage-changed', { stage: PipelineStage; featureId: string }>
  | WsEnvelope<'pipeline:gate-ready', { stage: PipelineStage; action: string }>
  | WsEnvelope<'pipeline:approved', { stage: PipelineStage; timestamp: number }>;

// System channel events
type SystemEvent =
  | WsEnvelope<'system:connected', { sessionId: string }>
  | WsEnvelope<'system:reconnected', { missedEvents: number }>
  | WsEnvelope<'system:error', { message: string }>;

type SpecFlowEvent = CliEvent | FsEvent | PipelineEvent | SystemEvent;
```

### Pattern 3: File-Watch-Driven State Reconciliation

**What:** chokidar watches the `specs/<feature>/` directory. On any change, the backend re-reads and re-parses the affected file, then pushes the parsed content to the client. The file system is always the source of truth -- if a file changes (whether from a CLI tool, manual edit, or external process), the UI updates.

**When to use:** For all spec artifact changes. The doc editor and kanban board both derive state from watched files.

**Trade-offs:**
- (+) Single source of truth (filesystem), no state divergence possible
- (+) Works regardless of what modifies the file (CLI tool, user, git)
- (+) Simple mental model: file changes -> UI updates
- (-) chokidar has memory overhead for large directory trees (irrelevant for spec artifacts -- small file count)
- (-) Need debouncing for rapid multi-file writes (CLI tools often write multiple files in sequence)

**Key implementation detail:** Debounce at 100-300ms per file path. CLI tools often do rapid writes (write temp, rename, write again). Without debouncing, you'll send stale intermediate states to the client.

**Example:**
```typescript
// backend/src/watch/watcher.ts
import chokidar from 'chokidar';
import { debounce } from '../utils/debounce.js';

export class ArtifactWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private debouncedHandlers: Map<string, () => void> = new Map();

  constructor(
    private onFileChanged: (path: string, type: 'create' | 'modify' | 'delete') => void,
    private debounceMs: number = 200,
  ) {}

  watch(featureDir: string): void {
    this.stop(); // Clean up previous watcher

    this.watcher = chokidar.watch(featureDir, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    });

    this.watcher
      .on('add', (path) => this.handleDebounced(path, 'create'))
      .on('change', (path) => this.handleDebounced(path, 'modify'))
      .on('unlink', (path) => this.handleDebounced(path, 'delete'));
  }

  private handleDebounced(path: string, type: 'create' | 'modify' | 'delete'): void {
    if (!this.debouncedHandlers.has(path)) {
      this.debouncedHandlers.set(
        path,
        debounce(() => this.onFileChanged(path, type), this.debounceMs),
      );
    }
    this.debouncedHandlers.get(path)!();
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    this.debouncedHandlers.clear();
  }
}
```

### Pattern 4: Pipeline State Machine

**What:** The workflow stages (specify, clarify, plan, tasks, implement, verify, analyze, ship) form a linear state machine with explicit gate conditions. Approval gates require user action. The pipeline controller validates transitions and triggers the appropriate CLI command.

**When to use:** For all stage transitions. This is the coordination backbone.

**Trade-offs:**
- (+) Prevents invalid state transitions (can't skip from specify to implement)
- (+) Makes gates explicit and auditable
- (+) Maps cleanly to UI pipeline bar
- (-) Linear model may be too rigid if stages need re-entry (mitigate: allow backward transitions for rejection loops)

**Example:**
```typescript
// packages/shared/src/pipeline.ts
export const PIPELINE_STAGES = [
  'specify', 'clarify', 'plan', 'tasks',
  'implement', 'verify', 'analyze', 'ship',
] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

export const GATES: Partial<Record<PipelineStage, {
  requiresApproval: boolean;
  label: string;
}>> = {
  plan: { requiresApproval: true, label: 'Approve Plan' },
  tasks: { requiresApproval: true, label: 'Approve Tasks' },
};

// backend/src/services/pipeline.ts
export class PipelineController {
  private stage: PipelineStage = 'specify';

  canAdvance(): { allowed: boolean; reason?: string } {
    const gate = GATES[this.stage];
    if (gate?.requiresApproval) {
      return { allowed: false, reason: `Awaiting approval: ${gate.label}` };
    }
    return { allowed: true };
  }

  approve(): PipelineStage {
    const idx = PIPELINE_STAGES.indexOf(this.stage);
    if (idx < PIPELINE_STAGES.length - 1) {
      this.stage = PIPELINE_STAGES[idx + 1];
    }
    return this.stage;
  }

  reject(): PipelineStage {
    // Stay at current stage -- rejection means re-run with feedback
    return this.stage;
  }

  getCommandForStage(): { command: string; args: string[] } | null {
    // Map stages to CLI commands
    const map: Partial<Record<PipelineStage, { command: string; args: string[] }>> = {
      specify: { command: 'speckit', args: ['specify'] },
      clarify: { command: 'speckit', args: ['clarify'] },
      plan:    { command: 'speckit', args: ['plan'] },
      tasks:   { command: 'speckit', args: ['tasks'] },
      // implement/verify/ship handled by GSD
    };
    return map[this.stage] ?? null;
  }
}
```

### Pattern 5: Zustand Slices with WebSocket Event Routing

**What:** Frontend state is managed by Zustand with a slices pattern. A single WebSocket event handler dispatches incoming events to the appropriate store action based on channel and type. Components subscribe to the specific slice they need.

**When to use:** For all frontend state. Zustand's simplicity is the right fit -- Redux is overkill for a single-user tool, and React context re-renders too broadly.

**Trade-offs:**
- (+) Minimal boilerplate, no providers needed
- (+) Selective subscriptions prevent unnecessary re-renders
- (+) Slices keep concerns separated while sharing a single store
- (-) No built-in dev tools (zustand devtools middleware fixes this)
- (-) Large store can become unwieldy (mitigate with strict slice boundaries)

**Example:**
```typescript
// frontend/src/ws/handlers.ts
import { useStore } from '../store';
import type { SpecFlowEvent } from '@specflow/shared';

export function handleWsEvent(event: SpecFlowEvent): void {
  const store = useStore.getState();

  switch (event.channel) {
    case 'cli':
      switch (event.type) {
        case 'cli:output':
          store.addChatMessage({
            role: 'system',
            content: event.data.text,
            kind: event.data.kind,
          });
          break;
        case 'cli:artifact-created':
          store.addChatMessage({
            role: 'system',
            content: `Created: ${event.data.path}`,
            kind: 'artifact',
            artifactPath: event.data.path,
          });
          store.openEditorTab(event.data.path);
          break;
        case 'cli:exit':
          store.setProcessRunning(false);
          break;
      }
      break;
    case 'fs':
      if (event.type === 'fs:changed') {
        store.markTabStale(event.data.path);
        // Trigger re-fetch of file content
      }
      if (event.type === 'fs:content') {
        store.updateTabContent(event.data.path, event.data.content);
        // If this is tasks.md, also re-parse kanban
        if (event.data.path.endsWith('tasks.md')) {
          store.updateKanbanFromMarkdown(event.data.content);
        }
      }
      break;
    case 'pipeline':
      if (event.type === 'pipeline:stage-changed') {
        store.setCurrentStage(event.data.stage);
      }
      if (event.type === 'pipeline:gate-ready') {
        store.setGateAction(event.data.action);
      }
      break;
  }
}
```

## Data Flow

### Command Execution Flow (Primary)

```
User types "/specify create a login page" in Chat Panel
    |
    v
ChatPanel.tsx → store.sendCommand(text)
    |
    v
WebSocket client → sends { channel: 'cli', type: 'cli:invoke', data: { raw: '/specify ...' } }
    |
    v
Express WS handler → parses command → validates against pipeline stage
    |
    v
PipelineController → confirms stage is valid for this command
    |
    v
ProcessManager.execute({ command: 'speckit', args: ['specify', ...], ... })
    |
    v
child_process.spawn('speckit', ['specify', ...])
    |
    ├─ stdout line → OutputParser → CliEvent → WsHub.broadcast()
    ├─ stdout line → OutputParser → CliEvent → WsHub.broadcast()
    ├─ ...
    |
    v (process exits)
ProcessManager → emits cli:exit
    |
    v
WsHub.broadcast({ channel: 'cli', type: 'cli:exit', ... })
    |
    v (meanwhile, speckit wrote specs/<feature>/spec.md)
chokidar detects file change → ArtifactWatcher → debounce
    |
    v
ArtifactService.parse(path) → read file, extract metadata
    |
    v
WsHub.broadcast({ channel: 'fs', type: 'fs:changed', data: { path, changeType: 'create' } })
WsHub.broadcast({ channel: 'fs', type: 'fs:content', data: { path, content } })
    |
    v
Frontend WS handler → store.openEditorTab(path) + store.updateTabContent(path, content)
    |
    v
EditorPanel re-renders with new tab showing spec.md
```

### Approval Gate Flow

```
CLI command completes → Pipeline advances to a gated stage (e.g., "plan")
    |
    v
PipelineController detects gate → emits pipeline:gate-ready
    |
    v
Frontend → PipelineBar shows "Approve Plan" button
    |
    v
User clicks "Approve Plan"
    |
    ├─ REST POST /api/pipeline/approve
    |    |
    |    v
    |  PipelineController.approve() → advances stage to "tasks"
    |    |
    |    v
    |  SQLite: INSERT INTO approvals (stage, timestamp, feature_id)
    |    |
    |    v
    |  Emit pipeline:stage-changed + pipeline:approved
    |    |
    |    v
    |  Auto-invoke next command: ProcessManager.execute('speckit', ['tasks'])
    |
    v (rejection path)
User types feedback in Chat + clicks "Reject"
    |
    v
REST POST /api/pipeline/reject { feedback: "..." }
    |
    v
PipelineController.reject() → stays at current stage
    |
    v
ProcessManager.execute('speckit', ['plan', '--feedback', '...'])
    |
    v
(New plan generated, cycle repeats)
```

### File Change Reconciliation Flow (Reconnect)

```
WebSocket reconnects after disconnect
    |
    v
Server: system:reconnected event with snapshot of current state
    |
    v
Client: receives full state snapshot
    ├─ Pipeline stage
    ├─ Active process (if any)
    ├─ All artifact file paths + hashes
    └─ Current tasks state
    |
    v
Client: diffs snapshot against local store
    |
    v
Client: re-fetches any stale artifacts via REST GET /api/artifacts/:path
    |
    v
Store updated → UI re-renders to correct state
```

### State Management

```
Source of Truth Hierarchy:

Filesystem (specs/<feature>/)     ← AUTHORITATIVE for artifact content
    |
    |  (read + parse)
    v
Backend Services                  ← DERIVED state (parsed tasks, metadata)
    |
    |  (WebSocket push)
    v
Zustand Store                     ← TRANSIENT display state
    |
    |  (React subscriptions)
    v
UI Components                     ← RENDERED output
```

### Key Data Flows

1. **CLI Execution:** User command -> WebSocket -> Process Manager -> child_process.spawn -> stdout parser -> structured events -> WebSocket broadcast -> Zustand store -> Chat Panel renders messages
2. **File Change Propagation:** chokidar detects change -> ArtifactWatcher debounces -> ArtifactService parses file -> WebSocket push (fs:changed + fs:content) -> Zustand updates editor tabs and/or kanban cards
3. **Pipeline Transitions:** Approval button click -> REST POST -> PipelineController validates + advances -> SQLite logs approval -> WebSocket push (pipeline:stage-changed) -> Pipeline bar updates -> auto-invokes next CLI command
4. **Kanban Sync:** tasks.md changes (from GSD execution) -> chokidar -> parse checkbox markdown -> diff against SQLite task records -> update SQLite -> WebSocket push -> kanban cards re-render
5. **Editor Live Reload:** fs:content event -> store.updateTabContent -> TipTap replaces document content (preserving cursor if user is not editing that file)

## Scaling Considerations

This is a single-user localhost tool. Traditional scaling is not relevant. Instead, consider these operational scales:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **1 feature, short tasks** | Base architecture works as-is. CLI processes run seconds to minutes. |
| **1 feature, long GSD execution** | GSD may run for 10-30+ minutes. ProcessManager needs proper cleanup on server restart. Consider writing active process PID to disk for recovery. |
| **Large spec artifacts (100KB+ markdown)** | TipTap handles large documents well. Debounce file-watch more aggressively (500ms). Send content diffs instead of full file on change. |
| **Many task cards (100+ tasks)** | Kanban needs virtualization (react-window). SQLite handles this trivially. |

### Scaling Priorities

1. **First bottleneck: Process cleanup.** If the server crashes mid-CLI-execution, orphan processes remain. Write PID files. On startup, check for orphan PIDs and kill them. This is the most likely real-world issue.
2. **Second bottleneck: Editor content sync.** If a user is editing a file in TipTap while a CLI tool also writes to it, you get a conflict. Solution: when a CLI process is running, lock the affected file's editor tab to read-only. Unlock when the process exits.

## Anti-Patterns

### Anti-Pattern 1: Bidirectional File Sync

**What people do:** Try to make TipTap edits write to disk AND file changes update TipTap simultaneously, creating a bidirectional sync loop.
**Why it's wrong:** Write-to-disk triggers chokidar, which pushes back to TipTap, which triggers another write. Infinite loop. Even with loop detection, edge cases cause content loss or duplication.
**Do this instead:** TipTap saves to disk on explicit user action (Ctrl+S / save button). File watcher updates are received only when the editor tab is NOT dirty (has unsaved changes). If the tab IS dirty and the file changes externally, show a conflict indicator: "File changed on disk. Reload?" This keeps the filesystem as source of truth while preventing loops.

### Anti-Pattern 2: Parsing CLI Output with Regex

**What people do:** Write fragile regex patterns to parse spec-kit/GSD stdout line by line, breaking on every CLI update.
**Why it's wrong:** CLI output formats are not stable APIs. A minor formatting change breaks the parser, and regex parsers for semi-structured output are maintenance nightmares.
**Do this instead:** Use a layered parsing strategy. First, check if the CLI tools support a `--json` or `--machine-readable` output flag. If they do, use it. If not, parse conservatively: detect file creation events (lines containing file paths), stage transitions (known keywords), and treat everything else as informational text. Use a parser-per-command pattern so failures are isolated. Log unparsed lines for debugging.

### Anti-Pattern 3: SQLite as Primary State

**What people do:** Store everything in SQLite and treat the database as the source of truth, duplicating artifact content from the filesystem.
**Why it's wrong:** Creates two sources of truth. When a user manually edits a spec file in their text editor, or git operations modify files, the database is stale. Now you need reconciliation logic that's always one step behind.
**Do this instead:** SQLite stores ONLY derived/computed state that doesn't exist on the filesystem: task card positions, approval timestamps, pipeline stage, user preferences, process execution history. Artifact content always comes from the filesystem. SQLite is a cache/index, not the source of truth.

### Anti-Pattern 4: Full Store Subscriptions

**What people do:** Subscribe to the entire Zustand store from every component, causing the entire app to re-render on any state change.
**Why it's wrong:** When CLI events stream rapidly (multiple events per second during GSD execution), full subscriptions cause cascading re-renders. The chat panel doesn't need to re-render when a kanban card updates.
**Do this instead:** Use Zustand's selector pattern. Each component subscribes to exactly the state it needs: `const messages = useStore(s => s.chatMessages)`. Use shallow equality checks for object/array selectors: `useStore(s => s.kanbanCards, shallow)`.

### Anti-Pattern 5: WebSocket Without Reconnection Strategy

**What people do:** Open a WebSocket and assume it stays connected. When it drops (laptop sleep, network hiccup), the UI silently becomes stale.
**Why it's wrong:** Even on localhost, WebSocket connections drop. The user doesn't notice and makes decisions based on stale state.
**Do this instead:** Implement exponential backoff reconnection (1s, 2s, 4s, max 30s). On reconnect, request a full state snapshot from the server. Show a visible "reconnecting..." indicator in the UI. After reconnection, do a one-time filesystem reconciliation to catch any changes that happened while disconnected.

## Integration Points

### External Services (CLI Tools)

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **spec-kit** | child_process.spawn with stdout/stderr parsing | Commands: specify, clarify, plan, tasks. Operates on specs/<feature>/ directory. May prompt for input -- need to handle or disable interactive mode. |
| **GSD** | child_process.spawn, longer-running | Commands: execute tasks, verify. Runs coding agents that may take minutes. Need progress events and kill capability. |
| **Filesystem** | chokidar watch + fs.readFile | Source of truth for all spec artifacts. Watch specs/<feature>/ and .planning/ |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend <-> Backend | WebSocket (events) + REST (commands/queries) | WS for push, REST for pull. REST for actions that need request/response (approve, save). WS for streaming events. |
| ProcessManager <-> WsHub | EventEmitter (in-process) | ProcessManager emits typed events, WsHub subscribes and broadcasts to clients |
| FileWatcher <-> WsHub | EventEmitter (in-process) | Same pattern as ProcessManager. FileWatcher emits, WsHub broadcasts. |
| FileWatcher <-> ArtifactService | Direct function call | Watcher calls ArtifactService.parse() to get structured content before broadcasting |
| PipelineController <-> ProcessManager | Direct function call | Pipeline approve/reject triggers ProcessManager.execute() for the next command |
| ArtifactService <-> TaskService | Direct function call | When tasks.md changes, ArtifactService parses it and calls TaskService to update SQLite |

## Build Order (Dependency Chain)

The architecture has clear dependency layers. Build bottom-up:

```
Phase 1 (Foundation):
    shared/events.ts + shared/models.ts    ← Everything depends on these types
    backend/server.ts (Express + WS shell) ← Communication infrastructure
    frontend skeleton (Vite + Zustand)     ← Empty panels wired to store

Phase 2 (Core Pipeline):
    backend/process/manager.ts             ← Can work without WS (emit to console)
    backend/ws/hub.ts                      ← Needs server.ts
    frontend/ws/client.ts + handlers.ts    ← Needs hub.ts

Phase 3 (Panels + File Watching):
    backend/watch/watcher.ts               ← Independent, needs shared types
    backend/services/artifact.ts           ← Needs watcher
    frontend/panels/ChatPanel              ← Needs WS client + CLI events
    frontend/panels/EditorPanel            ← Needs WS client + FS events + TipTap

Phase 4 (Pipeline + Kanban):
    backend/services/pipeline.ts           ← Needs process manager
    backend/db/ + services/task.ts         ← Needs artifact service (for tasks.md parsing)
    frontend/layout/PipelineBar.tsx        ← Needs pipeline events
    frontend/panels/KanbanPanel            ← Needs task state + FS events

Phase 5 (Polish):
    Reconnection + state reconciliation
    Editor conflict handling
    Error states and edge cases
```

**Critical path:** shared types -> Express+WS server -> Process Manager -> WS Hub -> Chat Panel. This is the minimum viable vertical slice: type a command in chat, see structured output. Everything else builds on top.

## State Boundary: SQLite vs Filesystem

This distinction is critical and worth an explicit section. Getting this wrong causes the most painful refactors.

### Filesystem Owns (Source of Truth)

| Data | Location | Format |
|------|----------|--------|
| Spec document | specs/<feature>/spec.md | Markdown |
| Plan document | specs/<feature>/plan.md | Markdown |
| Tasks definition | specs/<feature>/tasks.md | Markdown with checkboxes |
| Feature directory existence | specs/<feature>/ | Directory |
| Any other spec-kit artifacts | specs/<feature>/*.md | Markdown |

### SQLite Owns (Derived/Operational State)

| Data | Table | Why Not Filesystem |
|------|-------|-------------------|
| Pipeline stage per feature | `pipeline_state` | IDE operational state, not a spec artifact |
| Approval records | `approvals` | Timestamps + metadata, audit trail |
| Task card status cache | `tasks` | Parsed from tasks.md for fast querying; reconciled on change |
| Process execution log | `process_log` | Debugging, history; not spec content |
| User preferences (layout) | `preferences` | IDE config, not spec content |
| Active feature tracking | `active_feature` | IDE session state |

### Reconciliation Rule

When SQLite and filesystem disagree, **filesystem wins**. On startup and on reconnection, the backend reads the filesystem and reconciles SQLite state. This is a one-way sync: filesystem -> SQLite, never the reverse for artifact content.

## Sources

- Node.js child_process documentation (official): process spawning, stdio piping, signal handling
- chokidar npm package: de facto standard for Node.js file watching, handles OS-level differences (inotify/FSEvents/polling)
- ws npm package: standard WebSocket library for Node.js, lower overhead than socket.io for structured protocols
- TipTap documentation: ProseMirror-based editor with markdown support, document replacement API for live reload
- Zustand documentation: lightweight state management with selector-based subscriptions
- allotment npm package: React split pane component for resizable panel layouts
- better-sqlite3: synchronous SQLite bindings for Node.js, better performance than async alternatives for single-user use
- unified/remark ecosystem: markdown parsing to AST for extracting structured data from spec artifacts

---
*Architecture research for: SpecFlow IDE -- document-centric web IDE orchestrating CLI tools*
*Researched: 2026-03-24*

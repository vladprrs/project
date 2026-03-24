# Pitfalls Research

**Domain:** Web IDE with CLI orchestration, filesystem-driven state, WebSocket streaming, TipTap markdown editing
**Researched:** 2026-03-24
**Confidence:** HIGH (child_process, filesystem watching, WebSocket) / MEDIUM (TipTap markdown round-trip specifics)

## Critical Pitfalls

### Pitfall 1: Zombie and Orphan CLI Processes

**What goes wrong:**
The backend spawns spec-kit or GSD CLI processes via `child_process.spawn()`. If the parent Node.js process crashes, restarts, or the user navigates away mid-operation, spawned CLI processes continue running as orphans. Worse, if the backend tracks processes by PID and the PID gets recycled by the OS, a subsequent `kill()` call terminates an unrelated process. Over time, leaked processes consume memory and CPU, and concurrent zombie runs against the same `specs/<feature>/` directory corrupt artifacts.

**Why it happens:**
Developers test the happy path (CLI starts, runs, exits cleanly) and never test: parent crash during child execution, user refreshing the browser mid-operation, server restart while GSD executor is running tasks, or network disconnection during a long-running implement phase. Node.js does NOT automatically kill child processes when the parent exits -- this is a common misconception.

**How to avoid:**
1. Maintain a process registry (Map of operation ID to ChildProcess reference) on the backend. On server startup, check for and kill any stale processes from a previous run (store PIDs in SQLite or a temp file).
2. Use process groups: spawn with `detached: false` (the default) so children share the parent's process group. Install a `process.on('exit')` and `process.on('SIGTERM')` handler that iterates the registry and sends SIGTERM to all tracked children.
3. Implement a process reaper: if a tracked process hasn't emitted output in N seconds (configurable per command type), send SIGTERM, wait 5 seconds, then SIGKILL.
4. Never store PIDs across server restarts without validating the PID still belongs to your process (check `/proc/<pid>/cmdline` on Linux).
5. Use AbortController with `signal` option on spawn (Node.js 15.4+) for clean cancellation.

**Warning signs:**
- `ps aux | grep speckit` or `grep gsd` shows processes after the IDE server has stopped
- Multiple instances of the same CLI command running simultaneously
- Artifact files with interleaved/corrupted content
- Server memory usage climbing over time

**Phase to address:**
Phase 1 (backend foundation). The process manager is the single most critical backend component. Build it before any CLI integration, with explicit lifecycle states: spawning, running, cancelling, exited, killed. Every subsequent feature depends on this being rock-solid.

---

### Pitfall 2: Filesystem Watch Race Conditions (Write-Then-Read Hazard)

**What goes wrong:**
The backend spawns a CLI command that writes to `specs/<feature>/plan.md`. The file watcher (chokidar or `fs.watch`) detects the change and fires an event. The backend reads the file to push updated content to the frontend via WebSocket. But the file is only partially written -- the CLI process is still flushing its buffer. The frontend receives truncated or malformed markdown. The user sees a broken document that "fixes itself" a moment later when another change event fires, or worse, does not fix itself because the watcher coalesced the events.

**Why it happens:**
File writes are not atomic. A CLI tool writing a 50KB `plan.md` may trigger multiple `change` events as the OS flushes data in chunks. `fs.watch` and chokidar's `change` event fire on each kernel notification, not when the write is "complete." There is no OS-level signal for "file write finished." This is particularly acute on Linux with inotify, where `IN_MODIFY` fires per write syscall.

**How to avoid:**
1. Debounce file change events per file path with a 200-500ms window. Do NOT use a global debounce -- each file needs its own timer so that simultaneous changes to `spec.md` and `plan.md` are both captured.
2. After the debounce timer fires, verify the file is stable: read the file size, wait 50ms, read again. If the size changed, restart the debounce.
3. For CLI-initiated writes (where you control the trigger), use a "known write" pattern: before spawning the CLI, mark which files you expect it to modify. When those files change, apply a longer debounce or wait for the CLI process to exit before reading.
4. Use `awaitWriteFinish` in chokidar config: `{ awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 50 } }`. This is specifically designed for this problem.
5. Validate read content before broadcasting: check that markdown parses without errors, and that the file does not end mid-line or mid-frontmatter block.

**Warning signs:**
- Intermittent "flash of broken content" in the document editor
- Frontend markdown parse errors in console
- File content in UI that differs from what `cat` shows on disk
- Reports that "sometimes the editor shows old content"

**Phase to address:**
Phase 1 (backend foundation). The file watcher is foundational infrastructure. Get `awaitWriteFinish` configured from day one. Write integration tests that rapidly write large files and verify the watcher only emits once with complete content.

---

### Pitfall 3: TipTap Markdown Round-Trip Fidelity Loss

**What goes wrong:**
User opens `plan.md` in TipTap. TipTap parses markdown into a ProseMirror document model, then serializes it back to markdown on save. The round-tripped markdown differs from the original: indentation changes, list marker styles change (`-` vs `*`), blank line counts change, HTML comments disappear, frontmatter is mangled, task checkboxes lose formatting, reference links become inline links, and code fence info strings may be altered. When this "dirty" markdown is written back to disk, it triggers a file watcher event, which triggers a re-read, which may cause a TipTap re-render, which causes cursor position loss.

This is not a bug -- it is inherent to the markdown-to-AST-to-markdown pipeline. ProseMirror's document model cannot represent all valid markdown constructs. The lossy round-trip is the single most frequently reported frustration in projects that combine TipTap with filesystem markdown.

**Why it happens:**
Markdown is a presentation format with multiple valid representations of the same semantic content. ProseMirror's schema is a strict tree structure that normalizes away syntactic variation. The `tiptap-markdown` extension (or any markdown serializer) must make choices about output format that may differ from the input. Specific lossy areas:
- Inline HTML (stripped or converted)
- Reference-style links (converted to inline)
- Indentation (normalized)
- Trailing whitespace (stripped)
- Setext headings (converted to ATX `#` style)
- Loose vs tight lists (normalized)
- HTML comments (dropped entirely by default)

**How to avoid:**
1. **Read-only by default, edit-on-demand.** Display markdown as rendered HTML in TipTap (read-only mode). Only enter edit mode when the user explicitly clicks "Edit." This eliminates accidental round-trip writes.
2. **Never auto-save TipTap content to disk without user intent.** The filesystem is the source of truth (Constitution Principle I). TipTap is a viewer first, editor second.
3. When saving, diff the serialized markdown against the original file content. If the only changes are formatting (whitespace, list markers), discard the save and warn the user. Only write genuine content changes.
4. Use `tiptap-markdown` extension with careful serializer configuration. Pin the markdown serializer options: `{ tight: false, bulletListMarker: '-' }` to minimize formatting drift.
5. Consider a hybrid approach: store the original markdown string alongside the ProseMirror doc. On save, apply a structured diff (e.g., using `diff-match-patch`) that patches only the changed sections into the original file, preserving formatting of untouched regions.
6. **Test the specific markdown patterns that spec-kit and GSD produce.** Create a fixture file with every construct they emit (checkbox lists, code blocks, tables, frontmatter, headings, nested lists) and verify TipTap round-trips it identically.

**Warning signs:**
- Git diffs showing formatting-only changes to spec artifacts after editing in the IDE
- Users reporting "I didn't change anything but the file shows as modified"
- Spec-kit or GSD failing to parse artifacts after IDE editing (because formatting assumptions broke)
- Cursor jumping to document start after file watcher triggers reload

**Phase to address:**
Phase 2 (document editor). This must be the first thing validated when building the TipTap integration. Build a markdown round-trip test suite before writing any editor UI code. The test should: read a fixture file, parse into TipTap, serialize back, and assert byte-for-byte equality (or document and accept specific known differences).

---

### Pitfall 4: WebSocket State Divergence After Reconnection

**What goes wrong:**
User's browser loses WebSocket connection (laptop sleep, network hiccup, server restart). During disconnection, the backend spawns a CLI command, writes artifacts, and updates kanban state. When the WebSocket reconnects, the frontend's state is stale. If reconnection only resumes the event stream from "now," the user misses all events that occurred during disconnection: artifact updates, task completions, stage transitions. The UI shows an incorrect pipeline stage, stale document content, and wrong kanban card positions.

The PROJECT.md requirement says "WebSocket reconnection with one-time filesystem reconciliation as polling fallback" -- this is exactly right, but the implementation is where projects fail.

**Why it happens:**
Developers implement WebSocket reconnection (the easy part) but not state reconciliation (the hard part). They assume reconnection means "resume where you left off," but without message sequence numbers or server-side event buffering, "where you left off" is unknowable. The server has no record of what the client last received.

**How to avoid:**
1. **Full state snapshot on reconnect.** When a WebSocket connects (or reconnects), the server sends a complete state snapshot: current pipeline stage, list of open artifacts with content hashes, kanban task states, and active CLI process status. The client replaces its entire state with this snapshot.
2. **Do NOT attempt incremental catch-up.** Event sourcing and sequence numbers add enormous complexity for minimal benefit in a single-user localhost tool. A full snapshot is simpler and eliminates an entire class of ordering bugs.
3. **Content hashing for change detection.** Each artifact gets a hash (MD5 is fine for change detection). The snapshot includes hashes. The client only re-fetches file content for artifacts whose hash differs from its cached version.
4. **Heartbeat with automatic reconnect.** Send WebSocket pings every 15 seconds. If 3 consecutive pongs are missed, the client triggers reconnection. Use exponential backoff: 500ms, 1s, 2s, 4s, max 10s.
5. **Offline indicator.** While disconnected, show a clear "Reconnecting..." banner. Disable action buttons (approve, reject) to prevent user actions that cannot be delivered.

**Warning signs:**
- Users reporting that the kanban board "doesn't update" until they refresh the page
- Pipeline stage indicator showing a previous stage after a CLI command completed during disconnection
- Document editor showing old content after laptop wake-from-sleep

**Phase to address:**
Phase 1 (backend foundation, WebSocket layer). Design the snapshot-on-connect protocol from the start. It is far easier to build this into the initial WebSocket design than to retrofit it after building an event-only stream.

---

### Pitfall 5: CLI Output Parsing Brittleness

**What goes wrong:**
The backend parses stdout/stderr from spec-kit and GSD to extract structured events (stage transitions, progress, artifact paths). The parsing logic is tightly coupled to the current output format of these CLI tools. When spec-kit or GSD updates, the output format changes subtly (extra whitespace, reworded messages, new log levels, changed emoji, JSON structure changes) and the parser breaks silently -- it stops emitting events, or emits wrong event types, or throws errors that cascade into WebSocket disconnections.

**Why it happens:**
CLI stdout is not a stable API. Unless the CLI tools explicitly document their output format as a contract, any change is legitimate. Developers build regex-based parsers against observed output during development and assume it is stable. This is particularly dangerous with AI-powered tools where output wording may vary between runs.

**How to avoid:**
1. **Negotiate structured output with the CLI tools.** If spec-kit or GSD can emit JSON-lines (`--output json` or `--format jsonl`), use that exclusively. JSON is a stable contract; prose is not.
2. If structured output is not available, **parse conservatively**: extract only machine-readable signals (file paths, exit codes, known markers) and treat everything else as opaque text to display in the chat panel.
3. **Define a translation layer** (adapter pattern) between raw CLI output and internal event types. When CLI output format changes, only the adapter changes -- not the event system, not the WebSocket protocol, not the frontend.
4. **Never regex against human-readable messages.** Match against structural patterns: lines starting with specific prefixes, JSON objects on their own lines, file paths matching `specs/<feature>/*.md`.
5. **Fail open:** If a line of output does not match any known pattern, display it as a raw text event in chat rather than silently dropping it.
6. **Version-pin the CLI tools** and test against specific versions. Include CLI version detection at startup.

**Warning signs:**
- Chat panel showing raw unformatted output that was previously structured
- Progress indicators stuck at 0% or never appearing
- "Unknown event type" errors in backend logs
- Frontend missing artifact link buttons that previously worked

**Phase to address:**
Phase 1 (CLI integration layer). Design the adapter pattern before writing any specific parsers. Each CLI tool gets its own adapter module with explicit version compatibility notes.

---

### Pitfall 6: SQLite Task State Diverging from tasks.md

**What goes wrong:**
The project uses SQLite to store kanban task state (status, timestamps) derived from `tasks.md`. A CLI command updates `tasks.md` (e.g., GSD marks a task complete by checking a checkbox). The file watcher detects the change and the backend re-parses `tasks.md` to update SQLite. But: (a) the parser's understanding of `tasks.md` format does not match spec-kit's format exactly, (b) task identity is ambiguous (tasks are identified by text content, which can change), or (c) a race condition means SQLite is updated from two sources simultaneously (file watcher and a direct CLI event).

Now the kanban board shows a task as "in progress" while `tasks.md` shows it as "done." The constitution explicitly forbids this divergence, but it is remarkably easy to create.

**Why it happens:**
`tasks.md` is a markdown file with checkbox lists. There is no unique ID per task -- tasks are identified by their text content or their position in the file. When a task's text is edited, or tasks are reordered, the mapping between SQLite rows and markdown lines breaks. Additionally, if both file-watching and CLI-event-processing paths update SQLite, they can race.

**How to avoid:**
1. **SQLite is a cache, not a source of truth.** On any conflict, `tasks.md` wins. Period. SQLite stores derived data (parsed status, timestamps, position) that can be fully reconstructed from `tasks.md` at any time.
2. **Implement a full re-parse strategy.** When `tasks.md` changes, do not attempt incremental updates. Parse the entire file, diff against current SQLite state, and apply updates in a single transaction. This is fast enough for the expected file sizes (< 1000 tasks).
3. **Generate stable task IDs** by hashing the task's text content plus its position in the phase hierarchy. Store the hash in SQLite. When re-parsing, match by hash first, then fall back to fuzzy text matching for tasks whose text changed slightly.
4. **Single writer pattern.** Only one code path writes to SQLite: the `tasks.md` parser triggered by the file watcher. CLI events update `tasks.md` (the file), not SQLite directly. The file change propagates to SQLite through the watcher.
5. **Add a reconciliation endpoint.** An API route that re-parses `tasks.md` from scratch and rebuilds SQLite state. Use this on server startup, after any suspected divergence, and as a manual "fix it" action.

**Warning signs:**
- Kanban card counts differ from checkbox counts in `tasks.md`
- Task status in kanban contradicts checkbox state in the document editor
- Tasks appearing twice or disappearing from the kanban board
- "Ghost tasks" in SQLite that no longer exist in `tasks.md`

**Phase to address:**
Phase 2 (kanban board). Build the full-reparse pipeline first and verify it handles every edge case in `tasks.md` format before adding incremental optimizations.

---

### Pitfall 7: TipTap Document Reload Destroying User Edits

**What goes wrong:**
User is editing `plan.md` in TipTap. Meanwhile, a CLI command (triggered by another approval gate) modifies `plan.md` on disk. The file watcher fires, the backend pushes new content, and the frontend replaces the TipTap document content. The user's unsaved edits are silently destroyed. No warning, no merge, no undo.

**Why it happens:**
The simplest implementation of "file changes on disk -> update editor" is `editor.commands.setContent(newMarkdown)`. This replaces everything. Developers implement it this way first because it is correct for the read-only case, then forget to handle the concurrent-edit case when editing is enabled.

**How to avoid:**
1. **Track dirty state.** When the user makes any edit in TipTap, set a `dirty` flag. While dirty, do NOT auto-replace content from file watcher events.
2. **Conflict notification.** If the file changes while the editor is dirty, show a non-modal notification: "plan.md changed on disk. [Reload] [Keep my changes] [Show diff]." Never silently discard edits.
3. **Lock file during edit.** When the user enters edit mode, the backend can set a flag that prevents CLI commands from modifying that specific file. If a CLI command would modify a locked file, queue the change and notify the user.
4. **Operational transform is overkill.** This is a single-user tool. The conflict between "file watcher" and "user edits" is not collaborative editing -- it is a simpler "external modification during local edit" problem. Solve it with dirty detection and user prompts, not with CRDTs or OT.

**Warning signs:**
- Users complaining about "lost edits" or "my changes disappeared"
- Bug reports that are hard to reproduce because they require specific timing
- Undo history (Ctrl+Z) not recovering lost content because setContent() resets history

**Phase to address:**
Phase 2 (document editor). Implement the dirty flag and conflict notification before enabling any write-back functionality. Test by editing a file in TipTap while simultaneously writing to it from a terminal.

---

### Pitfall 8: Structured Event Ordering and Causality Violations

**What goes wrong:**
The backend emits WebSocket events for CLI progress, artifact creation, and stage transitions. On the frontend, events arrive and are processed in order. But the "order" is wrong: a "task completed" event arrives before the "task started" event, or an "artifact created" event arrives before the file content is available via the REST API, because the file watcher has not yet detected the new file.

**Why it happens:**
Events originate from multiple sources: CLI stdout parsing (async, buffered), file watcher events (async, debounced), and direct backend state changes. These sources have different latencies. CLI stdout may report "wrote plan.md" 200ms before the file watcher detects `plan.md` exists, because stdout is unbuffered but file watching has a debounce delay.

**How to avoid:**
1. **Causal ordering via sequence numbers.** Each WebSocket event gets a monotonically increasing sequence number. The frontend buffers out-of-order events and processes them in sequence. Simple enough for a single-server, single-user system.
2. **Event dependencies.** Certain events carry prerequisites: an "artifact_created" event should include the file content hash. The frontend does not render it until it has fetched content matching that hash. This prevents "click link to empty document" errors.
3. **Consolidate event sources.** Rather than having CLI stdout and file watcher independently emit events, route both through a single event coordinator on the backend. The coordinator resolves conflicts: if CLI stdout says "wrote plan.md" and the file watcher has not fired yet, the coordinator proactively reads the file instead of waiting for the watcher.
4. **Timestamp events at source.** Include a backend timestamp on every event. The frontend can detect clock skew and use timestamps to resolve ambiguity.

**Warning signs:**
- Kanban cards briefly showing "started" then "completed" in rapid succession
- Clicking an artifact link opening a blank document
- Pipeline stage indicator briefly regressing before advancing
- Chat messages appearing out of logical order

**Phase to address:**
Phase 1 (WebSocket protocol design). Define the event schema with sequence numbers and dependency metadata from the beginning. Retrofitting ordering into an unordered event stream is a significant refactor.

---

### Pitfall 9: Express Request Handling During Long-Running CLI Operations

**What goes wrong:**
A user clicks "Approve Plan" which triggers a CLI command that takes 30-120 seconds. During this time, the user makes other API requests (open a file, check status, navigate). If the long-running CLI handler is blocking the Express request/response cycle or holding a mutex, these other requests queue up and the UI appears frozen even though only the CLI operation is slow.

**Why it happens:**
Developers conflate "the CLI command is running" with "the HTTP request is pending." The approval button sends an HTTP POST, the handler spawns the CLI process, and then... does the handler `await` the process exit? If yes, the HTTP response is delayed for 30-120 seconds, the browser may timeout, and no other requests can inform the user about progress. If no, but the handler holds shared state (like a "current operation" lock), other requests may deadlock.

**How to avoid:**
1. **Fire-and-forget HTTP, stream via WebSocket.** The POST `/api/approve` handler should: validate the request, spawn the CLI process, register it in the process manager, return HTTP 202 Accepted immediately with an operation ID. All progress and completion events stream via the existing WebSocket.
2. **Never await CLI process completion in an HTTP handler.** The HTTP layer is for commands (start, cancel). The WebSocket layer is for events (progress, completion, errors).
3. **Operation state machine.** Each CLI operation has states: `pending -> running -> completed | failed | cancelled`. The frontend polls or receives state transitions via WebSocket, not via long-lived HTTP responses.
4. **Request timeout configuration.** Set Express request timeout to 30 seconds max. Any operation that might take longer MUST be async (fire-and-forget + WebSocket events).

**Warning signs:**
- Browser showing "pending" on API requests for more than a few seconds
- UI becoming unresponsive during long CLI operations
- 504 Gateway Timeout errors (if reverse proxy has shorter timeout than CLI operation)
- Users clicking "Approve" multiple times because no immediate feedback

**Phase to address:**
Phase 1 (backend API design). This is an architectural decision that must be made before building any API endpoints. The pattern (HTTP for commands, WebSocket for events) should be established in the first endpoint.

---

### Pitfall 10: Chokidar v3 vs v4 Migration Trap and Platform-Specific Behavior

**What goes wrong:**
Developers install chokidar without pinning the major version. Chokidar v4 (released late 2024) is a complete rewrite that dropped several features, changed the API, and has different behavior on macOS vs Linux. Code written for chokidar v3 breaks silently on v4: `awaitWriteFinish` options may behave differently, glob patterns may not match the same way, and event timing changes. Additionally, on macOS, chokidar uses FSEvents (efficient but coalesces events), while on Linux it uses inotify (per-file watch, can hit system limits).

**Why it happens:**
Chokidar is the "standard" Node.js file watcher and developers install it without researching the v3-to-v4 migration. The v4 rewrite removed the polling fallback and changed how `awaitWriteFinish` works internally. On Linux servers (which this project targets per the infra specs), the inotify watch limit (`fs.inotify.max_user_watches`) defaults to 8192 on many distributions, which is easily exhausted when watching a large project directory recursively.

**How to avoid:**
1. **Pin chokidar to a specific major version** (v3 is more battle-tested for these use cases; v4 is leaner but newer). Document the decision.
2. **Watch specific directories, not the project root.** Watch `specs/<feature>/` only, not the entire workspace. This minimizes inotify watch consumption and reduces noise.
3. **Check and set inotify limits at startup.** Read `/proc/sys/fs/inotify/max_user_watches` and warn if below 65536. Provide setup instructions in the README.
4. **Test on the deployment platform.** The development machine (macOS) and production (Linux) have different filesystem event semantics. Always test file watching on Linux.
5. **Consider `fs.watch` with recursive option** (Node.js 19.1+ on Linux with kernel 5.9+ supports recursive `fs.watch` natively via fanotify). This eliminates the chokidar dependency for simple use cases. But verify the Node.js version constraint.

**Warning signs:**
- "ENOSPC: System limit for number of inotify watches reached" error
- File changes detected on macOS dev but not on Linux deployment
- Events firing differently in CI (Linux) vs local development (macOS)
- `awaitWriteFinish` not working as expected after a `npm update`

**Phase to address:**
Phase 1 (backend foundation). Pin the dependency, configure narrow watch paths, and write a startup diagnostic that checks inotify limits. Test on Linux from the first integration test.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Regex parsing of CLI stdout | Quick to implement, no CLI changes needed | Breaks on every CLI update, unmaintainable regex soup | MVP only, with explicit TODO to migrate to structured output |
| Global debounce on file watcher | Simple code, one timer | Coalesces unrelated file changes, missed events | Never -- per-file debounce is barely more code |
| `setContent()` on every file change | Simple reload logic | Destroys editor state, undo history, cursor position, selections | Only when editor is in read-only mode |
| Storing kanban state only in SQLite | Fast queries, simple frontend | Diverges from tasks.md, dual source of truth | Never -- SQLite must be a cache of tasks.md |
| Single WebSocket message type | No event schema to maintain | Cannot distinguish progress, errors, state updates; frontend becomes a parsing mess | Never -- define event types from day one |
| Polling instead of WebSocket | Simpler server implementation | Latency, battery/CPU drain, missed rapid changes | Only as a fallback when WebSocket is disconnected |
| Spawning CLI processes with `shell: true` | Handles complex commands, env expansion | Shell injection risk, platform differences, slower | Never -- use `spawn()` with args array |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| spec-kit CLI | Parsing human-readable output as structured data | Request or build `--format json` support; parse only machine-readable signals (exit codes, file paths) |
| GSD CLI | Assuming GSD executor completes in one process spawn | GSD may spawn sub-agents; track the top-level process and watch for artifact changes rather than waiting for a single exit |
| TipTap + markdown files | Bidirectional sync (file -> editor -> file -> editor loop) | Unidirectional: file is truth, editor reads. Editor writes only on explicit save, with round-trip diff guard |
| SQLite + file watcher | Two independent write paths to SQLite (watcher + direct update) | Single writer: only the tasks.md parser writes to SQLite. All other changes go through tasks.md first |
| WebSocket + Express | Sharing the same HTTP server without proper upgrade handling | Use `express-ws` or handle the `upgrade` event on the HTTP server explicitly. Test that WebSocket and REST coexist without port conflicts |
| chokidar + CLI spawning | Watcher detects changes from own CLI commands, triggering infinite loops | Use a "mute" window: mute watcher events for files being written by a known CLI operation. Unmute after CLI exits + debounce window |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full file re-read on every watcher event | CPU spikes during rapid file changes, sluggish UI | Debounce + content hash comparison (skip if hash unchanged) | > 10 files changing per second (during GSD executor runs) |
| TipTap re-render on every WebSocket message | Editor janking, cursor jumping, input lag | Batch document updates, only apply if content actually changed (compare hashes) | > 5 updates per second to the same document |
| SQLite write-per-task-change during batch operations | Database lock contention, slow kanban updates | Batch SQLite writes in a single transaction per tasks.md re-parse | GSD marking 10+ tasks complete in rapid succession |
| Unbounded WebSocket event buffer | Memory growth on slow clients, eventual OOM | Cap event buffer at 1000 messages, drop oldest on overflow, rely on snapshot-on-reconnect for recovery | Long-running GSD executor emitting thousands of progress events |
| Recursive file watching on project root | Inotify limit exhaustion, watcher crash | Watch only `specs/` and `.planning/` directories. Use `ignored` patterns for node_modules, .git, dist | Projects with > 10K files (most real projects) |
| JSON.parse on every CLI stdout line | CPU overhead on high-frequency output | Parse lazily: check line prefix/first character before full parse. Buffer and batch-parse in chunks | CLI tools emitting > 100 lines/second |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing user input (feature name, chat messages) to CLI via shell interpolation | Shell injection: user types `; rm -rf /` as a feature name | Always use `spawn()` with args array, never `exec()` or `shell: true`. Sanitize feature names to alphanumeric + hyphens |
| Exposing raw CLI error output (stderr) to frontend | Information disclosure: file paths, environment variables, API keys in error messages | Sanitize stderr before sending via WebSocket. Strip absolute paths, redact env vars, show generic error with debug ID |
| WebSocket without origin checking | Any browser tab can connect to the localhost WebSocket | Validate `Origin` header on WebSocket upgrade. Only accept connections from the expected localhost origin |
| Serving on 0.0.0.0 instead of 127.0.0.1 | LAN exposure: anyone on the network can access the IDE and execute CLI commands | Bind to `127.0.0.1` explicitly. Never default to `0.0.0.0` even for "convenience" |
| SQLite database accessible via API without validation | Data exfiltration or corruption via crafted API requests | Even on localhost, validate all API inputs. Use parameterized queries. Never interpolate into SQL |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback between button click and CLI output appearing | User clicks "Approve Plan" then stares at static UI for 5-30 seconds, clicks again | Immediately show "Starting..." state, disable button, show progress spinner. HTTP 202 response confirms operation started |
| Auto-scrolling chat during output streaming | User scrolling up to read earlier messages gets yanked back to bottom | Only auto-scroll if user is already at bottom. Detect scroll position before appending. Show "New messages below" indicator |
| Replacing editor content on every file change | Cursor jumps to start, selection lost, undo history destroyed, user feels the editor is "fighting" them | In read-only mode: apply minimal DOM updates. In edit mode: never auto-replace, notify of external changes instead |
| Kanban card state transitions without animation | Tasks jump between columns, user cannot track what changed | Animate card movements between columns. Brief highlight on state change. Use `layoutId` animation (Framer Motion) or CSS transitions |
| Error messages as technical stack traces | User sees "ENOENT: no such file or directory, open '/home/user/specs/...'" | Map known errors to human-readable messages: "Spec file not found. Run /specify first to create it." Keep technical details in an expandable section |
| Pipeline stage changes without context | Stage advances from "Plan" to "Tasks" but user does not understand why | Show a brief transition message: "Plan approved. Generating tasks..." as a system message in the chat panel |

## "Looks Done But Isn't" Checklist

- [ ] **CLI process management:** Often missing graceful shutdown on server stop -- verify all child processes are killed when the server receives SIGTERM
- [ ] **File watcher:** Often missing `awaitWriteFinish` config -- verify that rapid writes (10 writes/second to same file) result in exactly one stable content push to frontend
- [ ] **WebSocket reconnection:** Often missing state reconciliation -- verify that disconnecting for 30 seconds during a CLI operation, then reconnecting, shows correct final state
- [ ] **TipTap markdown:** Often missing round-trip test -- verify that opening and saving a spec-kit artifact produces byte-identical output (or document exact differences)
- [ ] **Kanban parsing:** Often missing edge cases in tasks.md format -- verify parsing handles: empty phases, tasks with special characters, nested sub-tasks, tasks with no phase header
- [ ] **Error handling:** Often missing CLI spawn failure path -- verify behavior when spec-kit or GSD binary is not found (ENOENT), not executable (EACCES), or returns non-zero exit code
- [ ] **Concurrent operations:** Often missing operation locking -- verify that clicking "Approve" twice rapidly does not spawn two CLI processes for the same stage
- [ ] **Server restart:** Often missing state recovery -- verify that stopping and starting the server during a CLI operation does not leave phantom processes or corrupt state
- [ ] **Large files:** Often missing performance testing -- verify that a 500-line tasks.md or 2000-line plan.md does not cause noticeable UI lag when loaded or re-parsed
- [ ] **Browser refresh:** Often missing client state recovery -- verify that refreshing the browser shows the correct current state (pipeline stage, open documents, kanban positions)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Zombie CLI processes | LOW | Kill orphans via `pkill -f speckit` / `pkill -f gsd`. Restart server. Process registry rebuilds from scratch |
| SQLite diverged from tasks.md | LOW | Call reconciliation endpoint or restart server (triggers full re-parse on startup). SQLite is a cache -- rebuilding is non-destructive |
| TipTap destroyed user edits | MEDIUM | If edits were saved to disk before overwrite: `git diff` or `git stash` recovers them. If never saved: edits are lost. Prevention is the only real strategy |
| WebSocket state divergence | LOW | Full browser refresh triggers reconnect + snapshot, which resets all client state from server. This is the "escape hatch" |
| CLI output parser broken by update | MEDIUM | Roll back CLI tool version. Fix parser adapter. This is why the adapter pattern matters -- changes are isolated to one module |
| Filesystem watcher missing events | LOW | Manual browser refresh forces full state reload. Add a "Refresh" button in the UI that triggers full reconciliation without page reload |
| Infinite watcher loop (CLI write -> watch -> CLI write) | HIGH | Requires identifying and breaking the loop. May need server restart. Prevention (mute window during known writes) is critical. Recovery is messy because state may be partially updated |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Zombie/orphan CLI processes | Phase 1: Backend foundation | Integration test: kill server mid-operation, verify no orphan processes remain |
| File watcher race conditions | Phase 1: Backend foundation | Integration test: write 50KB file in 100 chunks, verify single stable event emitted |
| TipTap markdown round-trip loss | Phase 2: Document editor | Fixture test: round-trip every markdown construct used by spec-kit, assert fidelity |
| WebSocket state divergence | Phase 1: WebSocket protocol | Integration test: disconnect, trigger state changes, reconnect, verify snapshot accuracy |
| CLI output parsing brittleness | Phase 1: CLI integration | Adapter unit tests with fixture stdout/stderr from each CLI tool version |
| SQLite vs tasks.md divergence | Phase 2: Kanban board | Integration test: modify tasks.md externally, verify SQLite matches after watcher fires |
| Editor reload destroying edits | Phase 2: Document editor | E2E test: type in editor, modify file externally, verify conflict notification appears |
| Event ordering violations | Phase 1: WebSocket protocol | Integration test: emit events from CLI + watcher simultaneously, verify frontend receives in causal order |
| Long-running CLI blocking Express | Phase 1: API design | Load test: approve operation + spam other API endpoints, verify < 200ms response time on non-CLI requests |
| Chokidar platform differences | Phase 1: Backend foundation | CI runs file watcher tests on Linux (matching deployment target) |

## Sources

- Node.js official documentation: `child_process` module (verified via WebFetch -- comprehensive warnings about zombie processes, PID recycling, exit/close event ordering, signal handling, maxBuffer encoding, shell injection)
- ProseMirror/TipTap ecosystem: known limitations of markdown-to-document-model round-trips (training data, HIGH confidence -- this is a well-documented and fundamental limitation of any markdown-AST-markdown pipeline)
- Chokidar GitHub repository: known issues with v3-to-v4 migration, `awaitWriteFinish` behavior, inotify limits on Linux (training data, HIGH confidence)
- WebSocket reconnection patterns: standard practices for state reconciliation in real-time applications (training data, HIGH confidence -- snapshot-on-reconnect is an established pattern)
- SpecFlow IDE Constitution v1.0.0: Principle I (file-system truth) directly informs pitfalls 2, 3, 6, and 7

---
*Pitfalls research for: Web IDE with CLI orchestration, filesystem-driven state, WebSocket streaming, TipTap markdown editing*
*Researched: 2026-03-24*

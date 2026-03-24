# Feature Research

**Domain:** Spec-first / document-centric development workflow IDE
**Researched:** 2026-03-24
**Confidence:** MEDIUM (training data on competitor products through early 2025; no live web search available to verify latest feature sets)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or unusable.

#### Chat / Command Panel

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Streaming chat output | Cursor, Windsurf, Copilot Chat all stream token-by-token. Users expect real-time feedback, not a spinner then a wall of text. | MEDIUM | Must parse structured CLI events from spec-kit stdout into streaming WebSocket messages. Not raw LLM token streaming -- it is stage-transition streaming. |
| Command invocation via chat | Cursor uses slash commands (/edit, /explain). Linear has slash commands for actions. Users expect typing a command triggers real work. | MEDIUM | Map /specify, /clarify, /plan, /tasks to backend CLI invocations. Chat input must feel like a command palette, not just a message box. |
| Chat history persistence | Every chat tool persists conversation history. Losing context on refresh = broken. | LOW | Store in SQLite or flat file. Key: history must be per-feature since SpecFlow is single-feature-at-a-time. |
| Clear activity/progress indicators | Cursor shows "Thinking...", "Applying...", "Done". Users need to know what the system is doing. | LOW | Stage transitions from spec-kit map naturally: "Generating spec...", "Running clarification...", "Building plan..." |
| Error display with actionable context | When a CLI command fails, users need to understand what went wrong and what to do. Not a stack trace -- a human sentence. | MEDIUM | Parse stderr, map known error patterns to friendly messages. Include "Retry" or "Edit and retry" actions. |
| Clickable artifact references in chat | Cursor makes file references clickable. Chat messages that mention spec.md or plan.md must link to the doc editor. | LOW | Regex match artifact paths in structured events, wrap in clickable links that open the doc editor tab. |

#### Document Editor

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Markdown rendering and editing | TipTap/ProseMirror is the chosen approach. Users expect rich markdown with headings, lists, code blocks, tables, checkboxes. | MEDIUM | TipTap StarterKit covers most. Tables and task lists need additional extensions. Core requirement per PROJECT.md. |
| Live file sync (editor reflects disk changes) | VS Code reloads when files change externally. Constitution Principle I mandates file-system truth. If a CLI command rewrites spec.md, the editor must show the new content immediately. | HIGH | fs.watch on backend, push diffs via WebSocket. Must handle: editor has unsaved changes when file changes on disk (conflict resolution). This is the hardest table-stakes feature. |
| Multiple document tabs | VS Code, Notion, every editor supports tabs. Users switch between spec.md, plan.md, tasks.md constantly. | MEDIUM | Tab bar with open documents. Auto-open when artifact is created. Close manually. Track which tabs are open per feature. |
| Read-only vs editable modes | Some artifacts are CLI-generated (spec.md from /specify). Editing them directly could desync from the tool's expected format. Need clear read-only indicator for generated content vs user-editable content. | LOW | Visual indicator (lock icon, muted background). Allow override to edit mode with a warning. |
| Basic search within document | Cmd+F in any editor. Users expect it. | LOW | TipTap supports this via ProseMirror search plugin or browser-native Cmd+F. Minimal custom work. |
| Undo/redo | Non-negotiable in any editor. | LOW | TipTap provides this out of the box via ProseMirror's history plugin. |

#### Pipeline / Workflow

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visual stage indicator | Linear shows issue status progression. Jira has workflow boards. Users need to see where they are in the specify > clarify > plan > tasks > implement > verify > ship pipeline. | LOW | Horizontal bar or breadcrumb with stage highlighting. Current stage is active, past stages are complete, future stages are dimmed. |
| Approval gates with clear actions | The core value prop. "Approve Plan" button that triggers /speckit.tasks. This is what separates SpecFlow from running CLI commands manually. | MEDIUM | Each gate maps to: display artifact for review, show Approve/Reject buttons, Approve triggers next CLI command, Reject opens chat for feedback. |
| Rejection with feedback loop | User rejects a plan, types feedback, system re-runs the stage with context. This is the core human-in-the-loop pattern. | MEDIUM | On reject: focus chat panel, pre-fill with rejection context, re-invoke current stage command with appended feedback. |
| Stage history / audit trail | Users want to know when they approved what. Linear tracks status changes. Even simple timestamp logging matters. | LOW | SQLite table: feature_id, stage, action (approve/reject), timestamp, optional note. Display in a collapsible section. |

#### Kanban Board

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Task cards parsed from tasks.md | The whole point of the kanban panel. Parse checkbox format from tasks.md into visual cards grouped by phase. | HIGH | Parsing tasks.md format (phases as headers, checkboxes as tasks, [P] flags, [US1] labels) into structured data. Must handle the spec-kit template format precisely. |
| Real-time task status updates | When GSD marks a task done (checkbox in tasks.md), the card must update live. | MEDIUM | fs.watch on tasks.md, parse diff, push card update via WebSocket. Depends on live file sync infrastructure. |
| Phase grouping | tasks.md groups by phase (Setup, Foundational, User Story 1, etc.). Kanban must reflect this grouping as columns or swimlanes. | LOW | Direct mapping from parsed phase headers to kanban columns. |
| Task metadata display | Each card should show: task ID, parallelizable flag [P], user story assignment [US1], file paths mentioned. | LOW | All extracted during tasks.md parsing. Display as badges/tags on cards. |

#### General UX

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Resizable panels | VS Code, Cursor, every panel-based IDE supports drag-to-resize. Three-panel layout must be user-adjustable. | MEDIUM | CSS flexbox/grid with drag handles. Persist layout preference to localStorage. PROJECT.md explicitly requires user-driven layout. |
| Keyboard shortcuts | Cmd+K for command palette, Cmd+S for save, etc. Power users expect keyboard-driven workflow. | MEDIUM | Start with essentials: focus panels (Cmd+1/2/3), trigger approval (Cmd+Enter), open command palette. Expand later. |
| WebSocket reconnection | Network hiccups happen. Users expect the app to reconnect without losing state. | MEDIUM | Exponential backoff reconnection. On reconnect, reconcile state by re-reading all artifact files (PROJECT.md requirement). |
| Responsive error boundaries | React error boundaries so one panel crashing does not take down the whole app. | LOW | Wrap each panel in an error boundary with "Something went wrong, reload panel" fallback. |
| Feature selector / switcher | Single feature at a time, but users need to switch between features or start a new one. | LOW | Dropdown or sidebar listing specs/ subdirectories. Selecting one loads its artifacts into all panels. |

### Differentiators (Competitive Advantage)

Features that set SpecFlow IDE apart from running CLI tools in a terminal, or from using generic project management + code editor combos.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Approval-driven workflow automation | The killer feature. Clicking "Approve Plan" triggers the next pipeline stage automatically. No other tool maps approval buttons to CLI orchestration of AI coding agents. Cursor/Windsurf have chat. Linear has boards. Nothing bridges human approval gates to automated spec-first execution. | MEDIUM | This is already in PROJECT.md requirements. The differentiator is making it feel seamless -- not "I clicked a button and now I wait", but "I clicked Approve and I can watch the next stage execute in real-time." |
| Structured CLI event streaming | Instead of raw terminal output, SpecFlow parses CLI events into semantic UI: stage transitions become pipeline bar updates, artifact creation becomes "New file: plan.md [Open]" in chat, progress becomes a progress indicator. No other tool does this for spec-kit/GSD. | HIGH | Requires defining a structured event protocol between backend and frontend. The backend CLI parser is the core innovation -- turning unstructured stdout into typed WebSocket events. |
| Document-artifact-task unity | spec.md, plan.md, and tasks.md are visible simultaneously across three panels. Changes to one are immediately reflected. No context switching between a project management tool, a doc editor, and a terminal. Linear + Notion + Terminal in one window, but integrated. | MEDIUM | The three-panel layout with live sync already covers this. The differentiator is the integration -- clicking a task card highlights the relevant section in plan.md, viewing a spec section shows related tasks. |
| GSD agent activity overlay on kanban cards | When GSD is executing a task, the kanban card shows live activity: "Attempt 1/3", "Running tests...", "Blocked: test failure". No kanban tool shows AI agent execution state on task cards. | HIGH | Requires parsing GSD executor events and mapping them to specific task IDs. Must handle: multiple events per task, retry state, blocked state, success/failure. |
| Rejection-feedback-retry loop | User rejects an artifact, types feedback, and the system automatically re-invokes the stage with that feedback as context. This closes the human-AI feedback loop without copy-pasting between tools. | MEDIUM | Chat panel pre-fills with rejection context. Backend appends feedback to CLI invocation arguments. Re-executes the current stage. UI shows "Revision 2" indicator. |
| Pipeline stage visualization with time tracking | Show not just where you are in the pipeline, but how long each stage took. "Specify: 2m, Clarify: 5m (2 rounds), Plan: 8m, Awaiting approval..." Gives the human a sense of progress and bottleneck visibility. | LOW | Timestamps from stage transitions already needed for audit trail. Just render them visually on the pipeline bar. |
| Artifact diff view on approval | When reviewing an artifact for approval, show what changed since the last version (especially after rejection-feedback cycles). Cursor shows diffs inline. Apply the same to spec artifacts. | MEDIUM | Store previous artifact version before re-generation. Show inline diff in the doc editor (TipTap can render diff markers). Helps the user understand what the AI changed in response to feedback. |
| Cross-artifact navigation | Click a requirement ID in spec.md, jump to where it's addressed in plan.md. Click a task in kanban, highlight the plan section it implements. Bidirectional linking between spec, plan, and tasks. | HIGH | Requires parsing artifact structure (requirement IDs, section references, task-to-plan mappings). Build a lightweight link index. This is a v1.x feature, not MVP. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. SpecFlow IDE should deliberately NOT build these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Integrated code editor (Monaco/CodeMirror as primary panel) | "I want to see the code being written." Cursor and Windsurf are code-first, so users expect it. | Violates Constitution Principle II (Document-Centric, Not Code-Centric). Adding a code editor as a primary panel pulls the user out of the spec-approval role and into line-by-line code review, which is the AI agent's job. Also massively increases complexity -- Monaco alone is a large dependency. | Drill-down code view from task cards. Small, read-only code viewer that opens when you click "View implementation" on a specific task. Not a panel -- a modal or slide-over. |
| Inline AI chat in the document editor | "Let me ask AI questions about this paragraph." Notion AI, Cursor inline chat. | SpecFlow's AI interaction happens through the chat panel, which maps to CLI commands. Inline AI would either duplicate the chat panel's functionality or require a separate AI integration (violating Principle III -- Orchestration Not Reimplementation). It also creates two interaction paths for the same thing. | Chat panel with document context. When the user selects text in the doc editor, the chat panel auto-populates with that selection as context for the next command. |
| Real-time multi-user collaboration | "Google Docs style -- multiple people editing at once." | SpecFlow is a localhost, single-user tool. Adding CRDT-based collaboration (Yjs, Automerge) is enormous complexity for a tool designed for one person managing one feature at a time. The files on disk are the collaboration mechanism (via git). | Git-based async collaboration. Users work on different features on different branches. The file-system-first approach means standard git workflows handle collaboration. |
| Custom workflow / pipeline editor | "Let me define my own stages." | The specify > clarify > plan > tasks > implement > verify > ship pipeline IS the product. Making it customizable means the tool loses its opinionated value. It also means every UI component must handle arbitrary stages, massively increasing complexity. | Configuration for optional stages. Allow skipping stages (e.g., skip clarify if spec is clear enough) via a simple toggle, not a drag-and-drop workflow builder. |
| Plugin / extension system | "Let me add custom panels, commands, integrations." VS Code's extension API. | Plugin systems are products unto themselves. VS Code spent years on their extension API. For a v1 localhost tool, the extension point is the CLI -- users extend by adding new CLI tools that SpecFlow can invoke. | CLI-as-extension-point. Any CLI tool that follows a simple output protocol can be integrated. Document the protocol so users can add custom tools. |
| Drag-and-drop task reordering on kanban | "Let me drag tasks between phases or reorder them." Every kanban tool (Trello, Linear, Jira) supports this. | tasks.md is the source of truth (Principle I). Drag-and-drop would require writing back to tasks.md, which means SpecFlow is now a task editor competing with the /speckit.tasks command. Task ordering is determined by the spec-kit workflow, not manual arrangement. | Read-only kanban that reflects tasks.md. If the user wants to reorder tasks, they edit tasks.md in the doc editor (which persists to disk) or re-run /speckit.tasks. |
| Notification system / toasts for everything | "Notify me when the AI finishes, when a file changes, when a stage completes." | Notification fatigue. In a single-feature, single-user tool where the user is actively watching execution, every state change is already visible in the panels. Toasts would overlay the content and add noise. | Panel-local indicators. The pipeline bar updates for stage changes. The kanban cards update for task changes. The chat panel shows completion messages. Each panel handles its own state feedback. |
| Dark/light theme toggle and custom theming | "I want dark mode." Every modern dev tool has this. | Scope creep for v1. Tailwind CSS makes this achievable later, but building a theme system with CSS variables, toggle UI, persistence, and testing doubles the CSS surface area for launch. | Ship with one good dark theme (developers overwhelmingly prefer dark). Add light theme as a v1.x feature with Tailwind's dark: variant when there is user demand. |
| Mobile / tablet responsive layout | "I want to check on my phone." | Three-panel layout does not work on small screens. The document editor needs width. The kanban needs columns. Responsive design for this layout would require a completely different mobile UI, not just CSS breakpoints. PROJECT.md already scopes this out. | Desktop-only SPA. Explicitly state minimum viewport width (1280px). Revisit mobile as a separate product if needed. |
| Full-text search across all features/specs | "Search all my specs for a keyword." VS Code search across files. | For v1 with single-feature focus, searching the three open artifacts is sufficient. Cross-feature search requires indexing all specs/ directories, building a search UI, and handling result navigation. Premature for a tool focused on one feature at a time. | In-document search (Cmd+F) plus feature selector dropdown that shows feature names. If the user needs to find something across features, they can use their terminal (grep) or switch features. |

## Feature Dependencies

```
[WebSocket Infrastructure]
    |-- requires --> [Backend Process Spawning]
    |-- enables --> [Live File Sync]
    |                   |-- enables --> [Doc Editor Live Reload]
    |                   |-- enables --> [Kanban Real-time Updates]
    |-- enables --> [Structured Event Streaming]
    |                   |-- enables --> [Chat Activity Indicators]
    |                   |-- enables --> [Pipeline Bar Updates]
    |                   |-- enables --> [GSD Agent Activity on Cards]

[CLI Process Management]
    |-- requires --> [Backend Process Spawning]
    |-- enables --> [Chat Command Invocation]
    |                   |-- enables --> [Approval Gate Triggers]
    |                   |-- enables --> [Rejection Feedback Loop]

[tasks.md Parser]
    |-- requires --> [Markdown Parsing Library]
    |-- enables --> [Kanban Board]
    |-- enables --> [Task Metadata Display]

[TipTap Editor Setup]
    |-- requires --> [TipTap + Extensions]
    |-- enables --> [Document Tabs]
    |-- enables --> [Read-only Mode]
    |-- enables --> [Artifact Diff View] (v1.x)

[Three-Panel Layout]
    |-- requires --> [Resizable Panels]
    |-- enables --> [Chat Panel]
    |-- enables --> [Doc Editor Panel]
    |-- enables --> [Kanban Panel]

[Feature State Management]
    |-- requires --> [SQLite Setup]
    |-- enables --> [Stage History / Audit Trail]
    |-- enables --> [Chat History Persistence]
    |-- enables --> [Pipeline Stage Tracking]
```

### Dependency Notes

- **WebSocket Infrastructure requires Backend Process Spawning:** The WebSocket layer streams events generated by spawned CLI processes. Build the process spawner first, then add WebSocket event forwarding.
- **Live File Sync enables both Doc Editor and Kanban updates:** A single fs.watch mechanism on the specs/ directory feeds both panels. Build the watcher once, fan out to consumers.
- **CLI Process Management enables all approval/rejection features:** The ability to invoke CLI commands from the backend is prerequisite to the entire approval gate system.
- **tasks.md Parser is independent of live sync:** Parsing can be built and tested standalone against fixture files before connecting to the live file watcher.
- **TipTap Editor Setup is independent of backend:** The document editor can be built with static files while the backend is being developed. Connect live sync later.
- **GSD Agent Activity on Cards conflicts with simple Kanban:** Adding agent activity streaming to kanban cards significantly increases card complexity. Build basic kanban first, add activity overlay as a separate phase.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to validate that a visual spec-first workflow is better than running CLI commands in a terminal.

- [ ] **Three-panel layout with resizable panels** -- the foundational UI shell
- [ ] **Chat panel with command invocation** -- type /specify, /clarify, /plan, /tasks and see structured streaming output
- [ ] **Clickable artifact links in chat** -- chat output references open in doc editor
- [ ] **TipTap document editor with tabs** -- render and edit spec.md, plan.md, tasks.md with markdown support
- [ ] **Live file sync from disk to editor** -- when CLI rewrites an artifact, editor updates within one render cycle
- [ ] **Pipeline bar with stage indicator** -- visual breadcrumb showing current workflow stage
- [ ] **Approval gates (Approve/Reject buttons)** -- approve triggers next stage CLI command, reject opens chat for feedback
- [ ] **Basic kanban parsed from tasks.md** -- cards grouped by phase, checkbox status reflected
- [ ] **WebSocket infrastructure with reconnection** -- real-time event delivery with graceful reconnect
- [ ] **Feature selector** -- pick which spec to work on from specs/ directory

### Add After Validation (v1.x)

Features to add once the core workflow is proven valuable.

- [ ] **Chat history persistence** -- when users start losing context across sessions
- [ ] **Stage history / audit trail** -- when users want to review their approval decisions
- [ ] **GSD agent activity on kanban cards** -- when users report feeling blind during implementation
- [ ] **Artifact diff view on approval** -- when users report difficulty reviewing revisions after rejection-feedback cycles
- [ ] **Keyboard shortcuts** -- when power users report mouse fatigue
- [ ] **Cross-artifact navigation** -- when users report friction jumping between related sections of spec/plan/tasks
- [ ] **Pipeline time tracking** -- when users want to understand bottleneck stages
- [ ] **Error recovery UI** -- retry buttons, "last known good" artifact restore

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Desktop packaging (Electron/Tauri)** -- only if localhost-via-browser proves painful for daily use
- [ ] **Multi-feature concurrency** -- only if single-feature-at-a-time proves too limiting for real projects
- [ ] **Light theme** -- only if there is user demand beyond developer defaults
- [ ] **CLI-as-extension protocol** -- only if users want to integrate non-speckit/GSD tools
- [ ] **Task dependency visualization** -- only if the text-based dependency section in tasks.md proves insufficient
- [ ] **Drill-down code viewer** -- only if users genuinely need to glance at implementation without leaving SpecFlow

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Three-panel resizable layout | HIGH | MEDIUM | P1 |
| Chat panel with CLI invocation | HIGH | HIGH | P1 |
| Streaming structured events | HIGH | HIGH | P1 |
| TipTap markdown editor with tabs | HIGH | MEDIUM | P1 |
| Live file sync (disk to editor) | HIGH | HIGH | P1 |
| Pipeline bar with stage indicator | HIGH | LOW | P1 |
| Approval gates (Approve/Reject) | HIGH | MEDIUM | P1 |
| Kanban parsed from tasks.md | HIGH | MEDIUM | P1 |
| WebSocket infrastructure + reconnect | HIGH | MEDIUM | P1 |
| Feature selector | MEDIUM | LOW | P1 |
| Clickable artifact links in chat | MEDIUM | LOW | P1 |
| Error display with actionable context | MEDIUM | MEDIUM | P1 |
| Chat history persistence | MEDIUM | LOW | P2 |
| Stage history / audit trail | MEDIUM | LOW | P2 |
| Read-only mode indicator | MEDIUM | LOW | P2 |
| Keyboard shortcuts | MEDIUM | MEDIUM | P2 |
| GSD agent activity on cards | HIGH | HIGH | P2 |
| Artifact diff view on approval | MEDIUM | MEDIUM | P2 |
| Rejection-feedback auto-context | MEDIUM | MEDIUM | P2 |
| Cross-artifact navigation | MEDIUM | HIGH | P3 |
| Pipeline time tracking | LOW | LOW | P3 |
| Drill-down code viewer (modal) | LOW | MEDIUM | P3 |
| Task dependency visualization | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- validates the core proposition that visual spec-first workflow beats CLI
- P2: Should have -- improves the workflow but not required to test the concept
- P3: Nice to have -- future consideration after core is proven

## Competitor Feature Analysis

| Feature | Cursor IDE | Windsurf (Codeflare) | Linear | Notion | SpecFlow IDE Approach |
|---------|-----------|---------|--------|--------|----------------------|
| **AI Chat Panel** | Inline + sidebar chat, multi-model, context-aware code generation | "Cascade" flow-based AI with persistent context across files | No AI chat (issue tracker, not IDE) | Notion AI for document Q&A and generation | Chat panel that invokes spec-kit CLI commands. Not a general AI chat -- purpose-built for the spec workflow. |
| **Document Editor** | Monaco (code editor), not document-focused | Monaco (code editor) | Minimal rich text in issue descriptions | Full block-based editor (their core product) | TipTap rich markdown editor. Closer to Notion's doc editing than Cursor/Windsurf's code editing. Document is primary, not secondary. |
| **Task Management** | None built-in | None built-in | Full issue tracker with boards, views, cycles, projects | Databases with kanban/table/timeline views | Kanban board parsed from tasks.md. Read-only reflection of spec-kit output, not a general-purpose issue tracker. |
| **Workflow Pipeline** | None -- agent runs until done or user stops it | "Cascade" has implicit steps but no visible pipeline | Workflows with custom states and automations | No built-in workflow beyond status properties | Explicit 8-stage pipeline bar with approval gates. This is the core differentiator -- visible, opinionated workflow. |
| **Approval Gates** | "Apply" button to accept AI changes (code-level) | "Accept/Reject" for individual code changes | Status transitions on issues (manual) | None | Spec-level approval that triggers next pipeline stage. Not code-level -- document-level. |
| **File System Integration** | Full project file tree, git integration | Full project file tree, git integration | GitHub/GitLab integration for PRs | None (cloud-only) | File-system-as-truth for spec artifacts only. No general file tree -- just the spec/plan/tasks for current feature. |
| **Real-time Updates** | Live code diff preview | Live code changes | Real-time sync across team | Real-time multiplayer | WebSocket push of file changes and agent activity. Single-user, but real-time file-to-UI sync. |
| **Streaming Output** | Token-by-token AI response streaming | Token-by-token with "thinking" indicators | N/A | Streamed AI responses | Structured event streaming from CLI. Not token-level -- semantic events (stage started, artifact created, task completed). |

### Key Competitive Insight

SpecFlow IDE occupies a unique niche: it is not competing with Cursor/Windsurf on code editing, not competing with Linear on issue tracking, and not competing with Notion on document collaboration. It competes with the **workflow of using all three tools together plus a terminal**. The value is integration and automation of the spec-first lifecycle, not excellence in any single panel. Each panel should be "good enough" (not best-in-class) and the integration between them should be excellent.

## Sources

- Cursor IDE feature set: based on training data through early 2025 (Cursor Composer, Tab, Chat, multi-file editing, Apply button). MEDIUM confidence -- features may have changed.
- Windsurf / Codeflare: based on training data through early 2025 (Cascade flow, Supercomplete, multi-file edits). MEDIUM confidence -- rapid iteration product.
- Linear: based on training data through early 2025 (issues, projects, cycles, views, workflows, keyboard-first design). HIGH confidence -- stable feature set.
- Notion: based on training data through early 2025 (blocks, databases, AI, pages, teamspaces). HIGH confidence -- stable feature set.
- TipTap editor capabilities: based on training data (StarterKit, extensions, collaboration, markdown support). HIGH confidence -- well-documented library.
- Spec-kit and GSD workflow: based on project files read during research (constitution, templates, PROJECT.md). HIGH confidence -- primary source.

---
*Feature research for: Spec-first / document-centric development workflow IDE*
*Researched: 2026-03-24*

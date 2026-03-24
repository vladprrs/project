# SpecFlow IDE

## What This Is

A web-based document-centric interface for spec-first AI-assisted development. Users manage the full feature lifecycle (specify, clarify, plan, tasks, implement, verify, analyze, ship) through three integrated panels: a chat interface for commanding spec-kit and GSD CLI tools, a markdown document editor for validating spec artifacts, and a kanban task board parsed from tasks.md. The human focuses on writing specs, answering clarification questions, and approving plans. Everything else is automated by orchestrating existing coding agents through Spec Kit and GSD.

## Core Value

The IDE maps human decisions (approve, reject, refine) to concrete CLI tool invocations, making the spec-first workflow accessible without memorizing commands or managing terminal sessions.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Chat panel invokes spec-kit CLI commands (/specify, /clarify, /plan, /tasks) via backend orchestration
- [ ] Chat shows structured streaming events (stage transitions, progress messages, artifact creation) parsed from CLI output — not raw stdout
- [ ] Chat messages include clickable links to created/updated artifacts that open in the doc editor
- [ ] Document editor renders spec.md, plan.md, and tasks.md using TipTap with markdown support
- [ ] Document editor live-reloads when artifact files change on disk (filesystem watch via backend WebSocket push)
- [ ] Document editor tabs open automatically when a new artifact is created by a CLI command
- [ ] Pipeline bar displays current workflow stage (specify → clarify → plan → tasks → implement → verify → ship)
- [ ] Pipeline bar shows explicit approval gates (e.g., "Approve Plan") that trigger the next CLI command when clicked
- [ ] Approval records lightweight IDE state (timestamp, stage) for pipeline tracking
- [ ] Rejection loops: user types feedback in chat, IDE re-invokes the current stage command with updated context
- [ ] Kanban board parses tasks.md checkbox format into cards grouped by phase/status
- [ ] Kanban cards update in real-time via WebSocket when GSD executor marks tasks done
- [ ] GSD agent activity events (task started, attempt N, blocked) stream to kanban cards
- [ ] WebSocket reconnection with one-time filesystem reconciliation as polling fallback
- [ ] User-driven panel layout (resize/drag) — no auto-focus, layout stays where user puts it
- [ ] Single active feature at a time — clear focus, simple state
- [ ] Backend spawns CLI processes, parses markdown artifacts, streams structured events via WebSocket
- [ ] Spec artifacts stored on filesystem (specs/<feature>/) as the single source of truth
- [ ] SQLite stores kanban task state (status, timestamps, metadata) derived from tasks.md
- [ ] Shareable MVP: clone, npm install, npm start — works with user's own spec-kit/GSD setup

### Out of Scope

- Desktop packaging (Electron/Tauri) — web on localhost first, desktop later
- Multi-feature concurrency — one active feature at a time keeps state simple
- Code editor / diff viewer in main panels — code is drill-down only, not primary viewport
- User authentication — localhost tool, no login needed
- Custom theme system — Tailwind defaults, refinement deferred
- Mobile responsive — desktop-only SPA

## Context

SpecFlow IDE sits on top of two existing CLI tool ecosystems:

- **Spec Kit** (speckit): A spec-first development toolkit that generates and manages spec artifacts (spec.md, plan.md, tasks.md) through slash commands (/speckit.specify, /speckit.clarify, /speckit.plan, /speckit.tasks). Artifacts live in `specs/<feature>/` directories.

- **GSD (Get Shit Done)**: A project execution framework that creates roadmaps, plans phases, executes tasks via coding agents, and verifies deliverables. Uses `.planning/` directory for state.

Both tools are CLI-first. SpecFlow IDE wraps them in a visual interface that makes implicit workflow gates explicit and translates human decisions into tool invocations.

The spec-first lifecycle stages:
1. **Specify** — generate spec.md from a feature description
2. **Clarify** — ask targeted questions, encode answers into spec
3. **Plan** — generate plan.md with design artifacts (GATE: user approves plan)
4. **Tasks** — decompose plan into tasks.md (GATE: user approves tasks)
5. **Implement** — GSD executes tasks via coding agents
6. **Verify** — check deliverables against spec
7. **Analyze** — cross-artifact consistency analysis
8. **Ship** — PR creation and merge

The pipeline bar makes these stages and their gates visible. Chat commands and approval buttons drive transitions between stages.

## Constraints

- **Tech stack**: React + TypeScript + Vite frontend, Node.js + TypeScript + Express backend, TipTap editor, Tailwind CSS, SQLite, WebSocket — per constitution
- **Orchestration only**: MUST call spec-kit and GSD via CLI. Never vendor or reimplement their logic — per constitution Principle III
- **File-system truth**: UI state MUST derive from spec artifacts on disk. No divergent UI state — per constitution Principle I
- **Document-centric**: Primary panels show spec artifacts, not source code — per constitution Principle II
- **Single feature**: One active feature at a time. No parallel feature workflows
- **CLI parsing**: Backend parses CLI stdout/stderr into structured WebSocket events. Frontend never sees raw terminal output

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TipTap over CodeMirror/Monaco | ProseMirror-based, markdown-native, better for document editing vs code editing | — Pending |
| Express over Fastify | Broader ecosystem, more middleware options, team familiarity | — Pending |
| SQLite for task state | Zero-config, file-based, sufficient for single-user localhost tool | — Pending |
| User-driven layout over auto-focus | Simpler to implement, respects user preference, avoids jarring layout shifts | — Pending |
| Single feature scope | Eliminates concurrent state management complexity for v1 | — Pending |
| WebSocket push over polling | Real-time kanban updates during GSD execution, with polling fallback on disconnect | — Pending |
| Structured events over raw CLI output | Cleaner UX, enables semantic actions (clickable artifact links, progress bars) | — Pending |
| Approval = CLI trigger | Makes implicit terminal workflow gates explicit; "Approve Plan" → run /speckit.tasks | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-24 after initialization*

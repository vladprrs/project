# Research Summary: SpecFlow IDE

**Domain:** Document-centric web IDE with CLI orchestration
**Researched:** 2026-03-24
**Overall confidence:** HIGH (architecture, pitfalls) / MEDIUM (exact library versions)

## Executive Summary

SpecFlow IDE wraps two existing CLI ecosystems (Spec Kit, GSD) in a three-panel web interface: chat for commands, TipTap editor for spec artifacts, and kanban board parsed from tasks.md. Research across stack, features, architecture, and pitfalls converges on a clear picture: the prescribed tech stack is sound, the feature scope is well-defined, and the critical risks are concentrated in three areas — CLI process lifecycle, filesystem watch reliability, and TipTap markdown round-trip fidelity.

## Key Findings

### Stack

React 19 + Vite + TipTap 2 + Express 4 + ws + better-sqlite3 + drizzle-orm + chokidar 4 + execa 9 + unified/remark. Standard, well-proven combination.

**Critical decision:** chokidar 4 and execa 9 are ESM-only. The backend MUST use `"type": "module"` from day one. Retrofitting CJS→ESM mid-project is expensive.

**Key pairings:**
- better-sqlite3 + drizzle-orm (driver + type-safe query builder — complementary, not competing)
- ws over socket.io (zero-dependency, 2-3x faster, socket.io's rooms/namespaces irrelevant for single-user localhost)
- unified/remark for server-side markdown AST parsing (need AST traversal for tasks.md, not HTML rendering)
- tiptap-markdown for editor-side serialization (community dependency — maintenance status needs verification)

### Features

**Table stakes:** Streaming chat output, command invocation, live file sync in editor, multi-tab documents, pipeline stage indicator, approval gates, kanban from tasks.md, resizable panels, WebSocket reconnection, error boundaries.

**Killer differentiator:** Approval-driven workflow automation. No competing tool maps document-level approve/reject buttons to automated CLI pipeline progression. Cursor/Windsurf have code-level accept/reject. Linear has manual status transitions. SpecFlow uniquely bridges human approval to spec-first AI execution.

**Second differentiator:** Structured CLI event streaming — parsing spec-kit output into semantic WebSocket events (stage transitions, artifact creation, progress) rather than showing raw stdout.

**Anti-features to enforce:** No Monaco code editor as primary panel (violates Principle II), no inline AI in doc editor (violates Principle III), no drag-and-drop kanban reordering (violates Principle I — tasks.md is source of truth).

### Architecture

**Backend components:** Process Manager (spawn/kill/parse CLI lifecycle), File Watch Service (chokidar + debounce), WebSocket Hub (channel-multiplexed: cli, fs, pipeline channels), Pipeline Controller (stage machine + approval gates), Service Layer (Artifact, Task, Feature services).

**Frontend components:** Zustand store (pipeline, chat, editor tabs, kanban cards), Panel Layout Manager (allotment/user-driven resize), Chat/Editor/Kanban panels.

**Data flow:** CLI tools → filesystem → chokidar → backend parser → WebSocket → Zustand → React UI. One-way: filesystem is always authoritative, SQLite is a disposable cache.

**State boundary:** Filesystem owns artifact content (spec.md, plan.md, tasks.md). SQLite owns operational/derived state (pipeline stage, approvals, task card cache, chat history, process logs).

### Pitfalls (Top 5)

1. **Zombie CLI processes** — Node.js does NOT auto-kill children on parent exit. Process registry with SIGTERM handlers is mandatory Phase 1 infrastructure.
2. **File watcher race conditions** — Partial file reads during CLI writes. Chokidar `awaitWriteFinish` + per-file debounce + "known write" muting pattern.
3. **TipTap markdown round-trip fidelity loss** — ProseMirror normalizes away markdown formatting. Mitigation: read-only by default, edit-on-demand, never auto-save without user intent.
4. **WebSocket reconnection without state reconciliation** — Full state snapshot on every connect/reconnect (simple for single-user). No incremental catch-up needed.
5. **SQLite as independent truth** — Must be treated as disposable cache of tasks.md. Single-writer pattern: only the tasks.md parser writes to SQLite.

## Cross-Dimensional Insights

| Finding | Sources | Impact |
|---------|---------|--------|
| ESM-only backend is non-negotiable | Stack + Pitfalls | Must be Phase 1 scaffolding decision |
| Process Manager is the most critical component | Architecture + Pitfalls | Phase 1, blocks all CLI integration |
| File watcher + debounce is foundational | Architecture + Pitfalls + Features | Phase 1, blocks editor and kanban |
| WebSocket protocol shapes everything | Architecture + Features | Must define message types before any panel UI |
| tiptap-markdown is the riskiest dependency | Stack + Pitfalls | Needs round-trip test suite before editor UI |
| Structured events are the core innovation | Features + Architecture | Custom CLI parsers needed per tool |
| Read-only editor default prevents data loss | Pitfalls + Features | Architectural decision, not just UX choice |

## Implications for Roadmap

Research suggests 3-4 coarse phases (matching user's "coarse" granularity preference):

**Phase 1: Foundation** — Monorepo scaffolding (ESM from day one), Express + WebSocket server, process manager, file watcher with debounce, shared TypeScript types, SQLite schema, dev tooling. This is the load-bearing infrastructure everything depends on.

**Phase 2: Chat + Editor** — Chat panel with command input, CLI invocation via process manager, structured event streaming to chat. TipTap editor with markdown rendering, live file reload, multi-tab. These two panels form the minimum viable vertical slice: type a command → see output in chat → see artifact in editor.

**Phase 3: Pipeline + Kanban** — Pipeline bar with stage visualization and approval gates. Kanban board with tasks.md parsing, real-time card updates from GSD events. Approval triggers next CLI command. This completes the four-panel layout.

**Phase 4: Integration + Polish** — Cross-panel coordination (clickable links, artifact refs), WebSocket reconnection with reconciliation, error handling, keyboard shortcuts, feature switching, MVP packaging (npm install + npm start).

**Phase ordering rationale:**
- Foundation first because ESM config and process manager affect everything
- Chat + Editor before Pipeline + Kanban because chat drives CLI invocations that create artifacts kanban displays
- Editor and Chat together because the document is the primary viewport and chat is useless without seeing its output
- Integration last because it requires all panels to exist

## Gaps to Address

- Exact npm package versions need `npm view` verification before first install
- tiptap-markdown maintenance status and React 19 compatibility
- Spec-kit and GSD CLI output format documentation for structured event parsing
- tasks.md checkbox format specification for kanban parsing rules
- Express 5 vs 4 stable status; Tailwind CSS 4 vs 3.4 readiness

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Architecture patterns | HIGH | Standard WebSocket + editor + CLI orchestration |
| Library choices | HIGH | Well-established ecosystem patterns |
| Pitfall identification | HIGH | Process management, file watching, markdown fidelity are well-documented problem areas |
| Feature scope | HIGH | PROJECT.md requirements are clear and specific |
| Exact versions | MEDIUM | Training data cutoff; npm verification needed |
| tiptap-markdown viability | MEDIUM | Leading community solution but maintenance unverified |

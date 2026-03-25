# Phase 1: Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the load-bearing infrastructure for SpecFlow IDE: an ESM monorepo with three packages (shared types, Node.js+Express backend, React+Vite frontend), a WebSocket-based file watcher that pushes spec artifact changes to the browser with full content, a SQLite database for IDE operational state with bidirectional pipeline stage tracking, and a navigation shell with view switching between Chat, Docs, and Kanban.

</domain>

<decisions>
## Implementation Decisions

### Nav Shell Appearance
- **D-01:** Left icon rail layout (VS Code activity bar style) — narrow vertical bar with icons for Chat, Docs, and Kanban views
- **D-02:** Subtle border separation between rail and content area — same background color, thin border divider (not dark sidebar)
- **D-03:** Icon-only rail with tooltips on hover for view names — no expanded text labels

### Dev Workflow Setup
- **D-04:** Use `concurrently` package for `npm run dev` — runs backend (tsx watch) and frontend (vite dev) in parallel from a single terminal with color-coded output
- **D-05:** Shared types package consumed via TypeScript paths during development — no build step for shared in dev mode. Both backend and frontend reference `../shared/src/*` directly. Only build shared for production.

### Connection Status UX
- **D-06:** WebSocket connection status shown as colored dot icon in the icon rail footer — green = connected, amber = reconnecting, red = disconnected. Always visible, tooltip on hover for details.

### Placeholder View Content
- **D-07:** Empty Chat/Docs/Kanban views show just the view name centered — minimal, no icons or hint text. Content comes in Phase 2+.

### Claude's Discretion
- Exact icon choices for Chat, Docs, Kanban nav items (Lucide or similar icon library)
- Rail width and spacing
- Tooltip implementation approach
- Tailwind color palette selections within the border-separation constraint
- Connection status dot size and exact positioning

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Feature specification
- `specs/001-foundation/spec.md` — Full feature spec with 4 user stories, 18 functional requirements, acceptance criteria, edge cases
- `specs/001-foundation/plan.md` — Project structure (3-package monorepo layout), technical context, constitution check

### Data model and contracts
- `specs/001-foundation/data-model.md` — Entity definitions (Feature, PipelineState, TransitionHistory, TaskCardCache, ChatMessage), WebSocket message types
- `specs/001-foundation/contracts/api.md` — REST endpoints (GET/POST/DELETE features), WebSocket protocol (message envelope, filesystem channel events)

### Developer experience
- `specs/001-foundation/quickstart.md` — Dev commands, setup flow, troubleshooting table

### Project governance
- `.specify/memory/constitution.md` — Core principles: Spec-First Data Flow (I), Document-Centric (II), Orchestration Not Reimplementation (III)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing source code — this is Phase 1 (greenfield). All packages, components, and infrastructure are created from scratch.

### Established Patterns
- ESM-only enforced project-wide (chokidar 4, execa 9 require it) — per STATE.md decisions
- npm workspaces for monorepo (3 packages: shared, backend, frontend) — per plan.md
- Zustand for frontend state management — per plan.md

### Integration Points
- `specs/` directory is the watched root for file events — filesystem is the source of truth (Constitution Principle I)
- WebSocket message envelope with discriminated union by channel — filesystem channel only in Phase 1, extensible for pipeline and CLI channels in later phases

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-24*

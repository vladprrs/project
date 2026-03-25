# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 01-Foundation
**Areas discussed:** Nav shell appearance, Dev workflow setup, Connection status UX, Placeholder view content

---

## Nav Shell Appearance

### Navigation position

| Option | Description | Selected |
|--------|-------------|----------|
| Top bar | Horizontal bar at top with view tabs. Simple, familiar. Maximizes vertical space. | |
| Left sidebar | Vertical sidebar with icon+label nav items. More room for future items. | |
| Left icon rail | Narrow icon-only sidebar like VS Code activity bar. Minimal footprint, tooltips for discoverability. | ✓ |

**User's choice:** Left icon rail
**Notes:** None

### Visual style

| Option | Description | Selected |
|--------|-------------|----------|
| Dark rail, light content | Dark-colored sidebar with light content area. Strong visual separation. | |
| Subtle border separation | Same background, thin border divider. Lighter, more minimal feel. | ✓ |

**User's choice:** Subtle border separation
**Notes:** None

### View labels

| Option | Description | Selected |
|--------|-------------|----------|
| Icon only + tooltip | Narrow rail, tooltip on hover. VS Code style. | ✓ |
| Icon + expanded label | Rail expands for active item label. Others stay icon-only. | |

**User's choice:** Icon only + tooltip
**Notes:** None

---

## Dev Workflow Setup

### Dev runner

| Option | Description | Selected |
|--------|-------------|----------|
| concurrently | Run backend + frontend in parallel from single terminal. Color-coded output. | ✓ |
| Turborepo | Build orchestration + caching. More setup but scales better. | |
| Plain npm scripts | No extra tool. Minimal dependencies but less polished output. | |

**User's choice:** concurrently
**Notes:** None

### Shared types consumption

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript paths | Reference shared/src directly via tsconfig paths. No build step in dev. | ✓ |
| Build-first with watch | Shared builds to dist/, consumers import from dist. More production-like. | |

**User's choice:** TypeScript paths
**Notes:** None

---

## Connection Status UX

### Status display

| Option | Description | Selected |
|--------|-------------|----------|
| Icon in rail footer | Colored dot at bottom of icon rail. Green/amber/red. Always visible. | ✓ |
| Toast on disconnect only | No persistent indicator. Toast on disconnect/reconnect only. | |
| Top-right badge | Badge in top-right of content area. Always visible. | |

**User's choice:** Icon in rail footer
**Notes:** None

---

## Placeholder View Content

### Empty view content

| Option | Description | Selected |
|--------|-------------|----------|
| Icon + view name + hint | Centered icon, name, one-line hint. Clean and informative. | |
| Just the view name | Minimal centered text. Dead simple, no personality. | ✓ |
| File event log (Chat only) | Chat shows live file watcher events. Proves pipeline works. | |

**User's choice:** Just the view name
**Notes:** None

---

## Claude's Discretion

- Exact icon choices for nav items
- Rail width, spacing, tooltip implementation
- Tailwind color palette within constraints
- Connection status dot sizing and positioning

## Deferred Ideas

None — discussion stayed within phase scope.

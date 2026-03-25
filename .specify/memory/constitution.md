<!--
  Sync Impact Report
  ===================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (first version)
  Added sections:
    - Core Principles (3): Spec-First Data Flow, Document-Centric,
      Orchestration Not Reimplementation
    - Technology Constraints
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ aligned (Constitution Check
      gate present at line 30; principles are testable against it)
    - .specify/templates/spec-template.md ✅ aligned (user-story-first
      structure supports Principle I; no changes needed)
    - .specify/templates/tasks-template.md ✅ aligned (phase-based
      execution with checkpoints supports Principle I data flow)
  Follow-up TODOs: none
-->

# SpecFlow IDE Constitution

## Core Principles

### I. Spec-First Data Flow

The UI MUST always reflect the current state of spec artifacts on
disk. The artifact chain `spec.md → plan.md → tasks.md` is the
single source of truth for every feature lifecycle.

- The UI MUST NOT maintain independent state that can diverge from
  the file system. Read from files; write through tool commands.
- Every user-visible change to a spec, plan, or task MUST originate
  from — and be persisted to — the corresponding markdown artifact
  before the UI updates.
- When a file changes on disk (via CLI tool, external editor, or
  git pull), the UI MUST detect and reconcile within one render
  cycle.

**Rationale**: Divergence between UI state and file state is the
primary failure mode in document-centric tools. Treating files as
the sole authority eliminates an entire class of sync bugs and
keeps the system compatible with any external tool that reads or
writes the same files.

### II. Document-Centric, Not Code-Centric

The user interacts with markdown documents and task cards. Source
code is accessible only through drill-down within a task context
and MUST NOT appear in the primary viewport unprompted.

- The three primary panels (chat, document editor, kanban) MUST
  display spec artifacts, not source files.
- Code views MUST be reachable only via an explicit task-level
  action (e.g., "View implementation" on a task card).
- Navigation, search, and keyboard shortcuts MUST prioritize spec
  artifacts over source files.

**Rationale**: SpecFlow IDE exists so the human stays in the
specification and approval loop. Surfacing code by default pulls
the user out of that role and into line-by-line review, which is
the job of the orchestrated coding agent.

### III. Orchestration, Not Reimplementation

The IDE MUST call existing CLI tools (Spec Kit, GSD, coding agents)
through their published interfaces. It MUST NOT duplicate logic for
spec generation, the TDD cycle, plan verification, or any other
capability already provided by an orchestrated tool.

- Each external tool MUST be invoked via its CLI or documented API;
  never by importing or vendoring its internals.
- When an upstream tool ships a new capability, the IDE MUST be
  able to surface it without code changes beyond configuration.
- If the IDE needs behavior not provided by an existing tool, the
  preferred path is to contribute to that tool or wrap it — not to
  rewrite.

**Rationale**: Reimplementing tool logic creates two sources of
truth, doubles the maintenance surface, and drifts out of sync with
upstream releases. Thin orchestration keeps the IDE lightweight and
lets each tool evolve independently.

## Technology Constraints

**Frontend**: React + TypeScript, Vite bundler, TipTap
(ProseMirror-based) for the document editor, Tailwind CSS for
styling. Three-panel SPA layout (chat, doc editor, kanban).

**Backend**: Node.js + TypeScript. Express or Fastify. Primary
responsibility is orchestration: spawning CLI processes, parsing
markdown artifacts, streaming events to the frontend via WebSocket.

**Storage**: File system for all spec artifacts (`specs/` directory,
matching original workflow). SQLite for kanban task state. No
external database at launch.

**Runtime**: Web app served on localhost. No Electron or Tauri at
launch — desktop packaging is a future concern only.

**Dependency policy**: Prefer well-maintained, focused libraries
over frameworks that impose opinions. Every new dependency MUST
justify its weight against the simplicity priority.

## Development Workflow

**Simplicity-first**: Start with the minimal viable implementation.
Reject abstractions until the third concrete use case demands them.
Premature generalization violates Principle III by building
infrastructure the upstream tools already provide.

**Test coverage**: Every feature MUST ship with tests that exercise
the contract between the IDE and its orchestrated tools. Prefer
integration tests that invoke real CLI commands over mocks of tool
behavior. Unit tests cover pure UI logic and state derivation.

**Incremental delivery**: Each user story MUST be independently
testable and deployable per the tasks template. Merge only complete
story slices — never half-implemented cross-cutting changes.

**File-first development**: Before touching code, update the
relevant spec artifact. The spec change defines the scope; the code
change implements it. PRs that modify behavior without a
corresponding spec update MUST be flagged in review.

## Governance

This constitution supersedes all other development practices for
the SpecFlow IDE project. Amendments follow this process:

1. **Propose**: Open a PR modifying this file with a rationale in
   the PR description.
2. **Review**: At least one maintainer MUST approve. Changes to
   principles require explicit sign-off from the project lead.
3. **Migrate**: If the amendment changes a principle, update all
   dependent templates and document the migration in the Sync
   Impact Report comment at the top of this file.
4. **Version**: Increment the version per semver — MAJOR for
   principle removal or redefinition, MINOR for new principles or
   material expansion, PATCH for wording clarifications.

All plan-template Constitution Check gates MUST validate against
the principles defined here. Complexity violations MUST be
justified in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-03-24 | **Last Amended**: 2026-03-24

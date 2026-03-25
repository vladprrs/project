---
phase: quick
plan: 260325-jdi
type: execute
wave: 1
depends_on: []
files_modified:
  - specs/002-chat-doc-editor/spec.md
autonomous: true
must_haves:
  truths:
    - "spec.md contains a complete feature specification derived from plan.md, data-model.md, contracts/api.md, tasks.md, and research.md"
    - "All 17 requirements (CHAT-01 through CHAT-09, EDIT-01 through EDIT-08) are present as functional requirements"
    - "All 7 user stories (US1-US7) appear with acceptance criteria derived from tasks.md checkpoint descriptions"
    - "The 4 performance NFRs from plan.md are listed (first streaming token <3s, live-reload <2s, mode toggle <200ms, artifact link navigation <500ms)"
    - "No duplicate sections, no test stub content, no implementation details (framework names, library names, API paths)"
    - "Edge cases section covers boundary conditions across chat and editor"
    - "Constraints section documents single-feature, single-user, orchestration-only, and file-system truth principles"
  artifacts:
    - path: "specs/002-chat-doc-editor/spec.md"
      provides: "Complete feature specification for Chat + Document Editor"
      min_lines: 150
  key_links: []
---

<objective>
Rewrite specs/002-chat-doc-editor/spec.md from its current test stub (18 lines of placeholder content with duplicate sections) into a real, comprehensive feature specification. This addresses the CRITICAL finding C1 from the speckit.analyze report.

Purpose: The spec.md is the canonical feature specification that all downstream artifacts (plan, research, data-model, tasks, contracts) reference. Currently it's a broken stub, which makes the entire spec chain unreliable. A real spec restores the speckit workflow's integrity.

Output: A complete spec.md with Overview, Functional Requirements, Non-Functional Requirements, User Stories with acceptance criteria, Edge Cases, Constraints, and Assumptions.
</objective>

<execution_context>
@/home/coder/project/.claude/get-shit-done/workflows/execute-plan.md
@/home/coder/project/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@specs/002-chat-doc-editor/plan.md
@specs/002-chat-doc-editor/data-model.md
@specs/002-chat-doc-editor/contracts/api.md
@specs/002-chat-doc-editor/tasks.md
@specs/002-chat-doc-editor/research.md
@specs/002-chat-doc-editor/checklists/requirements.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite spec.md as a complete feature specification</name>
  <files>specs/002-chat-doc-editor/spec.md</files>
  <action>
Replace the entire contents of specs/002-chat-doc-editor/spec.md with a proper feature specification. Use the following source material to derive each section:

**CRITICAL RULE: The spec must be technology-agnostic. No framework names (React, TipTap, Express), no library names (AI SDK, Zustand, ProseMirror), no API paths (/api/chat), no file paths (packages/frontend/...). Write for a non-technical stakeholder who cares about WHAT the system does, not HOW.**

**Document structure (in this exact order):**

## 1. Overview / Context
- One paragraph: SpecFlow IDE's Chat + Document Editor feature — the two primary interaction surfaces
- Chat panel: users command coding agents via natural language, see streaming responses with progress indicators and structured output
- Document editor: renders spec artifacts (spec.md, plan.md, tasks.md, etc.) as rich markdown with tabbed interface
- Core value: bridges user intent to agent execution through a conversational + document editing paradigm
- Derives from: plan.md "Summary" section

## 2. Functional Requirements
Two groups: Chat Requirements (CHAT-01 through CHAT-09) and Editor Requirements (EDIT-01 through EDIT-08). Derive the 17 requirement IDs from checklists/requirements.md which references them. Map each requirement to a user-facing behavior:

**Chat Requirements:**
- CHAT-01: User submits a command via text input in the chat panel
- CHAT-02: System streams the agent's response progressively (token by token) with a visible activity indicator
- CHAT-03: Input is locked (disabled) while the agent is processing a command
- CHAT-04: Streaming interruptions preserve partial responses and offer a retry action
- CHAT-05: Agent errors display actionable context (not raw stack traces)
- CHAT-06: Chat messages persist per feature across browser refreshes and restarts
- CHAT-07: Older messages load on demand when scrolling to the top of the conversation
- CHAT-08: Agent responses that reference spec artifacts render those references as clickable links
- CHAT-09: Clicking an artifact link switches to the document view and opens the referenced file

**Editor Requirements:**
- EDIT-01: Spec artifacts render as rich formatted markdown (headings, lists, code blocks, tables, checkboxes)
- EDIT-02: Multiple documents open simultaneously in a tabbed interface
- EDIT-03: Documents open in read-only mode by default; user explicitly toggles to edit mode
- EDIT-04: Open documents automatically update when the underlying file changes on disk (live-reload)
- EDIT-05: Newly created artifact files automatically open as tabs
- EDIT-06: Edit mode supports undo/redo, in-document search, and manual save to disk
- EDIT-07: Saving in edit mode writes changes back to the file system as the source of truth
- EDIT-08: After an agent revises an artifact, the editor shows inline diff markers (additions highlighted, deletions indicated) that the user can dismiss

For each requirement, write 1-2 sentences of user-facing behavior description. Do NOT include implementation details.

## 3. Non-Functional Requirements
Four performance goals derived from plan.md "Performance Goals" line:
- NFR-01: First streaming token appears within 3 seconds of command submission
- NFR-02: Document live-reload completes within 2 seconds of file change on disk
- NFR-03: Toggling between read-only and edit mode completes within 200 milliseconds
- NFR-04: Clicking an artifact link opens the document within 500 milliseconds

Also add:
- NFR-05: Chat history supports 1000+ messages per feature without degraded scroll performance (from plan.md "Scale/Scope")
- NFR-06: Tab bar supports up to 10 simultaneously open documents (from plan.md "Scale/Scope")

## 4. User Stories
Seven user stories (US1 through US7) derived from tasks.md Phase 3-9 headers and checkpoint descriptions:

- US1: Chat with Streaming Agent Responses — User types a command, sees progressive streaming response with activity indicator during generation and structured output on completion
- US2: View Spec Artifacts in Tabbed Editor — User opens a markdown document, sees it rendered with full fidelity (headings, lists, code, tables, checkboxes) in a tabbed interface, read-only by default
- US3: Documents Live-Reload on File Changes — When a file changes on disk, the open document updates automatically; new artifact files open as new tabs
- US4: Chat Messages Link to Artifacts — Artifact references in chat messages (e.g., "spec.md") render as clickable links that open the document in the editor
- US5: Chat History Persists Per Feature — Chat messages survive browser refreshes and IDE restarts, scoped to the active feature, with older messages loading on scroll-up
- US6: Edit Mode with Undo/Redo and Search — User toggles to edit mode, makes changes with undo/redo, searches within the document, and manually saves to disk
- US7: Rejection Feedback with Diff View — After submitting feedback that causes an agent to revise an artifact, the editor shows inline diff markers highlighting what changed

For each user story, write:
- A "As a user, I want ... so that ..." statement
- 3-5 acceptance criteria as a bulleted list (derived from the "Independent Test" and checkpoint descriptions in tasks.md)

## 5. Edge Cases
Derive 7 edge cases from tasks.md Phase 10 and research.md conflict scenarios:
- EC-01: Tab bar overflow — more documents open than fit horizontally; must scroll without hiding tabs
- EC-02: Empty states — no tabs open shows guidance; no active feature shows activation prompt
- EC-03: Live-reload during search — search results refresh against updated content
- EC-04: Edit conflict — file changes on disk while user has unsaved edits; prompt to reload or keep
- EC-05: Unsaved changes on mode toggle — switching from edit to read-only with dirty state prompts save/discard
- EC-06: Artifact link to non-existent file — clicking a link to a file that doesn't exist shows a notification rather than failing silently
- EC-07: Streaming interruption with partial content — connection loss mid-stream preserves visible partial response

## 6. Constraints
Seven constraints derived from plan.md "Constraints" and "Constitution Check":
- Single active feature at a time (no parallel feature workflows)
- Single user (localhost, desktop browser)
- Orchestration only — the IDE invokes coding agents, never reimplements their logic
- File-system truth — all document content derives from files on disk; the editor never holds authoritative state that diverges from the filesystem
- Document-centric — primary panels show spec artifacts, not source code
- Chat history is scoped per feature (switching features switches history)
- Spec artifacts live in a known directory structure with predictable filenames

## 7. Assumptions / Dependencies
Seven assumptions derived from requirements.md notes and plan.md:
- Phase 1 foundation (backend server, WebSocket connection, file watcher, database, feature management) is operational
- The file watcher broadcasts create/change/delete events with file content
- A database table for chat messages already exists with the required schema
- At least one coding agent is available and accessible for chat streaming
- Spec artifacts follow a known naming convention (spec.md, plan.md, tasks.md, etc.)
- The IDE runs on localhost in a desktop browser (no mobile, no multi-user)
- Cursor-based pagination is used for chat history (not offset-based)

**Formatting guidelines:**
- Use markdown heading levels: # for title, ## for top-level sections, ### for subsections
- Requirements use ID prefixes (CHAT-01, EDIT-01, NFR-01, EC-01)
- User stories use US1-US7 numbering
- Keep language precise but non-technical
- Total document should be approximately 200-300 lines of markdown
  </action>
  <verify>
    <automated>wc -l specs/002-chat-doc-editor/spec.md | awk '{if ($1 >= 150) print "PASS: " $1 " lines"; else print "FAIL: only " $1 " lines"}'</automated>
    Manually verify: no framework/library names appear (grep -i "react\|tiptap\|express\|zustand\|prosemirror\|ai sdk\|vercel\|drizzle\|sqlite" specs/002-chat-doc-editor/spec.md should return nothing), all 17 requirement IDs present (CHAT-01 through CHAT-09, EDIT-01 through EDIT-08), all 7 user stories present (US1-US7), 4+ NFRs present, no duplicate "New Section Added By Agent" sections.
  </verify>
  <done>
    - spec.md is a complete, technology-agnostic feature specification (150+ lines)
    - Contains all 7 sections: Overview, Functional Requirements, NFRs, User Stories, Edge Cases, Constraints, Assumptions
    - All 17 requirement IDs (CHAT-01 through CHAT-09, EDIT-01 through EDIT-08) are present
    - All 7 user stories (US1-US7) have acceptance criteria
    - All 4 performance NFRs from plan.md are listed
    - No test stub content remains, no duplicate sections
    - No implementation details (framework names, library names, API paths, file paths)
  </done>
</task>

</tasks>

<verification>
1. `wc -l specs/002-chat-doc-editor/spec.md` shows 150+ lines
2. `grep -c "CHAT-0[1-9]" specs/002-chat-doc-editor/spec.md` returns 9
3. `grep -c "EDIT-0[1-8]" specs/002-chat-doc-editor/spec.md` returns 8
4. `grep -c "NFR-0[1-6]" specs/002-chat-doc-editor/spec.md` returns 6
5. `grep -c "US[1-7]" specs/002-chat-doc-editor/spec.md` returns 7+
6. `grep -ci "react\|tiptap\|express\|zustand\|prosemirror\|ai sdk\|vercel\|drizzle\|sqlite\|websocket" specs/002-chat-doc-editor/spec.md` returns 0
7. `grep -c "New Section Added By Agent" specs/002-chat-doc-editor/spec.md` returns 0
8. `grep -c "test spec artifact" specs/002-chat-doc-editor/spec.md` returns 0
</verification>

<success_criteria>
spec.md is a complete, professional feature specification that the speckit workflow can reference as the canonical source of truth for the Chat + Document Editor feature. All downstream artifacts (plan.md, data-model.md, tasks.md, contracts/) align with the requirements defined in this spec.
</success_criteria>

<output>
After completion, create `.planning/quick/260325-jdi-rewrite-spec-md-from-test-stub-into-real/260325-jdi-SUMMARY.md`
</output>

# Tasks: Chat + Document Editor

**Input**: Design documents from `/specs/002-chat-doc-editor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and extend shared type contracts

- [x] T001 Install TipTap dependencies in packages/frontend: @tiptap/react, @tiptap/starter-kit, @tiptap/pm, tiptap-markdown, @tiptap/extension-task-list, @tiptap/extension-task-item, @tiptap/extension-placeholder, @tiptap/extension-code-block-lowlight, lowlight
  - **Note:** All TipTap packages installed at v3.20.5 + lowlight@3.3.0 during Phase 02.1 (edit mode).
- [x] T002 Install AI SDK dependencies: `ai` and `@ai-sdk/react` in packages/frontend, `ai` and `@ai-sdk/anthropic` in packages/backend
- [x] T003 Install `diff` library in packages/frontend for text diffing
  - **Note:** diff@^8.0.4 + @types/diff@^8.0.0 installed, used in lib/diff-compute.ts.
- [x] T004 Add chat and file API contract types (ChatStreamRequest, GetChatMessagesRequest, GetChatMessagesResponse, SaveChatMessageRequest, SaveChatMessageResponse, SaveFileRequest, SaveFileResponse, ReadFileRequest, ReadFileResponse) to packages/shared/src/types/api.ts and export from packages/shared/src/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend services, API scaffolds, and frontend state extensions that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add cursor-based pagination index on chat_messages table (feature_id, created_at DESC, id DESC) in packages/backend/src/db/client.ts
- [x] T006 [P] Create ChatService class with message CRUD (insert, getByFeature with cursor pagination, getById) in packages/backend/src/services/chat.ts
- [x] T007 [P] Create file read/save endpoints (GET /api/files/read, POST /api/files/save) with path-traversal validation ensuring paths resolve within specs/ directory in packages/backend/src/api/files.ts
  - **Note:** Read endpoint done. Save endpoint deferred to edit mode phase.
- [x] T008 [P] Create AI SDK custom provider scaffold with a mock/echo provider for development (returns echoed input as streaming response) in packages/backend/src/services/agent-provider.ts
  - **Note:** Echo agent implemented inline in packages/backend/src/api/chat.ts (not a separate provider file). Real providers deferred to Phase 3+.
- [x] T009 Create chat API router with POST /api/chat (streaming), GET /api/chat/messages (paginated), POST /api/chat/messages (persist) in packages/backend/src/api/chat.ts
- [x] T010 Mount chat and files routers in packages/backend/src/server.ts — add `/api/chat` and `/api/files` routes, pass ChatService and db dependencies
- [x] T011 Extend Zustand store with editor tab state (tabs array, activeTabId, actions: openTab, closeTab, setActiveTab, updateTabContent, setTabMode, setTabDirty) in packages/frontend/src/store/index.ts

**Checkpoint**: Foundation ready — backend serves chat streaming + file read/save + message persistence; frontend store manages editor tabs. User story implementation can now begin.

---

## Phase 3: User Story 1 — Chat with Streaming Agent Responses (Priority: P1) MVP

**Goal**: User types a command in the chat panel, sees a streaming response from an AI SDK provider with activity indicators and structured output

**Independent Test**: Type a command in chat input, verify streaming response appears with activity indicator during generation and structured output on completion

### Implementation for User Story 1

- [x] T012 [P] [US1] Create ChatInput component with text input, submit button, disabled state with "Agent is working..." notice when isLoading is true, in packages/frontend/src/components/chat/ChatInput.tsx
- [x] T013 [P] [US1] Create MessageList component that renders an array of chat messages with role-based styling (user messages right-aligned, assistant messages left-aligned), activity indicator for streaming, and error display with actionable context in packages/frontend/src/components/chat/MessageList.tsx
  - **Note:** Implemented as ChatMessage.tsx + ChatHistory.tsx + ActivityIndicator.tsx + ErrorBanner.tsx (decomposed into smaller components).
- [x] T014 [US1] Rewrite ChatView to use AI SDK useChat() hook connected to POST /api/chat, compose ChatInput and MessageList, pass isLoading/error state, handle streaming interruption with "Response interrupted — click to retry" action using reload() in packages/frontend/src/views/ChatView.tsx

**Checkpoint**: Chat panel sends messages to backend and renders streaming responses with activity indicators. MVP functional.

---

## Phase 4: User Story 2 — View Spec Artifacts in Tabbed Editor (Priority: P2)

**Goal**: TipTap editor renders markdown documents with full fidelity in a tabbed interface, opening in read-only mode by default

**Independent Test**: Open a markdown file in the Docs view, verify it renders headings/lists/code blocks/tables/checkboxes correctly, tab appears in tab bar, editor is read-only by default with a visible toggle

### Implementation for User Story 2

- [x] T015 [P] [US2] Create useEditorTabs hook that wraps Zustand tab state with convenience methods (openFile, closeFile, switchTab) and fetches initial file content via GET /api/files/read in packages/frontend/src/hooks/useEditorTabs.ts
  - **Note:** Tab logic lives directly in Zustand store (openTab, closeTab, setActiveTab). No separate hook — store actions fetch content inline.
- [x] T016 [P] [US2] Create MarkdownEditor component: initialize TipTap editor with StarterKit, tiptap-markdown, TaskList, TaskItem, Placeholder, CodeBlockLowlight extensions; accept content prop and editable prop; expose editor instance via ref or callback in packages/frontend/src/components/editor/MarkdownEditor.tsx
  - **Note:** Implemented as MarkdownViewer.tsx using react-markdown + remark-gfm + rehype-highlight (read-only). TipTap editor deferred to edit mode phase.
- [x] T017 [P] [US2] Create EditorTabs component: render tab bar from Zustand tabs array, active tab highlighting, close button per tab, scrollable overflow when tabs exceed container width, empty state when no tabs open in packages/frontend/src/components/editor/EditorTabs.tsx
  - **Note:** Implemented as TabBar.tsx in components/docs/.
- [x] T018 [US2] Create EditorToolbar component with read-only/edit mode toggle button that calls setTabMode on the active tab, visual indication of current mode (lock icon for read-only, pencil for edit) in packages/frontend/src/components/editor/EditorToolbar.tsx
  - **Note:** Implemented in components/docs/EditorToolbar.tsx during Phase 02.1. Lock/pencil icons, save button, mode toggle all functional.
- [x] T019 [US2] Rewrite DocsView to compose EditorTabs, EditorToolbar, and MarkdownEditor; wire tab switching to load content into editor; set editor.setEditable(false) for read-only mode and editor.setEditable(true) for edit mode in packages/frontend/src/views/DocsView.tsx
  - **Note:** DocsView composes TabBar + MarkdownViewer + EmptyDocs. Read-only only (no toolbar/edit mode).

**Checkpoint**: Docs view renders markdown documents in a tabbed TipTap editor with read-only mode by default and a working mode toggle.

---

## Phase 5: User Story 3 — Documents Live-Reload on File Changes (Priority: P3)

**Goal**: When a file changes on disk, the editor auto-updates; when a new artifact is created, a tab opens automatically

**Independent Test**: Have a document open in the editor, modify the file externally, verify the editor updates within 2 seconds. Create a new file in the feature directory, verify a new tab opens.

### Implementation for User Story 3

- [x] T020 [US3] Extend useWebSocket hook to dispatch filesystem events to editor tab store — on `changed` event: update matching tab's content if in read-only mode (preserving scroll position); on `created` event for a file in the active feature's directory: auto-open a new tab; on `deleted` event: close the matching tab and show a notification in packages/frontend/src/hooks/useWebSocket.ts
- [x] T021 [US3] Implement scroll position preservation in MarkdownEditor: before content update save scroll offset, after setContent restore to nearest equivalent position in packages/frontend/src/components/editor/MarkdownEditor.tsx
  - **Note:** Scroll preservation implemented in MarkdownViewer.tsx via dual useLayoutEffect.

**Checkpoint**: Documents live-reload when files change on disk. New artifact files auto-open as editor tabs.

---

## Phase 6: User Story 4 — Chat Messages Link to Artifacts (Priority: P4)

**Goal**: Artifact references (spec.md, plan.md, tasks.md) in chat messages render as clickable links that open the document in the editor

**Independent Test**: Receive a chat message containing "spec.md", click the rendered link, verify IDE switches to Docs view with spec.md open in a tab

### Implementation for User Story 4

- [x] T022 [P] [US4] Create artifact-links utility with regex pattern matching for known artifact filenames (spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md) and relative paths (specs/*/filename.md), returning an array of ArtifactLink objects with text, filePath, startIndex, endIndex in packages/frontend/src/lib/artifact-links.ts
  - **Note:** ARTIFACT_PATTERN regex and renderTextWithArtifactLinks implemented inline in ChatMessage.tsx (not a separate utility file).
- [x] T023 [P] [US4] Create ArtifactLink component that renders a clickable button/link, on click dispatches setActiveView('docs') and openTab(filePath) via Zustand store; if file doesn't exist on disk (404 from read endpoint), show a toast notification in packages/frontend/src/components/chat/ArtifactLink.tsx
  - **Note:** Implemented inline in ChatMessage.tsx as button elements with handleArtifactClick callback. Console error on 404 (no toast yet).
- [x] T024 [US4] Integrate artifact link detection into MessageList: parse assistant message content through artifact-links utility, render matched segments as ArtifactLink components inline with surrounding text in packages/frontend/src/components/chat/MessageList.tsx
  - **Note:** Integrated in ChatMessage.tsx via renderTextWithArtifactLinks function.

**Checkpoint**: Chat messages display clickable artifact links that navigate to the Docs view and open the referenced document.

---

## Phase 7: User Story 5 — Chat History Persists Per Feature (Priority: P5)

**Goal**: Chat messages persist across browser refreshes and IDE restarts, scoped per feature, with cursor-based pagination for large histories

**Independent Test**: Send several chat messages, refresh the browser, verify all messages reload in correct order. Switch features, verify history changes.

### Implementation for User Story 5

- [x] T025 [US5] Wire ChatView to load persisted chat history from GET /api/chat/messages on mount (when active feature is set), initialize useChat messages array with loaded history, save user messages via POST /api/chat/messages on submit, save completed assistant messages on stream finish in packages/frontend/src/views/ChatView.tsx
  - **Note:** Implemented in useChatStream.ts — loads history on feature change, persists user messages on send, persists assistant messages via onFinish callback.
- [ ] T026 [US5] Implement scroll-up pagination in MessageList: detect scroll-to-top, fetch older messages via GET /api/chat/messages?before=CURSOR, prepend to list, track hasMore flag to stop fetching when no more messages exist in packages/frontend/src/components/chat/MessageList.tsx
  - **Note:** Backend cursor pagination ready; frontend scroll-up pagination deferred.

**Checkpoint**: Chat history persists per feature across restarts. Older messages load on scroll-up.

---

## Phase 8: User Story 6 — Edit Mode with Undo/Redo and Search (Priority: P6)

**Goal**: Users can toggle to edit mode, make changes with undo/redo support, search within the document, and manually save to disk

**Independent Test**: Toggle edit mode, type changes, undo them, search for text, save and verify file on disk is updated

### Implementation for User Story 6

- [~] T027 [US6] Add save functionality to EditorToolbar: save button (visible in edit mode only) and Ctrl+S/Cmd+S keyboard shortcut that serializes TipTap content to markdown via tiptap-markdown and sends to POST /api/files/save; suppress file watcher triggering for self-initiated saves in packages/frontend/src/components/editor/EditorToolbar.tsx
  - **Note:** ~80% done — Ctrl+S, save button, POST /api/files/save all work. Backend recentlySaved suppression exists. Missing: frontend-side self-save guard.
- [x] T028 [US6] Add in-document search: Cmd+F/Ctrl+F keyboard handler that opens a search bar overlay within the editor, using TipTap's built-in search extension or a ProseMirror find-text approach with highlight decorations for matches in packages/frontend/src/components/editor/MarkdownEditor.tsx
  - **Note:** Implemented in SearchBar.tsx + lib/search-extension.ts using prosemirror-search. Cmd+F opens overlay, Enter/Shift+Enter for next/prev, Escape to close.
- [ ] T029 [US6] Implement conflict warning: when editor is in edit mode with unsaved changes (isDirty=true) and a filesystem `changed` event arrives for the active tab, show a banner/dialog offering "Reload from disk" or "Keep my changes" instead of silently updating in packages/frontend/src/components/editor/MarkdownEditor.tsx
- [ ] T030 [US6] Implement unsaved changes prompt: when user toggles from edit mode back to read-only mode with isDirty=true, prompt "Save changes?" / "Discard changes" before switching mode in packages/frontend/src/components/editor/EditorToolbar.tsx

**Checkpoint**: Full edit mode with manual save, undo/redo (built-in), search, conflict handling, and unsaved changes protection.

---

## Phase 9: User Story 7 — Rejection Feedback with Diff View (Priority: P7)

**Goal**: After the user submits feedback in chat and the agent revises an artifact, the editor shows inline diff markers highlighting what changed

**Independent Test**: Have an artifact open, submit feedback in chat, verify the editor shows green/red inline diff markers on the revised content, then dismiss them

### Implementation for User Story 7

- [x] T031 [P] [US7] Create diff-compute utility: accepts two markdown strings (before/after), uses the `diff` library's diffLines() to compute line-level changes, returns an array of diff hunks with type (added/removed/unchanged) and line ranges in packages/frontend/src/lib/diff-compute.ts
  - **Note:** Implemented in lib/diff-compute.ts with computeDiff() + hasDiffChanges().
- [x] T032 [P] [US7] Create DiffOverlay component: accepts diff hunks and the TipTap editor instance, maps hunks to ProseMirror Decoration.inline() decorations with CSS classes (green background for additions, red background with strikethrough for deletions), provides a dismiss button that clears all decorations in packages/frontend/src/components/editor/DiffOverlay.tsx
  - **Note:** Implemented in DiffOverlay.tsx + lib/diff-extension.ts. Green decorations for additions, banner with counts, dismiss button.
- [x] T033 [US7] Implement snapshot capture: when a chat message is submitted in ChatView, snapshot the current content of all open editor tabs (store as Map<filePath, content> keyed by the message ID) in packages/frontend/src/views/ChatView.tsx
  - **Note:** captureSnapshot() in Zustand store, called in ChatView.handleSend() before message submission.
- [x] T034 [US7] Wire diff trigger: when a filesystem `changed` event arrives after an agent response completes, compare the snapshot content against the new file content using diff-compute, activate DiffOverlay in the editor for that tab in packages/frontend/src/views/DocsView.tsx
  - **Note:** useWebSocket.ts computes diff on filesystem:changed when snapshot exists, stores via setDiffData(). DocsView applies decorations and renders DiffOverlay.

**Checkpoint**: Rejection-feedback cycle shows inline diff markers. User can dismiss diffs to return to clean view.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling and integration refinements

- [ ] T035 [P] Handle edge case: tab bar overflow — ensure EditorTabs component is horizontally scrollable when tabs exceed container width, with scroll indicators in packages/frontend/src/components/editor/EditorTabs.tsx
- [x] T036 [P] Handle edge case: empty states — show placeholder content in DocsView when no tabs are open ("Open a document from Chat or select a spec artifact"), and in ChatView when no feature is active ("Activate a feature to start chatting") in packages/frontend/src/views/DocsView.tsx and packages/frontend/src/views/ChatView.tsx
- [ ] T037 [P] Handle edge case: live-reload during search — when search overlay is open and file content updates, refresh search results against the new content in packages/frontend/src/components/editor/MarkdownEditor.tsx
- [ ] T038 Run quickstart.md validation — verify all new dependencies install, all new endpoints respond, editor renders markdown, chat streams responses

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 Chat Streaming (Phase 3)**: Depends on Foundational (Phase 2)
- **US2 Tabbed Editor (Phase 4)**: Depends on Foundational (Phase 2) — can run in parallel with US1
- **US3 Live-Reload (Phase 5)**: Depends on US2 (needs editor tabs to exist)
- **US4 Artifact Links (Phase 6)**: Depends on US1 (needs MessageList) and US2 (needs tab opening)
- **US5 Chat Persistence (Phase 7)**: Depends on US1 (needs ChatView with useChat)
- **US6 Edit Mode (Phase 8)**: Depends on US2 (needs editor with mode toggle)
- **US7 Diff View (Phase 9)**: Depends on US1 (needs chat), US2 (needs editor), US3 (needs live-reload)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundation)
                       ↓
            ┌──────────┴──────────┐
            ↓                     ↓
    Phase 3 (US1: Chat)    Phase 4 (US2: Editor)
            ↓                     ↓
            ├─────────────────────┤
            ↓                     ↓
    Phase 6 (US4: Links)   Phase 5 (US3: Live-Reload)
            ↓                     ↓
    Phase 7 (US5: Persist)  Phase 8 (US6: Edit Mode)
            ↓                     ↓
            └─────────┬───────────┘
                      ↓
            Phase 9 (US7: Diff View)
                      ↓
            Phase 10 (Polish)
```

### Within Each User Story

- Models/utilities before components
- Components before view integration
- Core implementation before edge cases

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can all run in parallel (different package.json files)
- **Phase 2**: T006, T007, T008 can run in parallel (different files). T005 is independent.
- **Phase 3**: T012 and T013 can run in parallel (different component files)
- **Phase 4**: T015, T016, T017 can run in parallel (different files)
- **Phase 6**: T022 and T023 can run in parallel (different files)
- **Phase 9**: T031 and T032 can run in parallel (different files)
- **Phase 10**: T035, T036, T037 can all run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all independent tasks together:
Task: "Create useEditorTabs hook in packages/frontend/src/hooks/useEditorTabs.ts"
Task: "Create MarkdownEditor component in packages/frontend/src/components/editor/MarkdownEditor.tsx"
Task: "Create EditorTabs component in packages/frontend/src/components/editor/EditorTabs.tsx"

# Then sequentially:
Task: "Create EditorToolbar component" (depends on MarkdownEditor)
Task: "Rewrite DocsView" (depends on all above)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (dependencies + types)
2. Complete Phase 2: Foundational (backend services + store)
3. Complete Phase 3: User Story 1 (chat streaming)
4. **STOP and VALIDATE**: Type a command, see streaming response with activity indicator
5. This alone proves the AI SDK integration works end-to-end

### Incremental Delivery

1. Setup + Foundation → Backend ready
2. Add US1 (Chat) → Chat works with streaming → Validate
3. Add US2 (Editor) → Documents render in tabs → Validate
4. Add US3 (Live-Reload) → Files update automatically → Validate
5. Add US4 (Links) → Chat links to docs → Validate
6. Add US5 (Persistence) → History survives restarts → Validate
7. Add US6 (Edit Mode) → Users can edit and save → Validate
8. Add US7 (Diff View) → Rejection cycle shows diffs → Validate
9. Polish → Edge cases handled → Ship

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The mock/echo agent provider (T008) enables frontend development without a real API key
- TipTap undo/redo is built into StarterKit's History extension — no separate task needed
- The existing `chat_messages` table from Phase 1 requires no schema migration, only an index addition (T005)

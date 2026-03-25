---
status: complete
phase: 01-foundation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md]
started: 2026-03-24T17:30:00Z
updated: 2026-03-24T18:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running backend/frontend servers. Clear ephemeral state (delete data/ directory if present). Start the application from scratch (`npm run dev` from root). Backend boots on port 3001 without errors, SQLite database auto-creates tables, and `curl http://localhost:3001/api/features/active` returns `{"feature":null}`. Frontend loads at http://localhost:5173 without console errors.
result: pass

### 2. Icon Rail Navigation
expected: Left side of the screen shows a narrow vertical icon rail with 3 icons (Chat, Docs, Kanban). Clicking each icon switches the main content area to show that view's placeholder content. Active icon is visually distinguished from inactive ones.
result: pass

### 3. Connection Status Dot
expected: A small colored dot appears at the bottom of the icon rail. When backend is running and WebSocket is connected, the dot is green. When backend is stopped, the dot changes to red or amber indicating disconnection.
result: pass

### 4. View Persistence Across Reload
expected: Select a non-default view (e.g., Kanban). Reload the page (F5 or Ctrl+R). The same view (Kanban) should be restored from localStorage, not reset to the default.
result: pass

### 5. Feature API - Activate
expected: Run `curl -X POST http://localhost:3001/api/features/activate -H "Content-Type: application/json" -d '{"name":"test-feature","directory":"test-feature"}'`. Returns 200 with a JSON object containing the activated feature. Then `curl http://localhost:3001/api/features/active` returns that feature.
result: pass

### 6. Feature API - Single Active Enforcement
expected: With a feature already active, run the same POST /activate again with a different name. Returns 409 conflict error, not a second active feature.
result: pass

### 7. Feature API - Deactivate
expected: Run `curl -X DELETE http://localhost:3001/api/features/active`. Returns 200. Then `curl http://localhost:3001/api/features/active` returns `{"feature":null}`.
result: pass

### 8. File Watcher WebSocket Events
expected: With browser open at http://localhost:5173 and DevTools console visible, create a file: `mkdir -p specs/test && echo "# Test" > specs/test/spec.md`. Browser console should show a WebSocket message logged for the filesystem event (file created).
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

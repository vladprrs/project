# Quickstart: SpecFlow IDE Foundation

## Prerequisites

- Node.js 20+ (LTS)
- npm 10+

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd specflow-ide

# Install all dependencies (root + all packages)
npm install

# Start both backend and frontend in dev mode
npm run dev
```

## What You Should See

1. **Terminal**: Backend starts on port 3001, frontend dev server on port 5173 (or next available). No errors.
2. **Browser**: Open `http://localhost:5173`. You see:
   - A navigation bar with three items: **Chat**, **Docs**, **Kanban**
   - A connection status indicator showing "Connected" (green)
   - The active view area showing placeholder content for the selected view

## Verify It Works

### Navigation

Click each nav item (Chat, Docs, Kanban). The view should switch instantly. Close the browser, reopen — your last selected view should be restored.

### File Watching

```bash
# In a separate terminal, create a test spec file
mkdir -p specs/test-feature
echo "# Test Spec" > specs/test-feature/spec.md
```

The browser should show evidence of a file-created event (check the placeholder view or browser console for the event).

### Active Feature API

```bash
# Set active feature
curl -X POST http://localhost:3001/api/features/activate \
  -H "Content-Type: application/json" \
  -d '{"name": "test-feature", "directory": "test-feature"}'

# Get active feature
curl http://localhost:3001/api/features/active

# Try to activate another (should fail with 409)
curl -X POST http://localhost:3001/api/features/activate \
  -H "Content-Type: application/json" \
  -d '{"name": "another-feature", "directory": "another-feature"}'

# Deactivate
curl -X DELETE http://localhost:3001/api/features/active
```

### Database

After first startup, a SQLite database file should exist in the backend directory. It contains tables for pipeline state, transition history, task card cache, and chat messages.

## Development Commands

```bash
# Start everything (backend + frontend)
npm run dev

# Type-check all packages
npm run typecheck

# Run all tests
npm run test

# Type-check shared types only
npm run -w packages/shared typecheck
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port already in use | Kill the process on that port or set `PORT=3002` env var |
| ESM import errors | Ensure all packages have `"type": "module"` in package.json |
| Shared types not found | Run `npm install` from root to link workspaces |
| File watcher not firing | Check that `specs/` directory exists (created automatically on startup) |

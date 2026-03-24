# Stack Research

**Domain:** Document-centric web IDE with CLI orchestration, real-time streaming, and markdown editing
**Researched:** 2026-03-24
**Confidence:** MEDIUM (versions based on training data through early 2025 -- verify with `npm view <pkg> version` before installing)

## Version Verification Notice

> WebSearch, Bash, and WebFetch were unavailable during this research session. All version numbers below are based on training data (cutoff ~May 2025). Before running `npm install`, run `npm view <package> version` for each package to confirm you are pulling the latest stable release. The architectural recommendations and library choices are HIGH confidence; exact version pins are MEDIUM confidence.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | ^19.0 | UI framework | Project spec requires React. React 19 is stable with improved server components, use() hook, and better Suspense. For a desktop-only SPA, React 19's client-side improvements (automatic batching, transitions) are sufficient. |
| TypeScript | ^5.7 | Type safety | Required by project spec. TS 5.x line is mature, offers satisfies operator, const type params, and decorator metadata -- all useful for a typed backend+frontend monorepo. |
| Vite | ^6.0 | Build tool / dev server | Required by project spec. Vite 6 (if released) or 5.x is the standard React build tool in 2025. Sub-second HMR, native ESM, excellent plugin ecosystem. |
| Express | ^4.21 | HTTP server | Required by project spec. Express 4.x is battle-tested. Express 5.x was in beta for years; use 4.x unless 5.x has reached stable. Check `npm view express version` -- if 5.x is latest, evaluate migration cost (path param syntax changes, removed middleware). |
| TipTap | ^2.11 | Rich text / markdown editor | Required by project spec. ProseMirror-based, headless (style with Tailwind), first-class React binding, markdown serialization extensions. The right choice for document editing (not code editing). |
| Tailwind CSS | ^4.0 | Styling | Required by project spec. Tailwind 4 ships with a new Rust-based engine (Oxide), zero-config content detection, and CSS-first configuration. Significantly faster builds. If 4.x is not yet stable, fall back to 3.4.x. |
| SQLite via better-sqlite3 | ^11.7 | Task state persistence | Required by project spec. Synchronous API is ideal for a single-user localhost tool -- no async overhead, no connection pooling complexity. |
| ws | ^8.18 | WebSocket server | Lightweight, zero-dependency WebSocket implementation. The right choice when you control both client and server and do not need rooms/namespaces/reconnection protocol built-in. |

### TipTap Extensions (Critical Path)

| Extension | Package | Purpose | Why |
|-----------|---------|---------|-----|
| StarterKit | `@tiptap/starter-kit` | Base editing (paragraphs, headings, lists, code blocks, etc.) | Bundles the 15+ essential extensions. Do not cherry-pick individual nodes until you need to customize. |
| Markdown | `tiptap-markdown` | Bidirectional markdown serialization | Community extension by Astro/TipTap contributor. Converts ProseMirror document to/from markdown strings. This is the key bridge: load .md file -> ProseMirror doc -> edit -> serialize back to .md. |
| Placeholder | `@tiptap/extension-placeholder` | Empty editor placeholder text | UX polish for empty documents. |
| TaskList + TaskItem | `@tiptap/extension-task-list` + `@tiptap/extension-task-item` | Checkbox tasks in markdown | Renders `- [ ]` / `- [x]` as interactive checkboxes. Essential for tasks.md display. |
| Typography | `@tiptap/extension-typography` | Smart quotes, dashes | Minor UX polish for spec documents. |
| CodeBlockLowlight | `@tiptap/extension-code-block-lowlight` | Syntax-highlighted code blocks | Specs often contain code snippets. Uses lowlight (virtual DOM highlight.js) for syntax coloring without a full code editor. |

**Read-only mode:** TipTap supports `editable: false` as a prop on the editor instance. Toggle this per-tab based on context (e.g., read-only during CLI execution, editable for user refinement). No separate extension needed.

### Database Layer

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| better-sqlite3 | ^11.7 | SQLite driver | Synchronous C++ binding. 10-50x faster than async alternatives for single-user workloads. No connection pool needed. Perfect for localhost tools. |
| drizzle-orm | ^0.38 | SQL query builder / ORM | Type-safe SQL with zero runtime overhead. Schema-as-code with drizzle-kit migrations. Use drizzle-orm WITH better-sqlite3 as the driver -- they are complementary, not competing. |
| drizzle-kit | ^0.30 | Migration tooling | Generates SQL migrations from schema changes. `drizzle-kit generate` + `drizzle-kit migrate` for schema evolution. |

**Key insight:** better-sqlite3 vs drizzle-orm is a false dichotomy. Use **both**: drizzle-orm for type-safe queries, better-sqlite3 as the underlying driver. Drizzle has a first-class `drizzle(betterSqlite3Database)` adapter.

### WebSocket Layer

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| ws | ^8.18 | Server-side WebSocket | Zero dependencies, 2-3x faster than socket.io for raw throughput. For a localhost single-user tool, the overhead of socket.io's protocol negotiation, room system, and reconnection engine is wasted complexity. |
| Native WebSocket API | (browser built-in) | Client-side WebSocket | No client library needed. Browser `WebSocket` API is sufficient. Write a thin reconnection wrapper (exponential backoff, 5 lines of code) rather than pulling in a client library. |

**Why NOT socket.io:** Socket.io adds ~100KB to the client bundle, uses a custom protocol on top of WebSocket (requiring both client and server libraries), and its value proposition (fallback transports, rooms, namespaces) is irrelevant for a single-user localhost tool where the browser always supports native WebSocket. The reconnection logic socket.io provides is trivially reimplemented in ~20 lines.

### File System Layer

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| chokidar | ^4.0 | File watching | Chokidar 4.x is a major rewrite: pure ESM, smaller footprint, dropped legacy platform support. Cross-platform fs.watch wrapper that handles the edge cases (duplicate events, missing events on macOS, rename vs change ambiguity) that raw `fs.watch` does not. |

**Why NOT fs.watch/fs.watchFile:** Node's built-in `fs.watch` is unreliable across platforms -- it emits duplicate events, misses events on network filesystems, and has inconsistent behavior between Linux (inotify), macOS (FSEvents), and Windows. For a tool that must reliably detect spec artifact changes to push updates via WebSocket, chokidar's debouncing and cross-platform normalization is essential. The project is Linux-only (per server specs), but chokidar's event deduplication alone justifies it.

### Process Management (CLI Spawning)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| Node.js `child_process` | (built-in) | CLI spawning | `child_process.spawn()` is the correct primitive. Use `spawn` (not `exec`) for streaming stdout/stderr line-by-line into WebSocket events. No wrapper library needed. |
| execa | ^9.5 | Enhanced child_process | Use execa for: better TypeScript types, simplified pipe handling, built-in line parsing via `subprocess.iterable()`, automatic signal forwarding. Worth the dependency for a project that heavily orchestrates CLI tools. |
| tree-kill | ^1.2 | Process tree cleanup | When user cancels a CLI operation, `process.kill(pid)` only kills the parent -- child processes (e.g., spawned agents) continue. tree-kill sends signals to the entire process tree. Essential for clean cancellation. |

**Recommendation:** Use execa for CLI orchestration. Its `subprocess.iterable()` API yields stdout lines as an async iterator, which maps directly to streaming WebSocket events:

```typescript
import { execa } from 'execa';

const subprocess = execa('speckit', ['specify', featureName]);
for await (const line of subprocess.iterable()) {
  ws.send(JSON.stringify({ type: 'cli-output', line }));
}
```

### Markdown Parsing

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| unified + remark | ^11.0 (unified) | Markdown AST parsing | For server-side markdown parsing (e.g., parsing tasks.md into structured task objects for the kanban board). Remark parses markdown into an AST (mdast) that you can walk programmatically. |
| remark-parse | ^11.0 | Markdown parser plugin | Core parser for the unified/remark ecosystem. |
| remark-gfm | ^4.0 | GitHub Flavored Markdown | Adds task list support (`- [ ]`), tables, strikethrough -- all present in spec artifacts. |
| mdast-util-to-string | ^4.0 | AST text extraction | Extract plain text from AST nodes for search/indexing. |

**Why unified/remark and NOT marked/markdown-it for parsing:** The project needs to *programmatically traverse* markdown (extract tasks from checkboxes, find headings for sections). Remark's AST approach is built for this. marked/markdown-it are renderers (markdown -> HTML) which is not what the backend needs. TipTap handles the rendering side via tiptap-markdown.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.24 | Runtime validation | Validate WebSocket message shapes, CLI output parsing, API request/response contracts. |
| nanoid | ^5.0 | ID generation | Generate unique IDs for WebSocket messages, task IDs, session IDs. Smaller and faster than uuid. |
| date-fns | ^4.1 | Date formatting | Timestamp formatting for task state, event logs. Tree-shakeable unlike moment/dayjs. |
| concurrently | ^9.1 | Dev script runner | Run frontend dev server + backend dev server simultaneously during development. |
| tsx | ^4.19 | TypeScript execution | Run TypeScript backend directly without compilation step. Faster than ts-node, uses esbuild under the hood. |
| @types/better-sqlite3 | ^7.6 | TypeScript types | Type definitions for better-sqlite3. |
| @types/ws | ^8.5 | TypeScript types | Type definitions for ws. |
| @types/express | ^5.0 | TypeScript types | Type definitions for Express. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + @eslint/js | Linting | Flat config (eslint.config.js). Use @typescript-eslint for TS-specific rules. |
| Prettier | Code formatting | Use with eslint-config-prettier to avoid conflicts. |
| Vitest | Testing | Native Vite integration, fast, compatible with Jest API. Use for both frontend and backend tests. |
| nodemon OR tsx --watch | Backend auto-reload | tsx has built-in watch mode (`tsx watch src/server.ts`). No need for a separate nodemon dependency. |

## Installation

```bash
# Frontend core
npm install react react-dom
npm install @tiptap/react @tiptap/core @tiptap/pm @tiptap/starter-kit
npm install @tiptap/extension-placeholder @tiptap/extension-task-list @tiptap/extension-task-item
npm install @tiptap/extension-code-block-lowlight
npm install tiptap-markdown
npm install lowlight

# Backend core
npm install express ws better-sqlite3 drizzle-orm
npm install chokidar execa tree-kill
npm install unified remark-parse remark-gfm
npm install zod nanoid

# Dev dependencies
npm install -D typescript vite @vitejs/plugin-react tailwindcss
npm install -D drizzle-kit tsx concurrently vitest
npm install -D @types/react @types/react-dom @types/express @types/ws @types/better-sqlite3
npm install -D eslint @eslint/js @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| ws | socket.io | If you need rooms/namespaces (multi-user collaboration), automatic reconnection with state sync, or fallback to long-polling for legacy proxy environments. None of these apply to a localhost single-user tool. |
| better-sqlite3 + drizzle | Prisma | If you prefer a declarative schema DSL and are willing to accept Prisma's Rust query engine binary (~15MB), slower cold starts, and more opinionated migration system. Drizzle is lighter and gives more SQL control. |
| better-sqlite3 + drizzle | kysely | If you want a pure query builder without ORM semantics. Kysely is excellent but drizzle's migration tooling (drizzle-kit) tips the scale for this project. |
| chokidar | @parcel/watcher | If you need even better performance on very large file trees (10K+ files). @parcel/watcher uses native C++ bindings per-platform. Overkill for watching a `specs/` directory with <100 files. |
| execa | child_process (raw) | If you want zero dependencies and are comfortable writing your own stream parsing, error handling, and signal forwarding. For 1-2 spawn calls this is fine; for a CLI orchestration tool that spawns dozens of processes, execa's ergonomics pay for themselves. |
| unified/remark | marked | If you only need markdown-to-HTML rendering. marked is faster for that specific use case but does not provide AST traversal, which is needed for extracting structured task data from tasks.md. |
| TipTap | Lexical (Meta) | If you want Facebook's editor framework. Lexical is powerful but has a steeper learning curve, less mature markdown support, and fewer community extensions. TipTap's ProseMirror foundation is better proven for document editing. |
| TipTap | BlockNote | If you want a Notion-like block editor with less configuration. BlockNote is built on TipTap but adds opinionated UI that would conflict with our custom Tailwind styling. Using raw TipTap gives more control. |
| Express | Fastify | If you need higher throughput (Fastify is ~2x faster in benchmarks) or prefer schema-based validation built into the framework. For a single-user localhost tool, Express's middleware ecosystem and familiarity win. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| socket.io | 100KB+ client bundle, custom protocol overhead, features (rooms, namespaces, transport fallback) irrelevant for single-user localhost | ws (server) + native WebSocket (client) |
| Monaco Editor | Designed for code editing, not document editing. Massive bundle (~5MB). Would fight against the document-centric design. | TipTap |
| CodeMirror 6 | Same issue as Monaco -- optimized for code, not rich-text documents. No markdown WYSIWYG mode. | TipTap |
| Prisma | Heavyweight ORM with Rust binary engine. Overkill for SQLite task state. Slow introspection, large node_modules footprint. | drizzle-orm + better-sqlite3 |
| sql.js | SQLite compiled to WASM. Slower than native better-sqlite3 by 10-50x. Only useful if you cannot install native modules (e.g., Cloudflare Workers). | better-sqlite3 |
| node-sqlite3 (sqlite3 package) | Async/callback-based API. Slower than better-sqlite3 for single-connection use. More complex error handling. | better-sqlite3 |
| moment.js | Deprecated by maintainers. 300KB+ bundle. Mutable API causes bugs. | date-fns |
| ts-node | Slower startup than tsx. Complex configuration (tsconfig paths, ESM compat). | tsx |
| Webpack | Slower builds, more complex configuration, no native ESM dev server. Legacy tool. | Vite |
| nodemon | Extra dependency when tsx has built-in watch mode. | tsx --watch |
| uuid | Larger output (36 chars), slower generation than nanoid. UUIDs are overkill for local IDs. | nanoid |

## Stack Patterns by Variant

**If Express 5.x is stable (check `npm view express version`):**
- Use Express 5.x for native async error handling (no need for express-async-errors wrapper)
- Note: path parameter syntax changed from `:id` to `{id}` in Express 5
- Migration guide: https://expressjs.com/en/guide/migrating-5.html

**If Tailwind CSS 4.x is stable (check `npm view tailwindcss version`):**
- Use Tailwind 4 with CSS-first configuration (no tailwind.config.js needed)
- Import via `@import "tailwindcss"` in your CSS entry point
- If 4.x is not yet stable, use 3.4.x with standard tailwind.config.ts

**If React 19 is latest (check `npm view react version`):**
- Use React 19 for improved Suspense, use() hook, and automatic batching
- If still on 18.x, everything works the same -- React 19 changes are incremental

**For monorepo structure:**
- Use npm workspaces with `packages/frontend` + `packages/backend` + `packages/shared`
- Shared package holds types (WebSocket message shapes, task types, API contracts)
- Vite proxies API requests to Express during development

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @tiptap/* ^2.x | React ^18.0 or ^19.0 | TipTap 2.x React binding works with React 18+. Verify React 19 compat if using 19. |
| drizzle-orm | better-sqlite3 ^9.0+ | Drizzle's `drizzle(database)` adapter accepts better-sqlite3 instance directly. |
| Vite ^5.0+ / ^6.0 | @vitejs/plugin-react ^4.0+ | Must use matching plugin version. Check `npm view @vitejs/plugin-react version`. |
| Tailwind CSS ^4.0 | Vite (native support) | Tailwind 4 has built-in Vite plugin. No PostCSS config needed. |
| Tailwind CSS ^3.4 | postcss + autoprefixer | Requires PostCSS setup in Vite config. |
| chokidar ^4.0 | Node.js ^18.18 or ^20.0+ | Chokidar 4 is pure ESM. Ensure backend uses ESM ("type": "module" in package.json). |
| execa ^9.0 | Node.js ^18.19 or ^20.0+ | Execa 9 is pure ESM. Same ESM requirement as chokidar. |
| lowlight | @tiptap/extension-code-block-lowlight ^2.x | Must register languages explicitly with lowlight for tree-shaking. |

**Critical ESM note:** Both chokidar 4.x and execa 9.x are ESM-only. The backend MUST use `"type": "module"` in package.json. tsx handles this transparently. If you hit ESM issues, ensure tsconfig has `"module": "ESNext"` and `"moduleResolution": "bundler"` or `"nodenext"`.

## Sources

- npm registry (attempted, access denied during research) -- versions need verification
- Training data knowledge through May 2025 for: TipTap architecture, ProseMirror model, better-sqlite3 vs alternatives, ws vs socket.io performance characteristics, chokidar internals, execa API, unified/remark ecosystem, drizzle-orm adapter patterns
- Project spec (PROJECT.md) for technology constraints and requirements

**Confidence by area:**
| Area | Confidence | Rationale |
|------|------------|-----------|
| Library choices (which to use) | HIGH | Well-established ecosystem patterns, clear technical rationale for each |
| Architecture patterns (how to combine) | HIGH | Standard patterns for document editors, WebSocket streaming, CLI orchestration |
| Exact version numbers | MEDIUM | Based on training data; verify before installing |
| TipTap markdown extension | MEDIUM | tiptap-markdown is the leading community solution but ecosystem evolves; verify package still maintained |
| Tailwind 4 availability | LOW | Was in development as of training cutoff; verify if 4.x is stable |
| Express 5 availability | LOW | Was in beta for years; verify if 5.x has reached stable release |

---
*Stack research for: SpecFlow IDE -- document-centric web IDE with CLI orchestration*
*Researched: 2026-03-24*

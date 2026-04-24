# CLAUDE.md

Guidance for agents working in this repo.

## What this is

A Node.js stdio MCP server that exposes the Productive.io REST API as MCP tools and prompts. See `ARCHITECTURE.md` for the API model and entity hierarchy, and `README.md` for end-user install/config.

## Stack

- TypeScript (strict, `module: Node16`, ES2022) compiled to `build/`
- Runtime: `@modelcontextprotocol/sdk`, `zod`, `dotenv` — exact-pinned in `package.json`
- **Bun** for dev, install, and test. `tsc` still owns the `build/` output that consumers run under Node 20+.
- No linter, no bundler

## Layout

```
src/
├── index.ts         # entrypoint: calls createServer()
├── server.ts        # MCP Server wiring — tool & prompt registration + dispatch
├── config/          # zod-validated env config
├── api/
│   ├── client.ts    # ProductiveAPIClient — fetch wrapper with auth headers
│   └── types.ts     # Productive.io response types
├── tools/           # one file per tool domain (tasks, time-entries, pages, …)
└── prompts/         # MCP prompts (timesheet workflow)
```

Each file in `tools/` exports a `*Definition` (MCP schema) and a handler function. Both are wired into `src/server.ts` — adding a tool means editing `server.ts` in three places: import, `tools: []` array, and the dispatch `switch`.

## Stdio constraint (non-obvious gotcha)

This is a **stdio** MCP server: stdout is reserved for JSON-RPC framing. Anything written to stdout outside the SDK breaks the transport. See `src/config/index.ts` for how `dotenv` is silenced on load.

- Log to `stderr` only (`console.error`)
- Do not `console.log` anywhere in runtime code
- Do not print after `server.connect(transport)` returns

## Commands

```bash
bun install          # exact pins via bunfig.toml
bun run build        # tsc + chmod +x build/index.js
bun run dev          # bun --watch runs src/index.ts directly (needs env set)
bun run typecheck    # tsc --noEmit
bun test             # runs bun test (co-located *.test.ts files)
bun run start        # runs build/index.js under Node
```

## Conventions

- Validate all external data (env, tool args) with zod at the boundary
- File naming: kebab-case
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, …)
- Exact-pin any new dependency (`bunfig.toml` default will do this automatically)

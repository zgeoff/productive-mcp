# CLAUDE.md

Guidance for agents working in this repo.

## What this is

A Node.js stdio MCP server that exposes the Productive.io REST API as MCP tools and prompts. See `ARCHITECTURE.md` for the API model and entity hierarchy, and `README.md` for end-user install/config.

## Stack

- TypeScript (strict, `module: Node16`, ES2022) compiled to `build/`
- Runtime: `@modelcontextprotocol/sdk`, `zod`, `dotenv` — exact-pinned in `package.json`
- No tests, no linter, no bundler
- Node `>=20` (enforced by `.npmrc` `engine-strict=true`)

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
npm install          # uses exact pins via .npmrc
npm run build        # tsc + chmod +x build/index.js
npm run dev          # tsc --watch
npm start            # node build/index.js (needs env vars set)
```

No test runner is configured.

## Conventions

- Validate all external data (env, tool args) with zod at the boundary
- File naming: kebab-case
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, …)
- Exact-pin any new dependency (the `.npmrc` default will do this automatically)

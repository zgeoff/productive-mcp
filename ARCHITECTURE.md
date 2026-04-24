# Architecture

## Productive.io entity model

```
Customers (Companies)
└── Projects
    ├── Boards
    │   └── Task Lists
    │       └── Tasks
    │           ├── Subtasks
    │           ├── Comments
    │           ├── Todos
    │           └── Time Entries
    ├── Folders               (organise pages/docs)
    ├── Pages                 (docs, can nest)
    ├── Deals / Budgets
    │   └── Services          (billable rates attached to a deal)
    ├── Workflow Statuses
    └── People                (project assignments)
```

Time entries sit at the intersection of several branches:

```
Project → Deal → Service → (optional Task) → Time Entry
```

The `timesheet_entry` MCP prompt walks users through picking one of each in order.

## API integration

- **Base URL:** `https://api.productive.io/api/v2/` (override with `PRODUCTIVE_API_BASE_URL`)
- **Format:** [JSON:API](https://jsonapi.org/) — `Content-Type: application/vnd.api+json`
- **Auth:** two headers on every request
  - `X-Auth-Token: <PRODUCTIVE_API_TOKEN>`
  - `X-Organization-Id: <PRODUCTIVE_ORG_ID>`
- **Upstream docs:** https://developer.productive.io/

### Rate limits

- 100 requests / 10 seconds
- 4000 requests / 30 minutes
- 10 requests / 30 seconds on report endpoints

The client does not currently queue or back off — callers should expect 429s under burst load.

## Server architecture

- **Transport:** stdio only (`StdioServerTransport` from the MCP SDK). No HTTP/SSE path is wired up.
- **Lifecycle:** `src/index.ts` → `createServer()` → validate env → construct `ProductiveAPIClient` → register tool/prompt handlers → `server.connect(transport)`.
- **Dispatch:** `ListToolsRequestSchema` returns the static tool array; `CallToolRequestSchema` routes by `name` through a single `switch` in `src/server.ts`.

### Adding a tool

1. Create `src/tools/<domain>.ts` exporting both the definition (MCP tool schema) and the handler function.
2. In `src/server.ts`:
   - Import both exports.
   - Add the definition to the `tools: []` array in the `ListToolsRequestSchema` handler.
   - Add a `case` in the `CallToolRequestSchema` switch that calls the handler.

Handler signature convention:

```ts
(client: ProductiveAPIClient, args: unknown, config?: Config) => Promise<MCPResponse>
```

Validate `args` with zod inside the handler before calling the client.

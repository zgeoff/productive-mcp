# Productive.io MCP Server

An MCP (Model Context Protocol) server that enables Claude Code and other MCP-compatible clients to interact with the Productive.io API.

> **Fork notice:** This is a fork of [berwickgeek/productive-mcp](https://github.com/berwickgeek/productive-mcp). It is **not published to npm** — install by building from source (see below).

## Quick start

```bash
git clone https://github.com/zgeoff/productive-mcp.git
cd productive-mcp && bun install && bun run build
```

Requires **[Bun](https://bun.sh) 1.3+** to build, **Node.js 20+** at runtime. The built entrypoint is `build/index.js` — note the absolute path, you'll reference it in your MCP client config.

Then:

1. Grab credentials (below).
2. Configure your MCP client (Claude Code / Cursor sections below).
3. Verify by calling the `whoami` tool. Success looks like: `Current user: Your Name (ID: 1027601, Email: you@example.com)`.

## Credentials

In Productive, go to **Settings → API integrations** and generate a token. Pick **read-only** unless you need to create/edit (tasks, comments, time entries). The Organization ID is shown on the same page.

Your User ID isn't on the API integrations page — click your name in the top-right of the UI to open your profile, then grab the trailing number from the URL (e.g. `https://app.productive.io/16152-pipelabs/settings/person/1027601` → `1027601`).

| Variable | Required | Notes |
|---|---|---|
| `PRODUCTIVE_API_TOKEN` | Yes | From Settings → API integrations |
| `PRODUCTIVE_ORG_ID` | Yes | Shown alongside the token |
| `PRODUCTIVE_USER_ID` | No | Enables `my_tasks` and "me" references |

## MCP client setup

Both clients use the same config shape — only the file path differs.

### Claude Code

`.mcp.json` at the repo root (a `.mcp.json.example` ships as a starting point):

```json
{
  "mcpServers": {
    "productive": {
      "command": "node",
      "args": ["/absolute/path/to/productive-mcp/build/index.js"],
      "env": {
        "PRODUCTIVE_API_TOKEN": "...",
        "PRODUCTIVE_ORG_ID": "...",
        "PRODUCTIVE_USER_ID": "..."
      }
    }
  }
}
```

Launch Claude Code from the repo root.

### Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in a project. Same JSON shape as above. Reload from **Cursor Settings → MCP**.

### Using `.env` instead of inline env

If you'd rather not put secrets in your client config, drop a `.env` next to `package.json` with the same three vars — the server loads it relative to the built module, so it works regardless of where the client spawns the process. Then omit the `env` block from the client config.

## Available Tools

### User & Context Tools

| Tool | Description |
|------|-------------|
| `whoami` | Get current user context and configured user ID |

### Company & Project Tools

| Tool | Description |
|------|-------------|
| `list_companies` | List companies/customers. Filter by `status` (active/archived), `limit` |
| `list_projects` | List projects. Filter by `status`, `company_id`, `limit` |

### Folder Tools

| Tool | Description |
|------|-------------|
| `list_folders` | List folders in a project. Filter by `project_id`, `status` (1=active, 2=archived), `limit` |
| `get_folder` | Get folder details by `folder_id` |
| `create_folder` | Create a folder. Requires `project_id`, `name` |
| `update_folder` | Rename a folder. Requires `folder_id`, optional `name` |
| `archive_folder` | Archive a folder by `folder_id` |
| `restore_folder` | Restore an archived folder by `folder_id` |

### Board & Task List Tools

| Tool | Description |
|------|-------------|
| `list_boards` | List boards. Filter by `project_id`, `limit` |
| `create_board` | Create a board. Requires `project_id`, `name` |
| `list_task_lists` | List task lists. Filter by `board_id`, `limit` |
| `create_task_list` | Create a task list. Requires `board_id`, `project_id`, `name` |
| `get_task_list` | Get task list details by `task_list_id` |
| `update_task_list` | Rename a task list. Requires `task_list_id`, optional `name` |
| `archive_task_list` | Archive a task list by `task_list_id` |
| `restore_task_list` | Restore an archived task list by `task_list_id` |
| `copy_task_list` | Copy a task list. Requires `name`, `template_id`, `project_id`, `board_id`. Optional `copy_open_tasks`, `copy_assignees` |
| `move_task_list` | Move a task list to another board. Requires `task_list_id`, `board_id` |
| `reposition_task_list` | Reorder a task list. Requires `task_list_id`, `move_before_id` |

### Task Management Tools

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks. Filter by `project_id`, `assignee_id`, `task_list_id`, `unassigned` (bool), `status` (open/closed), `limit`, `page` |
| `get_project_tasks` | Get all tasks for a project. Requires `project_id`, optional `status`, `page` |
| `get_task` | Get task details by `task_id` |
| `create_task` | Create a task. Requires `title`. Optional `project_id`, `board_id`, `task_list_id`, `assignee_id` ("me" supported), `due_date`, `status`, `custom_fields` |
| `update_task_assignment` | Assign/unassign a task. Requires `task_id`, `assignee_id` ("me" or "null" supported) |
| `update_task_details` | Update title/description. Requires `task_id`, optional `title`, `description`, `description_html` |
| `update_task_custom_fields` | Set custom field values on a task. Requires `task_id` and `custom_fields` (map of field-id → value). Only listed keys change. |
| `list_custom_fields` | Discover custom fields and their option IDs. Defaults to `customizable_type=tasks`. Optional `project_id`, `name`, `archived`, `limit`, `page`. |
| `update_task_status` | Set workflow status by name or ID. Requires `task_id` and either `status_name` (e.g. "In Progress", "On Hold") or `workflow_status_id`. Automatically resolves the task's project workflow, supports custom statuses |
| `delete_task` | Delete a task by `task_id` |
| `my_tasks` | Get tasks assigned to you. Optional `status`, `limit` |
| `reposition_task` | Reorder a task within a list |
| `update_task_sprint` | Move task to a sprint/task list |
| `move_task_to_list` | Move a task to a different task list |
| `add_to_backlog` | Move a task to the backlog |

### Task Dependency Tools

| Tool | Description |
|------|-------------|
| `list_task_dependencies` | List dependencies for a task. Filter by `task_id` (what it blocks) or `dependent_task_id` (what blocks it) |
| `get_task_dependency` | Get dependency details by `dependency_id` |
| `create_task_dependency` | Create a dependency. Requires `task_id` (blocker), `dependent_task_id` (blocked). Optional `type_id`: 1 = blocks (default), 2 = is blocked by, 3 = related to |
| `delete_task_dependency` | Remove a dependency by `dependency_id` |

### Subtask Tools

| Tool | Description |
|------|-------------|
| `list_subtasks` | List subtasks of a parent task. Requires `parent_task_id`, optional `limit` |
| `create_subtask` | Create a subtask. Requires `parent_task_id`, `title`. Optional `project_id`, `task_list_id`, `assignee_id`, `due_date`, `description` |

### Comment Tools

| Tool | Description |
|------|-------------|
| `add_task_comment` | Add a comment to a task. Requires `task_id`, `comment` (supports HTML). Optional `mentions: [{person_id, name}]` — reference from the body with `{{@0}}`, `{{@1}}`, … to tag people and fire notifications |
| `list_comments` | List comments. Filter by `task_id`, `project_id`, `limit` |
| `get_comment` | Get full comment details by `comment_id` |
| `update_comment` | Edit a comment. Requires `comment_id`, `body`. Optional `mentions` (same shape as `add_task_comment`) |
| `delete_comment` | Delete a comment by `comment_id` |
| `pin_comment` | Pin a comment by `comment_id` |
| `unpin_comment` | Unpin a comment by `comment_id` |
| `add_comment_reaction` | Add a reaction. Requires `comment_id`, `reaction` (e.g. "like") |

### Todo Tools

| Tool | Description |
|------|-------------|
| `list_todos` | List todos on a task. Filter by `task_id`, `status` (open/closed), `limit` |
| `get_todo` | Get todo details by `todo_id` |
| `create_todo` | Create a todo. Requires `description`. Optional `task_id`, `deal_id`, `assignee_id`, `due_date` |
| `update_todo` | Update a todo. Requires `todo_id`. Optional `description`, `closed` (boolean), `due_date` |
| `delete_todo` | Delete a todo by `todo_id` |

### Page/Document Tools

| Tool | Description |
|------|-------------|
| `list_pages` | List pages. Filter by `project_id`, `sort` (title/created_at/edited_at/updated_at), `limit` |
| `get_page` | Get full page content by `page_id` |
| `create_page` | Create a page. Requires `project_id`, `title`. Optional `body` (HTML), `parent_page_id`, `root_page_id` |
| `update_page` | Update a page. Requires `page_id`. Optional `title`, `body` |
| `delete_page` | Delete a page by `page_id` |
| `move_page` | Move page under another. Requires `page_id`, `target_doc_id` |
| `copy_page` | Copy a page. Requires `template_id`. Optional `project_id` |

### Workflow Tools

| Tool | Description |
|------|-------------|
| `list_workflow_statuses` | List workflow statuses. Filter by `workflow_id`, `category_id` (1=Not Started, 2=Started, 3=Closed), `limit` |

### Time Tracking Tools

| Tool | Description |
|------|-------------|
| `list_time_entries` | List time entries. Filter by `date`, `after`, `before`, `person_id`, `project_id`, `task_id`, `service_id` |
| `create_time_entry` | Create a time entry. Requires `date`, `time` (minutes), `person_id`, `service_id`. Optional `task_id`, `note` |
| `list_services` | List services. Filter by `company_id`, `limit` |
| `list_project_deals` | List deals/budgets for a project |
| `list_deal_services` | List services for a deal/budget |

### Activity & Updates Tools

| Tool | Description |
|------|-------------|
| `list_activities` | List activities. Filter by `task_id`, `project_id`, `person_id`, `item_type`, `event`, `after`, `before` |
| `get_recent_updates` | Get recent updates. Optional `limit`, `hours` |

## Common Workflows

### Updating Task Status

You can update a task's status by name — no need to look up IDs:

```
update_task_status {
  "task_id": "12399194",
  "status_name": "On Hold"
}
```

The tool automatically resolves the task's project workflow and matches the status name (case-insensitive, supports partial matching). This works with custom workflow statuses too.

If the name doesn't match or is ambiguous, it returns the available statuses for that project:

```
No workflow status matching "banana" found.

Available statuses:
  • "Pending" (ID: 102305) — Not Started
  • "Open" (ID: 102291) — Started
  • "On Hold" (ID: 102306) — Started
  • "Waiting" (ID: 102307) — Started
  • "Closed" (ID: 102292) — Closed
```

You can also pass `workflow_status_id` directly if you already know the ID.

### Working with "me" Context

When `PRODUCTIVE_USER_ID` is configured, you can use "me" in several tools:
- `create_task` with `"assignee_id": "me"`
- `update_task_assignment` with `"assignee_id": "me"`
- `my_tasks` to get your assigned tasks
- `whoami` to verify your configured user context

### Creating Complete Task Workflows

1. **Create a folder**: `create_folder`
2. **Create task lists**: `create_task_list`
3. **Create tasks**: `create_task`
4. **Break down work**: `create_subtask` for sub-items, `create_todo` for checklists
5. **Add comments**: `add_task_comment`
6. **Update status**: `update_task_status` with `status_name` (e.g. "Open", "On Hold", "Closed")
7. **Track progress**: Use `list_activities` or `get_recent_updates`

### Building Documentation

1. **Create a root page**: `create_page` with `project_id` and `title`
2. **Add child pages**: `create_page` with `parent_page_id` and `root_page_id` set to the root
3. **Nest deeper**: Set `parent_page_id` to the parent and `root_page_id` to the root page
4. **Reorganize**: Use `move_page` to reparent pages, `copy_page` to duplicate

## Development

- Run in development mode: `bun run dev` (runs `src/index.ts` directly via Bun, reloads on change)
- Build: `bun run build` (emits `build/` via `tsc`)
- Run tests: `bun test`
- Typecheck without emit: `bun run typecheck`
- Start the built server under Node: `bun run start`

## License

ISC
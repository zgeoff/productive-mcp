import { expect, test } from 'bun:test';
import type { ProductiveAPIClient } from '../api/client.js';
import type {
  ProductiveIncludedResource,
  ProductiveResponse,
  ProductiveSingleResponse,
  ProductiveTask,
} from '../api/types.js';
import { createTaskTool, getProjectTasksTool, getTaskTool, listTasksTool, updateTaskCustomFieldsTool } from './tasks.js';

type ListTasksParams = Parameters<ProductiveAPIClient['listTasks']>[0];

function mockListClient(
  response: ProductiveResponse<ProductiveTask>
): { client: ProductiveAPIClient; calls: ListTasksParams[] } {
  const calls: ListTasksParams[] = [];
  const client = {
    listTasks: async (params?: ListTasksParams) => {
      calls.push(params);
      return response;
    },
  } as unknown as ProductiveAPIClient;
  return { client, calls };
}

function mockClient(
  response: ProductiveSingleResponse<ProductiveTask>
): { client: ProductiveAPIClient; calls: Array<{ taskId: string; options?: { include?: string[] } }> } {
  const calls: Array<{ taskId: string; options?: { include?: string[] } }> = [];
  const client = {
    getTask: async (taskId: string, options?: { include?: string[] }) => {
      calls.push({ taskId, options });
      return response;
    },
  } as unknown as ProductiveAPIClient;
  return { client, calls };
}

function buildTask(overrides: Partial<ProductiveTask['attributes']> = {}): ProductiveTask {
  return {
    id: 't-1',
    type: 'tasks',
    attributes: {
      title: 'Ship the thing',
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-02T00:00:00Z',
      closed: false,
      ...overrides,
    },
  };
}

test('getTaskTool requests task_list, assignee, and workflow_status includes', async () => {
  const { client, calls } = mockClient({ data: buildTask() });

  await getTaskTool(client, { task_id: 't-1' });

  expect(calls).toHaveLength(1);
  expect(calls[0].taskId).toBe('t-1');
  expect(calls[0].options?.include).toEqual(['task_list', 'assignee', 'workflow_status']);
});

test('getTaskTool renders basic task fields and marks an unassigned task', async () => {
  const task = buildTask({
    description: 'Deliver the MVP',
    due_date: '2026-04-30',
    priority: 2,
  });
  const { client } = mockClient({ data: task });

  const result = await getTaskTool(client, { task_id: 't-1' });
  const text = result.content[0].text;

  expect(text).toContain('Title: Ship the thing');
  expect(text).toContain('ID: t-1');
  expect(text).toContain('Status: open');
  expect(text).toContain('Description: Deliver the MVP');
  expect(text).toContain('Due Date: 2026-04-30');
  expect(text).toContain('Priority: 2');
  expect(text).toContain('Assignee: Unassigned');
});

test('getTaskTool resolves workflow status name from included data', async () => {
  const task: ProductiveTask = {
    ...buildTask(),
    relationships: {
      workflow_status: { data: { id: 'ws-1', type: 'workflow_statuses' } },
    },
  };
  const included: ProductiveIncludedResource[] = [
    { id: 'ws-1', type: 'workflow_statuses', attributes: { name: 'In Progress' } },
  ];
  const { client } = mockClient({ data: task, included });

  const result = await getTaskTool(client, { task_id: 't-1' });

  expect(result.content[0].text).toContain('Status: In Progress');
});

test('getTaskTool resolves assignee name from included people', async () => {
  const task: ProductiveTask = {
    ...buildTask(),
    relationships: {
      assignee: { data: { id: 'p-1', type: 'people' } },
    },
  };
  const included: ProductiveIncludedResource[] = [
    { id: 'p-1', type: 'people', attributes: { first_name: 'Ada', last_name: 'Lovelace' } },
  ];
  const { client } = mockClient({ data: task, included });

  const result = await getTaskTool(client, { task_id: 't-1' });

  expect(result.content[0].text).toContain('Assignee: Ada Lovelace (ID: p-1)');
});

test('getTaskTool resolves task list name from included resources', async () => {
  const task: ProductiveTask = {
    ...buildTask(),
    relationships: {
      task_list: { data: { id: 'tl-1', type: 'task_lists' } },
    },
  };
  const included: ProductiveIncludedResource[] = [
    { id: 'tl-1', type: 'task_lists', attributes: { name: 'Sprint 42' } },
  ];
  const { client } = mockClient({ data: task, included });

  const result = await getTaskTool(client, { task_id: 't-1' });
  const text = result.content[0].text;

  expect(text).toContain('Task List ID: tl-1');
  expect(text).toContain('Task List: Sprint 42');
});

test('getTaskTool does not write to stdout (MCP stdio protocol)', async () => {
  const task: ProductiveTask = {
    ...buildTask(),
    relationships: {
      task_list: { data: { id: 'tl-1', type: 'task_lists' } },
    },
  };
  const included: ProductiveIncludedResource[] = [
    { id: 'tl-1', type: 'task_lists', attributes: { name: 'Sprint 42' } },
  ];
  const { client } = mockClient({ data: task, included });

  const originalWrite = process.stdout.write.bind(process.stdout);
  const writes: Array<string | Uint8Array> = [];
  process.stdout.write = ((chunk: string | Uint8Array) => {
    writes.push(chunk);
    return true;
  }) as typeof process.stdout.write;

  try {
    await getTaskTool(client, { task_id: 't-1' });
  } finally {
    process.stdout.write = originalWrite;
  }

  expect(writes).toHaveLength(0);
});

test('getTaskTool throws McpError with InvalidParams when task_id is missing', async () => {
  const { client } = mockClient({ data: buildTask() });

  expect(getTaskTool(client, {})).rejects.toThrow(/Invalid parameters/);
});

test('listTasksTool forwards page param to the API client', async () => {
  const { client, calls } = mockListClient({ data: [buildTask()] });

  await listTasksTool(client, { page: 3 });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.page).toBe(3);
});

test('listTasksTool omits page when not provided', async () => {
  const { client, calls } = mockListClient({ data: [buildTask()] });

  await listTasksTool(client, {});

  expect(calls[0]?.page).toBeUndefined();
});

test('listTasksTool rejects page values below 1', async () => {
  const { client } = mockListClient({ data: [buildTask()] });

  expect(listTasksTool(client, { page: 0 })).rejects.toThrow(/Invalid parameters/);
});

test('getProjectTasksTool forwards page param to the API client', async () => {
  const { client, calls } = mockListClient({ data: [buildTask()] });

  await getProjectTasksTool(client, { project_id: 'p-1', page: 2 });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.page).toBe(2);
  expect(calls[0]?.project_id).toBe('p-1');
});

test('getProjectTasksTool omits page when not provided', async () => {
  const { client, calls } = mockListClient({ data: [buildTask()] });

  await getProjectTasksTool(client, { project_id: 'p-1' });

  expect(calls[0]?.page).toBeUndefined();
});

test('listTasksTool forwards task_list_id filter to the API client', async () => {
  const { client, calls } = mockListClient({ data: [buildTask()] });

  await listTasksTool(client, { task_list_id: '1678330' });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.task_list_id).toBe('1678330');
});

test('listTasksTool omits task_list_id when not provided', async () => {
  const { client, calls } = mockListClient({ data: [buildTask()] });

  await listTasksTool(client, {});

  expect(calls[0]?.task_list_id).toBeUndefined();
});

test('listTasksTool forwards unassigned=true to the API client', async () => {
  const { client, calls } = mockListClient({ data: [buildTask()] });

  await listTasksTool(client, { unassigned: true });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.unassigned).toBe(true);
});

test('listTasksTool rejects combining unassigned with assignee_id', async () => {
  const { client } = mockListClient({ data: [buildTask()] });

  expect(
    listTasksTool(client, { unassigned: true, assignee_id: 'p-1' })
  ).rejects.toThrow(/Cannot combine unassigned=true with assignee_id/);
});

test('createTaskTool forwards custom_fields into the API attributes', async () => {
  const calls: any[] = [];
  const client = {
    createTask: async (data: any) => {
      calls.push(data);
      return { data: buildTask({ title: 'Created' }) };
    },
  } as unknown as ProductiveAPIClient;

  await createTaskTool(client, {
    title: 'Created',
    custom_fields: { '307': '5821', '156': 'PROJ-42' },
  });

  expect(calls).toHaveLength(1);
  expect(calls[0].data.attributes.custom_fields).toEqual({ '307': '5821', '156': 'PROJ-42' });
});

test('createTaskTool omits custom_fields when not provided', async () => {
  const calls: any[] = [];
  const client = {
    createTask: async (data: any) => {
      calls.push(data);
      return { data: buildTask({ title: 'Created' }) };
    },
  } as unknown as ProductiveAPIClient;

  await createTaskTool(client, { title: 'Created' });

  expect(calls[0].data.attributes.custom_fields).toBeUndefined();
});

test('updateTaskCustomFieldsTool sends a PATCH with the provided custom_fields map', async () => {
  const calls: any[] = [];
  const client = {
    updateTask: async (taskId: string, data: any) => {
      calls.push({ taskId, data });
      return { data: buildTask({ title: 'Patched', custom_fields: { '307': '5821' } as any }) };
    },
  } as unknown as ProductiveAPIClient;

  const result = await updateTaskCustomFieldsTool(client, {
    task_id: 't-1',
    custom_fields: { '307': '5821' },
  });

  expect(calls).toHaveLength(1);
  expect(calls[0].taskId).toBe('t-1');
  expect(calls[0].data.data.attributes.custom_fields).toEqual({ '307': '5821' });
  expect(result.content[0].text).toContain('307: "5821"');
});

test('updateTaskCustomFieldsTool rejects an empty custom_fields map', async () => {
  const client = {} as unknown as ProductiveAPIClient;

  expect(
    updateTaskCustomFieldsTool(client, { task_id: 't-1', custom_fields: {} })
  ).rejects.toThrow(/at least one key/);
});

test('getTaskTool surfaces custom_fields when present', async () => {
  const task = buildTask({ custom_fields: { '307': '5821', '156': 'PROJ-42' } as any });
  const { client } = mockClient({ data: task });

  const result = await getTaskTool(client, { task_id: 't-1' });
  const text = result.content[0].text;

  expect(text).toContain('Custom Fields');
  expect(text).toContain('307: "5821"');
  expect(text).toContain('156: "PROJ-42"');
});

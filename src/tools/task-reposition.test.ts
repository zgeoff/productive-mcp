import { expect, test } from 'bun:test';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { ProductiveAPIClient } from '../api/client.js';
import type {
  ProductiveResponse,
  ProductiveSingleResponse,
  ProductiveTask,
} from '../api/types.js';
import { taskRepositionTool } from './task-reposition.js';

function task(id: string, placement: number, taskListId?: string): ProductiveTask {
  return {
    id,
    type: 'tasks',
    attributes: {
      title: `Task ${id}`,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
      placement,
    },
    relationships: taskListId
      ? { task_list: { data: { id: taskListId, type: 'task_lists' } } }
      : undefined,
  };
}

function buildClient(overrides: Partial<Record<keyof ProductiveAPIClient, unknown>>): ProductiveAPIClient {
  return {
    getTask: async () => ({ data: task('t-1', 5, 'tl-1') }) as ProductiveSingleResponse<ProductiveTask>,
    listTasks: async () => ({
      data: [task('t-1', 5, 'tl-1'), task('t-2', 10, 'tl-1')],
    }) as ProductiveResponse<ProductiveTask>,
    repositionTask: async () => {},
    ...overrides,
  } as unknown as ProductiveAPIClient;
}

test('taskRepositionTool returns success content on a normal reposition', async () => {
  const client = buildClient({});

  const result = await taskRepositionTool(client, { taskId: 't-1', move_before_id: 't-2' });

  expect(result.content[0].text).toContain('repositioned successfully');
  expect(result.content[0].text).toContain('before task t-2');
});

test('taskRepositionTool throws McpError with InvalidParams when taskId is missing', async () => {
  const client = buildClient({});

  try {
    await taskRepositionTool(client, { move_before_id: 't-2' });
    throw new Error('expected taskRepositionTool to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(McpError);
    expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
  }
});

test('taskRepositionTool throws McpError with InternalError when the API call fails', async () => {
  const client = buildClient({
    getTask: async () => {
      throw new Error('productive.io: 500 Server Error');
    },
  });

  try {
    await taskRepositionTool(client, { taskId: 't-1', moveToTop: true });
    throw new Error('expected taskRepositionTool to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(McpError);
    expect((error as McpError).code).toBe(ErrorCode.InternalError);
    expect((error as Error).message).toContain('productive.io: 500 Server Error');
  }
});

test('taskRepositionTool does not swallow errors into a success-shaped response', async () => {
  const client = buildClient({
    getTask: async () => {
      throw new Error('boom');
    },
  });

  let result: unknown;
  try {
    result = await taskRepositionTool(client, { taskId: 't-1', moveToTop: true });
  } catch {
    // expected to throw
    return;
  }

  throw new Error(
    `taskRepositionTool returned a response on error instead of throwing: ${JSON.stringify(result)}`
  );
});

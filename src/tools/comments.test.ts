import { expect, test } from 'bun:test';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import type { ProductiveAPIClient } from '../api/client.js';
import type { ProductiveComment, ProductiveSingleResponse } from '../api/types.js';
import {
  addTaskCommentTool,
  applyMentions,
  formatMentionToken,
  updateCommentTool,
} from './comments.js';

function mockCreateClient(): {
  client: ProductiveAPIClient;
  calls: Array<{ body: string }>;
} {
  const calls: Array<{ body: string }> = [];
  const client = {
    createComment: async (payload: {
      data: { attributes: { body: string } };
    }): Promise<ProductiveSingleResponse<ProductiveComment>> => {
      calls.push({ body: payload.data.attributes.body });
      return {
        data: {
          id: 'c-1',
          type: 'comments',
          attributes: {
            body: payload.data.attributes.body,
            commentable_type: 'task',
            created_at: '2026-04-24T00:00:00Z',
            updated_at: '2026-04-24T00:00:00Z',
          },
        },
      } as unknown as ProductiveSingleResponse<ProductiveComment>;
    },
  } as unknown as ProductiveAPIClient;
  return { client, calls };
}

function mockUpdateClient(): {
  client: ProductiveAPIClient;
  calls: Array<{ body: string }>;
} {
  const calls: Array<{ body: string }> = [];
  const client = {
    updateComment: async (
      _id: string,
      payload: { data: { attributes: { body: string } } }
    ): Promise<ProductiveSingleResponse<ProductiveComment>> => {
      calls.push({ body: payload.data.attributes.body });
      return {
        data: {
          id: 'c-1',
          type: 'comments',
          attributes: {
            body: payload.data.attributes.body,
            commentable_type: 'task',
            created_at: '2026-04-24T00:00:00Z',
            updated_at: '2026-04-24T00:00:00Z',
          },
        },
      } as unknown as ProductiveSingleResponse<ProductiveComment>;
    },
  } as unknown as ProductiveAPIClient;
  return { client, calls };
}

test('formatMentionToken produces the inline @[{json}] token Productive expects', () => {
  const token = formatMentionToken({ person_id: '293000', name: 'Jane Doe' });
  expect(token).toBe(
    '@[{"type":"person","id":"293000","label":"Jane Doe","avatar_url":null,"attachment_url":null,"is_done":false}]'
  );
});

test('applyMentions returns body unchanged when mentions is undefined', () => {
  expect(applyMentions('<p>hello</p>', undefined)).toBe('<p>hello</p>');
});

test('applyMentions returns body unchanged when mentions is empty', () => {
  expect(applyMentions('<p>hello</p>', [])).toBe('<p>hello</p>');
});

test('applyMentions swaps a single placeholder', () => {
  const body = applyMentions('<p>{{@0}} pls look</p>', [
    { person_id: '1', name: 'Ada' },
  ]);
  expect(body).toContain('@[{"type":"person","id":"1","label":"Ada"');
  expect(body).not.toContain('{{@0}}');
});

test('applyMentions swaps multiple placeholders in order', () => {
  const body = applyMentions('{{@0}} and {{@1}}', [
    { person_id: '1', name: 'Ada' },
    { person_id: '2', name: 'Grace' },
  ]);
  expect(body).toContain('"label":"Ada"');
  expect(body).toContain('"label":"Grace"');
  expect(body.indexOf('Ada')).toBeLessThan(body.indexOf('Grace'));
});

test('applyMentions throws McpError when placeholder index is out of range', () => {
  expect(() =>
    applyMentions('{{@5}}', [{ person_id: '1', name: 'Ada' }])
  ).toThrow(McpError);
});

test('applyMentions leaves text without placeholders untouched', () => {
  const body = applyMentions('plain text', [{ person_id: '1', name: 'Ada' }]);
  expect(body).toBe('plain text');
});

test('addTaskCommentTool sends a body with placeholders resolved to mention tokens', async () => {
  const { client, calls } = mockCreateClient();

  await addTaskCommentTool(client, {
    task_id: 't-1',
    comment: '<p>{{@0}} please review</p>',
    mentions: [{ person_id: '293000', name: 'Jane Doe' }],
  });

  expect(calls).toHaveLength(1);
  expect(calls[0].body).toContain(
    '@[{"type":"person","id":"293000","label":"Jane Doe"'
  );
  expect(calls[0].body).not.toContain('{{@0}}');
});

test('addTaskCommentTool passes body unchanged when no mentions are provided', async () => {
  const { client, calls } = mockCreateClient();

  await addTaskCommentTool(client, {
    task_id: 't-1',
    comment: '<p>no tags here</p>',
  });

  expect(calls[0].body).toBe('<p>no tags here</p>');
});

test('updateCommentTool sends a body with placeholders resolved to mention tokens', async () => {
  const { client, calls } = mockUpdateClient();

  await updateCommentTool(client, {
    comment_id: 'c-1',
    body: '<p>{{@0}} updated</p>',
    mentions: [{ person_id: '293000', name: 'Jane Doe' }],
  });

  expect(calls).toHaveLength(1);
  expect(calls[0].body).toContain(
    '@[{"type":"person","id":"293000","label":"Jane Doe"'
  );
  expect(calls[0].body).not.toContain('{{@0}}');
});

import { expect, test } from 'bun:test';
import type { ProductiveAPIClient } from '../api/client.js';
import type { ProductiveCustomField, ProductiveResponse } from '../api/types.js';
import { listCustomFieldsTool } from './custom-fields.js';

type ListParams = Parameters<ProductiveAPIClient['listCustomFields']>[0];

function mockClient(response: ProductiveResponse<ProductiveCustomField>): {
  client: ProductiveAPIClient;
  calls: ListParams[];
} {
  const calls: ListParams[] = [];
  const client = {
    listCustomFields: async (params?: ListParams) => {
      calls.push(params);
      return response;
    },
  } as unknown as ProductiveAPIClient;
  return { client, calls };
}

test('listCustomFieldsTool defaults customizable_type to tasks', async () => {
  const { client, calls } = mockClient({ data: [] });

  await listCustomFieldsTool(client, {});

  expect(calls[0]?.customizable_type).toBe('tasks');
});

test('listCustomFieldsTool resolves select-field option names from included resources', async () => {
  const field: ProductiveCustomField = {
    id: '307',
    type: 'custom_fields',
    attributes: { name: 'Priority', data_type_id: 3, customizable_type: 'tasks' },
    relationships: {
      project: { data: null },
      custom_field_options: {
        data: [
          { id: '5821', type: 'custom_field_options' },
          { id: '5822', type: 'custom_field_options' },
        ],
      },
    },
  };
  const { client } = mockClient({
    data: [field],
    included: [
      { id: '5821', type: 'custom_field_options', attributes: { name: 'High', position: 1 } },
      { id: '5822', type: 'custom_field_options', attributes: { name: 'Low', position: 2 } },
    ],
  });

  const result = await listCustomFieldsTool(client, { customizable_type: 'tasks' });
  const text = result.content[0].text;

  expect(text).toContain('Priority (ID: 307)');
  expect(text).toContain('Type: select');
  expect(text).toContain('High (option ID: 5821)');
  expect(text).toContain('Low (option ID: 5822)');
});

test('listCustomFieldsTool reports project scope when field is project-scoped', async () => {
  const field: ProductiveCustomField = {
    id: '500',
    type: 'custom_fields',
    attributes: { name: 'Effort', data_type_id: 2, customizable_type: 'tasks' },
    relationships: {
      project: { data: { id: '627184', type: 'projects' } },
    },
  };
  const { client } = mockClient({ data: [field] });

  const result = await listCustomFieldsTool(client, { project_id: '627184' });

  expect(result.content[0].text).toContain('Scope: project 627184');
});

test('listCustomFieldsTool returns a friendly message when there are no results', async () => {
  const { client } = mockClient({ data: [] });

  const result = await listCustomFieldsTool(client, { customizable_type: 'tasks' });

  expect(result.content[0].text).toMatch(/No custom fields found/);
});

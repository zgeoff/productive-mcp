import { z } from 'zod';
import { ProductiveAPIClient } from '../api/client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const DATA_TYPE_NAMES: Record<number, string> = {
  1: 'text',
  2: 'number',
  3: 'select',
  4: 'date',
  5: 'multi-select',
  6: 'person',
  7: 'attachment',
};

const listCustomFieldsSchema = z.object({
  customizable_type: z.string().optional().default('tasks'),
  project_id: z.string().optional(),
  archived: z.boolean().optional(),
  name: z.string().optional(),
  limit: z.number().min(1).max(200).optional(),
  page: z.number().min(1).optional(),
});

export async function listCustomFieldsTool(
  client: ProductiveAPIClient,
  args: unknown
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const params = listCustomFieldsSchema.parse(args || {});

    const response = await client.listCustomFields({
      customizable_type: params.customizable_type,
      project_id: params.project_id,
      archived: params.archived,
      name: params.name,
      limit: params.limit,
      page: params.page,
    });

    if (!response.data || response.data.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No custom fields found for customizable_type=${params.customizable_type}${params.project_id ? `, project_id=${params.project_id}` : ''}.`,
        }],
      };
    }

    const optionsById = new Map<string, { name: string; position?: number }>();
    for (const inc of response.included ?? []) {
      if (inc.type === 'custom_field_options') {
        optionsById.set(inc.id, {
          name: (inc.attributes.name as string) ?? '',
          position: inc.attributes.position as number | undefined,
        });
      }
    }

    const lines = response.data.map((field) => {
      const dataTypeId = field.attributes.data_type_id;
      const dataTypeName = DATA_TYPE_NAMES[dataTypeId] ?? `type ${dataTypeId}`;
      const projectRef = field.relationships?.project?.data;
      const scope = projectRef ? `project ${projectRef.id}` : 'global';
      let block = `• ${field.attributes.name} (ID: ${field.id})\n  Type: ${dataTypeName} (data_type_id ${dataTypeId})\n  Scope: ${scope}`;

      const optionRefs = field.relationships?.custom_field_options?.data ?? [];
      if (optionRefs.length > 0) {
        const opts = optionRefs
          .map((ref) => {
            const opt = optionsById.get(ref.id);
            return opt ? { id: ref.id, ...opt } : { id: ref.id, name: '?', position: undefined };
          })
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((o) => `    - ${o.name} (option ID: ${o.id})`)
          .join('\n');
        block += `\n  Options:\n${opts}`;
      }
      return block;
    }).join('\n\n');

    const totalNote = response.meta?.total_count ? ` (of ${response.meta.total_count})` : '';
    const summary = `Found ${response.data.length} custom field${response.data.length !== 1 ? 's' : ''}${totalNote}:\n\n${lines}`;

    return {
      content: [{
        type: 'text',
        text: summary,
      }],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
      );
    }

    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

export const listCustomFieldsDefinition = {
  name: 'list_custom_fields',
  description: 'List custom fields and (for select / multi-select fields) their options. Use this to discover the field ID and option IDs needed by create_task and update_task_custom_fields. Default customizable_type is "tasks".',
  inputSchema: {
    type: 'object',
    properties: {
      customizable_type: {
        type: 'string',
        description: 'Resource type the field attaches to (default: "tasks"). Other values: deals, projects, companies, budgets, invoices, bookings, project_expenses, services, employees, contacts, pages.',
      },
      project_id: {
        type: 'string',
        description: 'Limit to fields scoped to a specific project. Omit to also include global (organisation-wide) fields.',
      },
      archived: {
        type: 'boolean',
        description: 'Include archived fields when true. Defaults to false on the API side.',
      },
      name: {
        type: 'string',
        description: 'Filter by exact field name (e.g. "Priority").',
      },
      limit: {
        type: 'number',
        description: 'Number of fields per page (1-200).',
        minimum: 1,
        maximum: 200,
      },
      page: {
        type: 'number',
        description: 'Page number for pagination.',
        minimum: 1,
      },
    },
  },
};

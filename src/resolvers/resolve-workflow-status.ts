import type { ProductiveIncludedResource } from '../api/types.js';

export function resolveWorkflowStatus(
  task: { relationships?: Record<string, any> },
  included?: ProductiveIncludedResource[]
): string | undefined {
  const statusId = task.relationships?.workflow_status?.data?.id;
  if (!statusId || !included) return undefined;
  const status = included.find(
    (item) => item.type === 'workflow_statuses' && item.id === statusId
  );
  return status?.attributes?.name || undefined;
}

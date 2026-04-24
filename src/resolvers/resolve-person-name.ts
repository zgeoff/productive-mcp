import type { ProductiveIncludedResource } from '../api/types.js';

export function resolvePersonName(
  personId: string | undefined,
  included?: ProductiveIncludedResource[]
): string | undefined {
  if (!personId || !included) return undefined;
  const person = included.find((item) => item.type === 'people' && item.id === personId);
  if (!person) return undefined;
  const first = person.attributes.first_name || '';
  const last = person.attributes.last_name || '';
  return `${first} ${last}`.trim() || undefined;
}

import { expect, test } from 'bun:test';

test('time-entries module does not export the removed get_project_services tool', async () => {
  const mod = await import('./time-entries.js');
  expect(mod).not.toHaveProperty('getProjectServicesTool');
  expect(mod).not.toHaveProperty('getProjectServicesDefinition');
});

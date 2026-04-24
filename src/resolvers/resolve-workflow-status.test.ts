import { expect, test } from 'bun:test';
import type { ProductiveIncludedResource } from '../api/types.js';
import { resolveWorkflowStatus } from './resolve-workflow-status.js';

const included: ProductiveIncludedResource[] = [
  { id: 'ws-1', type: 'workflow_statuses', attributes: { name: 'In Progress' } },
  { id: 'ws-2', type: 'workflow_statuses', attributes: { name: '' } },
];

test('resolveWorkflowStatus returns the status name when the task references it', () => {
  const task = { relationships: { workflow_status: { data: { id: 'ws-1' } } } };
  expect(resolveWorkflowStatus(task, included)).toBe('In Progress');
});

test('resolveWorkflowStatus returns undefined when the task has no workflow_status relationship', () => {
  expect(resolveWorkflowStatus({}, included)).toBeUndefined();
  expect(resolveWorkflowStatus({ relationships: {} }, included)).toBeUndefined();
});

test('resolveWorkflowStatus returns undefined when the referenced status is not in included', () => {
  const task = { relationships: { workflow_status: { data: { id: 'ws-missing' } } } };
  expect(resolveWorkflowStatus(task, included)).toBeUndefined();
});

test('resolveWorkflowStatus returns undefined when included is not provided', () => {
  const task = { relationships: { workflow_status: { data: { id: 'ws-1' } } } };
  expect(resolveWorkflowStatus(task)).toBeUndefined();
});

test('resolveWorkflowStatus returns undefined when the status has an empty name', () => {
  const task = { relationships: { workflow_status: { data: { id: 'ws-2' } } } };
  expect(resolveWorkflowStatus(task, included)).toBeUndefined();
});

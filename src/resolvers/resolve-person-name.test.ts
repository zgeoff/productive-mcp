import { expect, test } from 'bun:test';
import type { ProductiveIncludedResource } from '../api/types.js';
import { resolvePersonName } from './resolve-person-name.js';

const people: ProductiveIncludedResource[] = [
  { id: 'p-1', type: 'people', attributes: { first_name: 'Ada', last_name: 'Lovelace' } },
  { id: 'p-2', type: 'people', attributes: { first_name: 'Grace', last_name: '' } },
  { id: 'p-3', type: 'people', attributes: { first_name: '', last_name: '' } },
];

test('resolvePersonName returns "First Last" for a known person', () => {
  expect(resolvePersonName('p-1', people)).toBe('Ada Lovelace');
});

test('resolvePersonName returns just the first name when last name is empty', () => {
  expect(resolvePersonName('p-2', people)).toBe('Grace');
});

test('resolvePersonName returns undefined when both names are empty', () => {
  expect(resolvePersonName('p-3', people)).toBeUndefined();
});

test('resolvePersonName returns undefined when the person is not in the included list', () => {
  expect(resolvePersonName('p-missing', people)).toBeUndefined();
});

test('resolvePersonName returns undefined when personId is undefined', () => {
  expect(resolvePersonName(undefined, people)).toBeUndefined();
});

test('resolvePersonName returns undefined when included is undefined', () => {
  expect(resolvePersonName('p-1')).toBeUndefined();
});

test('resolvePersonName ignores included resources of other types', () => {
  const mixed: ProductiveIncludedResource[] = [
    { id: 'p-1', type: 'task_lists', attributes: { name: 'Not a person' } },
  ];
  expect(resolvePersonName('p-1', mixed)).toBeUndefined();
});

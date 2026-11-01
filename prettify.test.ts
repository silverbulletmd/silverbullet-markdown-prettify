import { beforeEach, expect, test, vi } from 'vitest';
import { parseFixture } from './tests/parser.ts';
import { prettifyCommand } from './prettify.ts';

const state = vi.hoisted(() => ({ text: '', from: 0, to: 0, cursor: 0, edits: 0 }));
vi.mock('@silverbulletmd/silverbullet/syscalls', () => ({
  config: { get: async () => ({}) },
  markdown: { parseMarkdown: async (source: string) => parseFixture(source) },
  editor: {
    getSelection: async () => ({ from: state.from, to: state.to }),
    getText: async () => state.text,
    getCursor: async () => state.cursor,
    replaceRange: async (from: number, to: number, text: string) => {
      state.text = state.text.slice(0, from) + text + state.text.slice(to);
      state.edits++;
    },
    moveCursor: async (cursor: number) => { state.cursor = cursor; },
    flashNotification: async (message: string) => { throw new Error(message); },
  },
}));
beforeEach(() => Object.assign(state, { text: '', from: 0, to: 0, cursor: 0, edits: 0 }));

test('formatting an inline selection does not split its surrounding paragraph', async () => {
  Object.assign(state, { text: 'hello word suffix', from: 6, to: 10, cursor: 10 });
  await prettifyCommand();
  expect(state.text).toBe('hello word suffix');
  expect(state.edits).toBe(0);
});

test('a page edit is applied once and a second run is a no-op', async () => {
  state.text = '\n\nhello\n\n\n';
  await prettifyCommand();
  expect(state.text).toBe('hello\n');
  expect(state.edits).toBe(1);
  await prettifyCommand();
  expect(state.edits).toBe(1);
});

test('a changed selection is one edit and preserves both surrounding text and boundary whitespace', async () => {
  const selection = '\n\n hello   word  \n\n';
  Object.assign(state, { text: 'before' + selection + 'after', from: 6,
    to: 6 + selection.length, cursor: 6 + selection.length });
  await prettifyCommand();
  expect(state.text).toBe('before\n\n hello word  \n\nafter');
  expect(state.edits).toBe(1);
  expect(state.cursor).toBe(6 + '\n\n hello word  \n\n'.length);
});
